"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, RefreshCw, Search, Users, Camera, Smartphone, CreditCard, ClipboardCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { openMemberProfile } from "../lib/member-navigation";

type AttendanceRow = {
  id: string; member_id: string; attendance_date: string; check_in: string;
  check_out: string | null; source: string; marked_by: string | null;
  members: { full_name: string; phone: string | null; photo_path: string | null } | null;
};
const todayKey = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const timeLabel = (v: string) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const methodLabel = (s: string) => ({ face: "Face verification", phone: "Phone number", nfc: "NFC card", qr: "QR code", manual: "Manual" }[s] ?? s);

export default function AttendancePage({ ownerId, isTrainer }: { ownerId: string; isTrainer: boolean }) {
  const [date, setDate] = useState(todayKey());
  const [rows, setRows] = useState<(AttendanceRow & { photo_url?: string | null })[]>([]);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAttendance = useCallback(async () => {
    setLoading(true); setError("");
    const { data, error: queryError } = await supabase.from("attendance")
      .select("id,member_id,attendance_date,check_in,check_out,source,marked_by,members(full_name,phone,photo_path)")
      .eq("owner_id", ownerId).eq("attendance_date", date).order("check_in", { ascending: false });
    if (queryError) { setError(queryError.message); setRows([]); }
    else {
      const list = (data ?? []) as unknown as AttendanceRow[];
      const photos = await Promise.all(list.map(async row => {
        if (!row.members?.photo_path) return { ...row, photo_url: null };
        const { data: signed } = await supabase.storage.from("member-photos").createSignedUrl(row.members.photo_path, 3600);
        return { ...row, photo_url: signed?.signedUrl ?? null };
      }));
      setRows(photos);
    }
    setLoading(false);
  }, [ownerId, date]);
  useEffect(() => { void loadAttendance(); }, [loadAttendance]);

  const filtered = useMemo(() => rows.filter(row => {
    const text = (row.members?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) || (row.members?.phone ?? "").includes(search);
    return text && (method === "all" || row.source === method);
  }), [rows, search, method]);
  const faceCount = rows.filter(r => r.source === "face").length;
  const phoneCount = rows.filter(r => r.source === "phone").length;
  const nfcCount = rows.filter(r => r.source === "nfc").length;
  const otherCount = rows.filter(r => !["face", "phone", "nfc"].includes(r.source)).length;

  return <div className="space-y-6 pb-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold tracking-[.15em] text-[#8a968e]">GYMDESK WORKSPACE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17211c]">Attendance</h1><p className="mt-2 text-sm text-[#7b887f]">Daily member check-ins and verification methods.</p></div>
      <button onClick={() => void loadAttendance()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#e3eae3] bg-white px-4 py-2.5 text-sm font-medium text-[#536158] hover:bg-[#f9fbf9] disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><div className="flex items-center justify-between text-sm text-[#7b887f]">Total check-ins <Users size={18} className="text-[#278348]"/></div><p className="mt-3 text-3xl font-semibold">{loading ? "—" : rows.length}</p><p className="mt-1 text-xs text-[#8a968e]">Selected date</p></div>
      <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><div className="flex items-center justify-between text-sm text-[#7b887f]">Face verification <Camera size={18} className="text-[#278348]"/></div><p className="mt-3 text-3xl font-semibold">{loading ? "—" : faceCount}</p><p className="mt-1 text-xs text-[#8a968e]">Face-based check-ins</p></div>
      <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><div className="flex items-center justify-between text-sm text-[#7b887f]">Phone fallback <Smartphone size={18} className="text-[#4c83bd]"/></div><p className="mt-3 text-3xl font-semibold">{loading ? "—" : phoneCount}</p><p className="mt-1 text-xs text-[#8a968e]">Phone-number check-ins</p></div>
      <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5"><div className="flex items-center justify-between text-sm text-[#7b887f]">NFC card <CreditCard size={18} className="text-[#8667bd]"/></div><p className="mt-3 text-3xl font-semibold">{loading ? "—" : nfcCount}</p><p className="mt-1 text-xs text-[#8a968e]">Entrance reader check-ins</p></div>
    </section>
    {error && <div role="alert" className="rounded-xl border border-[#f2d2ce] bg-[#fff4f2] px-4 py-3 text-sm text-[#a63d32]">Could not load attendance: {error}</div>}
    <section className="overflow-hidden rounded-2xl border border-[#e5ebe5] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ed] p-5"><div><h2 className="font-semibold text-[#26352b]">Attendance records</h2><p className="mt-1 text-xs text-[#8a968e]">{filtered.length} record{filtered.length===1?"":"s"} shown · {otherCount} manual/legacy</p></div><label className="inline-flex items-center gap-2 rounded-xl border border-[#e5ebe5] px-3 py-2 text-sm text-[#657269]"><CalendarDays size={16}/><input aria-label="Attendance date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="bg-transparent outline-none"/></label></div>
      <div className="flex flex-col gap-3 border-b border-[#edf1ed] p-4 sm:flex-row"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#e5ebe5] px-3"><Search size={16} className="text-[#8a968e]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search member name or phone" className="h-10 min-w-0 flex-1 text-sm outline-none"/></label><select value={method} onChange={e=>setMethod(e.target.value)} className="h-10 rounded-xl border border-[#e5ebe5] bg-white px-3 text-sm text-[#657269]"><option value="all">All methods</option><option value="face">Face verification</option><option value="phone">Phone number</option><option value="nfc">NFC card</option><option value="manual">Manual</option><option value="qr">QR code</option></select></div>
      {loading ? <div className="py-14 text-center text-sm text-[#8a968e]">Loading attendance…</div> : filtered.length===0 ? <div className="py-14 text-center"><ClipboardCheck size={28} className="mx-auto text-[#b4beb6]"/><p className="mt-3 text-sm font-medium text-[#536158]">No attendance records found</p><p className="mt-1 text-xs text-[#8a968e]">Try another date or clear the search filters.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-[#fafcfa] text-[10px] font-bold uppercase tracking-wider text-[#9aa49d]"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Check-in time</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Check-out</th></tr></thead><tbody className="divide-y divide-[#f0f3f0]">{filtered.map(row=><tr key={row.id} className="hover:bg-[#fbfdfb]"><td className="px-5 py-3"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8f5eb] text-xs font-semibold text-[#278348]">{row.photo_url?<img src={row.photo_url} alt="" className="h-full w-full object-cover"/>:(row.members?.full_name??"M").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><button onClick={()=>openMemberProfile(row.member_id)} className="text-left text-sm font-semibold text-[#344139] hover:text-[#278348] hover:underline">{row.members?.full_name??"Unknown member"}</button></div></td><td className="px-5 py-3 text-sm text-[#718077]">{row.members?.phone??"—"}</td><td className="px-5 py-3"><span className="inline-flex items-center gap-2 text-sm text-[#536158]"><Clock3 size={14} className="text-[#9aa49d]"/>{timeLabel(row.check_in)}</span></td><td className="px-5 py-3"><span className="inline-flex rounded-full bg-[#edf7ef] px-2.5 py-1 text-xs font-semibold text-[#278348]">{methodLabel(row.source)}</span></td><td className="px-5 py-3 text-sm text-[#718077]">{row.check_out?timeLabel(row.check_out):"—"}</td></tr>)}</tbody></table></div>}
    </section>
    <p className="text-xs text-[#9aa49d]">Attendance records are read-only here. {isTrainer ? "Contact the gym owner for corrections." : "Corrections remain owner-controlled and are handled separately."}</p>
  </div>;
}
