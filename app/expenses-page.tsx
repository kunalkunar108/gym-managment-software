"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, SlidersHorizontal, Pencil, Trash2, Printer, Wallet, ReceiptText, TrendingDown, X, Tag, LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type Method = "cash" | "upi" | "card" | "bank_transfer";
type Expense = { id: string; title: string; category: string; amount: number; date: string; method: Method; reference: string; description: string };
const categories = ["Rent", "Electricity", "Equipment", "Staff salaries", "Maintenance", "Marketing", "Other"];
const methods: { value: Method; label: string }[] = [{ value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "card", label: "Card" }];
const money = (n: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const today = () => new Date().toLocaleDateString("en-CA");
const blankForm = { title: "", category: "Rent", amount: "", date: today(), method: "upi" as Method, reference: "", description: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [monthFilter, setMonthFilter] = useState("This month");
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadExpenses() {
    setLoading(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Your session has expired. Please log in again.");
      setUserId(auth.user.id);
      const { data, error: queryError } = await supabase.from("expenses")
        .select("id,title,category,amount,spent_on,method,reference,description")
        .eq("owner_id", auth.user.id)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setExpenses((data ?? []).map(row => ({
        id: row.id, title: row.title, category: categories.find(c => c.toLowerCase() === String(row.category).toLowerCase()) ?? row.category,
        amount: Number(row.amount), date: row.spent_on, method: row.method as Method,
        reference: row.reference ?? "", description: row.description ?? ""
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void loadExpenses(); }, []);

  const visible = useMemo(() => expenses.filter(item => {
    const q = query.toLowerCase();
    const matchesQuery = [item.title, item.category, item.description, item.reference].some(v => v.toLowerCase().includes(q));
    const matchesCategory = categoryFilter === "All categories" || item.category === categoryFilter;
    const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString("en-CA").slice(0, 7);
    const matchesMonth = monthFilter === "All time" || (monthFilter === "This month" ? item.date.slice(0, 7) === today().slice(0, 7) : item.date.slice(0, 7) === previousMonth);
    return matchesQuery && matchesCategory && matchesMonth;
  }).sort((a, b) => b.date.localeCompare(a.date)), [expenses, query, categoryFilter, monthFilter]);

  const thisMonthTotal = expenses.filter(e => e.date.slice(0, 7) === today().slice(0, 7)).reduce((sum, e) => sum + e.amount, 0);
  const allTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryTotals = categories.map(category => ({ category, amount: expenses.filter(e => e.category === category && e.date.slice(0, 7) === today().slice(0, 7)).reduce((sum, e) => sum + e.amount, 0) })).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount);

  const openNew = () => { setEditingId(null); setForm({ ...blankForm, date: today() }); setError(""); setModal(true); };
  const openEdit = (item: Expense) => { setEditingId(item.id); setForm({ title: item.title, category: item.category, amount: String(item.amount), date: item.date, method: item.method, reference: item.reference, description: item.description }); setError(""); setModal(true); };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!userId) { setError("Your session is unavailable. Please log in again."); return; }
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) { setError("Enter an expense name, a valid amount and a date."); return; }
    setSaving(true);
    setError("");
    const record = {
      owner_id: userId, title: form.title.trim(), category: form.category.toLowerCase(),
      amount, spent_on: form.date, method: form.method, reference: form.reference.trim() || null,
      description: form.description.trim() || null
    };
    const result = editingId
      ? await supabase.from("expenses").update(record).eq("id", editingId).eq("owner_id", userId)
      : await supabase.from("expenses").insert(record);
    if (result.error) setError(result.error.message);
    else { setModal(false); await loadExpenses(); }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!userId || !window.confirm("Delete this expense record?")) return;
    setWorking(id);
    setError("");
    const { error: deleteError } = await supabase.from("expenses").delete().eq("id", id).eq("owner_id", userId);
    if (deleteError) setError(deleteError.message);
    else await loadExpenses();
    setWorking(null);
  }

  return <div className="expenses-page">
    <section className="expenses-heading">
      <div><p className="eyebrow">FINANCE MANAGEMENT</p><h1>Expenses</h1><p className="welcome-subtitle">Record and monitor the money spent on running your gym.</p></div>
      <button className="button-primary" onClick={openNew}><Plus size={16}/> Add expense</button>
    </section>
    <section className="expense-stats">
      <div className="expense-stat"><span className="expense-stat-icon green"><Wallet size={18}/></span><small>Expenses this month</small><strong>{money(thisMonthTotal)}</strong><em>Based on recorded entries</em></div>
      <div className="expense-stat"><span className="expense-stat-icon orange"><ReceiptText size={18}/></span><small>All recorded expenses</small><strong>{money(allTotal)}</strong><em>{expenses.length} expense records</em></div>
      <div className="expense-stat"><span className="expense-stat-icon blue"><TrendingDown size={18}/></span><small>Highest category this month</small><strong>{categoryTotals[0]?.category ?? "—"}</strong><em>{categoryTotals[0] ? money(categoryTotals[0].amount) : "No entries this month"}</em></div>
    </section>
    <section className="panel expense-breakdown">
      <div className="panel-heading"><div><div className="panel-title">Monthly category breakdown</div><p className="panel-subtitle">Where your gym's expenses are going</p></div><span className="expense-month-label">{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span></div>
      {categoryTotals.length ? <div className="expense-category-list">{categoryTotals.map(item => <div className="expense-category-row" key={item.category}><div className="expense-category-name"><span><Tag size={13}/>{item.category}</span><strong>{money(item.amount)}</strong></div><div className="expense-bar"><i style={{ width: Math.max(4, item.amount / categoryTotals[0].amount * 100) + "%" }}/></div></div>)}</div> : <p className="expense-empty-breakdown">No expenses recorded for this month yet.</p>}
    </section>
    <section className="panel expenses-directory">
      <div className="panel-heading"><div><div className="panel-title">Expense records</div><p className="panel-subtitle">Review, update or print your expense history</p></div><button className="button-secondary expense-print" onClick={() => window.print()}><Printer size={15}/> Print records</button></div>
      <div className="expenses-toolbar">
        <div className="table-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search expenses..."/></div>
        <label className="filter-select"><SlidersHorizontal size={14}/><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <select className="expense-month-filter" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}><option>This month</option><option>Last month</option><option>All time</option></select>
      </div>
      {error && <p role="alert" className="mx-1 mb-3 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      <div className="table-scroll"><table className="members-table expense-table"><thead><tr><th>EXPENSE</th><th>CATEGORY</th><th>DATE</th><th>METHOD</th><th>AMOUNT</th><th>REFERENCE</th><th className="no-print">ACTIONS</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={7} className="empty-row"><LoaderCircle size={16} className="inline animate-spin mr-2"/>Loading expenses…</td></tr> : visible.map(item => <tr key={item.id}><td><div className="expense-title-cell"><strong>{item.title}</strong><small>{item.description || "—"}</small></div></td><td><span className="expense-category-pill">{item.category}</span></td><td>{new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td>{methods.find(m => m.value === item.method)?.label ?? item.method}</td><td className="amount-cell">{money(item.amount)}</td><td>{item.reference || "—"}</td><td className="no-print"><div className="expense-row-actions"><button disabled={working === item.id} onClick={() => openEdit(item)} aria-label="Edit expense"><Pencil size={14}/></button><button disabled={working === item.id} onClick={() => void remove(item.id)} aria-label="Delete expense">{working === item.id ? <LoaderCircle size={14} className="animate-spin"/> : <Trash2 size={14}/>}</button></div></td></tr>)}
        {!loading && visible.length === 0 && <tr><td colSpan={7} className="empty-row">{expenses.length === 0 ? "No expenses recorded yet. Add your first expense." : "No expenses found for these filters."}</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between px-1 py-3"><p className="directory-footnote">Showing {visible.length} of {expenses.length} records · Saved securely to your GymDesk database.</p><button className="text-link flex items-center gap-1" onClick={() => void loadExpenses()}><RefreshCw size={13}/> Refresh</button></div>
    </section>
    {modal && <div className="modal-backdrop" onClick={() => !saving && setModal(false)}><div className="member-form-modal expense-form-modal" onClick={e => e.stopPropagation()}><div className="form-modal-head"><div><p className="eyebrow">{editingId === null ? "NEW RECORD" : "UPDATE RECORD"}</p><h2>{editingId === null ? "Add an expense" : "Edit expense"}</h2></div><button className="icon-button" onClick={() => setModal(false)} disabled={saving} aria-label="Close"><X size={18}/></button></div>
      <form onSubmit={save}><div className="member-form-grid">
        <label>Expense name *<input required autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Monthly rent"/></label>
        <label>Category *<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Amount (₹) *<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Enter amount"/></label>
        <label>Expense date *<input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label>
        <label>Payment method<select value={form.method} onChange={e => setForm({ ...form, method: e.target.value as Method })}>{methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
        <label>Reference / transaction ID<input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Optional reference"/></label>
        <label className="expense-description-field">Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add a short note (optional)"/></label>
      </div>{error && <p role="alert" className="expense-form-error">{error}</p>}<div className="form-modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)} disabled={saving}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="animate-spin"/> : null}{saving ? "Saving…" : editingId === null ? "Save expense" : "Save changes"}</button></div></form>
    </div></div>}
  </div>;
}
