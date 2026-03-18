const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Patient ────────────────────────────────────────────────────────
// End-user. QR code just encodes /patient/:_id (generated client-side).
// Hospitals scan it to view remarks — the passive referral trail.
const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
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

// ─── Admin ──────────────────────────────────────────────────────────
// Hospital staff. First admin to sign up creates the hospital entity.
const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ["receptionist", "manager", "superadmin"], default: "manager" },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
  },
  { timestamps: true }
);

// ─── Hospital ───────────────────────────────────────────────────────
// Capacity, OPDs, and GeoJSON location for $near queries.
const hospitalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    registrationNumber: { type: String, unique: true },
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
  PatientInflow: mongoose.model("PatientInflow", patientInflowSchema),
};
