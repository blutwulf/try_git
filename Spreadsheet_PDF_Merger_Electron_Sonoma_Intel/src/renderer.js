const $ = id => document.getElementById(id);
let spreadsheetPath = null;
let inputDir = null;
let outputDir = null;
let headers = [];

function setStatus(text) { $("status").textContent = text; }
function log(text) { $("log").textContent += `${text}\n`; $("log").scrollTop = $("log").scrollHeight; }
function refreshRun() {
  $("run").disabled = !(spreadsheetPath && inputDir && outputDir && headers.length);
}
function populateSelect(select, values) {
  select.innerHTML = "";
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.disabled = !values.length;
}
$("chooseSheet").addEventListener("click", async () => {
  try {
    const result = await window.pdfMerger.chooseSpreadsheet();
    if (!result) return;
    spreadsheetPath = result.filePath;
    headers = result.headers;
    $("sheetPath").textContent = `${result.fileName} — ${result.rowCount} rows`;
    populateSelect($("firstColumn"), headers);
    populateSelect($("secondColumn"), headers);
    $("nameColumns").disabled = !headers.length;
    $("nameColumns").value = headers[0] || "";
    const lower = Object.fromEntries(headers.map(h => [h.toLowerCase(), h]));
    const first = ["pdf1", "first pdf", "file 1", "filename 1", "pdf a", "source 1"].map(k => lower[k]).find(Boolean);
    const second = ["pdf2", "second pdf", "file 2", "filename 2", "pdf b", "source 2"].map(k => lower[k]).find(Boolean);
    if (first) $("firstColumn").value = first;
    if (second) $("secondColumn").value = second;
    setStatus(`Loaded ${result.rowCount} rows. Map the PDF columns and output naming columns.`);
    log(`Spreadsheet loaded: ${result.fileName} (${result.rowCount} rows)`);
    refreshRun();
  } catch (error) { setStatus(error.message); }
});
$("chooseInput").addEventListener("click", async () => {
  inputDir = await window.pdfMerger.chooseFolder("input");
  if (inputDir) $("inputPath").textContent = inputDir;
  refreshRun();
});
$("chooseOutput").addEventListener("click", async () => {
  outputDir = await window.pdfMerger.chooseFolder("output");
  if (outputDir) $("outputPath").textContent = outputDir;
  refreshRun();
});
$("run").addEventListener("click", async () => {
  const nameColumns = $("nameColumns").value.split(",").map(s => s.trim()).filter(Boolean);
  if ($("firstColumn").value === $("secondColumn").value) {
    setStatus("Choose two different PDF filename columns.");
    return;
  }
  if (!nameColumns.length) {
    setStatus("Enter at least one output naming column.");
    return;
  }
  $("run").disabled = true;
  $("log").textContent = "";
  setStatus("Processing PDFs…");
  try {
    const result = await window.pdfMerger.runMerge({
      spreadsheetPath, inputDir, outputDir,
      firstColumn: $("firstColumn").value,
      secondColumn: $("secondColumn").value,
      nameColumns,
      recursive: $("recursive").checked,
      overwrite: $("overwrite").checked
    });
    setStatus(`Finished: ${result.success} of ${result.total} outputs created. Report saved to ${result.reportPath}`);
    for (const row of result.report.slice(1)) {
      log(`${row[4]} | Row ${row[0]} | ${row[3]} | ${row[5]}`);
    }
    log(`Report: ${result.reportPath}`);
  } catch (error) {
    setStatus(`Error: ${error.message}`);
    log(error.stack || error.message);
  } finally {
    refreshRun();
  }
});
