const SHEET_NAMES = {
  controls: 'Controls',
  seedSources: 'Seed Sources',
  searchQueue: 'Search Queue',
  intake: 'Intake',
  candidates: 'Candidates',
  auditLog: 'Audit Log',
};

const STATUS = {
  pdfSeeded: 'PDF_SEEDED',
  verified: 'VERIFIED',
  watchlist: 'WATCHLIST',
  rejected: 'REJECTED',
  stale: 'STALE',
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Apartment Tracker')
    .addItem('Bootstrap Workbook', 'bootstrapWorkbook')
    .addItem('Sync Seed Queue', 'syncSeedQueue')
    .addItem('Upsert Intake Rows', 'upsertFromIntake')
    .addItem('Refresh Scores', 'refreshDerivedFields')
    .addItem('Mark Stale', 'markStaleCandidates')
    .addItem('Open Top Candidates', 'openTopCandidates')
    .addToUi();
}

function bootstrapWorkbook() {
  const ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, SHEET_NAMES.controls, [
    'Setting', 'Value', 'Description'
  ]);
  ensureSheet_(ss, SHEET_NAMES.seedSources, [
    'Source Type', 'Source File/URL', 'Property Name', 'City', 'Address',
    'Claimed Rent', 'Claimed Promo', 'Claimed Transit Note', 'Claimed Review Note', 'Needs Verification'
  ]);
  ensureSheet_(ss, SHEET_NAMES.searchQueue, [
    'Priority', 'Property Name', 'City', 'Source Type', 'Search Task',
    'Official URL Found', 'Transit Check Done', 'Review Check Done', 'Owner', 'Queue Status', 'Notes'
  ]);
  ensureSheet_(ss, SHEET_NAMES.intake, [
    'Research Date', 'Researcher', 'Property Type', 'Apartment Name', 'City', 'Address',
    'Unit/Floorplan', 'Beds', 'Baths', 'Sq Ft', 'Listed Rent', 'Required Fees/mo', 'Promo Raw',
    'Lease Term Mo', 'Discount Est/mo', 'Availability Date', 'Closest Station', 'Walk Distance Mi',
    'Walk Time Min', 'Shuttle', 'Review Score', 'Review Count', 'Review Source', 'Review Summary',
    'Official URL', 'Listing URL', 'Transit URL', 'Review URL', 'Source Type', 'Verification Tier',
    'Status', 'Last Verified At', 'Notes'
  ]);
  ensureSheet_(ss, SHEET_NAMES.candidates, [
    'Research Date', 'Researcher', 'Apartment Name', 'City', 'Address', 'Property Type', 'Unit/Floorplan',
    'Beds', 'Baths', 'Sq Ft', 'Listed Rent', 'Required Fees/mo', 'Promo Raw', 'Lease Term Mo',
    'Discount Est/mo', 'Net Monthly Cost', 'Price/Sq Ft', 'Availability Date', 'Closest Station',
    'Walk Distance Mi', 'Walk Time Min', 'Shuttle', 'Review Score', 'Review Count', 'Review Source',
    'Review Summary', 'Official URL', 'Listing URL', 'Transit URL', 'Review URL', 'Source Type',
    'Verification Tier', 'Status', 'Last Verified At', 'Freshness Hours', 'Priority Score',
    'Duplicate Flag', 'Unique Key', 'Notes'
  ]);
  ensureSheet_(ss, SHEET_NAMES.auditLog, [
    'Timestamp', 'Action', 'Sheet', 'Property Name', 'Unique Key', 'Details', 'Source URL'
  ]);
  refreshDerivedFields();
}

function syncSeedQueue() {
  const ss = SpreadsheetApp.getActive();
  const seedSheet = ss.getSheetByName(SHEET_NAMES.seedSources);
  const queueSheet = ss.getSheetByName(SHEET_NAMES.searchQueue);
  const seedRows = getRecords_(seedSheet);
  const queueRows = getRecords_(queueSheet);
  const existing = new Set(queueRows.map((row) => normalizeText_(row['Property Name'])));
  const additions = [];

  seedRows.forEach((row) => {
    const key = normalizeText_(row['Property Name']);
    if (!key || existing.has(key)) return;
    additions.push([
      'P1',
      row['Property Name'],
      row['City'],
      row['Source Type'],
      'Verify live 2B/2B floorplans, concession details, reviews, and Caltrain access.',
      'No',
      'No',
      'No',
      getControlValue_('Default Researcher') || 'Researcher',
      'Queued',
      'Created by Apps Script from Seed Sources.',
    ]);
  });

  if (additions.length) {
    queueSheet.getRange(queueSheet.getLastRow() + 1, 1, additions.length, additions[0].length).setValues(additions);
    additions.forEach((row) => appendAudit_('QUEUE_CREATED', SHEET_NAMES.searchQueue, row[1], '', row[4], ''));
  }
}

