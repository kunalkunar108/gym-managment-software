"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarDays, CheckCircle2, Clock3, Phone, RefreshCw, Search, UserRoundPlus, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { openMemberProfile } from "../lib/member-navigation";

type Row = { id: string; member_id: string; member_name: string; member_phone: string | null; plan_name: string; start_date: string; end_date: string; status: string };
type Filter = "All" | "Active" | "Expiring Soon" | "Expired" | "Pending" | "Cancelled";
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const dateText = (v: string) => new Date(v+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

export default function MembershipManagementPage({ ownerId, isTrainer, onRenew }: { ownerId: string; isTrainer: boolean; onNavigate: (page: string) => void; onRenew: (memberId: string) => void }) {
  const [rows,setRows] = useState<Row[]>([]);
  const [filter,setFilter] = useState<Filter>("All");
  const [query,setQuery] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const today = todayKey();
  const soon = new Date(); soon.setDate(soon.getDate()+7);
  const soonKey = `${soon.getFullYear()}-${String(soon.getMonth()+1).padStart(2,"0")}-${String(soon.getDate()).padStart(2,"0")}`;

  async function load() {
    setLoading(true); setError("");
    try {
      if (isTrainer) {
        const {data,error} = await supabase.rpc("trainer_list_membership_management");
        if(error) throw error;
        setRows((data??[]) as Row[]);
      } else {
        const {data,error} = await supabase.from("memberships").select("id,member_id,start_date,end_date,status,members(full_name,phone),membership_plans(name)").eq("owner_id",ownerId).order("end_date",{ascending:true});
        if(error) throw error;
        setRows((data??[]).map((r:any)=>({id:r.id,member_id:r.member_id,start_date:r.start_date,end_date:r.end_date,status:r.status,member_name:r.members?.full_name??"Member unavailable",member_phone:r.members?.phone??null,plan_name:r.membership_plans?.name??"Custom plan"})));
      }
    } catch(e) { setError(e instanceof Error?e.message:"Could not load membership records."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load();},[ownerId,isTrainer]);

  const category = (r:Row): Filter => {
    if(r.status==="cancelled") return "Cancelled";
    if(r.status==="pending") return "Pending";
    if(r.end_date<today) return "Expired";
    if(r.end_date<=soonKey) return "Expiring Soon";
    return "Active";
  };
  const counts = useMemo(()=>({All:rows.length,Active:rows.filter(r=>category(r)==="Active").length,"Expiring Soon":rows.filter(r=>category(r)==="Expiring Soon").length,Expired:rows.filter(r=>category(r)==="Expired").length,Pending:rows.filter(r=>category(r)==="Pending").length,Cancelled:rows.filter(r=>category(r)==="Cancelled").length}),[rows,today,soonKey]);
  const visible = rows.filter(r=>(filter==="All"||category(r)===filter)&&(`${r.member_name} ${r.member_phone??""} ${r.plan_name}`).toLowerCase().includes(query.toLowerCase()));
  const tabs:Filter[]=["All","Active","Expiring Soon","Expired","Pending","Cancelled"];

  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">GYM WORKSPACE / MEMBERSHIPS</p><h1 className="text-3xl font-semibold tracking-tight">Membership Management</h1><p className="welcome-subtitle">Track valid, expiring and expired memberships, and follow up for renewals.</p></div><button className="button-secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {error&&<div role="alert" className="mb-5 rounded-xl border border-[#f2d2ce] bg-[#fff4f2] px-4 py-3 text-sm text-[#a63d32]">{error}</div>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["Total records",counts.All,Users],["Active",counts.Active,CheckCircle2],["Expiring soon",counts["Expiring Soon"],Clock3],["Expired",counts.Expired,CalendarClock]].map(([label,value,Icon]:any)=><div key={label} className="rounded-2xl border border-[#e5ebe5] bg-white p-4"><div className="flex items-center justify-between text-sm text-[#718077]"><span>{label}</span><Icon size={18}/></div><p className="mt-3 text-2xl font-semibold">{loading?"—":value}</p></div>)}
    </div>
    <section className="panel directory-panel">
      <div className="directory-toolbar flex-wrap"><div><h2 className="panel-title">Membership records</h2><p className="panel-subtitle">{visible.length} records shown · Expiry is calculated from the end date</p></div><label className="table-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search member, phone or plan"/></label></div>
      <div className="flex flex-wrap gap-2 border-b border-[#edf0ed] px-5 pb-4">{tabs.map(tab=><button key={tab} onClick={()=>setFilter(tab)} className={filter===tab?"rounded-full bg-[#278348] px-3 py-2 text-xs font-semibold text-white":"rounded-full border border-[#e5ebe5] bg-white px-3 py-2 text-xs font-semibold text-[#647168] hover:bg-[#f7f9f7]"}>{tab} <span className="ml-1 opacity-75">{counts[tab]}</span></button>)}</div>
      <div className="table-scroll"><table className="members-table directory-table"><thead><tr><th>MEMBER</th><th>PLAN</th><th>START</th><th>END / VALIDITY</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
        {loading?<tr><td colSpan={6} className="empty-row">Loading membership records…</td></tr>:visible.map(r=>{const state=category(r);const late=Math.max(0,Math.floor((new Date(today+"T00:00:00").getTime()-new Date(r.end_date+"T00:00:00").getTime())/86400000));const left=Math.max(0,Math.ceil((new Date(r.end_date+"T00:00:00").getTime()-new Date(today+"T00:00:00").getTime())/86400000));return <tr key={r.id}><td><button type="button" onClick={()=>openMemberProfile(r.member_id)} className="text-left font-semibold text-[#278348] hover:underline">{r.member_name}</button><p className="text-xs text-[#89948c]">{r.member_phone??"No phone number"}</p></td><td>{r.plan_name}</td><td>{dateText(r.start_date)}</td><td><strong>{dateText(r.end_date)}</strong><p className="text-xs text-[#89948c]">{state==="Expired"?`${late} day${late===1?"":"s"} overdue`:state==="Expiring Soon"?(left===0?"Ends today":`${left} day${left===1?"":"s"} left`):state==="Active"?"Valid":state}</p></td><td><span className={`status-badge ${state==="Active"?"status-active":state==="Expired"?"status-expired":state==="Expiring Soon"?"status-pending":"status-pending"}`}>{state}</span></td><td><div className="flex items-center gap-2">{r.member_phone&&<a href={"tel:"+r.member_phone} title="Call member" className="rounded-lg border border-[#e5ebe5] p-2 text-[#278348]"><Phone size={14}/></a>}{(state==="Expired"||state==="Expiring Soon")&&<button onClick={()=>onRenew(r.member_id)} className="inline-flex items-center gap-1 rounded-lg bg-[#e8f5eb] px-2.5 py-2 text-xs font-semibold text-[#278348]"><UserRoundPlus size={13}/> Renew</button>}</div></td></tr>})}
        {!loading&&visible.length===0&&<tr><td colSpan={6} className="empty-row">{rows.length===0?"No membership records found.":"No records match this filter or search."}</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
