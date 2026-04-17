const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { Hospital, Admin, PatientInflow, ResourceStatus } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

function refreshToken(admin) {
  return jwt.sign(
    { id: admin._id, role: "admin", hospitalId: admin.hospitalId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ── GET /api/hospital/all ───────────────────────────────────────────
router.get("/all", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const hospitals = await Hospital.find({
      _id: { $ne: req.user.hospitalId },
      isActive: true,
    })
      .select("name address phone beds")
      .sort({ name: 1 })
      .lean();

    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/hospital/create ───────────────────────────────────────
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

    admin.hospitalId = hospital._id;
    await admin.save();

    res.status(201).json({ hospital, token: refreshToken(admin) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/hospital/join ─────────────────────────────────────────
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

// ── PATCH /api/hospital/mine/staff ──────────────────────────────────
// NEW: Admin updates staff counts. Creates/updates today's ResourceStatus snapshot.
// Body: { totalDoctors, availableDoctors, totalNurses, availableNurses }
router.patch("/mine/staff", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const { totalDoctors, availableDoctors, totalNurses, availableNurses } = req.body;

    // Get the hospital's bed data to fill in bed fields
    const hospital = await Hospital.findById(hospitalId).select("beds").lean();
    const beds = hospital?.beds || {};
    const totalBeds =
      (beds.general?.total || 0) +
      (beds.icu?.total || 0) +
      (beds.emergency?.total || 0) +
      (beds.pediatric?.total || 0) +
      (beds.maternity?.total || 0);
    const availBeds =
      (beds.general?.available || 0) +
      (beds.icu?.available || 0) +
      (beds.emergency?.available || 0) +
      (beds.pediatric?.available || 0) +
      (beds.maternity?.available || 0);

    // Find today's latest snapshot or create one
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const staffData = {
      totalDoctors: parseInt(totalDoctors) || 0,
      availableDoctors: parseInt(availableDoctors) || 0,
      totalNurses: parseInt(totalNurses) || 0,
      availableNurses: parseInt(availableNurses) || 0,
    };

    // Calculate staff load ratio
    const totalStaff = staffData.totalDoctors + staffData.totalNurses;
    const availStaff = staffData.availableDoctors + staffData.availableNurses;
    staffData.staffLoadRatio = totalStaff > 0 ? parseFloat(((totalStaff - availStaff) / totalStaff).toFixed(2)) : 0;

    const updated = await ResourceStatus.findOneAndUpdate(
      {
        hospitalId,
        timestamp: { $gte: today, $lt: tomorrow },
      },
      {
        $set: {
          ...staffData,
          totalBeds,
          occupiedBeds: totalBeds - availBeds,
          availableBeds: availBeds,
          totalIcuBeds: beds.icu?.total || 0,
          occupiedIcuBeds: (beds.icu?.total || 0) - (beds.icu?.available || 0),
          availableIcuBeds: beds.icu?.available || 0,
        },
        $setOnInsert: {
          hospitalId,
          timestamp: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    res.json({
      message: "Staff updated successfully",
      staff: {
        totalDoctors: updated.totalDoctors,
        availableDoctors: updated.availableDoctors,
        totalNurses: updated.totalNurses,
        availableNurses: updated.availableNurses,
        staffLoadRatio: updated.staffLoadRatio,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hospital/mine/staff ────────────────────────────────────
// Returns current staff numbers from latest ResourceStatus
router.get("/mine/staff", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const latest = await ResourceStatus.findOne({ hospitalId: req.user.hospitalId })
      .sort({ timestamp: -1 })
      .select("totalDoctors availableDoctors totalNurses availableNurses staffLoadRatio")
      .lean();

    res.json(latest || { totalDoctors: 0, availableDoctors: 0, totalNurses: 0, availableNurses: 0, staffLoadRatio: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/hospital/mine/opds ───────────────────────────────────
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
router.get("/inflow/stats", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const months = req.query.months === "all" ? null : (parseInt(req.query.months) || 6);
    let since;
    if (months) {
      since = new Date();
      since.setMonth(since.getMonth() - months);
    } else {
      const earliest = await PatientInflow.findOne({ hospitalId: req.user.hospitalId }).sort({ date: 1 }).lean();
      since = earliest ? earliest.date : new Date();
    }
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
