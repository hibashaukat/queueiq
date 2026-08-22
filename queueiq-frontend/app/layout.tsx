import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QueueIQ — Book your spot only to be there, When its your turn',
  description: 'AI-powered real-time queue management.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#111827] text-white antialiased`}>{children}</body>
    </html>
  );
}
