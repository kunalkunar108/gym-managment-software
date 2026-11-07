"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronRight, RefreshCw, Search, UserRoundPlus, Users, LayoutDashboard, Phone, Dumbbell, Clock3 } from "lucide-react";
import { supabase } from "../lib/supabase";
import SignOutButton from "./sign-out-button";
import AdmissionsPage from "./admissions-page";

type Member = { id: string; full_name: string; phone: string | null; status: string; joined_on: string; photo_path: string | null; photo_url?: string | null };
type ExpiringMembership = { id: string; member_id: string; end_date: string; status: string };
const dateLabel = (value: string) => new Date(value + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const initials = (name: string) => name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();

export default function TrainerDashboard({ ownerId }: { ownerId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [expiring, setExpiring] = useState<ExpiringMembership[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"overview" | "admissions" | "members">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    const [{ data: memberRows, error: memberError }, { data: expiryRows, error: expiryError }] = await Promise.all([
      supabase.from("members").select("id,full_name,phone,status,joined_on,photo_path").eq("owner_id", ownerId).order("created_at", { ascending: false }),
      supabase.rpc("trainer_list_expiring_memberships")
    ]);
    if (memberError) setError(memberError.message);
    else {
      const withPhotos = await Promise.all((memberRows ?? []).map(async (member: Member) => {
        if (!member.photo_path) return { ...member, photo_url: null };
        const { data: signed } = await supabase.storage.from("member-photos").createSignedUrl(member.photo_path, 3600);
        return { ...member, photo_url: signed?.signedUrl ?? null };
      }));
      setMembers(withPhotos);
    }
    if (expiryError) setError(prev => prev ? prev + " · " + expiryError.message : expiryError.message);
    setExpiring((expiryRows ?? []) as ExpiringMembership[]);
    setLoading(false);
  }

  useEffect(() => { void loadDashboard(); }, [ownerId]);

  const activeMembers = members.filter(member => member.status === "active").length;
  const newThisMonth = members.filter(member => {
    if (!member.joined_on) return false;
    const joined = new Date(member.joined_on + "T00:00:00");
    const now = new Date();
    return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
  }).length;
  const memberById = useMemo(() => new Map(members.map(member => [member.id, member])), [members]);
  const recentMembers = members.slice(0, 5);
  const filteredMembers = members.filter(member => (member.full_name + " " + (member.phone || "")).toLowerCase().includes(query.toLowerCase()));

  const navButton = (key: "overview" | "admissions" | "members", label: string, Icon: typeof Users) => (
    <button onClick={() => setView(key)} className={"flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition " + (view === key ? "bg-[#e8f5eb] text-[#278348]" : "text-[#718077] hover:bg-[#f3f6f3]")}>
      <Icon size={17} />{label}
    </button>
  );

  return <main className="min-h-screen bg-[#f7f9f7] px-4 py-5 text-[#17211c] sm:px-8 sm:py-7">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f5eb] text-[#278348]"><Dumbbell size={22}/></div>
          <div><div className="text-xl font-bold tracking-tight">gym<span className="text-[#329653]">desk</span></div><p className="mt-0.5 text-[10px] font-bold tracking-[.18em] text-[#8a968e]">TRAINER WORKSPACE</p></div>
        </div>
        <div className="flex items-center gap-3"><span className="rounded-full border border-[#dceee0] bg-white px-3 py-2 text-xs font-semibold text-[#278348]">Trainer account</span><SignOutButton /></div>
      </header>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[.14em] text-[#8a968e]">{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase()}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{view === "overview" ? "Trainer overview" : view === "admissions" ? "Admissions & renewals" : "Member directory"}</h1><p className="mt-2 text-sm text-[#7b887f]">Manage member activity, admissions and follow-ups.</p></div>
        <button onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 rounded-xl border border-[#e3eae3] bg-white px-4 py-2.5 text-sm font-medium text-[#536158] hover:bg-[#f9fbf9]"><RefreshCw size={15}/> Refresh data</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-[#e5ebe5] bg-white p-2">
        {navButton("overview", "Overview", LayoutDashboard)}
        {navButton("admissions", "Admissions & renewals", UserRoundPlus)}
        {navButton("members", "Members", Users)}
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-[#f2d2ce] bg-[#fff4f2] px-4 py-3 text-sm text-[#a63d32]">{error}</div>}

      {view === "admissions" ? <AdmissionsPage trainerMode /> : view === "overview" ? <>
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#7b887f]">Total members</span><span className="rounded-xl bg-[#edf5ff] p-2.5 text-[#4c83bd]"><Users size={19}/></span></div><p className="mt-4 text-3xl font-semibold">{loading ? "—" : members.length}</p><p className="mt-1 text-xs text-[#8a968e]">Registered member profiles</p></div>
          <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#7b887f]">Active members</span><span className="rounded-xl bg-[#e8f5eb] p-2.5 text-[#278348]"><Dumbbell size={19}/></span></div><p className="mt-4 text-3xl font-semibold">{loading ? "—" : activeMembers}</p><p className="mt-1 text-xs text-[#8a968e]">Currently marked active</p></div>
          <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#7b887f]">New this month</span><span className="rounded-xl bg-[#f4efff] p-2.5 text-[#8667bd]"><UserRoundPlus size={19}/></span></div><p className="mt-4 text-3xl font-semibold">{loading ? "—" : newThisMonth}</p><p className="mt-1 text-xs text-[#8a968e]">Joined during this month</p></div>
          <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#7b887f]">Expiring soon</span><span className="rounded-xl bg-[#fff4e5] p-2.5 text-[#bd812d]"><CalendarClock size={19}/></span></div><p className="mt-4 text-3xl font-semibold">{loading ? "—" : expiring.length}</p><p className="mt-1 text-xs text-[#8a968e]">Active memberships in next 7 days</p></div>
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-[#e5ebe5] bg-white">
            <div className="flex items-center justify-between border-b border-[#edf1ed] px-5 py-4"><div><h2 className="font-semibold">Recent admissions</h2><p className="mt-1 text-xs text-[#8a968e]">Latest members registered at your gym</p></div><button onClick={() => setView("members")} className="inline-flex items-center gap-1 text-xs font-semibold text-[#278348]">All members <ChevronRight size={14}/></button></div>
            {loading ? <p className="py-10 text-center text-sm text-[#8a968e]">Loading members…</p> : recentMembers.length ? <div className="divide-y divide-[#edf1ed]">{recentMembers.map(member => <div key={member.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8f5eb] text-xs font-semibold text-[#278348]">{member.photo_url ? <img src={member.photo_url} alt="" className="h-full w-full object-cover"/> : initials(member.full_name)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.full_name}</p><p className="mt-0.5 text-xs text-[#8a968e]">{member.joined_on ? "Joined " + dateLabel(member.joined_on) : "Join date unavailable"}</p></div></div><span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + (member.status === "active" ? "bg-[#e8f5eb] text-[#278348]" : "bg-[#f2f3f2] text-[#748078]")}>{member.status}</span></div>)}</div> : <p className="py-10 text-center text-sm text-[#8a968e]">No members registered yet.</p>}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e5ebe5] bg-white">
            <div className="flex items-center justify-between border-b border-[#edf1ed] px-5 py-4"><div><h2 className="font-semibold">Memberships expiring</h2><p className="mt-1 text-xs text-[#8a968e]">Active memberships ending within 7 days</p></div><span className="rounded-full bg-[#fff4e5] px-2.5 py-1 text-xs font-semibold text-[#b77925]">{loading ? "—" : expiring.length}</span></div>
            {loading ? <p className="py-10 text-center text-sm text-[#8a968e]">Loading expiry list…</p> : expiring.length ? <div className="divide-y divide-[#edf1ed]">{expiring.slice(0, 6).map(item => { const member = memberById.get(item.member_id); return <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div className="flex min-w-0 items-center gap-3"><CalendarClock size={18} className="shrink-0 text-[#bd812d]"/><div className="min-w-0"><p className="truncate text-sm font-semibold">{member?.full_name ?? "Member"}</p><p className="text-xs text-[#8a968e]">{member?.phone ?? "No phone number"}</p></div></div><span className="shrink-0 text-xs font-semibold text-[#b77925]">{item.end_date === new Date().toISOString().slice(0, 10) ? "Today" : dateLabel(item.end_date)}</span></div>; })}</div> : <p className="py-10 text-center text-sm text-[#8a968e]">No memberships expiring in the next 7 days.</p>}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => setView("admissions")} className="flex items-center justify-between rounded-2xl bg-[#278348] p-5 text-left text-white shadow-sm transition hover:bg-[#216f3d]"><span className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-3"><UserRoundPlus size={21}/></span><span><strong className="block text-sm">Create admission or renewal</strong><small className="mt-1 block text-xs text-white/75">Register a new or returning member</small></span></span><ChevronRight size={19}/></button>
          <button onClick={() => setView("members")} className="flex items-center justify-between rounded-2xl border border-[#e5ebe5] bg-white p-5 text-left transition hover:bg-[#fbfcfb]"><span className="flex items-center gap-3"><span className="rounded-xl bg-[#edf5ff] p-3 text-[#4c83bd]"><Users size={21}/></span><span><strong className="block text-sm">Find a member</strong><small className="mt-1 block text-xs text-[#8a968e]">Search member names and phone numbers</small></span></span><ChevronRight size={19} className="text-[#8a968e]"/></button>
        </section>
      </> : <section className="overflow-hidden rounded-2xl border border-[#e5ebe5] bg-white">
        <div className="border-b border-[#edf1ed] p-5"><h2 className="font-semibold">All gym members</h2><p className="mt-1 text-xs text-[#8a968e]">Search member records and contact details</p><div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e5ebe5] px-3"><Search size={16} className="text-[#8a968e]"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or phone number" className="h-11 min-w-0 flex-1 text-sm outline-none"/></div></div>
        {loading ? <p className="py-10 text-center text-sm text-[#8a968e]">Loading members…</p> : <div className="divide-y divide-[#edf1ed]">{filteredMembers.map(member => <div key={member.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8f5eb] text-xs font-semibold text-[#278348]">{member.photo_url ? <img src={member.photo_url} alt="" className="h-full w-full object-cover"/> : initials(member.full_name)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.full_name}</p><p className="text-xs text-[#8a968e]">{member.phone || "No phone number"} · {member.status}</p></div></div>{member.phone && <a href={"tel:" + member.phone} aria-label={"Call " + member.full_name} className="rounded-xl border border-[#dceee0] p-2.5 text-[#278348] hover:bg-[#e8f5eb]"><Phone size={17}/></a>}</div>)}{filteredMembers.length === 0 && <p className="py-10 text-center text-sm text-[#8a968e]">No matching members.</p>}</div>}
      </section>}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9aa49d]"><span>GymDesk · Trainer workspace</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#329653]"/> Member data synced</span></footer>
    </div>
  </main>;
}