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

```
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
│   │   ├── Dashboard.jsx          # Overview stats, charts, activity
│   │   ├── Search.jsx             # Find & filter boarding houses
│   │   ├── PropertyDetail.jsx     # Single property view
│   │   ├── Properties.jsx         # Admin property management
│   │   ├── Reservations.jsx       # Reservation table + management
│   │   ├── Reviews.jsx            # Ratings & review aggregation
│   │   ├── Recommendations.jsx    # AI-powered matching engine
│   │   ├── GISMap.jsx             # Leaflet map with all listings
│   │   ├── Tenants.jsx            # Tenant directory
│   │   └── NotFound.jsx           # 404 page
│   ├── lib/
│   │   ├── supabase.js            # Supabase client
│   │   ├── mockData.js            # Dev data (replace with Supabase queries)
│   │   └── utils.js               # Helpers: cn(), formatCurrency(), etc.
│   ├── store/
│   │   └── useAppStore.js         # Zustand global state
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
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
> Get these from: **Supabase Dashboard → Your Project → Settings → API**

### 3. Run the dev server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** The app runs fully with mock data even without Supabase configured. Set up Supabase when you're ready to connect real data.

---

## Setting Up Supabase

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New Project → choose a name and region.

### 2. Run the schema
- In Supabase Dashboard, go to **SQL Editor**
- Open `supabase_schema.sql` from this project
- Paste the contents and click **Run**

This creates all tables: `profiles`, `properties`, `rooms`, `reservations`, `reviews`, `utility_bills`, `payments`, `contracts`, `emergency_contacts`, plus views, RLS policies, and a GIS helper function.

### 3. Enable Authentication
- Supabase Dashboard → **Authentication → Providers**
- Enable **Email** (for development)
- Optionally enable **Google** or **Facebook** for production

### 4. Create storage buckets
- Dashboard → **Storage → New Bucket**
- Create: `property-images`, `contracts`, `avatars`
- Set `property-images` as **public**

### 5. Replace mock data with Supabase queries
In each page file, replace the `MOCK_*` imports with real Supabase queries. Example:

```js
// Before (mock data)
import { MOCK_PROPERTIES } from '@/lib/mockData'

// After (Supabase)
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const [properties, setProperties] = useState([])

useEffect(() => {
  supabase
    .from('properties')
    .select('*, reviews(rating)')
    .eq('status', 'active')
    .then(({ data }) => setProperties(data))
}, [])
```

---

## Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard with stats & charts | ✅ | Recharts bar chart |
| Search & filter boarding houses | ✅ | Filter by island, budget, amenities |
| Property detail page | ✅ | Reviews, amenities, owner info |
| GIS Map | ✅ | Leaflet + color-coded markers |
| Reservation management | ✅ | Table with approve/cancel |
| Reviews & ratings | ✅ | Category breakdown, star ratings |
| Recommendation engine | ✅ | Preference-based scoring algorithm |
| Tenant management | ✅ | Directory with filters |
| Property management | ✅ | Grid and list view |
| Supabase Auth | 🔜 | Schema ready, UI hookup next |
| Online Payments | 🔜 | GCash/PayMongo integration next |
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
