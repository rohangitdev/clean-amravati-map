'use client';
import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { LangContext } from '@/context/LangContext';

// ── Amravati has 39 wards ────────────────────────────────────────────────────
const TOTAL_WARDS = 39;

const SEV_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };
const SEV_BG     = { low: '#dcfce7', medium: '#fef3c7', high: '#fee2e2' };

// ── Swachh Survekshan–style score (out of 100) ───────────────────────────────
function calcCityScore(data) {
  if (!data.length) return { total: 0, breakdown: { participation: 0, resolution: 0, coverage: 0, severity: 0 } };

  const total    = data.length;
  const resolved = data.filter(o => o.status === 'resolved').length;
  const wards    = new Set(data.map(o => o.ward).filter(Boolean)).size;
  const low      = data.filter(o => o.severity === 'low').length;

  // 30 pts – Citizen Engagement  (caps at 100 reports = full marks)
  const participation = Math.min(30, Math.round((total / 100) * 30));
  // 40 pts – Resolution Rate
  const resolution    = Math.round((resolved / total) * 40);
  // 20 pts – Ward Coverage
  const coverage      = Math.round((wards / TOTAL_WARDS) * 20);
  // 10 pts – Mostly low-severity issues
  const severity      = Math.round((low / total) * 10);

  return {
    total: participation + resolution + coverage + severity,
    breakdown: { participation, resolution, coverage, severity },
  };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const ctx       = useContext(LangContext);
  const isMarathi = ctx?.lang === 'mr';

  // inline bilingual helper — falls back gracefully if LangContext not ready
  const tx = (en, mr) => (isMarathi ? mr : en);

  const [wardStats,    setWardStats]    = useState([]);
  const [score,        setScore]        = useState({ total: 0, breakdown: { participation: 0, resolution: 0, coverage: 0, severity: 0 } });
  const [totalReports, setTotalReports] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('observations')
        .select('ward, severity, status, created_at');

      if (error) { setError(error.message); setLoading(false); return; }
      if (!data)  { setLoading(false); return; }

      setTotalReports(data.length);
      setScore(calcCityScore(data));

      // Aggregate by ward
      const map = {};
      data.forEach(({ ward, severity, status }) => {
        const w = ward || 'Unknown';
        if (!map[w]) map[w] = { total: 0, resolved: 0, low: 0, medium: 0, high: 0 };
        map[w].total++;
        if (status === 'resolved')                    map[w].resolved++;
        if (severity && map[w][severity] !== undefined) map[w][severity]++;
      });

      setWardStats(
        Object.entries(map)
          .map(([ward, s]) => ({
            ward,
            ...s,
            resPct: Math.round((s.resolved / s.total) * 100),
          }))
          .sort((a, b) => b.total - a.total)   // most reports = most engaged = top
      );
      setLoading(false);
    }
    load();
  }, []);

  const maxReports  = wardStats[0]?.total || 1;
  const scoreColor  = score.total >= 70 ? '#16a34a' : score.total >= 40 ? '#d97706' : '#dc2626';
  const scoreLabel  = score.total >= 70
    ? tx('Good', 'चांगले')
    : score.total >= 40
    ? tx('Moderate', 'मध्यम')
    : tx('Needs Improvement', 'सुधारणा आवश्यक');

  // ── Render: loading / error ─────────────────────────────────────────────────
  if (loading) return (
    <div style={styles.centeredPage}>
      <p style={{ color: '#166534', fontFamily: 'system-ui' }}>
        {tx('Loading leaderboard…', 'लीडरबोर्ड लोड होत आहे…')}
      </p>
    </div>
  );

  if (error) return (
    <div style={styles.centeredPage}>
      <p style={{ color: '#dc2626', fontFamily: 'system-ui' }}>⚠️ {error}</p>
    </div>
  );

  // ── Render: main ────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={styles.nav}>
        <span style={styles.navBrand}>🗺️ {tx('Clean Amravati', 'स्वच्छ अमरावती')}</span>
        <div style={styles.navLinks}>
          <Link href="/dashboard" style={styles.navLink}>{tx('Map', 'नकाशा')}</Link>
          <Link href="/report"    style={styles.navLink}>{tx('Report', 'रिपोर्ट')}</Link>
          <span style={styles.navActive}>{tx('Leaderboard', 'लीडरबोर्ड')}</span>
        </div>
      </nav>

      <div style={styles.content}>

        {/* ── Swachh Survekshan Score Card ──────────────────────────────── */}
        <div style={{ ...styles.card, border: `2px solid ${scoreColor}` }}>
          <h2 style={styles.cardTitle}>
            🏆 {tx('Swachh Survekshan City Score', 'स्वच्छ सर्वेक्षण नगर गुण')}
          </h2>
          <p style={styles.subtitle}>
            {tx(
              `Based on ${totalReports} citizen report${totalReports !== 1 ? 's' : ''}`,
              `${totalReports} नागरिक अहवालांवर आधारित`
            )}
          </p>

          <div style={styles.scoreRow}>
            {/* Big number */}
            <div style={styles.scoreBig}>
              <span style={{ fontSize: 72, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {score.total}
              </span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{tx('/ 100', '/ १००')}</span>
              <span style={{ ...styles.scoreBadge, background: scoreColor + '22', color: scoreColor }}>
                {scoreLabel}
              </span>
            </div>

            {/* Breakdown bars */}
            <div style={{ flex: 1, minWidth: 220 }}>
              {[
                { label: tx('Citizen Engagement',  'नागरिक सहभाग'),    val: score.breakdown.participation, max: 30, color: '#3b82f6' },
                { label: tx('Resolution Rate',     'निराकरण दर'),       val: score.breakdown.resolution,    max: 40, color: '#22c55e' },
                { label: tx('Ward Coverage',       'वॉर्ड कव्हरेज'),    val: score.breakdown.coverage,      max: 20, color: '#f59e0b' },
                { label: tx('Low Severity Share',  'कमी तीव्रता वाटा'), val: score.breakdown.severity,      max: 10, color: '#8b5cf6' },
              ].map(({ label, val, max, color }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={styles.barLabel}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 700 }}>{val} / {max}</span>
                  </div>
                  <div style={styles.barBg}>
                    <div style={{ ...styles.barFill, width: `${(val / max) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Ward Leaderboard ──────────────────────────────────────────── */}
        <h2 style={styles.sectionTitle}>
          📊 {tx('Ward Leaderboard', 'वॉर्ड लीडरबोर्ड')}
        </h2>
        <p style={styles.sectionNote}>
          {tx(
            'Ranked by civic engagement — most reports first',
            'नागरिक सहभागानुसार क्रमवारी — सर्वाधिक अहवाल प्रथम'
          )}
        </p>

        {wardStats.length === 0 ? (
          <div style={styles.empty}>
            {tx('No reports yet. Start reporting!', 'अद्याप अहवाल नाही. रिपोर्ट करा!')}
          </div>
        ) : (
          <div style={styles.list}>
            {wardStats.map((w, i) => (
              <div key={w.ward} style={{
                ...styles.wardCard,
                border: i < 3 ? '1px solid #86efac' : '1px solid #e5e7eb',
              }}>
                {/* Rank badge */}
                <div style={{
                  ...styles.rankBadge,
                  background: i === 0 ? '#fef08a' : i === 1 ? '#e5e7eb' : i === 2 ? '#fed7aa' : '#f3f4f6',
                  color:      i === 0 ? '#854d0e' : i === 1 ? '#374151' : i === 2 ? '#7c2d12' : '#9ca3af',
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Row 1: ward name + count */}
                  <div style={styles.wardRow}>
                    <span style={styles.wardName}>{w.ward}</span>
                    <span style={styles.wardCount}>
                      {w.total} {tx('reports', 'अहवाल')}
                    </span>
                  </div>

                  {/* Engagement bar */}
                  <div style={{ ...styles.barBg, marginBottom: 8 }}>
                    <div style={{ ...styles.barFill, width: `${(w.total / maxReports) * 100}%`, background: '#15803d' }} />
                  </div>

                  {/* Row 2: resolution + severity pills */}
                  <div style={styles.pillRow}>
                    <span style={styles.resolvedText}>
                      ✅ {w.resolved} {tx('resolved', 'सोडवलेले')} ({w.resPct}%)
                    </span>
                    {(['high', 'medium', 'low']).map(sev =>
                      w[sev] > 0 && (
                        <span key={sev} style={{ ...styles.pill, background: SEV_BG[sev], color: SEV_COLORS[sev] }}>
                          {w[sev]}{' '}
                          {sev === 'high'   ? tx('high',   'उच्च')
                            : sev === 'medium' ? tx('med',    'मध्यम')
                            :                   tx('low',    'कमी')}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={styles.footer}>
          {tx(
            'Clean Amravati Map · Data updated in real-time',
            'स्वच्छ अमरावती नकाशा · डेटा रिअल-टाइम अपडेट'
          )}
        </p>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f0fdf4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  centeredPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0fdf4',
  },
  nav: {
    background: '#15803d',
    color: '#fff',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  navBrand: { fontWeight: 700, fontSize: 16, marginRight: 4 },
  navLinks: { display: 'flex', gap: 20, alignItems: 'center' },
  navLink:  { color: '#d1fae5', textDecoration: 'none', fontSize: 14 },
  navActive: { color: '#fff', fontSize: 14, fontWeight: 700, borderBottom: '2px solid #fff', paddingBottom: 2 },
  content: { maxWidth: 820, margin: '0 auto', padding: '28px 16px' },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '24px 24px 20px',
    marginBottom: 28,
    boxShadow: '0 2px 14px rgba(0,0,0,0.07)',
  },
  cardTitle:   { margin: '0 0 4px', color: '#166534', fontSize: 20, fontWeight: 700 },
  subtitle:    { margin: '0 0 20px', color: '#6b7280', fontSize: 13 },
  scoreRow:    { display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-start' },
  scoreBig:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 110 },
  scoreBadge:  { marginTop: 4, padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  barLabel:    { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 4 },
  barBg:       { height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 4, transition: 'width 0.8s ease' },
  sectionTitle: { color: '#166534', fontSize: 20, fontWeight: 700, margin: '0 0 6px' },
  sectionNote:  { color: '#6b7280', fontSize: 13, margin: '0 0 16px' },
  empty: {
    background: '#fff',
    borderRadius: 12,
    padding: 32,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 15,
  },
  list:     { display: 'flex', flexDirection: 'column', gap: 10 },
  wardCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '14px 16px',
    boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  rankBadge: {
    width: 36, height: 36,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14,
    flexShrink: 0,
  },
  wardRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  wardName:  { fontWeight: 600, color: '#111827', fontSize: 15 },
  wardCount: { fontWeight: 700, color: '#15803d', fontSize: 15 },
  pillRow:   { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  resolvedText: { fontSize: 12, color: '#6b7280' },
  pill: { fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 },
  footer: { marginTop: 28, color: '#9ca3af', fontSize: 12, textAlign: 'center' },
};
