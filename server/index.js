import express from "express";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const CATEGORIES = ["Spoons", "Forks", "Knives", "Cutlery sets", "Other"];

/* ---------- database ---------- */
const db = new Database(path.join(__dirname, "stock.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS purchases (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    supplier   TEXT    NOT NULL,
    date       TEXT    NOT NULL,
    qty        INTEGER NOT NULL CHECK (qty > 0),
    total_cost REAL    NOT NULL CHECK (total_cost > 0),
    sell       REAL    NOT NULL CHECK (sell > 0),
    sold       INTEGER NOT NULL DEFAULT 0
  )
`);

const listAll = db.prepare(
  "SELECT id, name, category, supplier, date, qty, total_cost AS totalCost, sell, sold FROM purchases ORDER BY id"
);
const getOne = db.prepare(
  "SELECT id, name, category, supplier, date, qty, total_cost AS totalCost, sell, sold FROM purchases WHERE id = ?"
);
const insert = db.prepare(
  "INSERT INTO purchases (name, category, supplier, date, qty, total_cost, sell) VALUES (?, ?, ?, ?, ?, ?, ?)"
);

/* ---------- api ---------- */
const app = express();
app.use(express.json());

app.get("/api/purchases", (_req, res) => {
  res.json(listAll.all());
});

app.post("/api/purchases", (req, res) => {
  const b = req.body || {};
  const name = String(b.name ?? "").trim();
  const supplier = String(b.supplier ?? "").trim() || "Not added";
  const qty = Number(b.qty);
  const totalCost = Number(b.totalCost);
  const sell = Number(b.sell);
  const date = String(b.date ?? "");

  if (!name) return res.status(400).json({ error: "Item name is required." });
  if (!CATEGORIES.includes(b.category)) return res.status(400).json({ error: "Pick a valid category." });
  if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ error: "Pieces bought must be a whole number above 0." });
  if (!(totalCost > 0)) return res.status(400).json({ error: "Total paid must be above 0." });
  if (!(sell > 0)) return res.status(400).json({ error: "Selling price must be above 0." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Enter a valid purchase date." });

  const { lastInsertRowid } = insert.run(name, b.category, supplier, date, qty, totalCost, sell);
  res.status(201).json(getOne.get(lastInsertRowid));
});

/* ---------- serve the built website (after `npm run build`) ---------- */
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));