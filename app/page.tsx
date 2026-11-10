"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import TrainerDashboard from "./trainer-dashboard";
import MembersPage from "./members-page";
import AdmissionsPage from "./admissions-page";
import OverviewPage from "./overview-page";
import MembershipPlansPage from "./membership-plans-page";
import PaymentsPage from "./payments-page";
import ExpensesPage from "./expenses-page";
import ReportsPage from "./reports-page";
import StaffPage from "./staff-page";
import SettingsPage from "./settings-page";
import SignOutButton from "./sign-out-button";
import MemberProfile from "./member-profile";
import MembershipManagementPage from "./membership-management-page";
import AttendancePage from "./attendance-page";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, CalendarCheck, ChevronDown,
  ChevronLeft, ChevronRight, CreditCard, Dumbbell,
  LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings,
  ShieldCheck, Users, Wallet, X, Zap, Clock3, UserRoundPlus,
  TrendingUp, CalendarClock, SlidersHorizontal, Download
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

type NavItem = { label: string; icon: React.ElementType; section?: string };

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, section: "WORKSPACE" },
  { label: "Admissions", icon: UserRoundPlus },
  { label: "Members", icon: Users },
  { label: "Membership Plans", icon: CalendarClock },
  { label: "Membership Management", icon: Clock3 },
  { label: "Attendance", icon: CalendarCheck },
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
  const [trainerOwnerId, setTrainerOwnerId] = useState<string | null>(null);
  const [gymOwnerId, setGymOwnerId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [renewalMemberId, setRenewalMemberId] = useState<string | null>(null);
  const [accountBlocked, setAccountBlocked] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
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

  useEffect(() => {
    let alive = true;
    async function resolveAccount() {
      const { data: ownerId, error: ownerError } = await supabase.rpc("current_gym_owner_id");
      if (!alive) return;
      // Before the owner/trainer migration is activated, preserve the existing owner experience.
      if (ownerError) { setRoleLoading(false); return; }
      if (!ownerId) {
        setAccountBlocked(true);
        setRoleLoading(false);
        return;
      }
      setGymOwnerId(ownerId as string);
      const { data: isOwner, error: roleError } = await supabase.rpc("is_gym_owner");
      if (!alive) return;
      if (!roleError && isOwner === false) setTrainerOwnerId(ownerId as string);
      setRoleLoading(false);
    }
    void resolveAccount();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const handleOpenMember = (event: Event) => {
      const memberId = (event as CustomEvent<{ memberId?: string }>).detail?.memberId;
      if (memberId && !trainerOwnerId) setSelectedMemberId(memberId);
    };
    window.addEventListener("gymdesk:open-member-profile", handleOpenMember);
    return () => window.removeEventListener("gymdesk:open-member-profile", handleOpenMember);
  }, [trainerOwnerId]);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f7f9f7] text-[#637168]">Loading your GymDesk workspace…</div>;
  if (accountBlocked) return <div className="min-h-screen flex items-center justify-center bg-[#f7f9f7] p-6"><div className="max-w-md rounded-2xl border border-[#e5ebe5] bg-white p-7 text-center"><h1 className="text-xl font-semibold">Account access unavailable</h1><p className="mt-2 text-sm text-[#7b887f]">This trainer account is inactive or is not linked to a gym. Contact your gym owner.</p><div className="mt-5 flex justify-center"><SignOutButton /></div></div></div>;
  if (trainerOwnerId) return <TrainerDashboard ownerId={trainerOwnerId} />;

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
          <div className="min-w-0 flex-1"><p className="gym-name">My Gym</p><p className="gym-plan">Single gym workspace</p></div>
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
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-row">
            <div className="profile-avatar">GO</div>
            <div className="min-w-0 flex-1"><p className="profile-name">Gym owner</p><p className="profile-role">Gym owner</p></div>
            <SignOutButton />
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
              {showNotifications && <div className="notification-popover"><strong className="text-sm">Notifications</strong><p className="mt-3 text-xs text-[#89948c]">No new notifications.</p></div>}
            </div>
            <div className="topbar-divider" />
            <div className="top-profile"><div className="profile-avatar">GO</div><ChevronDown size={14} className="text-[#89948c]" /></div>
          </div>
        </header>

        <div className="page-content">
          {selectedMemberId && gymOwnerId ? <MemberProfile memberId={selectedMemberId} ownerId={gymOwnerId} isTrainer={false} onBack={() => setSelectedMemberId(null)} /> : active === "Admissions" ? <AdmissionsPage initialMemberId={renewalMemberId} /> : active === "Members" ? <MembersPage onAddMember={() => setActive("Admissions")} /> : active === "Membership Plans" ? <MembershipPlansPage /> : active === "Attendance" && gymOwnerId ? <AttendancePage ownerId={gymOwnerId} isTrainer={false} /> : active === "Membership Management" && gymOwnerId ? <MembershipManagementPage ownerId={gymOwnerId} isTrainer={false} onRenew={(memberId) => { setRenewalMemberId(memberId); setActive("Admissions"); }} /> : active === "Payments" ? <PaymentsPage /> : active === "Expenses" ? <ExpensesPage /> : active === "Reports" ? <ReportsPage /> : active === "Staff" ? <StaffPage /> : active === "Settings" ? <SettingsPage /> : <OverviewPage onNavigate={setActive} />}
        </div>
      </main>

      {showQuickAdd && <div className="modal-backdrop" onClick={() => setShowQuickAdd(false)}><div className="quick-modal" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="eyebrow">QUICK ACTION</p><h2 className="text-xl font-semibold mt-1">What would you like to add?</h2></div><button className="icon-button" onClick={() => setShowQuickAdd(false)} aria-label="Close"><X size={18} /></button></div><div className="quick-options"><button onClick={() => { setQuickType("member"); setActive("Admissions"); setShowQuickAdd(false); }}><UserRoundPlus size={20} /><span><strong>New admission</strong><small>Register or re-admit a member</small></span><ChevronRight size={16} /></button><button onClick={() => { setQuickType("payment"); setActive("Payments"); setShowQuickAdd(false); }}><Wallet size={20} /><span><strong>Record payment</strong><small>Log a fee collection</small></span><ChevronRight size={16} /></button></div></div></div>}
    </div>
  );
}