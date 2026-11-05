"use client";

import { useMemo, useState } from "react";
import MembersPage from "./members-page";
import MembershipPlansPage from "./membership-plans-page";
import AttendancePage from "./attendance-page";
import PaymentsPage from "./payments-page";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, ChevronDown,
  ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, CreditCard, Dumbbell,
  LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings,
  ShieldCheck, Users, Wallet, X, Zap, Clock3, UserRoundPlus, QrCode,
  TrendingUp, CalendarClock, SlidersHorizontal, Download
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

type NavItem = { label: string; icon: React.ElementType; section?: string };

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, section: "WORKSPACE" },
  { label: "Members", icon: Users },
  { label: "Memberships", icon: CreditCard },
  { label: "Attendance", icon: ClipboardCheck },
  { label: "QR check-in", icon: QrCode },
  { label: "Payments", icon: Wallet, section: "FINANCE" },
  { label: "Expenses", icon: Activity },
  { label: "Reports", icon: TrendingUp },
  { label: "Staff", icon: ShieldCheck, section: "MANAGEMENT" },
  { label: "Settings", icon: Settings }
];

const revenueData = [
  { day: "01", income: 18000, expenses: 9000 },
  { day: "03", income: 24000, expenses: 12000 },
  { day: "05", income: 21000, expenses: 8000 },
  { day: "07", income: 31000, expenses: 14000 },
  { day: "09", income: 27000, expenses: 11000 },
  { day: "11", income: 39000, expenses: 15000 },
  { day: "13", income: 34000, expenses: 13000 },
  { day: "15", income: 46000, expenses: 17000 },
  { day: "17", income: 41000, expenses: 16000 },
  { day: "19", income: 52000, expenses: 19000 },
  { day: "21", income: 47000, expenses: 18000 },
  { day: "23", income: 61000, expenses: 21000 },
  { day: "25", income: 56000, expenses: 20000 },
  { day: "27", income: 69000, expenses: 24000 },
  { day: "29", income: 64000, expenses: 22000 },
  { day: "31", income: 76000, expenses: 26000 }
];

const members = [
  { name: "Aarav Sharma", initials: "AS", plan: "Quarterly", date: "Today, 09:42 AM", amount: "₹3,000", status: "Active", color: "mint" },
  { name: "Priya Kumari", initials: "PK", plan: "Monthly", date: "Today, 09:18 AM", amount: "₹1,200", status: "Active", color: "peach" },
  { name: "Rohan Das", initials: "RD", plan: "Annual", date: "Yesterday", amount: "₹10,000", status: "Active", color: "lavender" },
  { name: "Aditya Kumar", initials: "AK", plan: "Monthly", date: "Yesterday", amount: "₹1,200", status: "Pending", color: "blue" }
];

const checkins = [
  { name: "Vikash Kumar", initials: "VK", time: "07:42 AM", type: "QR scan" },
  { name: "Sneha Singh", initials: "SS", time: "07:38 AM", type: "Manual" },
  { name: "Rahul Raj", initials: "RR", time: "07:31 AM", type: "QR scan" },
  { name: "Anjali Kumari", initials: "AK", time: "07:24 AM", type: "QR scan" }
];

