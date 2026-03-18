const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Counter (auto-increment helper for PID-00001 style IDs) ────────
const counterSchema = new Schema({
  _id: { type: String, required: true }, // e.g. "patient_pid"
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

async function getNextPid() {
  const counter = await Counter.findByIdAndUpdate(
    "patient_pid",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `PID-${String(counter.seq).padStart(5, "0")}`;
}

// ─── Patient ────────────────────────────────────────────────────────
// End-user. QR code encodes /patient/:_id (generated client-side).
// Hospitals scan it to view remarks — the passive referral trail.
const patientSchema = new Schema(
  {
    pid: { type: String, unique: true }, // human-readable ID: PID-00001
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    age: { type: Number },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    allergies: [{ type: String, trim: true }],
    medicalConditions: [{ type: String, trim: true }],
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },

    // QR code is generated client-side from the patient's profile URL (/patient/:_id)
    // passive referral / transfer remarks left by hospital admins
    remarks: [
      {
        hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
        adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
        referredTo: { type: Schema.Types.ObjectId, ref: "Hospital" },
        note: { type: String, required: true },
        diagnosis: { type: String },
        urgency: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate PID before first save
patientSchema.pre("save", async function (next) {
  if (this.isNew && !this.pid) {
    this.pid = await getNextPid();
  }
  next();
});

// ─── Admin ──────────────────────────────────────────────────────────
// Hospital staff. First admin to sign up creates the hospital entity.
// hospitalId is optional so an admin can register first, then create/join a hospital.
const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    employeeId: { type: String, trim: true },
    department: { type: String, trim: true },
    role: { type: String, enum: ["receptionist", "manager", "superadmin"], default: "manager" },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", default: null },
  },
  { timestamps: true }
);

// ─── Hospital ───────────────────────────────────────────────────────
// Capacity, OPDs, and GeoJSON location for $near queries.
const hospitalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    registrationNumber: { type: String, unique: true, sparse: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true },
    address: {
      street: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    beds: {
      general: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
      icu: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
      emergency: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
      pediatric: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
      maternity: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
    },
    opds: [
      {
        name: { type: String, required: true },
        dailyCapacity: { type: Number, default: 0 },
        currentLoad: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    emergencyReady: { type: Boolean, default: true },
  },
  { timestamps: true }
);
hospitalSchema.index({ location: "2dsphere" });

// ─── Admission ──────────────────────────────────────────────────────
// Tracks each patient visit/stay at a hospital. Powers the patients
// table on the admin dashboard and the "Recent Visits" on patient side.
const admissionSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    admittedBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    doctor: { type: String, trim: true },
    ward: { type: String, trim: true },
    reason: { type: String, trim: true },
    opdName: { type: String, trim: true },
    status: {
      type: String,
      enum: ["admitted", "discharged", "critical"],
      default: "admitted",
    },
    admittedAt: { type: Date, default: Date.now },
    dischargedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

admissionSchema.index({ hospitalId: 1, status: 1 });
admissionSchema.index({ patientId: 1, admittedAt: -1 });

// ─── Patient Inflow ─────────────────────────────────────────────────
// One doc per hospital per day. Powers the monthly footfall graph.
const patientInflowSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    date: { type: Date, required: true },
    count: { type: Number, default: 0 },
    opdBreakdown: { type: Map, of: Number },
  },
  { timestamps: true }
);
patientInflowSchema.index({ hospitalId: 1, date: 1 }, { unique: true });

module.exports = {
  Patient: mongoose.model("Patient", patientSchema),
  Admin: mongoose.model("Admin", adminSchema),
  Hospital: mongoose.model("Hospital", hospitalSchema),
  Admission: mongoose.model("Admission", admissionSchema),
  PatientInflow: mongoose.model("PatientInflow", patientInflowSchema),
  Counter,
};