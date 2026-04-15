// Copie este código e cole no editor de script do Google Sheets (Extensões > Apps Script)
// Após colar, clique em "Executar" na função "setup" para criar as abas necessárias.
// Em seguida, clique em "Implantar" > "Nova implantação" > "App da Web"
// Defina "Quem pode acessar" como "Qualquer pessoa" e copie a URL gerada.

const SCRIPT_VERSION = "1.0";

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ['Employees', 'Assignments', 'Settings', 'Rules'];
  
  sheets.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
  });
}

function doGet(e) {
  try {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: {
        employees: getSheetData('Employees'),
        assignments: getSheetData('Assignments'),
        settings: getSheetData('Settings'),
        rules: getSheetData('Rules')
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'saveData') {
      if (data.payload.employees) saveSheetData('Employees', data.payload.employees);
      if (data.payload.assignments) saveSheetData('Assignments', data.payload.assignments);
      if (data.payload.settings) saveSheetData('Settings', data.payload.settings);
      if (data.payload.rules) saveSheetData('Rules', data.payload.rules);
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let value = row[index];
      try {
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          value = JSON.parse(value);
        }
      } catch (e) {}
      obj[header] = value;
    });
    return obj;
  });
}

function saveSheetData(sheetName, items) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
  }
  
  sheet.clear();
  
  if (!items || items.length === 0) return;
  
  // Get all unique keys from all items to use as headers
  const headersSet = new Set();
  items.forEach(item => {
    Object.keys(item).forEach(key => headersSet.add(key));
  });
  const headers = Array.from(headersSet);
  
  sheet.appendRow(headers);
  
  const rows = items.map(item => {
    return headers.map(header => {
      const value = item[header];
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value !== undefined ? value : '';
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}
