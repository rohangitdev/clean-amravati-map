import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SEVERITY_COLORS = {
  1: '#22c55e',
  2: '#86efac',
  3: '#f97316',
  4: '#f87171',
  5: '#dc2626',
  low:       '#22c55e',
  medium:    '#f97316',
  high:      '#f87171',
  hazardous: '#7F1919',
};

const SEVERITY_LABELS = {
  1: 'Low',
  2: 'Minor',
  3: 'Moderate',
  4: 'High',
  5: 'Critical',
};

// ─── Cleaned marker icon (green pin) ────────────────────────────────────────
function makeIcon(L, color, isCleaned = false) {
  const size = isCleaned ? 18 : 14;
  const border = isCleaned ? '2.5px solid #fff' : '2px solid white';
  const extra = isCleaned
    ? `<div style="position:absolute;top:-6px;right:-6px;background:#1d9e75;color:#fff;border-radius:50%;width:12px;height:12px;font-size:9px;display:flex;align-items:center;justify-content:center;border:1px solid #fff">✓</div>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 1px 4px rgba(0,0,0,0.4);">${extra}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ─── Mark cleaned: swap icon + update popup ──────────────────────────────────
function markCleanedOnMap(L, markerRegistry, reportId, cleanedBy) {
  const entry = markerRegistry.current.get(reportId);
  if (!entry) return;
  const { marker, obs } = entry;
  const color = SEVERITY_COLORS[obs.severity] || '#f97316';
  marker.setIcon(makeIcon(L, '#1d9e75', true));
  markerRegistry.current.set(reportId, { marker, obs: { ...obs, status: 'cleaned', cleaned_by: cleanedBy } });
}

// ─── CleanedModal ────────────────────────────────────────────────────────────
function CleanedModal({ obs, onClose, onSuccess }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [cleanedBy, setBy]      = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const inputRef                = useRef();

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) { setError('Please upload an after photo.'); return; }
    setLoading(true); setError('');
    try {
      const ext  = file.name.split('.').pop();
      const path = `after/${obs.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('after-photos').upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { data: urlData } = supabase.storage
        .from('after-photos').getPublicUrl(path);

      const { error: patchErr } = await supabase
        .from('observations')
        .update({
          status:          'cleaned',
          cleaned_at:      new Date().toISOString(),
          cleaned_by:      cleanedBy.trim() || null,
          after_photo_url: urlData.publicUrl,
        })
        .eq('id', obs.id)
        .eq('status', 'open');
      if (patchErr) throw new Error(patchErr.message);

      onSuccess(obs.id, cleanedBy.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>Mark as cleaned</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p style={S.modalSub}>Upload a photo confirming the spot is clean. It will appear alongside the original report.</p>

        <div style={{ ...S.uploadZone, ...(preview ? S.uploadZoneFull : {}) }}
             onClick={() => inputRef.current?.click()}>
          {preview
            ? <img src={preview} alt="after" style={S.previewImg} />
            : <>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 4 }}>Tap to add after photo</div>
                <div style={{ fontSize: 12, color: '#888' }}>Required</div>
              </>}
          <input ref={inputRef} type="file" accept="image/*" capture="environment"
                 style={{ display: 'none' }} onChange={handleFile} />
        </div>

        {preview && (
          <button style={S.reupload} onClick={() => inputRef.current?.click()}>
            Change photo
          </button>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Your name / WhatsApp (optional)</label>
          <input style={S.input} placeholder="e.g. Ramesh, +91 98765 43210"
                 value={cleanedBy} onChange={e => setBy(e.target.value)} />
          <span style={{ fontSize: 11, color: '#888' }}>Get credit for your good work 🙌</span>
        </div>

        {error && <div style={S.errorBox}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={S.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={{ ...S.confirmBtn, opacity: loading ? 0.7 : 1 }}
                  onClick={handleSubmit} disabled={loading}>
            {loading ? 'Uploading…' : 'Confirm cleanup ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MapView (main export) ───────────────────────────────────────────────────
export default function MapView({ observations = [], onDelete, onCleaned }) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef     = useRef([]);
  const markerRegistry = useRef(new Map()); // id → { marker, obs }
  const LRef           = useRef(null);

  const [selectedObs, setSelectedObs] = useState(null);
  const [showModal, setShowModal]     = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      LRef.current = L;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView([20.9374, 77.7793], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstanceRef.current);
      }

      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      markerRegistry.current.clear();

      observations.forEach(obs => {
        const isCleaned = obs.status === 'cleaned';
        const color = isCleaned ? '#1d9e75' : (SEVERITY_COLORS[obs.severity] || '#f97316');
        const label = SEVERITY_LABELS[obs.severity] || obs.severity;

        const icon = makeIcon(L, color, isCleaned);
        const marker = L.marker([obs.latitude, obs.longitude], { icon });

        // Build popup HTML
        const deleteId = `delete-${obs.id}`;
        const cleanId  = `clean-${obs.id}`;
        const time = new Date(obs.created_at || obs.timestamp).toLocaleString('en-AU', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        });

        const statusSection = isCleaned
          ? `<div style="background:#EAF3DE;color:#3B6D11;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:500;margin-top:8px">
               ✓ Cleaned${obs.cleaned_by ? ' by ' + obs.cleaned_by : ''}
             </div>
             ${obs.after_photo_url ? `<img src="${obs.after_photo_url}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-top:6px;border:2px solid #1d9e75"/>` : ''}`
          : `<button id="${cleanId}" style="width:100%;padding:7px;border:none;border-radius:6px;background:#1d9e75;color:#fff;font-size:12px;font-weight:600;cursor:pointer;margin-top:8px">
               ✓ Mark as cleaned
             </button>`;

        const popupHtml = `
          <div style="min-width:190px;font-family:sans-serif;">
            ${obs.photo_url ? `<img src="${obs.photo_url}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:8px;"/>` : ''}
            ${obs.photo    ? `<img src="${obs.photo}"     style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:8px;"/>` : ''}
            <div style="font-weight:600;margin-bottom:4px;">${obs.ward || ''}</div>
            <div style="font-size:12px;color:#666;margin-bottom:2px;">
              Severity: <span style="color:${color};font-weight:600;">${obs.severity} — ${label}</span>
            </div>
            ${obs.notes || obs.description ? `<div style="font-size:12px;color:#555;margin-bottom:4px;">${obs.notes || obs.description}</div>` : ''}
            <div style="font-size:11px;color:#999;margin-bottom:6px;">${time}</div>
            ${statusSection}
            <button id="${deleteId}" style="width:100%;padding:6px;border:none;border-radius:6px;background:#fee2e2;color:#dc2626;font-size:11px;font-weight:600;cursor:pointer;margin-top:6px;">
              🗑 Delete Report
            </button>
          </div>`;

        marker.bindPopup(popupHtml, { maxWidth: 240 });

        marker.on('popupopen', () => {
          // Delete button
          const delBtn = document.getElementById(deleteId);
          if (delBtn && onDelete) {
            delBtn.onclick = () => { marker.closePopup(); onDelete(obs.id); };
          }
          // Clean button — opens modal via React state
          const cleanBtn = document.getElementById(cleanId);
          if (cleanBtn) {
            cleanBtn.onclick = () => {
              marker.closePopup();
              setSelectedObs(obs);
              setShowModal(true);
            };
          }
        });

        marker.addTo(mapInstanceRef.current);
        markersRef.current.push(marker);
        markerRegistry.current.set(obs.id, { marker, obs });
      });
    };

    initMap();
  }, [observations, onDelete]);

  function handleCleanSuccess(id, cleanedBy) {
    setShowModal(false);
    setSelectedObs(null);
    if (LRef.current) markCleanedOnMap(LRef.current, markerRegistry, id, cleanedBy);
    onCleaned?.(id); // notify parent to refresh observations
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />

      {showModal && selectedObs && (
        <CleanedModal
          obs={selectedObs}
          onClose={() => { setShowModal(false); setSelectedObs(null); }}
          onSuccess={handleCleanSuccess}
        />
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    background: '#fff', borderRadius: '16px 16px 0 0',
    padding: '20px 20px 32px', width: '100%', maxWidth: 480,
    fontFamily: 'system-ui, sans-serif', maxHeight: '90vh', overflowY: 'auto',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle:  { fontSize: 17, fontWeight: 600, color: '#111' },
  closeBtn:    { background: 'none', border: 'none', fontSize: 16, color: '#888', cursor: 'pointer' },
  modalSub:    { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 },
  uploadZone:  {
    border: '2px dashed #d3d1c7', borderRadius: 10,
    padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 8,
  },
  uploadZoneFull: { padding: 0, border: '2px solid #1d9e75', overflow: 'hidden' },
  previewImg:  { width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' },
  reupload:    { background: 'none', border: 'none', fontSize: 12, color: '#1d9e75', cursor: 'pointer', padding: '4px 0', marginBottom: 12, textDecoration: 'underline' },
  label:       { display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 6 },
  input:       { width: '100%', padding: '10px 12px', border: '1px solid #d3d1c7', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#111' },
  errorBox:    { background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 12 },
  cancelBtn:   { flex: 1, padding: '11px 0', background: 'none', border: '1px solid #d3d1c7', borderRadius: 8, fontSize: 14, color: '#666', cursor: 'pointer' },
  confirmBtn:  { flex: 2, padding: '11px 0', background: '#1d9e75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
