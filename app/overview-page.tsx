"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Download, Dumbbell, Plus, Search, Users, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "../lib/supabase";

type Member = { id: string; full_name: string; joined_on: string; status: string };
type Payment = { amount: number | string; paid_on: string; status: string };
type Expense = { amount: number | string; spent_on: string };
type Membership = { id: string; member_id: string; end_date: string; status: string };
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const money = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const shortDate = (s: string) => new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"});

export default function OverviewPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [period,setPeriod] = useState("This month");
  const [search,setSearch] = useState("");
  const [members,setMembers] = useState<Member[]>([]);
  const [payments,setPayments] = useState<Payment[]>([]);
  const [expenses,setExpenses] = useState<Expense[]>([]);
  const [expiring,setExpiring] = useState<Membership[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const {data: auth,error: authError} = await supabase.auth.getUser();
        if(authError) throw authError;
        if(!auth.user) throw new Error("Your session has expired. Please log in again.");
        const {data: ownerId, error: ownerIdError} = await supabase.rpc("current_gym_owner_id");
        if(ownerIdError || !ownerId) throw ownerIdError ?? new Error("Could not identify this gym account.");
        const {data: ownerRole, error: ownerRoleError} = await supabase.rpc("is_gym_owner");
        if(ownerRoleError) throw ownerRoleError;
        const today = dateKey(new Date());
        const until = new Date(); until.setDate(until.getDate()+7);
        const expiryRequest = ownerRole
          ? supabase.from("memberships").select("id,member_id,end_date,status").eq("owner_id",ownerId).eq("status","active").gte("end_date",today).lte("end_date",dateKey(until)).order("end_date",{ascending:true})
          : supabase.rpc("trainer_list_expiring_memberships");
        const [m,p,e,x] = await Promise.all([
          supabase.from("members").select("id,full_name,joined_on,status").eq("owner_id",ownerId).order("created_at",{ascending:false}),
          supabase.from("payments").select("amount,paid_on,status").eq("owner_id",ownerId).eq("status","paid"),
          supabase.from("expenses").select("amount,spent_on").eq("owner_id",ownerId),
          expiryRequest
        ]);
        for (const result of [m,p,e,x]) if(result.error) throw result.error;
        if(!cancelled) {
          setMembers((m.data??[]) as Member[]); setPayments((p.data??[]) as Payment[]);
          setExpenses((e.data??[]) as Expense[]);
          setExpiring((x.data??[]) as Membership[]);
        }
      } catch(err) { if(!cancelled) setError(err instanceof Error?err.message:"Could not load dashboard data."); }
      finally { if(!cancelled) setLoading(false); }
    }
    void load();
    return () => {cancelled=true;};
  },[]);

  const today = new Date();
  const todayText = new Intl.DateTimeFormat("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(today);
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
  const chosen = new Date(today.getFullYear(),today.getMonth()+(period==="This month"?0:-1),1);
  const chosenKey = `${chosen.getFullYear()}-${String(chosen.getMonth()+1).padStart(2,"0")}`;
  const monthRevenue = payments.filter(p=>p.paid_on.startsWith(currentMonth)).reduce((sum,p)=>sum+Number(p.amount),0);
  const activeMembers = members.filter(m=>m.status==="active").length;
  const days = new Date(chosen.getFullYear(),chosen.getMonth()+1,0).getDate();
  const chart = Array.from({length:days},(_,i)=>{
    const key = `${chosenKey}-${String(i+1).padStart(2,"0")}`;
    return {day:String(i+1).padStart(2,"0"),income:payments.filter(p=>p.paid_on===key).reduce((s,p)=>s+Number(p.amount),0),expenses:expenses.filter(e=>e.spent_on===key).reduce((s,e)=>s+Number(e.amount),0)};
  });
  const memberMap = new Map(members.map(m=>[m.id,m.full_name]));
  const recent = useMemo(()=>members.filter(m=>m.full_name.toLowerCase().includes(search.toLowerCase())).slice(0,5),[members,search]);
  const shownRevenue = payments.filter(p=>p.paid_on.startsWith(chosenKey)).reduce((s,p)=>s+Number(p.amount),0);

  function metric(title:string,value:string,note:string,Icon:typeof Users,tone:string) {
    return <div className="metric-card"><div className="flex items-start justify-between"><div><p className="metric-label">{title}</p><h3 className="metric-value">{value}</h3></div><div className={`metric-icon ${tone}`}><Icon size={19} strokeWidth={1.8}/></div></div><div className="mt-4 flex items-center gap-2 text-xs"><span className="trend-up"><CheckCircle2 size={13}/> Live</span><span className="text-[#89948c]">{note}</span></div></div>;
  }

  return <div>
    <section className="welcome-row"><div><p className="eyebrow">{todayText.toUpperCase()}</p><h1>Gym overview <span>✦</span></h1><p className="welcome-subtitle">Your live gym activity and business summary.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={()=>onNavigate("Reports")}><Download size={16}/> Reports</button><button className="button-primary" onClick={()=>onNavigate("Admissions")}><Plus size={17}/> Add member</button></div></section>
    {error&&<div role="alert" className="mb-5 rounded-xl border border-[#f2d2ce] bg-[#fff4f2] px-4 py-3 text-sm text-[#a63d32]">{error}</div>}
    <section className="metric-grid">
      {metric("Total members",loading?"—":String(members.length),"registered members",Users,"green")}
      {metric("Active members",loading?"—":String(activeMembers),"active member profiles",Dumbbell,"blue")}
      {metric("Collected this month",loading?"—":`₹${money(monthRevenue)}`,"paid payments recorded",Wallet,"purple")}
    </section>
    <section className="content-grid">
      <div className="panel revenue-panel"><div className="panel-heading"><div><div className="panel-title">Revenue overview</div><p className="panel-subtitle">Income and expenses from saved records</p></div><div className="flex items-center gap-2"><div className="chart-legend"><span className="legend-dot income"/> Income <span className="legend-dot expenses-dot"/> Expenses</div><button className="select-button" onClick={()=>setPeriod(period==="This month"?"Last month":"This month")}>{period}<ChevronDown size={14}/></button></div></div><div className="revenue-total"><strong>₹{money(shownRevenue)}</strong><small>{period} paid collections</small></div><div className="chart-wrap">{loading?<div className="flex h-full items-center justify-center text-sm text-[#89948c]">Loading financial data…</div>:<ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{top:10,right:5,left:-20,bottom:0}}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#45a767" stopOpacity={.17}/><stop offset="95%" stopColor="#45a767" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e5aa69" stopOpacity={.13}/><stop offset="95%" stopColor="#e5aa69" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf1ed" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:"#9aa49d",fontSize:11}} interval={Math.max(0,Math.floor(days/8)-1)} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#9aa49d",fontSize:11}} tickFormatter={v=>v===0?"0":`${v/1000}k`}/><Tooltip formatter={v=>[`₹${money(Number(v))}`,""]} contentStyle={{border:"1px solid #e9eee9",borderRadius:12,fontSize:12}}/><Area type="monotone" dataKey="income" stroke="#329653" strokeWidth={2.5} fill="url(#incomeFill)"/><Area type="monotone" dataKey="expenses" stroke="#e5aa69" strokeWidth={2} fill="url(#expenseFill)"/></AreaChart></ResponsiveContainer>}</div></div>

    </section>
    <section className="lower-grid">
      <div className="panel members-panel"><div className="panel-heading"><div><div className="panel-title">Recent members</div><p className="panel-subtitle">Latest registered member profiles</p></div><button className="text-link" onClick={()=>onNavigate("Members")}>View all members <ChevronRight size={14}/></button></div><div className="table-toolbar"><div className="table-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members..."/></div></div><div className="table-scroll"><table className="members-table"><thead><tr><th>MEMBER</th><th>JOINED</th><th>STATUS</th></tr></thead><tbody>{recent.map(m=><tr key={m.id}><td><div className="member-cell"><div className="member-avatar mint">{m.full_name.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase()}</div><span>{m.full_name}</span></div></td><td>{shortDate(m.joined_on)}</td><td><span className={`status-badge ${m.status==="active"?"status-active":m.status==="expired"?"status-expired":"status-pending"}`}>{m.status}</span></td></tr>)}{!loading&&recent.length===0&&<tr><td colSpan={3} className="empty-row">No member records yet.</td></tr>}</tbody></table></div></div>
      <div className="panel expiry-panel"><div className="panel-heading"><div><div className="panel-title">Memberships expiring</div><p className="panel-subtitle">Active memberships ending in 7 days</p></div><span className="expiry-count">{loading?"—":expiring.length}</span></div><div className="expiry-list">{expiring.slice(0,4).map(m=><div className="expiry-row" key={m.id}><div className="expiry-icon amber"><CalendarClock size={17}/></div><div className="min-w-0 flex-1"><p className="row-name">{memberMap.get(m.member_id)??"Member"}</p><p className="row-muted">Active membership</p></div><div className="text-right"><p className="expiry-date amber">{m.end_date===dateKey(today)?"Expires today":`Expires ${shortDate(m.end_date)}`}</p></div></div>)}{!loading&&expiring.length===0&&<p className="py-6 text-center text-xs text-[#89948c]">No memberships expiring in the next 7 days.</p>}</div><button className="view-expiry" onClick={()=>onNavigate("Members")}>View members <ChevronRight size={14}/></button></div>
    </section>
    <footer className="footer"><span>© {today.getFullYear()} GymDesk. Built for your gym.</span><span><span className="online-dot"/> Dashboard data synced from your database</span></footer>
  </div>;
}
