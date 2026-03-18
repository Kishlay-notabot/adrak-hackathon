const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Admin, Hospital } = require("./models");
const { auth, requireRole } = require("./auth");

const signToken = (admin) =>
  jwt.sign(
    { id: admin._id, role: "admin", hospitalId: admin.hospitalId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// ── POST /api/admin/signup ──────────────────────────────────────────
// Creates the hospital entity first, then the admin linked to it.
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, role, hospital } = req.body;
    // hospital: { name, registrationNumber, phone, email, address, coordinates:[lng,lat], beds, opds }

    if (!hospital) return res.status(400).json({ error: "Hospital details required" });

    const exists = await Admin.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    // create hospital
    const newHospital = await Hospital.create({
      name: hospital.name,
      registrationNumber: hospital.registrationNumber,
      phone: hospital.phone,
      email: hospital.email,
      address: hospital.address,
      location: { type: "Point", coordinates: hospital.coordinates },
      beds: hospital.beds || {},
      opds: hospital.opds || [],
    });

    // create admin
    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name,
      email,
      password: hashed,
      phone,
      role: role || "manager",
      hospitalId: newHospital._id,
    });

    res.status(201).json({ token: signToken(admin), admin: { id: admin._id, name, email, hospitalId: newHospital._id } });
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

    res.json({ token: signToken(admin), admin: { id: admin._id, name: admin.name, hospitalId: admin.hospitalId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/me ───────────────────────────────────────────────
router.get("/me", auth, requireRole("admin"), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password").populate("hospitalId");
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
