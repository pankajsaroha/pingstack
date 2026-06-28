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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const theme = localStorage.getItem('theme');
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (_) {}
          })()
        `}} />
      </head>
      <body className={`${font.variable} font-sans antialiased text-fg bg-bg min-h-screen`}>
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
