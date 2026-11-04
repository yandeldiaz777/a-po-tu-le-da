// A po tu le da? · Autor del código de la aplicación — Yandel Diaz
const {contextBridge,ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('downloads',{
  folder:()=>ipcRenderer.invoke('folder'),
  pick:()=>ipcRenderer.invoke('pick'),
  open:()=>ipcRenderer.invoke('open'),
  add:(url,platform,profile,turbo)=>ipcRenderer.invoke('add',url,platform,profile,turbo),
  cancel:id=>ipcRenderer.invoke('cancel',id),
  onJob:callback=>ipcRenderer.on('job',(_event,data)=>callback(data)),
  onNotice:callback=>ipcRenderer.on('notice',(_event,data)=>callback(data))
});
