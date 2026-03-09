# 🌿 Clean Amravati Map

A minimal civic POC web app to report and visualize garbage points across Amravati.

---

## 📁 Folder Structure

```
clean-amravati-map/
├── pages/
│   ├── _app.js              ← App wrapper with global context
│   ├── index.js             ← Redirects to /dashboard
│   ├── report.js            ← /report  — Garbage report form
│   └── dashboard.js         ← /dashboard — Map + summary panel
├── components/
│   ├── Layout.js            ← Nav bar + mobile bottom tab
│   └── MapView.js           ← Leaflet map (client-side only)
├── context/
│   └── ObservationsContext.js  ← In-memory global state
├── styles/
│   └── globals.css          ← Tailwind + Leaflet CSS + Google Fonts
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
# http://localhost:3000
```

---

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/report` | Report a garbage point (photo + GPS + ward + severity) |
| `/dashboard` | Map with all markers + summary panel |

---

## 🗺️ Features

### Report Page (`/report`)
- 📷 Take a photo directly (camera) or upload from gallery
- 📍 Capture GPS via browser geolocation
- 🏘️ Select ward (Ward 1–4)
- ⚠️ Select severity (1–5)
- 📝 Optional notes
- Stores observation in React state on submit

### Dashboard Page (`/dashboard`)
- Leaflet map centered on Amravati (20.9320, 77.7523)
- Color-coded markers by severity:
  - 🟢 S1 — Green (Low)
  - 🟡 S2 — Lime (Minor)
  - 🟠 S3 — Orange (Moderate)
  - 🔴 S4 — Red (High)
  - 🔴 S5 — Dark Red (Critical)
- Click marker → popup with photo, ward, severity, notes, timestamp
- Summary panel with:
  - Total reports
  - Severe reports count (S4–S5)
  - Ward with most reports
  - Severity bar chart
  - Recent reports feed
  - Ward breakdown table
  - Map legend

---

## 📐 Architecture Notes

- **No database** — all data lives in React context (in-memory, resets on page refresh)
- **No auth** — open for POC
- **Leaflet** loaded with `dynamic(..., { ssr: false })` to avoid SSR issues
- **Photos** stored as base64 data URLs in state

---

## 🔮 Future Roadmap

| Phase | Feature |
|-------|---------|
| Phase 2 | Supabase / Firebase for persistent storage |
| Phase 2 | WhatsApp Bot via Twilio Business API |
| Phase 2 | GPS extraction from WhatsApp photo metadata |
| Phase 3 | Admin dashboard with ward filtering, heatmaps |
| Phase 3 | AMC (Amravati Municipal Corp) alert integration |
| Phase 3 | Status tracking (reported → in progress → resolved) |

---

## 🔧 Build for Production

```bash
npm run build
npm start
```

---

Built with Next.js · Tailwind CSS · Leaflet · React Context
