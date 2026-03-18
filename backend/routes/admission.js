const router = require("express").Router();
const { Admission, PatientInflow, Patient } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── POST /api/admission ─────────────────────────────────────────────
// Admin admits a patient. Creates an admission record and bumps
// today's inflow count automatically.
// Body: { patientId, doctor?, ward?, reason?, opdName? }
router.post("/", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { patientId, doctor, ward, reason, opdName } = req.body;
    if (!patientId) return res.status(400).json({ error: "patientId is required" });

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const admission = await Admission.create({
      patientId,
      hospitalId: req.user.hospitalId,
      admittedBy: req.user.id,
      doctor: doctor || null,
      ward: ward || null,
      reason: reason || null,
      opdName: opdName || null,
      status: "admitted",
    });

    // bump today's inflow counter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const incFields = { count: 1 };
    if (opdName) incFields[`opdBreakdown.${opdName}`] = 1;

    await PatientInflow.findOneAndUpdate(
      { hospitalId: req.user.hospitalId, date: today },
      { $inc: incFields },
      { upsert: true }
    );

    res.status(201).json(admission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/admission/:id/status ─────────────────────────────────
// Update admission status (e.g. mark as discharged or critical).
// Body: { status: "discharged" | "critical" | "admitted" }
router.patch("/:id/status", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["admitted", "discharged", "critical"].includes(status))
      return res.status(400).json({ error: "Invalid status" });

    const update = { status };
    if (status === "discharged") update.dischargedAt = new Date();

    const admission = await Admission.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user.hospitalId },
      { $set: update },
      { new: true }
    ).populate("patientId", "pid name");

    if (!admission) return res.status(404).json({ error: "Admission not found" });
    res.json(admission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admission/:id ──────────────────────────────────────────
// Get a single admission with patient details.
router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id)
      .populate("patientId", "-password")
      .populate("hospitalId", "name address")
      .populate("admittedBy", "name");
    if (!admission) return res.status(404).json({ error: "Admission not found" });
    res.json(admission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;