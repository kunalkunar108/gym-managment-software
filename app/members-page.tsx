"use client";

import { useMemo, useState } from "react";
import { Search, Plus, SlidersHorizontal, MoreHorizontal, X, UserRound, Phone, Mail, CalendarDays, IndianRupee, Pencil, Trash2, Ban, CheckCircle2, ChevronDown } from "lucide-react";

type Member = { id:number; name:string; phone:string; email:string; plan:string; joined:string; expiry:string; fee:number; status:"Active"|"Inactive"|"Expired"; };
const initialMembers:Member[] = [
  {id:1,name:"Aarav Sharma",phone:"+91 98765 43210",email:"aarav@example.com",plan:"Quarterly",joined:"2026-10-12",expiry:"2027-01-12",fee:3000,status:"Active"},
  {id:2,name:"Priya Kumari",phone:"+91 91234 56780",email:"priya@example.com",plan:"Monthly",joined:"2026-10-20",expiry:"2026-11-20",fee:1200,status:"Active"},
  {id:3,name:"Rohan Das",phone:"+91 99887 76655",email:"rohan@example.com",plan:"Annual",joined:"2026-02-01",expiry:"2027-02-01",fee:10000,status:"Active"},
  {id:4,name:"Aditya Kumar",phone:"+91 90000 12345",email:"aditya@example.com",plan:"Monthly",joined:"2026-09-05",expiry:"2026-10-05",fee:1200,status:"Expired"},
  {id:5,name:"Sneha Singh",phone:"+91 90909 80808",email:"sneha@example.com",plan:"Quarterly",joined:"2026-08-15",expiry:"2026-11-15",fee:3000,status:"Active"},
  {id:6,name:"Vikash Kumar",phone:"+91 98700 11223",email:"vikash@example.com",plan:"Monthly",joined:"2026-10-29",expiry:"2026-11-29",fee:1200,status:"Active"},
];
const blank = {name:"",phone:"",email:"",plan:"Monthly",joined:new Date().toISOString().slice(0,10),expiry:"",fee:"1200"};
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const date=(s:string)=>s?new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";

