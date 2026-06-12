import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Thorndon Tennis Club Day',
  description: 'Court allocation board for Thorndon Tennis Club',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-board-bg text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
