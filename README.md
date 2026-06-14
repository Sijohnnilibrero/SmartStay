# 🏠 SmartStay
**Intelligent Boarding House Finder, Recommendation & Reservation Platform for Batanes Island**

---

## Tech Stack

| Layer      | Technology |
|------------|-----------|
| Frontend   | React 18 + Vite, Tailwind CSS, React Router v6 |
| State      | Zustand |
| Maps       | Leaflet + React-Leaflet |
| Charts     | Recharts |
| Backend    | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Deployment | Vercel + Supabase |

---

## Project Structure

```text
smartstay/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx      # Main shell (sidebar + outlet)
│   │   │   ├── Sidebar.jsx        # Navigation sidebar
│   │   │   └── Topbar.jsx         # Page topbar with title + actions
│   │   └── ui/
│   │       └── index.jsx          # All reusable UI components
│   ├── pages/
│   │   ├── Login.jsx              # User authentication
│   │   ├── Register.jsx           # User registration
│   │   ├── Messages.jsx           # Chat and messaging system
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx # Overview stats, charts, activity
│   │   │   └── AdminPropertyDetails.jsx # Detailed view for admin
│   │   ├── homeowner/
│   │   │   ├── HomeownerDashboard.jsx # Landlord stats and quick actions
│   │   │   ├── HomeownerRooms.jsx   # Manage rooms and properties
│   │   │   ├── HomeownerTenants.jsx # Manage tenants and leases
│   │   │   └── HomeownerProfile.jsx # Landlord profile settings
│   │   ├── tenant/
│   │   │   ├── TenantDashboard.jsx # Tenant overview
│   │   │   ├── TenantSearch.jsx    # Find & filter boarding houses
│   │   │   ├── TenantMap.jsx       # Leaflet map with all listings
│   │   │   ├── TenantPropertyDetails.jsx # Detailed view of a property
│   │   │   ├── MyRoom.jsx          # Current room details and bills
│   │   │   ├── MyLandlord.jsx      # Landlord contact and info
│   │   │   ├── Recommendations.jsx # AI-powered matching engine
│   │   │   └── TenantBrowseRooms.jsx # Browse available rooms
│   │   ├── NotFound.jsx           # 404 page
│   │   └── Unauthorized.jsx       # Role-based access restriction
│   ├── lib/
│   │   ├── supabase.js            # Supabase client
│   │   ├── mockData.js            # Dev data (replace with Supabase queries)
│   │   └── utils.js               # Helpers: cn(), formatCurrency(), etc.
│   ├── store/
│   │   ├── useAppStore.js         # Zustand global state
│   │   └── useAuthStore.js        # Auth state management
│   ├── App.jsx                    # Routes
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Global styles + CSS variables
├── supabase_schema.sql            # Full DB schema — run in Supabase SQL Editor
├── .env.example                   # Copy to .env and add your credentials
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Quick Start

### 1. Install dependencies
```bash
cd smartstay
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
> Get these from: **Supabase Dashboard → Your Project → Settings → API**

### 3. Run the dev server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** The app is configured to use Supabase. Ensure you have run the schema migrations to get everything working smoothly.

---

## Setting Up Supabase

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New Project → choose a name and region.

### 2. Run the schema
- In Supabase Dashboard, go to **SQL Editor**
- Open `supabase_schema.sql` from this project
- Paste the contents and click **Run**
- Also apply `supabase_add_image_upload.sql` and related SQL files to update your database fully.

This creates all tables: `profiles`, `properties`, `rooms`, `reservations`, `reviews`, `utility_bills`, `payments`, `contracts`, `emergency_contacts`, plus views, RLS policies, and a GIS helper function.

### 3. Enable Authentication
- Supabase Dashboard → **Authentication → Providers**
- Enable **Email** (for development)
- Optionally enable **Google** or **Facebook** for production

### 4. Create storage buckets
- Dashboard → **Storage → New Bucket**
- Create: `property-images`, `contracts`, `avatars`
- Set `property-images` as **public**

---

## Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Supabase Auth | ✅ | Role-based authentication (Admin, Homeowner, Tenant) |
| Dashboard with stats & charts | ✅ | Role-specific dashboards (Admin, Homeowner, Tenant) |
| Search & filter boarding houses | ✅ | Filter by island, budget, amenities (Tenant view) |
| Property detail page | ✅ | Reviews, amenities, owner info |
| GIS Map | ✅ | Leaflet + color-coded markers |
| Reservation management | ✅ | Table with approve/cancel functionality |
| Reviews & ratings | ✅ | Category breakdown, star ratings |
| Recommendation engine | ✅ | Preference-based scoring algorithm |
| Tenant & Room management | ✅ | Homeowner tools to manage property and tenants |
| Online Payments | 🚧 | Partial GCash integration / Hookup next |
| Contract management | 🔜 | Schema ready |
| Utility monitoring | 🔜 | Schema ready |
| Virtual room tours | 🔜 | Upload to Supabase Storage |
| Real-time notifications | 🔜 | Supabase Realtime ready |

---

## Deploying to Vercel

```bash
npm run build
```
Then push to GitHub and import to [vercel.com](https://vercel.com).
Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in Vercel settings.

---

## Capstone Project Info
**SmartStay: Intelligent Boarding House Finder, Recommendation, and Reservation Platform for Batan Island**

Built with React + Vite + Supabase for the Batanes community.
