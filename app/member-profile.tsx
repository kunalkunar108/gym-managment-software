"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Phone, Mail, MapPin, CalendarDays, Camera, Plus, Trash2, Pencil, Check, X, LoaderCircle, NotebookPen } from "lucide-react";
import { supabase } from "../lib/supabase";

type Props = { memberId: string; ownerId: string; isTrainer: boolean; onBack: () => void };
type Note = { id: string; note: string; author_name: string; author_role: string; created_at: string };
type Membership = { id: string; plan_name: string | null; start_date: string; end_date: string; status: string; amount?: number };
type PaymentRecord = { id: string; receipt_number: string; amount: number; paid_on: string; method: string; status: string; reference: string | null };
type FaceConsent = { consent_status: string; consent_version: string | null; consented_at: string | null; withdrawn_at: string | null; has_template: boolean };
const FACE_CONSENT_VERSION = "gymdesk-face-consent-v1";
const prettyDate = (value: string) => value ? new Date(value + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function MemberProfile({ memberId, ownerId, isTrainer, onBack }: Props) {
  const [member, setMember] = useState<any>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [noteText, setNoteText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [faceConsent, setFaceConsent] = useState<FaceConsent | null>(null);

  async function loadProfile() {
    setLoading(true); setError("");
    const [memberResult, noteResult, faceConsentResult] = await Promise.all([
      supabase.from("members").select("id,full_name,phone,secondary_phone,email,gender,address,joined_on,status,photo_path").eq("id", memberId).eq("owner_id", ownerId).single(),
      supabase.from("member_notes").select("id,note,author_name,author_role,created_at").eq("member_id", memberId).eq("owner_id", ownerId).order("created_at", { ascending: false }),
      supabase.rpc("get_member_face_consent_status", { p_member_id: memberId })
    ]);
    if (!faceConsentResult.error && faceConsentResult.data?.[0]) setFaceConsent(faceConsentResult.data[0] as FaceConsent);
    else if (faceConsentResult.error) setError(faceConsentResult.error.message);
    if (memberResult.error) setError(memberResult.error.message);
    else {
      setMember(memberResult.data);
      if (memberResult.data.photo_path) {
        const { data } = await supabase.storage.from("member-photos").createSignedUrl(memberResult.data.photo_path, 3600);
        setPhotoUrl(data?.signedUrl ?? null);
      } else setPhotoUrl(null);
    }
    if (noteResult.error) setError(prev => prev ? prev + " · " + noteResult.error.message : noteResult.error.message);
    else setNotes((noteResult.data ?? []) as Note[]);
    const membershipResult = isTrainer
      ? await supabase.rpc("trainer_list_member_memberships", { p_member_id: memberId })
      : await supabase.from("memberships").select("id,start_date,end_date,status,amount,membership_plans(name)").eq("member_id", memberId).eq("owner_id", ownerId).order("start_date", { ascending: false });
    if (membershipResult.error) setError(prev => prev ? prev + " · " + membershipResult.error.message : membershipResult.error.message);
    else {
      const rows = (membershipResult.data ?? []) as any[];
      setMemberships(rows.map(row => ({ id: row.id, plan_name: row.plan_name ?? row.membership_plans?.name ?? null, start_date: row.start_date, end_date: row.end_date, status: row.status, ...(typeof row.amount === "number" ? { amount: row.amount } : {}) })));
    }
    setLoading(false);
  }

  useEffect(() => { void loadProfile(); }, [memberId, ownerId, isTrainer]);

  async function updateFaceConsent(action: "granted" | "withdrawn") {
    const message = action === "granted"
      ? "Only continue if the member is physically present, has read the face-verification notice below, and has personally agreed. This records their in-person consent. Continue?"
      : "Withdraw face-verification consent? This disables face verification and deletes the stored encrypted face template. The consent audit record is retained. Continue?";
    if (!window.confirm(message)) return;
    setSaving(true); setError("");
    const { error: consentError } = await supabase.rpc("record_member_face_consent", {
      p_member_id: memberId,
      p_action: action,
      p_consent_version: FACE_CONSENT_VERSION
    });
    if (consentError) setError(consentError.message);
    else await loadProfile();
    setSaving(false);
  }

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteText.trim()) return;
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("member_notes").insert({ member_id: memberId, note: noteText.trim() });
    if (insertError) setError(insertError.message);
    else { setNoteText(""); await loadProfile(); }
    setSaving(false);
  }

  async function saveEdit(noteId: string) {
    if (!editingText.trim()) return;
    setSaving(true); setError("");
    const { error: updateError } = await supabase.from("member_notes").update({ note: editingText.trim() }).eq("id", noteId).eq("member_id", memberId);
    if (updateError) setError(updateError.message);
    else { setEditingId(null); setEditingText(""); await loadProfile(); }
    setSaving(false);
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm("Delete this member note?")) return;
    setSaving(true); setError("");
    const { error: deleteError } = await supabase.from("member_notes").delete().eq("id", noteId).eq("member_id", memberId);
    if (deleteError) setError(deleteError.message);
    else await loadProfile();
    setSaving(false);
  }

  if (loading && !member) return <div className="py-16 text-center text-sm text-[#829087]"><LoaderCircle className="mr-2 inline animate-spin" size={16}/>Loading member profile…</div>;
  if (!member) return <div className="rounded-2xl border border-[#e5ebe5] bg-white p-6"><p className="text-sm text-[#a63d32]">{error || "Member profile could not be loaded."}</p><button className="mt-4 text-sm font-semibold text-[#278348]" onClick={onBack}>Go back</button></div>;

  const latest = memberships[0];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[#617067] hover:text-[#278348]"><ArrowLeft size={17}/> Back to members</button>
      <span className="rounded-full bg-[#edf7ef] px-3 py-1.5 text-xs font-semibold capitalize text-[#278348]">{member.status} member</span>
    </div>
    <section className="rounded-2xl border border-[#e5ebe5] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#e8f5eb] text-xl font-bold text-[#278348]">{photoUrl ? <img src={photoUrl} alt={member.full_name} className="h-full w-full object-cover"/> : member.full_name.split(" ").map((part: string) => part[0]).slice(0,2).join("").toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold tracking-[.14em] text-[#91a097]">MEMBER PROFILE</p><h1 className="mt-1 text-2xl font-semibold text-[#1d2a21]">{member.full_name}</h1><p className="mt-1 text-sm text-[#849087]">Member since {prettyDate(member.joined_on)}</p></div>
        {member.phone && <a href={"tel:" + member.phone} className="inline-flex items-center gap-2 rounded-xl bg-[#278348] px-4 py-3 text-sm font-semibold text-white"><Phone size={16}/> Call member</a>}
      </div>
      <div className="mt-6 grid gap-4 border-t border-[#edf1ed] pt-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-3 text-sm text-[#56645a]"><Phone size={16} className="text-[#278348]"/><span>{member.phone || "No phone number"}</span></div>
        <div className="flex items-center gap-3 text-sm text-[#56645a]"><Mail size={16} className="text-[#278348]"/><span>{member.email || "No email recorded"}</span></div>
        <div className="flex items-center gap-3 text-sm text-[#56645a]"><CalendarDays size={16} className="text-[#278348]"/><span>{member.gender ? String(member.gender).replaceAll("_"," ") : "Gender not recorded"}</span></div>
        <div className="flex items-center gap-3 text-sm text-[#56645a]"><Phone size={16} className="text-[#278348]"/><span>{member.secondary_phone || "No alternate phone"}</span></div>
        <div className="flex items-start gap-3 text-sm text-[#56645a] sm:col-span-2"><MapPin size={16} className="mt-0.5 shrink-0 text-[#278348]"/><span>{member.address || "No address recorded"}</span></div>
      </div>
    </section>

    <section className="rounded-2xl border border-[#e5ebe5] bg-white p-5">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-[#27352b]">Membership history</h2><p className="mt-1 text-xs text-[#8a968e]">Current and previous membership periods</p></div><span className="rounded-full bg-[#f2f5f2] px-2.5 py-1 text-xs text-[#68766d]">{memberships.length} records</span></div>
      {memberships.length ? <div className="divide-y divide-[#edf1ed]">{memberships.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#3d4b41]">{item.plan_name || "Custom membership"}</p><p className="mt-1 text-xs text-[#89948c]">{prettyDate(item.start_date)} – {prettyDate(item.end_date)}</p></div><div className="text-right"><span className="rounded-full bg-[#f1f5f1] px-2.5 py-1 text-xs capitalize text-[#637168]">{item.status}</span>{!isTrainer && item.amount !== undefined && <p className="mt-1 text-xs font-semibold text-[#536158]">₹{Number(item.amount).toLocaleString("en-IN")}</p>}</div></div>)}</div> : <p className="py-5 text-sm text-[#8a968e]">No membership history recorded.</p>}
      {latest && <p className="mt-3 border-t border-[#edf1ed] pt-3 text-xs text-[#89948c]">Latest membership ends {prettyDate(latest.end_date)}.</p>}
    </section>

    <section className="rounded-2xl border border-[#e5ebe5] bg-white p-5">
      <div className="mb-4 flex items-center gap-2"><NotebookPen size={18} className="text-[#278348]"/><div><h2 className="font-semibold text-[#27352b]">Internal member notes</h2><p className="mt-1 text-xs text-[#8a968e]">Visible to the gym owner and active trainers only</p></div></div>
      <form onSubmit={addNote} className="mb-5"><label className="mb-2 block text-xs font-semibold text-[#68766d]">Add a note</label><textarea value={noteText} onChange={e=>setNoteText(e.target.value)} maxLength={2000} rows={3} placeholder="Add a follow-up, preference or important member detail…" className="w-full rounded-xl border border-[#e3eae3] p-3 text-sm outline-none focus:border-[#75b889]" /><div className="mt-2 flex justify-end"><button type="submit" disabled={saving || !noteText.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#278348] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15}/>{saving ? "Saving…" : "Add note"}</button></div></form>
      {error && <p role="alert" className="mb-3 rounded-lg bg-[#fff3f1] p-3 text-xs text-[#a63d32]">{error}</p>}
      {notes.length ? <div className="space-y-3">{notes.map(note => <article key={note.id} className="rounded-xl border border-[#edf1ed] bg-[#fbfcfb] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-sm font-semibold text-[#3d4b41]">{note.author_name}</span><span className="ml-2 rounded-full bg-[#edf5ef] px-2 py-0.5 text-[10px] font-semibold capitalize text-[#4d805b]">{note.author_role}</span><p className="mt-1 text-[11px] text-[#96a098]">{new Date(note.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div>{!isTrainer && <div className="flex gap-1"><button type="button" title="Edit note" onClick={()=>{setEditingId(note.id);setEditingText(note.note);}} className="rounded-lg p-2 text-[#728077] hover:bg-[#edf5ef]"><Pencil size={14}/></button><button type="button" title="Delete note" onClick={()=>void deleteNote(note.id)} className="rounded-lg p-2 text-[#b45b4e] hover:bg-[#fff0ee]"><Trash2 size={14}/></button></div>}</div>{editingId===note.id ? <div className="mt-3"><textarea value={editingText} onChange={e=>setEditingText(e.target.value)} rows={3} maxLength={2000} className="w-full rounded-lg border border-[#e3eae3] p-3 text-sm"/><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={()=>setEditingId(null)} className="rounded-lg border px-3 py-2 text-xs"><X size={13}/></button><button type="button" onClick={()=>void saveEdit(note.id)} className="rounded-lg bg-[#278348] px-3 py-2 text-xs text-white"><Check size={13}/></button></div></div> : <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#59665d]">{note.note}</p>}</article>)}</div> : <p className="rounded-xl bg-[#f7f9f7] px-4 py-6 text-center text-sm text-[#8a968e]">No notes yet. Add the first internal note for this member.</p>}
    </section>
    {error && !notes.length && <p role="alert" className="text-sm text-[#a63d32]">{error}</p>}
  </div>;
}
