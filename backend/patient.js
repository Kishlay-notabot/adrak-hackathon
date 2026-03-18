const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Patient, Admission } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

const signToken = (patient) =>
  jwt.sign({ id: patient._id, role: "patient" }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ── POST /api/patient/signup ────────────────────────────────────────
// Frontend sends: { fullName, email, phone, age, gender, bloodGroup, password }
router.post("/signup", async (req, res) => {
  try {
    const { fullName, name, email, password, phone, age, gender, bloodGroup, address } = req.body;

    const exists = await Patient.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const patient = await Patient.create({
      name: fullName || name,
      email,
      password: hashed,
      phone,
      age: age || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      address: address || {},
    });

    res.status(201).json({
      token: signToken(patient),
      patient: { id: patient._id, pid: patient.pid, name: patient.name, email: patient.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patient/login ─────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const patient = await Patient.findOne({ email });
    if (!patient) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, patient.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    res.json({
      token: signToken(patient),
      patient: { id: patient._id, pid: patient.pid, name: patient.name, email: patient.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patient/me ─────────────────────────────────────────────
// Patient views own profile + recent admissions (for "Recent Visits").
router.get("/me", auth, requireRole("patient"), async (req, res) => {
  try {
    const patient = await Patient.findById(req.user.id)
      .select("-password")
      .populate("remarks.hospitalId", "name address")
      .populate("remarks.referredTo", "name address")
      .lean();
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // attach recent admissions for the "Recent Visits" section
    const admissions = await Admission.find({ patientId: req.user.id })
      .sort({ admittedAt: -1 })
      .limit(10)
      .populate("hospitalId", "name")
      .lean();

    patient.recentVisits = admissions.map((a) => ({
      id: a._id,
      hospital: a.hospitalId?.name || "Unknown",
      doctor: a.doctor,
      ward: a.ward,
      reason: a.reason,
      status: a.status,
      admittedAt: a.admittedAt,
      dischargedAt: a.dischargedAt,
    }));

    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patient/list ───────────────────────────────────────────
// Admin-only. Returns paginated admissions for the admin's hospital,
// with patient data populated. Powers the patients table.
// Query: ?status=admitted&page=1&limit=10
router.get("/list", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const hospitalId = req.user.hospitalId;

    const filter = { hospitalId };
    if (status && status !== "all") {
      filter.status = status.toLowerCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [admissions, total] = await Promise.all([
      Admission.find(filter)
        .sort({ admittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("patientId", "pid name age gender phone bloodGroup email")
        .lean(),
      Admission.countDocuments(filter),
    ]);

    // flatten patient data into each row for frontend consumption
    const rows = admissions.map((a) => ({
      admissionId: a._id,
      patientId: a.patientId?._id,
      pid: a.patientId?.pid,
      name: a.patientId?.name,
      age: a.patientId?.age,
      gender: a.patientId?.gender,
      phone: a.patientId?.phone,
      bloodGroup: a.patientId?.bloodGroup,
      email: a.patientId?.email,
      arrivalTime: a.admittedAt,
      status: a.status,
      doctor: a.doctor,
      ward: a.ward,
      reason: a.reason,
    }));

    res.json({
      patients: rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patient/:id ────────────────────────────────────────────
// Admin scans QR → hits this to see patient profile + remarks + admissions.
router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .select("-password")
      .populate("remarks.hospitalId", "name address")
      .populate("remarks.referredTo", "name address")
      .lean();
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // include admission history at this hospital
    const admissions = await Admission.find({
      patientId: req.params.id,
      hospitalId: req.user.hospitalId,
    })
      .sort({ admittedAt: -1 })
      .lean();

    patient.admissions = admissions;
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patient/:id/remarks ───────────────────────────────────
// Admin adds a remark to a patient (after scanning QR).
router.post("/:id/remarks", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { note, diagnosis, urgency, referredTo } = req.body;
    if (!note) return res.status(400).json({ error: "Note is required" });

    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    patient.remarks.push({
      hospitalId: req.user.hospitalId,
      adminId: req.user.id,
      note,
      diagnosis: diagnosis || null,
      urgency: urgency || "low",
      referredTo: referredTo || null,
    });
    await patient.save();

    res.status(201).json({ message: "Remark added", remarks: patient.remarks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;