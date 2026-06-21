# 🏭 Mill Label Printing System

A standalone desktop application for mill businesses to manage products, generate unique barcode serial numbers, preview label stickers, and print them to a thermal label printer.

Built with **Electron + React + Vite + TypeScript + SQLite**.

---

## ✨ Features

- 📦 Product management (flour, millet, grain, rice, sugar, salt, etc.)
- 🏷️ Live label sticker preview before printing
- 🔢 Unique barcode serial number generation per batch
- 🖨️ Direct thermal printer support (Xprinter, Zebra, Godex)
- 📋 Full barcode/print history with search and date filter
- 📤 CSV export of all issued serial numbers
- ⚙️ Configurable shop name, label size, printer, and date format

---

## 🖥️ System Requirements

| Requirement | Minimum |
|---|---|
| OS | macOS 12+ / Windows 10/11 (64-bit) |
| RAM | 4 GB |
| Storage | 500 MB free |
| Printer | USB Thermal Label Printer (Xprinter XP-365B / XP-420B / XP-470B recommended) |
| Node.js | v18 or later |
| npm | v9 or later |

---

## 🚀 Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/joelnithushan/Labeling-System.git
cd Labeling-System
```

### 2. Install Dependencies

> ⚠️ **Important:** Use `--ignore-scripts` to skip the native build during install.
> `better-sqlite3` must be compiled specifically for Electron — not for Node.js.

```bash
npm install --ignore-scripts
```

### 3. Rebuild Native Module for Electron

After installing, rebuild `better-sqlite3` against the Electron runtime:

```bash
npx electron-rebuild -f -w better-sqlite3
```

> This step is required every time you run `npm install`. It compiles the SQLite
> native addon against Electron's V8 engine instead of Node.js.

### 4. Run in Development Mode

```bash
npm run dev
```

This starts the Vite dev server and launches the Electron window together.
The app hot-reloads on file changes. Press **Cmd+R** (Mac) or **Ctrl+R** (Windows)
in the app window if a change doesn't appear automatically.

### 5. Build for Production

```bash
npm run build
npm run electron:build
```

The installer (`.dmg` for macOS, `.exe` for Windows) is output to the `release/` folder.

---

## 🔁 After Every `npm install`

Whenever you add a package or reinstall dependencies, run the rebuild step again:

```bash
npm install --ignore-scripts
npx electron-rebuild -f -w better-sqlite3
```

---

## 🗂️ Project Structure

```
labeling-system/
├── electron/
│   ├── main.ts          # Electron main process + IPC handlers
│   ├── preload.ts       # Secure IPC bridge (renderer ↔ main)
│   └── db.ts            # SQLite connection + all DB queries
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx        # Left nav sidebar
│   │   ├── LabelPreview.tsx   # Live sticker preview with barcode
│   │   ├── ProductForm.tsx    # Add/edit product modal
│   │   ├── BarcodeTable.tsx   # Serial number history table
│   │   └── StatCard.tsx       # Dashboard summary card
│   ├── pages/
│   │   ├── Login.tsx          # Login screen (no credentials shown)
│   │   ├── Dashboard.tsx      # Home with stats + recent activity
│   │   ├── Products.tsx       # Product management
│   │   ├── PrintLabel.tsx     # Core print screen
│   │   ├── Barcodes.tsx       # Barcode/serial number history
│   │   └── Settings.tsx       # App configuration + change credentials
│   ├── hooks/
│   │   ├── useProducts.ts     # Product CRUD state
│   │   └── useBarcodes.ts     # Barcode query state
│   ├── utils/
│   │   ├── serial.ts          # Serial number generator
│   │   └── print.ts           # Label HTML builder + print trigger
│   ├── types/
│   │   └── index.ts           # Shared TypeScript types + Window interface
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

---

## 🗄️ Database

The app uses **SQLite** (via `better-sqlite3`) stored locally. No internet required.

| Environment | Database path |
|---|---|
| Development | `./database.dev.db` (project root) |
| Production (macOS) | `~/Library/Application Support/labeling-system/database.db` |
| Production (Windows) | `%APPDATA%/labeling-system/database.db` |

