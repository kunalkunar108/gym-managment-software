"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode, Search, CheckCircle2, Clock3, UserRound, ScanLine, ClipboardCheck, AlertCircle, LoaderCircle, RefreshCw, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

type Member={id:string;name:string;phone:string;status:string;code:string;hasValidMembership:boolean};
type Attendance={id:string;member_id:string;attendance_date:string;check_in:string;check_out:string|null;source:"qr"|"manual"};
type Log={id:string;member:Member|null;memberName:string;code:string;time:string;method:"QR code"|"Manual";result:"Checked in"|"Checked out"};
const localDate=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const clock=(value:string)=>new Date(value).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});

export default function QRCheckinPage(){
 const [members,setMembers]=useState<Member[]>([]);
 const [records,setRecords]=useState<Attendance[]>([]);
 const [code,setCode]=useState("");
 const [logs,setLogs]=useState<Log[]>([]);
 const [feedback,setFeedback]=useState<{ok:boolean;text:string}|null>(null);
 const [search,setSearch]=useState("");
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [userId,setUserId]=useState<string|null>(null);
 const today=localDate();

 async function load(){
  setLoading(true);setError("");
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError)throw authError;
   if(!auth.user)throw new Error("Your session has expired. Please log in again.");
   setUserId(auth.user.id);
   const [memberResult,membershipResult,attendanceResult]=await Promise.all([
    supabase.from("members").select("id,full_name,phone,status").eq("owner_id",auth.user.id).order("full_name"),
    supabase.from("memberships").select("member_id,start_date,end_date,status").eq("owner_id",auth.user.id).eq("status","active").lte("start_date",today).gte("end_date",today),
    supabase.from("attendance").select("id,member_id,attendance_date,check_in,check_out,source").eq("owner_id",auth.user.id).eq("attendance_date",today).order("check_in",{ascending:false})
   ]);
   if(memberResult.error)throw memberResult.error;
   if(membershipResult.error)throw membershipResult.error;
   if(attendanceResult.error)throw attendanceResult.error;
   const validIds=new Set((membershipResult.data??[]).map(x=>x.member_id));
   const mapped=(memberResult.data??[]).map(m=>({id:m.id,name:m.full_name,phone:m.phone,status:m.status,code:"GYM-"+m.id.slice(0,8).toUpperCase(),hasValidMembership:validIds.has(m.id)}));
   setMembers(mapped);
   setRecords((attendanceResult.data??[]) as Attendance[]);
   const byId=new Map(mapped.map(m=>[m.id,m]));
   setLogs((attendanceResult.data??[]).map(r=>({id:r.id,member:byId.get(r.member_id)??null,memberName:byId.get(r.member_id)?.name??"Deleted member",code:byId.get(r.member_id)?.code??"—",time:clock(r.check_out??r.check_in),method:r.source==="qr"?"QR code":"Manual",result:r.check_out?"Checked out":"Checked in"})));
  }catch(e){setError(e instanceof Error?e.message:"Could not load QR check-in data.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);

 const activeCount=records.length;
 const filtered=useMemo(()=>members.filter(m=>(m.name+" "+m.phone+" "+m.code).toLowerCase().includes(search.toLowerCase())),[members,search]);
 const findMember=(value:string)=>members.find(m=>m.id.toLowerCase()===value.trim().toLowerCase()||m.code.toLowerCase()===value.trim().toLowerCase());

 async function checkin(member:Member,method:"qr"|"manual"){
  if(!userId)return;
  setWorking(member.id);setFeedback(null);setError("");
  if(member.status!=="active"){setFeedback({ok:false,text:"This member is inactive. Check-in denied."});setWorking(null);return;}
  if(!member.hasValidMembership){setFeedback({ok:false,text:"No current active membership was found for "+member.name+". Check-in denied."});setWorking(null);return;}
  const existing=records.find(r=>r.member_id===member.id);
  if(existing){setFeedback({ok:false,text:member.name+" already checked in today."});setWorking(null);return;}
  const {error:insertError}=await supabase.from("attendance").insert({owner_id:userId,member_id:member.id,attendance_date:today,check_in:new Date().toISOString(),source:method});
  if(insertError){setFeedback({ok:false,text:insertError.message});}
  else{setFeedback({ok:true,text:member.name+" checked in successfully. Attendance saved."});await load();}
  setWorking(null);
 }

 async function checkout(record:Attendance){
  if(!userId||record.check_out)return;
  setWorking(record.member_id);setError("");
  const {error:updateError}=await supabase.from("attendance").update({check_out:new Date().toISOString()}).eq("id",record.id).eq("owner_id",userId);
  if(updateError)setError(updateError.message);else await load();
  setWorking(null);
 }

 function submitCode(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  const member=findMember(code);
  if(!member){setFeedback({ok:false,text:"No member found. Check the member QR code or ID."});return;}
  void checkin(member,"qr");setCode("");
 }

 return <div className="qr-page">
  <div className="qr-heading"><div><p className="eyebrow">MEMBER ENTRY</p><h1>QR check-in</h1><p className="welcome-subtitle">Verify a member's current membership and save their gym entry.</p></div><span className="qr-demo-label"><span/> LIVE DATABASE</span></div>
  <div className="qr-layout">
   <section className="panel qr-scanner-panel">
    <div className="qr-scan-title"><span className="qr-icon-box"><QrCode size={19}/></span><div><strong>Verify member code</strong><small>Enter the code shown in the member directory below.</small></div></div>
    <div className="qr-camera-placeholder"><div className="qr-camera-frame"><ScanLine size={48}/><span>Code entry mode</span></div><p>Camera-based QR decoding is not enabled yet. You can verify codes here or check members in manually.</p></div>
    <form className="qr-code-form" onSubmit={submitCode}><label htmlFor="member-qr-code">Member QR / ID code</label><div><input id="member-qr-code" value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. GYM-A1B2C3D4"/><button className="button-primary" type="submit" disabled={loading||!code.trim()}><QrCode size={15}/> Verify & check in</button></div></form>
    {feedback&&<div className={`qr-feedback ${feedback.ok?"success":"error"}`}>{feedback.ok?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>}<span>{feedback.text}</span></div>}
    {error&&<div className="qr-feedback error"><AlertCircle size={17}/><span>{error}</span></div>}
    <p className="qr-hint">Only active members with a current active membership can check in. Duplicate daily check-ins are blocked.</p>
   </section>
   <section className="qr-side">
    <div className="staff-stat"><span className="staff-stat-icon green"><ClipboardCheck size={17}/></span><small>Today's saved check-ins</small><strong>{loading?"—":activeCount}</strong><em>Live attendance records</em></div>
    <div className="panel qr-manual-panel"><div className="panel-title">Manual check-in</div><p className="panel-subtitle">Find a member and record entry without scanning a code.</p><div className="table-search qr-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search member, phone or code..."/></div><div className="qr-member-list">{loading?<p className="empty-row"><LoaderCircle size={15} className="inline animate-spin mr-2"/>Loading members…</p>:filtered.map(m=>{const checked=records.some(r=>r.member_id===m.id);const eligible=m.status==="active"&&m.hasValidMembership;return <div key={m.id} className="qr-member-row"><span className="qr-person-icon"><UserRound size={15}/></span><div><strong>{m.name}</strong><small>{m.code} · {m.hasValidMembership?"Membership valid": "No current membership"}</small></div><button disabled={!eligible||checked||working===m.id} onClick={()=>void checkin(m,"manual")}>{working===m.id?<LoaderCircle size={13} className="animate-spin"/>:checked?"Checked in":eligible?"Check in":"Ineligible"}</button></div>})}{!loading&&filtered.length===0&&<p className="empty-row">No matching members found.</p>}</div></div>
   </section>
  </div>
  <section className="panel qr-log-panel"><div className="panel-heading"><div><div className="panel-title">Today's check-in activity</div><p className="panel-subtitle">Saved QR and manual attendance records</p></div><div className="flex items-center gap-3"><span className="staff-count">{logs.length} entries</span><button className="text-link flex items-center gap-1" onClick={()=>void load()}><RefreshCw size={13}/> Refresh</button></div></div><div className="table-scroll"><table className="members-table"><thead><tr><th>MEMBER</th><th>MEMBER CODE</th><th>CHECK IN</th><th>METHOD</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{logs.map(log=>{const record=records.find(r=>r.id===log.id);return <tr key={log.id}><td><div className="member-cell"><div className="member-avatar mint">{log.memberName.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><span>{log.memberName}</span></div></td><td>{log.code}</td><td>{log.time}</td><td>{log.method}</td><td><span className="status-badge status-active">{log.result}</span></td><td>{record&&!record.check_out?<button className="attendance-actions" disabled={working===record.member_id} onClick={()=>void checkout(record)}><LogOut size={13}/> Check out</button>:<span className="text-xs text-[#89948c]">Complete</span>}</td></tr>})}{!loading&&logs.length===0&&<tr><td colSpan={6} className="empty-row">No check-ins recorded today.</td></tr>}</tbody></table></div><p className="staff-footnote">Member codes are generated from each member's database ID. Successful check-ins and check-outs are saved in Attendance.</p></section>
 </div>;
}
