const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("timetracker", {
  getData: () => ipcRenderer.invoke("get-data"),
  runCommand: (cmd) => ipcRenderer.invoke("run-command", cmd),
  openDashboard: () => ipcRenderer.invoke("open-dashboard"),
  addNote: (note) => ipcRenderer.invoke("add-note", note),
  getProjects: () => ipcRenderer.invoke("get-projects"),
  onDataUpdate: (callback) => {
    ipcRenderer.on("data-update", (_event, data) => callback(data));
  },
});
