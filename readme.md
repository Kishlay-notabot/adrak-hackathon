# medflow — Technical Reference

> Hospital management system with inter-hospital patient referrals, QR-based patient lookup, resource tracking, and admin dashboards.

Stack: **React + Vite + Tailwind** (frontend) · **Express + MongoDB + Mongoose** (backend) · **JWT auth**

---

## 1. Project Filesystem

```
backend/
├── server.js                        # Express entry — mounts all route modules
├── models.js                        # All Mongoose schemas + exports
├── middleware/
│   └── auth.js                      # JWT verify, role guard, hospital guard
├── routes/
│   ├── admin.js                     # Signup, login, /me, dashboard stats
│   ├── patient.js                   # Patient signup/login, list, detail, remarks
│   ├── hospital.js                  # CRUD hospital, beds, OPDs, nearby, inflow stats, /all
│   ├── admission.js                 # Create admission, change status
│   ├── referral.js                  # Inter-hospital referrals (create, respond, cancel, list)
│   ├── medical-record.js            # Lab records per admission
│   ├── resource.js                  # Resource snapshots (beds, staff, equipment, daily flow)
│   └── seed-resources.js            # CLI script — seeds ResourceStatus from CSV
├── data/
│   └── hospital_resource_data.csv   # Source CSV for resource seeding
└── .env                             # MONGO_URI, JWT_SECRET, PORT

frontend/src/
├── lib/
│   ├── api.js                       # fetch wrapper (auto-attaches JWT, handles 401 redirect)
│   └── utils.js                     # cn() — clsx + tailwind-merge
├── components/
│   ├── ui/                          # shadcn primitives (Button, Card, Dialog, Table, etc.)
│   ├── qr-code.jsx                  # QRCodeCanvas wrapper
│   ├── stats-card.jsx               # Reusable stat card
│   └── admin/
│       ├── sidebar.jsx              # Fixed left nav — polls /referral/counts for badge
│       ├── navbar.jsx               # Top bar — title + user avatar
│       ├── patients-table.jsx       # Paginated table + detail modal + QR modal + referral modal
│       ├── patient-visits-chart.jsx  # Monthly inflow line chart (recharts)
│       ├── admission-flow-chart.jsx  # Admitted vs discharged dual-line chart
│       ├── resource-charts.jsx      # Bed/staff/equipment charts (area, bar, line)
│       ├── qr-scanner-modal.jsx     # Reusable QR scan dialog (html5-qrcode)
│       └── referral-modal.jsx       # Searchable hospital picker + urgency/reason/notes form
├── pages/
│   ├── admin/
│   │   ├── Login.jsx                # Email + password form → POST /admin/login
│   │   ├── Register.jsx             # Signup form → POST /admin/signup
│   │   ├── HospitalSetup.jsx        # Create or join hospital (post-registration)
│   │   ├── Dashboard.jsx            # Stats cards + charts + patients table
│   │   ├── Patients.jsx             # Full patients view + admit dialog
│   │   ├── Doctors.jsx              # Placeholder — doctor management
│   │   ├── QrScanner.jsx            # Camera scan → patient lookup → admit/remark/refer
│   │   ├── Referrals.jsx            # Incoming/outgoing tabs + accept/reject/cancel
│   │   ├── Resources.jsx            # Bed/staff/equipment charts page
│   │   ├── Reports.jsx              # Placeholder — reports
│   │   └── Settings.jsx             # Hospital info display + bed availability editor
│   └── patient/
│       └── (patient-facing pages)   # Login, signup, profile, QR display, visit history
└── App.jsx                          # React Router — all route definitions
```

---

## 2. Database Schema (Pseudocode)

### Counter
```
Counter {
  _id:   String (e.g. "patient_pid")
  seq:   Number (auto-incremented)
}
→ Used by getNextPid() to generate "PID-00001" style IDs
```

