"use client";

import { useMemo, useState } from "react";
import { QrCode, Search, CheckCircle2, Clock3, UserRound, ScanLine, ClipboardCheck, AlertCircle } from "lucide-react";

type Member={id:string;name:string;plan:string;status:"Active"|"Expired"};
type Log={id:number;member:Member;time:string;method:"QR code"|"Manual";result:"Checked in"|"Rejected"};
const members:Member[]=[
{id:"GYM-1001",name:"Aarav Sharma",plan:"Quarterly",status:"Active"},
{id:"GYM-1002",name:"Priya Kumari",plan:"Monthly",status:"Active"},
{id:"GYM-1003",name:"Rohan Das",plan:"Annual",status:"Active"},
{id:"GYM-1004",name:"Aditya Kumar",plan:"Monthly",status:"Expired"},
{id:"GYM-1005",name:"Sneha Singh",plan:"Quarterly",status:"Active"},
{id:"GYM-1006",name:"Vikash Kumar",plan:"Monthly",status:"Active"}
];

export default function QRCheckinPage(){
 const [code,setCode]=useState("");
 const [logs,setLogs]=useState<Log[]>([
 {id:1,member:members[4],time:"07:38 AM",method:"QR code",result:"Checked in"},
 {id:2,member:members[5],time:"07:42 AM",method:"Manual",result:"Checked in"},
 {id:3,member:members[3],time:"07:51 AM",method:"QR code",result:"Rejected"}
 ]);
 const [feedback,setFeedback]=useState<{ok:boolean;text:string}|null>(null);
 const [search,setSearch]=useState("");
 const [selected,setSelected]=useState<Member|null>(null);
 const activeCount=logs.filter(x=>x.result==="Checked in").length;
 const filtered=useMemo(()=>members.filter(m=>(m.name+" "+m.id).toLowerCase().includes(search.toLowerCase())),[search]);
 const checkin=(member:Member,method:"QR code"|"Manual")=>{
   const now=new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
   const ok=member.status==="Active";
   setLogs(old=>[{id:Date.now(),member,time:now,method,result:ok?"Checked in":"Rejected"},...old]);
   setFeedback({ok,text:ok?member.name+" checked in successfully.":"Membership expired. Check-in denied for "+member.name+"."});
   setSelected(member);setCode("");
 };
 const submitCode=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const member=members.find(m=>m.id.toLowerCase()===code.trim().toLowerCase());if(!member){setFeedback({ok:false,text:"No member found for this QR/member code."});return;}checkin(member,"QR code");};
 return <div className="qr-page">
  <div className="qr-heading"><div><p className="eyebrow">MEMBER ENTRY</p><h1>QR check-in</h1><p className="welcome-subtitle">Verify membership and record gym entry.</p></div><span className="qr-demo-label"><span/> DEMO MODE</span></div>
  <div className="qr-layout">
   <section className="panel qr-scanner-panel">
    <div className="qr-scan-title"><span className="qr-icon-box"><QrCode size={19}/></span><div><strong>Scan member QR</strong><small>Enter the member code printed below their QR badge.</small></div></div>
    <div className="qr-camera-placeholder"><div className="qr-camera-frame"><ScanLine size={48}/><span>QR scanner area</span></div><p>Live camera scanning is not connected in this frontend version.</p></div>
    <form className="qr-code-form" onSubmit={submitCode}><label htmlFor="member-qr-code">Member QR / ID code</label><div><input id="member-qr-code" value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. GYM-1001"/><button className="button-primary" type="submit"><QrCode size={15}/> Verify & check in</button></div></form>
    {feedback&&<div className={`qr-feedback ${feedback.ok?"success":"error"}`}>{feedback.ok?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>}<span>{feedback.text}</span></div>}
    {selected&&<div className="qr-last-member"><div className="member-avatar mint">{selected.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div><strong>{selected.name}</strong><small>{selected.id} · {selected.plan} plan</small></div><span className={selected.status==="Active"?"status-badge status-active":"status-badge status-pending"}>{selected.status}</span></div>}
    <p className="qr-hint">Demo member codes: GYM-1001 to GYM-1006</p>
   </section>
   <section className="qr-side">
    <div className="staff-stat"><span className="staff-stat-icon green"><ClipboardCheck size={17}/></span><small>Successful check-ins in this session</small><strong>{activeCount}</strong><em>Including sample entries</em></div>
    <div className="panel qr-manual-panel"><div className="panel-title">Manual check-in</div><p className="panel-subtitle">Find a member and record entry without a QR code.</p><div className="table-search qr-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search member or ID..."/></div><div className="qr-member-list">{filtered.map(m=><div key={m.id} className="qr-member-row"><span className="qr-person-icon"><UserRound size={15}/></span><div><strong>{m.name}</strong><small>{m.id} · {m.plan}</small></div><button disabled={m.status!=="Active"} onClick={()=>checkin(m,"Manual")}>{m.status==="Active"?"Check in":"Expired"}</button></div>)}</div></div>
   </section>
  </div>
  <section className="panel qr-log-panel"><div className="panel-heading"><div><div className="panel-title">Recent check-in activity</div><p className="panel-subtitle">Latest QR and manual entry attempts</p></div><span className="staff-count">{logs.length} entries</span></div><div className="table-scroll"><table className="members-table"><thead><tr><th>MEMBER</th><th>MEMBER ID</th><th>TIME</th><th>METHOD</th><th>RESULT</th></tr></thead><tbody>{logs.map(log=><tr key={log.id}><td><div className="member-cell"><div className="member-avatar mint">{log.member.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><span>{log.member.name}</span></div></td><td>{log.member.id}</td><td>{log.time}</td><td>{log.method}</td><td><span className={`status-badge ${log.result==="Checked in"?"status-active":"status-pending"}`}>{log.result}</span></td></tr>)}</tbody></table></div><p className="staff-footnote">All entries are demo data and are cleared when the page reloads. Camera-based QR decoding and persistent attendance records require backend integration.</p></section>
 </div>;
}
