const PASSWORD_ADMIN = "mantencioncermaq";
const SHEET_NAME_DB = "O2 y Energía"; 
const SHEET_NAME_VIEW = "Resumen_Diario"; 

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Database Sheet
  let sheetDB = ss.getSheetByName(SHEET_NAME_DB);
  if (!sheetDB) {
    sheetDB = ss.getSheetByName("Hoja 1") || ss.insertSheet(SHEET_NAME_DB);
    if (sheetDB) sheetDB.setName(SHEET_NAME_DB);
  }
  
  // Create Headers if empty
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
    // Write headers
    sheetDB.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Style headers
    sheetDB.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#cfe2f3");
    sheetDB.setFrozenRows(1);
  }

  // 2. Setup Dashboard (View) Sheet - OPTIONAL but helpful
  let sheetView = ss.getSheetByName(SHEET_NAME_VIEW);
  if (!sheetView) {
    sheetView = ss.insertSheet(SHEET_NAME_VIEW);
  }
}

// --- API HANDLING ---

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_DB);
  
  // Standard JSON Return Helper
  const returnJSON = (data) => ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);

  if (!sheet) return returnJSON({result: "error", message: "Hoja de datos no encontrada"});
  if (!e.postData) return returnJSON({result: "error", message: "No data received"});

  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10s for other users

  try {
    const data = JSON.parse(e.postData.contents);
    
    // --- ADMIN EDIT MODE ---
    if (data.modo === "ADMIN") {
      if (data.password === PASSWORD_ADMIN) {
        const ultimaFila = sheet.getLastRow();
        if (ultimaFila < 2) return returnJSON({result: "error", message: "No hay registros para editar"});
        
        // Update last row (excluding timestamp at col 1)
        const filaActualizada = [data.responsable, ...data.valores];
        // Timestmap is Col 1. Data starts at Col 2.
        sheet.getRange(ultimaFila, 2, 1, filaActualizada.length).setValues([filaActualizada]);
        
        return returnJSON({result: "success", message: "Último registro corregido exitosamente"});
      } else {
        return returnJSON({result: "error", message: "Contraseña de Admin incorrecta"});
      }
    }

    // --- NORMAL MODE ---
    // Create row: Timestamp + Responsable + Values
    const nuevaFila = [new Date(), data.responsable, ...data.valores];
    sheet.appendRow(nuevaFila);
    
    // Update Dashboard View
    updateDashboard(data);

    return returnJSON({result: "success", message: "Datos guardados"});
    
  } catch (err) {
    return returnJSON({result: "error", message: "Error interno: " + err.toString()});
  } finally {
    lock.releaseLock();
  }
}

// Helper to update the Visual Dashboard Sheet
function updateDashboard(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetView = ss.getSheetByName(SHEET_NAME_VIEW);
    if (!sheetView) sheetView = ss.insertSheet(SHEET_NAME_VIEW);
    
    sheetView.clearContents();
    
    // Header
    sheetView.getRange("A1:C1").merge().setValue("ÚLTIMO REGISTRO ENERGÍA & O2")
      .setFontWeight("bold").setBackground("#1a73e8").setFontColor("white").setHorizontalAlignment("center");
      
    sheetView.getRange("A2").setValue("Fecha:");
    sheetView.getRange("B2").setValue(new Date());
    sheetView.getRange("A3").setValue("Responsable:");
    sheetView.getRange("B3").setValue(data.responsable);
    
    // Data Loop
    let row = 5;
    const labels = [
       "O2 Comp KW", "O2 Comp M3", "O2 Comp HRS", 
       "O2 Gen1 HRS", "O2 Gen1 M3",
       "O2 Gen2 HRS", "O2 Gen2 M3",
       "O2 Cons Fry", "O2 Cons Smolt",
       "Red V12", "Red V23", "Red V31",
       "Red I1", "Red I2", "Red I3", "Red IN",
       "Red SumP KW", "Red EA GW",
       "D Gen1 HRS", "D Gen1 KW", "D Gen1 Lts",
       "D Gen2 HRS", "D Gen2 KW", "D Gen2 Lts",
       "D Gen3 HRS", "D Gen3 KW", "D Gen3 Lts"
    ];
    
    // Write labels and values
    // data.valores matches the order of labels
    for (let i = 0; i < labels.length; i++) {
      sheetView.getRange(row, 1).setValue(labels[i]).setFontWeight("bold");
      sheetView.getRange(row, 2).setValue(data.valores[i] || "-");
      row++;
    }
    
    // Formatting
    sheetView.getRange("A2:A" + (row-1)).setFontWeight("bold");
    sheetView.autoResizeColumns(1, 2);
    
  } catch(e) {
    console.error("Error updates dashboard: " + e.toString());
  }
}

// Ping for Network Check OR Get Latest Data
function doGet(e) {
  // If action=latest, return the last submission data
  if (e.parameter && e.parameter.action === "latest") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetView = ss.getSheetByName(SHEET_NAME_VIEW);
    
    // Auto-create if missing
    if (!sheetView) {
      sheetView = ss.insertSheet(SHEET_NAME_VIEW);
    }
    
    // CHECK: Is View empty? If so, try to populate from DB
    if (sheetView.getRange("B2").getValue() === "") {
      const sheetDB = ss.getSheetByName(SHEET_NAME_DB);
      if (sheetDB && sheetDB.getLastRow() >= 2) {
         const lastRow = sheetDB.getLastRow();
         // Col 2 = Responsable, Col 3+ = Values
         const responsable = sheetDB.getRange(lastRow, 2).getValue();
         // 27 Data Columns
         const valores = sheetDB.getRange(lastRow, 3, 1, 27).getValues()[0];
         
         // Update the view sheet so it's ready
         updateDashboard({
           responsable: responsable,
           valores: valores
         });
         
         // Re-get sheetView after update to ensure we read fresh data
         sheetView = ss.getSheetByName(SHEET_NAME_VIEW);
      }
    }
    
    // Now read from View (either pre-existing or just populated)
    const lastUpdate = sheetView.getRange("B2").getValue();
    const responsable = sheetView.getRange("B3").getValue();
    
    // Read key-values starting at row 5
    const lastRow = sheetView.getLastRow();
    let values = [];
    if (lastRow >= 5) {
       values = sheetView.getRange(5, 1, lastRow - 4, 2).getValues(); // Read Col A and B
    }
    
    const result = {
      timestamp: lastUpdate,
      responsable: responsable,
      data: values // [[Label, Value], [Label, Value]...]
    };
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  // Default Ping
  return ContentService.createTextOutput(JSON.stringify({status: "online"})).setMimeType(ContentService.MimeType.JSON);
}

// --- MANUAL INIT FUNCTION ---
// Run this ONCE from the GAS Editor to populate the dashboard with the last known data
function manualInitDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetDB = ss.getSheetByName(SHEET_NAME_DB);
  
  if (!sheetDB || sheetDB.getLastRow() < 2) {
    Logger.log("No data found in DB to initialize.");
    return;
  }
  
  const lastRow = sheetDB.getLastRow();
  // Col 1=Time, Col 2=Resp, Col 3...=Values
  const responsable = sheetDB.getRange(lastRow, 2).getValue();
  // We have 27 value columns defined in headers
  const valores = sheetDB.getRange(lastRow, 3, 1, 27).getValues()[0];
  
  const data = {
    responsable: responsable,
    valores: valores
  };
  
  updateDashboard(data);
  Logger.log("Dashboard manually initialized with data from Row " + lastRow);
}
