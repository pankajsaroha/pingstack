'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100 rotate-3">
             <span className="text-white font-black text-xl">P</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: March 19, 2026</p>
        </div>

        <div className="prose prose-blue max-w-none text-gray-600 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p>
              Welcome to PingStack ("we," "our," or "us"). We are committed to protecting your privacy and ensuring that your personal data is handled in a safe and responsible manner. This Privacy Policy outlines how we collect, use, and protect information when you use our WhatsApp SaaS platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <p>To provide our services, we may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong>Account Information:</strong> Name, email address, and password for your tenant account.</li>
              <li><strong>WhatsApp Business Data:</strong> Meta API tokens, Business IDs, and Phone Number IDs shared via Embedded Signup.</li>
              <li><strong>Message Content:</strong> We process and store messages sent and received through the platform to provide the Inbox and Campaign functionality.</li>
              <li><strong>Contact Information:</strong> Phone numbers and names of your customers/clients uploaded to our platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p>We use the collected data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Facilitating WhatsApp communication between you and your customers.</li>
              <li>Managing multi-tenant account isolation.</li>
              <li>Improving our platform's performance and user experience.</li>
              <li>Providing customer support and technical assistance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
            <p>
              We implement enterprise-grade security measures to protect your data. This includes symmetric encryption (AES-256) for all Meta API access tokens at rest and secure JWT-based authentication for all API access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Meta Platform Policy</h2>
            <p>
              Our application complies with the Meta Platform Policy. We do not share your WhatsApp data with third parties except as required to provide our core services or comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at support@pingstack.com.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 text-center">
          <Link href="/" className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
