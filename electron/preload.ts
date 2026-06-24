import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  db: {
    getProducts: () => ipcRenderer.invoke('db:getProducts'),
    addProduct: (data: unknown) => ipcRenderer.invoke('db:addProduct', data),
    updateProduct: (id: number, data: unknown) => ipcRenderer.invoke('db:updateProduct', id, data),
    deleteProduct: (id: number) => ipcRenderer.invoke('db:deleteProduct', id),
    getBarcodes: (filters?: unknown) => ipcRenderer.invoke('db:getBarcodes', filters),
    addBarcode: (data: unknown) => ipcRenderer.invoke('db:addBarcode', data),
    getNextSequence: (category: string, date: string) =>
      ipcRenderer.invoke('db:getNextSequence', category, date),
    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    updateSettings: (settings: unknown) => ipcRenderer.invoke('db:updateSettings', settings),
    getStats: () => ipcRenderer.invoke('db:getStats'),
    exportCSV: () => ipcRenderer.invoke('db:exportCSV'),
    getStockSummary: () => ipcRenderer.invoke('db:getStockSummary'),
    getStockEntries: (productId?: number) => ipcRenderer.invoke('db:getStockEntries', productId),
    addStockEntry: (data: unknown) => ipcRenderer.invoke('db:addStockEntry', data),
    exportStockCSV: () => ipcRenderer.invoke('db:exportStockCSV'),
  },
  dataManagement: {
    exportData: (targetPath?: string) => ipcRenderer.invoke('data:export', targetPath),
    previewImport: (filePath?: string) => ipcRenderer.invoke('data:import-preview', filePath),
    executeImport: (filePath: string, duplicatePolicy?: string) =>
      ipcRenderer.invoke('data:import-execute', filePath, duplicatePolicy),
    backup: () => ipcRenderer.invoke('data:backup'),
    restore: (backupPath?: string) => ipcRenderer.invoke('data:restore', backupPath),
    reset: () => ipcRenderer.invoke('data:reset'),
  },
  print: {
    label: (data: { html: string; printerName: string; labelSize: string }) =>
      ipcRenderer.invoke('print:label', data),
    getPrinters: () => ipcRenderer.invoke('print:getPrinters'),
  },
  dialog: {
    saveFile: (options: unknown) => ipcRenderer.invoke('dialog:saveFile', options),
    openFile: (options: unknown) => ipcRenderer.invoke('dialog:openFile', options),
  },
})