### Tables

| Table | Purpose |
|---|---|
| `products` | All product definitions (name, category, weight, price, shelf life) |
| `barcodes` | Every printed label with serial number and full details |
| `settings` | Shop name, printer name, label size, date format, etc. |

---

## 🏷️ Label Contents

Each printed sticker shows all 6 required fields:

| Field | Set in |
|---|---|
| **Shop Name** | Settings page |
| **Product Name** | Products → Add/Edit Product |
| **Weight** | Products → Add/Edit Product |
| **Price** | Products → Add/Edit Product |
| **Manufacturing Date** | Print Label page (set per batch) |
| **Expiry Date** | Auto-calculated from shelf life days |

Plus a **Code128 barcode** and **unique serial number**.

---

## 🔢 Serial Number Format

```
YYYYMMDD-CATG-XXXXX
```

Example: `20260621-FLR-00042`

| Part | Meaning |
|---|---|
| `20260621` | Date printed |
| `FLR` | Category code (FLR=Flour, MLT=Millet, GRN=Grain, RCE=Rice, SGR=Sugar, SLT=Salt, SPC=Spice, PLS=Pulse, OTH=Other) |
| `00042` | Auto-incremented sequence per category per day |

---

## 🖨️ Printer Setup

1. Connect your thermal label printer via **USB**
2. The OS will auto-detect it and assign a printer name
3. Open the app → go to **Settings**
4. Click **Detect Printers** to see all available printers
5. Select your printer from the dropdown (or type the name manually)
6. Choose your default label size
7. Save settings — you're ready to print

### Recommended Printers (Sri Lanka)

| Model | Label Size | Best For | Price (LKR) |
|---|---|---|---|
| Xprinter XP-365B | 50×40mm | Small product labels | ~27,000 |
| Xprinter XP-420B | 100×50mm | Medium product labels | ~20,000–25,000 |
| Xprinter XP-470B | 100×150mm | Shipping + large labels | ~28,000–35,000 |

> If no printer name is set in Settings, the system print dialog appears each time.

---

## 🛠️ Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start app in development mode |
| `npm run build` | Build React frontend + Electron files |
| `npm run electron:build` | Package app as installer |
| `npx electron-rebuild -f -w better-sqlite3` | Rebuild native SQLite module for Electron |
| `npm run lint` | Run ESLint |

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `electron` | Desktop app shell |
| `react` + `vite` | Frontend framework + build tool |
| `better-sqlite3` | Local SQLite database (native module) |
| `jsbarcode` | Barcode generation (Code128) |
| `react-router-dom` | Page navigation (HashRouter for Electron) |
| `tailwindcss` | Styling |
| `lucide-react` | Icons |
| `date-fns` | Date formatting and shelf-life calculation |
| `vite-plugin-electron` | Vite + Electron dev integration |
| `electron-rebuild` | Rebuilds native modules for Electron |

---

## 🔐 Login Credentials

The app requires a login to protect the system (only the mill owner should access it).

### Default Credentials

| Field | Value |
|---|---|
| **Username** | `admin` |
| **Password** | `admin` |

These credentials are set when the database is created for the first time.

### Changing Credentials on Delivery

When delivering the app to a customer, change the username and password to something unique for that customer:

1. Launch the app and log in with the default credentials
2. Go to **Settings → Login Credentials**
3. Enter the new **Username** and **Password**
4. Click **Save Settings**
5. The new credentials will be active immediately on the next login

> Credentials are stored in the local SQLite database at:
> - macOS: `~/Library/Application Support/labeling-system/database.db`
> - Windows: `%APPDATA%/labeling-system/database.db`

---

## 🗺️ Roadmap

- [x] Product management
- [x] Label preview + print (all 6 fields)
- [x] Barcode serial number tracking
- [x] Settings (shop name, printer, label size, date format)
- [x] Barcode history with search + CSV export
- [x] Login system (change credentials per customer)
- [ ] Multiple label templates
- [ ] PDF export of print history
- [ ] Daily print report

---

## 👥 Team

Built by **Joel Nithushan** and team as a client project for a Sri Lankan mill business.

---

## 📄 License

MIT
