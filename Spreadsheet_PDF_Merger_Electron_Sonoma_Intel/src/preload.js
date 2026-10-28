const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("pdfMerger", {
  chooseSpreadsheet: () => ipcRenderer.invoke("choose-spreadsheet"),
  chooseFolder: kind => ipcRenderer.invoke("choose-folder", kind),
  runMerge: options => ipcRenderer.invoke("run-merge", options)
});
