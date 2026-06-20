# CLAUDE.md — AI Assistant Guide for Mill Label Printing System

This file instructs AI coding assistants (Claude, Cursor, Copilot, Gemini, etc.)
on how to work safely in this codebase.

---

## ⚡ FIRST: Run Tests Before Any Commit

```bash
npm test
```

**All tests must pass before you push or commit.** If tests fail after your change,
fix the issue — do not skip or delete the failing test.

---

## 🏗️ Architecture

This is an **Electron desktop app** with a clear two-process separation:

| Layer | Location | What it does |
|---|---|---|
| Main process | `electron/main.ts` | Window management, IPC handlers, print |
| Database | `electron/db.ts` | All SQLite queries via better-sqlite3 |
| IPC bridge | `electron/preload.ts` | Exposes `window.electron` to the renderer |
| React UI | `src/` | All user-facing components and pages |

**The renderer (React) never touches the DB directly.** It calls
`window.electron.db.*` which goes through IPC to the main process.

---

## 🏷️ Label — Required Fields

Every printed label MUST display all 6 of these fields. Do not remove any:

| Field | Where it comes from |
|---|---|
| Shop Name | `settings.shop_name` (Settings page) |
| Product Name | `product.name` |
| Weight | `product.weight` + `product.weight_unit` |
| Price | `product.price` |
| Manufacturing Date | Set by user on the Print screen |
| Expiry Date | `mfg_date + product.shelf_life_days` (auto-calculated) |

The label HTML is built in `src/utils/print.ts → buildLabelHtml()`.
The live preview is in `src/components/LabelPreview.tsx`.
**Both must stay in sync.** If you change one, change the other.

---

## 🔢 Serial Number Format

```
YYYYMMDD-CATG-XXXXX
```

Example: `20260621-FLR-00042`

- Generated in `src/utils/serial.ts → buildSerialNumber()`
- Category codes are in `src/types/index.ts → CATEGORY_CODES`
- The sequence number comes from `electron/db.ts → getNextSequence()`
- **Do not change the format** — it is the primary identifier in the barcodes table

---

## 🗄️ Database Rules

- All DB functions in `electron/db.ts` take a `Database.Database` as first argument
  — this makes them independently testable without a running Electron process.
- `getDb()` is the only function that uses Electron's `app` module.
- `initSchema()` is exported so tests can build an in-memory database.
- **Never drop or rename columns** — migrations are not implemented; schema changes
  require adding new columns with defaults only.

---

## 🧪 Test Suite

Run: `npm test` — uses **Vitest + React Testing Library + jsdom**

| Test file | What it covers |
|---|---|
| `src/__tests__/utils/serial.test.ts` | Serial number format, category codes, padding |
| `src/__tests__/utils/print.test.ts` | Label HTML has all 6 fields, XSS escaping, date formats |
| `electron/__tests__/db.test.ts` | All CRUD operations, filtering, stats, sequences |
| `src/__tests__/components/StatCard.test.tsx` | Dashboard stat card rendering |
| `src/__tests__/components/BarcodeTable.test.tsx` | Table states (loading, empty, data) |
| `src/__tests__/components/ProductForm.test.tsx` | Form validation, submission, edit mode |

`window.electron` is mocked in `src/__tests__/setup.ts` — all IPC calls are replaced
with `vi.fn()` so React tests run without an Electron process.

### Writing new tests

- For **utilities**: test pure logic — no mocks needed
- For **DB functions**: create an in-memory DB with `initSchema()` in `beforeEach`
- For **React components**: use `@testing-library/react`; mock `window.electron` in setup
- For **pages**: mock all `window.electron.db.*` calls before rendering

---

## 🚫 Rules — Do Not Break These

1. **Do not remove any of the 6 label fields** (shop name, product name, weight, price, mfg date, exp date)
2. **Do not change the serial number format** (`YYYYMMDD-CATG-XXXXX`)
3. **Do not import `electron` in `src/`** — use `window.electron` (IPC only)
4. **Do not skip `--ignore-scripts`** when installing — `better-sqlite3` must be rebuilt for Electron, not Node.js
5. **Do not use `any` type** unless wrapping raw SQLite results (which have no types)
6. **Do not put business logic in React components** — keep it in `utils/` or `electron/db.ts`

---

## 🛠️ Dev Setup (quick reference)

```bash
# Install
npm install --ignore-scripts
npx electron-rebuild -f -w better-sqlite3

# Run
npm run dev          # starts Electron app

# Test
npm test             # run all tests once
npm run test:watch   # watch mode
npm run test:ui      # browser UI for tests

# Build
npm run build && npm run electron:build
```

---

## 📁 Key Files to Know

| File | Purpose |
|---|---|
| `electron/db.ts` | All database queries — touch this for any data change |
| `electron/main.ts` | IPC handlers — add new channels here |
| `electron/preload.ts` | Expose new IPC channels to the renderer here |
| `src/types/index.ts` | Shared types + `window.electron` interface |
| `src/utils/serial.ts` | Serial number generation |
| `src/utils/print.ts` | Label HTML builder |
| `src/components/LabelPreview.tsx` | Live label preview (must match print.ts) |
