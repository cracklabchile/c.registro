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
    
    return returnJSON({result: "success", message: "Datos guardados"});
    
  } catch (err) {
    return returnJSON({result: "error", message: "Error interno: " + err.toString()});
  } finally {
    lock.releaseLock();
  }
}

// Ping for Network Check
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({status: "online"})).setMimeType(ContentService.MimeType.JSON);
}
