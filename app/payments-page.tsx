"use client";

import { useMemo, useState } from "react";
import { Search, Plus, SlidersHorizontal, X, IndianRupee, CalendarDays, CreditCard, Wallet, Smartphone, Building2, Printer, CheckCircle2, Clock3, Eye, Check, ReceiptText } from "lucide-react";

type Payment = {
  id: number;
  receipt: string;
  member: string;
  phone: string;
  amount: number;
  date: string;
  method: "Cash" | "UPI" | "Card" | "Bank transfer";
  status: "Paid" | "Pending" | "Failed";
  reference: string;
  note: string;
};

const initialPayments: Payment[] = [
  { id: 1, receipt: "RCP-2026-1048", member: "Aarav Sharma", phone: "+91 98765 43210", amount: 3000, date: "2026-11-06", method: "UPI", status: "Paid", reference: "UPI82461930", note: "Quarterly membership fee" },
  { id: 2, receipt: "RCP-2026-1047", member: "Priya Kumari", phone: "+91 91234 56780", amount: 1200, date: "2026-11-06", method: "Cash", status: "Paid", reference: "CASH-1047", note: "Monthly membership fee" },
  { id: 3, receipt: "RCP-2026-1046", member: "Rohan Das", phone: "+91 99887 76655", amount: 10000, date: "2026-11-05", method: "Bank transfer", status: "Paid", reference: "NEFT390172", note: "Annual membership renewal" },
  { id: 4, receipt: "RCP-2026-1045", member: "Sneha Singh", phone: "+91 90909 80808", amount: 1200, date: "2026-11-04", method: "UPI", status: "Pending", reference: "UPI-PENDING", note: "Monthly membership fee" },
  { id: 5, receipt: "RCP-2026-1044", member: "Vikash Kumar", phone: "+91 98700 11223", amount: 2500, date: "2026-11-03", method: "Card", status: "Paid", reference: "CARD620184", note: "Personal training add-on" },
  { id: 6, receipt: "RCP-2026-1043", member: "Aditya Kumar", phone: "+91 90000 12345", amount: 1200, date: "2026-11-02", method: "Cash", status: "Failed", reference: "CASH-FAILED", note: "Monthly membership fee" },
];

const blank = { member: "", amount: "", date: new Date().toISOString().slice(0, 10), method: "UPI" as Payment["method"], status: "Paid" as Payment["status"], reference: "", note: "" };
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const prettyDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const methodIcon = (method: Payment["method"]) => method === "Cash" ? Wallet : method === "UPI" ? Smartphone : method === "Card" ? CreditCard : Building2;

