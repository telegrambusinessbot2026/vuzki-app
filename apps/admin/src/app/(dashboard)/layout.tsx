'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AdminGuard from '@/components/shell/AdminGuard';
import { useAdmin } from '@/lib/store';
import {
  Grid,
  Users,
  Star,
  Shield,
  Wallet,
  FileText,
  Dollar,
  Bell,
  Clock,
  Settings,
  Logout,
} from '@/components/icons';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Grid },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/creators', label: 'Creators', icon: Star },
  { href: '/reports', label: 'Reports', icon: Shield },
  { href: '/payments', label: 'Payments', icon: Wallet },
  { href: '/withdrawals', label: 'Withdrawals', icon: FileText },
  { href: '/finance', label: 'Finance', icon: Dollar },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/audit', label: 'Audit Log', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAdmin();
  const router = useRouter();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#0a0a0f]">
        <aside className="fixed left-0 top-0 h-screen w-60 bg-[#111118] border-r border-[#2a2a37] flex flex-col">
          <div className="flex items-center gap-2 px-5 py-5 border-b border-[#2a2a37]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-black text-white">
              V
            </div>
            <div>
              <p className="text-base font-bold leading-tight">VUZKI Admin</p>
              <p className="text-[11px] text-white/40">Dashboard</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 border-l-2 px-5 py-2.5 text-sm transition-colors ${
                    active
                      ? 'border-brand-500 bg-brand-600/20 text-brand-300 font-medium'
                      : 'border-transparent text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#2a2a37] p-4">
            <div className="flex items-center gap-3 rounded-lg bg-[#16161d] p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-600/25 text-sm font-bold text-brand-300">
                {session?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session?.name}</p>
                <p className="truncate text-[11px] text-brand-300">{session?.role}</p>
              </div>
              <button
                title="Logout"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Logout className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="ml-60 p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
