const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Admin, Patient, Admission, Hospital } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

const signToken = (admin) =>
  jwt.sign(
    { id: admin._id, role: "admin", hospitalId: admin.hospitalId || null },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// ── POST /api/admin/signup ──────────────────────────────────────────
// Creates admin account. hospitalId is optional — admin can create or
// join a hospital later via /api/hospital/create.
// Frontend sends: { fullName, email, employeeId, department, password }
router.post("/signup", async (req, res) => {
  try {
    const { fullName, name, email, password, phone, employeeId, department, role } = req.body;

    const exists = await Admin.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name: fullName || name, // frontend sends fullName, accept both
      email,
      password: hashed,
      phone: phone || null,
      employeeId: employeeId || null,
      department: department || null,
      role: role || "manager",
      hospitalId: null, // assigned when admin creates or joins a hospital
    });

    res.status(201).json({
      token: signToken(admin),
      admin: { id: admin._id, pid: admin.employeeId, name: admin.name, email: admin.email, hospitalId: null },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/login ───────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    res.json({
      token: signToken(admin),
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        employeeId: admin.employeeId,
        department: admin.department,
        hospitalId: admin.hospitalId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/me ───────────────────────────────────────────────
router.get("/me", auth, requireRole("admin"), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id)
      .select("-password")
      .populate("hospitalId");
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/dashboard/stats ──────────────────────────────────
// Returns aggregate stats for the admin dashboard cards.
// Requires admin to have a hospital assigned.
router.get("/dashboard/stats", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    // total unique patients ever admitted to this hospital
    const totalPatients = await Admission.distinct("patientId", { hospitalId });

    // staff count at this hospital
    const totalStaff = await Admin.countDocuments({ hospitalId });

    // currently admitted or critical
    const activePatients = await Admission.countDocuments({
      hospitalId,
      status: { $in: ["admitted", "critical"] },
    });

    // bed categories that have capacity > 0
    const hospital = await Hospital.findById(hospitalId).select("beds").lean();
    let totalWards = 0;
    if (hospital?.beds) {
      for (const cat of Object.values(hospital.beds)) {
        if (cat.total > 0) totalWards++;
      }
    }

    res.json({
      totalPatients: totalPatients.length,
      totalStaff,
      activePatients,
      totalWards,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;