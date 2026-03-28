import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import { supabase } from '../lib/supabaseClient';
import { formatEffort } from '../lib/effortEstimation';

export default function Dashboard() {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchObservations = useCallback(async () => {
    const { data, error } = await supabase
      .from('observations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setObservations(data.map(row => ({
        id:              row.id,
        photo:           row.photo_url,
        photo_url:       row.photo_url,
        latitude:        row.latitude,
        longitude:       row.longitude,
        ward:            row.ward,
        severity:        row.severity,
        notes:           row.notes,
        timestamp:       row.created_at,
        created_at:      row.created_at,
        // Cleanup flow fields
        status:          row.status          ?? 'open',
        cleaned_at:      row.cleaned_at      ?? null,
        cleaned_by:      row.cleaned_by      ?? null,
        after_photo_url: row.after_photo_url ?? null,
        // Effort estimation
        effort_hours:    row.effort_hours    ?? null,
        effort_notes:    row.effort_notes    ?? null,
      })));
    }
    setLoading(false);
  }, []);

  // Delete an observation from Supabase + local state
  const handleDelete = useCallback(async (id) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;

    const { error } = await supabase
      .from('observations')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Failed to delete: ' + error.message);
    } else {
      setObservations(prev => prev.filter(o => o.id !== id));
    }
  }, []);

  useEffect(() => {
    fetchObservations();

    // Realtime: re-fetch on any change
    const channel = supabase
      .channel('observations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'observations' }, () => {
        fetchObservations();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchObservations]);

  const openReports = observations.filter((o) => o.status !== 'cleaned');
  const totalEffortHours = openReports.reduce((sum, o) => sum + (o.effort_hours || 0), 0);
  const roundedTotal = Math.round(totalEffortHours * 10) / 10;

  return (
    <>
      <Head>
        <title>Clean Amravati Map</title>
      </Head>
      <Layout observations={observations}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading map data…</p>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full">
            {roundedTotal > 0 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                <div className="bg-white/95 backdrop-blur-sm border border-amber-200 shadow-md rounded-full px-4 py-2 flex items-center gap-2 text-sm whitespace-nowrap">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="6.5" stroke="#d97706" strokeWidth="1.3"/>
                    <path d="M7.5 4V7.5L9.5 9.5" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <span className="font-semibold text-amber-800">
                    {formatEffort(roundedTotal)} of cleanup needed
                  </span>
                  <span className="text-slate-400">across {openReports.length} open report{openReports.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
            <MapView
              observations={observations}
              onDelete={handleDelete}
              onCleaned={fetchObservations}
            />
          </div>
        )}
      </Layout>
    </>
  );
}
