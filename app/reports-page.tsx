"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, TrendingUp, TrendingDown, Users, Wallet, ClipboardCheck, CreditCard, Printer, LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type Period = "This month" | "Last month" | "All time";
type PaymentRow = { id:string; receipt_number:string; amount:number|string; paid_on:string; method:string; status:string; member_id:string|null; note:string|null };
type DailyRow = { date:string; income:number; expenses:number; members:number; attendance:number; payments:number };
const fmt=(n:number)=>"₹"+new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);
const todayISO=()=>new Date().toLocaleDateString("en-CA");
const monthStart=(offset:number)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+offset);return d.toLocaleDateString("en-CA");};
const dateLabel=(value:string)=>new Date(value+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
const methodLabel=(value:string)=>({upi:"UPI",cash:"Cash",card:"Card",bank_transfer:"Bank transfer"}[value]||value);

export default function ReportsPage(){
  const [period,setPeriod]=useState<Period>("This month");
  const [payments,setPayments]=useState<PaymentRow[]>([]);
  const [expenses,setExpenses]=useState<{amount:number|string;spent_on:string}[]>([]);
  const [members,setMembers]=useState<{id:string;full_name:string;joined_on:string}[]>([]);
  const [attendance,setAttendance]=useState<{attendance_date:string}[]>([]);
  const [memberNames,setMemberNames]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load(){
    setLoading(true);setError("");
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!auth.user)throw new Error("Your session has expired. Please log in again.");
      const owner=auth.user.id;
      const [p,e,m,a]=await Promise.all([
        supabase.from("payments").select("id,receipt_number,amount,paid_on,method,status,member_id,note").eq("owner_id",owner).order("paid_on",{ascending:false}),
        supabase.from("expenses").select("amount,spent_on").eq("owner_id",owner),
        supabase.from("members").select("id,full_name,joined_on").eq("owner_id",owner),
        supabase.from("attendance").select("attendance_date").eq("owner_id",owner)
      ]);
      if(p.error)throw p.error;if(e.error)throw e.error;if(m.error)throw m.error;if(a.error)throw a.error;
      const memberRows=m.data??[];
      setPayments((p.data??[]) as PaymentRow[]);
      setExpenses((e.data??[]) as {amount:number|string;spent_on:string}[]);
      setMembers(memberRows);
      setAttendance(a.data??[]);
      setMemberNames(Object.fromEntries(memberRows.map(x=>[x.id,x.full_name])));
    }catch(err){setError(err instanceof Error?err.message:"Could not load reports.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const range=useMemo(()=>{
    const start=period==="This month"?monthStart(0):period==="Last month"?monthStart(-1):"0001-01-01";
    const end=period==="Last month"?monthStart(0):todayISO();
    return {start,end};
  },[period]);
  const inRange=(date:string)=>date>=range.start&&date<=range.end;
  const daily=useMemo(()=>{
    const map=new Map<string,DailyRow>();
    const get=(date:string)=>{if(!map.has(date))map.set(date,{date,income:0,expenses:0,members:0,attendance:0,payments:0});return map.get(date)!;};
    payments.filter(x=>x.status==="paid"&&inRange(x.paid_on)).forEach(x=>{const r=get(x.paid_on);r.income+=Number(x.amount)||0;r.payments++;});
    expenses.filter(x=>inRange(x.spent_on)).forEach(x=>{get(x.spent_on).expenses+=Number(x.amount)||0;});
    members.filter(x=>inRange(x.joined_on)).forEach(x=>get(x.joined_on).members++);
    attendance.filter(x=>inRange(x.attendance_date)).forEach(x=>get(x.attendance_date).attendance++);
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
  },[payments,expenses,members,attendance,range]);
  const totals=useMemo(()=>daily.reduce((a,r)=>({income:a.income+r.income,expenses:a.expenses+r.expenses,members:a.members+r.members,attendance:a.attendance+r.attendance,payments:a.payments+r.payments}),{income:0,expenses:0,members:0,attendance:0,payments:0}),[daily]);
  const profit=totals.income-totals.expenses;
  const max=Math.max(...daily.map(r=>Math.max(r.income,r.expenses)),1);
  const periodLabel=period==="This month"?new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"}):period==="Last month"?new Date(new Date().getFullYear(),new Date().getMonth()-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"}):"All recorded dates";
  const history=payments.filter(p=>inRange(p.paid_on)).slice(0,20);

  return <div className="reports-page">
    <section className="reports-heading"><div><p className="eyebrow">BUSINESS INSIGHTS</p><h1>Reports</h1><p className="welcome-subtitle">Understand your gym's performance across finance, members and attendance.</p></div><div className="reports-actions"><label className="report-period"><CalendarDays size={15}/><select value={period} onChange={e=>setPeriod(e.target.value as Period)}><option>This month</option><option>Last month</option><option>All time</option></select></label><button className="button-secondary" onClick={()=>window.print()}><Printer size={15}/> Print report</button></div></section>
    <div className="report-period-caption">REPORTING PERIOD <strong>{periodLabel}</strong><span> · Live database records</span><button className="text-link ml-2 inline-flex items-center gap-1" onClick={()=>void load()}><RefreshCw size={12}/> Refresh</button></div>
    {error&&<p role="alert" className="mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
    <section className="report-metrics">
      <article className="report-metric"><span className="report-metric-icon green"><Wallet size={18}/></span><small>Total revenue</small><strong>{loading?"—":fmt(totals.income)}</strong><em>Paid collections only</em></article>
      <article className="report-metric"><span className="report-metric-icon orange"><TrendingDown size={18}/></span><small>Total expenses</small><strong>{loading?"—":fmt(totals.expenses)}</strong><em>Recorded operating costs</em></article>
      <article className="report-metric"><span className="report-metric-icon blue"><TrendingUp size={18}/></span><small>Net operating result</small><strong className={profit>=0?"report-positive":"report-negative"}>{loading?"—":fmt(profit)}</strong><em>Revenue minus expenses</em></article>
      <article className="report-metric"><span className="report-metric-icon purple"><Users size={18}/></span><small>New members</small><strong>{loading?"—":totals.members}</strong><em>Registrations in period</em></article>
    </section>
    <section className="report-two-col">
      <div className="panel report-panel"><div className="panel-heading"><div><div className="panel-title">Revenue vs expenses</div><p className="panel-subtitle">Daily financial activity for {periodLabel}</p></div></div>
        <div className="report-chart-legend"><span><i className="revenue-key"/> Revenue</span><span><i className="expense-key"/> Expenses</span></div>
        {loading?<p className="empty-row"><LoaderCircle size={16} className="inline animate-spin mr-2"/>Loading report data…</p>:daily.length===0?<p className="empty-row">No activity recorded for this period yet.</p>:<div className="report-bars">{daily.map(r=><div className="report-bar-group" key={r.date}><div className="report-bar-pair"><div className="report-bar revenue-bar" style={{height:Math.max(3,r.income/max*100)+"%"}} title={"Revenue "+fmt(r.income)}/><div className="report-bar expense-bar-visual" style={{height:Math.max(3,r.expenses/max*100)+"%"}} title={"Expenses "+fmt(r.expenses)}/></div><small>{dateLabel(r.date)}</small></div>)}</div>}
        <div className="report-chart-foot"><span>Revenue <strong>{fmt(totals.income)}</strong></span><span>Expenses <strong>{fmt(totals.expenses)}</strong></span></div>
      </div>
      <div className="panel report-panel"><div className="panel-heading"><div><div className="panel-title">Operations snapshot</div><p className="panel-subtitle">Activity totals for selected period</p></div></div>
        <div className="report-operation-list"><div><span className="report-operation-icon"><ClipboardCheck size={16}/></span><span>Attendance check-ins</span><strong>{loading?"—":totals.attendance}</strong></div><div><span className="report-operation-icon"><CreditCard size={16}/></span><span>Paid transactions</span><strong>{loading?"—":totals.payments}</strong></div><div><span className="report-operation-icon"><Users size={16}/></span><span>New member registrations</span><strong>{loading?"—":totals.members}</strong></div></div>
        <div className="report-insight"><strong>Net result</strong><b>{loading?"—":fmt(profit)}</b><small>{totals.income>0?((profit/totals.income)*100).toFixed(1):"0.0"}% of recorded revenue</small></div>
      </div>
    </section>
    <section className="panel report-history"><div className="panel-heading"><div><div className="panel-title">Payment history</div><p className="panel-subtitle">Recent recorded transactions · {periodLabel}</p></div><span className="report-history-count">{history.length} records</span></div>
      <div className="table-scroll"><table className="members-table report-table"><thead><tr><th>RECEIPT</th><th>MEMBER</th><th>DATE</th><th>METHOD</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>{history.map(p=><tr key={p.id}><td className="report-receipt">{p.receipt_number}</td><td>{p.member_id?memberNames[p.member_id]||"Deleted member":"Unassigned"}</td><td>{dateLabel(p.paid_on)}</td><td>{methodLabel(p.method)}</td><td className="amount-cell">{fmt(Number(p.amount)||0)}</td><td><span className={"status-badge "+(p.status==="paid"?"status-active":"status-pending")}>{p.status.charAt(0).toUpperCase()+p.status.slice(1)}</span></td></tr>)}{!loading&&history.length===0&&<tr><td colSpan={6} className="empty-row">No payments recorded for this period.</td></tr>}</tbody></table></div>
      <p className="directory-footnote">Revenue includes payments marked paid. Pending, failed and refunded payments are excluded from revenue.</p>
    </section>
  </div>;
}
