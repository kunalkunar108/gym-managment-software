"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Download, TrendingUp, TrendingDown, Users, Wallet, ClipboardCheck, CreditCard, Printer } from "lucide-react";

type Period = "This month" | "Last month" | "All time";
const reportRows = [
  { date:"2026-11-01", income:18000, expenses:9000, members:5, attendance:34, payments:12 },
  { date:"2026-11-02", income:12500, expenses:3200, members:3, attendance:41, payments:9 },
  { date:"2026-11-03", income:24000, expenses:12000, members:7, attendance:48, payments:17 },
  { date:"2026-11-04", income:21000, expenses:8000, members:4, attendance:52, payments:15 },
  { date:"2026-11-05", income:31000, expenses:14000, members:6, attendance:46, payments:19 },
  { date:"2026-10-01", income:16000, expenses:7000, members:3, attendance:31, payments:10 },
  { date:"2026-10-02", income:19000, expenses:8500, members:4, attendance:37, payments:13 },
  { date:"2026-10-03", income:22000, expenses:9000, members:5, attendance:43, payments:16 },
  { date:"2026-10-04", income:14500, expenses:6500, members:2, attendance:39, payments:11 },
  { date:"2026-10-05", income:26000, expenses:11000, members:6, attendance:45, payments:18 }
];
const paymentHistory = [
  { receipt:"RC-1105-019", member:"Aarav Sharma", date:"05 Nov 2026", plan:"Quarterly", method:"UPI", amount:3000, status:"Paid" },
  { receipt:"RC-1105-018", member:"Priya Kumari", date:"05 Nov 2026", plan:"Monthly", method:"Cash", amount:1200, status:"Paid" },
  { receipt:"RC-1104-017", member:"Rohan Das", date:"04 Nov 2026", plan:"Annual", method:"Card", amount:10000, status:"Paid" },
  { receipt:"RC-1103-016", member:"Aditya Kumar", date:"03 Nov 2026", plan:"Monthly", method:"UPI", amount:1200, status:"Pending" },
  { receipt:"RC-1102-015", member:"Sneha Singh", date:"02 Nov 2026", plan:"Quarterly", method:"Bank transfer", amount:3000, status:"Paid" }
];
const fmt=(n:number)=>"₹"+new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);
export default function ReportsPage(){
  const [period,setPeriod]=useState<Period>("This month");
  const rows=useMemo(()=>reportRows.filter(r=>period==="All time" || r.date.slice(0,7)===(period==="This month"?"2026-11":"2026-10")),[period]);
  const totals=useMemo(()=>rows.reduce((a,r)=>({income:a.income+r.income,expenses:a.expenses+r.expenses,members:a.members+r.members,attendance:a.attendance+r.attendance,payments:a.payments+r.payments}),{income:0,expenses:0,members:0,attendance:0,payments:0}),[rows]);
  const profit=totals.income-totals.expenses;
  const max=Math.max(...rows.map(r=>Math.max(r.income,r.expenses)),1);
  const periodLabel=period==="All time"?"Oct–Nov 2026":period==="This month"?"November 2026":"October 2026";
  return <div className="reports-page">
    <section className="reports-heading"><div><p className="eyebrow">BUSINESS INSIGHTS</p><h1>Reports</h1><p className="welcome-subtitle">Understand your gym's performance across finance, members and attendance.</p></div><div className="reports-actions"><label className="report-period"><CalendarDays size={15}/><select value={period} onChange={e=>setPeriod(e.target.value as Period)}><option>This month</option><option>Last month</option><option>All time</option></select></label><button className="button-secondary" onClick={()=>window.print()}><Printer size={15}/> Print report</button></div></section>
    <div className="report-period-caption">REPORTING PERIOD <strong>{periodLabel}</strong><span> · Sample dashboard data</span></div>
    <section className="report-metrics">
      <article className="report-metric"><span className="report-metric-icon green"><Wallet size={18}/></span><small>Total revenue</small><strong>{fmt(totals.income)}</strong><em>Recorded collections</em></article>
      <article className="report-metric"><span className="report-metric-icon orange"><TrendingDown size={18}/></span><small>Total expenses</small><strong>{fmt(totals.expenses)}</strong><em>Recorded operating costs</em></article>
      <article className="report-metric"><span className="report-metric-icon blue"><TrendingUp size={18}/></span><small>Net operating result</small><strong className={profit>=0?"report-positive":"report-negative"}>{fmt(profit)}</strong><em>{profit>=0?"Revenue minus expenses":"Expenses exceed revenue"}</em></article>
      <article className="report-metric"><span className="report-metric-icon purple"><Users size={18}/></span><small>New members</small><strong>{totals.members}</strong><em>Registrations in period</em></article>
    </section>
    <section className="report-two-col">
      <div className="panel report-panel"><div className="panel-heading"><div><div className="panel-title">Revenue vs expenses</div><p className="panel-subtitle">Daily financial activity for {periodLabel}</p></div></div>
        <div className="report-chart-legend"><span><i className="revenue-key"/> Revenue</span><span><i className="expense-key"/> Expenses</span></div>
        <div className="report-bars">{rows.map(r=><div className="report-bar-group" key={r.date}><div className="report-bar-pair"><div className="report-bar revenue-bar" style={{height:Math.max(3,r.income/max*100)+"%"}} title={"Revenue "+fmt(r.income)}/><div className="report-bar expense-bar-visual" style={{height:Math.max(3,r.expenses/max*100)+"%"}} title={"Expenses "+fmt(r.expenses)}/></div><small>{new Date(r.date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</small></div>)}</div>
        <div className="report-chart-foot"><span>Revenue <strong>{fmt(totals.income)}</strong></span><span>Expenses <strong>{fmt(totals.expenses)}</strong></span></div>
      </div>
      <div className="panel report-panel"><div className="panel-heading"><div><div className="panel-title">Operations snapshot</div><p className="panel-subtitle">Activity totals for selected period</p></div></div>
        <div className="report-operation-list"><div><span className="report-operation-icon"><ClipboardCheck size={16}/></span><span>Attendance check-ins</span><strong>{totals.attendance}</strong></div><div><span className="report-operation-icon"><CreditCard size={16}/></span><span>Payment transactions</span><strong>{totals.payments}</strong></div><div><span className="report-operation-icon"><Users size={16}/></span><span>New member registrations</span><strong>{totals.members}</strong></div></div>
        <div className="report-insight"><strong>Net result</strong><b>{fmt(profit)}</b><small>{totals.income>0?((profit/totals.income)*100).toFixed(1):"0.0"}% of recorded revenue</small></div>
      </div>
    </section>
    <section className="panel report-history"><div className="panel-heading"><div><div className="panel-title">Payment history</div><p className="panel-subtitle">Recent sample transactions · {periodLabel}</p></div><span className="report-history-count">{paymentHistory.length} records</span></div>
      <div className="table-scroll"><table className="members-table report-table"><thead><tr><th>RECEIPT</th><th>MEMBER</th><th>DATE</th><th>PLAN</th><th>METHOD</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>{paymentHistory.filter(p=>period==="All time" || (period==="This month"?p.date.includes("Nov"):p.date.includes("Oct"))).map(p=><tr key={p.receipt}><td className="report-receipt">{p.receipt}</td><td>{p.member}</td><td>{p.date}</td><td>{p.plan}</td><td>{p.method}</td><td className="amount-cell">{fmt(p.amount)}</td><td><span className={"status-badge "+(p.status==="Paid"?"status-active":"status-pending")}>{p.status}</span></td></tr>)}</tbody></table></div>
      <p className="directory-footnote">Figures are illustrative sample data, not live financial or operational records.</p>
    </section>
  </div>;
}
