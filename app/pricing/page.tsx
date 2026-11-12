"use client";

import { ArrowRight, Check, Dumbbell, ShieldCheck, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    monthly: "₹499",
    annual: "₹4,999",
    description: "For smaller gyms moving away from registers and spreadsheets.",
    features: ["Member records", "Membership plan records", "Attendance register", "Fee tracking overview"],
  },
  {
    name: "Professional",
    monthly: "₹999",
    annual: "₹9,999",
    description: "For gyms that want a more complete day-to-day management workspace.",
    features: ["Everything in Starter", "Staff access (when enabled)", "QR attendance workflow (when enabled)", "Payment and attendance reports", "Priority support"],
    popular: true,
  },
  {
    name: "Premium",
    monthly: "₹1,999",
    annual: "₹19,999",
    description: "For gyms requiring additional workflows and implementation support.",
    features: ["Everything in Professional", "Advanced reporting scope", "Additional configuration", "Priority implementation support", "Integration options quoted by scope"],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f9f7] text-[#17251b]">
      <header className="border-b border-[#e6ece6] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/pricing" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf5ec] text-[#258148]"><Dumbbell size={21} /></span>
            <span><span className="block text-xl font-extrabold tracking-tight">gym<span className="text-[#329653]">desk</span></span><span className="block text-[9px] font-bold tracking-[.18em] text-[#95a198]">GYM MANAGEMENT</span></span>
          </a>
          <a href="#plans" className="rounded-xl bg-[#258148] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e6e3c]">View plans <ArrowRight className="ml-1 inline" size={15} /></a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 text-center sm:px-8 sm:pt-20">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#dcebdd] bg-white px-3 py-1.5 text-xs font-semibold text-[#287d43]"><Sparkles size={14} /> Simple pricing for independent gyms</div>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-[-.045em] sm:text-6xl">Spend less time managing. <span className="text-[#329653]">More time coaching.</span></h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#718077]">Keep member information, attendance, memberships and payment records organised in one gym workspace.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#plans" className="rounded-xl bg-[#258148] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1e6e3c]">Explore pricing</a>
          <a href="#one-time" className="rounded-xl border border-[#dfe8df] bg-white px-6 py-3 text-sm font-bold text-[#425047] hover:bg-[#f5f8f5]">One-time licence</a>
        </div>
        <p className="mt-5 text-xs text-[#99a39c]">Transparent pricing • One gym location per plan • No hidden feature promises</p>
      </section>

      <section id="plans" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="mb-8 text-center"><p className="text-xs font-extrabold tracking-[.18em] text-[#329653]">SUBSCRIPTION PLANS</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">Choose how you want to pay</h2><p className="mt-3 text-sm text-[#829087]">Annual billing gives you the equivalent of two months free compared with monthly billing.</p></div>
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative rounded-2xl border bg-white p-7 shadow-[0_8px_30px_rgba(24,44,31,.035)] ${plan.popular ? "border-[#329653] ring-2 ring-[#329653]/10" : "border-[#e6ece6]"}`}>
              {plan.popular && <div className="absolute -top-3 left-6 rounded-full bg-[#258148] px-3 py-1 text-[10px] font-extrabold tracking-wide text-white">RECOMMENDED</div>}
              <h3 className="text-lg font-bold">{plan.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-[#849087]">{plan.description}</p>
              <div className="mt-6"><span className="text-4xl font-extrabold tracking-tight">{plan.monthly}</span><span className="text-sm text-[#849087]"> / month</span></div>
              <p className="mt-1 text-xs font-semibold text-[#329653]">{plan.annual} billed annually</p>
              <a href="#contact" className={`mt-6 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold ${plan.popular ? "bg-[#258148] text-white hover:bg-[#1e6e3c]" : "border border-[#dfe8df] text-[#344238] hover:bg-[#f6f9f6]"}`}>Enquire about {plan.name} <ArrowRight size={15} /></a>
              <div className="my-6 h-px bg-[#edf1ed]" />
              <p className="mb-4 text-xs font-extrabold tracking-wider text-[#8c9990]">PLAN HIGHLIGHTS</p>
              <ul className="space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2.5 text-sm text-[#536158]"><Check size={16} className="mt-0.5 shrink-0 text-[#329653]" />{feature}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section id="one-time" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid items-center gap-8 rounded-3xl border border-[#dfe9df] bg-white p-7 sm:p-10 lg:grid-cols-[1.3fr_.7fr]">
          <div><p className="text-xs font-extrabold tracking-[.18em] text-[#329653]">PREFER A ONE-TIME LICENCE?</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight">Own a single-gym licence.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[#77847b]">A one-time software licence for one gym, with initial setup and branding configuration. Ongoing infrastructure and support remain separate so your software can stay maintained.</p><ul className="mt-5 space-y-2 text-sm text-[#536158]"><li className="flex gap-2"><Check size={16} className="text-[#329653]" /> Single-gym licence and initial configuration</li><li className="flex gap-2"><Check size={16} className="text-[#329653]" /> 3 months of bug-fix support</li><li className="flex gap-2"><Check size={16} className="text-[#329653]" /> Hosting, maintenance and support thereafter: ₹499/month</li></ul></div>
          <div className="rounded-2xl bg-[#f3f8f3] p-7"><p className="text-xs font-bold tracking-wider text-[#7c8b7f]">ONE-TIME LICENCE</p><div className="mt-3 text-5xl font-extrabold tracking-tight">₹14,999</div><p className="mt-2 text-xs text-[#829087]">Per gym • One-time setup and licence fee</p><a href="#contact" className="mt-7 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#258148] text-sm font-bold text-white hover:bg-[#1e6e3c]">Discuss one-time licence <ArrowRight size={15} /></a></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["One gym, one workspace", "Each listed plan is priced for one gym location. Multi-branch requirements are scoped separately."],
            ["Clear ongoing costs", "Third-party messaging, payment gateway, domain and special integration charges are billed separately where applicable."],
            ["Implementation scope first", "Before payment, we confirm the feature list, delivery timeline, data migration and acceptance criteria in writing."],
          ].map(([title, copy]) => <div key={title} className="rounded-2xl border border-[#e6ece6] bg-white p-6"><ShieldCheck className="text-[#329653]" size={21} /><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#7b887f]">{copy}</p></div>)}
        </div>
      </section>

      <section id="contact" className="bg-[#17251b] px-5 py-14 text-center text-white sm:px-8">
        <p className="text-xs font-extrabold tracking-[.18em] text-[#9bd3a7]">NEXT STEP</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight">Let's scope the right setup for your gym.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#c0ccc2]">Ask for a walkthrough and a written quotation. We will confirm which features are available now and which require implementation.</p><a href="mailto:hello@gymdesk.app?subject=GymDesk%20demo%20request" className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#1d6e3c] hover:bg-[#edf6ee]">Request a demo <ArrowRight size={15} /></a><p className="mt-8 text-xs text-[#91a095]">© {new Date().getFullYear()} GymDesk. All rights reserved.</p>
      </section>
      <div className="border-t border-[#e6ece6] bg-white px-5 py-4 text-center text-[11px] text-[#9aa49d]">Pricing shown in INR. Taxes, if applicable, are additional. Final scope is confirmed in the client quotation.</div>
    </main>
  );
}
