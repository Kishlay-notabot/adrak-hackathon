// backend/routes/resource-request.js
const router = require("express").Router();
const { ResourceRequest, Hospital } = require("../models-ext");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── POST /api/resource-requests ─────────────────────────────────────
router.post("/", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { toHospitalId, type, resourceType, quantity, urgency, message } = req.body;

    if (!toHospitalId || !type || !resourceType || !quantity) {
      return res.status(400).json({ error: "toHospitalId, type, resourceType, and quantity are required" });
    }
    if (toHospitalId === req.user.hospitalId.toString()) {
      return res.status(400).json({ error: "Cannot send request to your own hospital" });
    }

    const target = await Hospital.findById(toHospitalId);
    if (!target) return res.status(404).json({ error: "Target hospital not found" });

    const existing = await ResourceRequest.findOne({
      fromHospitalId: req.user.hospitalId,
      toHospitalId,
      resourceType,
      type,
      status: "pending",
    });
    if (existing) {
      return res.status(409).json({ error: "A pending request for this resource already exists" });
    }

    const rr = await ResourceRequest.create({
      fromHospitalId: req.user.hospitalId,
      toHospitalId,
      requestedBy: req.user.id,
      type,
      resourceType,
      quantity: parseInt(quantity),
      urgency: urgency || "medium",
      message: message || null,
    });

    const populated = await ResourceRequest.findById(rr._id)
      .populate("fromHospitalId", "name address phone location")
      .populate("toHospitalId", "name address phone location")
      .populate("requestedBy", "name");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/resource-requests/incoming ──────────────────────────────
router.get("/incoming", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { toHospitalId: req.user.hospitalId };
    if (status && status !== "all") filter.status = status;

    const requests = await ResourceRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("fromHospitalId", "name address phone location")
      .populate("requestedBy", "name")
      .populate("respondedBy", "name")
      .lean();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/resource-requests/outgoing ──────────────────────────────
router.get("/outgoing", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { fromHospitalId: req.user.hospitalId };
    if (status && status !== "all") filter.status = status;

    const requests = await ResourceRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("toHospitalId", "name address phone location")
      .populate("requestedBy", "name")
      .populate("respondedBy", "name")
      .lean();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/resource-requests/counts ────────────────────────────────
router.get("/counts", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const incoming = await ResourceRequest.countDocuments({
      toHospitalId: req.user.hospitalId,
      status: "pending",
    });
    res.json({ incomingPending: incoming });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/resource-requests/:id/respond ─────────────────────────
router.patch("/:id/respond", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accepted", "declined"].includes(action)) {
      return res.status(400).json({ error: "action must be 'accepted' or 'declined'" });
    }

    const rr = await ResourceRequest.findOne({
      _id: req.params.id,
      toHospitalId: req.user.hospitalId,
      status: "pending",
    });
    if (!rr) return res.status(404).json({ error: "Request not found or already responded" });

    rr.status = action;
    rr.respondedBy = req.user.id;
    rr.respondedAt = new Date();
    await rr.save();

    const populated = await ResourceRequest.findById(rr._id)
      .populate("fromHospitalId", "name address phone")
      .populate("toHospitalId", "name address phone")
      .populate("requestedBy", "name")
      .populate("respondedBy", "name");

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/resource-requests/:id/cancel ──────────────────────────
router.patch("/:id/cancel", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const rr = await ResourceRequest.findOneAndUpdate(
      { _id: req.params.id, fromHospitalId: req.user.hospitalId, status: "pending" },
      { $set: { status: "cancelled" } },
      { new: true }
    ).populate("toHospitalId", "name");

    if (!rr) return res.status(404).json({ error: "Request not found or not cancellable" });
    res.json(rr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/resource-requests/nearby-hospitals ──────────────────────
router.get("/nearby-hospitals", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const myHospitalId = req.user.hospitalId;

    // Step 1: Always get ALL other active hospitals (guaranteed to work)
    let hospitals = await Hospital.find({
      _id: { $ne: myHospitalId },
      isActive: true,
    })
      .select("name address phone beds location")
      .sort({ name: 1 })
      .lean();

    // Step 2: Try to sort by distance if we have coordinates
    try {
      const myHospital = await Hospital.findById(myHospitalId).select("location").lean();

      if (
        myHospital?.location?.coordinates &&
        myHospital.location.coordinates.length === 2 &&
        myHospital.location.coordinates[0] !== 0
      ) {
        const [myLng, myLat] = myHospital.location.coordinates;

        const nearbyHospitals = await Hospital.find({
          _id: { $ne: myHospitalId },
          isActive: true,
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: [myLng, myLat] },
              $maxDistance: 200000, // 200km
            },
          },
        })
          .select("name address phone beds location")
          .lean();

        if (nearbyHospitals.length > 0) {
          hospitals = nearbyHospitals;
        }
      }
    } catch (geoErr) {
      // Geo sort failed (e.g. missing 2dsphere index) — fall back to name-sorted list
      console.warn("Geo sort skipped:", geoErr.message);
    }

    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;