/*
 * Seed script — inserts sample Tamil products (and opening stock) into the
 * development database so the app has realistic data to work with.
 *
 * Run with:  npm run seed
 * (which calls:  ELECTRON_RUN_AS_NODE=1 electron scripts/seed.cjs)
 *
 * Idempotent: a product is only inserted if one with the same name + weight
 * does not already exist, so re-running will not create duplicates.
 */
const path = require('path')
const Database = require('better-sqlite3')

// Matches getDatabasePath() in electron/db.ts for the dev (non-packaged) case.
const dbPath = path.join(process.cwd(), 'database.dev.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Ensure the tables we need exist (mirrors initSchema in electron/db.ts).
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
  CREATE TABLE IF NOT EXISTS stock_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('stock_in', 'stock_out', 'adjustment')),
    quantity_change INTEGER NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
`)

// Tamil product catalogue. Categories MUST match CATEGORY_CODES in src/types/index.ts.
// Prices are in LKR. openingStock seeds an initial stock_in entry.
const PRODUCTS = [
  { name: 'அரிசி மாவு',        category: 'Flour',  weight: '1',   weight_unit: 'kg', price: 220, shelf_life_days: 180, openingStock: 50 },
  { name: 'கோதுமை மாவு',      category: 'Flour',  weight: '1',   weight_unit: 'kg', price: 260, shelf_life_days: 180, openingStock: 40 },
  { name: 'புட்டு மாவு',       category: 'Flour',  weight: '500', weight_unit: 'g',  price: 150, shelf_life_days: 150, openingStock: 60 },
  { name: 'கம்பு',            category: 'Millet', weight: '1',   weight_unit: 'kg', price: 320, shelf_life_days: 365, openingStock: 35 },
  { name: 'கேழ்வரகு',         category: 'Millet', weight: '1',   weight_unit: 'kg', price: 340, shelf_life_days: 365, openingStock: 30 },
  { name: 'தினை',             category: 'Millet', weight: '1',   weight_unit: 'kg', price: 380, shelf_life_days: 365, openingStock: 25 },
  { name: 'சம்பா அரிசி',       category: 'Rice',   weight: '5',   weight_unit: 'kg', price: 1250, shelf_life_days: 365, openingStock: 20 },
  { name: 'பச்சரிசி',          category: 'Rice',   weight: '5',   weight_unit: 'kg', price: 1100, shelf_life_days: 365, openingStock: 22 },
  { name: 'வெள்ளை சர்க்கரை',   category: 'Sugar',  weight: '1',   weight_unit: 'kg', price: 290, shelf_life_days: 730, openingStock: 45 },
  { name: 'கடல் உப்பு',        category: 'Salt',   weight: '1',   weight_unit: 'kg', price: 80,  shelf_life_days: 1095, openingStock: 70 },
  { name: 'மிளகாய் தூள்',      category: 'Spice',  weight: '250', weight_unit: 'g',  price: 320, shelf_life_days: 365, openingStock: 40 },
  { name: 'மஞ்சள் தூள்',       category: 'Spice',  weight: '250', weight_unit: 'g',  price: 280, shelf_life_days: 365, openingStock: 38 },
  { name: 'கடலை பருப்பு',      category: 'Pulse',  weight: '1',   weight_unit: 'kg', price: 480, shelf_life_days: 365, openingStock: 28 },
  { name: 'துவரம் பருப்பு',     category: 'Pulse',  weight: '1',   weight_unit: 'kg', price: 520, shelf_life_days: 365, openingStock: 26 },
  { name: 'உளுந்து',           category: 'Pulse',  weight: '500', weight_unit: 'g',  price: 350, shelf_life_days: 365, openingStock: 32 },
]

const existsStmt = db.prepare('SELECT id FROM products WHERE name = ? AND weight = ? AND weight_unit = ?')
const insertProduct = db.prepare(`
  INSERT INTO products (name, category, weight, weight_unit, price, shelf_life_days)
  VALUES (@name, @category, @weight, @weight_unit, @price, @shelf_life_days)
`)
const insertStock = db.prepare(`
  INSERT INTO stock_entries (product_id, type, quantity_change, note)
  VALUES (?, 'stock_in', ?, 'Seeded opening stock')
`)

let inserted = 0
let skipped = 0

const seed = db.transaction(() => {
  for (const p of PRODUCTS) {
    const existing = existsStmt.get(p.name, p.weight, p.weight_unit)
    if (existing) {
      skipped++
      continue
    }
    const result = insertProduct.run(p)
    if (p.openingStock > 0) {
      insertStock.run(result.lastInsertRowid, p.openingStock)
    }
    inserted++
  }
})

seed()

console.log(`Seed complete → ${inserted} Tamil product(s) inserted, ${skipped} already present.`)
console.log(`Database: ${dbPath}`)
db.close()
