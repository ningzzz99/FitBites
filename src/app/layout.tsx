import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FitBites',
  description: 'Build healthy habits, one day at a time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-black" suppressHydrationWarning>{children}</body>
    </html>
  );
}
