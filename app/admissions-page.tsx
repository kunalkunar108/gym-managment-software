"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, UserRoundPlus, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type Plan = { id: string; name: string; duration_months: number; price: number; is_active: boolean };
type Member = { id: string; full_name: string; phone: string; secondary_phone: string | null; gender: string | null; address: string | null };
const today = () => new Date().toLocaleDateString("en-CA");
const addMonths = (date: string, months: number) => { const d = new Date(date + "T12:00:00"); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + months); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return d.toLocaleDateString("en-CA"); };
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
const initial = { memberId: "", fullName: "", phone: "", secondaryPhone: "", gender: "male", address: "", planId: "", startDate: today(), endDate: "", discount: "0", admissionFee: "0", method: "cash" };

export default function AdmissionsPage() {
  const [kind, setKind] = useState<"new" | "re">("new");
  const [form, setForm] = useState(initial);
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedPlan = plans.find(p => p.id === form.planId);
  const baseAmount = Number(selectedPlan?.price ?? 0);
  const discount = Math.min(99.99, Math.max(0, Number(form.discount) || 0));
  const discountedPlanAmount = Math.max(0, Math.round((baseAmount * (1 - discount / 100) + Number.EPSILON) * 100) / 100);
  const admissionFee = Math.max(0, Number((Number(form.admissionFee) || 0).toFixed(2)));
  const total = discountedPlanAmount + admissionFee;
  const phoneMatches = useMemo(() => form.phone.trim().length >= 5 ? members.filter(m => m.phone.replace(/\D/g, "").includes(form.phone.replace(/\D/g, ""))) : [], [members, form.phone]);

  async function load() {
    setLoading(true); setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Your session has expired. Please log in again.");
      const [m, p] = await Promise.all([
        supabase.from("members").select("id,full_name,phone,secondary_phone,gender,address").eq("owner_id", auth.user.id).order("full_name"),
        supabase.from("membership_plans").select("id,name,duration_months,price,is_active").eq("owner_id", auth.user.id).eq("is_active", true).order("name")
      ]);
      if (m.error) throw m.error;
      if (p.error) throw p.error;
      setMembers((m.data ?? []) as Member[]);
      setPlans((p.data ?? []) as Plan[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load admission data."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function changeKind(next: "new" | "re") {
    setKind(next); setForm(initial); setSuccess(""); setError("");
  }
  function chooseMember(id: string) {
    const m = members.find(x => x.id === id);
    setForm(old => ({ ...old, memberId: id, fullName: m?.full_name ?? "", phone: m?.phone ?? "", secondaryPhone: m?.secondary_phone ?? "", gender: m?.gender ?? "male", address: m?.address ?? "" }));
  }
  function choosePlan(id: string) {
    const p = plans.find(x => x.id === id);
    setForm(old => ({ ...old, planId: id, endDate: p ? addMonths(old.startDate, p.duration_months) : "" }));
  }
  function chooseStart(value: string) {
    setForm(old => ({ ...old, startDate: value, endDate: selectedPlan ? addMonths(value, selectedPlan.duration_months) : "" }));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!selectedPlan) { setError("Select an active membership plan."); return; }
    if (kind === "re" && !form.memberId) { setError("Select an existing member for re-admission."); return; }
    if (!form.endDate || form.endDate < form.startDate) { setError("Check the membership dates."); return; }
    if (Number(form.discount) < 0 || Number(form.discount) >= 100) { setError("Discount must be between 0 and 99.99%."); return; }
    setSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("complete_admission", {
        p_admission_type: kind, p_member_id: kind === "re" ? form.memberId : null,
        p_full_name: form.fullName.trim(), p_phone: form.phone.trim(), p_gender: form.gender,
        p_address: form.address.trim() || null, p_secondary_phone: form.secondaryPhone.trim() || null,
        p_plan_id: form.planId, p_start_date: form.startDate, p_end_date: form.endDate,
        p_discount_percent: discount, p_admission_fee: Number(admissionFee.toFixed(2)), p_total_amount: Number(total.toFixed(2)),
        p_payment_method: form.method
      });
      if (rpcError) throw rpcError;
      const result = data as { receipt_number?: string };
      setSuccess(`Admission saved successfully. ${result?.receipt_number ? "Receipt: " + result.receipt_number : "No payment receipt was created because the total payable is zero."}`);
      setForm(initial); setKind("new"); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not complete admission."); }
    finally { setSaving(false); }
  }

  return <div className="members-page">
    <div className="members-heading"><div><p className="eyebrow">GYM WORKSPACE / REGISTRATION</p><h1>Admissions</h1><p className="welcome-subtitle">Register a new member or renew an existing member in one place.</p></div><button className="button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    <div className="panel directory-panel max-w-4xl">
      <div className="p-5 border-b border-[#edf0ed]"><div className="flex flex-wrap gap-2"><button type="button" className={kind==="new"?"button-primary":"button-secondary"} onClick={() => changeKind("new")}>New admission</button><button type="button" className={kind==="re"?"button-primary":"button-secondary"} onClick={() => changeKind("re")}>Re-admission</button></div></div>
      <form className="p-5 space-y-6" onSubmit={submit}>
        <section className="space-y-3"><div><h2 className="panel-title">1. Member details</h2><p className="panel-subtitle">Basic identity and contact information.</p></div>
          {kind==="re" && <label className="block text-sm font-medium">Find existing member by mobile number or name<select className="mt-1 w-full" value={form.memberId} onChange={e=>chooseMember(e.target.value)} required><option value="">Select existing member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} — {m.phone}</option>)}</select></label>}
          <div className="member-form-grid">
            <label>Full name *<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Member full name"/></label>
            <label>Mobile number *<input required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Mobile number"/></label>
            <label>Gender *<select required value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
            <label>Secondary mobile number (optional)<input type="tel" value={form.secondaryPhone} onChange={e=>setForm({...form,secondaryPhone:e.target.value})} placeholder="Secondary mobile number"/></label>
            <label className="payment-note-field">Address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Member address"/></label>
          </div>
        </section>
        <section className="space-y-3 border-t border-[#edf0ed] pt-5"><div><h2 className="panel-title">2. Membership details</h2><p className="panel-subtitle">Choose a plan and apply a percentage discount.</p></div>
          <div className="member-form-grid">
            <label>Membership plan *<select required value={form.planId} onChange={e=>choosePlan(e.target.value)}><option value="">Select plan</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name} · {money(Number(p.price))} / {p.duration_months} months</option>)}</select></label>
            <label>Start date *<input required type="date" value={form.startDate} onChange={e=>chooseStart(e.target.value)}/></label>
            <label>Duration / end date *<input required type="date" min={form.startDate} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label>
            <label>Discount (%)<input type="number" min="0" max="99.99" step="0.01" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})} placeholder="0"/></label>
          </div>
        </section>
        <section className="space-y-3 border-t border-[#edf0ed] pt-5"><div><h2 className="panel-title">3. Fees and payment</h2><p className="panel-subtitle">Add any one-time admission fee to the discounted membership amount.</p></div>
          <div className="member-form-grid">
            <label>Admission fee (₹)<input type="number" min="0" step="0.01" value={form.admissionFee} onChange={e=>setForm({...form,admissionFee:e.target.value})} placeholder="0.00"/></label>
            <label>Total amount (₹)<input readOnly value={total.toFixed(2)}/></label>
            <label>Payment method *<select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select></label>
          </div>
          <div className="rounded-xl bg-[#f7f9f7] p-4 text-sm space-y-2"><div className="flex justify-between"><span>Plan price</span><strong>{money(baseAmount)}</strong></div><div className="flex justify-between"><span>Discount ({discount}%)</span><strong>− {money(baseAmount-discountedPlanAmount)}</strong></div><div className="flex justify-between"><span>Discounted membership</span><strong>{money(discountedPlanAmount)}</strong></div><div className="flex justify-between"><span>Admission fee</span><strong>{money(admissionFee)}</strong></div><div className="flex justify-between border-t border-[#e6ebe6] pt-2"><strong>Total payable</strong><strong>{money(total)}</strong></div></div>
        </section>
        {phoneMatches.length>0 && kind==="new" && <p className="rounded-xl bg-[#fff8e8] p-3 text-sm text-[#805b17]">A member with a similar mobile number may already exist: {phoneMatches.slice(0,3).map(m=>m.full_name+" ("+m.phone+")").join(", ")}. Switch to Re-admission if this is the same person.</p>}
        {error && <p role="alert" className="rounded-xl bg-[#fff0ef] p-3 text-sm text-[#b33b32]">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-[#edf8f0] p-3 text-sm text-[#246b3a]">{success}</p>}
        {plans.length===0 && !loading && <p className="text-sm text-[#9a5b16]">No active membership plans found. Create a plan in Membership Plans before recording an admission.</p>}
        <div className="flex justify-end border-t border-[#edf0ed] pt-4"><button type="submit" className="button-primary" disabled={saving || loading || plans.length===0}>{saving?<LoaderCircle size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} {saving?"Saving admission…":"Complete admission"}</button></div>
      </form>
    </div>
  </div>;
}
