"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setBusy(false);
      window.alert(error.message);
    }
  }
  return <button className="icon-button small" onClick={signOut} disabled={busy} title="Sign out" aria-label="Sign out">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <LogOut size={17} />}</button>;
}
