import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PingStack | WhatsApp SaaS',
  description: 'Multi-tenant WhatsApp campaign manager',
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
      <body className={`${inter.variable} font-sans antialiased selection:bg-blue-100 selection:text-blue-900 bg-gray-50 text-gray-900`}>
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
