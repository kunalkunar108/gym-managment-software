"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Dumbbell, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data.session);
        setChecking(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
      setSession(nextSession);
      setChecking(false);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (authError) throw authError;
        if (data.session) {
          setSession(data.session);
          setMessage("Your GymDesk account is ready.");
        } else {
          setMessage("Account created. Check your email for the confirmation link, then log in.");
          setMode("login");
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        setSession(data.session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setMessage("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
      } else {
        if (password.length < 8) throw new Error("Use at least 8 characters for your new password.");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        await supabase.auth.signOut();
        setSession(null);
        setPassword("");
        setMode("login");
        setMessage("Password updated. Log in with your new password.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process the password request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f7f9f7] text-[#637168]"><LoaderCircle className="animate-spin mr-2" size={18} /> Checking your session…</div>;
  }

  if (session && mode !== "reset") return <>{children}</>;

  return (
    <main className="min-h-screen bg-[#f4f7f4] flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[#e5ebe5] bg-white p-7 shadow-[0_20px_70px_rgba(23,33,28,0.08)] sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5eb] text-[#278348]"><Dumbbell size={23} /></div>
          <div><div className="text-2xl font-bold tracking-tight text-[#17211c]">gym<span className="text-[#329653]">desk</span></div><p className="text-[10px] font-semibold tracking-[0.18em] text-[#8a968e]">MANAGEMENT STUDIO</p></div>
        </div>
        <p className="text-xs font-bold tracking-[0.16em] text-[#329653]">{mode === "login" ? "WELCOME BACK" : mode === "signup" ? "GET STARTED" : mode === "forgot" ? "ACCOUNT RECOVERY" : "NEW PASSWORD"}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211c]">{mode === "login" ? "Log in to GymDesk" : mode === "signup" ? "Create your gym account" : mode === "forgot" ? "Reset your password" : "Choose a new password"}</h1>
        <p className="mt-2 text-sm leading-6 text-[#7b887f]">{mode === "login" ? "Sign in to manage your gym workspace." : mode === "signup" ? "Create the owner account for your gym workspace." : mode === "forgot" ? "Enter the owner account email. We will send a secure reset link if the account exists." : "Enter a new password for your GymDesk account."}</p>
        <form onSubmit={mode === "login" || mode === "signup" ? handleSubmit : handlePasswordReset} className="mt-7 space-y-4">
          {mode === "signup" && <label className="block"><span className="mb-2 block text-sm font-medium text-[#344238]">Your name</span><span className="flex items-center gap-3 rounded-xl border border-[#e2e9e2] px-3.5 focus-within:border-[#329653]"><UserRound size={17} className="text-[#91a096]" /><input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Full name" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[#17211c] outline-none placeholder:text-[#a3ada6]" /></span></label>}
          <label className="block"><span className="mb-2 block text-sm font-medium text-[#344238]">Email address</span><span className="flex items-center gap-3 rounded-xl border border-[#e2e9e2] px-3.5 focus-within:border-[#329653]"><Mail size={17} className="text-[#91a096]" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[#17211c] outline-none placeholder:text-[#a3ada6]" /></span></label>
          {mode !== "forgot" && <label className="block"><span className="mb-2 block text-sm font-medium text-[#344238]">{mode === "reset" ? "New password" : "Password"}</span><span className="flex items-center gap-3 rounded-xl border border-[#e2e9e2] px-3.5 focus-within:border-[#329653]"><LockKeyhole size={17} className="text-[#91a096]" /><input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[#17211c] outline-none placeholder:text-[#a3ada6]" /></span></label>}
          {mode === "reset" && <p className="text-xs text-[#7b887f]">Use at least 8 characters. You will be asked to log in again after saving.</p>}{error && <p role="alert" className="rounded-xl bg-[#fff0ef] px-3.5 py-3 text-sm text-[#b33b32]">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-[#edf8ef] px-3.5 py-3 text-sm text-[#267b42]">{message}</p>}
          <button disabled={busy} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#278348] text-sm font-semibold text-white transition hover:bg-[#216f3c] disabled:cursor-not-allowed disabled:opacity-60">{busy && <LoaderCircle size={17} className="animate-spin" />}{mode === "login" ? "Log in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Save new password"}</button>
        </form>
        {mode === "login" && <div className="mt-4 text-center"><button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} className="text-sm font-semibold text-[#278348] hover:underline">Forgot password?</button></div>}
        <div className="mt-6 border-t border-[#edf1ed] pt-5 text-center text-sm text-[#7b887f]">
          {mode === "login" ? "New to GymDesk?" : mode === "signup" ? "Already have an account?" : "Remember your password?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "signup" || mode === "reset" || mode === "forgot" ? "login" : "signup"); setError(""); setMessage(""); setPassword(""); }} className="font-semibold text-[#278348] hover:underline">{mode === "login" ? "Create an account" : "Log in"}</button>
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-[#a0aaa2]">Your gym data is protected by your account and database access policies.</p>
      </section>
    </main>
  );
}
