import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const font = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'PingStack | Enterprise WhatsApp Notifications',
  description: 'Send WhatsApp notifications reliably at scale with the PingStack API and Dashboard.',
};

import Script from 'next/script';
import TimezoneSync from '@/components/TimezoneSync';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${font.variable} font-sans antialiased text-gray-900 min-h-screen`}>
        <TimezoneSync />
        {children}
        <Script 
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          defer
        />
      </body>
    </html>
  );
}