### Patient
```
Patient {
  pid:               String, unique, auto-generated ("PID-XXXXX")
  name:              String, required
  email:             String, required, unique, lowercase
  password:          String, hashed (bcrypt)
  phone:             String, required
  age:               Number?
  dateOfBirth:       Date?
  gender:            Enum("male", "female", "other")?
  bloodGroup:        Enum("A+","A-","B+","B-","AB+","AB-","O+","O-")?
  residenceType:     Enum("Urban", "Rural")?
  allergies:         [String]
  medicalConditions: [String]
  address: {
    street, city, state, pincode
  }
  remarks: [{                          ← transfer/clinical remarks from hospitals
    hospitalId:  → Hospital (required)
    adminId:     → Admin (required)
    referredTo:  → Hospital?
    note:        String (required)
    diagnosis:   String?
    urgency:     Enum("low","medium","high","critical"), default "low"
    date:        Date, default now
  }]
  timestamps: true
}
Indexes: pid (unique), email (unique)
Pre-save hook: auto-assigns pid via Counter if new doc
```

### Admin
```
Admin {
  name:         String, required
  email:        String, required, unique, lowercase
  password:     String, hashed
  phone:        String?
  employeeId:   String?
  department:   String?
  role:         Enum("receptionist","manager","superadmin"), default "manager"
  hospitalId:   → Hospital, default null (assigned on create/join)
  timestamps:   true
}
```

### Hospital
```
Hospital {
  name:               String, required
  registrationNumber: String, unique, sparse
  phone:              String, required
  email:              String?
  address: {
    street, city (req), state (req), pincode (req)
  }
  location: {
    type:        "Point"
    coordinates: [Number] (lng, lat)    ← GeoJSON for $near queries
  }
  beds: {
    general:    { total: Number, available: Number }
    icu:        { total, available }
    emergency:  { total, available }
    pediatric:  { total, available }
    maternity:  { total, available }
  }
  opds: [{
    name:          String (required)
    dailyCapacity: Number
    currentLoad:   Number
    isActive:      Boolean
  }]
  isActive:       Boolean, default true
  emergencyReady: Boolean, default true
  timestamps:     true
}
Indexes: location (2dsphere)
```

### Admission
```
Admission {
  patientId:      → Patient (required)
  hospitalId:     → Hospital (required)
  admittedBy:     → Admin (required)
  doctor:         String?
  ward:           String?
  reason:         String?
  opdName:        String?
  admissionType:  Enum("Emergency","OPD"), default "Emergency"
  isEmergency:    Boolean, default false
  status:         Enum("admitted","discharged","critical","expired","dama"), default "admitted"
  admittedAt:     Date, default now
  dischargedAt:   Date?
  lengthOfStayHours:  Number?
  icuStayDuration:    Number?
  comorbidityScore:   Number?
  serviceIntensity:   Number?
  timestamps: true
}
Indexes: (hospitalId + status), (patientId + admittedAt desc)
```

### Referral
```
Referral {
  patientId:      → Patient (required)
  admissionId:    → Admission?             ← optional link to source admission
  fromHospitalId: → Hospital (required)
  toHospitalId:   → Hospital (required)
  referredBy:     → Admin (required)       ← admin who created referral
  respondedBy:    → Admin?                 ← admin who accepted/rejected
  reason:         String?
  notes:          String?
  urgency:        Enum("low","medium","high","critical"), default "medium"
  status:         Enum("pending","accepted","rejected","completed","cancelled"), default "pending"
  respondedAt:    Date?
  timestamps:     true
}
Indexes: (fromHospitalId + status), (toHospitalId + status), (patientId)

Lifecycle:
  pending  → accepted   (target hospital admin)
  pending  → rejected   (target hospital admin)
  pending  → cancelled  (source hospital admin)
  accepted → completed  (future: when patient actually transfers)
```

