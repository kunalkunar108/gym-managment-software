"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, LogIn, LogOut, Search, Users, UserCheck, UserX, LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type Member = { id: string; full_name: string; phone: string; status: string };
type Attendance = { id: string; member_id: string; attendance_date: string; check_in: string; check_out: string | null; source: "manual" | "qr" };
type Entry = { member: Member; attendance: Attendance | null };
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const time = (s: string | null) => s ? new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

export default function AttendancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [day, setDay] = useState(localDate());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadAttendance(selectedDay = day) {
    setLoading(true); setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Your session has expired. Please log in again.");
      setUserId(auth.user.id);
      const [memberResult, attendanceResult] = await Promise.all([
        supabase.from("members").select("id,full_name,phone,status").eq("owner_id", auth.user.id).eq("status", "active").order("full_name"),
        supabase.from("attendance").select("id,member_id,attendance_date,check_in,check_out,source").eq("owner_id", auth.user.id).eq("attendance_date", selectedDay)
      ]);
      if (memberResult.error) throw memberResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      setMembers((memberResult.data ?? []) as Member[]);
      setRecords((attendanceResult.data ?? []) as Attendance[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load attendance."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadAttendance(day); }, [day]);

  const entries: Entry[] = useMemo(() => members.map(member => ({ member, attendance: records.find(r => r.member_id === member.id) ?? null })), [members, records]);
  const present = entries.filter(e => !!e.attendance).length;
  const absent = entries.length - present;
  const filtered = useMemo(() => entries.filter(e => {
    const matchesText = e.member.full_name.toLowerCase().includes(search.toLowerCase()) || e.member.phone.includes(search);
    const status = e.attendance ? "Present" : "Absent";
    return matchesText && (filter === "All" || filter === status);
  }), [entries, search, filter]);

  async function markIn(memberId: string) {
    if (!userId) return;
    setWorking(memberId); setError("");
    const { data: existing, error: checkError } = await supabase.from("attendance").select("id").eq("owner_id", userId).eq("member_id", memberId).eq("attendance_date", day).maybeSingle();
    if (checkError) { setError(checkError.message); setWorking(null); return; }
    if (existing) { setError("This member already has a check-in for the selected date."); await loadAttendance(); setWorking(null); return; }
    const { error: insertError } = await supabase.from("attendance").insert({ owner_id: userId, member_id: memberId, attendance_date: day, check_in: new Date().toISOString(), source: "manual" });
    if (insertError) setError(insertError.message);
    else await loadAttendance();
    setWorking(null);
  }
  async function markOut(record: Attendance) {
    if (!userId || record.check_out) return;
    setWorking(record.member_id); setError("");
    const { error: updateError } = await supabase.from("attendance").update({ check_out: new Date().toISOString() }).eq("id", record.id).eq("owner_id", userId);
    if (updateError) setError(updateError.message);
    else await loadAttendance();
    setWorking(null);
  }

  return <div className="attendance-page">
    <div className="attendance-heading"><div><p className="eyebrow">GYM WORKSPACE</p><h1>Attendance</h1><p className="welcome-subtitle">Track daily member visits and check-in activity.</p></div><label className="attendance-date"><CalendarDays size={16}/><input aria-label="Attendance date" type="date" value={day} onChange={e=>setDay(e.target.value)}/></label></div>
    <div className="attendance-stats">
      <div className="attendance-stat"><span><Users size={17}/></span><small>Active members</small><strong>{entries.length}</strong></div>
      <div className="attendance-stat"><span className="stat-green"><UserCheck size={17}/></span><small>Present</small><strong>{present}</strong></div>
      <div className="attendance-stat"><span className="stat-orange"><UserX size={17}/></span><small>Not checked in</small><strong>{absent}</strong></div>
      <div className="attendance-stat"><span className="stat-blue"><Clock3 size={17}/></span><small>Attendance rate</small><strong>{entries.length?Math.round(present/entries.length*100):0}%</strong></div>
    </div>
    <div className="panel attendance-directory">
      <div className="panel-heading"><div><div className="panel-title">Attendance log</div><p className="panel-subtitle">{new Date(day+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · Check-ins and check-outs</p></div><span className="attendance-live"><i/> Database synced</span></div>
      <div className="attendance-toolbar"><div className="table-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or phone number..."/></div><select className="attendance-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Present</option><option>Absent</option></select></div>
      {error && <p role="alert" className="mx-5 mb-3 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      <div className="table-scroll"><table className="members-table attendance-table"><thead><tr><th>MEMBER</th><th>PHONE</th><th>CHECK IN</th><th>CHECK OUT</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6} className="empty-row"><LoaderCircle size={16} className="inline animate-spin mr-2"/>Loading attendance…</td></tr> : filtered.map(e => {
          const record = e.attendance;
          return <tr key={e.member.id}><td><div className="member-cell"><div className="member-avatar mint">{e.member.full_name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><span>{e.member.full_name}</span></div></td><td>{e.member.phone}</td><td>{time(record?.check_in ?? null)}</td><td>{time(record?.check_out ?? null)}</td><td><span className={`status-badge ${record?"status-active":"status-expired"}`}>{record?"Present":"Absent"}</span></td><td><div className="attendance-actions">{!record ? <button disabled={working===e.member.id || day!==localDate()} onClick={()=>void markIn(e.member.id)}>{working===e.member.id?<LoaderCircle size={13} className="animate-spin"/>:<LogIn size={13}/>} Check in</button> : <button disabled={!!record.check_out || working===e.member.id || day!==localDate()} onClick={()=>void markOut(record)}>{working===e.member.id?<LoaderCircle size={13} className="animate-spin"/>:<LogOut size={13}/>} {record.check_out?"Checked out":"Check out"}</button>}</div></td></tr>;
        })}
        {!loading && filtered.length===0 && <tr><td colSpan={6} className="empty-row">{members.length===0?"No active members found. Add members first.":"No members match this search or filter."}</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between px-5 py-3"><p className="attendance-note"><Check size={13}/> Attendance is saved to your GymDesk database.</p><button className="text-link flex items-center gap-1" onClick={()=>void loadAttendance()}><RefreshCw size={13}/> Refresh</button></div>
    </div>
  </div>;
}