export default function MembersPage(){
 const [members,setMembers]=useState(initialMembers);
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("All");
 const [modal,setModal]=useState(false);
 const [editing,setEditing]=useState<number|null>(null);
 const [form,setForm]=useState(blank);
 const [selected,setSelected]=useState<number|null>(null);
 const filtered=useMemo(()=>members.filter(m=>(filter==="All"||m.status===filter)&&[m.name,m.phone,m.email].some(v=>v.toLowerCase().includes(query.toLowerCase()))),[members,filter,query]);
 const active=members.filter(m=>m.status==="Active").length;
 function openAdd(){setEditing(null);setForm({...blank,joined:new Date().toISOString().slice(0,10)});setModal(true);}
 function openEdit(m:Member){setEditing(m.id);setForm({...m,fee:String(m.fee)});setModal(true);}
 function save(e:React.FormEvent){e.preventDefault();const item:Member={id:editing??Math.max(0,...members.map(m=>m.id))+1,...form,fee:Number(form.fee)||0,status:editing?members.find(m=>m.id===editing)!.status:"Active"};setMembers(old=>editing?old.map(m=>m.id===editing?item:m):[item,...old]);setModal(false);}
 function toggleStatus(id:number){setMembers(old=>old.map(m=>m.id===id?{...m,status:m.status==="Active"?"Inactive":"Active"}:m));}
 function remove(id:number){if(confirm("Delete this member? This action cannot be undone.")){setMembers(old=>old.filter(m=>m.id!==id));setSelected(null);}}
 return <div className="members-page">
  <div className="members-heading"><div><p className="eyebrow">GYM WORKSPACE / DIRECTORY</p><h1>Members</h1><p className="welcome-subtitle">Manage member profiles, membership status and contact details.</p></div><button className="button-primary" onClick={openAdd}><Plus size={16}/> Add member</button></div>
  <div className="member-stats"><div className="member-stat"><span>Total members</span><strong>{members.length}</strong><small>All registered profiles</small></div><div className="member-stat"><span>Active members</span><strong>{active}</strong><small>Currently enrolled</small></div><div className="member-stat"><span>Inactive / expired</span><strong>{members.length-active}</strong><small>Require attention</small></div></div>
  <div className="panel directory-panel">
   <div className="directory-toolbar"><div><h2 className="panel-title">All members</h2><p className="panel-subtitle">{filtered.length} records shown</p></div><div className="directory-controls"><label className="table-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone or email"/></label><label className="filter-select"><SlidersHorizontal size={14}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option><option>Expired</option></select><ChevronDown size={13}/></label></div></div>
   <div className="table-scroll"><table className="members-table directory-table"><thead><tr><th>MEMBER</th><th>PHONE</th><th>PLAN</th><th>JOINED</th><th>VALID UNTIL</th><th>STATUS</th><th>FEE</th><th></th></tr></thead><tbody>
   {filtered.map(m=><tr key={m.id}><td><button className="directory-member" onClick={()=>setSelected(m.id)}><span className="member-avatar mint">{m.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><span>{m.name}<small>{m.email||"No email added"}</small></span></button></td><td>{m.phone}</td><td>{m.plan}</td><td>{date(m.joined)}</td><td>{date(m.expiry)}</td><td><span className={`status-badge ${m.status==="Active"?"status-active":m.status==="Expired"?"status-expired":"status-pending"}`}>{m.status}</span></td><td className="amount-cell">{money(m.fee)}</td><td><div className="member-actions"><button title="Edit member" onClick={()=>openEdit(m)}><Pencil size={14}/></button><button title={m.status==="Active"?"Deactivate":"Activate"} onClick={()=>toggleStatus(m.id)}><Ban size={14}/></button><button title="Delete member" onClick={()=>remove(m.id)}><Trash2 size={14}/></button></div></td></tr>)}
   {filtered.length===0&&<tr><td colSpan={8} className="empty-row">No members found. Try another search or add a member.</td></tr>}
   </tbody></table></div>
   <p className="directory-footnote">Prototype data only — changes currently remain in this browser session and are not saved to a database.</p>
  </div>
  {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form className="member-form-modal" onSubmit={save} onClick={e=>e.stopPropagation()}><div className="form-modal-head"><div><p className="eyebrow">MEMBER PROFILE</p><h2>{editing?"Edit member":"Add new member"}</h2></div><button type="button" className="icon-button" onClick={()=>setModal(false)}><X size={18}/></button></div><div className="member-form-grid">
   <label>Full name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Enter member name"/></label>
   <label>Phone number *<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91"/></label>
   <label>Email address<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label>
   <label>Membership plan<select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}><option>Monthly</option><option>Quarterly</option><option>Half-yearly</option><option>Annual</option></select></label>
   <label>Joining date<input type="date" value={form.joined} onChange={e=>setForm({...form,joined:e.target.value})}/></label>
   <label>Expiry date<input type="date" value={form.expiry} onChange={e=>setForm({...form,expiry:e.target.value})}/></label>
   <label>Fee amount (₹)<input type="number" min="0" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})}/></label>
  </div><div className="form-modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="button-primary" type="submit"><CheckCircle2 size={15}/>{editing?"Save changes":"Create member"}</button></div></form></div>}
  {selected!==null&&(()=>{const m=members.find(x=>x.id===selected);if(!m)return null;return <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="member-detail-modal" onClick={e=>e.stopPropagation()}><div className="form-modal-head"><div><p className="eyebrow">MEMBER DETAILS</p><h2>{m.name}</h2></div><button className="icon-button" onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="detail-contact"><p><Phone size={15}/>{m.phone}</p><p><Mail size={15}/>{m.email||"No email recorded"}</p></div><div className="detail-grid"><div><small>Membership</small><strong>{m.plan}</strong></div><div><small>Status</small><strong>{m.status}</strong></div><div><small>Joined</small><strong>{date(m.joined)}</strong></div><div><small>Valid until</small><strong>{date(m.expiry)}</strong></div><div><small>Fee amount</small><strong>{money(m.fee)}</strong></div></div><div className="form-modal-actions"><button className="button-secondary" onClick={()=>{setSelected(null);openEdit(m);}}>Edit profile</button><button className="button-primary" onClick={()=>setSelected(null)}>Close</button></div></div></div>})()}
 </div>;
}
