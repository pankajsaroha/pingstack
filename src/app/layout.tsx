import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PingStack | WhatsApp SaaS',
  description: 'Multi-tenant WhatsApp campaign manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased selection:bg-blue-100 selection:text-blue-900 bg-gray-50 text-gray-900`}>
        {children}
        <script async defer crossOrigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>
      </body>
    </html>
  );
}
