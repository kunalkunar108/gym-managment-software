"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, CheckCircle2, CreditCard, CalendarDays, LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type Member = { id: string; full_name: string; status: string };
type Plan = { id: string; name: string; duration_months: number; price: number; is_active: boolean };
type Membership = { id: string; member_id: string; plan_id: string | null; start_date: string; end_date: string; amount: number; status: "active" | "expired" | "cancelled" | "pending"; members?: { full_name: string } | null; membership_plans?: { name: string } | null };
const today = () => new Date().toLocaleDateString("en-CA");
const addMonths = (date: string, months: number) => { const d = new Date(date + "T12:00:00"); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + months); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return d.toLocaleDateString("en-CA"); };
const displayDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const blank = { member_id: "", plan_id: "", start_date: today(), end_date: "", amount: "", status: "active" as Membership["status"] };

export default function MembershipsPage() {
  const [rows, setRows] = useState<Membership[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true); setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Your session has expired. Please log in again.");
      setUserId(auth.user.id);
      const [m, p, ms] = await Promise.all([
        supabase.from("members").select("id,full_name,status").eq("owner_id", auth.user.id).order("full_name"),
        supabase.from("membership_plans").select("id,name,duration_months,price,is_active").eq("owner_id", auth.user.id).order("name"),
        supabase.from("memberships").select("id,member_id,plan_id,start_date,end_date,amount,status,members(full_name),membership_plans(name)").eq("owner_id", auth.user.id).order("created_at", { ascending: false })
      ]);
      if (m.error) throw m.error;
      if (p.error) throw p.error;
      if (ms.error) throw ms.error;
      setMembers((m.data ?? []) as Member[]);
      setPlans((p.data ?? []) as Plan[]);
      setRows((ms.data ?? []) as unknown as Membership[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load memberships."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadData(); }, []);

  const visible = useMemo(() => rows.filter(r => (filter === "All" || r.status === filter.toLowerCase()) && ((r.members?.full_name ?? "").toLowerCase().includes(query.toLowerCase()) || (r.membership_plans?.name ?? "").toLowerCase().includes(query.toLowerCase()))), [rows, filter, query]);
  const active = rows.filter(r => r.status === "active" && r.end_date >= today()).length;
  const expired = rows.filter(r => r.status === "expired" || (r.status === "active" && r.end_date < today())).length;

  function openAdd() {
    setEditing(null);
    const start = today();
    setForm({ ...blank, start_date: start, end_date: "", amount: "" });
    setError(""); setModal(true);
  }
  function openEdit(r: Membership) {
    setEditing(r.id);
    setForm({ member_id: r.member_id, plan_id: r.plan_id ?? "", start_date: r.start_date, end_date: r.end_date, amount: String(r.amount), status: r.status });
    setError(""); setModal(true);
  }
  function choosePlan(planId: string) {
    const p = plans.find(x => x.id === planId);
    setForm(old => ({ ...old, plan_id: planId, amount: p ? String(p.price) : old.amount, end_date: p ? addMonths(old.start_date, p.duration_months) : old.end_date }));
  }
  function chooseStart(start: string) {
    const p = plans.find(x => x.id === form.plan_id);
    setForm(old => ({ ...old, start_date: start, end_date: p ? addMonths(start, p.duration_months) : old.end_date }));
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) { setError("Your session is unavailable. Please log in again."); return; }
    if (form.end_date < form.start_date) { setError("End date cannot be before start date."); return; }
    setSaving(true); setError("");
    const values = { member_id: form.member_id, plan_id: form.plan_id || null, start_date: form.start_date, end_date: form.end_date, amount: Number(form.amount), status: form.status };
    try {
      const result = editing
        ? await supabase.from("memberships").update(values).eq("id", editing).eq("owner_id", userId)
        : await supabase.from("memberships").insert({ ...values, owner_id: userId });
      if (result.error) throw result.error;
      setModal(false); await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save membership."); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!userId || !confirm("Delete this membership record?")) return;
    const { error: e } = await supabase.from("memberships").delete().eq("id", id).eq("owner_id", userId);
    if (e) setError(e.message); else await loadData();
  }

  return <div className="members-page">
    <div className="members-heading"><div><p className="eyebrow">GYM WORKSPACE / MEMBER PLANS</p><h1>Memberships</h1><p className="welcome-subtitle">Assign plans to members and track membership periods.</p></div><button className="button-primary" onClick={openAdd}><Plus size={16}/> Assign membership</button></div>
    <div className="member-stats"><div className="member-stat"><span>Total memberships</span><strong>{rows.length}</strong><small>All membership records</small></div><div className="member-stat"><span>Active memberships</span><strong>{active}</strong><small>Currently within validity</small></div><div className="member-stat"><span>Expired memberships</span><strong>{expired}</strong><small>Need renewal</small></div></div>
    <div className="panel directory-panel">
      <div className="directory-toolbar"><div><h2 className="panel-title">Membership records</h2><p className="panel-subtitle">{visible.length} records shown</p></div><div className="directory-controls"><label className="table-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search member or plan"/></label><label className="filter-select"><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Active</option><option>Pending</option><option>Expired</option><option>Cancelled</option></select></label></div></div>
      {error && <p role="alert" className="mx-1 mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      <div className="table-scroll"><table className="members-table directory-table"><thead><tr><th>MEMBER</th><th>PLAN</th><th>START DATE</th><th>END DATE</th><th>AMOUNT</th><th>STATUS</th><th></th></tr></thead><tbody>
        {loading ? <tr><td colSpan={7} className="empty-row"><LoaderCircle size={16} className="inline animate-spin mr-2"/>Loading memberships…</td></tr> : visible.map(r => <tr key={r.id}><td><strong className="text-[#3a473e]">{r.members?.full_name ?? "Member unavailable"}</strong></td><td>{r.membership_plans?.name ?? "Custom / unlinked plan"}</td><td>{displayDate(r.start_date)}</td><td>{displayDate(r.end_date)}</td><td className="amount-cell">{money(Number(r.amount))}</td><td><span className={`status-badge ${r.status==="active" && r.end_date>=today()?"status-active":r.status==="cancelled"?"status-expired":"status-pending"}`}>{r.status==="active" && r.end_date<today()?"Expired":r.status.charAt(0).toUpperCase()+r.status.slice(1)}</span></td><td><div className="member-actions"><button title="Edit membership" onClick={()=>openEdit(r)}><Pencil size={14}/></button><button title="Delete membership" onClick={()=>void remove(r.id)}><Trash2 size={14}/></button></div></td></tr>)}
        {!loading && visible.length===0 && <tr><td colSpan={7} className="empty-row">{rows.length===0?"No memberships yet. Assign a plan to a member to get started.":"No matching memberships found."}</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between px-1 py-3"><p className="directory-footnote">Membership records are saved securely to your GymDesk database.</p><button className="text-link flex items-center gap-1" onClick={()=>void loadData()}><RefreshCw size={13}/> Refresh</button></div>
    </div>
    {modal && <div className="modal-backdrop" onClick={()=>!saving&&setModal(false)}><form className="member-form-modal" onSubmit={save} onClick={e=>e.stopPropagation()}><div className="form-modal-head"><div><p className="eyebrow">MEMBERSHIP SETUP</p><h2>{editing?"Edit membership":"Assign membership"}</h2></div><button type="button" className="icon-button" onClick={()=>setModal(false)} disabled={saving}><X size={18}/></button></div>
      {members.length===0 || plans.filter(p=>p.is_active).length===0 ? <p className="mb-4 rounded-xl bg-[#fff7e9] px-4 py-3 text-sm text-[#946522]">You need at least one member and one active membership plan before assigning a membership. Add them in Members and Membership Plans.</p> : null}
      <div className="member-form-grid">
        <label>Member *<select required value={form.member_id} onChange={e=>setForm({...form,member_id:e.target.value})}><option value="">Select a member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}{m.status!=="active"?" (inactive)":""}</option>)}</select></label>
        <label>Membership plan<select value={form.plan_id} onChange={e=>choosePlan(e.target.value)}><option value="">Custom / no linked plan</option>{plans.filter(p=>p.is_active || p.id===form.plan_id).map(p=><option key={p.id} value={p.id}>{p.name} — {money(Number(p.price))}</option>)}</select></label>
        <label>Start date *<input required type="date" value={form.start_date} onChange={e=>chooseStart(e.target.value)}/></label>
        <label>End date *<input required type="date" min={form.start_date} value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></label>
        <label>Amount (₹) *<input required type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="1200"/></label>
        <label>Status *<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Membership["status"]})}><option value="active">Active</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-[#b33b32]">{error}</p>}
      <div className="form-modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)} disabled={saving}>Cancel</button><button type="submit" className="button-primary" disabled={saving || members.length===0}>{saving?<LoaderCircle size={15} className="animate-spin"/>:<CheckCircle2 size={15}/ >}{saving?"Saving…":editing?"Save changes":"Assign membership"}</button></div>
    </form></div>}
  </div>;
}
