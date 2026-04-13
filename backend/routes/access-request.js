// backend/routes/access-request.js
// NEW — patient data access permission system
const router = require("express").Router();
const { AccessRequest, Patient, Hospital } = require("../models-ext");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── POST /api/access-requests ───────────────────────────────────────
// Hospital admin requests access to a patient's records.
// Triggered after QR scan or manual lookup.
router.post("/", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { patientId, reason } = req.body;
    if (!patientId) return res.status(400).json({ error: "patientId is required" });

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Check if there's already an active (pending or approved non-expired) request
    const existing = await AccessRequest.findOne({
      hospitalId: req.user.hospitalId,
      patientId,
      $or: [
        { status: "pending" },
        { status: "approved", expiresAt: { $gt: new Date() } },
      ],
    });

    if (existing) {
      return res.json({
        alreadyExists: true,
        status: existing.status,
        request: existing,
        message:
          existing.status === "approved"
            ? "Access already granted"
            : "Access request already pending",
      });
    }

    const ar = await AccessRequest.create({
      hospitalId: req.user.hospitalId,
      patientId,
      requestedBy: req.user.id,
      reason: reason || "Medical records access",
    });

    const populated = await AccessRequest.findById(ar._id)
      .populate("hospitalId", "name address phone")
      .populate("requestedBy", "name");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/access-requests/check/:patientId ───────────────────────
// Hospital checks if they have approved access to a patient
router.get(
  "/check/:patientId",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const approved = await AccessRequest.findOne({
        hospitalId: req.user.hospitalId,
        patientId: req.params.patientId,
        status: "approved",
        expiresAt: { $gt: new Date() },
      });

      res.json({
        hasAccess: !!approved,
        expiresAt: approved?.expiresAt || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/access-requests/my ─────────────────────────────────────
// Patient views their pending + recent access requests
router.get("/my", auth, requireRole("patient"), async (req, res) => {
  try {
    const requests = await AccessRequest.find({ patientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("hospitalId", "name address phone")
      .populate("requestedBy", "name department")
      .lean();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/access-requests/my/pending-count ───────────────────────
router.get("/my/pending-count", auth, requireRole("patient"), async (req, res) => {
  try {
    const count = await AccessRequest.countDocuments({
      patientId: req.user.id,
      status: "pending",
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/access-requests/:id/respond ──────────────────────────
// Patient approves or denies a hospital's access request
router.patch("/:id/respond", auth, requireRole("patient"), async (req, res) => {
  try {
    const { action } = req.body;
    if (!["approved", "denied"].includes(action)) {
      return res.status(400).json({ error: "action must be 'approved' or 'denied'" });
    }

    const ar = await AccessRequest.findOne({
      _id: req.params.id,
      patientId: req.user.id,
      status: "pending",
    });
    if (!ar) return res.status(404).json({ error: "Request not found or already responded" });

    ar.status = action;
    ar.respondedAt = new Date();
    if (action === "approved") {
      ar.expiresAt = new Date(Date.now() + 7 * 24 * 3600000); // 7 days from now
    }
    await ar.save();

    const populated = await AccessRequest.findById(ar._id)
      .populate("hospitalId", "name address phone")
      .populate("requestedBy", "name");

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/access-requests/hospital-list ──────────────────────────
// Public-ish: patient can see list of hospitals for payment etc.
router.get("/hospital-list", auth, async (req, res) => {
  try {
    const hospitals = await Hospital.find({ isActive: true })
      .select("name address phone")
      .sort({ name: 1 })
      .lean();
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