### MedicalRecord
```
MedicalRecord {
  patientId:   → Patient (required)
  admissionId: → Admission (required)
  hospitalId:  → Hospital (required)

  -- Lab values --
  hb, tlc, platelets, glucose, urea, creatinine, bnp: Number?
  ef: Number?
  raisedCardiacEnzymes: Boolean

  -- Conditions (all Boolean, default false) --
  smoking, alcohol, diabetes, hypertension, cad, priorCmp, ckd,
  severeAnaemia, anaemia, stableAngina, acs, stemi, atypicalChestPain,
  heartFailure, hfref, hfnef, valvular, chb, sss, aki,
  cvaInfarct, cvaBleed, af, vt, psvt, congenital, uti,
  neuroCardiogenicSyncope, orthostatic, infectiveEndocarditis,
  dvt, cardiogenicShock, shock, pulmonaryEmbolism, chestInfection

  recordedAt: Date, default now
  timestamps: true
}
Indexes: (patientId), (admissionId)
```

### ResourceStatus
```
ResourceStatus {
  hospitalId:  → Hospital (required)
  timestamp:   Date (required)

  -- Bed snapshot --
  totalBeds, occupiedBeds, availableBeds:       Number
  totalIcuBeds, occupiedIcuBeds, availableIcuBeds: Number

  -- Staff snapshot --
  totalDoctors, availableDoctors:   Number
  totalNurses, availableNurses:     Number

  -- Equipment snapshot --
  ventilatorsTotal, ventilatorsInUse:   Number
  oxygenUnitsTotal, oxygenUnitsInUse:   Number

  -- Patient flow (hourly) --
  incomingPatients, dischargedPatients: Number
  emergencyCases, opdCases:            Number

  -- Computed metrics --
  avgWaitTimeMinutes, avgTreatmentTimeMinutes: Number
  bedTurnoverRate, resourceUtilizationRate:    Number
  icuUtilizationRate, staffLoadRatio:          Number
  emergencyPressureScore:                      Number

  timestamps: true
}
Index: (hospitalId + timestamp desc)
Populated via: seed-resources.js CLI script from CSV
```

### PatientInflow
```
PatientInflow {
  hospitalId: → Hospital (required)
  date:       Date (required)          ← midnight of that day
  count:      Number, default 0        ← auto-bumped on each admission
  opdBreakdown: Map<String, Number>    ← per-OPD counts
  timestamps: true
}
Index: (hospitalId + date), unique
```

---

## 3. Authentication & Middleware

```
JWT payload: { id, role, hospitalId? }
Token lifetime: 7 days
Storage: localStorage ("token", "user", "role")

Middleware chain:
  auth(req, res, next)
    → Extracts Bearer token from Authorization header
    → Verifies with JWT_SECRET
    → Attaches req.user = { id, role, hospitalId }
    → Casts hospitalId to ObjectId for Mongo compatibility

  requireRole(...roles)
    → Checks req.user.role is in allowed list
    → 403 if not

  requireHospital
    → Checks req.user.hospitalId is truthy
    → 400 "No hospital assigned" if not

Client-side:
  api.js auto-attaches token to every request
  On 401 response → clears localStorage → redirects to login
  isLoggedIn() decodes JWT and checks exp client-side
```

---

## 4. API Route Reference

All routes are prefixed with `/api`. Auth-protected routes require `Authorization: Bearer <token>`.

### 4.1 Admin — `/api/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/signup` | None | Create admin account. Body: `{ fullName, email, password, employeeId, department }`. Returns `{ token, admin }`. hospitalId starts as null. |
| `POST` | `/login` | None | Login. Body: `{ email, password }`. Returns `{ token, admin }`. |
| `GET` | `/me` | Admin | Get own profile (populates hospitalId). |
| `GET` | `/dashboard/stats` | Admin + Hospital | Aggregate stats: totalPatients (distinct across admissions), totalStaff (admins at this hospital), activePatients (admitted+critical), totalWards (bed categories with capacity > 0). |

