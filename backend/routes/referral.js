// backend/routes/referral.js
const router = require("express").Router();
const { Referral, Hospital, Patient, Admission } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── POST /api/referral ──────────────────────────────────────────────
// Admin creates a referral to another hospital.
// Body: { patientId, admissionId?, toHospitalId, reason?, notes?, urgency? }
router.post("/", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { patientId, admissionId, toHospitalId, reason, notes, urgency } = req.body;

    if (!patientId || !toHospitalId)
      return res.status(400).json({ error: "patientId and toHospitalId are required" });

    // Can't refer to yourself
    if (toHospitalId === req.user.hospitalId.toString())
      return res.status(400).json({ error: "Cannot refer to your own hospital" });

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Validate target hospital exists
    const toHospital = await Hospital.findById(toHospitalId);
    if (!toHospital) return res.status(404).json({ error: "Target hospital not found" });

    // Check for duplicate pending referral
    const existing = await Referral.findOne({
      patientId,
      fromHospitalId: req.user.hospitalId,
      toHospitalId,
      status: "pending",
    });
    if (existing)
      return res.status(409).json({ error: "A pending referral already exists for this patient to that hospital" });

    const referral = await Referral.create({
      patientId,
      admissionId: admissionId || null,
      fromHospitalId: req.user.hospitalId,
      toHospitalId,
      referredBy: req.user.id,
      reason: reason || null,
      notes: notes || null,
      urgency: urgency || "medium",
    });

    // Populate for response
    const populated = await Referral.findById(referral._id)
      .populate("patientId", "pid name age gender bloodGroup phone")
      .populate("fromHospitalId", "name address phone")
      .populate("toHospitalId", "name address phone")
      .populate("referredBy", "name");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/referral/outgoing ──────────────────────────────────────
// Referrals sent BY this hospital. Query: ?status=pending&page=1&limit=20
router.get("/outgoing", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { fromHospitalId: req.user.hospitalId };
    if (status && status !== "all") filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [referrals, total] = await Promise.all([
      Referral.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("patientId", "pid name age gender bloodGroup phone")
        .populate("toHospitalId", "name address phone")
        .populate("referredBy", "name")
        .populate("respondedBy", "name")
        .lean(),
      Referral.countDocuments(filter),
    ]);

    res.json({ referrals, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/referral/incoming ──────────────────────────────────────
// Referrals sent TO this hospital. Query: ?status=pending&page=1&limit=20
router.get("/incoming", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { toHospitalId: req.user.hospitalId };
    if (status && status !== "all") filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [referrals, total] = await Promise.all([
      Referral.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("patientId", "pid name age gender bloodGroup phone")
        .populate("fromHospitalId", "name address phone")
        .populate("referredBy", "name")
        .populate("respondedBy", "name")
        .lean(),
      Referral.countDocuments(filter),
    ]);

    res.json({ referrals, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/referral/counts ────────────────────────────────────────
// Quick badge counts for the sidebar.
router.get("/counts", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const [incomingPending, outgoingPending] = await Promise.all([
      Referral.countDocuments({ toHospitalId: req.user.hospitalId, status: "pending" }),
      Referral.countDocuments({ fromHospitalId: req.user.hospitalId, status: "pending" }),
    ]);
    res.json({ incomingPending, outgoingPending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/referral/:id/respond ─────────────────────────────────
// Target hospital accepts or rejects a referral.
// Body: { action: "accepted" | "rejected" }
router.patch("/:id/respond", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accepted", "rejected"].includes(action))
      return res.status(400).json({ error: "action must be 'accepted' or 'rejected'" });

    const referral = await Referral.findOne({
      _id: req.params.id,
      toHospitalId: req.user.hospitalId,
      status: "pending",
    });

    if (!referral) return res.status(404).json({ error: "Referral not found or already responded" });

    referral.status = action;
    referral.respondedBy = req.user.id;
    referral.respondedAt = new Date();
    await referral.save();

    const populated = await Referral.findById(referral._id)
      .populate("patientId", "pid name age gender bloodGroup phone")
      .populate("fromHospitalId", "name address phone")
      .populate("toHospitalId", "name address phone")
      .populate("referredBy", "name")
      .populate("respondedBy", "name");

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/referral/:id/cancel ──────────────────────────────────
// Source hospital cancels a pending referral.
router.patch("/:id/cancel", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const referral = await Referral.findOneAndUpdate(
      { _id: req.params.id, fromHospitalId: req.user.hospitalId, status: "pending" },
      { $set: { status: "cancelled" } },
      { new: true }
    )
      .populate("patientId", "pid name")
      .populate("toHospitalId", "name");

    if (!referral) return res.status(404).json({ error: "Referral not found or not cancellable" });
    res.json(referral);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/referral/:id ───────────────────────────────────────────
// Get a single referral with full details.
router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate("patientId", "-password")
      .populate("fromHospitalId", "name address phone")
      .populate("toHospitalId", "name address phone")
      .populate("referredBy", "name email")
      .populate("respondedBy", "name email");

    if (!referral) return res.status(404).json({ error: "Referral not found" });
    res.json(referral);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;