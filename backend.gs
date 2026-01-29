const PASSWORD_ADMIN = "mantencioncermaq";
const SHEET_NAME_DB = "O2 y Energía"; 
const SHEET_NAME_VIEW = "Resumen_Diario"; 

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheetDB = ss.getSheetByName(SHEET_NAME_DB);
  if (!sheetDB) {
    sheetDB = ss.getSheetByName("Hoja 1") || ss.insertSheet(SHEET_NAME_DB);
    if (sheetDB) sheetDB.setName(SHEET_NAME_DB);
  }
  
  if (sheetDB.getRange("A1").getValue() === "") {
    const headers = [
      "Timestamp", "Responsable", 
      "O2_Comp_KW", "O2_Comp_M3", "O2_Comp_HRS", 
      "O2_Gen1_HRS", "O2_Gen1_M3", "O2_Gen2_HRS", "O2_Gen2_M3", 
      "O2_Cons_Fry", "O2_Cons_Smolt", 
      "Red_V12", "Red_V23", "Red_V31", "Red_I1", "Red_I2", "Red_I3", "Red_IN", 
      "Red_SumP_KW", "Red_EA_GW", 
      "D_Gen1_HRS", "D_Gen1_KW", "D_Gen1_Lts", 
      "D_Gen2_HRS", "D_Gen2_KW", "D_Gen2_Lts", 
      "D_Gen3_HRS", "D_Gen3_KW", "D_Gen3_Lts"
    ];
    sheetDB.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheetDB.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#cfe2f3");
    sheetDB.setFrozenRows(1);
  }

  let sheetView = ss.getSheetByName(SHEET_NAME_VIEW);
  if (!sheetView) {
    sheetView = ss.insertSheet(SHEET_NAME_VIEW);
  }
  
  sheetView.clear();
  sheetView.getRange("B1:E1").merge().setValue("📊 VISOR DE TURNO ACTUAL").setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#0f172a").setFontColor("white");
  
  const dbRef = `'${SHEET_NAME_DB}'`; 
  const lastRowFormula = `LOOKUP(2,1/(${dbRef}!A:A<>""),ROW(${dbRef}!A:A))`; 
  
  const etiquetas = [
    {cell: "A3", val: "📅 FECHA"}, {cell: "C3", val: "👤 RESPONSABLE"},
    {cell: "A5", val: "💨 OXÍGENO"}, {cell: "C5", val: "⚡ ENERGÍA"},
    {cell: "A6", val: "Compresor KW"}, {cell: "A7", val: "Compresor M3"}, {cell: "A8", val: "Compresor HRS"},
    {cell: "A9", val: "Gen 1 HRS"}, {cell: "A10", val: "Gen 1 M3"},
    {cell: "A11", val: "Gen 2 HRS"}, {cell: "A12", val: "Gen 2 M3"},
    {cell: "A13", val: "Consumo Fry"}, {cell: "A14", val: "Consumo Smolt"},
    
    {cell: "C6", val: "Voltaje V12"}, {cell: "C7", val: "Voltaje V23"}, {cell: "C8", val: "Voltaje V31"},
    {cell: "C9", val: "Corriente I1"}, {cell: "C10", val: "Corriente I2"}, {cell: "C11", val: "Corriente I3"}, {cell: "C12", val: "Corriente IN"},
    {cell: "C13", val: "Sum Potencia KW"}, {cell: "C14", val: "Energia Activa GW"},
    
    {cell: "A16", val: "⛽ DIESEL G1"}, {cell: "C16", val: "⛽ DIESEL G2"}, {cell: "E16", val: "⛽ DIESEL G3"},
    {cell: "A17", val: "G1 HRS"}, {cell: "A18", val: "G1 KW"}, {cell: "A19", val: "G1 Lts"},
    {cell: "C17", val: "G2 HRS"}, {cell: "C18", val: "G2 KW"}, {cell: "C19", val: "G2 Lts"},
    {cell: "E17", val: "G3 HRS"}, {cell: "E18", val: "G3 KW"}, {cell: "E19", val: "G3 Lts"},
  ];
  
  etiquetas.forEach(item => sheetView.getRange(item.cell).setValue(item.val).setFontWeight("bold"));
  
  const formulaPrefix = `=INDEX(${dbRef}!$A:$AC, MATCH(MAX(${dbRef}!$A:$A), ${dbRef}!$A:$A, 0), `;
  
  const map = {
    "B3": 1, "D3": 2,
    "B6": 3, "B7": 4, "B8": 5, "B9": 6, "B10": 7, "B11": 8, "B12": 9, "B13": 10, "B14": 11,
    "D6": 12, "D7": 13, "D8": 14, "D9": 15, "D10": 16, "D11": 17, "D12": 18, "D13": 19, "D14": 20,
    "B17": 21, "B18": 22, "B19": 23,
    "D17": 24, "D18": 25, "D19": 26,
    "F17": 27, "F18": 28, "F19": 29 
  };
  
  for (let cell in map) {
    sheetView.getRange(cell).setFormula(formulaPrefix + map[cell] + ")");
    sheetView.getRange(cell).setHorizontalAlignment("center");
  }
  
  sheetView.getRange("A5:B14").setBorder(true, true, true, true, null, null).setBackground("#e6f4ea");
  sheetView.getRange("C5:D14").setBorder(true, true, true, true, null, null).setBackground("#fff2cc");
  sheetView.getRange("A16:F19").setBorder(true, true, true, true, null, null).setBackground("#f4cccc");
  
  sheetView.autoResizeColumns(1, 6);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_DB) || ss.getSheets()[0]; 
  
  if (!e.postData) return ContentService.createTextOutput("Error: No data sent");

  const data = JSON.parse(e.postData.contents);
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    if (data.modo === "ADMIN") {
      if (data.password === PASSWORD_ADMIN) {
        const ultimaFila = sheet.getLastRow();
        const filaActualizada = [data.responsable, ...data.valores];
        sheet.getRange(ultimaFila, 2, 1, filaActualizada.length).setValues([filaActualizada]);
        return ContentService.createTextOutput(JSON.stringify({result: "success", message: "Registro corregido"}));
      } else {
        return ContentService.createTextOutput(JSON.stringify({result: "error", message: "Clave incorrecta"}));
      }
    }

    const nuevaFila = [new Date(), data.responsable, ...data.valores];
    sheet.appendRow(nuevaFila);
    return ContentService.createTextOutput(JSON.stringify({result: "success", message: "Datos guardados"}));
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", message: err.toString()}));
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({status: "online"}));
}