### 4.2 Patient — `/api/patient`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/signup` | None | Create patient. Body: `{ fullName, email, password, phone, age?, gender?, bloodGroup? }`. Auto-generates PID. Returns `{ token, patient }`. |
| `POST` | `/login` | None | Login. Body: `{ email, password }`. Returns `{ token, patient }`. |
| `GET` | `/me` | Patient | Own profile + last 10 admissions as `recentVisits[]`. Populates remarks. |
| `GET` | `/list` | Admin + Hospital | Paginated admission list for admin's hospital. Query: `?status=admitted|discharged|critical|all&page=1&limit=10`. Returns flattened rows with patient data. |
| `GET` | `/:id` | Admin | Full patient profile by ObjectId. Includes remarks (populated hospital names) and admissions at the requesting admin's hospital. |
| `POST` | `/:id/remarks` | Admin + Hospital | Add clinical remark. Body: `{ note, diagnosis?, urgency?, referredTo? }`. Pushes to patient.remarks array. |

### 4.3 Hospital — `/api/hospital`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/all` | Admin + Hospital | All active hospitals in network, excluding own. Returns `[{ _id, name, address, phone, beds }]` sorted by name. Used for referral dropdown. |
| `POST` | `/create` | Admin (no hospital yet) | Register new hospital and link admin. Body: `{ name, phone, address, coordinates:[lng,lat], registrationNumber?, beds?, opds? }`. Returns `{ hospital, token }` (refreshed JWT with hospitalId). |
| `POST` | `/join` | Admin (no hospital yet) | Link admin to existing hospital by ID. Body: `{ hospitalId }`. Returns `{ hospital, token }`. |
| `GET` | `/mine` | Admin + Hospital | Get own hospital full document. |
| `PUT` | `/mine` | Admin + Hospital | Update hospital fields (full replace). |
| `PATCH` | `/mine/beds` | Admin + Hospital | Quick bed update. Body: `{ general: { total: 50, available: 12 }, icu: { available: 3 } }`. Sets specific nested fields. |
| `PATCH` | `/mine/opds` | Admin + Hospital | Update single OPD. Body: `{ opdId, currentLoad?, isActive? }`. |
| `GET` | `/nearby` | Admin + Hospital | Geo query. Query: `?lng=77.21&lat=28.63&maxDistance=10000`. Returns hospitals within radius, excluding own. |
| `GET` | `/inflow/stats` | Admin + Hospital | Monthly aggregated patient counts. Query: `?months=6|12|all`. Aggregates PatientInflow by year+month. |

### 4.4 Admission — `/api/admission`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | Admin + Hospital | Admit patient. Body: `{ patientId, doctor?, ward?, reason?, opdName? }`. Creates Admission doc + bumps PatientInflow counter for today. |
| `PATCH` | `/:id/status` | Admin + Hospital | Change status. Body: `{ status: "admitted"|"discharged"|"critical" }`. Sets dischargedAt on discharge. Scoped to admin's hospital. |
| `GET` | `/:id` | Admin | Single admission detail. Populates patient, hospital, admittedBy. |

### 4.5 Referral — `/api/referral`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | Admin + Hospital | Create referral. Body: `{ patientId, toHospitalId, admissionId?, reason?, notes?, urgency? }`. Validates: can't self-refer, no duplicate pending. Returns populated referral. |
| `GET` | `/outgoing` | Admin + Hospital | Referrals FROM this hospital. Query: `?status=pending|accepted|rejected|cancelled|all&page=1&limit=20`. Populates patient, toHospital, referredBy, respondedBy. |
| `GET` | `/incoming` | Admin + Hospital | Referrals TO this hospital. Same query params. Populates patient, fromHospital, referredBy, respondedBy. |
| `GET` | `/counts` | Admin + Hospital | Badge counts: `{ incomingPending, outgoingPending }`. Polled every 30s by sidebar. |
| `PATCH` | `/:id/respond` | Admin + Hospital | Accept or reject incoming referral. Body: `{ action: "accepted"|"rejected" }`. Only works on pending referrals addressed to this hospital. Sets respondedBy, respondedAt. |
| `PATCH` | `/:id/cancel` | Admin + Hospital | Cancel outgoing referral. Only works on pending referrals FROM this hospital. |
| `GET` | `/:id` | Admin | Full referral detail with all populated refs. |

