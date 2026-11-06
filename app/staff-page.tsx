"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Users, UserCheck, UserX, ShieldCheck, Pencil, Trash2, Eye, X, Phone, Mail, CalendarDays } from "lucide-react";

type StaffRole = "Manager" | "Trainer" | "Receptionist";
type StaffStatus = "Active" | "Inactive";
type StaffMember = { id:number; name:string; phone:string; email:string; role:StaffRole; joined:string; status:StaffStatus; salary:string };

const seed:StaffMember[] = [
  {id:1,name:"Rahul Verma",phone:"+91 98765 43210",email:"rahul@example.com",role:"Manager",joined:"12 Jan 2025",status:"Active",salary:"₹18,000"},
  {id:2,name:"Amit Kumar",phone:"+91 98765 12340",email:"amit@example.com",role:"Trainer",joined:"04 Mar 2025",status:"Active",salary:"₹14,000"},
  {id:3,name:"Neha Singh",phone:"+91 91234 56780",email:"neha@example.com",role:"Trainer",joined:"18 Jun 2025",status:"Active",salary:"₹13,000"},
  {id:4,name:"Pooja Das",phone:"+91 99887 76655",email:"pooja@example.com",role:"Receptionist",joined:"22 Aug 2025",status:"Inactive",salary:"₹10,000"}
];

const blank={name:"",phone:"",email:"",role:"Trainer" as StaffRole,joined:new Date().toISOString().slice(0,10),status:"Active" as StaffStatus,salary:""};

