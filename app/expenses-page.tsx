"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Search, SlidersHorizontal, Pencil, Trash2, Printer, Wallet, ReceiptText, TrendingDown, X, Tag } from "lucide-react";

type Expense = { id: number; title: string; category: string; amount: number; date: string; method: string; reference: string; description: string };
const categories = ["Rent", "Electricity", "Equipment", "Staff salaries", "Maintenance", "Marketing", "Other"];
const methods = ["Cash", "UPI", "Bank transfer", "Card"];
const initialExpenses: Expense[] = [
  { id: 1, title: "Monthly gym rent", category: "Rent", amount: 18000, date: "2026-11-01", method: "Bank transfer", reference: "RENT-NOV", description: "November premises rent" },
  { id: 2, title: "Electricity bill", category: "Electricity", amount: 4850, date: "2026-11-03", method: "UPI", reference: "ELEC-1103", description: "Monthly electricity payment" },
  { id: 3, title: "Dumbbell set", category: "Equipment", amount: 7200, date: "2026-11-04", method: "UPI", reference: "EQ-204", description: "New 5 kg and 7.5 kg dumbbells" },
  { id: 4, title: "Trainer salary", category: "Staff salaries", amount: 12000, date: "2026-11-05", method: "Cash", reference: "SAL-05", description: "Monthly trainer payout" },
  { id: 5, title: "AC servicing", category: "Maintenance", amount: 1600, date: "2026-10-28", method: "Cash", reference: "", description: "Routine servicing" },
  { id: 6, title: "Local promotion", category: "Marketing", amount: 2500, date: "2026-10-24", method: "Card", reference: "MKT-24", description: "Flyers and local ads" }
];
const money = (n: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const today = new Date().toISOString().slice(0, 10);
const blankForm = { title: "", category: "Rent", amount: "", date: today, method: "UPI", reference: "", description: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [monthFilter, setMonthFilter] = useState("This month");
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState("");

  const visible = useMemo(() => expenses.filter(item => {
    const q = query.toLowerCase();
    const matchesQuery = [item.title, item.category, item.description, item.reference].some(v => v.toLowerCase().includes(q));
    const matchesCategory = categoryFilter === "All categories" || item.category === categoryFilter;
    const matchesMonth = monthFilter === "All time" || (monthFilter === "This month" ? item.date.slice(0, 7) === today.slice(0, 7) : item.date.slice(0, 7) === new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7));
    return matchesQuery && matchesCategory && matchesMonth;
  }).sort((a,b) => b.date.localeCompare(a.date)), [expenses, query, categoryFilter, monthFilter]);

  const thisMonthTotal = expenses.filter(e => e.date.slice(0,7) === today.slice(0,7)).reduce((sum,e) => sum + e.amount, 0);
  const allTotal = expenses.reduce((sum,e) => sum + e.amount, 0);
  const categoryTotals = categories.map(category => ({ category, amount: expenses.filter(e => e.category === category && e.date.slice(0,7) === today.slice(0,7)).reduce((sum,e) => sum + e.amount, 0) })).filter(x => x.amount > 0).sort((a,b) => b.amount-a.amount);
  const openNew = () => { setEditingId(null); setForm({ ...blankForm, date: today }); setError(""); setModal(true); };
  const openEdit = (item: Expense) => { setEditingId(item.id); setForm({ title:item.title, category:item.category, amount:String(item.amount), date:item.date, method:item.method, reference:item.reference, description:item.description }); setError(""); setModal(true); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) { setError("Enter an expense name, a valid amount and a date."); return; }
    const item: Expense = { ...form, title:form.title.trim(), amount, id:editingId ?? Date.now() };
    setExpenses(current => editingId === null ? [item, ...current] : current.map(e => e.id === editingId ? item : e));
    setModal(false);
  };
  const remove = (id: number) => { if (window.confirm("Delete this expense record?")) setExpenses(current => current.filter(e => e.id !== id)); };

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
      <div className="panel-heading"><div><div className="panel-title">Monthly category breakdown</div><p className="panel-subtitle">Where your gym's expenses are going</p></div><span className="expense-month-label">{new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</span></div>
      {categoryTotals.length ? <div className="expense-category-list">{categoryTotals.map(item => <div className="expense-category-row" key={item.category}><div className="expense-category-name"><span><Tag size={13}/>{item.category}</span><strong>{money(item.amount)}</strong></div><div className="expense-bar"><i style={{width: Math.max(4, item.amount / categoryTotals[0].amount * 100) + "%"}}/></div></div>)}</div> : <p className="expense-empty-breakdown">No expenses recorded for this month yet.</p>}
    </section>
    <section className="panel expenses-directory">
      <div className="panel-heading"><div><div className="panel-title">Expense records</div><p className="panel-subtitle">Review, update or print your expense history</p></div><button className="button-secondary expense-print" onClick={() => window.print()}><Printer size={15}/> Print records</button></div>
      <div className="expenses-toolbar">
        <div className="table-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search expenses..."/></div>
        <label className="filter-select"><SlidersHorizontal size={14}/><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <select className="expense-month-filter" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}><option>This month</option><option>Last month</option><option>All time</option></select>
      </div>
      <div className="table-scroll"><table className="members-table expense-table"><thead><tr><th>EXPENSE</th><th>CATEGORY</th><th>DATE</th><th>METHOD</th><th>AMOUNT</th><th>REFERENCE</th><th className="no-print">ACTIONS</th></tr></thead><tbody>
        {visible.map(item => <tr key={item.id}><td><div className="expense-title-cell"><strong>{item.title}</strong><small>{item.description || "—"}</small></div></td><td><span className="expense-category-pill">{item.category}</span></td><td>{new Date(item.date + "T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td><td>{item.method}</td><td className="amount-cell">{money(item.amount)}</td><td>{item.reference || "—"}</td><td className="no-print"><div className="expense-row-actions"><button onClick={() => openEdit(item)} aria-label="Edit expense"><Pencil size={14}/></button><button onClick={() => remove(item.id)} aria-label="Delete expense"><Trash2 size={14}/></button></div></td></tr>)}
        {visible.length === 0 && <tr><td colSpan={7} className="empty-row">No expenses found for these filters.</td></tr>}
      </tbody></table></div>
      <p className="directory-footnote">Showing {visible.length} of {expenses.length} records · Demo data is stored only in this page session.</p>
    </section>
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><div className="member-form-modal expense-form-modal" onClick={e => e.stopPropagation()}><div className="form-modal-head"><div><p className="eyebrow">{editingId === null ? "NEW RECORD" : "UPDATE RECORD"}</p><h2>{editingId === null ? "Add an expense" : "Edit expense"}</h2></div><button className="icon-button" onClick={() => setModal(false)} aria-label="Close"><X size={18}/></button></div>
      <form onSubmit={save}><div className="member-form-grid">
        <label>Expense name *<input autoFocus value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="e.g. Monthly rent" /></label>
        <label>Category *<select value={form.category} onChange={e => setForm({...form,category:e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Amount (₹) *<input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm({...form,amount:e.target.value})} placeholder="Enter amount" /></label>
        <label>Expense date *<input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label>
        <label>Payment method<select value={form.method} onChange={e => setForm({...form,method:e.target.value})}>{methods.map(m => <option key={m}>{m}</option>)}</select></label>
        <label>Reference / transaction ID<input value={form.reference} onChange={e => setForm({...form,reference:e.target.value})} placeholder="Optional reference"/></label>
        <label className="expense-description-field">Description<input value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Add a short note (optional)"/></label>
      </div>{error && <p className="expense-form-error">{error}</p>}<div className="form-modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="button-primary">{editingId === null ? "Save expense" : "Save changes"}</button></div></form>
    </div></div>}
  </div>;
}
