import dynamic from 'next/dynamic';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useObservations } from '../context/ObservationsContext';

// Load map client-side only (Leaflet requires window)
const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

const SEVERITY_COLORS = {
  1: { bg: '#dcfce7', color: '#16a34a', label: 'Low' },
  2: { bg: '#ecfccb', color: '#65a30d', label: 'Minor' },
  3: { bg: '#ffedd5', color: '#ea580c', label: 'Moderate' },
  4: { bg: '#fee2e2', color: '#dc2626', label: 'High' },
  5: { bg: '#fecaca', color: '#7f1d1d', label: 'Critical' },
};

function StatCard({ icon, value, label, sub, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: accent || '#f0fdf4' }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'Syne, sans-serif' }} className="text-2xl font-bold text-slate-800 leading-tight">
          {value}
        </div>
        <div className="text-xs font-medium text-slate-600">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { observations } = useObservations();

  // --- Stats ---
  const total = observations.length;
  const severeCount = observations.filter((o) => o.severity >= 4).length;

  // Ward with most reports
  const wardCounts = {};
  observations.forEach((o) => {
    wardCounts[o.ward] = (wardCounts[o.ward] || 0) + 1;
  });
  const topWard = Object.entries(wardCounts).sort((a, b) => b[1] - a[1])[0];

  // Severity breakdown
  const severityBreakdown = [1, 2, 3, 4, 5].map((s) => ({
    s,
    count: observations.filter((o) => o.severity === s).length,
  }));

  const maxSevCount = Math.max(...severityBreakdown.map((b) => b.count), 1);

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)]">

        {/* === LEFT PANEL: Map === */}
        <div className="flex-1 relative min-h-[50vh] lg:min-h-0">
          {total === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl px-6 py-4 text-center shadow-lg max-w-xs mx-4">
                <div className="text-3xl mb-2">🗺️</div>
                <p style={{ fontFamily: 'Syne, sans-serif' }} className="font-bold text-slate-700 text-sm mb-1">
                  No Reports Yet
                </p>
                <p className="text-slate-500 text-xs mb-3">Submit your first garbage report to see it on the map.</p>
                <Link
                  href="/report"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg pointer-events-auto hover:bg-green-700 transition-colors"
                >
                  + Add Report
                </Link>
              </div>
            </div>
          )}
          <MapView observations={observations} />
        </div>

        {/* === RIGHT PANEL: Summary === */}
        <div className="w-full lg:w-80 xl:w-96 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 style={{ fontFamily: 'Syne, sans-serif' }} className="font-bold text-slate-800 text-base">
              Summary
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Amravati Garbage Map · Live data</p>
          </div>

          <div className="p-4 space-y-3">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon="📍"
                value={total}
                label="Total Reports"
                sub="All wards"
                accent="#f0fdf4"
              />
              <StatCard
                icon="🔴"
                value={severeCount}
                label="Severe (4–5)"
                sub="Needs attention"
                accent={severeCount > 0 ? '#fee2e2' : '#f0fdf4'}
              />
            </div>

            {topWard && (
              <StatCard
                icon="🏘️"
                value={topWard[0]}
                label="Most Reports"
                sub={`${topWard[1]} report${topWard[1] > 1 ? 's' : ''}`}
                accent="#fef9c3"
              />
            )}

            {/* Severity breakdown */}
            {total > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                  Severity Breakdown
                </h3>
                <div className="space-y-2.5">
                  {severityBreakdown.map(({ s, count }) => {
                    const info = SEVERITY_COLORS[s];
                    const pct = count === 0 ? 0 : (count / maxSevCount) * 100;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div
                          style={{ background: info.bg, color: info.color }}
                          className="w-16 text-center py-0.5 rounded-md text-xs font-semibold flex-shrink-0"
                        >
                          S{s}
                        </div>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%`, background: info.color, transition: 'width 0.5s ease' }}
                            className="h-full rounded-full"
                          />
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xs text-slate-500 w-5 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent reports */}
            {total > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                  Recent Reports
                </h3>
                <div className="space-y-2.5">
                  {[...observations]
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 5)
                    .map((obs) => {
                      const info = SEVERITY_COLORS[obs.severity];
                      return (
                        <div key={obs.id} className="flex items-start gap-2.5">
                          {obs.photo ? (
                            <img
                              src={obs.photo}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-lg">
                              🗑️
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-slate-700">{obs.ward}</span>
                              <span
                                style={{ background: info.bg, color: info.color }}
                                className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                              >
                                S{obs.severity}
                              </span>
                            </div>
                            {obs.notes && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{obs.notes}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(obs.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Ward breakdown */}
            {total > 0 && Object.keys(wardCounts).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                  Ward Breakdown
                </h3>
                <div className="space-y-2">
                  {Object.entries(wardCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([ward, count]) => (
                      <div key={ward} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{ward}</span>
                        <span
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}
                          className="text-sm font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg"
                        >
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Map Legend
              </h3>
              <div className="space-y-1.5">
                {Object.entries(SEVERITY_COLORS).map(([s, info]) => (
                  <div key={s} className="flex items-center gap-2.5">
                    <div
                      style={{ background: info.color, width: 12, height: 12, borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}
                    />
                    <span className="text-xs text-slate-600">
                      <strong>S{s}</strong> — {info.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
