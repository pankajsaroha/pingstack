'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Clock, User, Users, Share2, MessageSquare, Copy, Check, Shield, Activity, Key, Smartphone, AlertCircle, CreditCard, Calendar, Zap, ArrowUpCircle, XCircle, Info, ExternalLink, Lock, Server, Globe, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

const DOCS_CONTENT: Record<string, {
  title: string;
  category: string;
  readTime: string;
  content: React.ReactNode;
}> = {
  'manual-connectivity': {
    title: 'Manual Connectivity Guide',
    category: 'Getting Started',
    readTime: '4 min',
    content: (
      <div className="space-y-6">
        <p>Connecting your WhatsApp Business Account (WABA) manually allows for full control over your messaging infrastructure. This guide walks you through the Meta Business Manager setup.</p>
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">Steps to Connect</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li>Log in to the <a href="https://developers.facebook.com/" className="text-blue-600 hover:underline">Meta for Developers</a> portal.</li>
            <li>Create a new App and select "Business" as the type.</li>
            <li>Add "WhatsApp" to your app from the dashboard.</li>
            <li>Navigate to **WhatsApp {'>'} Setup** to find your Phone Number ID and WhatsApp Business Account ID.</li>
            <li>Go to the PingStack Dashboard and enter these IDs in your Channel Settings.</li>
          </ol>
        </section>
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-2">Pro Tip</h3>
          <p className="text-blue-800 text-sm">Ensure your Meta Business Account is verified to remove the daily message limit of 250 messages.</p>
        </div>
      </div>
    )
  },
  'testing-implementation': {
    title: 'Testing your implementation',
    category: 'Getting Started',
    readTime: '2 min',
    content: (
      <div className="space-y-6">
        <p>Before launching a large-scale campaign, it is critical to verify your webhook and API connectivity using Meta{"'"}s test numbers.</p>
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Sandbox Testing</h2>
          <p>Meta provides a "Test Number" in your developer dashboard. You can add up to 5 verified personal phone numbers to receive test messages.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Send a "Hi" from your personal WhatsApp to the test number to open the 24-hour window.</li>
            <li>Use the "Direct Chat" feature in PingStack to send a manual reply.</li>
            <li>Check the "Inbox" to verify that incoming messages are being captured.</li>
          </ul>
        </section>
      </div>
    )
  },
  'plan-limits': {
    title: 'Plan limits overview',
    category: 'Getting Started',
    readTime: '2 min',
    content: (
      <div className="space-y-6">
        <p>WhatsApp implements messaging tiers to ensure quality and prevent spam. Your tier determines how many unique customers you can message daily.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-bold text-gray-900">Tier</th>
                <th className="p-4 font-bold text-gray-900">Daily Limit</th>
                <th className="p-4 font-bold text-gray-900">Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-4 font-medium">Unverified</td>
                <td className="p-4 text-gray-600">250 Unique Customers</td>
                <td className="p-4 text-gray-600">Default for new accounts</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Tier 1</td>
                <td className="p-4 text-gray-600">1,000 Unique Customers</td>
                <td className="p-4 text-gray-600">Business Verification complete</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Tier 2</td>
                <td className="p-4 text-gray-600">10,000 Unique Customers</td>
                <td className="p-4 text-gray-600">High quality score over 7 days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  },
  'first-campaign': {
    title: 'Sending your first campaign',
    category: 'Messaging API',
    readTime: '4 min',
    content: (
      <div className="space-y-10 selection:bg-blue-100">
        <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <MessageSquare className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-lg font-black text-blue-900 mb-3 tracking-tight">Quick Start</h3>
          <p className="text-blue-800/80 text-sm leading-relaxed">
            Campaigns are the most powerful way to reach your audience at scale. Whether it's a seasonal promotion, a service update, or a newsletter, PingStack ensures your message lands directly in your customer's pocket.
          </p>
        </div>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center mr-3">
               <span className="text-white text-xs">01</span>
             </div>
             Pre-Flight Checklist
          </h2>
          <p>Before launching, ensure you have these three boxes checked to avoid Meta delivery blocks:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-5 border border-gray-100 rounded-3xl h-full">
                <p className="font-bold text-gray-900 mb-1">WhatsApp Channel</p>
                <p className="text-xs text-gray-500">Your WABA must be connected via "Settings {'>'} Channels".</p>
             </div>
             <div className="p-5 border border-gray-100 rounded-3xl h-full">
                <p className="font-bold text-gray-900 mb-1">Template Status</p>
                <p className="text-xs text-gray-500">Only templates with an <span className="text-green-600 font-bold">APPROVED</span> status can be used in campaigns.</p>
             </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center mr-3">
               <span className="text-white text-xs">02</span>
             </div>
             Audience Preparation
          </h2>
          <p>Your campaign is only as good as your contact data. Follow these best practices for imports:</p>
          <ul className="space-y-4">
             <li className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 shrink-0" />
                <span>**E.164 Formatting**: Always include the country code (e.g., +1 for USA, +91 for India).</span>
             </li>
             <li className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 shrink-0" />
                <span>**Contact Groups**: Grouping helps you segment your audience (e.g., "Loyal Customers" vs "New Leads").</span>
             </li>
          </ul>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center mr-3">
               <span className="text-white text-xs">03</span>
             </div>
             Step-by-Step Workflow
          </h2>
          <div className="space-y-6">
             <div className="flex group">
                <div className="mr-6 flex flex-col items-center">
                   <div className="w-10 h-10 border-2 border-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover:border-black group-hover:text-black transition-all">1</div>
                   <div className="w-px h-full bg-gray-100 mt-2" />
                </div>
                <div className="pb-8">
                   <p className="font-bold text-gray-900">Initiate</p>
                   <p className="text-sm text-gray-500 mt-1">Navigate to **Campaigns** and click **"New Campaign"**. Give it a descriptive name for your internal reports.</p>
                </div>
             </div>
             <div className="flex group">
                <div className="mr-6 flex flex-col items-center">
                   <div className="w-10 h-10 border-2 border-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover:border-black group-hover:text-black transition-all">2</div>
                   <div className="w-px h-full bg-gray-100 mt-2" />
                </div>
                <div className="pb-8">
                   <p className="font-bold text-gray-900">Selection</p>
                   <p className="text-sm text-gray-500 mt-1">Select your **Template** and **Target Group**. Currently, the campaign will send the standard approved content of the template.</p>
                </div>
             </div>
             <div className="flex group">
                <div className="mr-6 flex flex-col items-center">
                   <div className="w-10 h-10 border-2 border-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover:border-black group-hover:text-black transition-all">3</div>
                </div>
                <div>
                   <p className="font-bold text-gray-900">Execute or Schedule</p>
                   <p className="text-sm text-gray-500 mt-1">Choose **"Send Now"** for instant delivery or **"Schedule for later"** (available on Growth plans) to trigger the engine at a specific time.</p>
                </div>
             </div>
          </div>
        </section>

        <section className="bg-gray-900 rounded-[3rem] p-10 relative overflow-hidden border border-white/5 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-20">
             <Activity className="w-20 h-20 text-blue-500" />
          </div>
          <div className="relative z-10">
             <div className="inline-flex items-center px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-6 border border-blue-500/20">
                Coming Soon
             </div>
             <h3 className="text-2xl font-black text-white mb-4 tracking-tight">Dynamic Variable Mapping</h3>
             <p className="text-gray-400 text-sm leading-relaxed mb-8">
                We are currently building an AI-powered variable mapper. Soon, you'll be able to map template placeholders like <code className="text-blue-400">{`{{1}}`}</code> directly to any column in your contact bank (e.g., Name, OrderNumber, Balance) automatically during step 2.
             </p>
             <Link href="/docs/template-variables" className="text-xs font-black text-white hover:text-blue-400 transition-colors uppercase tracking-widest flex items-center">
                Learn about variables &rarr;
             </Link>
          </div>
        </section>

        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start">
           <div className="bg-amber-100 p-2 rounded-xl mr-4 shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
           </div>
           <div>
              <p className="font-black text-amber-900 text-sm uppercase tracking-tight mb-1">Timing Matters</p>
              <p className="text-xs text-amber-800/80 leading-relaxed italic-none">
                Messaging too many customers in a short window can trigger Meta's spam filters. We recommend starting with smaller groups to build your account reputation.
              </p>
           </div>
        </div>
      </div>
    )
  },
  'template-variables': {
    title: 'Template Variables Guide',
    category: 'Messaging API',
    readTime: '3 min',
    content: (
      <div className="space-y-10 selection:bg-blue-100">
        <div className="bg-gray-900 text-gray-100 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Key className="w-20 h-20" />
          </div>
          <h3 className="text-xl font-black text-white mb-4 tracking-tight">Personalization at Scale</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Variables are the key to humanizing your automated outreach. Instead of generic broadcasts, PingStack allows you to weave specific customer data into every message, drastically increasing your conversion and quality scores.
          </p>
          <div className="flex items-center space-x-3 text-xs font-black text-blue-400 uppercase tracking-widest">
            <Smartphone className="w-4 h-4" />
            <span>Works across all Meta Message Tiers</span>
          </div>
        </div>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">The Double Curly Brace Syntax</h2>
          <p>Meta requires a specific placeholder format in your templates. These are denoted by numeric indexes inside double curly braces:</p>
          
          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
            <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Correct Implementation</span>
            </div>
            <p className="font-mono text-gray-700 bg-white p-4 rounded-xl border border-gray-100 italic-none">
              "Hi <span className="text-blue-600 font-bold">{`{{1}}`}</span>! Your delivery for Order #<span className="text-blue-600 font-bold">{`{{2}}`}</span> is arriving soon."
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             Mapping to your Contact Data
          </h2>
          <p>Currently, PingStack maps these variables based on the column headers in your imported audience list. For the template above, you would need a CSV or Google Contacts list with these specific fields:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block">{`{{1}}`} Maps To:</span>
                <p className="font-bold text-gray-900">Name</p>
                <p className="text-xs text-gray-500 mt-1">The user's first name or company name.</p>
             </div>
             <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block">{`{{2}}`} Maps To:</span>
                <p className="font-bold text-gray-900">OrderNumber</p>
                <p className="text-xs text-gray-500 mt-1">Specific dynamic data for this interaction.</p>
             </div>
          </div>
        </section>

        <div className="p-8 bg-red-50 rounded-[2.5rem] border border-red-100 flex items-start">
           <div className="bg-red-100 p-2.5 rounded-2xl mr-5 shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
           </div>
           <div>
              <p className="font-black text-red-900 text-sm uppercase tracking-tight mb-2">Critical Safety Rule</p>
              <p className="text-xs text-red-800/80 leading-relaxed italic-none">
                Meta is strict about template content. If you have 3 variables in your approved template, you **must** provide data for all 3. Messaging with missing or blank variables will result in broad delivery failures.
              </p>
           </div>
        </div>

        <section className="space-y-6 pt-6">
           <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             Real-World Use Cases
          </h2>
          <div className="space-y-4">
             <div className="p-6 border border-gray-100 rounded-3xl hover:border-black transition-colors group">
                <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-2">E-Commerce</h4>
                <p className="text-sm text-gray-500 italic-none italic-none">"Hello {`{{1}}`}, thank you for your purchase. We've sent your receipt to {`{{2}}`}."</p>
             </div>
             <div className="p-6 border border-gray-100 rounded-3xl hover:border-black transition-colors group">
                <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-2">Appointment Tracking</h4>
                <p className="text-sm text-gray-500 italic-none">"Reminder: Your appointment with {`{{1}}`} is scheduled for {`{{2}}`} at {`{{3}}`}."</p>
             </div>
          </div>
        </section>
      </div>
    )
  },
  'delivery-status': {
    title: 'Handling Delivery Status',
    category: 'Messaging API',
    readTime: '3 min',
    content: (
      <div className="space-y-10 selection:bg-blue-100">
        <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Activity className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-lg font-black text-blue-900 mb-3 tracking-tight">Real-Time Intelligence</h3>
          <p className="text-blue-800/80 text-sm leading-relaxed">
            Understanding what happens after you hit "Send" is critical for maintaining a high-quality sender reputation and measuring your campaign's true ROI.
          </p>
        </div>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             The Status Lifecycle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-6 border border-gray-100 rounded-3xl">
                <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                   <div className="w-2 h-2 bg-gray-300 rounded-full" />
                   <span>Sent</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">The message has been successfully handed off to Meta's servers.</p>
             </div>
             <div className="p-6 border border-gray-100 rounded-3xl">
                <div className="flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">
                   <div className="w-2 h-2 bg-blue-500 rounded-full" />
                   <span>Delivered</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">The message has reached the user's phone, but they haven't opened it yet.</p>
             </div>
             <div className="p-6 border border-gray-100 rounded-3xl">
                <div className="flex items-center space-x-2 text-[10px] font-black text-green-500 uppercase tracking-widest mb-3">
                   <div className="w-2 h-2 bg-green-500 rounded-full" />
                   <span>Read</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">The user opened the chat. Note: This requires "Read Receipts" to be enabled by the user.</p>
             </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             Common Failure Modes
          </h2>
          <p>If a message status returns as <span className="text-red-600 font-bold uppercase tracking-tighter">Failed</span>, it's usually due to one of these Meta-enforced policies:</p>
          
          <div className="space-y-3">
             <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group">
                <div>
                   <p className="font-bold text-gray-900 text-sm">Outside 24-Hour Window</p>
                   <p className="text-xs text-gray-500 mt-1">You cannot send a free-form message if the user hasn't replied in 24 hours.</p>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm font-mono text-[10px] text-gray-400">Error 131047</div>
             </div>
             <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group">
                <div>
                   <p className="font-bold text-gray-900 text-sm">Template Mismatch</p>
                   <p className="text-xs text-gray-500 mt-1">The variables provided don't match the approved template structure.</p>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm font-mono text-[10px] text-gray-400">Error 132000</div>
             </div>
             <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group">
                <div>
                   <p className="font-bold text-gray-900 text-sm">Phone Number Not Registered</p>
                   <p className="text-xs text-gray-500 mt-1">The target number is not active on WhatsApp.</p>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm font-mono text-[10px] text-gray-400">Error 131030</div>
             </div>
          </div>
        </section>

        <section className="bg-blue-600 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 p-8 opacity-20">
              <Shield className="w-20 h-20 text-white" />
           </div>
           <div className="relative z-10">
              <h3 className="text-2xl font-black text-white mb-4 tracking-tight">The 24-Hour Rule</h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                WhatsApp prioritizes user experience above all. To prevent spam, Meta only allows businesses to send "Free-form" messages (non-templates) within 24 hours of the customer's last message.
              </p>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 uppercase tracking-widest text-[10px] font-black text-white">
                Pro Tip: Use an "Approved Template" to re-open the 24-hour window at any time.
              </div>
           </div>
        </section>
      </div>
    )
  },
  'refund-policy': {
    title: 'Refund Policy',
    category: 'Billing & Security',
    readTime: '3 min',
    content: (
      <div className="space-y-10 selection:bg-blue-100">
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <CreditCard className="w-12 h-12 text-gray-900" />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-3 tracking-tight">Our Commitment to Fairness</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            At PingStack, we believe in transparent billing and fair policies. Our refund guidelines are designed to be straightforward and equitable for both our customers and our platform.
          </p>
        </div>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Eligibility Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-[0_4px_12px_rgba(0,0,0,0.02)] relative group hover:border-black transition-all">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                   <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-black text-gray-900 mb-2">7-Day Cooling Period</h4>
                <p className="text-xs text-gray-500 leading-relaxed">New subscribers are eligible for a full refund within the first 7 days of their initial purchase.</p>
             </div>
             <div className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-[0_4px_12px_rgba(0,0,0,0.02)] relative group hover:border-black transition-all">
                <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center mb-4 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white">
                   <Zap className="w-5 h-5" />
                </div>
                <h4 className="font-black text-gray-900 mb-2">Usage Cap</h4>
                <p className="text-xs text-gray-500 leading-relaxed">To prevent abuse, refunds are only valid if the account has sent fewer than 100 messages total.</p>
             </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Non-Refundable Items</h2>
          <p className="text-sm text-gray-500">Certain costs are passed directly to third parties or are results of active usage and cannot be recovered:</p>
          <div className="space-y-3">
             <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center group">
                <div className="mr-4 opacity-40 group-hover:opacity-100 transition-opacity">
                   <Shield className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-700">Meta Conversation Fees (Directly paid to Facebook)</p>
             </div>
             <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center group">
                <div className="mr-4 opacity-40 group-hover:opacity-100 transition-opacity">
                   <Shield className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-700">Add-on credits already consumed for broadcasts</p>
             </div>
          </div>
        </section>

        <div className="bg-black rounded-[2.5rem] p-10 text-center relative overflow-hidden shadow-2xl">
           <div className="absolute inset-0 bg-blue-600/10 pointer-events-none" />
           <h3 className="text-xl font-black text-white mb-4 relative z-10 tracking-tight">How to Initiate a Refund</h3>
           <p className="text-gray-400 text-sm mb-8 relative z-10 leading-relaxed">
             If you meet the eligibility criteria, please contact our billing team with your Transaction ID at <span className="text-blue-400 font-bold">billing@pingstack.in</span>. 
             Requests are typically processed within 48 business hours.
           </p>
           <Link href="/contact" className="inline-flex items-center px-8 py-3 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 relative z-10">
              Contact Billing Support
           </Link>
        </div>
      </div>
    )
  },
  'managing-subscriptions': {
    title: 'Managing Subscriptions & Billing',
    category: 'Billing & Security',
    readTime: '5 min',
    content: (
      <div className="space-y-10 selection:bg-blue-100">
        <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <Zap className="w-20 h-20 text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-4 tracking-tight text-white">The Billing Command Center</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Every PingStack account features a central **Plan & Usage** card on the main dashboard. This is your mission control for monitoring account health, limits, and billing status in real-time.
            </p>
          </div>
        </div>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             Tracking Your Usage
          </h2>
          <p className="text-sm text-gray-500">Your Dashboard provides two critical progress bars to help you stay within your plan's operational limits:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-6 border border-gray-100 rounded-3xl group hover:border-blue-600 transition-all">
                <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">
                   <Activity className="w-3 h-3" />
                   <span>Daily Campaigns</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">Resets every 24 hours. If you reach your limit, your engine will queue messages for the next cycle.</p>
             </div>
             <div className="p-6 border border-gray-100 rounded-3xl group hover:border-green-600 transition-all">
                <div className="flex items-center space-x-2 text-[10px] font-black text-green-600 uppercase tracking-widest mb-3">
                   <Users className="w-3 h-3" />
                   <span>Total Contacts</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">The maximum number of unique customers stored in your account across all groups.</p>
             </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             The Upgrade Workflow
          </h2>
          <div className="space-y-6">
             <div className="flex group">
                <div className="mr-6 flex flex-col items-center">
                   <div className="w-10 h-10 border-2 border-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover:border-black group-hover:text-black transition-all">1</div>
                   <div className="w-px h-full bg-gray-100 mt-2" />
                </div>
                <div className="pb-8">
                   <p className="font-bold text-gray-900">Initiate</p>
                   <p className="text-sm text-gray-500 mt-1">On the **Dashboard**, find the **Plan & Usage** card and click the **"Upgrade Plan"** link. This will open the high-level Tier selection page.</p>
                </div>
             </div>
             <div className="flex group">
                <div className="mr-6 flex flex-col items-center">
                   <div className="w-10 h-10 border-2 border-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover:border-black group-hover:text-black transition-all">2</div>
                   <div className="w-px h-full bg-gray-100 mt-2" />
                </div>
                <div className="pb-8">
                   <p className="font-bold text-gray-900">Select Tier</p>
                   <p className="text-sm text-gray-500 mt-1">Review the features for **Growth** or **Pro**. Click **"Upgrade Plan"** on your chosen tier to trigger the secure payment gateway.</p>
                </div>
             </div>
             <div className="flex group">
                <div className="mr-6 flex flex-col items-center">
                   <div className="w-10 h-10 border-2 border-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover:border-black group-hover:text-black transition-all">3</div>
                </div>
                <div>
                   <p className="font-bold text-gray-900">Razorpay Checkout</p>
                   <p className="text-sm text-gray-500 mt-1">Complete your transaction via **Razorpay**. We support Credit/Debit Cards, UPI, and Netbanking. Once confirmed, your account limits are increased **instantly**.</p>
                </div>
             </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Cancellations & Rights</h2>
          <div className="p-8 border border-gray-100 rounded-[2.5rem] bg-gray-50/50">
             <div className="flex items-center space-x-3 mb-4">
                <XCircle className="w-5 h-5 text-red-500" />
                <h4 className="font-bold text-gray-900">Self-Service Cancellation</h4>
             </div>
             <p className="text-sm text-gray-500 leading-relaxed mb-6">
               You can cancel your subscription at any time directly from the **Dashboard**. There are no hidden fees or complex support tickets required.
             </p>
             <div className="bg-white p-6 rounded-3xl border border-gray-100 italic-none">
                <div className="flex items-center text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
                   <Info className="w-3 h-3 mr-2" />
                   <span>Retained Access Rule</span>
                </div>
                <p className="text-xs text-gray-500">Upon cancellation, your premium features remain active until the very last day of your current billing period. No credits or time are lost.</p>
             </div>
          </div>
        </section>

        <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex items-start">
           <div className="bg-amber-100 p-2.5 rounded-2xl mr-5 shrink-0">
              <Shield className="w-6 h-6 text-amber-600" />
           </div>
           <div>
              <p className="font-black text-amber-900 text-sm uppercase tracking-tight mb-2">Payment Security</p>
              <p className="text-xs text-amber-800/80 leading-relaxed">
                PingStack does not store your full Credit Card details. All transactions are handled by **Razorpay**, a PCI-DSS Level 1 compliant processor. Your payment data is never exposed to our internal servers.
              </p>
           </div>
        </div>
      </div>
    )
  },
  'data-encryption': {
    title: 'Data Encryption Policy',
    category: 'Billing & Security',
    readTime: '4 min',
    content: (
      <div className="space-y-10 selection:bg-blue-100">
        <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <Lock className="w-20 h-20 text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-4 tracking-tight text-white">Security First Architecture</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              PingStack is engineered with a "Zero Trust" philosophy. We assume all infrastructure is public and protect your data with multiple layers of military-grade encryption from the moment it enters our ecosystem.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
          <div className="flex items-center space-x-3 text-green-600">
            <ShieldCheck className="w-6 h-6 shadow-sm" />
            <span className="font-black uppercase tracking-widest text-xs">Verified Secure</span>
          </div>
          <div className="space-y-4">
             <div className="flex items-start">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">**AES-256 Symmetric Encryption**: All Meta API Access Tokens are encrypted at rest. We never store raw credentials in our database.</p>
             </div>
             <div className="flex items-start">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">**TLS 1.3 Transport Security**: Every packet moving between your browser, our servers, and Meta's infrastructure is protected by modern SSL protocols.</p>
             </div>
          </div>
        </div>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             Data Storage & At-Rest Policy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-6 border border-gray-100 rounded-3xl group hover:border-black transition-all">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 group-hover:bg-black group-hover:text-white transition-colors">
                   <Server className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-tight">PostgreSQL Isolation</h4>
                <p className="text-xs text-gray-500 leading-relaxed">We utilize Row Level Security (RLS) to ensure that your data is logically isolated. A tenant can never query or view another user's records.</p>
             </div>
             <div className="p-6 border border-gray-100 rounded-3xl group hover:border-black transition-all">
                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 group-hover:bg-black group-hover:text-white transition-colors">
                   <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-tight">Key Rotation</h4>
                <p className="text-xs text-gray-500 leading-relaxed">Encryption keys for sensitive tokens are rotated periodically and stored in a secure, hardware-isolated environment.</p>
             </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             Network & Infrastructure
          </h2>
          <div className="space-y-4">
             <div className="p-6 bg-white border border-gray-100 rounded-3xl flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors">
                      <Globe className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-gray-900">End-to-End SSL</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">SHA-256 with RSA Encryption</p>
                   </div>
                </div>
                <div className="hidden sm:block">
                   <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase tracking-tighter shadow-sm border border-green-100">Active protection</span>
                </div>
             </div>
          </div>
        </section>

        <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-start">
           <div className="bg-blue-100 p-2.5 rounded-2xl mr-5 shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
           </div>
           <div>
              <p className="font-black text-blue-900 text-sm uppercase tracking-tight mb-2">GDPR & Compliance</p>
              <p className="text-xs text-blue-800/80 leading-relaxed italic-none">
                All data is processed in accordance with global privacy regulations. We utilize SOC 2 Type II and ISO 27001 certified data centers to host our messaging core.
              </p>
           </div>
        </div>
      </div>
    )
  }
};

export default function ArticlePage() {
  const { slug } = useParams();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const article = DOCS_CONTENT[slug as string];

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
          <p className="text-gray-500 font-medium mb-8">Article not found.</p>
          <Link href="/docs" className="text-blue-600 font-bold hover:underline">Return to Docs</Link>
        </div>
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: `Check out this article on PingStack: ${article.title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.push('/docs')}
            className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to documents
          </button>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleCopyLink}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
              title="Copy link"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
              title="Share article"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-gray-50 py-16 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center space-x-2 text-xs font-black text-blue-600 uppercase tracking-widest mb-4">
            <span>Docs</span>
            <span>/</span>
            <span>{article.category}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight mb-8 leading-[1.1]">
            {article.title}
          </h1>
          <div className="flex items-center space-x-6 text-sm font-medium text-gray-400">
            <a href="mailto:info@pingstack.in" className="flex items-center hover:text-blue-600 transition-colors">
              <User className="w-4 h-4 mr-2" />
              <span>PingStack Team</span>
            </a>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>{article.readTime} read</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16">
        <article className="max-w-3xl mx-auto px-6 prose prose-blue prose-p:text-gray-600 prose-headings:text-gray-900 prose-headings:font-black prose-a:text-blue-600 hover:prose-a:underline">
          {article.content}
        </article>
      </main>

      {/* Footer / Feedback */}
      <footer className="max-w-3xl mx-auto px-6 pb-20 mt-12">
        <div className="pt-12 border-t border-gray-100">
          <div className="bg-gray-900 rounded-[3rem] p-10 text-center relative overflow-hidden group">
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-600/10 to-transparent" />
            <h3 className="text-2xl font-black text-white mb-4 relative z-10">Was this article helpful?</h3>
            <div className="flex items-center justify-center space-x-4 relative z-10">
              <button className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-sm font-bold transition-all border border-white/5">
                Yes, helped!
              </button>
              <button className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl text-sm font-bold transition-all border border-white/5">
                Not really
              </button>
            </div>
            <Link href="/contact" className="mt-8 flex items-center justify-center mx-auto space-x-2 text-blue-400 text-sm font-bold hover:text-blue-300 transition-colors relative z-10">
              <MessageSquare className="w-4 h-4" />
              <span>Talk to an expert</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
