const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Patient } = require("../models");
const { auth, requireRole } = require("../middleware/auth");

const signToken = (patient) =>
  jwt.sign({ id: patient._id, role: "patient" }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ── POST /api/patient/signup ────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, dateOfBirth, gender, address } = req.body;

    const exists = await Patient.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const patient = await Patient.create({ name, email, password: hashed, phone, dateOfBirth, gender, address });

    res.status(201).json({ token: signToken(patient), patient: { id: patient._id, name, email } });
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

    res.json({ token: signToken(patient), patient: { id: patient._id, name: patient.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patient/me ─────────────────────────────────────────────
// Patient views own profile
router.get("/me", auth, requireRole("patient"), async (req, res) => {
  try {
    const patient = await Patient.findById(req.user.id)
      .select("-password")
      .populate("remarks.hospitalId", "name address")
      .populate("remarks.referredTo", "name address");
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patient/:id ────────────────────────────────────────────
// Admin scans QR → hits this to see patient profile + remarks
router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .select("-password")
      .populate("remarks.hospitalId", "name address")
      .populate("remarks.referredTo", "name address");
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patient/:id/remarks ───────────────────────────────────
// Admin adds a remark to a patient (after scanning QR)
router.post("/:id/remarks", auth, requireRole("admin"), async (req, res) => {
  try {
    const { note, diagnosis, urgency, referredTo } = req.body;
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    patient.remarks.push({
      hospitalId: req.user.hospitalId,
      adminId: req.user.id,
      note,
      diagnosis,
      urgency,
      referredTo: referredTo || null,
    });
    await patient.save();

    res.status(201).json({ message: "Remark added", remarks: patient.remarks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
