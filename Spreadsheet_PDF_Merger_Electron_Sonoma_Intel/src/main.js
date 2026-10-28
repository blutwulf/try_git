const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const { PDFDocument } = require("pdf-lib");
const XLSX = require("xlsx");

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 760,
    minWidth: 780,
    minHeight: 620,
    title: "Spreadsheet PDF Merger",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("choose-spreadsheet", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Spreadsheets", extensions: ["xlsx", "xls", "xlsm", "csv"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { filePath, fileName: path.basename(filePath), headers, rowCount: rows.length };
});

ipcMain.handle("choose-folder", async ({}, kind) => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: kind === "input" ? "Choose source PDF folder" : "Choose output folder"
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("run-merge", async (_event, options) => {
  const { spreadsheetPath, inputDir, outputDir, firstColumn, secondColumn, nameColumns, recursive, overwrite } = options;
  if (!spreadsheetPath || !inputDir || !outputDir) throw new Error("Choose a spreadsheet, source PDF folder, and output folder.");
  const workbook = XLSX.readFile(spreadsheetPath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  if (!rows.length) throw new Error("The spreadsheet has no data rows.");
  for (const col of [firstColumn, secondColumn, ...nameColumns]) {
    if (!col || !(col in rows[0])) throw new Error(`Spreadsheet column not found: ${col || "(blank)"}`);
  }

  const index = new Map();
  async function scan(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && recursive) await scan(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        const key = entry.name.toLowerCase();
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(full);
      }
    }
  }
  await scan(inputDir);

  const safeName = value => String(value || "").trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ").replace(/^[ .]+|[ .]+$/g, "") || "merged_pdf";
  const resolve = async rawValue => {
    const value = String(rawValue || "").trim();
    if (!value) return null;
    const candidate = path.isAbsolute(value) ? value : path.join(inputDir, value);
    try {
      const st = await fs.stat(candidate);
      if (st.isFile()) return candidate;
    } catch {}
    const matches = index.get(path.basename(value).toLowerCase()) || [];
    return matches.length === 1 ? matches[0] : null;
  };

  const report = [["Spreadsheet row", "First PDF", "Second PDF", "Output file", "Status", "Details"]];
  let success = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const first = String(row[firstColumn] || "").trim();
    const second = String(row[secondColumn] || "").trim();
    const filename = safeName(nameColumns.map(c => String(row[c] || "").trim()).filter(Boolean).join("_")) + ".pdf";
    const firstPath = await resolve(first);
    const secondPath = await resolve(second);
    if (!first || !second || !firstPath || !secondPath) {
      const details = `Missing or ambiguous source: ${[!firstPath ? first || "(blank first PDF)" : "", !secondPath ? second || "(blank second PDF)" : ""].filter(Boolean).join("; ")}`;
      report.push([i + 2, first, second, filename, "ERROR", details]);
      continue;
    }
    const outputPath = path.join(outputDir, filename);
    try {
      try {
        await fs.access(outputPath);
        if (!overwrite) {
          report.push([i + 2, first, second, filename, "SKIPPED", "Output already exists; overwrite is disabled."]);
          continue;
        }
      } catch {}
      const sourceA = await PDFDocument.load(await fs.readFile(firstPath));
      const sourceB = await PDFDocument.load(await fs.readFile(secondPath));
      if (sourceA.getPageCount() !== 1 || sourceB.getPageCount() !== 1) {
        throw new Error(`Expected one page in each source; found ${sourceA.getPageCount()} and ${sourceB.getPageCount()}.`);
      }
      const output = await PDFDocument.create();
      const [pageA] = await output.copyPages(sourceA, [0]);
      const [pageB] = await output.copyPages(sourceB, [0]);
      output.addPage(pageA);
      output.addPage(pageB);
      const bytes = await output.save();
      await fs.writeFile(outputPath, bytes, { flag: overwrite ? "w" : "wx" });
      const verify = await PDFDocument.load(await fs.readFile(outputPath));
      if (verify.getPageCount() !== 2) {
        await fs.unlink(outputPath).catch(() => {});
        throw new Error("Output validation failed; expected exactly two pages.");
      }
      success++;
      report.push([i + 2, first, second, filename, "OK", "Created and verified: 2 pages"]);
    } catch (err) {
      report.push([i + 2, first, second, filename, "ERROR", err.message || String(err)]);
    }
  }
  const reportSheet = XLSX.utils.aoa_to_sheet(report);
  const reportBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(reportBook, reportSheet, "Merge Report");
  const reportPath = path.join(outputDir, "merge_report.xlsx");
  XLSX.writeFile(reportBook, reportPath);
  return { total: rows.length, success, reportPath, report };
});