const expiries = [
  { name: "Saurabh Kumar", plan: "Monthly plan", days: "Expires today", tone: "red" },
  { name: "Neha Gupta", plan: "Quarterly plan", days: "In 2 days", tone: "amber" },
  { name: "Manish Yadav", plan: "Monthly plan", days: "In 4 days", tone: "amber" }
];

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function MetricCard({ title, value, change, note, icon: Icon, tone = "green", down = false }: {
  title: string; value: string; change: string; note: string; icon: React.ElementType; tone?: string; down?: boolean;
}) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="metric-label">{title}</p>
          <h3 className="metric-value">{value}</h3>
        </div>
        <div className={`metric-icon ${tone}`}><Icon size={19} strokeWidth={1.8} /></div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={down ? "trend-down" : "trend-up"}>
          {down ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          {change}
        </span>
        <span className="text-[#89948c]">{note}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [period, setPeriod] = useState("This month");
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickType, setQuickType] = useState("member");

  const filteredMembers = useMemo(
    () => members.filter((member) => member.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f7f9f7] text-[#17211c]">
      {mobileOpen && <button aria-label="Close menu" className="mobile-backdrop" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Dumbbell size={21} strokeWidth={2.2} /></div>
          <div><div className="brand-name">gym<span>desk</span></div><div className="brand-caption">MANAGEMENT STUDIO</div></div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="gym-switcher">
          <div className="gym-avatar"><Dumbbell size={18} /></div>
          <div className="min-w-0 flex-1"><p className="gym-name">Iron House Fitness</p><p className="gym-plan">Single gym workspace</p></div>
          <ChevronDown size={15} className="text-[#89948c]" />
        </div>

        <nav className="side-nav">
          {navItems.map((item, index) => (
            <div key={item.label}>
              {item.section && <p className={index === 0 ? "nav-section first" : "nav-section"}>{item.section}</p>}
              <button
                onClick={() => { setActive(item.label); setMobileOpen(false); }}
                className={`nav-link ${active === item.label ? "nav-active" : ""}`}
              >
                <item.icon size={18} strokeWidth={1.85} />
                <span>{item.label}</span>
                {item.label === "QR check-in" && <span className="nav-new">NEW</span>}
                {item.label === "Attendance" && <span className="nav-count">12</span>}
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <p className="text-sm font-semibold text-[#26352b]">Need a hand?</p>
            <p className="mt-1 text-xs leading-5 text-[#849087]">Get help setting up your gym workspace.</p>
            <button onClick={() => setActive("Help center")} className="help-link">Visit help center <ChevronRight size={13} /></button>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">AK</div>
            <div className="min-w-0 flex-1"><p className="profile-name">Alex Kumar</p><p className="profile-role">Gym owner</p></div>
            <button className="icon-button small" aria-label="Account menu"><MoreHorizontal size={18} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="date-chip"><CalendarDays size={15} /><span>{today}</span></div>
            <div className="relative">
              <button className="icon-button notification-button" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifications">
                <Bell size={18} /><i />
              </button>
              {showNotifications && <div className="notification-popover"><div className="flex items-center justify-between"><strong className="text-sm">Notifications</strong><span className="text-xs text-[#89948c]">2 new</span></div><div className="notice-item"><span className="notice-dot red-dot" /><div><p>3 memberships expire soon</p><small>Review renewals today</small></div></div><div className="notice-item"><span className="notice-dot green-dot" /><div><p>Daily collection updated</p><small>₹8,400 collected today</small></div></div></div>}
            </div>
            <div className="topbar-divider" />
            <div className="top-profile"><div className="profile-avatar">AK</div><ChevronDown size={14} className="text-[#89948c]" /></div>
          </div>
        </header>

        <div className="page-content">
          {active === "Members" ? <MembersPage /> : active === "Memberships" ? <MembershipPlansPage /> : active === "Attendance" ? <AttendancePage /> : active === "Payments" ? <PaymentsPage /> : <>
          <section className="welcome-row">
            <div><p className="eyebrow">THURSDAY, NOVEMBER 5, 2026</p><h1>Good morning, Alex <span>✦</span></h1><p className="welcome-subtitle">Here&apos;s what&apos;s happening at your gym today.</p></div>
            <div className="welcome-actions">
              <button className="button-secondary" onClick={() => setActive("Reports")}><Download size={16} /> Export report</button>
              <button className="button-primary" onClick={() => setShowQuickAdd(true)}><Plus size={17} /> Add new</button>
            </div>
          </section>

          <section className="metric-grid">
            <MetricCard title="Total members" value="248" change="+12.8%" note="vs. last month" icon={Users} tone="green" />
            <MetricCard title="Active members" value="216" change="+8.2%" note="vs. last month" icon={Dumbbell} tone="blue" />
            <MetricCard title="Collected this month" value="₹1,84,500" change="+14.5%" note="vs. last month" icon={Wallet} tone="purple" />
            <MetricCard title="Today's attendance" value="42" change="+6.4%" note="vs. yesterday" icon={ClipboardCheck} tone="orange" />
          </section>

          <section className="content-grid">
            <div className="panel revenue-panel">
              <div className="panel-heading">
                <div><div className="panel-title">Revenue overview</div><p className="panel-subtitle">Track your gym&apos;s financial performance</p></div>
                <div className="flex items-center gap-2"><div className="chart-legend"><span className="legend-dot income" /> Income <span className="legend-dot expenses-dot" /> Expenses</div><button className="select-button" onClick={() => setPeriod(period === "This month" ? "Last month" : "This month")}>{period}<ChevronDown size={14} /></button></div>
              </div>
              <div className="revenue-total"><strong>₹1,84,500</strong><span className="trend-up"><ArrowUpRight size={14} /> 14.5%</span><small>compared to previous month</small></div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#45a767" stopOpacity={0.17} /><stop offset="95%" stopColor="#45a767" stopOpacity={0} /></linearGradient>
                      <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e5aa69" stopOpacity={0.13} /><stop offset="95%" stopColor="#e5aa69" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf1ed" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9aa49d", fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9aa49d", fontSize: 11 }} tickFormatter={(v) => v === 0 ? "0" : `${v / 1000}k`} />
                    <Tooltip formatter={(value) => [`₹${formatINR(Number(value))}`, ""]} contentStyle={{ border: "1px solid #e9eee9", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 24px #17211c12" }} />
                    <Area type="monotone" dataKey="income" stroke="#329653" strokeWidth={2.5} fill="url(#incomeFill)" />
                    <Area type="monotone" dataKey="expenses" stroke="#e5aa69" strokeWidth={2} fill="url(#expenseFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel attendance-panel">
              <div className="panel-heading"><div><div className="panel-title">Attendance today</div><p className="panel-subtitle">Live check-in activity</p></div><button className="icon-button small" aria-label="More attendance options"><MoreHorizontal size={19} /></button></div>
              <div className="attendance-summary"><div className="attendance-number">42<span> / 216</span></div><span className="attendance-pill"><span /> Members present</span></div>
              <div className="attendance-progress"><div style={{ width: "19.4%" }} /></div>
              <div className="attendance-meta"><span>19.4% of active members</span><span>Peak: 7–9 AM</span></div>
              <div className="list-divider" />
              <div className="flex items-center justify-between mb-3"><p className="small-heading">Recent check-ins</p><button className="text-link" onClick={() => setActive("Attendance")}>View all</button></div>
              <div className="checkin-list">
                {checkins.map((person) => <div className="checkin-row" key={person.name}><div className="mini-avatar">{person.initials}</div><div className="min-w-0 flex-1"><p className="row-name">{person.name}</p><p className="row-muted">{person.type}</p></div><span className="checkin-time">{person.time}</span></div>)}
              </div>
              <button className="scan-button" onClick={() => setActive("QR check-in")}><QrCode size={16} /> Open QR scanner <ChevronRight size={15} /></button>
            </div>
          </section>

          <section className="lower-grid">
            <div className="panel members-panel">
              <div className="panel-heading"><div><div className="panel-title">Recent members</div><p className="panel-subtitle">Your latest member registrations</p></div><button className="text-link" onClick={() => setActive("Members")}>View all members <ChevronRight size={14} /></button></div>
              <div className="table-toolbar"><div className="table-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." /></div><button className="filter-button"><SlidersHorizontal size={15} /> Filter</button></div>
              <div className="table-scroll"><table className="members-table"><thead><tr><th>MEMBER</th><th>PLAN</th><th>JOINED</th><th>AMOUNT</th><th>STATUS</th><th /></tr></thead><tbody>
                {filteredMembers.map((member) => <tr key={member.name}><td><div className="member-cell"><div className={`member-avatar ${member.color}`}>{member.initials}</div><span>{member.name}</span></div></td><td>{member.plan}</td><td>{member.date}</td><td className="amount-cell">{member.amount}</td><td><span className={`status-badge ${member.status === "Active" ? "status-active" : "status-pending"}`}>{member.status}</span></td><td><button className="icon-button tiny" aria-label={`More options for ${member.name}`}><MoreHorizontal size={17} /></button></td></tr>)}
                {filteredMembers.length === 0 && <tr><td colSpan={6} className="empty-row">No members match your search.</td></tr>}
              </tbody></table></div>
            </div>

            <div className="panel expiry-panel">
              <div className="panel-heading"><div><div className="panel-title">Memberships expiring</div><p className="panel-subtitle">Members who need a renewal</p></div><span className="expiry-count">3</span></div>
              <div className="expiry-list">
                {expiries.map((item) => <div className="expiry-row" key={item.name}><div className={`expiry-icon ${item.tone}`}><CalendarClock size={17} /></div><div className="min-w-0 flex-1"><p className="row-name">{item.name}</p><p className="row-muted">{item.plan}</p></div><div className="text-right"><p className={`expiry-date ${item.tone}`}>{item.days}</p><button className="renew-link" onClick={() => setActive("Memberships")}>Renew</button></div></div>)}
              </div>
              <button className="view-expiry" onClick={() => setActive("Memberships")}>View all expiring memberships <ChevronRight size={14} /></button>
            </div>
          </section>

          <footer className="footer"><span>© 2026 GymDesk. Built for your gym.</span><span><span className="online-dot" /> All systems operational</span></footer>
        </>}
        </div>
      </main>

      {showQuickAdd && <div className="modal-backdrop" onClick={() => setShowQuickAdd(false)}><div className="quick-modal" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="eyebrow">QUICK ACTION</p><h2 className="text-xl font-semibold mt-1">What would you like to add?</h2></div><button className="icon-button" onClick={() => setShowQuickAdd(false)} aria-label="Close"><X size={18} /></button></div><div className="quick-options"><button onClick={() => { setQuickType("member"); setActive("Members"); setShowQuickAdd(false); }}><UserRoundPlus size={20} /><span><strong>New member</strong><small>Register a gym member</small></span><ChevronRight size={16} /></button><button onClick={() => { setQuickType("payment"); setActive("Payments"); setShowQuickAdd(false); }}><Wallet size={20} /><span><strong>Record payment</strong><small>Log a fee collection</small></span><ChevronRight size={16} /></button><button onClick={() => { setQuickType("attendance"); setActive("QR check-in"); setShowQuickAdd(false); }}><QrCode size={20} /><span><strong>QR check-in</strong><small>Open the attendance scanner</small></span><ChevronRight size={16} /></button></div></div></div>}
    </div>
  );
}