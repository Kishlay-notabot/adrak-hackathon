const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { Hospital, Admin, PatientInflow } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// Helper: reissue token with updated hospitalId
function refreshToken(admin) {
  return jwt.sign(
    { id: admin._id, role: "admin", hospitalId: admin.hospitalId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ── POST /api/hospital/create ───────────────────────────────────────
// Admin creates a new hospital and gets linked to it.
// Called after admin signup when they're ready to register their hospital.
// Body: { name, registrationNumber?, phone, email?, address, coordinates:[lng,lat], beds?, opds? }
router.post("/create", auth, requireRole("admin"), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    if (admin.hospitalId) return res.status(400).json({ error: "Already linked to a hospital" });

    const { name, registrationNumber, phone, email, address, coordinates, beds, opds } = req.body;
    if (!name || !phone || !address || !coordinates)
      return res.status(400).json({ error: "name, phone, address, and coordinates are required" });

    const hospital = await Hospital.create({
      name,
      registrationNumber: registrationNumber || null,
      phone,
      email: email || null,
      address,
      location: { type: "Point", coordinates },
      beds: beds || {},
      opds: opds || [],
    });

    // link admin to the new hospital
    admin.hospitalId = hospital._id;
    await admin.save();

    res.status(201).json({ hospital, token: refreshToken(admin) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/hospital/join ─────────────────────────────────────────
// Admin joins an existing hospital by its ID.
// Body: { hospitalId }
router.post("/join", auth, requireRole("admin"), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    if (admin.hospitalId) return res.status(400).json({ error: "Already linked to a hospital" });

    const hospital = await Hospital.findById(req.body.hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    admin.hospitalId = hospital._id;
    await admin.save();

    res.json({ hospital, token: refreshToken(admin) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hospital/mine ──────────────────────────────────────────
// Admin views their own hospital dashboard data.
router.get("/mine", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.user.hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/hospital/mine ──────────────────────────────────────────
// Update hospital details (beds, OPDs, contact info, etc.).
router.put("/mine", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.user.hospitalId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/hospital/mine/beds ───────────────────────────────────
// Quick bed availability update.
// Body: { general: { available: 10 }, icu: { available: 3 } }
router.patch("/mine/beds", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const setBeds = {};
    for (const [category, values] of Object.entries(req.body)) {
      for (const [field, val] of Object.entries(values)) {
        setBeds[`beds.${category}.${field}`] = val;
      }
    }
    const hospital = await Hospital.findByIdAndUpdate(
      req.user.hospitalId,
      { $set: setBeds },
      { new: true }
    );
    res.json(hospital.beds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/hospital/mine/opds ───────────────────────────────────
// Update a specific OPD. Body: { opdId, currentLoad?, isActive? }
router.patch("/mine/opds", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { opdId, ...fields } = req.body;
    if (!opdId) return res.status(400).json({ error: "opdId is required" });

    const setFields = {};
    for (const [key, val] of Object.entries(fields)) {
      setFields[`opds.$.${key}`] = val;
    }
    const hospital = await Hospital.findOneAndUpdate(
      { _id: req.user.hospitalId, "opds._id": opdId },
      { $set: setFields },
      { new: true }
    );
    if (!hospital) return res.status(404).json({ error: "OPD not found" });
    res.json(hospital.opds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hospital/nearby ────────────────────────────────────────
// Surrounding hospitals sorted by distance. Excludes own.
// Query: ?lng=77.21&lat=28.63&maxDistance=10000 (meters, default 10km)
router.get("/nearby", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { lng, lat, maxDistance = 10000 } = req.query;
    if (!lng || !lat) return res.status(400).json({ error: "lng and lat are required" });

    const hospitals = await Hospital.find({
      _id: { $ne: req.user.hospitalId },
      isActive: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance),
        },
      },
    }).select("name address beds opds emergencyReady location");

    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hospital/inflow/stats ──────────────────────────────────
// Monthly footfall for the dashboard chart.
// Query: ?months=6 (default 6)
router.get("/inflow/stats", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const stats = await PatientInflow.aggregate([
      {
        $match: {
          hospitalId: req.user.hospitalId,
          date: { $gte: since },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$count" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          total: 1,
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;