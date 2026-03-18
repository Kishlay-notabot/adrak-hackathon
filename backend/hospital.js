const router = require("express").Router();
const { Hospital, PatientInflow } = require("./models");
const { auth, requireRole } = require("./auth");

// ── GET /api/hospital/mine ──────────────────────────────────────────
// Admin views their own hospital dashboard data
router.get("/mine", auth, requireRole("admin"), async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.user.hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/hospital/mine ──────────────────────────────────────────
// Update hospital details (beds, OPDs, contact info, etc.)
router.put("/mine", auth, requireRole("admin"), async (req, res) => {
  try {
    const updates = req.body; // pass whichever fields need updating
    const hospital = await Hospital.findByIdAndUpdate(req.user.hospitalId, updates, {
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
// Quick bed availability update — send { general: { available: 10 }, icu: { available: 3 } }
router.patch("/mine/beds", auth, requireRole("admin"), async (req, res) => {
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
// Update an OPD's currentLoad or isActive — send { opdId, currentLoad?, isActive? }
router.patch("/mine/opds", auth, requireRole("admin"), async (req, res) => {
  try {
    const { opdId, ...fields } = req.body;
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
// Returns hospitals within a radius, sorted by distance.
// Query params: ?lng=77.21&lat=28.63&maxDistance=10000 (meters, default 10km)
router.get("/nearby", auth, requireRole("admin"), async (req, res) => {
  try {
    const { lng, lat, maxDistance = 10000 } = req.query;
    if (!lng || !lat) return res.status(400).json({ error: "lng and lat required" });

    const hospitals = await Hospital.find({
      _id: { $ne: req.user.hospitalId }, // exclude own hospital
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

// ── POST /api/hospital/inflow ───────────────────────────────────────
// Log a patient visit. Upserts today's doc, increments count.
// Body: { opdName?: "Cardiology" } — optional for breakdown tracking.
router.post("/inflow", auth, requireRole("admin"), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const update = { $inc: { count: 1 } };
    if (req.body.opdName) {
      update.$inc[`opdBreakdown.${req.body.opdName}`] = 1;
    }

    const doc = await PatientInflow.findOneAndUpdate(
      { hospitalId: req.user.hospitalId, date: today },
      update,
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hospital/inflow/stats ──────────────────────────────────
// Monthly footfall for the dashboard graph.
// Query params: ?months=6 (default 6, how many months back)
router.get("/inflow/stats", auth, requireRole("admin"), async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const stats = await PatientInflow.aggregate([
      { $match: { hospitalId: req.user.hospitalId, date: { $gte: since } } },
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