function upsertFromIntake() {
  const ss = SpreadsheetApp.getActive();
  const intakeRows = getRecords_(ss.getSheetByName(SHEET_NAMES.intake));
  const candidateSheet = ss.getSheetByName(SHEET_NAMES.candidates);
  const candidateHeaders = getHeaders_(candidateSheet);
  const candidateRows = getRecords_(candidateSheet);
  const rowByKey = {};

  candidateRows.forEach((row, index) => {
    const key = row['Unique Key'] || buildUniqueKey_(row['Apartment Name'], row['Sq Ft'], row['Listed Rent']);
    if (key) rowByKey[key] = index + 2;
  });

  intakeRows.forEach((row) => {
    const key = buildUniqueKey_(row['Apartment Name'], row['Sq Ft'], row['Listed Rent']);
    if (!key) return;
    const record = candidateHeaders.map((header) => candidateValueForHeader_(row, header));
    const targetRow = rowByKey[key];

    if (targetRow) {
      candidateSheet.getRange(targetRow, 1, 1, candidateHeaders.length).setValues([record]);
    } else {
      candidateSheet.getRange(candidateSheet.getLastRow() + 1, 1, 1, candidateHeaders.length).setValues([record]);
    }

    appendAudit_(
      'CANDIDATE_UPSERT',
      SHEET_NAMES.candidates,
      row['Apartment Name'],
      key,
      `Upserted from Intake with status ${row['Status'] || STATUS.pdfSeeded}.`,
      row['Official URL'] || row['Listing URL'] || ''
    );
  });

  refreshDerivedFields();
}

function refreshDerivedFields() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET_NAMES.candidates);
  const lastRow = Math.max(sheet.getLastRow(), 2);
  if (lastRow < 2) return;

  for (let row = 2; row <= lastRow; row += 1) {
    sheet.getRange(`P${row}`).setFormula(`=IF(K${row}="","",K${row}+IF(L${row}="",0,L${row})-IF(O${row}="",0,O${row}))`);
    sheet.getRange(`Q${row}`).setFormula(`=IFERROR(P${row}/J${row},"")`);
    sheet.getRange(`AI${row}`).setFormula(`=IF(AH${row}="","",(NOW()-AH${row})*24)`);
    sheet.getRange(`AJ${row}`).setFormula(
      `=IF(C${row}="","",IF(AG${row}="REJECTED",-1,ROUND((` +
      `MAX(0,MIN(1,(Controls!$B$3-P${row})/MAX(1,Controls!$B$3-Controls!$B$2)))*Controls!$B$6+` +
      `IF(U${row}="",IF(V${row}="Yes",0.6,0),MAX(0,MIN(1,(Controls!$B$4-U${row})/MAX(1,Controls!$B$4))))*Controls!$B$7+` +
      `IF(W${row}="",0,MAX(0,MIN(1,(W${row}-Controls!$B$5)/MAX(0.1,5-Controls!$B$5))))*Controls!$B$8+` +
      `IF(J${row}="",0,MIN(1,J${row}/1100))*Controls!$B$9+` +
      `IF(AI${row}="",0,MAX(0,MIN(1,(Controls!$B$11-AI${row})/MAX(1,Controls!$B$11))))*Controls!$B$10` +
      `)/SUM(Controls!$B$6:Controls!$B$10)*100,2)))`
    );
    sheet.getRange(`AK${row}`).setFormula(`=IF(AL${row}="","",IF(COUNTIF($AL:$AL,AL${row})>1,"CHECK",""))`);
    sheet.getRange(`AL${row}`).setFormula(`=IF(OR(C${row}="",J${row}="",K${row}=""),"",LOWER(TRIM(C${row}))&"|"&TEXT(J${row},"0")&"|"&TEXT(K${row},"0.00"))`);
  }
}

