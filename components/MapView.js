import { useEffect, useRef } from 'react';

const SEVERITY_COLORS = {
  1: '#22c55e',
  2: '#86efac',
  3: '#f97316',
  4: '#f87171',
  5: '#dc2626',
};

const SEVERITY_LABELS = {
  1: 'Low',
  2: 'Minor',
  3: 'Moderate',
  4: 'High',
  5: 'Critical',
};

export default function MapView({ observations = [], onDelete }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView(
          [20.9374, 77.7793],
          13
        );
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstanceRef.current);
      }

      // Remove old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add markers
      observations.forEach(obs => {
        const color = SEVERITY_COLORS[obs.severity] || '#f97316';
        const label = SEVERITY_LABELS[obs.severity] || obs.severity;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.4);">
          </div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([obs.latitude, obs.longitude], { icon });

        const popupId = `popup-${obs.id}`;
        const deleteId = `delete-${obs.id}`;
        const time = new Date(obs.timestamp).toLocaleString('en-AU', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        const popupHtml = `
          <div id="${popupId}" style="min-width:180px;font-family:sans-serif;">
            ${obs.photo ? `<img src="${obs.photo}" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />` : ''}
            <div style="font-weight:600;margin-bottom:4px;">${obs.ward}</div>
            <div style="font-size:12px;color:#666;margin-bottom:2px;">
              Severity: <span style="color:${color};font-weight:600;">S${obs.severity} — ${label}</span>
            </div>
            ${obs.notes ? `<div style="font-size:12px;color:#555;margin-bottom:4px;">${obs.notes}</div>` : ''}
            <div style="font-size:11px;color:#999;margin-bottom:8px;">${time}</div>
            <button id="${deleteId}" style="
              width:100%;padding:6px;border:none;border-radius:6px;
              background:#fee2e2;color:#dc2626;font-size:12px;
              font-weight:600;cursor:pointer;">
              🗑 Delete Report
            </button>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 220 });

        marker.on('popupopen', () => {
          const btn = document.getElementById(deleteId);
          if (btn && onDelete) {
            btn.onclick = () => {
              marker.closePopup();
              onDelete(obs.id);
            };
          }
        });

        marker.addTo(mapInstanceRef.current);
        markersRef.current.push(marker);
      });
    };

    initMap();
  }, [observations, onDelete]);

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    />
  );
}
