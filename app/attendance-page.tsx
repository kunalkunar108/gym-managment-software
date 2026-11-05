"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Download, LogIn, LogOut, Search, Users, UserCheck, UserX } from "lucide-react";

type Entry = { id:number; name:string; phone:string; initials:string; timeIn:string; timeOut:string; status:"Present"|"Absent" };
const initialEntries: Entry[] = [
  {id:1,name:"Vikash Kumar",phone:"9876543210",initials:"VK",timeIn:"07:42 AM",timeOut:"",status:"Present"},
  {id:2,name:"Sneha Singh",phone:"9876543211",initials:"SS",timeIn:"07:38 AM",timeOut:"",status:"Present"},
  {id:3,name:"Rahul Raj",phone:"9876543212",initials:"RR",timeIn:"07:31 AM",timeOut:"",status:"Present"},
  {id:4,name:"Anjali Kumari",phone:"9876543213",initials:"AK",timeIn:"07:24 AM",timeOut:"",status:"Present"},
  {id:5,name:"Aarav Sharma",phone:"9876543214",initials:"AS",timeIn:"",timeOut:"",status:"Absent"},
  {id:6,name:"Priya Kumari",phone:"9876543215",initials:"PK",timeIn:"",timeOut:"",status:"Absent"},
  {id:7,name:"Rohan Das",phone:"9876543216",initials:"RD",timeIn:"06:55 AM",timeOut:"",status:"Present"},
  {id:8,name:"Aditya Kumar",phone:"9876543217",initials:"AK",timeIn:"",timeOut:"",status:"Absent"}
];

export default function AttendancePage() {
  const [entries,setEntries] = useState(initialEntries);
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState("All");
  const present = entries.filter(e=>e.status==="Present").length;
  const absent = entries.length-present;
  const filtered = useMemo(()=>entries.filter(e=>(e.name.toLowerCase().includes(search.toLowerCase())||e.phone.includes(search))&&(filter==="All"||e.status===filter)),[entries,search,filter]);
  const markIn = (id:number) => setEntries(old=>old.map(e=>e.id===id?{...e,status:"Present",timeIn:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),timeOut:""}:e));
  const markOut = (id:number) => setEntries(old=>old.map(e=>e.id===id?{...e,timeOut:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}:e));
  return <div className="attendance-page">
    <div className="attendance-heading"><div><p className="eyebrow">GYM WORKSPACE</p><h1>Attendance</h1><p className="welcome-subtitle">Track daily member visits and check-in activity.</p></div><div className="attendance-date"><CalendarDays size={16}/>{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div></div>
    <div className="attendance-stats">
      <div className="attendance-stat"><span><Users size={17}/></span><small>Total listed</small><strong>{entries.length}</strong></div>
      <div className="attendance-stat"><span className="stat-green"><UserCheck size={17}/></span><small>Present today</small><strong>{present}</strong></div>
      <div className="attendance-stat"><span className="stat-orange"><UserX size={17}/></span><small>Not checked in</small><strong>{absent}</strong></div>
      <div className="attendance-stat"><span className="stat-blue"><Clock3 size={17}/></span><small>Attendance rate</small><strong>{entries.length?Math.round(present/entries.length*100):0}%</strong></div>
    </div>
    <div className="panel attendance-directory">
      <div className="panel-heading"><div><div className="panel-title">Today's attendance log</div><p className="panel-subtitle">Manually record member check-ins and check-outs</p></div><span className="attendance-live"><i/> Today</span></div>
      <div className="attendance-toolbar"><div className="table-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or phone number..."/></div><select className="attendance-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Present</option><option>Absent</option></select></div>
      <div className="table-scroll"><table className="members-table attendance-table"><thead><tr><th>MEMBER</th><th>PHONE</th><th>CHECK IN</th><th>CHECK OUT</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
        {filtered.map(e=><tr key={e.id}><td><div className="member-cell"><div className="member-avatar mint">{e.initials}</div><span>{e.name}</span></div></td><td>{e.phone}</td><td>{e.timeIn||"—"}</td><td>{e.timeOut||"—"}</td><td><span className={`status-badge ${e.status==="Present"?"status-active":"status-expired"}`}>{e.status}</span></td><td><div className="attendance-actions">{e.status==="Absent"?<button onClick={()=>markIn(e.id)}><LogIn size={13}/> Check in</button>:<button onClick={()=>markOut(e.id)} disabled={!!e.timeOut}><LogOut size={13}/> {e.timeOut?"Checked out":"Check out"}</button>}</div></td></tr>)}
        {filtered.length===0&&<tr><td colSpan={6} className="empty-row">No members found.</td></tr>}
      </tbody></table></div>
      <p className="attendance-note"><Check size={13}/> Attendance changes are currently stored in this page's temporary state. They will reset when you refresh.</p>
    </div>
  </div>;
}
