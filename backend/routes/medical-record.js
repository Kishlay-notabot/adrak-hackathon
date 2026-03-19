// backend/routes/medical-record.js
const router = require("express").Router();
const { MedicalRecord } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── GET /api/medical-records/patient/:patientId ─────────────────────
// Get all medical records for a patient (admin view after QR scan)
router.get("/patient/:patientId", auth, requireRole("admin"), async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.params.patientId })
      .sort({ recordedAt: -1 })
      .populate("hospitalId", "name")
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/medical-records/admission/:admissionId ─────────────────
// Get medical record for a specific admission
router.get("/admission/:admissionId", auth, async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({ admissionId: req.params.admissionId })
      .populate("hospitalId", "name")
      .lean();
    if (!record) return res.status(404).json({ error: "No medical record found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/medical-records ───────────────────────────────────────
// Admin creates a medical record (lab results after admission)
router.post("/", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { admissionId, patientId, ...labData } = req.body;
    if (!admissionId || !patientId) {
      return res.status(400).json({ error: "admissionId and patientId are required" });
    }

    const record = await MedicalRecord.create({
      patientId,
      admissionId,
      hospitalId: req.user.hospitalId,
      ...labData,
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/medical-records/my ─────────────────────────────────────
// Patient views their own medical records
router.get("/my", auth, requireRole("patient"), async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.user.id })
      .sort({ recordedAt: -1 })
      .populate("hospitalId", "name")
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/medical-records/stats ──────────────────────────────────
// Aggregate stats for ML / dashboard (admin only)
router.get("/stats", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    const [totalRecords, conditionCounts, avgLabValues] = await Promise.all([
      MedicalRecord.countDocuments({ hospitalId }),

      MedicalRecord.aggregate([
        { $match: { hospitalId } },
        {
          $group: {
            _id: null,
            diabetes: { $sum: { $cond: ["$diabetes", 1, 0] } },
            hypertension: { $sum: { $cond: ["$hypertension", 1, 0] } },
            cad: { $sum: { $cond: ["$cad", 1, 0] } },
            ckd: { $sum: { $cond: ["$ckd", 1, 0] } },
            heartFailure: { $sum: { $cond: ["$heartFailure", 1, 0] } },
            aki: { $sum: { $cond: ["$aki", 1, 0] } },
            smoking: { $sum: { $cond: ["$smoking", 1, 0] } },
            alcohol: { $sum: { $cond: ["$alcohol", 1, 0] } },
          },
        },
      ]),

      MedicalRecord.aggregate([
        { $match: { hospitalId } },
        {
          $group: {
            _id: null,
            avgHb: { $avg: "$hb" },
            avgTlc: { $avg: "$tlc" },
            avgGlucose: { $avg: "$glucose" },
            avgUrea: { $avg: "$urea" },
            avgCreatinine: { $avg: "$creatinine" },
            avgPlatelets: { $avg: "$platelets" },
          },
        },
      ]),
    ]);

    res.json({
      totalRecords,
      conditions: conditionCounts[0] || {},
      avgLabValues: avgLabValues[0] || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
