/**
 * markerUtils.js
 *
 * Helpers for managing Leaflet markers in Clean Amravati Map.
 * Handles colour by severity + status, and live swap when cleaned.
 *
 * Usage in your map page:
 *   import { createMarker, markCleaned } from "@/lib/markerUtils";
 *
 *   const marker = createMarker(report, map, (id) => {
 *     markCleaned(id, markerRegistry);
 *   });
 *   markerRegistry.set(report.id, marker);
 */

// ─── Colour map ───────────────────────────────────────────────────────────────

const SEV_COLOURS = {
  low:       "#639922",
  medium:    "#BA7517",
  high:      "#E24B4A",
  hazardous: "#7F1919",
};

const CLEANED_COLOUR = "#1d9e75";

// ─── SVG pin factory ──────────────────────────────────────────────────────────

function pinSvg(fill, size = 32) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <circle cx="16" cy="13" r="9" fill="${fill}" opacity="0.2"/>
  <circle cx="16" cy="13" r="6" fill="${fill}"/>
  <line x1="16" y1="19" x2="16" y2="28" stroke="${fill}" stroke-width="2.5" stroke-linecap="round"/>
</svg>`.trim();
}

function makeIcon(L, fill, size = 32) {
  return L.divIcon({
    className: "",
    html: pinSvg(fill, size),
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -size],
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * createMarker — creates a Leaflet marker for a report.
 *
 * @param {object}   report         - Supabase observation row
 * @param {object}   map            - Leaflet map instance
 * @param {Function} onMarkCleaned  - called with report.id when user confirms cleanup
 * @returns Leaflet marker instance
 */
export function createMarker(report, map, onMarkCleaned) {
  // Lazy-load L from window (Leaflet is loaded globally in Next.js via dynamic import)
  const L = window.L;

  const isCleaned = report.status === "cleaned";
  const fill = isCleaned
    ? CLEANED_COLOUR
    : (SEV_COLOURS[report.severity] || SEV_COLOURS.low);

  const marker = L.marker([report.latitude, report.longitude], {
    icon: makeIcon(L, fill),
  });

  // Build popup content — CleanupFlow renders into this div via React portal
  // or you can use a simple inline template for non-React popups:
  const popupDiv = document.createElement("div");
  popupDiv.style.minWidth = "220px";
  popupDiv.dataset.reportId = report.id;

  popupDiv.innerHTML = buildPopupHTML(report, isCleaned);

  if (!isCleaned) {
    const btn = popupDiv.querySelector(".mark-cleaned-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        onMarkCleaned?.(report.id);
      });
    }
  }

  marker.bindPopup(L.popup({ maxWidth: 340 }).setContent(popupDiv));
  marker.addTo(map);

  return marker;
}

/**
 * markCleaned — swaps a marker's icon to green after a successful PATCH.
 *
 * @param {string|number} reportId      - observation id
 * @param {Map}           markerRegistry - Map<id, L.Marker>
 */
export function markCleaned(reportId, markerRegistry) {
  const L = window.L;
  const marker = markerRegistry.get(reportId);
  if (!marker) return;

  marker.setIcon(makeIcon(L, CLEANED_COLOUR));

  // Update popup content to show cleaned banner
  const popup = marker.getPopup();
  if (popup) {
    const content = popup.getContent();
    if (content instanceof HTMLElement) {
      const btn = content.querySelector(".mark-cleaned-btn");
      if (btn) {
        const banner = document.createElement("div");
        banner.style.cssText =
          "background:#EAF3DE;color:#3B6D11;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:500;text-align:center;margin-top:10px";
        banner.textContent = "✓ Marked as cleaned";
        btn.replaceWith(banner);
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHours(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours === Math.floor(hours)) return `${hours} hr${hours !== 1 ? 's' : ''}`;
  return `${hours} hrs`;
}

// ─── Inline popup HTML (no React dependency) ─────────────────────────────────

function buildPopupHTML(report, isCleaned) {
  const sevColors = {
    low:       "background:#EAF3DE;color:#3B6D11",
    medium:    "background:#FAEEDA;color:#854F0B",
    high:      "background:#FCEBEB;color:#A32D2D",
    hazardous: "background:#501313;color:#F7C1C1",
  };
  const sevStyle = sevColors[report.severity] || sevColors.low;
  const date = report.created_at
    ? new Date(report.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })
    : "";

  const beforePhoto = report.photo_url
    ? `<img src="${report.photo_url}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;display:block;margin-bottom:10px" />`
    : "";

  const afterPhoto = isCleaned && report.after_photo_url
    ? `<img src="${report.after_photo_url}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;display:block;margin-top:6px;border:2px solid #1d9e75" />`
    : "";

  const effortSection = report.effort_hours
    ? `<div style="display:flex;align-items:center;gap:6px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:7px 10px;margin-top:8px">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style="flex-shrink:0"><circle cx="6.5" cy="6.5" r="5.5" stroke="#d97706" stroke-width="1.2"/><path d="M6.5 3.5V6.5L8.5 8" stroke="#d97706" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span style="font-size:12px;color:#92400e;font-weight:600">~${formatHours(report.effort_hours)} per person</span>
      </div>`
    : "";

  const statusSection = isCleaned
    ? `<div style="background:#EAF3DE;color:#3B6D11;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:500;margin-top:10px">✓ Cleaned${report.cleaned_by ? " by " + report.cleaned_by : ""}</div>`
    : `<button class="mark-cleaned-btn" style="width:100%;margin-top:10px;padding:9px 0;background:#1d9e75;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Mark as cleaned</button>`;

  return `
<div style="font-family:system-ui,sans-serif;font-size:13px">
  ${beforePhoto}
  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
    <span style="${sevStyle};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;text-transform:capitalize">${report.severity || "low"}</span>
    ${report.ward ? `<span style="background:#f1efe8;color:#444;padding:2px 8px;border-radius:99px;font-size:11px">Ward ${report.ward}</span>` : ""}
    ${date ? `<span style="font-size:11px;color:#888">${date}</span>` : ""}
  </div>
  ${report.description ? `<p style="margin:0 0 4px;color:#333;line-height:1.4">${report.description}</p>` : ""}
  ${effortSection}
  ${afterPhoto}
  ${statusSection}
</div>`.trim();
}
