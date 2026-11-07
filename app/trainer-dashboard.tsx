"use client";

import { useEffect, useState } from "react";
import { Search, Users, UserRoundPlus, RefreshCw, CalendarClock } from "lucide-react";
import { supabase } from "../lib/supabase";
import SignOutButton from "./sign-out-button";
import AdmissionsPage from "./admissions-page";

type Member = { id: string; full_name: string; phone: string | null; status: string; photo_path: string | null; photo_url?: string | null };
type ExpiringMembership = { id: string; member_id: string; end_date: string; status: string };
const dateLabel = (value: string) => new Date(value + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function TrainerDashboard({ ownerId }: { ownerId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"admissions" | "members">("admissions");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expiring, setExpiring] = useState<ExpiringMembership[]>([]);
  const [expiryLoading, setExpiryLoading] = useState(true);
  const [expiryError, setExpiryError] = useState("");

  async function loadExpiring() {
    setExpiryLoading(true); setExpiryError("");
    const [{ data, error: rpcError }, { data: memberRows }] = await Promise.all([
      supabase.rpc("trainer_list_expiring_memberships"),
      supabase.from("members").select("id,full_name,phone,status,photo_path").eq("owner_id", ownerId).order("full_name")
    ]);
    if (rpcError) setExpiryError(rpcError.message);
    setExpiring((data ?? []) as ExpiringMembership[]);
    if (memberRows) {\n      const withPhotos = await Promise.all(memberRows.map(async (member: Member) => {\n        if (!member.photo_path) return { ...member, photo_url: null };\n        const { data: signed } = await supabase.storage.from("member-photos").createSignedUrl(member.photo_path, 3600);\n        return { ...member, photo_url: signed?.signedUrl ?? null };\n      }));\n      setMembers(withPhotos);\n    }
    setExpiryLoading(false);
  }

  useEffect(() => { void loadExpiring(); }, []);

  async function loadMembers() {
    setLoading(true); setError("");
    const { data, error: queryError } = await supabase.from("members")
      .select("id,full_name,phone,status,photo_path").eq("owner_id", ownerId).order("full_name");
    if (queryError) setError(queryError.message);
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  }
  const filtered = members.filter(m => (m.full_name + " " + (m.phone || "")).toLowerCase().includes(query.toLowerCase()));

  return <main className="min-h-screen bg-[#f7f9f7] px-4 py-6 text-[#17211c] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-7 flex items-center justify-between">
        <div><div className="text-xl font-bold">gym<span className="text-[#329653]">desk</span></div><p className="mt-1 text-xs font-semibold tracking-widest text-[#8a968e]">TRAINER WORKSPACE</p></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-[#e8f5eb] px-3 py-2 text-xs font-semibold text-[#278348]">Trainer account</span><SignOutButton /></div>
      </header>
      <div className="mb-6"><p className="text-sm text-[#7b887f]">Gym reception</p><h1 className="mt-1 text-3xl font-semibold">Trainer dashboard</h1><p className="mt-2 text-sm text-[#7b887f]">Handle member admissions and enquiries. All payments remain owner-only.</p></div>
      <section className="mb-6 rounded-2xl border border-[#e5ebe5] bg-white p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Memberships expiring</h2><p className="text-xs text-[#8a968e]">Active memberships ending in the next 7 days</p></div><button onClick={() => void loadExpiring()} className="rounded-lg p-2 text-[#718077]" aria-label="Refresh expiring memberships"><RefreshCw size={16}/></button></div>
        {expiryError && <p role="alert" className="mb-3 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{expiryError}</p>}
        {expiryLoading ? <p className="py-5 text-center text-sm text-[#8a968e]">Loading expiring memberships…</p> : expiring.length === 0 ? <p className="py-5 text-center text-sm text-[#8a968e]">No memberships expiring in the next 7 days.</p> : <div className="divide-y divide-[#edf1ed]">{expiring.map(item => { const member = members.find(m => m.id === item.member_id); return <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><CalendarClock size={18} className="shrink-0 text-[#c18a35]"/><div className="min-w-0"><p className="truncate text-sm font-medium">{member?.full_name ?? "Member"}</p><p className="text-xs text-[#8a968e]">Active membership</p></div></div><span className="shrink-0 text-xs font-semibold text-[#b77925]">{item.end_date === new Date().toISOString().slice(0,10) ? "Expires today" : `Expires ${dateLabel(item.end_date)}`}</span></div>; })}</div>}
      </section>
      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <button onClick={() => setView("admissions")} className={`flex items-center gap-3 rounded-2xl border bg-white p-5 text-left ${view === "admissions" ? "border-[#329653] ring-1 ring-[#329653]" : "border-[#e5ebe5]"}`}>
          <UserRoundPlus className="text-[#329653]" size={22}/><span><strong className="block">Admissions & renewals</strong><small className="text-[#7b887f]">Register new or returning members</small></span>
        </button>
        <button onClick={() => { setView("members"); if (!members.length) void loadMembers(); }} className={`flex items-center gap-3 rounded-2xl border bg-white p-5 text-left ${view === "members" ? "border-[#329653] ring-1 ring-[#329653]" : "border-[#e5ebe5]"}`}>
          <Users className="text-[#329653]" size={22}/><span><strong className="block">Member directory</strong><small className="text-[#7b887f]">View all gym members</small></span>
        </button>
      </section>
      {view === "admissions" ? <AdmissionsPage trainerMode /> : <section className="rounded-2xl border border-[#e5ebe5] bg-white p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">All gym members</h2><p className="text-xs text-[#8a968e]">Member details are view-only</p></div><button onClick={() => void loadMembers()} className="rounded-lg p-2 text-[#718077]" aria-label="Refresh members"><RefreshCw size={16}/></button></div>
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#e5ebe5] px-3"><Search size={16} className="text-[#8a968e]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or phone" className="h-10 min-w-0 flex-1 text-sm outline-none"/></div>
        {error && <p role="alert" className="mb-3 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
        {loading ? <p className="py-8 text-center text-sm text-[#8a968e]">Loading members…</p> : <div className="max-h-[560px] divide-y divide-[#edf1ed] overflow-auto">{filtered.map(m => <div key={m.id} className="flex items-center justify-between gap-3 py-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8f5eb] text-sm font-semibold text-[#278348]">{m.photo_url ? <img src={m.photo_url} alt="" className="h-full w-full object-cover"/> : m.full_name.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</div><div><p className="text-sm font-medium">{m.full_name}</p><p className="text-xs text-[#8a968e]">{m.phone || "No phone"} · {m.status}</p></div></div></div>)}{filtered.length === 0 && <p className="py-8 text-center text-sm text-[#8a968e]">No matching members.</p>}</div>}
      </section>}
    </div>
  </main>;
}