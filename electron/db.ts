import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database | undefined

export function getDatabasePath(): string {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'database.db')
    : path.join(process.cwd(), 'database.dev.db')
}

export function getDb(): Database.Database {
  if (db) return db

  db = new Database(getDatabasePath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  return db
}

export function closeDb() {
  if (!db) return
  db.close()
  db = undefined
}

export function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      weight TEXT NOT NULL,
      weight_unit TEXT NOT NULL DEFAULT 'kg',
      price REAL NOT NULL,
      shelf_life_days INTEGER NOT NULL DEFAULT 180,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS barcodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      weight TEXT NOT NULL,
      weight_unit TEXT NOT NULL,
      price REAL NOT NULL,
      serial_number TEXT NOT NULL UNIQUE,
      barcode_value TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      mfg_date TEXT NOT NULL,
      exp_date TEXT NOT NULL,
      printed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('stock_in', 'stock_out', 'adjustment')),
      quantity_change INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    INSERT OR IGNORE INTO settings VALUES ('shop_name', 'My Mill Shop');
    INSERT OR IGNORE INTO settings VALUES ('printer_name', '');
    INSERT OR IGNORE INTO settings VALUES ('label_size', '100x50');
    INSERT OR IGNORE INTO settings VALUES ('date_format', 'dd/MM/yyyy');
    INSERT OR IGNORE INTO settings VALUES ('address', '');
    INSERT OR IGNORE INTO settings VALUES ('phone', '');
    INSERT OR IGNORE INTO settings VALUES ('username', 'admin');
    INSERT OR IGNORE INTO settings VALUES ('password', 'admin');
    INSERT OR IGNORE INTO settings VALUES ('logo', '');
    INSERT OR IGNORE INTO settings VALUES ('theme', 'dark');
    INSERT OR IGNORE INTO settings VALUES ('label_net_wt', 'NET WT');
    INSERT OR IGNORE INTO settings VALUES ('label_price', 'PRICE');
    INSERT OR IGNORE INTO settings VALUES ('label_mfg', 'Mfg Date');
    INSERT OR IGNORE INTO settings VALUES ('label_exp', 'Exp Date');
  `)
}

// ─── Products ────────────────────────────────────────────────────────────────

export function getAllProducts(db: Database.Database) {
  return db.prepare('SELECT * FROM products ORDER BY name ASC').all()
}

export function insertProduct(db: Database.Database, data: {
  name: string; category: string; weight: string; weight_unit: string;
  price: number; shelf_life_days: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO products (name, category, weight, weight_unit, price, shelf_life_days)
    VALUES (@name, @category, @weight, @weight_unit, @price, @shelf_life_days)
  `)
  const result = stmt.run(data)
  return db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
}

export function updateProduct(db: Database.Database, id: number, data: {
  name: string; category: string; weight: string; weight_unit: string;
  price: number; shelf_life_days: number;
}) {
  db.prepare(`
    UPDATE products
    SET name=@name, category=@category, weight=@weight, weight_unit=@weight_unit,
        price=@price, shelf_life_days=@shelf_life_days
    WHERE id=@id
  `).run({ ...data, id })
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
}

export function deleteProduct(db: Database.Database, id: number) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id)
}

// ─── Barcodes ─────────────────────────────────────────────────────────────────

export function getAllBarcodes(db: Database.Database, filters?: {
  search?: string; date?: string; limit?: number;
}) {
  let query = 'SELECT * FROM barcodes'
  const params: unknown[] = []
  const where: string[] = []

  if (filters?.search) {
    where.push('(product_name LIKE ? OR serial_number LIKE ? OR category LIKE ?)')
    const s = `%${filters.search}%`
    params.push(s, s, s)
  }
  if (filters?.date) {
    where.push("date(printed_at) = date(?)")
    params.push(filters.date)
  }

  if (where.length) query += ' WHERE ' + where.join(' AND ')
  query += ' ORDER BY printed_at DESC'
  if (filters?.limit) query += ` LIMIT ${filters.limit}`

  return db.prepare(query).all(...params)
}

