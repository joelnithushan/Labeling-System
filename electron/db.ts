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

    INSERT OR IGNORE INTO settings VALUES ('shop_name', 'My Mill Shop');
    INSERT OR IGNORE INTO settings VALUES ('printer_name', '');
    INSERT OR IGNORE INTO settings VALUES ('label_size', '100x50');
    INSERT OR IGNORE INTO settings VALUES ('date_format', 'dd/MM/yyyy');
    INSERT OR IGNORE INTO settings VALUES ('address', '');
    INSERT OR IGNORE INTO settings VALUES ('phone', '');
    INSERT OR IGNORE INTO settings VALUES ('username', 'admin');
    INSERT OR IGNORE INTO settings VALUES ('password', 'admin');
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

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getStats(db: Database.Database) {
  const total_products = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c
  const total_printed = (db.prepare('SELECT COALESCE(SUM(quantity),0) as c FROM barcodes').get() as { c: number }).c
  const today_printed = (db.prepare(
    "SELECT COALESCE(SUM(quantity),0) as c FROM barcodes WHERE date(printed_at) = date('now','localtime')"
  ).get() as { c: number }).c
  const categories = (db.prepare('SELECT COUNT(DISTINCT category) as c FROM products').get() as { c: number }).c
  const recent_barcodes = db.prepare('SELECT * FROM barcodes ORDER BY printed_at DESC LIMIT 10').all()
  return { total_products, total_printed, today_printed, categories, recent_barcodes }
}
