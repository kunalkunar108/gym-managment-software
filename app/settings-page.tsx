"use client";

import { useState } from "react";
import { Building2, Clock3, Bell, ShieldCheck, Save, CheckCircle2 } from "lucide-react";

const initialHours = [
  { day: "Monday", open: "06:00", close: "22:00", enabled: true },
  { day: "Tuesday", open: "06:00", close: "22:00", enabled: true },
  { day: "Wednesday", open: "06:00", close: "22:00", enabled: true },
  { day: "Thursday", open: "06:00", close: "22:00", enabled: true },
  { day: "Friday", open: "06:00", close: "22:00", enabled: true },
  { day: "Saturday", open: "07:00", close: "20:00", enabled: true },
  { day: "Sunday", open: "08:00", close: "13:00", enabled: false }
];

export default function SettingsPage() {
  const [gym, setGym] = useState({ name: "Iron House Fitness", phone: "+91 98765 43210", email: "hello@ironhouse.in", address: "Main Road, India" });
  const [preferences, setPreferences] = useState({ currency: "INR (₹)", timezone: "Asia/Kolkata", dateFormat: "DD/MM/YYYY", grace: "10" });
  const [hours, setHours] = useState(initialHours);
  const [options, setOptions] = useState({ qr: true, expiry: true, payment: true, attendance: false });
  const [saved, setSaved] = useState(false);

  const updateGym = (key: keyof typeof gym, value: string) => { setGym((current) => ({ ...current, [key]: value })); setSaved(false); };
  const updatePreference = (key: keyof typeof preferences, value: string) => { setPreferences((current) => ({ ...current, [key]: value })); setSaved(false); };
  const toggleOption = (key: keyof typeof options) => { setOptions((current) => ({ ...current, [key]: !current[key] })); setSaved(false); };

  return (
    <div className="settings-page">
      <div className="settings-heading">
        <div><p className="eyebrow">WORKSPACE CONFIGURATION</p><h1>Settings</h1><p className="settings-intro">Manage your gym profile, operating hours and day-to-day preferences.</p></div>
        <button className="button-primary" onClick={() => setSaved(true)}><Save size={16} /> Save changes</button>
      </div>
      {saved && <div className="settings-saved"><CheckCircle2 size={16} /> Changes saved in this preview. They will reset when you refresh.</div>}

      <section className="panel settings-section">
        <div className="settings-section-title"><span className="settings-icon"><Building2 size={18} /></span><div><h2>Gym profile</h2><p>Basic information shown across your workspace.</p></div></div>
        <div className="settings-form-grid">
          <label>Gym name<input value={gym.name} onChange={(e) => updateGym("name", e.target.value)} /></label>
          <label>Contact phone<input value={gym.phone} onChange={(e) => updateGym("phone", e.target.value)} /></label>
          <label>Email address<input type="email" value={gym.email} onChange={(e) => updateGym("email", e.target.value)} /></label>
          <label className="settings-wide">Gym address<input value={gym.address} onChange={(e) => updateGym("address", e.target.value)} /></label>
        </div>
        <p className="settings-note">Logo upload and verified contact details will be connected in the backend phase.</p>
      </section>

      <section className="panel settings-section">
        <div className="settings-section-title"><span className="settings-icon blue"><SlidersIcon /></span><div><h2>Business preferences</h2><p>Regional formats and attendance rules.</p></div></div>
        <div className="settings-form-grid">
          <label>Currency<select value={preferences.currency} onChange={(e) => updatePreference("currency", e.target.value)}><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option></select></label>
          <label>Timezone<select value={preferences.timezone} onChange={(e) => updatePreference("timezone", e.target.value)}><option>Asia/Kolkata</option><option>Asia/Dubai</option><option>UTC</option></select></label>
          <label>Date format<select value={preferences.dateFormat} onChange={(e) => updatePreference("dateFormat", e.target.value)}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></label>
          <label>Attendance grace period (minutes)<input type="number" min="0" max="60" value={preferences.grace} onChange={(e) => updatePreference("grace", e.target.value)} /></label>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="settings-section-title"><span className="settings-icon orange"><Clock3 size={18} /></span><div><h2>Operating hours</h2><p>Set the hours your gym is open each day.</p></div></div>
        <div className="hours-list">
          {hours.map((item, index) => <div className="hours-row" key={item.day}>
            <label className="hours-day"><input type="checkbox" checked={item.enabled} onChange={(e) => { setHours((current) => current.map((day, i) => i === index ? { ...day, enabled: e.target.checked } : day)); setSaved(false); }} />{item.day}</label>
            {item.enabled ? <div className="hours-time"><input aria-label={item.day + " opening time"} type="time" value={item.open} onChange={(e) => { setHours((current) => current.map((day, i) => i === index ? { ...day, open: e.target.value } : day)); setSaved(false); }} /><span>to</span><input aria-label={item.day + " closing time"} type="time" value={item.close} onChange={(e) => { setHours((current) => current.map((day, i) => i === index ? { ...day, close: e.target.value } : day)); setSaved(false); }} /></div> : <span className="hours-closed">Closed</span>}
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
        <div className="settings-security-note"><ShieldCheck size={16} /><span>Staff access, password security and role permissions will be configured after authentication is connected.</span></div>
      </section>
      <div className="settings-bottom"><span>Preview settings are stored only in this page's temporary state.</span><button className="button-primary" onClick={() => setSaved(true)}><Save size={16} /> Save changes</button></div>
    </div>
  );
}

function SlidersIcon() {
  return <span className="settings-slider-glyph">☷</span>;
}

function SettingToggle({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: () => void }) {
  return <div className="settings-toggle-row"><div><strong>{title}</strong><p>{detail}</p></div><button type="button" role="switch" aria-checked={checked} className={`settings-switch ${checked ? "on" : ""}`} onClick={onChange}><span /></button></div>;
}
