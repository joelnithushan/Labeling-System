import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import {
  getDb, getAllProducts, insertProduct, updateProduct, deleteProduct,
  getAllBarcodes, insertBarcode, getNextSequence, exportBarcodesCSV,
  getAllSettings, saveSettings, getStats,
  getStockSummary, getStockEntries, insertStockEntry, autoDeductStock, exportStockCSV,
} from './db'
import { registerDataManagementIpcHandlers } from './dataManagement'

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'Mill Label System',
    backgroundColor: '#0f172a',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC: Database ────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  registerDataManagementIpcHandlers(ipcMain)

  ipcMain.handle('db:getProducts', () => {
    return getAllProducts(getDb())
  })

  ipcMain.handle('db:addProduct', (_, data) => {
    return insertProduct(getDb(), data)
  })

  ipcMain.handle('db:updateProduct', (_, id, data) => {
    return updateProduct(getDb(), id, data)
  })

  ipcMain.handle('db:deleteProduct', (_, id) => {
    deleteProduct(getDb(), id)
    return { success: true }
  })

  ipcMain.handle('db:getBarcodes', (_, filters) => {
    return getAllBarcodes(getDb(), filters)
  })

  ipcMain.handle('db:addBarcode', (_, data) => {
    const result = insertBarcode(getDb(), data)
    if (data.product_id != null) {
      autoDeductStock(getDb(), data.product_id, data.quantity || 1)
    }
    return result
  })

  ipcMain.handle('db:getNextSequence', (_, category, date) => {
    return getNextSequence(getDb(), category, date)
  })

  ipcMain.handle('db:getSettings', () => {
    return getAllSettings(getDb())
  })

  ipcMain.handle('db:updateSettings', (_, settings) => {
    saveSettings(getDb(), settings)
    return { success: true }
  })

  ipcMain.handle('db:getStats', () => {
    return getStats(getDb())
  })

  ipcMain.handle('db:getStockSummary', () => {
    return getStockSummary(getDb())
  })

  ipcMain.handle('db:getStockEntries', (_, productId) => {
    return getStockEntries(getDb(), productId)
  })

  ipcMain.handle('db:addStockEntry', (_, data) => {
    return insertStockEntry(getDb(), data)
  })

  ipcMain.handle('db:exportStockCSV', async () => {
    const csv = exportStockCSV(getDb())
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Stock History CSV',
      defaultPath: `stock-history-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    })
    if (canceled || !filePath) return { success: false }
    fs.writeFileSync(filePath, csv, 'utf-8')
    shell.showItemInFolder(filePath)
    return { success: true, filePath }
  })

  ipcMain.handle('db:exportCSV', async () => {
    const csv = exportBarcodesCSV(getDb())
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Barcodes CSV',
      defaultPath: `barcodes-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    })
    if (canceled || !filePath) return { success: false }
    fs.writeFileSync(filePath, csv, 'utf-8')
    shell.showItemInFolder(filePath)
    return { success: true, filePath }
  })

  // ─── IPC: Print ─────────────────────────────────────────────────────────────

  ipcMain.handle('print:getPrinters', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return []
    return win.webContents.getPrintersAsync()
  })

  ipcMain.handle('print:label', async (_, { html, printerName, labelSize }) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const printWin = new BrowserWindow({
        width: 600,
        height: 400,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })

      const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; }
  @media print {
    @page { margin: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>${html}</body>
</html>`

      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`)

      printWin.webContents.once('did-finish-load', () => {
        const [wMm, hMm] = (labelSize || '100x50').split('x').map(Number)
        printWin.webContents.print(
          {
            silent: !!printerName,
            printBackground: true,
            deviceName: printerName || undefined,
            pageSize: { width: wMm * 1000, height: hMm * 1000 },
            margins: { marginType: 'none' },
          },
          (success, reason) => {
            printWin.destroy()
            if (success) resolve({ success: true })
            else resolve({ success: false, error: reason })
          }
        )
      })
    })
  })

  ipcMain.handle('dialog:saveFile', async (_, options) => {
    return dialog.showSaveDialog(options)
  })

  ipcMain.handle('dialog:openFile', async (_, options) => {
    return dialog.showOpenDialog(options)
  })
}
