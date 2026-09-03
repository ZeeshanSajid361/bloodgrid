# 🩸 BloodGrid 2.0 — Developer Handover & Implementation Plan

Welcome to the **BloodGrid 2.0** codebase! This document provides a complete contextual overview of the application, instructions for repository access and environment credentials, an architectural walkthrough, and a prioritized task list for ongoing improvements and optimizations.

> 🏷️ **Important Note on Project Naming & Branding**:
> - **Brand Evolution**: The platform was initially named *BloodLink*, then updated to *BloodSync*. However, since both of those names are already in use by existing apps/services, **BloodGrid** is the final, official brand name.
> - **README & Repository Screenshots**: The current banner images and screenshots in the repository (`/images/` directory and `README.md`) still depict the legacy *BloodSync* visual wordmark. **We will capture fresh screenshots and update all repository images after completing all testing, design polish, and final feature changes.**

---

## 📌 1. Repository Access & Collaboration Setup

To start contributing code and pushing changes directly to the repository:

### Step 1: Request Repository Collaborator Access
1. Send your GitHub username to the repository owner (**ZeeshanSajid361**).
2. The owner will add you under **GitHub Repo → Settings → Collaborators → Add people**.
3. Accept the email invite or visit: [github.com/ZeeshanSajid361/bloodsync/invitations](https://github.com/ZeeshanSajid361/bloodsync/invitations)

### Step 2: Clone the Project
```bash
git clone https://github.com/ZeeshanSajid361/bloodsync.git
cd bloodsync
```

### Step 3: Branching & Push Workflow
- Always pull the latest code before starting work: `git pull origin main`
- Create feature branches for major changes: `git checkout -b feature/your-feature-name`
- Commit with clear descriptive messages: `git commit -m "feat(maps): integrate Google Places autocomplete"`
- Push to main (or feature branch): `git push origin main`

---

## 🔑 2. Environment Variables & Credentials Setup

To protect personal credentials, `.env` files are excluded from Git (`.gitignore`). You must create your own local `.env` files in both the `server/` and `client/` directories using the provided templates.

### A. Backend Credentials (`server/.env`)
Copy `server/.env.example` to `server/.env` and configure your own service keys:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database (MongoDB Atlas)
# Sign up at mongodb.com -> Create a free cluster -> Copy Connection String
MONGO_URI=mongodb+srv://<your_username>:<your_password>@cluster0.mongodb.net/bloodgrid?retryWrites=true&w=majority

# JWT Security Secrets (Generate random 32+ char strings)
JWT_ACCESS_SECRET=your_custom_long_random_access_secret_key_123!
JWT_REFRESH_SECRET=your_custom_long_random_refresh_secret_key_456!
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Service (Gmail SMTP)
# 1. Enable 2-Step Verification on your Google Account
# 2. Go to Security -> App Passwords -> Create "Mail" password (16 chars)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_gmail_app_password
EMAIL_FROM="BloodGrid Platform <your_email@gmail.com>"

# Cloudinary Media Storage (For hospital requisition slips)
# Sign up at cloudinary.com -> Dashboard -> Copy Cloud Name, API Key, API Secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Web Push Notifications (Optional - VAPID Keys)
# Generate via terminal: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your_email@gmail.com

# Frontend Origin (CORS)
CLIENT_URL=http://localhost:5173
```

### B. Frontend Credentials (`client/.env`)
Copy `client/.env.example` to `client/.env`:

```env
# API Base Endpoint
VITE_API_BASE_URL=http://localhost:5000/api

# Google Maps JavaScript & Places API Key
# Obtain from Google Cloud Console -> Enable Maps JS API & Places API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## 🏗️ 3. Architecture & Codebase Overview

```
bloodsync/
├── client/                     # Frontend Application (React 18 + Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI (PhoneInput, Navbar, Modals, LocationPicker)
│   │   ├── context/            # AuthContext (JWT state, user profiles, auto-hydration)
│   │   ├── features/           # Splash screen animation (CinematicSplashScreen)
│   │   ├── hooks/              # SWR Custom Data Hooks (useAdminData, useSeekerData, etc.)
│   │   ├── pages/
│   │   │   ├── auth/           # Login, Register, ForgotPassword
│   │   │   ├── dashboard/      # Donor, Seeker, Hospital, Admin, Partner Dashboards
│   │   │   └── public/         # Landing Page, Public Donor Search
│   │   ├── index.css           # Core Design Tokens, CSS Variables, Typography
│   │   └── App.jsx             # React Router routing & Protected Routes
│   └── package.json
│
└── server/                     # Backend API (Node.js + Express.js)
    ├── src/
    │   ├── config/             # DB connection pool (globalThis cached for Vercel serverless)
    │   ├── middleware/         # requireAuth, requireRole, errorHandler
    │   ├── models/             # Mongoose Schemas (User, Request, Hospital, Inventory)
    │   ├── modules/            # Auth, User Controllers & Services
    │   ├── routes/             # API Router endpoints (/auth, /seekers, /hospitals, /donors, /qr)
    │   └── utils/              # Emailer, Cloudinary, WebPush, QR Generator
    └── package.json
```

---

## 🎯 4. Detailed Task List & Improvement Requirements

Here are the specific features, performance optimizations, and UI refinements to implement:

### 📍 Task 1: Location Selection, Auto-Fill & Mapping Integration
- **Goal**: Enable exact address auto-filling and interactive map pin placement for seekers submitting blood requests and hospitals setting freezer inventory locations.
- **Current Blocker / Challenge**: The initial implementation attempted to use Google Maps (`LocationPickerModal.jsx`), but it requires an active paid/billing-enabled Google Cloud API key (`VITE_GOOGLE_MAPS_API_KEY`). Because no API key was available during development, this feature could not be fully completed.
- **Action Items / Options**:
  - **Option A (Google Maps API)**: Add an active Google Cloud Places & Maps JavaScript API key (`VITE_GOOGLE_MAPS_API_KEY`) to `client/.env` and finish wiring Google Places Autocomplete.
  - **Option B (Free Open-Source Alternative - Recommended)**: Switch `LocationPickerModal.jsx` to a completely free, open-source library like **Leaflet + OpenStreetMap** (via `react-leaflet` and `leaflet-geosearch` / Nominatim API). This allows 100% free location selection, pin dropping, and address reverse-geocoding without requiring any paid API keys!

### ⚡ Task 2: Performance & Latency Optimization (Login & Profile Loading)
- **Goal**: Eliminate initial load delay on sign-in and profile page switching.
- **Action Items**:
  1. **HTTP-Only Cookies**: Migrate token storage from `localStorage` to secure HTTP-only cookies (`res.cookie('accessToken', token, { httpOnly: true, sameSite: 'lax', secure: true })`) to allow instant server-side auth handshake.
  2. **Database Query Indexing**: Add compound indexes in Mongoose models (`server/src/models/`):
     - `BloodRequest`: `{ city: 1, bloodGroup: 1, urgency: 1, status: 1 }`
     - `User`: `{ email: 1, role: 1 }`
  3. **Parallel Data Hydration**: Update `AuthContext.jsx` and dashboard data hooks (`useSeekerData`, `useHospitalData`) to fetch essential profile data concurrently using `Promise.all()` rather than sequential API calls.

### 🎨 Task 3: Visual Polish & Color Contrast Polish
- **Goal**: Upgrade subtitle readability and refine launch animation aesthetics.
- **Action Items**:
  1. **CSS Text Contrast**: Update CSS variables in `client/src/index.css` and individual dashboard CSS modules:
     - Change muted subtitles and label colors to bright light silver (`#e2e8f0`) and crisp white (`#ffffff`).
     - Ensure all card labels, form subtexts, and table headers are crystal clear against dark glassmorphism backgrounds.
  2. **Splash Screen Polish (`CinematicSplashScreen.jsx`)**:
     - Fine-tune animation duration and transition timing for smooth, ultra-fast app startup.
     - Verify wordmark branding renders as **BloodGrid**.

### 📱 Task 4: Responsive & Touch Polish
- **Action Items**:
  - Test custom `PhoneInput` dropdown on mobile viewports.
  - Ensure all modal popups (`LocationPickerModal`, `QRCheckIn`, `OnboardingModal`) fit within mobile screens without horizontal scrollbars.

### 🧪 Task 5: Thorough Feature & Hospital API Integration Testing
- **Goal**: Perform an exhaustive, end-to-end verification of all system roles and integration pipelines from scratch.
- **Action Items**:
  1. **Hospital Profiles & EMN API Testing**:
     - Test standard Hospital Freezer Stock management and 35-day batch shelf-life auto-quarantining.
     - Test Hospital Counter QR Code Check-in Verification token generation and scanning.
     - **API Key Integration**: Test the Enterprise Medical Network (EMN) REST API integration (`/api/hospitals/api-sync` or API key endpoints) to verify that external software can push live inventory updates using generated API keys without throwing auth or schema errors.
  2. **Role-Based Workflow Testing**:
     - **Admin**: Verify medical slip approval queue, hospital API key generation, and user moderation.
     - **Donor**: Verify WHO cooldown lock (90d male / 120d female), badge milestone calculations, and live request matching.
     - **Seeker**: Test blood request creation, hospital slip file upload, and real-time request stage progress timeline (*Submitted ➔ Approved ➔ Fulfilled*).
     - **Partner/NGO**: Test community blood drive creation and assisted patient requests.

---

## 🚀 5. Quickstart Development Commands

```bash
# Terminal 1: Run Backend API
cd server
npm install
npm run dev

# Terminal 2: Run Frontend React Client
cd client
npm install
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🔐 6. Pre-Configured & Pre-Approved Test Accounts

All the following test accounts have been **pre-verified and pre-approved from the admin side** in MongoDB Atlas. Your collaborator can use them immediately to log in and test all features without waiting for manual verification or email tokens.

| Role | Account / Entity Name | Email Address | Default Password | Org / Access Level |
| :--- | :--- | :--- | :--- | :--- |
| 🛡️ **Admin** | System Super Admin | `admin@bloodgrid.com` | `Password123!` | Full control center & approval queue |
| 🏥 **Hospital (Web UI)** | Emergency Hospital PIMS | `hospital.web@bloodgrid.com` | `password123` | Freezer stock & 35d expiry management |
| ⚡ **Hospital (API / EMN)** | FAST University Medical Center | `hospital.api@bloodgrid.com` | `password123` | EMN REST API Key machine auto-sync |
| 🏥 **Hospital (Clinic)** | Regional Blood Bank & Clinic | `hospital.clinic@bloodgrid.com` | `password123` | Counter QR Code Check-in Verification |
| 🩸 **Seeker Pool (1 to 5)** | Seeker Users 1 through 5 | `seeker1@bloodgrid.com` to `seeker5@bloodgrid.com` | `password123` | Request creation & slip upload testing |
| 🤝 **Donor Pool (1 to 5)** | Donor Users 1 through 5 | `donor1@bloodgrid.com` to `donor5@bloodgrid.com` | `password123` | Emergency matching & WHO cooldown timer |
| 🏕️ **Partner** | Red Cross Foundation | `partner@bloodgrid.com` | `password123` | Blood drive camp management |

*Note: You can re-run `node seed-preapproved-accounts.js` in `server/` anytime to reset or re-create these test accounts.*

---

## 🤝 Summary Checklist for Collaborator

| Task | Priority | Status |
| :--- | :---: | :---: |
| Clone repository & create local `.env` files | 🔥 High | Pending |
| Add own MongoDB, Gmail SMTP, & Cloudinary credentials | 🔥 High | Pending |
| Address Location / Mapping task (API key or OpenStreetMap/Leaflet) | 🟡 Medium | Pending |
| Implement HTTP-only cookie auth & speed up profile loading | 🟡 Medium | Pending |
| Update CSS text contrast (`#e2e8f0` / `#ffffff`) for subtitles | 🟢 Normal | Pending |
| Polish `CinematicSplashScreen.jsx` launch animation | 🟢 Normal | Pending |
| Comprehensive feature & Hospital EMN API testing across all 5 roles | 🔥 High | Pending |

Happy Coding! 🩸🚀