export function insertBarcode(db: Database.Database, data: {
  product_id: number | null; product_name: string; category: string;
  weight: string; weight_unit: string; price: number;
  serial_number: string; barcode_value: string; quantity: number;
  mfg_date: string; exp_date: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO barcodes
      (product_id, product_name, category, weight, weight_unit, price,
       serial_number, barcode_value, quantity, mfg_date, exp_date)
    VALUES
      (@product_id, @product_name, @category, @weight, @weight_unit, @price,
       @serial_number, @barcode_value, @quantity, @mfg_date, @exp_date)
  `)
  const result = stmt.run(data)
  return db.prepare('SELECT * FROM barcodes WHERE id = ?').get(result.lastInsertRowid)
}

export function getNextSequence(db: Database.Database, category: string, date: string): number {
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM barcodes
    WHERE category = ? AND date(printed_at) = date(?)
  `).get(category, date) as { cnt: number }
  return (row?.cnt ?? 0) + 1
}

export function exportBarcodesCSV(db: Database.Database): string {
  const rows = db.prepare('SELECT * FROM barcodes ORDER BY printed_at DESC').all() as Record<string, unknown>[]
  if (!rows.length) return ''
  const headers = Object.keys(rows[0]).join(',')
  const lines = rows.map(r =>
    Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  )
  return [headers, ...lines].join('\n')
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getAllSettings(db: Database.Database): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export function saveSettings(db: Database.Database, settings: Record<string, string>) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const runMany = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) stmt.run(key, value)
  })
  runMany(Object.entries(settings))
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export function getStockSummary(db: Database.Database) {
  return db.prepare(`
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.category,
      p.weight,
      p.weight_unit,
      COALESCE(SUM(se.quantity_change), 0) as current_stock
    FROM products p
    LEFT JOIN stock_entries se ON p.id = se.product_id
    GROUP BY p.id
    ORDER BY p.name ASC
  `).all()
}

export function getStockEntries(db: Database.Database, productId?: number) {
  let query = `
    SELECT se.*, p.name as product_name 
    FROM stock_entries se
    JOIN products p ON se.product_id = p.id
  `
  const params: unknown[] = []
  if (productId) {
    query += ' WHERE se.product_id = ?'
    params.push(productId)
  }
  query += ' ORDER BY se.created_at DESC, se.id DESC'
  return db.prepare(query).all(...params)
}

export function insertStockEntry(db: Database.Database, data: {
  product_id: number;
  type: 'stock_in' | 'adjustment';
  quantity_change: number;
  note?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO stock_entries (product_id, type, quantity_change, note)
    VALUES (@product_id, @type, @quantity_change, COALESCE(@note, ''))
  `)
  const result = stmt.run(data)
  return db.prepare(`
    SELECT se.*, p.name as product_name 
    FROM stock_entries se 
    JOIN products p ON se.product_id = p.id 
    WHERE se.id = ?
  `).get(result.lastInsertRowid)
}

export function autoDeductStock(db: Database.Database, productId: number, quantity: number) {
  if (!productId) return
  const stmt = db.prepare(`
    INSERT INTO stock_entries (product_id, type, quantity_change, note)
    VALUES (?, 'stock_out', ?, ?)
  `)
  stmt.run(productId, -quantity, 'Label printed')
}

export function exportStockCSV(db: Database.Database): string {
  const rows = db.prepare(`
    SELECT se.id, se.created_at, p.name as product_name, se.type, se.quantity_change, se.note
    FROM stock_entries se
    JOIN products p ON se.product_id = p.id
    ORDER BY se.created_at DESC, se.id DESC
  `).all() as Record<string, unknown>[]
  if (!rows.length) return ''
  const headers = Object.keys(rows[0]).join(',')
  const lines = rows.map(r =>
    Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  )
  return [headers, ...lines].join('\n')
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getStats(db: Database.Database) {
  const total_products = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c
  const total_printed = (db.prepare('SELECT COALESCE(SUM(quantity),0) as c FROM barcodes').get() as { c: number }).c
  const today_printed = (db.prepare(
    "SELECT COALESCE(SUM(quantity),0) as c FROM barcodes WHERE date(printed_at) = date('now','localtime')"
  ).get() as { c: number }).c
  const categories = (db.prepare('SELECT COUNT(DISTINCT category) as c FROM products').get() as { c: number }).c
  const recent_barcodes = db.prepare('SELECT * FROM barcodes ORDER BY printed_at DESC LIMIT 10').all()
  
  // Calculate count of products with stock <= 10
  const low_stock_count = (db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT p.id, COALESCE(SUM(se.quantity_change), 0) as current_stock
      FROM products p
      LEFT JOIN stock_entries se ON p.id = se.product_id
      GROUP BY p.id
      HAVING current_stock <= 10
    )
  `).get() as { c: number }).c

  return { total_products, total_printed, today_printed, categories, recent_barcodes, low_stock_count }
}
