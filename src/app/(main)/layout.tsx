'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, BarChart2, Users, UtensilsCrossed } from 'lucide-react';

const navItems = [
  { href: '/',            icon: Home,            label: 'Home' },
  { href: '/leaderboard', icon: BarChart2,        label: 'Leaderboard' },
  { href: '/pantry',      icon: UtensilsCrossed,  label: 'Pantry' },
  { href: '/community',   icon: Users,            label: 'Community' },
  { href: '/profile',     icon: CheckSquare,      label: 'Profile' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Page content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom navigation bar (mobile-first, matching wireframe) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-40">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition ${
                active ? 'text-green-600' : 'text-gray-400 hover:text-green-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
