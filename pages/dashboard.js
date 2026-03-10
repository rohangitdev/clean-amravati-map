import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import { supabase } from '../lib/supabaseClient';

const SEVERITY_LABELS = {
  1: 'Low', 2: 'Minor', 3: 'Moderate', 4: 'High', 5: 'Critical'
};

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
        id: row.id,
        photo: row.photo_url,
        latitude: row.latitude,
        longitude: row.longitude,
        ward: row.ward,
        severity: row.severity,
        notes: row.notes,
        timestamp: row.created_at,
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
          <MapView observations={observations} onDelete={handleDelete} />
        )}
      </Layout>
    </>
  );
}
