# Nagpur Properties & Saraswati Nagri — Resale Desk CRM

A dedicated real estate brokerage CRM built for the **Resale Desk**, drawing architecture, legal verification checks, and workflow patterns directly from the **Saraswati Nagri CRM** and **propertiesnagpur.com/admin**.

---

## 🌟 Key Functional Modules

### 1. 👥 Leads Management Section (Demand & Supply)
* **Dual-Sided Brokerage Architecture**:
  * **Demand Side (Buyers & Tenants)**: Captures buyers seeking resale flats/villas/plots and prospective tenants.
  * **Supply Side (Sellers & Landlords)**: Captures property owners seeking to list properties for resale or rent out.
* **Fast Add Lead Modal**:
  * Contact identity (Name, Phone, WhatsApp, Email).
  * Resale Intent selection:
    * `Wants to Buy a Property (Resale)`
    * `Wants to Rent a Property`
    * `Wants to Sell Their Property (House/Villa/Farm)`
    * `Wants to Rent Out Their Property`
  * Property category preference (`Apartment / Flat`, `Independent House / Row House`, `NMRDA Sanctioned Plot`, `Commercial`, `Farmhouse`).
  * BHK Preferences (`1 BHK`, `2 BHK`, `3 BHK`, `4 BHK`, `Plot`).
  * Multi-select Nagpur Corridors (`Besa`, `Wardha Road`, `Manish Nagar`, `Somalwada`, `Shankarpur`, `Hingna Road`, `Koradi Road`, `Godhani`, `Lonara`, `Dharampeth`, etc.).
  * Budget range slider/presets with Lakhs & Crores formatting (e.g., ₹40L - ₹65L).
  * Priority (`Hot 🔥`, `Warm ⚡`, `Cold ❄️`).
  * Lead Source (`Website`, `JustDial`, `Direct Call`, `Walk-in`, `Referral`, `MagicBricks`, `99acres`).
  * Field Agent assignment.
* **Lead Detail Drawer**:
  * **Stage Progression Pipeline**: 1-click stage advancement (`New` → `In Contact` → `Site Visit Scheduled` → `Visit Done` → `Negotiation` → `Token Paid` → `Closed` → `Lost`).
  * **Call Trail & History**: Complete log of phone calls, discussions, and outcomes (`Interested`, `Scheduled Visit`, `Follow-up Needed`, `Budget Mismatch`, etc.).
  * **Site Visits**: Directly schedule, reschedule, and review completed property site visits.
  * **One-Click Instant WhatsApp**: Automatically generates tailored WhatsApp message templates to pitch properties to leads.

---

### 2. 🏡 Add Property Section & Inventory
* **Exhaustive Listing Creation Form**:
  * **Property Title & Headline**: Custom descriptive listing names.
  * **Deal Type**: Resale / Outright Sale vs For Rent / Lease.
  * **Nagpur Locality & Corridor Belt**: Pre-populated with authentic Nagpur corridors (Besa, Wardha Road, Hingna, etc.).
  * **Pricing & Commercials**:
    * Total Asking Price (auto-converted to readable Lakhs & Crores).
    * Rate per sq.ft calculation.
    * Monthly maintenance charges.
    * Price negotiation flexibility toggle.
    * Resale Desk brokerage commission % (e.g., 2%).
  * **Dimensions & Specifications**:
    * Super Built-up Area & Carpet Area (in sq.ft).
    * Configuration (BHK, Bathrooms, Balconies, Floor number, Total floors).
    * Facing & Vastu direction (`East`, `North`, `North-East`, `West`, `South`).
    * Furnishing status (`Unfurnished`, `Semi-Furnished`, `Fully Furnished`).
    * Age of Property / Possession timeline.
  * **12-Point Legal Sanction & Verification Audit** (modeled after *propertiesnagpur.com* verification engine):
    * ✅ NMRDA Sanctioned Layout check.
    * ✅ Release Letter (RL in Hand) check.
    * ✅ MahaRERA Registration verification & RERA Number.
    * ✅ 7/12 & Khasra Clear Title check.
    * ✅ NIT / NMC Sanction check.
    * ✅ Nationalized Bank Loan eligibility (SBI, HDFC, ICICI, BOM).
  * **Amenities**: Covered car parking, elevator/lift, 24x7 security guard, CCTV, power backup, borewell & NMC water, gated layout, children's play area, etc.
  * **Media & Gallery**: Cover image with instant visual presets (Flats, Villas, Plots, Offices) plus custom photo URLs.
  * **Owner & Broker Details**: Seller name, primary phone, WhatsApp, and private viewing/key availability instructions.
* **Shareable WhatsApp Brochure Generator**:
  * 1-click formatted copy-paste text ready to send to prospective buyers on WhatsApp with complete specs, legal approvals, and pricing.

---

### 3. ⚡ Smart Property-Lead Matchmaker
* **Bidirectional Compatibility Engine**:
  * Select any **Lead** → Instantly calculates and lists all matching properties in inventory with compatibility score (0-100%) and reasons (Locality match, budget fit, BHK match).
  * Select any **Property** → Instantly shows all registered buyer leads whose requirements fit this listing.
  * 1-click **WhatsApp Pitch** button directly sends property details to the matched lead.

---

### 4. 📅 Site Visits Scheduler
* Dedicated coordination board for field executives showing properties in Besa, Wardha Road, Manish Nagar, and Shankarpur.
* Track scheduled, completed, and rescheduled visits with date, time slot, client, property, and assigned agent.
* 1-click WhatsApp reminder to client.

---

### 5. 💾 Offline-First Persistence & Data Tools
* Automatically saves all leads and properties to browser `localStorage` (changes persist across refreshes).
* **Export to CSV**: Download complete leads or property catalog in Excel-ready CSV format.
* **Full JSON Backup**: 1-click download of the complete database backup.
* **Restore from Backup**: Upload JSON backup anytime.
* **Reset to Demo Data**: Instant restore of authentic Saraswati Nagri & Nagpur Properties records.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Run

```bash
# 1. Navigate to the project directory
cd Resale_desk_crm

# 2. Start the development server
npm run dev
```

Open your browser at:
`http://localhost:5173`

### Production Build

```bash
npm run build
```

Compiles TypeScript and bundles production-ready static assets in `dist/`.

---

## 🛠️ Technology Stack & Database
- **Frontend Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS matching Saraswati Nagri CRM dark navy & amber/rose branding
- **Backend & Database**: 
  - Live Supabase integration (`https://bdrmbhbzlbudpfvqdjga.supabase.co`)
  - Direct connection to `public.leads`, `public.lead_interactions`, `public.projects`, and `public.profiles`
  - Resale Properties table script ready in `resale_properties_setup.sql` (or `supabase/migrations/001_resale_properties.sql`)
  - Seamless background fallback to browser local storage so sales agents can always add and manage properties without disruption

---

## 🗄️ Database Setup (Optional Cloud Storage)

To store resale properties in the cloud Supabase database:
1. Open your Supabase Dashboard: `https://bdrmbhbzlbudpfvqdjga.supabase.co`
2. Go to the **SQL Editor**
3. Paste the contents of `resale_properties_setup.sql`
4. Click **Run**
5. All properties will immediately sync live to your Supabase cloud backend!


