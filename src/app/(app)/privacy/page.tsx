'use client';

import { ShieldCheck, Lock } from 'lucide-react';

export default function WorkspacePrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-6 text-left selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Legal &amp; Privacy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-1.5">Privacy Policy</h1>
        <p className="text-zinc-400 dark:text-zinc-500 font-mono text-xs">Last updated: April 25, 2026</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 rounded-xl shadow-2xs space-y-6 text-zinc-700 dark:text-zinc-300 leading-relaxed text-xs">
        <section>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center">
            <span className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md flex items-center justify-center text-[10px] mr-2 font-bold">1</span>
            Introduction
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Welcome to PingStack (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring that your personal data is handled in a safe and responsible manner. This Privacy Policy outlines how we collect, use, and protect information when you use our WhatsApp SaaS platform.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center">
            <span className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md flex items-center justify-center text-[10px] mr-2 font-bold">2</span>
            Information We Collect
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">To provide our services, we may collect the following types of information:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <li className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700/80">
              <strong className="text-zinc-900 dark:text-zinc-100 block mb-0.5 text-xs">Account Credentials</strong>
              Email, profile name, and encrypted authentication tokens.
            </li>
            <li className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700/80">
              <strong className="text-zinc-900 dark:text-zinc-100 block mb-0.5 text-xs">WhatsApp Meta Data</strong>
              Meta WABA IDs, Phone Number IDs, and webhook callback logs.
            </li>
            <li className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700/80">
              <strong className="text-zinc-900 dark:text-zinc-100 block mb-0.5 text-xs">Message Logs</strong>
              Encrypted storage of sent campaigns, templates, and inbox threads.
            </li>
            <li className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700/80">
              <strong className="text-zinc-900 dark:text-zinc-100 block mb-0.5 text-xs">Audience Contacts</strong>
              Customer phone numbers, tags, and audience group lists.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center">
            <span className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md flex items-center justify-center text-[10px] mr-2 font-bold">3</span>
            Data Security &amp; Encryption
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
            We implement enterprise-grade security measures to protect your data. This includes symmetric encryption (AES-256) for all Meta API access tokens at rest and secure JWT-based authentication for all API access.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center">
            <span className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md flex items-center justify-center text-[10px] mr-2 font-bold">4</span>
            User Data Deletion
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
            According to Meta Platform Rules, we provide a User Data Deletion Callback URL. If you wish to delete your activities/data from PingStack:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 mt-2 ml-1 text-zinc-500 dark:text-zinc-400">
            <li>Go to your Facebook Profile&apos;s &quot;Settings &amp; Privacy &gt; Settings&quot;</li>
            <li>Select &quot;Apps and Websites&quot; and find &quot;PingStack&quot;</li>
            <li>Click &quot;Remove&quot; or contact our support team at <span className="text-zinc-900 dark:text-zinc-100 font-bold">support@pingstack.com</span>.</li>
          </ol>
        </section>

        <section className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20">
          <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            Meta Platform Compliance
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
            Our platform strictly adheres to Meta Platform Policy specifications. We do not sell or expose your WhatsApp Business conversation data to un-authorized third parties.
          </p>
        </section>
      </div>
    </div>
  );
}
