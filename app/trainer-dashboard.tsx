"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ClipboardCheck, LogOut, QrCode, RefreshCw, Search, Users } from "lucide-react";
import SignOutButton from "./sign-out-button";

type Member = { id: string; full_name: string; phone: string | null; status: string };
type Attendance = { id: string; member_id: string; attendance_date: string; check_in: string | null; check_out: string | null; source: string | null };

export default function TrainerDashboard({ ownerId }: { ownerId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = new Date().toLocaleDateString("en-CA");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [memberResult, attendanceResult] = await Promise.all([
      supabase.from("members").select("id,full_name,phone,status").eq("owner_id", ownerId).order("full_name"),
      supabase.from("attendance").select("id,member_id,attendance_date,check_in,check_out,source").eq("owner_id", ownerId).eq("attendance_date", today).order("check_in", { ascending: false })
    ]);
    if (memberResult.error || attendanceResult.error) setError(memberResult.error?.message || attendanceResult.error?.message || "Could not load gym data.");
    setMembers((memberResult.data || []) as Member[]);
    setAttendance((attendanceResult.data || []) as Attendance[]);
    setLoading(false);
  }, [ownerId, today]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => members.filter(m => (m.full_name + " " + (m.phone || "")).toLowerCase().includes(query.toLowerCase())), [members, query]);
  const checkedIn = attendance.filter(a => !a.check_out).length;

  async function qrCheckIn() {
    const entered = code.trim().replace(/^GYM-/i, "");
    if (!entered) return;
    setBusyId("qr"); setError("");
    const member = members.find(m => m.id.toLowerCase() === entered.toLowerCase() || m.id.replace(/-/g, "").slice(0, 8).toLowerCase() === entered.replace(/-/g, "").slice(0, 8).toLowerCase());
    if (!member) { setError("Member code not found. Enter the member UUID or GYM- code."); setBusyId(""); return; }
    const { error: rpcError } = await supabase.rpc("trainer_qr_check_in", { p_member_id: member.id });
    if (rpcError) setError(rpcError.message);
    else { setCode(""); await load(); }
    setBusyId("");
  }

  async function checkIn(member: Member) {
    setBusyId(member.id); setError("");
    const { error: insertError } = await supabase.from("attendance").insert({
      owner_id: ownerId, member_id: member.id, attendance_date: today,
      check_in: new Date().toISOString(), source: "manual"
    });
    if (insertError) setError(insertError.message);
    else await load();
    setBusyId("");
  }

  async function checkOut(row: Attendance) {
    setBusyId(row.id); setError("");
    const { error: updateError } = await supabase.from("attendance").update({ check_out: new Date().toISOString() }).eq("id", row.id).eq("owner_id", ownerId);
    if (updateError) setError(updateError.message);
    else await load();
    setBusyId("");
  }

  return <main className="min-h-screen bg-[#f7f9f7] px-4 py-6 text-[#17211c] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-7 flex items-center justify-between">
        <div><div className="text-xl font-bold">gym<span className="text-[#329653]">desk</span></div><p className="mt-1 text-xs font-semibold tracking-widest text-[#8a968e]">TRAINER WORKSPACE</p></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-[#e8f5eb] px-3 py-2 text-xs font-semibold text-[#278348]">Trainer account</span><SignOutButton /></div>
      </header>
      <div className="mb-6"><p className="text-sm text-[#7b887f]">Gym operations</p><h1 className="mt-1 text-3xl font-semibold">Trainer dashboard</h1><p className="mt-2 text-sm text-[#7b887f]">View all gym members and manage today's check-ins.</p></div>
      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><Users className="mb-3 text-[#329653]" size={20}/><p className="text-sm text-[#7b887f]">Total members</p><strong className="text-3xl">{members.length}</strong></div>
        <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><ClipboardCheck className="mb-3 text-[#329653]" size={20}/><p className="text-sm text-[#7b887f]">Today's check-ins</p><strong className="text-3xl">{attendance.length}</strong></div>
        <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><Users className="mb-3 text-[#329653]" size={20}/><p className="text-sm text-[#7b887f]">Currently inside</p><strong className="text-3xl">{checkedIn}</strong></div>
      </section>
      <section className="mb-6 rounded-2xl border border-[#e5ebe5] bg-white p-5">
        <div className="mb-3 flex items-center gap-2"><QrCode size={18}/><h2 className="font-semibold">Membership-verified check-in</h2></div>
        <p className="mb-3 text-sm text-[#7b887f]">Enter a member's GYM code or member UUID. This checks that their membership is currently active.</p>
        <div className="flex flex-col gap-2 sm:flex-row"><input value={code} onChange={e => setCode(e.target.value)} placeholder="GYM-XXXXXXXX or member UUID" className="h-11 min-w-0 flex-1 rounded-xl border border-[#dfe7df] px-3 text-sm outline-none focus:border-[#329653]"/><button onClick={() => void qrCheckIn()} disabled={busyId === "qr" || !code.trim()} className="rounded-xl bg-[#278348] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busyId === "qr" ? "Checking…" : "Verify & check in"}</button></div>
        <p className="mt-2 text-xs text-[#929d94]">Camera scanning is not enabled yet; code entry and manual check-in are available.</p>
      </section>
      {error && <p role="alert" className="mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e5ebe5] bg-white p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">All gym members</h2><p className="text-xs text-[#8a968e]">View-only member directory</p></div><button onClick={() => void load()} className="rounded-lg p-2 text-[#718077]" aria-label="Refresh"><RefreshCw size={16}/></button></div>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#e5ebe5] px-3"><Search size={16} className="text-[#8a968e]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or phone" className="h-10 min-w-0 flex-1 text-sm outline-none"/></div>
          <div className="max-h-[480px] divide-y divide-[#edf1ed] overflow-auto">
            {loading ? <p className="py-8 text-center text-sm text-[#8a968e]">Loading members…</p> : filtered.map(m => <div key={m.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{m.full_name}</p><p className="text-xs text-[#8a968e]">{m.phone || "No phone"} · {m.status}</p></div><button disabled={!!attendance.find(a => a.member_id === m.id) || busyId === m.id || m.status !== "active"} onClick={() => void checkIn(m)} className="shrink-0 rounded-lg border border-[#dce8dd] px-3 py-2 text-xs font-semibold text-[#278348] disabled:opacity-40">{attendance.find(a => a.member_id === m.id) ? "Recorded" : busyId === m.id ? "Saving…" : "Check in"}</button></div>)}
            {!loading && filtered.length === 0 && <p className="py-8 text-center text-sm text-[#8a968e]">No matching members.</p>}
          </div>
        </section>
        <section className="rounded-2xl border border-[#e5ebe5] bg-white p-5">
          <div className="mb-4"><h2 className="font-semibold">Today's attendance</h2><p className="text-xs text-[#8a968e]">{new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}</p></div>
          <div className="divide-y divide-[#edf1ed]">
            {attendance.map(a => { const member = members.find(m => m.id === a.member_id); return <div key={a.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{member?.full_name || "Gym member"}</p><p className="text-xs text-[#8a968e]">{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"} · {a.source || "manual"}</p></div>{a.check_out ? <span className="text-xs text-[#8a968e]">Checked out</span> : <button disabled={busyId === a.id} onClick={() => void checkOut(a)} className="rounded-lg border border-[#dce8dd] px-3 py-2 text-xs font-semibold text-[#278348]">Check out</button>}</div>; })}
            {!loading && attendance.length === 0 && <p className="py-8 text-center text-sm text-[#8a968e]">No check-ins recorded today.</p>}
          </div>
        </section>
      </div>
    </div>
  </main>;
}
