// ─────────────────────────────────────────────────────────────
//  RihlaGo — Google Apps Script
//  Paste into: script.google.com → Code.gs
//  Sheet: "Leads" → trip booking reservations
// ─────────────────────────────────────────────────────────────

var LEAD_HEADERS   = ['#', 'Nom', 'WhatsApp', 'Lien WhatsApp', 'Rihla', 'Ville', 'Places', 'Statut', 'Notes', 'Contacté ?', 'Date'];
var L_NUM=1, L_NAME=2, L_PHONE=3, L_WALINK=4, L_TRIP=5, L_CITY=6, L_SEATS=7, L_STATUS=8, L_NOTES=9, L_CONTACTED=10, L_DATE=11;

var LEAD_STATUS    = ['Nouveau', 'Contacté', 'Confirmé', 'Acompte reçu', 'Ne répond pas', 'Annulé'];
var CONTACTED_OPTS = ['Non', 'Oui'];

function normalizePhone(raw) {
  var p = String(raw || '').replace(/\D/g, '');
  if (p.startsWith('0') && p.length === 10) p = '212' + p.slice(1);
  else if (!p.startsWith('212') && p.length === 9) p = '212' + p;
  return p;
}

function doPost(e) {
  var data  = JSON.parse(e.postData.contents);
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads') || ss.getActiveSheet();

  var phone   = normalizePhone(data.phone);
  var waLink  = phone ? 'https://wa.me/' + phone : '';
  var rowNum  = Math.max(sheet.getLastRow(), 1);
  var dateStr = Utilities.formatDate(new Date(), 'Africa/Casablanca', 'dd/MM/yyyy HH:mm');

  sheet.appendRow([
    rowNum,
    data.name   || '',
    phone,
    waLink,
    data.trip   || '',
    data.city   || '',
    data.seats  || '1',
    'Nouveau',
    '',
    'Non',
    dateStr
  ]);

  var newRow = sheet.getLastRow();

  if (waLink) {
    var cell = sheet.getRange(newRow, L_WALINK);
    cell.setFormula('=HYPERLINK("' + waLink + '","WhatsApp 💬")');
    cell.setFontColor('#C75B1A').setFontWeight('bold');
  }

  sheet.getRange(newRow, L_STATUS).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(LEAD_STATUS, true).setAllowInvalid(false).build()
  );
  sheet.getRange(newRow, L_CONTACTED).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(CONTACTED_OPTS, true).setAllowInvalid(false).build()
  );

  if (newRow % 2 === 0) {
    sheet.getRange(newRow, 1, 1, LEAD_HEADERS.length).setBackground('#FDF3EC');
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', app: 'RihlaGo' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function setup() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads');
  if (!sheet) sheet = ss.insertSheet('Leads');

  sheet.clear(); sheet.clearFormats(); sheet.setRightToLeft(false);
  sheet.appendRow(LEAD_HEADERS);

  sheet.getRange(1, 1, 1, LEAD_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#C75B1A')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center')
    .setFontSize(11);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(L_NUM, 40);
  sheet.setColumnWidth(L_NAME, 180);
  sheet.setColumnWidth(L_PHONE, 150);
  sheet.setColumnWidth(L_WALINK, 160);
  sheet.setColumnWidth(L_TRIP, 240);
  sheet.setColumnWidth(L_CITY, 130);
  sheet.setColumnWidth(L_SEATS, 80);
  sheet.setColumnWidth(L_STATUS, 150);
  sheet.setColumnWidth(L_NOTES, 260);
  sheet.setColumnWidth(L_CONTACTED, 110);
  sheet.setColumnWidth(L_DATE, 145);

  sheet.getRange(2, L_STATUS, 999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(LEAD_STATUS, true).setAllowInvalid(false).build()
  );
  sheet.getRange(2, L_CONTACTED, 999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(CONTACTED_OPTS, true).setAllowInvalid(false).build()
  );

  SpreadsheetApp.getUi().alert('✅ شيت RihlaGo جاهز!\n\nالآن: Deploy → New Deployment → Web app → Anyone');
}
