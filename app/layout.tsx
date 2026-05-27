import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Thorndon Tennis Club Day',
  description: 'Court allocation board for Thorndon Tennis Club',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-board-bg text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