export default function PaymentsPage() {
  const [payments, setPayments] = useState(initialPayments);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [form, setForm] = useState(blank);

  const filtered = useMemo(() => payments.filter(p =>
    (filter === "All" || p.status === filter) &&
    [p.member, p.phone, p.receipt, p.reference].some(v => v.toLowerCase().includes(query.toLowerCase()))
  ), [payments, filter, query]);

  const collected = payments.filter(p => p.status === "Paid").reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter(p => p.status === "Pending").reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payments.filter(p => p.status === "Paid").length;

  function savePayment(e: React.FormEvent) {
    e.preventDefault();
    const memberDetails: Record<string, string> = {
      "Aarav Sharma": "+91 98765 43210", "Priya Kumari": "+91 91234 56780",
      "Rohan Das": "+91 99887 76655", "Sneha Singh": "+91 90909 80808",
      "Vikash Kumar": "+91 98700 11223", "Aditya Kumar": "+91 90000 12345",
    };
    const nextId = Math.max(0, ...payments.map(p => p.id)) + 1;
    const item: Payment = {
      id: nextId,
      receipt: `RCP-2026-${String(1048 + nextId).padStart(4, "0")}`,
      member: form.member,
      phone: memberDetails[form.member] || "—",
      amount: Number(form.amount),
      date: form.date,
      method: form.method,
      status: form.status,
      reference: form.reference.trim() || `MANUAL-${nextId}`,
      note: form.note.trim() || "Gym membership payment",
    };
    setPayments(old => [item, ...old]);
    setForm(blank);
    setModal(false);
  }

  function markPaid(id: number) {
    setPayments(old => old.map(p => p.id === id ? { ...p, status: "Paid" } : p));
  }

  return <div className="payments-page">
    <div className="payments-heading">
      <div><p className="eyebrow">GYM WORKSPACE / FINANCE</p><h1>Payments</h1><p className="welcome-subtitle">Record collections, follow pending fees and issue payment receipts.</p></div>
      <button className="button-primary" onClick={() => { setForm({ ...blank, date: new Date().toISOString().slice(0, 10) }); setModal(true); }}><Plus size={16} /> Record payment</button>
    </div>

    <div className="payment-stats">
      <div className="payment-stat"><span className="payment-stat-icon green"><IndianRupee size={17}/></span><small>Total collected</small><strong>{money(collected)}</strong><em>Successful payments</em></div>
      <div className="payment-stat"><span className="payment-stat-icon orange"><Clock3 size={17}/></span><small>Pending amount</small><strong>{money(pending)}</strong><em>Awaiting confirmation</em></div>
      <div className="payment-stat"><span className="payment-stat-icon blue"><ReceiptText size={17}/></span><small>Transactions</small><strong>{payments.length}</strong><em>{paidCount} successful</em></div>
    </div>

    <div className="panel payments-panel">
      <div className="payments-toolbar-top"><div><h2 className="panel-title">Payment history</h2><p className="panel-subtitle">{filtered.length} transactions shown</p></div><span className="payments-live"><i/> Demo records</span></div>
      <div className="payments-toolbar">
        <label className="table-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search member, phone or receipt"/></label>
        <label className="filter-select"><SlidersHorizontal size={14}/><select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Paid</option><option>Pending</option><option>Failed</option></select></label>
      </div>
      <div className="table-scroll"><table className="members-table payments-table"><thead><tr><th>MEMBER</th><th>RECEIPT ID</th><th>DATE</th><th>METHOD</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
        {filtered.map(p => { const Icon = methodIcon(p.method); return <tr key={p.id}>
          <td><div className="payment-member"><span className="member-avatar mint">{p.member.split(" ").map(x => x[0]).slice(0,2).join("")}</span><span>{p.member}<small>{p.phone}</small></span></div></td>
          <td className="payment-receipt-id">{p.receipt}</td><td>{prettyDate(p.date)}</td>
          <td><span className="payment-method"><Icon size={14}/>{p.method}</span></td><td className="amount-cell">{money(p.amount)}</td>
          <td><span className={`status-badge ${p.status === "Paid" ? "status-active" : p.status === "Pending" ? "status-pending" : "status-expired"}`}>{p.status}</span></td>
          <td><div className="payment-row-actions"><button title="View receipt" onClick={() => setReceipt(p)}><Eye size={14}/></button>{p.status === "Pending" && <button title="Mark as paid" onClick={() => markPaid(p.id)}><Check size={14}/></button>}</div></td>
        </tr>; })}
        {filtered.length === 0 && <tr><td colSpan={7} className="empty-row">No transactions found. Try another search or record a payment.</td></tr>}
      </tbody></table></div>
      <p className="directory-footnote">Prototype data only — payments are not processed and records are not saved to a database. Use this screen for interface testing only.</p>
    </div>

    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="member-form-modal" onSubmit={savePayment} onClick={e => e.stopPropagation()}>
      <div className="form-modal-head"><div><p className="eyebrow">PAYMENT ENTRY</p><h2>Record a payment</h2></div><button type="button" className="icon-button" onClick={() => setModal(false)}><X size={18}/></button></div>
      <div className="member-form-grid">
        <label>Member *<select required value={form.member} onChange={e => setForm({ ...form, member: e.target.value })}><option value="">Select member</option>{["Aarav Sharma","Priya Kumari","Rohan Das","Sneha Singh","Vikash Kumar","Aditya Kumar"].map(name => <option key={name}>{name}</option>)}</select></label>
        <label>Amount (₹) *<input required type="number" min="1" step="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Enter amount"/></label>
        <label>Payment date *<input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label>
        <label>Payment method *<select value={form.method} onChange={e => setForm({ ...form, method: e.target.value as Payment["method"] })}><option>UPI</option><option>Cash</option><option>Card</option><option>Bank transfer</option></select></label>
        <label>Payment status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Payment["status"] })}><option>Paid</option><option>Pending</option><option>Failed</option></select></label>
        <label>Transaction reference<input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="UPI ID / transaction number"/></label>
        <label className="payment-note-field">Description / note<input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Monthly membership fee"/></label>
      </div>
      <div className="form-modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)}>Cancel</button><button className="button-primary" type="submit"><CheckCircle2 size={15}/>Save payment</button></div>
    </form></div>}

    {receipt && <div className="modal-backdrop" onClick={() => setReceipt(null)}><div className="payment-receipt-modal" onClick={e => e.stopPropagation()}>
      <div className="form-modal-head receipt-actions"><div><p className="eyebrow">PAYMENT RECEIPT</p><h2>Transaction details</h2></div><button className="icon-button" onClick={() => setReceipt(null)}><X size={18}/></button></div>
      <div className="payment-receipt-print">
        <div className="receipt-brand"><div className="receipt-brand-mark">G</div><div><strong>GymDesk</strong><small>PAYMENT RECEIPT</small></div></div>
        <div className="receipt-success"><CheckCircle2 size={17}/><span>{receipt.status === "Paid" ? "Payment recorded" : `Payment ${receipt.status.toLowerCase()}`}</span></div>
        <div className="receipt-amount">{money(receipt.amount)}<small>Amount</small></div>
        <div className="receipt-details">
          <div><small>Receipt number</small><strong>{receipt.receipt}</strong></div><div><small>Payment date</small><strong>{prettyDate(receipt.date)}</strong></div>
          <div><small>Member</small><strong>{receipt.member}</strong></div><div><small>Phone</small><strong>{receipt.phone}</strong></div>
          <div><small>Payment method</small><strong>{receipt.method}</strong></div><div><small>Reference</small><strong>{receipt.reference}</strong></div>
          <div className="receipt-full"><small>Description</small><strong>{receipt.note}</strong></div>
        </div>
        <p className="receipt-thanks">Thank you for choosing GymDesk.</p>
      </div>
      <div className="form-modal-actions receipt-actions"><button className="button-secondary" onClick={() => setReceipt(null)}>Close</button><button className="button-primary" onClick={() => window.print()}><Printer size={15}/>Print receipt</button></div>
    </div></div>}
  </div>;
}