function markStaleCandidates() {
  const ss = SpreadsheetApp.getActive();
  const staleAfterHours = Number(getControlValue_('Stale After Hours') || 72);
  const sheet = ss.getSheetByName(SHEET_NAMES.candidates);
  const rows = getRecords_(sheet);
  const headers = getHeaders_(sheet);
  const statusCol = headers.indexOf('Status') + 1;
  const freshnessCol = headers.indexOf('Freshness Hours') + 1;

  rows.forEach((row, index) => {
    const freshness = Number(row['Freshness Hours']);
    if (!Number.isFinite(freshness)) return;
    if (freshness > staleAfterHours && row['Status'] !== STATUS.rejected) {
      sheet.getRange(index + 2, statusCol).setValue(STATUS.stale);
      appendAudit_('STATUS_UPDATED', SHEET_NAMES.candidates, row['Apartment Name'], row['Unique Key'], 'Marked stale by script.', '');
    }
    if (freshnessCol) {
      sheet.getRange(index + 2, freshnessCol).setNumberFormat('0.00');
    }
  });
}

function openTopCandidates() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET_NAMES.candidates);
  sheet.activate();
  if (sheet.getLastRow() < 3) return;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).sort([
    {column: 36, ascending: false},
    {column: 16, ascending: true},
    {column: 21, ascending: true},
  ]);
}

function candidateValueForHeader_(row, header) {
  const direct = {
    'Research Date': row['Research Date'],
    'Researcher': row['Researcher'],
    'Apartment Name': row['Apartment Name'],
    'City': row['City'],
    'Address': row['Address'],
    'Property Type': row['Property Type'],
    'Unit/Floorplan': row['Unit/Floorplan'],
    'Beds': row['Beds'],
    'Baths': row['Baths'],
    'Sq Ft': row['Sq Ft'],
    'Listed Rent': row['Listed Rent'],
    'Required Fees/mo': row['Required Fees/mo'],
    'Promo Raw': row['Promo Raw'],
    'Lease Term Mo': row['Lease Term Mo'],
    'Discount Est/mo': row['Discount Est/mo'],
    'Availability Date': row['Availability Date'],
    'Closest Station': row['Closest Station'],
    'Walk Distance Mi': row['Walk Distance Mi'],
    'Walk Time Min': row['Walk Time Min'],
    'Shuttle': row['Shuttle'],
    'Review Score': row['Review Score'],
    'Review Count': row['Review Count'],
    'Review Source': row['Review Source'],
    'Review Summary': row['ReviewSummary'] || row['Review Summary'],
    'Official URL': row['Official URL'],
    'Listing URL': row['Listing URL'],
    'Transit URL': row['Transit URL'],
    'Review URL': row['Review URL'],
    'Source Type': row['Source Type'],
    'Verification Tier': row['Verification Tier'],
    'Status': row['Status'] || STATUS.pdfSeeded,
    'Last Verified At': row['Last Verified At'],
    'Notes': row['Notes'],
  };
  if (header === 'Unique Key') {
    return buildUniqueKey_(row['Apartment Name'], row['Sq Ft'], row['Listed Rent']);
  }
  return direct.hasOwnProperty(header) ? direct[header] : '';
}

function getControlValue_(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.controls);
  const rows = getRecords_(sheet);
  const match = rows.find((row) => row['Setting'] === name);
  return match ? match['Value'] : '';
}

function buildUniqueKey_(name, sqFt, listedRent) {
  if (!name || sqFt === '' || listedRent === '') return '';
  const rent = Number(listedRent).toFixed(2);
  return `${normalizeText_(name)}|${Number(sqFt)}|${rent}`;
}

function normalizeText_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getHeaders_(sheet) {
  if (!sheet || sheet.getLastRow() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function getRecords_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = getHeaders_(sheet);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return values
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      return record;
    });
}

function appendAudit_(action, sheetName, propertyName, uniqueKey, details, sourceUrl) {
  const auditSheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.auditLog);
  auditSheet.appendRow([
    new Date(),
    action,
    sheetName,
    propertyName,
    uniqueKey,
    details,
    sourceUrl,
  ]);
}
