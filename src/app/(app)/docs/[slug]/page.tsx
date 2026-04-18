'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Clock, User, Share2, MessageSquare, Copy, Check, Shield } from 'lucide-react';
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
    readTime: '6 min',
    content: (
      <div className="space-y-6">
        <p>Connecting your WhatsApp Business Account (WABA) manually allows for full control over your messaging infrastructure. This guide walks you through the Meta Business Manager setup.</p>
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">Steps to Connect</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li>Log in to the <a href="https://developers.facebook.com/" className="text-blue-600 hover:underline">Meta for Developers</a> portal.</li>
            <li>Create a new App and select "Business" as the type.</li>
            <li>Add "WhatsApp" to your app from the dashboard.</li>
            <li>Navigate to **WhatsApp {" > "} Setup** to find your Phone Number ID and WhatsApp Business Account ID.</li>
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
    readTime: '4 min',
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
    readTime: '3 min',
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
    readTime: '5 min',
    content: (
      <div className="space-y-6">
        <p>Campaigns allow you to send approved WhatsApp templates to large groups of contacts simultaneously. Follow these steps to launch your first sequence.</p>
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Workflow</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li>**Import Contacts**: Upload a CSV file in the "Contacts" section.</li>
            <li>**Create Group**: Organize your contacts into a logical segment (e.g., "April Promo").</li>
            <li>**Compose Campaign**: Go to Campaigns {" > "} New, select your group and a pre-approved template.</li>
            <li>**Map Variables**: If your template has code={`{ '{{1}}' }`}, map it to a contact field like "Name".</li>
            <li>**Execute**: Click "Launch" to start the broadcast.</li>
          </ol>
        </section>
      </div>
    )
  },
  'template-variables': {
    title: 'Template variables guide',
    category: 'Messaging API',
    readTime: '5 min',
    content: (
      <div className="space-y-6">
        <p>Variables make your messages personal and increase engagement. PingStack supports dynamic mapping of contact data into Meta templates.</p>
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Syntax Overview</h2>
          <p>Meta uses double curly braces for variables: <code>{`{{1}}`}</code>, <code>{`{{2}}`}</code>, etc. In PingStack, you can map these to any column in your contact bank.</p>
          <div className="bg-gray-900 text-gray-100 p-8 rounded-[2rem] font-mono text-sm leading-relaxed shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
               <Copy className="w-4 h-4" />
            </div>
            <p className="text-blue-400 mb-2"># Example Template Content</p>
            <p className="text-gray-300">Hi {`{{1}}`}! Your order #{`{{2}}`} is on the way.</p>
            <br />
            <p className="text-blue-400 mb-2"># In PingStack Mapper</p>
            <div className="space-y-1 text-gray-400">
               <p><span className="text-white">Variable 1</span> {" -> "} Column: Name</p>
               <p><span className="text-white">Variable 2</span> {" -> "} Column: OrderNumber</p>
            </div>
          </div>
        </section>
      </div>
    )
  },
  'delivery-status': {
    title: 'Handling delivery status',
    category: 'Messaging API',
    readTime: '3 min',
    content: (
      <div className="space-y-6">
        <p>Monitoring delivery status helps you clean your contact list and measure campaign ROI. PingStack captures real-time data from Meta webhooks.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <h4 className="font-bold text-gray-900 mb-2">Sent</h4>
            <p className="text-xs text-gray-500">The message has been accepted by Meta's servers.</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <h4 className="font-bold text-gray-900 mb-2">Delivered</h4>
            <p className="text-xs text-gray-500">The message has reached the user's device.</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <h4 className="font-bold text-gray-900 mb-2">Read</h4>
            <p className="text-xs text-gray-500">The user has opened the chat (if receipts are enabled).</p>
          </div>
        </div>
      </div>
    )
  },
  'refund-policy': {
    title: 'Refund Policy',
    category: 'Billing & Security',
    readTime: '2 min',
    content: (
      <div className="space-y-6">
        <p>We strive for customer satisfaction but have clear guidelines regarding payments and refunds.</p>
        <ul className="list-disc pl-6 space-y-4">
          <li>**Cancellation**: You can cancel your subscription at any time. You will retain access until the end of the billing period.</li>
          <li>**Eligibility**: Refunds are available within 7 days of the initial purchase if the platform has not been used to send more than 100 messages.</li>
          <li>**Meta Fees**: Please note that Meta's "per-conversation" fees are non-refundable as they are paid directly to Meta.</li>
        </ul>
      </div>
    )
  },
  'managing-subscriptions': {
    title: 'Managing subscriptions',
    category: 'Billing & Security',
    readTime: '3 min',
    content: (
      <div className="space-y-6">
        <p>Control your PingStack plan and usage from the central Billing Dashboard.</p>
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Key Actions</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 shrink-0 mt-1">1</div>
              <div>
                <p className="font-bold text-gray-900">Upgrade Plan</p>
                <p className="text-sm text-gray-500">Increase your contact capacity and campaign limits instantly.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 shrink-0 mt-1">2</div>
              <div>
                <p className="font-bold text-gray-900">Payment Methods</p>
                <p className="text-sm text-gray-500">Securely manage Credit Cards or Razorpay/Stripe profiles.</p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    )
  },
  'data-encryption': {
    title: 'Data Encryption policy',
    category: 'Billing & Security',
    readTime: '4 min',
    content: (
      <div className="space-y-6">
        <p>Security is our top priority. We use industry-standard protocols to protect your sensitive Meta credentials and user data.</p>
        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
          <div className="flex items-center space-x-3 text-green-600">
            <Shield className="w-5 h-5 shadow-sm" />
            <span className="font-bold uppercase tracking-wider text-xs">Verified Secure</span>
          </div>
          <p className="text-sm text-gray-600">All Meta API Access Tokens are encrypted using **AES-256 (Symmetric Encryption)** before being saved to our database. We never store tokens in plain text.</p>
          <p className="text-sm text-gray-600">Our servers utilize **TLS 1.3** for all data in transit, ensuring that your communication between PingStack and Meta remains private.</p>
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
