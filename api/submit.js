import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID     = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_BOT_TOKEN_2 = process.env.TELEGRAM_BOT_TOKEN_2;
const TELEGRAM_CHAT_ID_2   = process.env.TELEGRAM_CHAT_ID_2;
const SHEETS_WEBHOOK_URL   = process.env.SHEETS_WEBHOOK_URL;
const META_PIXEL_ID        = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN    = process.env.META_ACCESS_TOKEN;

function sha256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function moroccanTime() {
  return new Date().toLocaleString('fr-MA', {
    timeZone: 'Africa/Casablanca',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

async function sendTelegram(token, chatId, text) {
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
}

async function sendTelegramLead(name, phone, trip, city, seats) {
  const text = [
    `🚌 <b>حجز جديد — RihlaGo</b>`,
    ``,
    `👤 <b>الاسم:</b> ${name}`,
    `📱 <b>الهاتف:</b> <code>${phone}</code>`,
    `🗺️ <b>الرحلة:</b> ${trip}`,
    `🏙️ <b>المدينة:</b> ${city}`,
    `💺 <b>عدد البلاصات:</b> ${seats}`,
    `⏰ <b>التوقيت:</b> ${moroccanTime()}`,
    ``,
    `━━━━━━━━━━━━━━━`,
    `<i>RihlaGo · المغرب 🇲🇦</i>`,
  ].join('\n');

  await Promise.allSettled([
    sendTelegram(TELEGRAM_BOT_TOKEN,   TELEGRAM_CHAT_ID,   text),
    sendTelegram(TELEGRAM_BOT_TOKEN_2, TELEGRAM_CHAT_ID_2, text),
  ]);
}

async function sendToSheets(payload) {
  if (!SHEETS_WEBHOOK_URL) return;
  await fetch(SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function sendMetaCAPI(name, phone, eventId, clientIp, userAgent, eventSourceUrl, fbp, fbc) {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) return;
  const userData = {
    ph: [sha256(phone)],
    fn: [sha256(name)],
    client_ip_address: clientIp,
    client_user_agent: userAgent,
  };
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  await fetch(
    `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: eventSourceUrl,
          action_source: 'website',
          user_data: userData,
        }]
      })
    }
  );
}

async function sendToCRM({ name, phone, trip, city, seats }) {
  await fetch('https://amraniads.com/api/crm-intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:   'rihlago',
      client_name: 'RihlaGo',
      type:        'lead',
      name, phone,
      service:     `${trip} — ${seats} بلاصة من ${city}`,
      timestamp:   moroccanTime()
    }),
    signal: AbortSignal.timeout(3000)
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    name = '', phone = '', trip = '', city = '', seats = '1',
    eventId = '', userAgent = '', eventSourceUrl = '',
    fbp = '', fbc = ''
  } = req.body || {};

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '';

  await Promise.allSettled([
    sendTelegramLead(name, phone, trip, city, seats),
    sendToSheets({ type: 'lead', name, phone, trip, city, seats, timestamp: moroccanTime() }),
    sendMetaCAPI(name, phone, eventId, clientIp, userAgent, eventSourceUrl, fbp, fbc),
    sendToCRM({ name, phone, trip, city, seats }),
  ]);

  return res.status(200).json({ ok: true });
}
