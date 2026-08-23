'use client';

import { ShieldCheck, Lock } from 'lucide-react';

export default function WorkspacePrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 text-left selection:bg-fg selection:text-bg">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Legal &amp; Privacy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight mb-1.5">Privacy Policy</h1>
        <p className="text-muted font-mono text-xs">Last updated: April 25, 2026</p>
      </div>

      <div className="bg-glass-card/40 backdrop-blur-xl border border-glass-border/40 p-6 sm:p-8 rounded-2xl space-y-6 text-fg/80 leading-relaxed text-xs">
        <section>
          <h2 className="text-base font-bold text-fg mb-2 flex items-center">
            <span className="w-6 h-6 bg-fg/10 rounded-md flex items-center justify-center text-xs mr-2.5 text-fg font-black">1</span>
            Introduction
          </h2>
          <p className="text-muted leading-relaxed">
            Welcome to PingStack ("we," "our," or "us"). We are committed to protecting your privacy and ensuring that your personal data is handled in a safe and responsible manner. This Privacy Policy outlines how we collect, use, and protect information when you use our WhatsApp SaaS platform.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-fg mb-2 flex items-center">
            <span className="w-6 h-6 bg-fg/10 rounded-md flex items-center justify-center text-xs mr-2.5 text-fg font-black">2</span>
            Information We Collect
          </h2>
          <p className="text-muted leading-relaxed">To provide our services, we may collect the following types of information:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <li className="bg-glass-card/60 p-3.5 rounded-xl border border-glass-border/40">
              <strong className="text-fg block mb-0.5">Account Credentials</strong>
              Email, profile name, and encrypted authentication tokens.
            </li>
            <li className="bg-glass-card/60 p-3.5 rounded-xl border border-glass-border/40">
              <strong className="text-fg block mb-0.5">WhatsApp Meta Data</strong>
              Meta WABA IDs, Phone Number IDs, and webhook callback logs.
            </li>
            <li className="bg-glass-card/60 p-3.5 rounded-xl border border-glass-border/40">
              <strong className="text-fg block mb-0.5">Message Logs</strong>
              Encrypted storage of sent campaigns, templates, and inbox threads.
            </li>
            <li className="bg-glass-card/60 p-3.5 rounded-xl border border-glass-border/40">
              <strong className="text-fg block mb-0.5">Audience Contacts</strong>
              Customer phone numbers, tags, and audience group lists.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-fg mb-2 flex items-center">
            <span className="w-6 h-6 bg-fg/10 rounded-md flex items-center justify-center text-xs mr-2.5 text-fg font-black">3</span>
            Data Security &amp; Encryption
          </h2>
          <p className="text-muted leading-relaxed">
            We implement enterprise-grade security measures to protect your data. This includes symmetric encryption (AES-256) for all Meta API access tokens at rest and secure JWT-based authentication for all API access.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-fg mb-2 flex items-center">
            <span className="w-6 h-6 bg-fg/10 rounded-md flex items-center justify-center text-xs mr-2.5 text-fg font-black">4</span>
            User Data Deletion
          </h2>
          <p className="text-muted leading-relaxed">
            According to Meta Platform Rules, we provide a User Data Deletion Callback URL. If you wish to delete your activities/data from PingStack:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 mt-2.5 ml-2 text-muted">
            <li>Go to your Facebook Profile&apos;s &quot;Settings &amp; Privacy &gt; Settings&quot;</li>
            <li>Select &quot;Apps and Websites&quot; and find &quot;PingStack&quot;</li>
            <li>Click &quot;Remove&quot; or contact our support team at <span className="text-fg font-bold">support@pingstack.com</span>.</li>
          </ol>
        </section>

        <section className="bg-fg/5 rounded-xl p-5 border border-glass-border/40">
          <h2 className="text-sm font-bold text-fg mb-1.5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Meta Platform Compliance
          </h2>
          <p className="text-muted text-xs leading-relaxed">
            Our platform strictly adheres to Meta Platform Policy specifications. We do not sell or expose your WhatsApp Business conversation data to un-authorized third parties.
          </p>
        </section>
      </div>
    </div>
  );
}
