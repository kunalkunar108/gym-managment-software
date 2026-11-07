"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, SlidersHorizontal, X, IndianRupee, CreditCard, Wallet, Smartphone, Building2, Printer, CheckCircle2, Clock3, Eye, Check, ReceiptText, LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";\nimport { openMemberProfile } from "../lib/member-navigation";

type Method = "cash" | "upi" | "card" | "bank_transfer";
type Status = "paid" | "pending" | "failed" | "refunded";
type Member = { id: string; full_name: string; phone: string };
type Payment = { id: string; receipt: string; memberId: string | null; member: string; phone: string; amount: number; date: string; method: Method; status: Status; reference: string; note: string };
const blank = { memberId: "", amount: "", date: new Date().toLocaleDateString("en-CA"), method: "upi" as Method, status: "paid" as Status, reference: "", note: "" };
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const prettyDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const methodLabel = (m: Method) => m === "bank_transfer" ? "Bank transfer" : m.toUpperCase();
const methodIcon = (m: Method) => m === "cash" ? Wallet : m === "upi" ? Smartphone : m === "card" ? CreditCard : Building2;
const statusLabel = (s: Status) => s.charAt(0).toUpperCase() + s.slice(1);

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadPayments() {
    setLoading(true); setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Your session has expired. Please log in again.");
      setUserId(auth.user.id);
      const [memberResult, paymentResult] = await Promise.all([
        supabase.from("members").select("id,full_name,phone").eq("owner_id", auth.user.id).order("full_name"),
        supabase.from("payments").select("id,member_id,receipt_number,amount,paid_on,method,status,reference,note").eq("owner_id", auth.user.id).order("paid_on", { ascending: false }).order("created_at", { ascending: false })
      ]);
      if (memberResult.error) throw memberResult.error;
      if (paymentResult.error) throw paymentResult.error;
      const memberList = (memberResult.data ?? []) as Member[];
      setMembers(memberList);
      setPayments((paymentResult.data ?? []).map(p => {
        const member = memberList.find(m => m.id === p.member_id);
        return { id: p.id, receipt: p.receipt_number, memberId: p.member_id, member: member?.full_name ?? "Member unavailable", phone: member?.phone ?? "—", amount: Number(p.amount), date: p.paid_on, method: p.method as Method, status: p.status as Status, reference: p.reference ?? "—", note: p.note ?? "Gym membership payment" };
      }));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load payments."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadPayments(); }, []);

  const filtered = useMemo(() => payments.filter(p =>
    (filter === "All" || p.status === filter.toLowerCase()) &&
    [p.member, p.phone, p.receipt, p.reference].some(v => v.toLowerCase().includes(query.toLowerCase()))
  ), [payments, filter, query]);
  const collected = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payments.filter(p => p.status === "paid").length;

  async function savePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) { setError("Your session is unavailable. Please log in again."); return; }
    setSaving(true); setError("");
    const receiptNumber = `GD-${form.date.replaceAll("-", "")}-${Date.now().toString(36).toUpperCase()}`;
    const { error: insertError } = await supabase.from("payments").insert({
      owner_id: userId, member_id: form.memberId || null, receipt_number: receiptNumber,
      amount: Number(form.amount), paid_on: form.date, method: form.method, status: form.status,
      reference: form.reference.trim() || null, note: form.note.trim() || "Gym membership payment"
    });
    if (insertError) setError(insertError.message);
    else { setModal(false); setForm({ ...blank, date: new Date().toLocaleDateString("en-CA") }); await loadPayments(); }
    setSaving(false);
  }

  async function markPaid(payment: Payment) {
    if (!userId) return;
    setWorking(payment.id); setError("");
    const { error: updateError } = await supabase.from("payments").update({ status: "paid" }).eq("id", payment.id).eq("owner_id", userId);
    if (updateError) setError(updateError.message);
    else { await loadPayments(); setReceipt({ ...payment, status: "paid" }); }
    setWorking(null);
  }

  return <div className="payments-page">
    <div className="payments-heading">
      <div><p className="eyebrow">GYM WORKSPACE / FINANCE</p><h1>Payments</h1><p className="welcome-subtitle">Record collections, follow pending fees and issue payment receipts.</p></div>
      <button className="button-primary" onClick={() => { setForm({ ...blank, date: new Date().toLocaleDateString("en-CA") }); setError(""); setModal(true); }}><Plus size={16}/> Record payment</button>
    </div>
    <div className="payment-stats">
      <div className="payment-stat"><span className="payment-stat-icon green"><IndianRupee size={17}/></span><small>Total collected</small><strong>{money(collected)}</strong><em>Successful payments</em></div>
      <div className="payment-stat"><span className="payment-stat-icon orange"><Clock3 size={17}/></span><small>Pending amount</small><strong>{money(pending)}</strong><em>Awaiting confirmation</em></div>
      <div className="payment-stat"><span className="payment-stat-icon blue"><ReceiptText size={17}/></span><small>Transactions</small><strong>{payments.length}</strong><em>{paidCount} successful</em></div>
    </div>
    <div className="panel payments-panel">
      <div className="payments-toolbar-top"><div><h2 className="panel-title">Payment history</h2><p className="panel-subtitle">{filtered.length} transactions shown</p></div><span className="payments-live"><i/> Database synced</span></div>
      <div className="payments-toolbar">
        <label className="table-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search member, phone or receipt"/></label>
        <label className="filter-select"><SlidersHorizontal size={14}/><select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Paid</option><option>Pending</option><option>Failed</option><option>Refunded</option></select></label>
      </div>
      {error && <p role="alert" className="mx-1 mb-3 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      <div className="table-scroll"><table className="members-table payments-table"><thead><tr><th>MEMBER</th><th>RECEIPT ID</th><th>DATE</th><th>METHOD</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={7} className="empty-row"><LoaderCircle size={16} className="inline animate-spin mr-2"/>Loading payments…</td></tr> : filtered.map(p => { const Icon = methodIcon(p.method); return <tr key={p.id}>
          <td><div className="payment-member"><span className="member-avatar mint">{p.member.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</span><span><button type="button" disabled={!p.memberId} onClick={() => p.memberId && openMemberProfile(p.memberId)} className="text-left font-semibold text-[#278348] hover:underline disabled:text-inherit disabled:no-underline">{p.member}</button><small>{p.phone}</small></span></div></td>
          <td className="payment-receipt-id">{p.receipt}</td><td>{prettyDate(p.date)}</td>
          <td><span className="payment-method"><Icon size={14}/>{methodLabel(p.method)}</span></td><td className="amount-cell">{money(p.amount)}</td>
          <td><span className={`status-badge ${p.status === "paid" ? "status-active" : p.status === "pending" ? "status-pending" : "status-expired"}`}>{statusLabel(p.status)}</span></td>
          <td><div className="payment-row-actions"><button title="View receipt" onClick={() => setReceipt(p)}><Eye size={14}/></button>{p.status === "pending" && <button title="Mark as paid" disabled={working===p.id} onClick={() => void markPaid(p)}>{working===p.id?<LoaderCircle size={14} className="animate-spin"/>:<Check size={14}/>}</button>}</div></td>
        </tr>; })}
        {!loading && filtered.length === 0 && <tr><td colSpan={7} className="empty-row">{payments.length===0?"No payments recorded yet. Record your first payment.":"No transactions found. Try another search or filter."}</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between px-1 py-3"><p className="directory-footnote">Payment records are saved securely to your GymDesk database. No money is processed by this app.</p><button className="text-link flex items-center gap-1" onClick={()=>void loadPayments()}><RefreshCw size={13}/> Refresh</button></div>
    </div>

    {modal && <div className="modal-backdrop" onClick={() => !saving && setModal(false)}><form className="member-form-modal" onSubmit={savePayment} onClick={e => e.stopPropagation()}>
      <div className="form-modal-head"><div><p className="eyebrow">PAYMENT ENTRY</p><h2>Record a payment</h2></div><button type="button" className="icon-button" onClick={() => setModal(false)} disabled={saving}><X size={18}/></button></div>
      <div className="member-form-grid">
        <label>Member<select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}><option value="">No member linked</option>{members.map(m => <option key={m.id} value={m.id}>{m.full_name} · {m.phone}</option>)}</select></label>
        <label>Amount (₹) *<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Enter amount"/></label>
        <label>Payment date *<input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label>
        <label>Payment method *<select value={form.method} onChange={e => setForm({ ...form, method: e.target.value as Method })}><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select></label>
        <label>Payment status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></label>
        <label>Transaction reference<input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="UPI ID / transaction number"/></label>
        <label className="payment-note-field">Description / note<input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Monthly membership fee"/></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[#b33b32]">{error}</p>}
      <div className="form-modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)} disabled={saving}>Cancel</button><button className="button-primary" type="submit" disabled={saving}>{saving?<LoaderCircle size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}{saving?"Saving…":"Save payment"}</button></div>
    </form></div>}

    {receipt && <div className="modal-backdrop" onClick={() => setReceipt(null)}><div className="payment-receipt-modal" onClick={e => e.stopPropagation()}>
      <div className="form-modal-head receipt-actions"><div><p className="eyebrow">PAYMENT RECEIPT</p><h2>Transaction details</h2></div><button className="icon-button" onClick={() => setReceipt(null)}><X size={18}/></button></div>
      <div className="payment-receipt-print">
        <div className="receipt-brand"><div className="receipt-brand-mark">G</div><div><strong>GymDesk</strong><small>PAYMENT RECEIPT</small></div></div>
        <div className="receipt-success"><CheckCircle2 size={17}/><span>{receipt.status === "paid" ? "Payment recorded" : `Payment ${receipt.status}`}</span></div>
        <div className="receipt-amount">{money(receipt.amount)}<small>Amount</small></div>
        <div className="receipt-details">
          <div><small>Receipt number</small><strong>{receipt.receipt}</strong></div><div><small>Payment date</small><strong>{prettyDate(receipt.date)}</strong></div>
          <div><small>Member</small><strong>{receipt.member}</strong></div><div><small>Phone</small><strong>{receipt.phone}</strong></div>
          <div><small>Payment method</small><strong>{methodLabel(receipt.method)}</strong></div><div><small>Reference</small><strong>{receipt.reference}</strong></div>
          <div className="receipt-full"><small>Description</small><strong>{receipt.note}</strong></div>
        </div>
        <p className="receipt-thanks">Thank you for choosing GymDesk.</p>
      </div>
      <div className="form-modal-actions receipt-actions"><button className="button-secondary" onClick={() => setReceipt(null)}>Close</button><button className="button-primary" onClick={() => window.print()}><Printer size={15}/>Print receipt</button></div>
    </div></div>}
  </div>;
}
