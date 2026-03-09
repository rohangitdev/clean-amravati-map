import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SEVERITY_COLORS = {
  1: { bg: '#16a34a', label: 'Low', text: '#fff' },
  2: { bg: '#84cc16', label: 'Minor', text: '#fff' },
  3: { bg: '#f97316', label: 'Moderate', text: '#fff' },
  4: { bg: '#dc2626', label: 'High', text: '#fff' },
  5: { bg: '#7f1d1d', label: 'Critical', text: '#fff' },
};

function createDotIcon(severity) {
  const color = SEVERITY_COLORS[severity]?.bg || '#16a34a';
  const size = severity >= 4 ? 18 : 14;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:50%;
        border:2.5px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        position:relative;
      ">
        ${severity >= 4 ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${color};opacity:0.3;animation:none;"></div>` : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });
}

function AutoFitBounds({ observations }) {
  const map = useMap();
  useEffect(() => {
    if (observations.length === 0) return;
    const bounds = observations.map((o) => [o.latitude, o.longitude]);
    if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    } else {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [observations.length]);
  return null;
}

function PopupContent({ obs }) {
  const sev = SEVERITY_COLORS[obs.severity];
  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', minWidth: '200px', maxWidth: '240px' }}>
      {obs.photo && (
        <div style={{ borderRadius: '10px 10px 0 0', overflow: 'hidden', height: '130px' }}>
          <img src={obs.photo} alt="Garbage" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
            {obs.ward}
          </span>
          <span style={{
            background: sev.bg,
            color: sev.text,
            padding: '2px 8px',
            borderRadius: '99px',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            S{obs.severity} · {sev.label}
          </span>
        </div>
        {obs.notes && (
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', lineHeight: 1.5 }}>{obs.notes}</p>
        )}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="#94a3b8" strokeWidth="1.2"/>
            <path d="M6 3.5V6L7.5 7.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {new Date(obs.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// Amravati city center
const AMRAVATI_CENTER = [20.9320, 77.7523];

export default function MapView({ observations }) {
  return (
    <MapContainer
      center={AMRAVATI_CENTER}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {observations.length > 0 && <AutoFitBounds observations={observations} />}
      {observations.map((obs) => (
        <Marker key={obs.id} position={[obs.latitude, obs.longitude]} icon={createDotIcon(obs.severity)}>
          <Popup>
            <PopupContent obs={obs} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
