import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useObservations } from '../context/ObservationsContext';

const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'];

const SEVERITY_LABELS = {
  1: { label: 'Low', desc: 'Minor litter', color: '#16a34a', bg: '#dcfce7' },
  2: { label: 'Minor', desc: 'Small pile', color: '#65a30d', bg: '#ecfccb' },
  3: { label: 'Moderate', desc: 'Noticeable dump', color: '#ea580c', bg: '#ffedd5' },
  4: { label: 'High', desc: 'Large pile', color: '#dc2626', bg: '#fee2e2' },
  5: { label: 'Critical', desc: 'Health hazard', color: '#7f1d1d', bg: '#fecaca' },
};

export default function ReportPage() {
  const router = useRouter();
  const { addObservation } = useObservations();
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [ward, setWard] = useState('Ward 1');
  const [severity, setSeverity] = useState(3);
  const [notes, setNotes] = useState('');
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | loading | success | error
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhotoSelect = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto(e.target.result);
      setPhotoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('GPS not supported by your browser.');
      return;
    }
    setGpsStatus('loading');
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGpsStatus('success');
      },
      (err) => {
        setGpsStatus('error');
        setGpsError(
          err.code === 1
            ? 'Location permission denied. Please allow access.'
            : 'Could not get location. Try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) return alert('Please add a photo.');
    if (!coords) return alert('Please capture your GPS location.');

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate brief processing

    addObservation({
      photo,
      latitude: coords.latitude,
      longitude: coords.longitude,
      ward,
      severity,
      notes: notes.trim(),
      timestamp: new Date().toISOString(),
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M10 20L17 27L30 13" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'Syne, sans-serif' }} className="text-2xl font-bold text-slate-800 mb-2">
              Report Submitted!
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Your garbage report for <strong>{ward}</strong> has been added to the map.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setPhoto(null);
                  setCoords(null);
                  setGpsStatus('idle');
                  setNotes('');
                  setSeverity(3);
                  setSubmitted(false);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Report Another
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                View Map →
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 sm:pb-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 style={{ fontFamily: 'Syne, sans-serif' }} className="text-2xl font-bold text-slate-800">
            Report Garbage
          </h1>
          <p className="text-slate-500 text-sm mt-1">Help keep Amravati clean by reporting a garbage point.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* --- PHOTO SECTION --- */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-slate-100">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-xs">📷</span>
                Photo <span className="text-red-500">*</span>
              </label>
            </div>

            {photo ? (
              <div className="relative">
                <img src={photo} alt="Preview" className="w-full h-52 object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoFile(null); }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white text-sm hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="p-4 flex gap-3">
                {/* Camera button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all text-sm font-medium"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="6" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 6L10.5 3H13.5L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Take Photo
                </button>
                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all text-sm font-medium"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 15V3M12 3L8 7M12 3L16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 17V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Upload
                </button>
              </div>
            )}

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handlePhotoSelect(e.target.files[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoSelect(e.target.files[0])}
            />
          </div>

          {/* --- GPS SECTION --- */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-xs">📍</span>
              Location <span className="text-red-500">*</span>
            </label>

            {gpsStatus === 'success' && coords ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-green-700">Location captured</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xs text-green-600 mt-0.5">
                    {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGPS}
                  className="text-xs text-green-600 underline hover:text-green-800"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleGPS}
                  disabled={gpsStatus === 'loading'}
                  className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    gpsStatus === 'loading'
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]'
                  }`}
                >
                  {gpsStatus === 'loading' ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8"/>
                      </svg>
                      Getting Location…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" fill="currentColor"/>
                        <path d="M8 2V0.5M8 15.5V14M2 8H0.5M15.5 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Capture GPS Location
                    </>
                  )}
                </button>
                {gpsStatus === 'error' && (
                  <p className="text-xs text-red-500 mt-2 text-center">{gpsError}</p>
                )}
              </div>
            )}
          </div>

          {/* --- WARD SELECTOR --- */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-xs">🏘️</span>
              Ward
            </label>
            <div className="grid grid-cols-4 gap-2">
              {WARDS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWard(w)}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                    ward === w
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {w.replace('Ward ', 'W')}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">Selected: <strong className="text-slate-600">{ward}</strong></p>
          </div>

          {/* --- SEVERITY SELECTOR --- */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-xs">⚠️</span>
              Severity
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => {
                const info = SEVERITY_LABELS[s];
                const isSelected = severity === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    style={{
                      background: isSelected ? info.color : info.bg,
                      color: isSelected ? '#fff' : info.color,
                      border: `2px solid ${isSelected ? info.color : 'transparent'}`,
                    }}
                    className="flex-1 py-2.5 rounded-xl text-base font-bold transition-all hover:scale-105 active:scale-95"
                    title={`${s} - ${info.label}: ${info.desc}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                style={{
                  background: SEVERITY_LABELS[severity].bg,
                  color: SEVERITY_LABELS[severity].color,
                }}
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
              >
                {SEVERITY_LABELS[severity].label}
              </span>
              <span className="text-xs text-slate-400">{SEVERITY_LABELS[severity].desc}</span>
            </div>
          </div>

          {/* --- NOTES --- */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-xs">📝</span>
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the garbage situation, landmark, etc."
              rows={3}
              className="w-full text-sm text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          {/* --- SUBMIT --- */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2 ${
              submitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] shadow-lg shadow-green-200'
            }`}
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2.5" strokeDasharray="34" strokeDashoffset="10"/>
                </svg>
                Submitting…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2.5L15.5 9L9 15.5M15.5 9H2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
}
