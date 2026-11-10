"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Dumbbell, LoaderCircle, ShieldAlert } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function MemberCheckInPage() {
  const params = useParams<{ ownerId: string }>();
  const ownerId = params.ownerId;
  const [phone, setPhone] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"checked_in" | "already_checked_in" | "not_eligible" | "error" | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setResult(null); setLoading(true);
    try {
      const { data, error } = await supabase.rpc("member_qr_check_in", { p_owner_id: ownerId, p_phone: phone.trim() });
      if (error) throw error;
      setResult(data === "checked_in" || data === "already_checked_in" || data === "not_eligible" ? data : "error");
    } catch { setResult("error"); } finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] p-4 text-[#17211c]"><section className="w-full max-w-md rounded-3xl border border-[#e3ebe3] bg-white p-7 shadow-sm">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f5eb] text-[#278348]"><Dumbbell size={25}/></div>
    <p className="mt-5 text-center text-xs font-bold tracking-[.16em] text-[#8a968e]">GYMDESK MEMBER CHECK-IN</p>
    <h1 className="mt-2 text-center text-2xl font-semibold">Welcome to the gym</h1>
    <p className="mt-2 text-center text-sm leading-6 text-[#718077]">Face verification is being prepared. For now, continue with your registered mobile number.</p>
    {!showPhone ? <button onClick={() => setShowPhone(true)} className="mt-7 w-full rounded-xl bg-[#278348] px-4 py-3.5 text-sm font-semibold text-white hover:bg-[#206d3c]">Continue with phone number</button> : <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-medium text-[#344139]">Registered mobile number<input required type="tel" inputMode="tel" autoComplete="tel" minLength={10} maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Enter your registered number" className="mt-2 h-12 w-full rounded-xl border border-[#dfe7df] px-4 text-base outline-none focus:border-[#278348]"/></label>
      <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#278348] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60">{loading && <LoaderCircle size={16} className="animate-spin"/ >}{loading ? "Checking membership…" : "Mark my attendance"}</button>
    </form>}
    {result === "checked_in" && <div role="status" className="mt-5 rounded-xl border border-[#cfe8d4] bg-[#f0faf2] p-4 text-center"><CheckCircle2 className="mx-auto text-[#278348]" size={24}/><p className="mt-2 font-semibold text-[#216b38]">Attendance marked successfully</p><p className="mt-1 text-xs text-[#5e7664]">Your check-in has been recorded for today.</p></div>}
    {result === "already_checked_in" && <div role="status" className="mt-5 rounded-xl border border-[#dce9dd] bg-[#f7faf7] p-4 text-center"><p className="font-semibold text-[#344139]">Attendance already marked</p><p className="mt-1 text-xs text-[#718077]">Only one check-in is allowed per member per day.</p></div>}
    {result === "not_eligible" && <div role="alert" className="mt-5 rounded-xl border border-[#f2d2ce] bg-[#fff5f3] p-4 text-center"><p className="font-semibold text-[#a63d32]">We could not verify an active membership</p><p className="mt-1 text-xs text-[#8d625d]">Check the registered number or contact the gym trainer.</p></div>}
    {result === "error" && <div role="alert" className="mt-5 rounded-xl border border-[#f2d2ce] bg-[#fff5f3] p-4 text-center"><p className="font-semibold text-[#a63d32]">Check-in could not be completed</p><p className="mt-1 text-xs text-[#8d625d]">Please try again or contact the gym trainer.</p></div>}
    <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#fff9ee] p-3 text-xs leading-5 text-[#8b6a36]"><ShieldAlert size={16} className="mt-0.5 shrink-0"/><p>Phone-number check-in is a basic fallback, not strong identity verification. Do not use it as proof that the member is physically at the gym.</p></div>
    <p className="mt-5 text-center text-[11px] text-[#a0aaa2]">Powered by GymDesk</p>
  </section></main>;
}