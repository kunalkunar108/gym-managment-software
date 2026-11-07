"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Users, UserCheck, UserX, ShieldCheck, Pencil, Trash2, Eye, X, Phone, Mail, CalendarDays, LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type StaffRole = "Trainer";
type StaffStatus = "Active" | "Inactive";
type StaffMember = { id: string; name: string; phone: string; email: string; role: StaffRole; joined: string; status: StaffStatus; salary: string; userId: string | null };
const roles: StaffRole[] = ["Trainer"];
const prettyDate = (value: string) => new Date(value + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const money = (value: string | number) => value === "" || value === null ? "Not specified" : "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value));
const blank = { name: "", phone: "", email: "", role: "Trainer" as StaffRole, joined: new Date().toLocaleDateString("en-CA"), status: "Active" as StaffStatus, salary: "" };

export default function StaffPage() {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [accountWorking, setAccountWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadStaff() {
    setLoading(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Your session has expired. Please log in again.");
      setUserId(auth.user.id);
      const { data, error: queryError } = await supabase.from("staff")
        .select("id,full_name,phone,email,role,joined_on,status,salary,user_id")
        .eq("owner_id", auth.user.id).order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setItems((data ?? []).map(row => ({
        id: row.id, name: row.full_name, phone: row.phone, email: row.email ?? "",
        role: (String(row.role).charAt(0).toUpperCase() + String(row.role).slice(1)) as StaffRole,
        joined: row.joined_on, status: row.status === "active" ? "Active" : "Inactive",
        salary: row.salary === null ? "" : String(row.salary), userId: row.user_id ?? null
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staff records.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void loadStaff(); }, []);

  const filtered = useMemo(() => items.filter(s =>
    (s.name + " " + s.email + " " + s.phone).toLowerCase().includes(query.toLowerCase()) &&
    (roleFilter === "All roles" || s.role === roleFilter) &&
    (statusFilter === "All status" || s.status === statusFilter)
  ), [items, query, roleFilter, statusFilter]);
  const active = items.filter(s => s.status === "Active").length;

  const openAdd = () => { setSelected(null); setForm({ ...blank, joined: new Date().toLocaleDateString("en-CA") }); setError(""); setModal("add"); };
  const openEdit = (s: StaffMember) => { setSelected(s); setForm({ ...s }); setError(""); setModal("edit"); };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) { setError("Your session is unavailable. Please log in again."); return; }
    if (!form.name.trim() || !form.phone.trim()) { setError("Name and phone number are required."); return; }
    const salary = form.salary.trim() ? Number(form.salary.replace(/[^0-9.]/g, "")) : null;
    if (salary !== null && (!Number.isFinite(salary) || salary < 0)) { setError("Enter a valid non-negative salary."); return; }
    setSaving(true);
    setError("");
    const record = {
      owner_id: userId, full_name: form.name.trim(), phone: form.phone.trim(),
      email: form.email.trim() || null, role: "trainer",
      joined_on: form.joined, status: form.status.toLowerCase(), salary
    };
    const result = modal === "edit" && selected
      ? await supabase.from("staff").update(record).eq("id", selected.id).eq("owner_id", userId)
      : await supabase.from("staff").insert(record);
    if (result.error) setError(result.error.message);
    else { setModal(null); await loadStaff(); }
    setSaving(false);
  }

  async function toggle(s: StaffMember) {
    if (!userId) return;
    setWorking(s.id); setError("");
    const next = s.status === "Active" ? "inactive" : "active";
    const { error: updateError } = await supabase.from("staff").update({ status: next }).eq("id", s.id).eq("owner_id", userId);
    if (updateError) setError(updateError.message);
    else await loadStaff();
    setWorking(null);
  }

  async function manageLogin(s: StaffMember, action: "invite" | "remove") {
    setAccountWorking(s.id); setError("");
    const { data, error: invokeError } = await supabase.functions.invoke("manage-trainer-account", {
      body: { staff_id: s.id, action }
    });
    if (invokeError || data?.error) setError(data?.error || invokeError?.message || "Could not manage trainer login.");
    else await loadStaff();
    setAccountWorking(null);
  }

  async function remove(s: StaffMember) {
    if (!userId || !window.confirm("Remove " + s.name + " from your staff list? Their trainer login will also be removed if one exists.")) return;
    setWorking(s.id); setError("");
    if (s.userId) {
      const { data, error: invokeError } = await supabase.functions.invoke("manage-trainer-account", { body: { staff_id: s.id, action: "remove" } });
      if (invokeError || data?.error) { setError(data?.error || invokeError?.message || "Could not remove trainer login."); setWorking(null); return; }
    }
    const { error: deleteError } = await supabase.from("staff").delete().eq("id", s.id).eq("owner_id", userId);
    if (deleteError) setError(deleteError.message);
    else await loadStaff();
    setWorking(null);
  }

  return <div className="staff-page">
    <div className="staff-heading"><div><p className="eyebrow">TEAM & ACCESS</p><h1>Staff management</h1><p className="welcome-subtitle">Manage your gym team, roles and employment details.</p></div><button className="button-primary" onClick={openAdd}><Plus size={16}/> Add staff member</button></div>
    <div className="staff-stats">
      <div className="staff-stat"><span className="staff-stat-icon green"><Users size={17}/></span><small>Total staff</small><strong>{items.length}</strong><em>Team members listed</em></div>
      <div className="staff-stat"><span className="staff-stat-icon blue"><UserCheck size={17}/></span><small>Active staff</small><strong>{active}</strong><em>Currently active</em></div>
      <div className="staff-stat"><span className="staff-stat-icon orange"><UserX size={17}/></span><small>Inactive staff</small><strong>{items.length-active}</strong><em>Not currently active</em></div>
      <div className="staff-stat"><span className="staff-stat-icon purple"><ShieldCheck size={17}/></span><small>Roles</small><strong>{new Set(items.map(s => s.role)).size}</strong><em>Assigned team roles</em></div>
    </div>
    <section className="panel staff-directory">
      <div className="panel-heading"><div><div className="panel-title">Staff directory</div><p className="panel-subtitle">View and update your gym team</p></div><span className="staff-count">{filtered.length} records</span></div>
      <div className="staff-toolbar"><div className="table-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, phone or email..."/></div><select className="staff-filter" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}><option>All roles</option>{roles.map(role => <option key={role}>{role}</option>)}</select><select className="staff-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All status</option><option>Active</option><option>Inactive</option></select></div>
      {error && <p role="alert" className="mx-1 mb-3 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      <div className="table-scroll"><table className="members-table staff-table"><thead><tr><th>STAFF MEMBER</th><th>ROLE</th><th>CONTACT</th><th>JOINED</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={6} className="empty-row"><LoaderCircle size={16} className="inline animate-spin mr-2"/>Loading staff…</td></tr> : filtered.map(s => <tr key={s.id}><td><div className="member-cell"><div className="member-avatar mint">{s.name.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</div><span>{s.name}</span></div></td><td><span className="staff-role-pill">{s.role}</span></td><td><div className="staff-contact"><span>{s.phone}</span><small>{s.email || "No email added"}{s.userId ? " · Login linked" : ""}</small></div></td><td>{prettyDate(s.joined)}</td><td><span className={`status-badge ${s.status === "Active" ? "status-active" : "status-pending"}`}>{s.status}</span></td><td><div className="staff-actions">{s.userId ? <button title="Remove trainer login" disabled={accountWorking === s.id} onClick={() => void manageLogin(s, "remove")}><UserX size={14}/></button> : <button title="Send trainer login invitation" disabled={accountWorking === s.id || s.status !== "Active" || !s.email} onClick={() => void manageLogin(s, "invite")}><Mail size={14}/></button>}<button title="View details" onClick={() => { setSelected(s); setModal("view"); }}><Eye size={14}/></button><button title="Edit staff" onClick={() => openEdit(s)}><Pencil size={14}/></button><button title={s.status === "Active" ? "Deactivate" : "Activate"} disabled={working === s.id} onClick={() => void toggle(s)}>{working === s.id ? <LoaderCircle size={14} className="animate-spin"/> : s.status === "Active" ? <UserX size={14}/> : <UserCheck size={14}/>}</button><button title="Delete staff" className="danger" disabled={working === s.id} onClick={() => void remove(s)}><Trash2 size={14}/></button></div></td></tr>)}
      {!loading && filtered.length === 0 && <tr><td colSpan={6} className="empty-row">{items.length === 0 ? "No staff members added yet." : "No staff members match these filters."}</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between px-1 py-3"><p className="staff-footnote">Staff records are saved securely to your GymDesk database.</p><button className="text-link flex items-center gap-1" onClick={() => void loadStaff()}><RefreshCw size={13}/> Refresh</button></div>
    </section>
    <section className="panel staff-roles-panel"><div className="panel-heading"><div><div className="panel-title">Trainer access</div><p className="panel-subtitle">What trainer accounts can do</p></div></div><div className="staff-role-grid"><div><span className="role-guide-icon"><Users size={17}/></span><strong>Trainer account</strong><p>View all gym members and manage attendance/check-ins. Payments, expenses, reports and owner settings stay private.</p></div><p className="staff-footnote">Use Invite login to send a secure sign-in invitation to an active trainer with an email address.</p></section>
    {modal && <div className="modal-backdrop" onClick={() => !saving && setModal(null)}><div className="member-form-modal staff-modal" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between"><div><p className="eyebrow">{modal === "view" ? "STAFF PROFILE" : modal === "edit" ? "UPDATE TEAM MEMBER" : "TEAM DIRECTORY"}</p><h2>{modal === "view" ? "Staff details" : modal === "edit" ? "Edit staff member" : "Add staff member"}</h2></div><button className="icon-button" onClick={() => setModal(null)} aria-label="Close"><X size={18}/></button></div>
      {modal === "view" && selected ? <><div className="staff-profile-top"><div className="member-avatar mint">{selected.name.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</div><div><strong>{selected.name}</strong><small>{selected.role} · {selected.status}</small></div></div><div className="detail-contact"><p><Phone size={14}/>{selected.phone}</p><p><Mail size={14}/>{selected.email || "No email added"}</p></div><div className="detail-grid"><div><small>Joining date</small><strong>{prettyDate(selected.joined)}</strong></div><div><small>Monthly salary</small><strong>{money(selected.salary)}</strong></div></div><div className="form-modal-actions"><button className="button-secondary" onClick={() => setModal(null)}>Close</button><button className="button-primary" onClick={() => openEdit(selected)}><Pencil size={14}/> Edit profile</button></div></> : <form onSubmit={submit}><div className="member-form-grid">
      <label>Full name *<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter staff name" required/></label>
      <label>Phone number *<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91..." required/></label>
      <label>Email address<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com"/></label>
      <label>Account type<input value="Trainer" disabled/></label>
      <label>Joining date<input type="date" value={form.joined} onChange={e => setForm({ ...form, joined: e.target.value })}/></label>
      <label>Monthly salary (₹)<input type="number" min="0" step="0.01" value={form.salary.replace(/[^0-9.]/g, "")} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="Optional"/></label>
      <label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as StaffStatus })}><option>Active</option><option>Inactive</option></select></label>
      </div>{error && <p role="alert" className="staff-form-error">{error}</p>}<div className="form-modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="animate-spin"/> : null}{saving ? "Saving…" : modal === "edit" ? "Save changes" : "Add staff member"}</button></div></form>}
    </div></div>}
  </div>;
}
