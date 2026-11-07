"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, CheckCircle2, CreditCard, CalendarDays, IndianRupee, ToggleLeft, ToggleRight, LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type Plan = {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  description: string | null;
  is_active: boolean;
};
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const blank = { name: "", duration: "1", price: "", description: "" };

export default function MembershipPlansPage() {
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

  async function loadPlans() {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Your session has expired. Please log in again.");
      setUserId(authData.user.id);
      const { data, error: queryError } = await supabase
        .from("membership_plans")
        .select("id, name, duration_months, price, description, is_active")
        .eq("owner_id", authData.user.id)
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setPlans((data ?? []) as Plan[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load membership plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPlans(); }, []);

  const visible = useMemo(
    () => plans.filter(p => (filter === "All" || (filter === "Active" ? p.is_active : !p.is_active)) && p.name.toLowerCase().includes(query.toLowerCase())),
    [plans, filter, query]
  );
  const active = plans.filter(p => p.is_active).length;

  function openAdd() {
    setEditing(null);
    setForm(blank);
    setError("");
    setModal(true);
  }
  function openEdit(p: Plan) {
    setEditing(p.id);
    setForm({ name: p.name, duration: String(p.duration_months), price: String(p.price), description: p.description ?? "" });
    setError("");
    setModal(true);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) { setError("Your session is unavailable. Please log in again."); return; }
    const duration = Number(form.duration);
    const price = Number(form.price);
    if (!Number.isInteger(duration) || duration < 1 || !Number.isFinite(price) || price < 0) {
      setError("Enter a valid duration and a price of zero or more.");
      return;
    }
    setSaving(true);
    setError("");
    const values = {
      name: form.name.trim(),
      duration_months: duration,
      price,
      description: form.description.trim() || null,
    };
    try {
      const result = editing
        ? await supabase.from("membership_plans").update(values).eq("id", editing).eq("owner_id", userId)
        : await supabase.from("membership_plans").insert({ ...values, owner_id: userId, is_active: true });
      if (result.error) throw result.error;
      setModal(false);
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this plan.");
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!userId || !confirm("Delete this plan? Existing memberships will remain, but their plan link will be cleared.")) return;
    setError("");
    const { error: deleteError } = await supabase.from("membership_plans").delete().eq("id", id).eq("owner_id", userId);
    if (deleteError) setError(deleteError.message);
    else await loadPlans();
  }
  async function toggle(plan: Plan) {
    if (!userId) return;
    setError("");
    const { error: updateError } = await supabase.from("membership_plans").update({ is_active: !plan.is_active }).eq("id", plan.id).eq("owner_id", userId);
    if (updateError) setError(updateError.message);
    else await loadPlans();
  }

  return <div className="plans-page">
    <div className="members-heading"><div><p className="eyebrow">GYM WORKSPACE / PRICING</p><h1>Membership plans</h1><p className="welcome-subtitle">Set up packages, prices and membership durations.</p></div><button className="button-primary" onClick={openAdd}><Plus size={16}/> Create plan</button></div>
    <div className="member-stats"><div className="member-stat"><span>Total plans</span><strong>{plans.length}</strong><small>All packages created</small></div><div className="member-stat"><span>Active plans</span><strong>{active}</strong><small>Available for new members</small></div><div className="member-stat"><span>Inactive plans</span><strong>{plans.length-active}</strong><small>Hidden from new sign-ups</small></div></div>
    <div className="panel directory-panel">
      <div className="directory-toolbar"><div><h2 className="panel-title">Your plans</h2><p className="panel-subtitle">{visible.length} packages shown</p></div><div className="directory-controls"><label className="table-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search plans"/></label><label className="filter-select"><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select></label></div></div>
      {error && <p role="alert" className="mx-1 mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      {loading ? <div className="plans-empty"><LoaderCircle size={20} className="animate-spin"/>Loading membership plans…</div> : <div className="plans-grid">{visible.map(p=><article className="plan-card" key={p.id}><div className="plan-card-top"><span className="plan-icon"><CreditCard size={19}/></span><span className={p.is_active?"status-badge status-active":"status-badge status-pending"}>{p.is_active?"Active":"Inactive"}</span></div><h3>{p.name}</h3><p className="plan-description">{p.description||"No description added"}</p><div className="plan-price">{money(Number(p.price))}<small> / plan</small></div><div className="plan-meta"><span><CalendarDays size={14}/>{p.duration_months} {p.duration_months===1?"month":"months"}</span><span><IndianRupee size={14}/>{money(Number(p.price)/Math.max(1,p.duration_months))}/mo</span></div><div className="plan-actions"><button onClick={()=>openEdit(p)}><Pencil size={14}/> Edit</button><button onClick={()=>void toggle(p)}>{p.is_active?<ToggleRight size={15}/>:<ToggleLeft size={15}/>} {p.is_active?"Deactivate":"Activate"}</button><button aria-label="Delete plan" onClick={()=>void remove(p.id)}><Trash2 size={14}/></button></div></article>)}</div>}
      {!loading && visible.length===0 && <div className="plans-empty"><CreditCard size={25}/><strong>{plans.length===0?"No membership plans yet":"No plans found"}</strong><span>{plans.length===0?"Create your first plan to start defining your gym's pricing.":"Change your search or filter."}</span></div>}
      <div className="flex items-center justify-between"><p className="directory-footnote">Plans are saved securely to your GymDesk database.</p><button className="text-link flex items-center gap-1" onClick={()=>void loadPlans()}><RefreshCw size={13}/> Refresh</button></div>
    </div>
    {modal&&<div className="modal-backdrop" onClick={()=>!saving&&setModal(false)}><form className="member-form-modal" onSubmit={save} onClick={e=>e.stopPropagation()}><div className="form-modal-head"><div><p className="eyebrow">PRICING SETUP</p><h2>{editing?"Edit membership plan":"Create membership plan"}</h2></div><button type="button" className="icon-button" onClick={()=>setModal(false)} disabled={saving}><X size={18}/></button></div><div className="member-form-grid"><label>Plan name *<input required maxLength={80} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Student Monthly"/></label><label>Duration *<select value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option></select></label><label>Price (₹) *<input required type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="1200"/></label><label>Description<input maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What's included in this plan?"/></label></div>{error&&<p role="alert" className="mt-4 text-sm text-[#b33b32]">{error}</p>}<div className="form-modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)} disabled={saving}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>{saving?<LoaderCircle size={15} className="animate-spin"/>:<CheckCircle2 size={15}/ >}{saving?"Saving…":editing?"Save changes":"Create plan"}</button></div></form></div>}
  </div>;
}