export default function StaffPage(){
  const [items,setItems]=useState<StaffMember[]>(seed);
  const [query,setQuery]=useState("");
  const [roleFilter,setRoleFilter]=useState("All roles");
  const [statusFilter,setStatusFilter]=useState("All status");
  const [modal,setModal]=useState<"add"|"edit"|"view"|null>(null);
  const [selected,setSelected]=useState<StaffMember|null>(null);
  const [form,setForm]=useState(blank);
  const [error,setError]=useState("");

  const filtered=useMemo(()=>items.filter(s=>(s.name+" "+s.email+" "+s.phone).toLowerCase().includes(query.toLowerCase())&&(roleFilter==="All roles"||s.role===roleFilter)&&(statusFilter==="All status"||s.status===statusFilter)),[items,query,roleFilter,statusFilter]);
  const active=items.filter(s=>s.status==="Active").length;
  const openAdd=()=>{setSelected(null);setForm(blank);setError("");setModal("add");};
  const openEdit=(s:StaffMember)=>{setSelected(s);setForm({...s,joined:new Date(s.joined).toISOString().slice(0,10)});setError("");setModal("edit");};
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!form.name.trim()||!form.phone.trim()){setError("Name and phone number are required.");return;}const joined=new Date(form.joined+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});if(modal==="edit"&&selected){setItems(old=>old.map(s=>s.id===selected.id?{...s,...form,name:form.name.trim(),joined}:s));}else{setItems(old=>[{...form,id:Date.now(),name:form.name.trim(),joined},...old]);}setModal(null);};
  const remove=(s:StaffMember)=>{if(window.confirm("Delete "+s.name+" from this staff list?"))setItems(old=>old.filter(x=>x.id!==s.id));};
  const toggle=(s:StaffMember)=>setItems(old=>old.map(x=>x.id===s.id?{...x,status:x.status==="Active"?"Inactive":"Active"}:x));

  return <div className="staff-page">
    <div className="staff-heading"><div><p className="eyebrow">TEAM & ACCESS</p><h1>Staff management</h1><p className="welcome-subtitle">Manage your gym team, roles and employment details.</p></div><button className="button-primary" onClick={openAdd}><Plus size={16}/> Add staff member</button></div>
    <div className="staff-stats">
      <div className="staff-stat"><span className="staff-stat-icon green"><Users size={17}/></span><small>Total staff</small><strong>{items.length}</strong><em>Team members listed</em></div>
      <div className="staff-stat"><span className="staff-stat-icon blue"><UserCheck size={17}/></span><small>Active staff</small><strong>{active}</strong><em>Currently active</em></div>
      <div className="staff-stat"><span className="staff-stat-icon orange"><UserX size={17}/></span><small>Inactive staff</small><strong>{items.length-active}</strong><em>Not currently active</em></div>
      <div className="staff-stat"><span className="staff-stat-icon purple"><ShieldCheck size={17}/></span><small>Roles</small><strong>{new Set(items.map(s=>s.role)).size}</strong><em>Assigned team roles</em></div>
    </div>
    <section className="panel staff-directory">
      <div className="panel-heading"><div><div className="panel-title">Staff directory</div><p className="panel-subtitle">View and update your gym team</p></div><span className="staff-count">{filtered.length} records</span></div>
      <div className="staff-toolbar"><div className="table-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone or email..."/></div><select className="staff-filter" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option>All roles</option><option>Manager</option><option>Trainer</option><option>Receptionist</option></select><select className="staff-filter" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All status</option><option>Active</option><option>Inactive</option></select></div>
      <div className="table-scroll"><table className="members-table staff-table"><thead><tr><th>STAFF MEMBER</th><th>ROLE</th><th>CONTACT</th><th>JOINED</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      {filtered.map(s=><tr key={s.id}><td><div className="member-cell"><div className="member-avatar mint">{s.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><span>{s.name}</span></div></td><td><span className="staff-role-pill">{s.role}</span></td><td><div className="staff-contact"><span>{s.phone}</span><small>{s.email||"No email added"}</small></div></td><td>{s.joined}</td><td><span className={`status-badge ${s.status==="Active"?"status-active":"status-pending"}`}>{s.status}</span></td><td><div className="staff-actions"><button title="View details" onClick={()=>{setSelected(s);setModal("view");}}><Eye size={14}/></button><button title="Edit staff" onClick={()=>openEdit(s)}><Pencil size={14}/></button><button title={s.status==="Active"?"Deactivate":"Activate"} onClick={()=>toggle(s)}>{s.status==="Active"?<UserX size={14}/>:<UserCheck size={14}/>}</button><button title="Delete staff" className="danger" onClick={()=>remove(s)}><Trash2 size={14}/></button></div></td></tr>)}
      {filtered.length===0&&<tr><td colSpan={6} className="empty-row">No staff members match these filters.</td></tr>}
      </tbody></table></div>
      <p className="staff-footnote">Demo data only. Changes are temporary and will reset when the page reloads.</p>
    </section>
    <section className="panel staff-roles-panel"><div className="panel-heading"><div><div className="panel-title">Role guide</div><p className="panel-subtitle">Suggested responsibilities for each position</p></div></div><div className="staff-role-grid">
      <div><span className="role-guide-icon"><ShieldCheck size={17}/></span><strong>Manager</strong><p>Day-to-day operations, member support and team coordination.</p></div>
      <div><span className="role-guide-icon"><Users size={17}/></span><strong>Trainer</strong><p>Training sessions, fitness guidance and member progress.</p></div>
      <div><span className="role-guide-icon"><CalendarDays size={17}/></span><strong>Receptionist</strong><p>Front desk, enquiries, registrations and check-in assistance.</p></div>
    </div><p className="staff-footnote">Role labels are informational in this frontend demo. Login accounts and permission enforcement are not connected yet.</p></section>
    {modal&&<div className="modal-backdrop" onClick={()=>setModal(null)}><div className="member-form-modal staff-modal" onClick={e=>e.stopPropagation()}>
      <div className="flex items-start justify-between"><div><p className="eyebrow">{modal==="view"?"STAFF PROFILE":modal==="edit"?"UPDATE TEAM MEMBER":"TEAM DIRECTORY"}</p><h2>{modal==="view"?"Staff details":modal==="edit"?"Edit staff member":"Add staff member"}</h2></div><button className="icon-button" onClick={()=>setModal(null)} aria-label="Close"><X size={18}/></button></div>
      {modal==="view"&&selected?<><div className="staff-profile-top"><div className="member-avatar mint">{selected.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><div><strong>{selected.name}</strong><small>{selected.role} · {selected.status}</small></div></div><div className="detail-contact"><p><Phone size={14}/>{selected.phone}</p><p><Mail size={14}/>{selected.email||"No email added"}</p></div><div className="detail-grid"><div><small>Joining date</small><strong>{selected.joined}</strong></div><div><small>Monthly salary</small><strong>{selected.salary||"Not specified"}</strong></div></div><div className="form-modal-actions"><button className="button-secondary" onClick={()=>setModal(null)}>Close</button><button className="button-primary" onClick={()=>openEdit(selected)}><Pencil size={14}/> Edit profile</button></div></>:<form onSubmit={submit}><div className="member-form-grid">
      <label>Full name *<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Enter staff name" required/></label>
      <label>Phone number *<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91..." required/></label>
      <label>Email address<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label>
      <label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value as StaffRole})}><option>Manager</option><option>Trainer</option><option>Receptionist</option></select></label>
      <label>Joining date<input type="date" value={form.joined} onChange={e=>setForm({...form,joined:e.target.value})}/></label>
      <label>Monthly salary<input value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})} placeholder="e.g. ₹12,000"/></label>
      <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as StaffStatus})}><option>Active</option><option>Inactive</option></select></label>
      </div>{error&&<p className="staff-form-error">{error}</p>}<div className="form-modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(null)}>Cancel</button><button type="submit" className="button-primary">{modal==="edit"?"Save changes":"Add staff member"}</button></div></form>}
    </div></div>}
  </div>;
}
