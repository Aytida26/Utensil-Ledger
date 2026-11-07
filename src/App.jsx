import { useEffect, useMemo, useState } from "react";

/* ---------- formatting ---------- */
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("en-IN");
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const CATEGORIES = ["Spoons", "Forks", "Knives", "Cutlery sets", "Other"];

const SORTS = {
  newest: { label: "Newest first", fn: (a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id },
  margin: { label: "Highest margin", fn: (a, b) => b.margin - a.margin },
  stock: { label: "Lowest stock", fn: (a, b) => a.stockPct - b.stockPct },
  name: { label: "Name A to Z", fn: (a, b) => a.name.localeCompare(b.name) },
};

const SERVER_DOWN = "Can't reach the server. Start it with npm run dev and try again.";

/* ---------- talking to the server ---------- */
async function api(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error(SERVER_DOWN);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

/* ---------- derived numbers for one purchase ---------- */
function derive(p) {
  const buy = p.totalCost / p.qty;
  const stock = Math.max(p.qty - p.sold, 0);
  return {
    ...p,
    buy,
    stock,
    stockPct: stock / p.qty,
    margin: p.sell > 0 ? ((p.sell - buy) / p.sell) * 100 : 0,
    profitSoFar: p.sold * (p.sell - buy),
    retailLeft: stock * p.sell,
  };
}

/* ---------- inline icons ---------- */
const Svg = ({ children, className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);
const SearchIcon = () => (<Svg><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>);
const PlusIcon = () => (<Svg><path d="M12 5v14M5 12h14" /></Svg>);
const CloseIcon = () => (<Svg><path d="M6 6l12 12M18 6 6 18" /></Svg>);

/* ---------- small pieces ---------- */
function Stat({ label, value, note, tone = "text-ink" }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-sm text-ink/60">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-ink/50">{note}</p>
    </div>
  );
}

/* Dark part = what he paid, green part = what he keeps. Whole bar = selling price. */
function PriceBar({ buy, sell, maxSell }) {
  const total = (sell / maxSell) * 100;
  const paid = (Math.min(buy, sell) / sell) * 100;
  return (
    <div
      className="h-2.5 overflow-hidden rounded-sm bg-ink/5"
      role="img"
      aria-label={`Buy ${inr2.format(buy)}, sell ${inr2.format(sell)} per piece`}
    >
      <div className="flex h-full" style={{ width: `${total}%` }}>
        <div className="bg-ink" style={{ width: `${paid}%` }} />
        <div className="flex-1 bg-leaf" />
      </div>
    </div>
  );
}

function StockBar({ pct }) {
  const low = pct < 0.2;
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-sm bg-ink/10">
      <div className={low ? "h-full bg-rust" : "h-full bg-cobalt"} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

/* ---------- add purchase dialog ---------- */
const EMPTY = { name: "", category: CATEGORIES[0], supplier: "", date: "", qty: "", totalCost: "", sell: "" };

function AddPurchase({ onSave, onClose }) {
  const [f, setF] = useState({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const qty = Number(f.qty);
  const cost = Number(f.totalCost);
  const sell = Number(f.sell);
  const valid = f.name.trim() && Number.isInteger(qty) && qty > 0 && cost > 0 && sell > 0;
  const buy = qty > 0 && cost > 0 ? cost / qty : null;
  const margin = buy !== null && sell > 0 ? ((sell - buy) / sell) * 100 : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: f.name.trim(),
        category: f.category,
        supplier: f.supplier.trim(),
        date: f.date,
        qty,
        totalCost: cost,
        sell,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const field = "mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/30";

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="max-h-full w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl" role="dialog" aria-modal="true" aria-label="Add bulk purchase">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add bulk purchase</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-ink/60 hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-cobalt" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm">Item name
            <input className={field} value={f.name} onChange={set("name")} placeholder="White tea spoon" autoFocus />
          </label>
          <label className="text-sm">Category
            <select className={field} value={f.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm">Purchase date
            <input type="date" className={field} value={f.date} onChange={set("date")} />
          </label>
          <label className="col-span-2 text-sm">Supplier
            <input className={field} value={f.supplier} onChange={set("supplier")} placeholder="Supplier name, city" />
          </label>
          <label className="text-sm">Pieces bought
            <input type="number" min="1" step="1" className={field} value={f.qty} onChange={set("qty")} placeholder="10000" />
          </label>
          <label className="text-sm">Total paid (₹)
            <input type="number" min="1" step="0.01" className={field} value={f.totalCost} onChange={set("totalCost")} placeholder="8000" />
          </label>
          <label className="col-span-2 text-sm">Selling price per piece (₹)
            <input type="number" min="0.01" step="0.01" className={field} value={f.sell} onChange={set("sell")} placeholder="1.00" />
          </label>
        </div>

        <div className="mt-4 rounded-md bg-ice p-3 text-sm">
          {buy === null ? (
            <span className="text-ink/60">Enter pieces and total paid to see your buying price per piece.</span>
          ) : (
            <span>
              Buying price <b>{inr2.format(buy)}</b> per piece
              {margin !== null && (
                <> · Margin <b className={margin < 0 ? "text-rust" : "text-leaf"}>{margin.toFixed(1)}%</b></>
              )}
            </span>
          )}
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-rust">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-cobalt">Cancel</button>
          <button type="submit" disabled={!valid || saving} className="rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white hover:bg-cobalt/90 focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "Saving…" : "Save purchase"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- main app ---------- */
export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("newest");
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError("");
    api("/api/purchases")
      .then(setItems)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const all = useMemo(() => items.map(derive), [items]);
  const maxSell = Math.max(...all.map((i) => i.sell), 1);

  const totals = useMemo(() => ({
    invested: all.reduce((s, i) => s + i.totalCost, 0),
    retailLeft: all.reduce((s, i) => s + i.retailLeft, 0),
    profit: all.reduce((s, i) => s + i.profitSoFar, 0),
    low: all.filter((i) => i.stockPct < 0.2).length,
  }), [all]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((i) => (cat === "All" || i.category === cat) && (!q || `${i.name} ${i.supplier}`.toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [all, query, cat, sort]);

  const addItem = async (p) => {
    const saved = await api("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    setItems((prev) => [...prev, saved]);
    setAdding(false);
    setSort("newest");
    setCat("All");
    setQuery("");
  };

  let emptyMessage = null;
  if (loading) emptyMessage = "Loading purchases…";
  else if (loadError) emptyMessage = null;
  else if (all.length === 0) emptyMessage = "No purchases yet. Use Add purchase to record your first bulk buy.";
  else if (shown.length === 0) emptyMessage = "No purchases match. Clear the search or pick another category.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Utensil stock ledger</h1>
          <p className="mt-1 text-sm text-ink/60">What was bought in bulk, what it costs per piece, and what it sells for.</p>
        </div>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white hover:bg-cobalt/90 focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2">
          <PlusIcon /> Add purchase
        </button>
      </header>

      {loadError && (
        <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rust/30 bg-white p-4 text-sm text-rust">
          <span>{loadError}</span>
          <button onClick={load} className="rounded-md border border-rust/40 px-3 py-1.5 hover:bg-rust/5 focus:outline-none focus:ring-2 focus:ring-rust">Try again</button>
        </div>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
        <Stat label="Money spent on stock" value={inr0.format(totals.invested)} note={`${all.length} bulk purchases`} />
        <Stat label="Unsold stock, at selling price" value={inr0.format(totals.retailLeft)} note="What the remaining pieces will bring in" />
        <Stat label="Profit from sales so far" value={inr0.format(totals.profit)} note="Sold pieces × (sell − buy)" tone="text-leaf" />
        <Stat label="Running low" value={totals.low} note="Less than 20% of the purchase left" tone={totals.low ? "text-rust" : "text-ink"} />
      </section>

      <section className="mt-8" aria-label="Purchases">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"><SearchIcon /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item or supplier" aria-label="Search item or supplier"
              className="w-full rounded-md border border-ink/20 bg-white py-2 pl-9 pr-3 text-sm focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/30" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort purchases"
            className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/30">
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {["All", ...CATEGORIES].map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
                className={`rounded-full border px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt ${cat === c ? "border-ink bg-ink text-white" : "border-ink/20 bg-white hover:bg-ink/5"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-ink/10 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/60">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 text-right font-medium">Bought</th>
                <th className="px-4 py-3 text-right font-medium">Buy price<span className="block text-xs font-normal">per piece</span></th>
                <th className="px-4 py-3 text-right font-medium">Sell price<span className="block text-xs font-normal">per piece</span></th>
                <th className="w-44 px-4 py-3 font-medium">
                  Buy vs sell
                  <span className="block text-xs font-normal"><span className="text-ink">dark</span> = paid, <span className="text-leaf">green</span> = kept</span>
                </th>
                <th className="px-4 py-3 text-right font-medium">Margin</th>
                <th className="px-4 py-3 font-medium">In stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {shown.map((i) => (
                <tr key={i.id} className="align-middle">
                  <td className="px-4 py-3">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-ink/60">{i.category} · {i.supplier} · {fmtDate(i.date)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {count.format(i.qty)} pcs
                    <span className="block text-xs text-ink/60">{inr0.format(i.totalCost)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{inr2.format(i.buy)}</td>
                  <td className="px-4 py-3 text-right font-medium">{inr2.format(i.sell)}</td>
                  <td className="px-4 py-3"><PriceBar buy={i.buy} sell={i.sell} maxSell={maxSell} /></td>
                  <td className={`px-4 py-3 text-right font-medium ${i.margin < 0 ? "text-rust" : "text-leaf"}`}>{i.margin.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <p className={i.stockPct < 0.2 ? "font-medium text-rust" : ""}>
                      {count.format(i.stock)} pcs{i.stockPct < 0.2 && " (low)"}
                    </p>
                    <StockBar pct={i.stockPct} />
                  </td>
                </tr>
              ))}
              {emptyMessage && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink/60">{emptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/50">Purchases are saved in the database on the computer running the server.</p>
      </section>

      {adding && <AddPurchase onSave={addItem} onClose={() => setAdding(false)} />}
    </div>
  );
}