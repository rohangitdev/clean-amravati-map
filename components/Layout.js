import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children, observations = [] }) {
  const router = useRouter();
  const severeCount = observations.filter((o) => o.severity >= 4).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5C4.96 1.5 2.5 3.96 2.5 7C2.5 10.04 4.96 12.5 8 12.5C11.04 12.5 13.5 10.04 13.5 7C13.5 3.96 11.04 1.5 8 1.5ZM8 11.5C5.51 11.5 3.5 9.49 3.5 7C3.5 4.51 5.51 2.5 8 2.5C10.49 2.5 12.5 4.51 12.5 7C12.5 9.49 10.49 11.5 8 11.5Z" fill="white"/>
                <circle cx="8" cy="7" r="2" fill="white"/>
                <path d="M8 11.5V14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif' }} className="font-bold text-slate-800 text-base tracking-tight">
              Clean <span className="text-green-600">Amravati</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                router.pathname === '/dashboard' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}>
              Map
            </Link>
            <Link href="/leaderboard"
  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    router.pathname === '/leaderboard' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  }`}>
  🏆 Leaderboard
</Link>
            <Link href="/report"
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5V12.5M1.5 7H12.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Report
            </Link>
          </nav>
        </div>

        {severeCount > 0 && (
          <div className="bg-red-50 border-t border-red-100 px-4 py-1.5 text-center">
            <span className="text-red-600 text-xs font-medium">
              ⚠ {severeCount} severe report{severeCount > 1 ? 's' : ''} active
            </span>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50">
        <Link href="/dashboard"
          className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium ${
            router.pathname === '/dashboard' ? 'text-green-600' : 'text-slate-500'
          }`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="7" height="7" rx="1.5" fill={router.pathname === '/dashboard' ? '#16a34a' : '#94a3b8'} />
            <rect x="11" y="2" width="7" height="7" rx="1.5" fill={router.pathname === '/dashboard' ? '#16a34a' : '#94a3b8'} />
            <rect x="2" y="11" width="7" height="7" rx="1.5" fill={router.pathname === '/dashboard' ? '#16a34a' : '#94a3b8'} />
            <rect x="11" y="11" width="7" height="7" rx="1.5" fill={router.pathname === '/dashboard' ? '#16a34a' : '#94a3b8'} />
          </svg>
          Dashboard
        </Link>
        <Link href="/report" className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center -mt-5 shadow-lg border-4 border-white">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2V16M2 9H16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-green-600 font-semibold">Report</span>
        </Link>
      </div>
    </div>
  );
}
