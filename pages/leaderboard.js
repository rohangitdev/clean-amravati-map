import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';

const TOTAL_WARDS = 39;

function calcCityScore(data) {
  if (!data.length) return { total: 0, breakdown: { participation: 0, resolution: 0, coverage: 0, severity: 0 } };
  const total = data.length;
  const resolved = data.filter(o => o.status === 'resolved').length;
  const wards = new Set(data.map(o => o.ward).filter(Boolean)).size;
  const low = data.filter(o => o.severity === 'low').length;
  return {
    total: Math.min(30, Math.round((total / 100) * 30)) + Math.round((resolved / total) * 40) + Math.round((wards / TOTAL_WARDS) * 20) + Math.round((low / total) * 10),
    breakdown: {
      participation: Math.min(30, Math.round((total / 100) * 30)),
      resolution: Math.round((resolved / total) * 40),
      coverage: Math.round((wards / TOTAL_WARDS) * 20),
      severity: Math.round((low / total) * 10),
    },
  };
}

export default function Leaderboard() {
  const [wardStats, setWardStats] = useState([]);
  const [score, setScore] = useState({ total: 0, breakdown: { participation: 0, resolution: 0, coverage: 0, severity: 0 } });
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('observations').select('ward, severity, status');
      if (!data) { setLoading(false); return; }
      setTotalReports(data.length);
      setScore(calcCityScore(data));
      const map = {};
      data.forEach(({ ward, severity, status }) => {
        const w = ward || 'Unknown';
        if (!map[w]) map[w] = { total: 0, resolved: 0, low: 0, medium: 0, high: 0 };
        map[w].total++;
        if (status === 'resolved') map[w].resolved++;
        if (severity && map[w][severity] !== undefined) map[w][severity]++;
      });
      setWardStats(Object.entries(map).map(([ward, s]) => ({ ward, ...s, resPct: Math.round((s.resolved / s.total) * 100) })).sort((a, b) => b.total - a.total));
      setLoading(false);
    }
    load();
  }, []);

  const maxReports = wardStats[0]?.total || 1;
  const scoreColor = score.total >= 70 ? '#16a34a' : score.total >= 40 ? '#d97706' : '#dc2626';
  const scoreLabel = score.total >= 70 ? 'Good' : score.total >= 40 ? 'Moderate' : 'Needs Improvement';

  return (
    <>
      <Head><title>Leaderboard · Clean Amravati</title></Head>
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-7">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading leaderboard…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-7" style={{ border: `2px solid ${scoreColor}` }}>
                <h2 className="text-lg font-bold text-slate-800 mb-1">🏆 Swachh Survekshan City Score</h2>
                <p className="text-slate-500 text-sm mb-5">Based on {totalReports} citizen report{totalReports !== 1 ? 's' : ''}</p>
                <div className="flex gap-8 flex-wrap items-start">
                  <div className="flex flex-col items-center gap-1 min-w-[90px]">
                    <span className="font-extrabold leading-none" style={{ fontSize: 72, color: scoreColor }}>{score.total}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                    <span className="mt-1 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: scoreColor + '22', color: scoreColor }}>{scoreLabel}</span>
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-3">
                    {[
                      { label: 'Citizen Engagement', val: score.breakdown.participation, max: 30, color: '#3b82f6' },
                      { label: 'Resolution Rate', val: score.breakdown.resolution, max: 40, color: '#22c55e' },
                      { label: 'Ward Coverage', val: score.breakdown.coverage, max: 20, color: '#f59e0b' },
                      { label: 'Low Severity Share', val: score.breakdown.severity, max: 10, color: '#8b5cf6' },
                    ].map(({ label, val, max, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>{label}</span><span className="font-bold">{val} / {max}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(val / max) * 100}%`, background: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-800 mb-1">📊 Ward Leaderboard</h2>
              <p className="text-slate-500 text-sm mb-4">Ranked by civic engagement — most reports first</p>

              {wardStats.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-slate-400">No reports yet.</div>
              ) : (
                <div className="space-y-3">
                  {wardStats.map((w, i) => (
                    <div key={w.ward} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
                      style={{ border: i < 3 ? '1px solid #86efac' : '1px solid #e5e7eb' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: i === 0 ? '#fef08a' : i === 1 ? '#e5e7eb' : i === 2 ? '#fed7aa' : '#f3f4f6', color: i === 0 ? '#854d0e' : i === 1 ? '#374151' : i === 2 ? '#7c2d12' : '#9ca3af' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-slate-800">{w.ward}</span>
                          <span className="font-bold text-green-700">{w.total} reports</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-green-700 rounded-full" style={{ width: `${(w.total / maxReports) * 100}%` }} />
                        </div>
                        <div className="flex gap-2 flex-wrap items-center">
                          <span className="text-xs text-slate-500">✅ {w.resolved} resolved ({w.resPct}%)</span>
                          {w.high > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#fee2e2', color: '#ef4444' }}>{w.high} high</span>}
                          {w.medium > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#fef3c7', color: '#f59e0b' }}>{w.medium} med</span>}
                          {w.low > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#dcfce7', color: '#22c55e' }}>{w.low} low</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </>
  );
}