### 4.6 Medical Records — `/api/medical-records`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/patient/:patientId` | Admin | All records for a patient (sorted by date desc). Populates hospital name. |
| `GET` | `/admission/:admissionId` | Any authed | Single record for a specific admission. |
| `POST` | `/` | Admin + Hospital | Create record. Body: `{ admissionId, patientId, hb?, tlc?, ...booleans }`. |
| `GET` | `/my` | Patient | Own medical records. |
| `GET` | `/stats` | Admin + Hospital | Aggregate: total records, condition counts (diabetes, hypertension, etc.), avg lab values. For dashboard/ML. |

### 4.7 Resources — `/api/resources`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/daily-flow` | Admin + Hospital | Admitted vs discharged per day. Query: `?days=30`. Tries ResourceStatus first (hourly → daily aggregation), falls back to Admission collection. |
| `GET` | `/bed-utilization` | Admin + Hospital | Daily avg bed + ICU occupancy from ResourceStatus. Query: `?days=30`. |
| `GET` | `/staff` | Admin + Hospital | Daily avg available doctors + nurses. Query: `?days=30`. |
| `GET` | `/equipment` | Admin + Hospital | Daily avg ventilator + oxygen usage. Query: `?days=30`. |
| `GET` | `/overview` | Admin + Hospital | Latest ResourceStatus snapshot (for stat cards). Returns single document or null. |

### 4.8 Utility

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | `{ status: "ok" }` |

---

## 5. Frontend Page Map

```
/admin/login          → Login.jsx           (public)
/admin/register       → Register.jsx        (public)
/admin/hospital-setup → HospitalSetup.jsx   (auth, no hospital yet)
/admin/dashboard      → Dashboard.jsx       (auth + hospital)
/admin/patients       → Patients.jsx        (auth + hospital)
/admin/doctors        → Doctors.jsx         (auth, placeholder)
/admin/qr-scanner     → QrScanner.jsx       (auth + hospital)
/admin/referrals      → Referrals.jsx       (auth + hospital)
/admin/resources      → Resources.jsx       (auth + hospital)
/admin/reports        → Reports.jsx         (auth, placeholder)
/admin/settings       → Settings.jsx        (auth + hospital)
```

Every authenticated admin page follows the same shell:
```
┌──────────┬──────────────────────────────────┐
│          │  AdminNavbar (title + avatar)     │
│  Admin   │──────────────────────────────────│
│  Sidebar │                                  │
│  (fixed  │  <main> page content             │
│   w-60)  │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### Key UI Flows

**Referral (outbound):**
1. Admin views patient (table detail modal, QR scanner result, or patients page)
2. Clicks "Refer" button on an active admission
3. `ReferralModal` opens → searchable dropdown of all network hospitals
4. Selects hospital, sets urgency, reason, notes → submits
5. `POST /api/referral` creates pending referral

**Referral (inbound):**
1. Sidebar badge shows pending incoming count (polled every 30s via `/referral/counts`)
2. Admin clicks "Referrals" → Referrals.jsx → "Incoming" tab
3. Sees referral cards with patient info, source hospital, urgency
4. Clicks "Accept" or "Reject" → `PATCH /referral/:id/respond`

**QR Scanner flow:**
1. Camera activates via html5-qrcode library
2. Decodes QR → extracts 24-char ObjectId
3. Fetches patient via `GET /patient/:id`
4. Shows patient profile + admission history at this hospital
5. Actions: Admit, Add Remark, Refer, Discharge, Mark Critical

**Patient admission:**
1. Admin gets patient ID (via QR scan or manual entry)
2. `POST /admission` → creates Admission + bumps PatientInflow
3. Patient appears in patients table under "Admitted" tab

---

## 6. Environment Variables

```env
MONGO_URI=mongodb://localhost:27017/medflow
JWT_SECRET=your-secret-key
PORT=5000
VITE_API_URL=http://localhost:5000/api   # frontend .env
```

---