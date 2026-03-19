// backend/models.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Counter (auto-increment helper for PID-00001 style IDs) ────────
const counterSchema = new Schema({
  _id: { type: String, required: true },
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
const patientSchema = new Schema(
  {
    pid: { type: String, unique: true },
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
    residenceType: { type: String, enum: ["Urban", "Rural"] },
    allergies: [{ type: String, trim: true }],
    medicalConditions: [{ type: String, trim: true }],
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

patientSchema.pre("save", async function (next) {
  if (this.isNew && !this.pid) {
    this.pid = await getNextPid();
  }
  next();
});

// ─── Admin ──────────────────────────────────────────────────────────
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
      coordinates: { type: [Number], required: true },
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
const admissionSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    admittedBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    doctor: { type: String, trim: true },
    ward: { type: String, trim: true },
    reason: { type: String, trim: true },
    opdName: { type: String, trim: true },
    admissionType: { type: String, enum: ["Emergency", "OPD"], default: "Emergency" },
    isEmergency: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["admitted", "discharged", "critical", "expired", "dama"],
      default: "admitted",
    },
    admittedAt: { type: Date, default: Date.now },
    dischargedAt: { type: Date, default: null },
    lengthOfStayHours: { type: Number },
    icuStayDuration: { type: Number },
    comorbidityScore: { type: Number },
    serviceIntensity: { type: Number },
  },
  { timestamps: true }
);

admissionSchema.index({ hospitalId: 1, status: 1 });
admissionSchema.index({ patientId: 1, admittedAt: -1 });

// ─── Medical Record ─────────────────────────────────────────────────
const medicalRecordSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    admissionId: { type: Schema.Types.ObjectId, ref: "Admission", required: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    hb: { type: Number },
    tlc: { type: Number },
    platelets: { type: Number },
    glucose: { type: Number },
    urea: { type: Number },
    creatinine: { type: Number },
    bnp: { type: Number },
    raisedCardiacEnzymes: { type: Boolean, default: false },
    ef: { type: Number },
    smoking: { type: Boolean, default: false },
    alcohol: { type: Boolean, default: false },
    diabetes: { type: Boolean, default: false },
    hypertension: { type: Boolean, default: false },
    cad: { type: Boolean, default: false },
    priorCmp: { type: Boolean, default: false },
    ckd: { type: Boolean, default: false },
    severeAnaemia: { type: Boolean, default: false },
    anaemia: { type: Boolean, default: false },
    stableAngina: { type: Boolean, default: false },
    acs: { type: Boolean, default: false },
    stemi: { type: Boolean, default: false },
    atypicalChestPain: { type: Boolean, default: false },
    heartFailure: { type: Boolean, default: false },
    hfref: { type: Boolean, default: false },
    hfnef: { type: Boolean, default: false },
    valvular: { type: Boolean, default: false },
    chb: { type: Boolean, default: false },
    sss: { type: Boolean, default: false },
    aki: { type: Boolean, default: false },
    cvaInfarct: { type: Boolean, default: false },
    cvaBleed: { type: Boolean, default: false },
    af: { type: Boolean, default: false },
    vt: { type: Boolean, default: false },
    psvt: { type: Boolean, default: false },
    congenital: { type: Boolean, default: false },
    uti: { type: Boolean, default: false },
    neuroCardiogenicSyncope: { type: Boolean, default: false },
    orthostatic: { type: Boolean, default: false },
    infectiveEndocarditis: { type: Boolean, default: false },
    dvt: { type: Boolean, default: false },
    cardiogenicShock: { type: Boolean, default: false },
    shock: { type: Boolean, default: false },
    pulmonaryEmbolism: { type: Boolean, default: false },
    chestInfection: { type: Boolean, default: false },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patientId: 1 });
medicalRecordSchema.index({ admissionId: 1 });

// ─── Resource Status ────────────────────────────────────────────────
// Hourly snapshots of hospital resource utilization.
// Seeded from hospital_resource_data CSV.
const resourceStatusSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    timestamp: { type: Date, required: true },

    // Beds
    totalBeds: { type: Number, default: 0 },
    occupiedBeds: { type: Number, default: 0 },
    availableBeds: { type: Number, default: 0 },

    // ICU
    totalIcuBeds: { type: Number, default: 0 },
    occupiedIcuBeds: { type: Number, default: 0 },
    availableIcuBeds: { type: Number, default: 0 },

    // Staff
    totalDoctors: { type: Number, default: 0 },
    availableDoctors: { type: Number, default: 0 },
    totalNurses: { type: Number, default: 0 },
    availableNurses: { type: Number, default: 0 },

    // Equipment
    ventilatorsTotal: { type: Number, default: 0 },
    ventilatorsInUse: { type: Number, default: 0 },
    oxygenUnitsTotal: { type: Number, default: 0 },
    oxygenUnitsInUse: { type: Number, default: 0 },

    // Patient flow
    incomingPatients: { type: Number, default: 0 },
    dischargedPatients: { type: Number, default: 0 },
    emergencyCases: { type: Number, default: 0 },
    opdCases: { type: Number, default: 0 },

    // Metrics
    avgWaitTimeMinutes: { type: Number, default: 0 },
    avgTreatmentTimeMinutes: { type: Number, default: 0 },
    bedTurnoverRate: { type: Number, default: 0 },
    resourceUtilizationRate: { type: Number, default: 0 },
    icuUtilizationRate: { type: Number, default: 0 },
    staffLoadRatio: { type: Number, default: 0 },
    emergencyPressureScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

resourceStatusSchema.index({ hospitalId: 1, timestamp: -1 });

// ─── Patient Inflow ─────────────────────────────────────────────────
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
  MedicalRecord: mongoose.model("MedicalRecord", medicalRecordSchema),
  ResourceStatus: mongoose.model("ResourceStatus", resourceStatusSchema),
  PatientInflow: mongoose.model("PatientInflow", patientInflowSchema),
  Counter,
};
