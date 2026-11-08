"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, RefreshCw, Camera, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";
import { openMemberProfile } from "../lib/member-navigation";

type Plan = { id: string; name: string; duration_months: number; price?: number; is_active?: boolean };
type Member = { id: string; full_name: string; phone: string; secondary_phone: string | null; gender: string | null; address: string | null; photo_path: string | null };
const today = () => new Date().toLocaleDateString("en-CA");
const addMonths = (date: string, months: number) => { const d = new Date(date + "T12:00:00"); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + months); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return d.toLocaleDateString("en-CA"); };
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
const initial = { memberId: "", fullName: "", phone: "", secondaryPhone: "", gender: "male", address: "", planId: "", startDate: today(), endDate: "", discount: "0", admissionFee: "0", method: "cash" };

export default function AdmissionsPage({ trainerMode = false, initialMemberId = null }: { trainerMode?: boolean; initialMemberId?: string | null }) {
  const [kind, setKind] = useState<"new" | "re">("new");
  const [form, setForm] = useState(initial);
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gymOwnerId, setGymOwnerId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedPlan = plans.find(p => p.id === form.planId);
  const baseAmount = Number(selectedPlan?.price ?? 0);
  const discount = Math.min(99.99, Math.max(0, Number(form.discount) || 0));
  const discountedPlanAmount = Math.max(0, Math.round((baseAmount * (1 - discount / 100) + Number.EPSILON) * 100) / 100);
  const admissionFee = Math.max(0, Number((Number(form.admissionFee) || 0).toFixed(2)));
  const total = discountedPlanAmount + admissionFee;
  const phoneMatches = useMemo(() => form.phone.trim().length >= 5 ? members.filter(m => m.phone.replace(/\D/g, "").includes(form.phone.replace(/\D/g, ""))) : [], [members, form.phone]);

  async function load() {
    setLoading(true); setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Your session has expired. Please log in again.");
      const { data: gymOwnerId, error: ownerError } = await supabase.rpc("current_gym_owner_id");
      if (ownerError) throw ownerError;
      if (!gymOwnerId) throw new Error("Your gym account could not be identified.");
      setGymOwnerId(gymOwnerId);
      const [m, p] = await Promise.all([
        supabase.from("members").select("id,full_name,phone,secondary_phone,gender,address,photo_path").eq("owner_id", gymOwnerId).order("full_name"),
        trainerMode
          ? supabase.rpc("trainer_list_membership_plans")
          : supabase.from("membership_plans").select("id,name,duration_months,price,is_active").eq("owner_id", gymOwnerId).eq("is_active", true).order("name")
      ]);
      if (m.error) throw m.error;
      if (p.error) throw p.error;
      setMembers((m.data ?? []) as Member[]);
      setPlans((p.data ?? []) as Plan[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load admission data."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (cameraOpen && videoRef.current && cameraStream.current) {
      videoRef.current.srcObject = cameraStream.current;
      void videoRef.current.play().catch(() => setCameraError("Could not start the camera preview."));
    }
  }, [cameraOpen]);
  useEffect(() => () => { cameraStream.current?.getTracks().forEach(track => track.stop()); }, []);

  async function startCamera() {
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is unavailable. Open GymDesk in a supported browser over HTTPS.");
      cameraStream.current?.getTracks().forEach(track => track.stop());
      cameraStream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCameraOpen(true);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Camera permission was denied or the camera is unavailable.");
    }
  }

  function closeCamera() {
    cameraStream.current?.getTracks().forEach(track => track.stop());
    cameraStream.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setCameraError("Wait for the camera preview, then take the photo."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setCameraError("Could not capture the photo. Try again."); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setCameraError("Could not create the photo. Try again."); return; }
      const file = new File([blob], "member-photo.jpg", { type: "image/jpeg" });
      setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); closeCamera();
    }, "image/jpeg", 0.88);
  }

  function changeKind(next: "new" | "re") {
    closeCamera(); setKind(next); setForm(initial); setPhotoFile(null); setPhotoPreview(null); setSuccess(""); setError("");
  }
  async function chooseMember(id: string) {
    const m = members.find(x => x.id === id);
    setForm(old => ({ ...old, memberId: id, fullName: m?.full_name ?? "", phone: m?.phone ?? "", secondaryPhone: m?.secondary_phone ?? "", gender: m?.gender ?? "male", address: m?.address ?? "" }));
    closeCamera(); setPhotoFile(null); setPhotoPreview(null);
    if (m?.photo_path) { const { data } = await supabase.storage.from("member-photos").createSignedUrl(m.photo_path, 3600); setPhotoPreview(data?.signedUrl ?? null); }
  }
  useEffect(() => {
    if (initialMemberId && members.some(member => member.id === initialMemberId)) {
      setKind("re");
      void chooseMember(initialMemberId);
    }
  }, [initialMemberId, members]);

  function choosePlan(id: string) {
    const p = plans.find(x => x.id === id);
    setForm(old => ({ ...old, planId: id, endDate: p ? addMonths(old.startDate, p.duration_months) : "" }));
  }
  function chooseStart(value: string) {
    setForm(old => ({ ...old, startDate: value, endDate: selectedPlan ? addMonths(value, selectedPlan.duration_months) : "" }));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!selectedPlan) { setError("Select an active membership plan."); return; }
    if (kind === "re" && !form.memberId) { setError("Select an existing member for re-admission."); return; }
    if (!form.endDate || form.endDate < form.startDate) { setError("Check the membership dates."); return; }
    if (Number(form.discount) < 0 || Number(form.discount) >= 100) { setError("Discount must be between 0 and 99.99%."); return; }
    setSaving(true);
    try {
      let admissionData: { member_id?: string; receipt_number?: string } | null = null;
      if (trainerMode) {
        const { data, error: rpcError } = await supabase.rpc("trainer_complete_admission", {
          p_admission_type: kind, p_member_id: kind === "re" ? form.memberId : null,
          p_full_name: form.fullName.trim(), p_phone: form.phone.trim(), p_gender: form.gender,
          p_address: form.address.trim() || null, p_secondary_phone: form.secondaryPhone.trim() || null,
          p_plan_id: form.planId, p_start_date: form.startDate, p_end_date: form.endDate,
          p_discount_percent: discount, p_admission_fee: admissionFee, p_suggested_payment_method: form.method
        });
        if (rpcError) throw rpcError;
        admissionData = data as { member_id?: string } | null;
      } else {
        const { data, error: rpcError } = await supabase.rpc("complete_admission", {
          p_admission_type: kind, p_member_id: kind === "re" ? form.memberId : null,
          p_full_name: form.fullName.trim(), p_phone: form.phone.trim(), p_gender: form.gender,
          p_address: form.address.trim() || null, p_secondary_phone: form.secondaryPhone.trim() || null,
          p_plan_id: form.planId, p_start_date: form.startDate, p_end_date: form.endDate,
          p_discount_percent: discount, p_admission_fee: Number(admissionFee.toFixed(2)), p_total_amount: Number(total.toFixed(2)),
          p_payment_method: form.method
        });
        if (rpcError) throw rpcError;
        admissionData = data as { member_id?: string; receipt_number?: string } | null;
      }

      let photoMessage = "";
      if (photoFile && admissionData?.member_id && gymOwnerId) {
        try {
          if (!["image/jpeg", "image/png", "image/webp"].includes(photoFile.type)) throw new Error("Use a JPEG, PNG, or WebP camera photo.");
          if (photoFile.size > 5 * 1024 * 1024) throw new Error("Photo must be 5 MB or smaller.");
          const extension = photoFile.type === "image/png" ? "png" : photoFile.type === "image/webp" ? "webp" : "jpg";
          const path = `${gymOwnerId}/${admissionData.member_id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage.from("member-photos").upload(path, photoFile, { contentType: photoFile.type, upsert: false });
          if (uploadError) throw uploadError;
          if (trainerMode) {
            const { error: savePathError } = await supabase.rpc("trainer_set_member_photo_path", { p_member_id: admissionData.member_id, p_photo_path: path });
            if (savePathError) throw savePathError;
          } else {
            const { error: savePathError } = await supabase.from("members").update({ photo_path: path }).eq("id", admissionData.member_id).eq("owner_id", gymOwnerId);
            if (savePathError) throw savePathError;
          }
        } catch (photoError) {
          photoMessage = ` Admission saved, but the photo could not be saved: ${photoError instanceof Error ? photoError.message : "Please try again."}`;
        }
      } else if (photoFile && !admissionData?.member_id) {
        photoMessage = " Admission saved, but no member ID was returned, so the photo was not saved.";
      }

      const receipt = admissionData?.receipt_number;
      const admissionMessage = trainerMode
        ? "Admission saved. The owner must review the suggested payment method and record any payment."
        : `Admission saved successfully. ${receipt ? "Receipt: " + receipt : "No payment receipt was created because the total payable is zero."}`;
      setSuccess(admissionMessage + photoMessage);
      setForm(initial); setKind("new"); setPhotoFile(null); setPhotoPreview(null); await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete admission.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="members-page">
    <div className="members-heading"><div><p className="eyebrow">GYM WORKSPACE / REGISTRATION</p><h1>Admissions</h1><p className="welcome-subtitle">{trainerMode ? "Register or renew members. All fees and payment records are handled by the gym owner." : "Register a new member or renew an existing member in one place."}</p></div><button className="button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    <div className="panel directory-panel max-w-4xl">
      <div className="p-5 border-b border-[#edf0ed]"><div className="flex flex-wrap gap-2"><button type="button" className={kind==="new"?"button-primary":"button-secondary"} onClick={() => changeKind("new")}>New admission</button><button type="button" className={kind==="re"?"button-primary":"button-secondary"} onClick={() => changeKind("re")}>Re-admission</button></div></div>
      <form className="p-5 space-y-6" onSubmit={submit}>
        <section className="space-y-3"><div><h2 className="panel-title">1. Member details</h2><p className="panel-subtitle">Basic identity and contact information.</p></div>
          {kind==="re" && <label className="block text-sm font-medium">Find existing member by mobile number or name<select className="mt-1 w-full" value={form.memberId} onChange={e=>chooseMember(e.target.value)} required><option value="">Select existing member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} — {m.phone}</option>)}</select>{form.memberId && <button type="button" onClick={()=>openMemberProfile(form.memberId)} className="mt-2 text-xs font-semibold text-[#278348] hover:underline">Open selected member profile</button>}</label>}
          <div className="member-form-grid">
            <label>Full name *<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Member full name"/></label>
            <label>Mobile number *<input required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Mobile number"/></label>
            <label>Gender *<select required value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
            <label>Secondary mobile number (optional)<input type="tel" value={form.secondaryPhone} onChange={e=>setForm({...form,secondaryPhone:e.target.value})} placeholder="Secondary mobile number"/></label>
            <label className="payment-note-field">Address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Member address"/></label>
          </div>
        </section>
        <section className="space-y-3 border-t border-[#edf0ed] pt-5"><div><h2 className="panel-title">Member photo</h2><p className="panel-subtitle">Take a photo using the device camera. It will be saved to this member’s profile for future identification.</p></div><div className="space-y-3"><div className="flex flex-wrap items-center gap-4"><div className="h-24 w-24 overflow-hidden rounded-xl bg-[#f0f4f0] flex items-center justify-center">{photoPreview ? <img src={photoPreview} alt="Member photo preview" className="h-full w-full object-cover"/> : <UserRound size={34} className="text-[#9aa79d]"/>}</div><div className="flex flex-wrap gap-2"><button type="button" className="button-secondary" onClick={()=>void startCamera()} disabled={cameraOpen}><Camera size={16}/> {photoPreview ? "Retake photo" : "Open camera"}</button>{photoFile && <span className="self-center text-xs text-[#66736a]">New photo ready to save</span>}</div></div>{cameraOpen && <div className="max-w-md space-y-3 rounded-xl border border-[#e5ebe5] p-3"><video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black aspect-video object-cover"/><div className="flex gap-2"><button type="button" className="button-primary" onClick={capturePhoto}><Camera size={15}/> Take photo</button><button type="button" className="button-secondary" onClick={closeCamera}>Cancel</button></div></div>}{cameraError && <p role="alert" className="text-sm text-[#b33b32]">{cameraError}</p>}</div></section>
        <section className="space-y-3 border-t border-[#edf0ed] pt-5"><div><h2 className="panel-title">2. Membership details</h2><p className="panel-subtitle">Choose a plan, dates, and applicable discount.</p></div>
          <div className="member-form-grid">
            <label>Membership plan *<select required value={form.planId} onChange={e=>choosePlan(e.target.value)}><option value="">Select plan</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}{" · " + money(Number(p.price))} / {p.duration_months} months</option>)}</select></label>
            <label>Start date *<input required type="date" value={form.startDate} onChange={e=>chooseStart(e.target.value)}/></label>
            <label>Duration / end date *<input required type="date" min={form.startDate} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label>
            <label>Discount (%)<input type="number" min="0" max="99.99" step="0.01" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})} placeholder="0"/></label>
          </div>
        </section>
        <section className="space-y-3 border-t border-[#edf0ed] pt-5"><div><h2 className="panel-title">3. Fees and payment suggestion</h2><p className="panel-subtitle">{trainerMode ? "Enter the proposed fees and payment method for the owner to review. No payment is recorded here." : "Add any one-time admission fee to the discounted membership amount."}</p></div>
                  <div className="member-form-grid">
                    <label>Admission fee (₹)<input type="number" min="0" step="0.01" value={form.admissionFee} onChange={e=>setForm({...form,admissionFee:e.target.value})} placeholder="0.00"/></label>
                    <label>Total amount (₹)<input readOnly value={total.toFixed(2)}/></label>
                    <label>Payment method *<select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select></label>
                  </div>
                  <div className="rounded-xl bg-[#f7f9f7] p-4 text-sm space-y-2"><div className="flex justify-between"><span>Plan price</span><strong>{money(baseAmount)}</strong></div><div className="flex justify-between"><span>Discount ({discount}%)</span><strong>− {money(baseAmount-discountedPlanAmount)}</strong></div><div className="flex justify-between"><span>Discounted membership</span><strong>{money(discountedPlanAmount)}</strong></div><div className="flex justify-between"><span>Admission fee</span><strong>{money(admissionFee)}</strong></div><div className="flex justify-between border-t border-[#e6ebe6] pt-2"><strong>Total payable</strong><strong>{money(total)}</strong></div></div>
                </section>
        {phoneMatches.length>0 && kind==="new" && <p className="rounded-xl bg-[#fff8e8] p-3 text-sm text-[#805b17]">A member with a similar mobile number may already exist: {phoneMatches.slice(0,3).map((m,i)=><span key={m.id}>{i>0 ? ", " : ""}<button type="button" onClick={()=>openMemberProfile(m.id)} className="font-semibold underline">{m.full_name}</button>{" ("+m.phone+")"}</span>)}. Switch to Re-admission if this is the same person.</p>}
        {error && <p role="alert" className="rounded-xl bg-[#fff0ef] p-3 text-sm text-[#b33b32]">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-[#edf8f0] p-3 text-sm text-[#246b3a]">{success}</p>}
        {plans.length===0 && !loading && <p className="text-sm text-[#9a5b16]">No active membership plans found. Create a plan in Membership Plans before recording an admission.</p>}
        <div className="flex justify-end border-t border-[#edf0ed] pt-4"><button type="submit" className="button-primary" disabled={saving || loading || plans.length===0}>{saving?<LoaderCircle size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} {saving?"Saving admission…":"Complete admission"}</button></div>
      </form>
    </div>
  </div>;
}
