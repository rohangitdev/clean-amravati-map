"use client";

/**
 * CleanupFlow.jsx
 *
 * Drop-in replacement for your existing marker popup / report detail panel.
 * Shows report details + "Mark as Cleaned" CTA.
 * On click → modal with after-photo upload → PATCH to Supabase.
 *
 * Usage (in your Leaflet popup or side panel):
 *   <CleanupFlow report={report} onCleaned={(id) => refreshMarkers()} />
 *
 * Props:
 *   report   — observation row from Supabase (all columns)
 *   onCleaned — callback fired after successful PATCH, receives report id
 */

import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SEV_COLORS = {
  low:       { bg: "#EAF3DE", text: "#3B6D11" },
  medium:    { bg: "#FAEEDA", text: "#854F0B" },
  high:      { bg: "#FCEBEB", text: "#A32D2D" },
  hazardous: { bg: "#501313", text: "#F7C1C1" },
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function CleanupFlow({ report, onCleaned }) {
  const [showModal, setShowModal] = useState(false);

  if (!report) return null;

  const isCleaned = report.status === "cleaned";

  return (
    <>
      <ReportCard
        report={report}
        isCleaned={isCleaned}
        onMarkCleaned={() => setShowModal(true)}
      />

      {showModal && (
        <CleanedModal
          report={report}
          onClose={() => setShowModal(false)}
          onSuccess={(id) => {
            setShowModal(false);
            onCleaned?.(id);
          }}
        />
      )}
    </>
  );
}

// ─── Report card ─────────────────────────────────────────────────────────────

function ReportCard({ report, isCleaned, onMarkCleaned }) {
  const sev = SEV_COLORS[report.severity] || SEV_COLORS.low;
  const reportedAt = report.created_at
    ? new Date(report.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";
  const cleanedAt = report.cleaned_at
    ? new Date(report.cleaned_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

  return (
    <div style={styles.card}>
      {/* Before photo */}
      {report.photo_url && (
        <div style={styles.photoRow}>
          <div style={styles.photoWrap}>
            <div style={styles.photoLabel}>Before</div>
            <img src={report.photo_url} alt="Before" style={styles.photo} />
          </div>
          {isCleaned && report.after_photo_url && (
            <div style={styles.photoWrap}>
              <div style={{ ...styles.photoLabel, background: "#EAF3DE", color: "#3B6D11" }}>
                After ✓
              </div>
              <img src={report.after_photo_url} alt="After" style={styles.photo} />
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div style={styles.meta}>
        <span style={{ ...styles.badge, background: sev.bg, color: sev.text }}>
          {report.severity}
        </span>
        {report.ward && (
          <span style={styles.wardPill}>Ward {report.ward}</span>
        )}
        <span style={styles.datePill}>{reportedAt}</span>
      </div>

      {report.description && (
        <p style={styles.description}>{report.description}</p>
      )}

      {/* Status row */}
      {isCleaned ? (
        <div style={styles.cleanedBanner}>
          <span style={styles.cleanedTick}>✓</span>
          <span>
            Cleaned{report.cleaned_by ? ` by ${report.cleaned_by}` : ""}
            {cleanedAt ? ` · ${cleanedAt}` : ""}
          </span>
        </div>
      ) : (
        <button style={styles.ctaBtn} onClick={onMarkCleaned}>
          Mark as cleaned
        </button>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function CleanedModal({ report, onClose, onSuccess }) {
  const [afterFile, setAfterFile]   = useState(null);
  const [preview, setPreview]       = useState(null);
  const [cleanedBy, setCleanedBy]   = useState("");
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState("");
  const fileInputRef                = useRef();

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAfterFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!afterFile) {
      setError("Please upload an after photo to confirm the cleanup.");
      return;
    }
    setError("");
    setUploading(true);

    try {
      // 1. Upload after photo to Supabase Storage
      const ext = afterFile.name.split(".").pop();
      const path = `after/${report.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("after-photos")
        .upload(path, afterFile, { upsert: true });

      if (uploadErr) throw new Error(uploadErr.message);

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from("after-photos")
        .getPublicUrl(path);
      const afterPhotoUrl = urlData.publicUrl;

      // 3. PATCH observation row
      const { error: updateErr } = await supabase
        .from("observations")
        .update({
          status:          "cleaned",
          cleaned_at:      new Date().toISOString(),
          cleaned_by:      cleanedBy.trim() || null,
          after_photo_url: afterPhotoUrl,
        })
        .eq("id", report.id)
        .eq("status", "open"); // safety: only patch if still open

      if (updateErr) throw new Error(updateErr.message);

      onSuccess(report.id);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Mark as cleaned</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p style={styles.modalSubtitle}>
          Upload a photo showing the spot has been cleaned. This will be visible
          to the community and shared in ward reports.
        </p>

        {/* After photo upload */}
        <div
          style={{
            ...styles.uploadZone,
            ...(preview ? styles.uploadZoneWithPreview : {}),
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="After" style={styles.previewImg} />
          ) : (
            <>
              <div style={styles.uploadIcon}>📷</div>
              <div style={styles.uploadText}>Tap to add after photo</div>
              <div style={styles.uploadHint}>Required — shows cleanup is done</div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {preview && (
          <button
            style={styles.reuploadBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            Change photo
          </button>
        )}

        {/* Cleaned by (optional) */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>Your name or WhatsApp (optional)</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Ramesh, +91 98765 43210"
            value={cleanedBy}
            onChange={(e) => setCleanedBy(e.target.value)}
          />
          <span style={styles.fieldHint}>Get credit for your good work 🙌</span>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Actions */}
        <div style={styles.modalActions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            style={{
              ...styles.confirmBtn,
              opacity: uploading ? 0.7 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
            onClick={handleSubmit}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Confirm cleanup ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    fontFamily: "system-ui, sans-serif",
    maxWidth: 360,
  },
  photoRow: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  photoWrap: {
    flex: 1,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  photoLabel: {
    position: "absolute",
    top: 6,
    left: 6,
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontSize: 10,
    padding: "2px 7px",
    borderRadius: 99,
    fontWeight: 600,
    zIndex: 1,
  },
  photo: {
    width: "100%",
    height: 130,
    objectFit: "cover",
    display: "block",
    borderRadius: 8,
  },
  meta: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 8,
    alignItems: "center",
  },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "capitalize",
  },
  wardPill: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 99,
    fontSize: 11,
    background: "#f1efe8",
    color: "#444",
  },
  datePill: {
    fontSize: 11,
    color: "#888",
  },
  description: {
    fontSize: 13,
    color: "#333",
    margin: "0 0 12px",
    lineHeight: 1.5,
  },
  ctaBtn: {
    width: "100%",
    padding: "10px 0",
    background: "#1d9e75",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 0.2,
  },
  cleanedBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#EAF3DE",
    color: "#3B6D11",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 500,
  },
  cleanedTick: {
    fontSize: 16,
  },

  // Modal
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 9999,
    padding: "0 0 0 0",
  },
  modal: {
    background: "#fff",
    borderRadius: "16px 16px 0 0",
    padding: "20px 20px 32px",
    width: "100%",
    maxWidth: 480,
    fontFamily: "system-ui, sans-serif",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#111",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    color: "#888",
    cursor: "pointer",
    padding: "2px 6px",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  uploadZone: {
    border: "2px dashed #d3d1c7",
    borderRadius: 10,
    padding: "28px 20px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: 8,
    transition: "border-color .15s",
  },
  uploadZoneWithPreview: {
    padding: 0,
    border: "2px solid #1d9e75",
    overflow: "hidden",
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: 500,
    color: "#333",
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: "#888",
  },
  previewImg: {
    width: "100%",
    maxHeight: 220,
    objectFit: "cover",
    display: "block",
  },
  reuploadBtn: {
    background: "none",
    border: "none",
    fontSize: 12,
    color: "#1d9e75",
    cursor: "pointer",
    padding: "4px 0",
    marginBottom: 12,
    textDecoration: "underline",
  },
  fieldGroup: {
    marginBottom: 16,
    marginTop: 8,
  },
  fieldLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#333",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d3d1c7",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    color: "#111",
  },
  fieldHint: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
    display: "block",
  },
  errorBox: {
    background: "#FCEBEB",
    color: "#A32D2D",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
    marginBottom: 12,
  },
  modalActions: {
    display: "flex",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    padding: "11px 0",
    background: "none",
    border: "1px solid #d3d1c7",
    borderRadius: 8,
    fontSize: 14,
    color: "#666",
    cursor: "pointer",
  },
  confirmBtn: {
    flex: 2,
    padding: "11px 0",
    background: "#1d9e75",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
