"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, SlidersHorizontal, X, Phone, Mail, Pencil, Trash2, Ban, CheckCircle2, ChevronDown, LoaderCircle, RefreshCw, CreditCard } from "lucide-react";
import { supabase } from "../lib/supabase";

type Member = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  joined_on: string;
  status: "active" | "inactive" | "expired";
  photo_path?: string | null;
  photo_url?: string | null;
  memberships?: { id: string; plan_id: string | null; start_date: string; end_date: string; amount: number; status: string; suggested_payment_method?: string | null; membership_plans?: { name: string } | null }[];
};
type Plan = { id: string; name: string; duration_months: number; price: number; is_active: boolean };
const blank = { full_name: "", phone: "", email: "", joined_on: new Date().toISOString().slice(0, 10) };
const date = (s: string) => s ? new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function MembersPage({ onAddMember }: { onAddMember: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [membershipModal, setMembershipModal] = useState(false);
  const [membershipMember, setMembershipMember] = useState<Member | null>(null);
  const [membershipForm, setMembershipForm] = useState({ plan_id: "", start_date: new Date().toISOString().slice(0,10), end_date: "", amount: "", status: "active" });
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadMembers() {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Your session has expired. Please log in again.");
      setUserId(authData.user.id);
      const { data, error: queryError } = await supabase
        .from("members")
        .select("id, full_name, phone, email, joined_on, status, photo_path, memberships(id,plan_id,start_date,end_date,amount,status,suggested_payment_method,membership_plans(name))")
        .eq("owner_id", authData.user.id)
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      const { data: planData, error: planError } = await supabase.from("membership_plans").select("id,name,duration_months,price,is_active").eq("owner_id", authData.user.id).order("name");
      if (planError) throw planError;
      setPlans((planData ?? []) as Plan[]);
      const photoMembers = await Promise.all((data ?? []).map(async (member) => {
        if (!member.photo_path) return { ...member, photo_url: null };
        const { data: signed } = await supabase.storage.from("member-photos").createSignedUrl(member.photo_path, 3600);
        return { ...member, photo_url: signed?.signedUrl ?? null };
      }));
      setMembers(photoMembers as unknown as Member[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadMembers(); }, []);

  const filtered = useMemo(
    () => members.filter(m => (filter === "All" || m.status === filter.toLowerCase()) &&
      [m.full_name, m.phone, m.email ?? ""].some(v => v.toLowerCase().includes(query.toLowerCase()))),
    [members, filter, query]
  );
  const active = members.filter(m => m.status === "active").length;
  const currentMembership = (member: Member) => [...(member.memberships ?? [])].sort((a,b) => b.start_date.localeCompare(a.start_date))[0];
  const membershipLabel = (member: Member) => {
    const ms = currentMembership(member);
    if (!ms) return "Not assigned";
    if (ms.status === "active" && ms.end_date < new Date().toLocaleDateString("en-CA")) return "Expired";
    return ms.membership_plans?.name ?? ms.status;
  };
  const openMembership = (member: Member) => {
    const ms = currentMembership(member);
    setMembershipMember(member);
    setMembershipForm(ms ? { plan_id: ms.plan_id ?? "", start_date: ms.start_date, end_date: ms.end_date, amount: String(ms.amount), status: ms.status } : { plan_id: "", start_date: new Date().toISOString().slice(0,10), end_date: "", amount: "", status: "active" });
    setError(""); setMembershipModal(true);
  };
  const saveMembership = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !membershipMember) return;
    setSaving(true); setError("");
    const ms = currentMembership(membershipMember);
    const values = { member_id: membershipMember.id, plan_id: membershipForm.plan_id || null, start_date: membershipForm.start_date, end_date: membershipForm.end_date, amount: Number(membershipForm.amount), status: membershipForm.status };
    try {
      const result = ms ? await supabase.from("memberships").update(values).eq("id", ms.id).eq("owner_id", userId) : await supabase.from("memberships").insert({ ...values, owner_id: userId });
      if (result.error) throw result.error;
      setMembershipModal(false); setMembershipMember(null); await loadMembers();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save membership."); }
    finally { setSaving(false); }
  };
  const chooseMembershipPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId); let end = membershipForm.end_date;
    if (plan) { const d = new Date(membershipForm.start_date + "T12:00:00"); const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+plan.duration_months); d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate())); end=d.toLocaleDateString("en-CA"); }
    setMembershipForm(old => ({ ...old, plan_id: planId, amount: plan ? String(plan.price) : old.amount, end_date: end }));
  };

  function openAdd() {
    setEditing(null);
    setForm({ ...blank, joined_on: new Date().toISOString().slice(0, 10) });
    setModal(true);
  }
  function openEdit(member: Member) {
    setEditing(member.id);
    setForm({ full_name: member.full_name, phone: member.phone, email: member.email ?? "", joined_on: member.joined_on });
    setModal(true);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) { setError("Your session is unavailable. Please log in again."); return; }
    setSaving(true);
    setError("");
    const values = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      joined_on: form.joined_on,
    };
    try {
      if (editing) {
        const { error: updateError } = await supabase.from("members").update(values).eq("id", editing).eq("owner_id", userId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("members").insert({ ...values, owner_id: userId, status: "active" });
        if (insertError) throw insertError;
      }
      setModal(false);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this member.");
    } finally {
      setSaving(false);
    }
  }
  async function toggleStatus(member: Member) {
    if (!userId) return;
    const nextStatus = member.status === "active" ? "inactive" : "active";
    setError("");
    const { error: updateError } = await supabase.from("members").update({ status: nextStatus }).eq("id", member.id).eq("owner_id", userId);
    if (updateError) setError(updateError.message);
    else await loadMembers();
  }
  async function remove(id: string) {
    if (!userId || !confirm("Delete this member? This action cannot be undone.")) return;
    setError("");
    const { error: deleteError } = await supabase.from("members").delete().eq("id", id).eq("owner_id", userId);
    if (deleteError) setError(deleteError.message);
    else {
      setSelected(null);
      await loadMembers();
    }
  }
  const selectedMember = members.find(m => m.id === selected);

  return <div className="members-page">
    <div className="members-heading"><div><p className="eyebrow">GYM WORKSPACE / DIRECTORY</p><h1>Members</h1><p className="welcome-subtitle">Manage member profiles, membership status and contact details.</p></div><button className="button-primary" onClick={onAddMember}><Plus size={16}/> Add member</button></div>
    <div className="member-stats"><div className="member-stat"><span>Total members</span><strong>{members.length}</strong><small>Saved member profiles</small></div><div className="member-stat"><span>Active members</span><strong>{active}</strong><small>Currently marked active</small></div><div className="member-stat"><span>Inactive / expired</span><strong>{members.length-active}</strong><small>Require attention</small></div></div>
    <div className="panel directory-panel">
      <div className="directory-toolbar"><div><h2 className="panel-title">All members</h2><p className="panel-subtitle">{filtered.length} records shown</p></div><div className="directory-controls"><label className="table-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone or email"/></label><label className="filter-select"><SlidersHorizontal size={14}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option><option>Expired</option></select><ChevronDown size={13}/></label></div></div>
      {error && <p role="alert" className="mx-5 my-3 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      <div className="table-scroll"><table className="members-table directory-table"><thead><tr><th>MEMBER</th><th>PHONE</th><th>EMAIL</th><th>JOINED</th><th>MEMBERSHIP</th><th>VALID UNTIL</th><th>STATUS</th><th></th></tr></thead><tbody>
        {loading ? <tr><td colSpan={8} className="empty-row"><LoaderCircle size={16} className="inline animate-spin mr-2"/>Loading members…</td></tr> :
          filtered.map(m=><tr key={m.id}><td><button className="directory-member" onClick={()=>setSelected(m.id)}><span className="member-avatar mint overflow-hidden">{m.photo_url ? <img src={m.photo_url} alt="" className="h-full w-full object-cover"/> : m.full_name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</span><span>{m.full_name}<small>Member profile</small></span></button></td><td>{m.phone}</td><td>{m.email||"—"}</td><td>{date(m.joined_on)}</td><td>{membershipLabel(m)}</td><td>{currentMembership(m) ? date(currentMembership(m)!.end_date) : "—"}</td><td><span className={`status-badge ${m.status==="active"?"status-active":m.status==="expired"?"status-expired":"status-pending"}`}>{m.status.charAt(0).toUpperCase()+m.status.slice(1)}</span></td><td><div className="member-actions"><button title="Manage membership" onClick={()=>openMembership(m)}><CreditCard size={14}/></button><button title="Edit member" onClick={()=>openEdit(m)}><Pencil size={14}/></button><button title={m.status==="active"?"Deactivate":"Activate"} onClick={()=>void toggleStatus(m)}><Ban size={14}/></button><button title="Delete member" onClick={()=>void remove(m.id)}><Trash2 size={14}/></button></div></td></tr>)}
        {!loading && filtered.length===0 && <tr><td colSpan={7} className="empty-row">No members found. Add your first member or change the search.</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between px-5 py-3"><p className="directory-footnote">Member profiles are saved securely to your GymDesk database.</p><button className="text-link flex items-center gap-1" onClick={()=>void loadMembers()}><RefreshCw size={13}/> Refresh</button></div>
    </div>
    {modal&&<div className="modal-backdrop" onClick={()=>!saving&&setModal(false)}><form className="member-form-modal" onSubmit={save} onClick={e=>e.stopPropagation()}><div className="form-modal-head"><div><p className="eyebrow">MEMBER PROFILE</p><h2>{editing?"Edit member":"Add new member"}</h2></div><button type="button" className="icon-button" onClick={()=>setModal(false)} disabled={saving}><X size={18}/></button></div><div className="member-form-grid">
      <label>Full name *<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Enter member name"/></label>
      <label>Phone number *<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91"/></label>
      <label>Email address<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label>
      <label>Joining date *<input required type="date" value={form.joined_on} onChange={e=>setForm({...form,joined_on:e.target.value})}/></label>
    </div><div className="form-modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)} disabled={saving}>Cancel</button><button className="button-primary" type="submit" disabled={saving}>{saving?<LoaderCircle size={15} className="animate-spin"/>:<CheckCircle2 size={15} />}{saving?"Saving…":editing?"Save changes":"Create member"}</button></div></form></div>}
    {membershipModal && membershipMember && <div className="modal-backdrop" onClick={()=>!saving&&setMembershipModal(false)}><form className="member-form-modal" onSubmit={saveMembership} onClick={e=>e.stopPropagation()}><div className="form-modal-head"><div><p className="eyebrow">MEMBERSHIP DETAILS</p><h2>{currentMembership(membershipMember) ? "Update membership" : "Assign membership"}</h2><p className="text-sm text-[#849087]">{membershipMember.full_name}</p></div><button type="button" className="icon-button" onClick={()=>setMembershipModal(false)}><X size={18}/></button></div><div className="member-form-grid">
      <label>Membership plan<select value={membershipForm.plan_id} onChange={e=>chooseMembershipPlan(e.target.value)}><option value="">Custom / no linked plan</option>{plans.filter(p=>p.is_active || p.id===membershipForm.plan_id).map(p=><option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString("en-IN")}</option>)}</select></label>
      <label>Start date *<input required type="date" value={membershipForm.start_date} onChange={e=>setMembershipForm({...membershipForm,start_date:e.target.value})}/></label>
      <label>End date *<input required type="date" min={membershipForm.start_date} value={membershipForm.end_date} onChange={e=>setMembershipForm({...membershipForm,end_date:e.target.value})}/></label>
      <label>Amount (₹) *<input required type="number" min="0" step="0.01" value={membershipForm.amount} onChange={e=>setMembershipForm({...membershipForm,amount:e.target.value})}/></label>
      <label>Status *<select value={membershipForm.status} onChange={e=>setMembershipForm({...membershipForm,status:e.target.value})}><option value="active">Active</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></label>
    </div>{error && <p role="alert" className="mt-3 text-sm text-[#b33b32]">{error}</p>}<div className="form-modal-actions"><button type="button" className="button-secondary" onClick={()=>setMembershipModal(false)}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>{saving?"Saving…":"Save membership"}</button></div></form></div>}
    {selectedMember&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="member-detail-modal" onClick={e=>e.stopPropagation()}><div className="form-modal-head"><div className="flex items-center gap-3">{selectedMember.photo_url ? <img src={selectedMember.photo_url} alt={`${selectedMember.full_name} profile`} className="h-16 w-16 rounded-xl object-cover"/> : <span className="member-avatar mint h-16 w-16">{selectedMember.full_name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</span>}<div><p className="eyebrow">MEMBER DETAILS</p><h2>{selectedMember.full_name}</h2></div></div><button className="icon-button" onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="detail-contact"><p><Phone size={15}/>{selectedMember.phone}</p><p><Mail size={15}/>{selectedMember.email||"No email recorded"}</p></div><div className="detail-grid"><div><small>Membership</small><strong>{membershipLabel(selectedMember)}</strong></div><div><small>Member status</small><strong>{selectedMember.status}</strong></div><div><small>Joined</small><strong>{date(selectedMember.joined_on)}</strong></div><div><small>Trainer suggested payment method</small><strong>{currentMembership(selectedMember)?.suggested_payment_method ? currentMembership(selectedMember)!.suggested_payment_method!.replace("_", " ").toUpperCase() : "Not provided"}</strong></div></div><div className="form-modal-actions"><button className="button-secondary" onClick={()=>{setSelected(null);openEdit(selectedMember);}}>Edit profile</button><button className="button-secondary" onClick={()=>{setSelected(null);openMembership(selectedMember);}}>Manage membership</button><button className="button-primary" onClick={()=>setSelected(null)}>Close</button></div></div></div>}
  </div>;
}
