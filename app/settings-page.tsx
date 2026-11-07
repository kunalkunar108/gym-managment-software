"use client";

import { useEffect, useState } from "react";
import { Building2, Clock3, Bell, ShieldCheck, Save, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type Hours = { day: string; open: string; close: string; enabled: boolean };
type Gym = { name: string; phone: string; email: string; address: string };
type Preferences = { currency: string; timezone: string; dateFormat: string; grace: string };
type Options = { qr: boolean; expiry: boolean; payment: boolean; attendance: boolean };
const initialHours: Hours[] = [
  { day: "Monday", open: "06:00", close: "22:00", enabled: true },
  { day: "Tuesday", open: "06:00", close: "22:00", enabled: true },
  { day: "Wednesday", open: "06:00", close: "22:00", enabled: true },
  { day: "Thursday", open: "06:00", close: "22:00", enabled: true },
  { day: "Friday", open: "06:00", close: "22:00", enabled: true },
  { day: "Saturday", open: "07:00", close: "20:00", enabled: true },
  { day: "Sunday", open: "08:00", close: "13:00", enabled: false }
];
const initialOptions: Options = { qr: true, expiry: true, payment: true, attendance: false };
const emptyGym: Gym = { name: "My Gym", phone: "", email: "", address: "" };
const emptyPreferences: Preferences = { currency: "INR", timezone: "Asia/Kolkata", dateFormat: "DD/MM/YYYY", grace: "10" };

export default function SettingsPage() {
  const [gym, setGym] = useState<Gym>(emptyGym);
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences);
  const [hours, setHours] = useState<Hours[]>(initialHours);
  const [options, setOptions] = useState<Options>(initialOptions);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Your session has expired. Please log in again.");
      setUserId(auth.user.id);
      const { data, error: queryError } = await supabase.from("gym_settings")
        .select("gym_name,phone,email,address,currency,timezone,date_format,attendance_grace_minutes,operating_hours,notifications")
        .eq("owner_id", auth.user.id).maybeSingle();
      if (queryError) throw queryError;
      if (data) {
        setGym({ name: data.gym_name ?? "My Gym", phone: data.phone ?? "", email: data.email ?? "", address: data.address ?? "" });
        setPreferences({ currency: data.currency ?? "INR", timezone: data.timezone ?? "Asia/Kolkata", dateFormat: data.date_format ?? "DD/MM/YYYY", grace: String(data.attendance_grace_minutes ?? 10) });
        const storedHours = data.operating_hours;
        if (Array.isArray(storedHours) && storedHours.length) {
          setHours(initialHours.map(day => {
            const match = storedHours.find((item: Hours) => item.day === day.day);
            return match ? { day: day.day, open: match.open || day.open, close: match.close || day.close, enabled: Boolean(match.enabled) } : day;
          }));
        }
        const storedOptions = data.notifications && typeof data.notifications === "object" ? data.notifications : {};
        setOptions({
          qr: typeof storedOptions.qr === "boolean" ? storedOptions.qr : initialOptions.qr,
          expiry: typeof storedOptions.expiry === "boolean" ? storedOptions.expiry : initialOptions.expiry,
          payment: typeof storedOptions.payment === "boolean" ? storedOptions.payment : initialOptions.payment,
          attendance: typeof storedOptions.attendance === "boolean" ? storedOptions.attendance : initialOptions.attendance
        });
      } else {
        setGym(emptyGym); setPreferences(emptyPreferences); setHours(initialHours); setOptions(initialOptions);
      }
      setSaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load settings.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadSettings(); }, []);

  const updateGym = (key: keyof Gym, value: string) => { setGym(current => ({ ...current, [key]: value })); setSaved(false); };
  const updatePreference = (key: keyof Preferences, value: string) => { setPreferences(current => ({ ...current, [key]: value })); setSaved(false); };
  const toggleOption = (key: keyof Options) => { setOptions(current => ({ ...current, [key]: !current[key] })); setSaved(false); };

  async function saveSettings() {
    if (!userId) { setError("Your session is unavailable. Please log in again."); return; }
    const grace = Number(preferences.grace);
    if (!gym.name.trim() || !Number.isInteger(grace) || grace < 0 || grace > 60) {
      setError("Enter a gym name and a grace period between 0 and 60 minutes."); return;
    }
    setSaving(true); setError(""); setSaved(false);
    const record = {
      owner_id: userId, gym_name: gym.name.trim(), phone: gym.phone.trim() || null,
      email: gym.email.trim() || null, address: gym.address.trim() || null,
      currency: preferences.currency, timezone: preferences.timezone, date_format: preferences.dateFormat,
      attendance_grace_minutes: grace, operating_hours: hours, notifications: options
    };
    const { error: saveError } = await supabase.from("gym_settings").upsert(record, { onConflict: "owner_id" });
    if (saveError) setError(saveError.message);
    else setSaved(true);
    setSaving(false);
  }

  return (
    <div className="settings-page">
      <div className="settings-heading">
        <div><p className="eyebrow">WORKSPACE CONFIGURATION</p><h1>Settings</h1><p className="settings-intro">Manage your gym profile, operating hours and day-to-day preferences.</p></div>
        <button className="button-primary" onClick={() => void saveSettings()} disabled={loading || saving}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button>
      </div>
      {loading && <p className="settings-note"><LoaderCircle size={15} className="inline animate-spin mr-2" />Loading your saved settings…</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b33b32]">{error}</p>}
      {saved && <div className="settings-saved"><CheckCircle2 size={16} /> Settings saved to your GymDesk account.</div>}

      <section className="panel settings-section">
        <div className="settings-section-title"><span className="settings-icon"><Building2 size={18} /></span><div><h2>Gym profile</h2><p>Basic information shown across your workspace.</p></div></div>
        <div className="settings-form-grid">
          <label>Gym name<input value={gym.name} onChange={e => updateGym("name", e.target.value)} /></label>
          <label>Contact phone<input value={gym.phone} onChange={e => updateGym("phone", e.target.value)} /></label>
          <label>Email address<input type="email" value={gym.email} onChange={e => updateGym("email", e.target.value)} /></label>
          <label className="settings-wide">Gym address<input value={gym.address} onChange={e => updateGym("address", e.target.value)} /></label>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="settings-section-title"><span className="settings-icon blue"><SlidersIcon /></span><div><h2>Business preferences</h2><p>Regional formats and attendance rules.</p></div></div>
        <div className="settings-form-grid">
          <label>Currency<select value={preferences.currency} onChange={e => updatePreference("currency", e.target.value)}><option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option></select></label>
          <label>Timezone<select value={preferences.timezone} onChange={e => updatePreference("timezone", e.target.value)}><option>Asia/Kolkata</option><option>Asia/Dubai</option><option>UTC</option></select></label>
          <label>Date format<select value={preferences.dateFormat} onChange={e => updatePreference("dateFormat", e.target.value)}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></label>
          <label>Attendance grace period (minutes)<input type="number" min="0" max="60" value={preferences.grace} onChange={e => updatePreference("grace", e.target.value)} /></label>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="settings-section-title"><span className="settings-icon orange"><Clock3 size={18} /></span><div><h2>Operating hours</h2><p>Set the hours your gym is open each day.</p></div></div>
        <div className="hours-list">
          {hours.map((item, index) => <div className="hours-row" key={item.day}>
            <label className="hours-day"><input type="checkbox" checked={item.enabled} onChange={e => { setHours(current => current.map((day, i) => i === index ? { ...day, enabled: e.target.checked } : day)); setSaved(false); }} />{item.day}</label>
            {item.enabled ? <div className="hours-time"><input aria-label={item.day + " opening time"} type="time" value={item.open} onChange={e => { setHours(current => current.map((day, i) => i === index ? { ...day, open: e.target.value } : day)); setSaved(false); }} /><span>to</span><input aria-label={item.day + " closing time"} type="time" value={item.close} onChange={e => { setHours(current => current.map((day, i) => i === index ? { ...day, close: e.target.value } : day)); setSaved(false); }} /></div> : <span className="hours-closed">Closed</span>}
          </div>)}
        </div>
      </section>

      <section className="panel settings-section">
        <div className="settings-section-title"><span className="settings-icon purple"><Bell size={18} /></span><div><h2>Notifications and check-in</h2><p>Choose which operational alerts are enabled.</p></div></div>
        <div className="settings-toggle-list">
          <SettingToggle title="QR check-in" detail="Allow members to be checked in using their member code." checked={options.qr} onChange={() => toggleOption("qr")} />
          <SettingToggle title="Membership expiry reminders" detail="Show reminders for memberships that are close to expiry." checked={options.expiry} onChange={() => toggleOption("expiry")} />
          <SettingToggle title="Payment notifications" detail="Show an alert when a payment is recorded." checked={options.payment} onChange={() => toggleOption("payment")} />
          <SettingToggle title="Daily attendance summary" detail="Enable a daily attendance summary for the gym owner." checked={options.attendance} onChange={() => toggleOption("attendance")} />
        </div>
        <div className="settings-security-note"><ShieldCheck size={16} /><span>These preferences are saved to your owner account. They do not yet trigger external notifications or change authentication permissions.</span></div>
      </section>
      <div className="settings-bottom"><span>Settings are stored securely in your GymDesk database.</span><button className="button-primary" onClick={() => void saveSettings()} disabled={loading || saving}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button></div>
      <div className="mt-3"><button className="text-link flex items-center gap-1" onClick={() => void loadSettings()} disabled={loading}><RefreshCw size={13}/> Refresh settings</button></div>
    </div>
  );
}

function SlidersIcon() {
  return <span className="settings-slider-glyph">☷</span>;
}

function SettingToggle({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: () => void }) {
  return <div className="settings-toggle-row"><div><strong>{title}</strong><p>{detail}</p></div><button type="button" role="switch" aria-checked={checked} className={`settings-switch ${checked ? "on" : ""}`} onClick={onChange}><span /></button></div>;
}
