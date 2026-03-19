// backend/routes/resource.js
const router = require("express").Router();
const { ResourceStatus, Admission } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── GET /api/resources/daily-flow ───────────────────────────────────
// Admitted vs discharged per day — for the dual-line chart.
// Aggregates from ResourceStatus (incoming/discharged per hour → summed per day).
// Query: ?days=30 (default 30)
router.get("/daily-flow", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const hospitalId = req.user.hospitalId;

    // Try ResourceStatus first (hourly data → aggregate to daily)
    const resourceCount = await ResourceStatus.countDocuments({ hospitalId });

    if (resourceCount > 0) {
      const stats = await ResourceStatus.aggregate([
        { $match: { hospitalId } },
        {
          $group: {
            _id: {
              year: { $year: "$timestamp" },
              month: { $month: "$timestamp" },
              day: { $dayOfMonth: "$timestamp" },
            },
            admitted: { $sum: "$incomingPatients" },
            discharged: { $sum: "$dischargedPatients" },
            emergency: { $sum: "$emergencyCases" },
            opd: { $sum: "$opdCases" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        { $limit: days },
        {
          $project: {
            _id: 0,
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: {
                  $dateFromParts: { year: "$_id.year", month: "$_id.month", day: "$_id.day" },
                },
              },
            },
            admitted: 1,
            discharged: 1,
            emergency: 1,
            opd: 1,
          },
        },
      ]);

      return res.json(stats);
    }

    // Fallback: aggregate from Admission collection
    const stats = await Admission.aggregate([
      { $match: { hospitalId } },
      {
        $facet: {
          admissions: [
            {
              $group: {
                _id: {
                  year: { $year: "$admittedAt" },
                  month: { $month: "$admittedAt" },
                  day: { $dayOfMonth: "$admittedAt" },
                },
                admitted: { $sum: 1 },
              },
            },
          ],
          discharges: [
            { $match: { dischargedAt: { $ne: null } } },
            {
              $group: {
                _id: {
                  year: { $year: "$dischargedAt" },
                  month: { $month: "$dischargedAt" },
                  day: { $dayOfMonth: "$dischargedAt" },
                },
                discharged: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // Merge admissions + discharges by date
    const dayMap = new Map();
    for (const a of stats[0].admissions) {
      const key = `${a._id.year}-${String(a._id.month).padStart(2, "0")}-${String(a._id.day).padStart(2, "0")}`;
      dayMap.set(key, { date: key, admitted: a.admitted, discharged: 0 });
    }
    for (const d of stats[0].discharges) {
      const key = `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`;
      if (dayMap.has(key)) {
        dayMap.get(key).discharged = d.discharged;
      } else {
        dayMap.set(key, { date: key, admitted: 0, discharged: d.discharged });
      }
    }

    const result = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    res.json(result.slice(-days));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/resources/bed-utilization ───────────────────────────────
// Bed + ICU occupancy over time (daily averages from hourly snapshots)
// Query: ?days=30
router.get("/bed-utilization", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const stats = await ResourceStatus.aggregate([
      { $match: { hospitalId: req.user.hospitalId } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          avgOccupiedBeds: { $avg: "$occupiedBeds" },
          avgAvailableBeds: { $avg: "$availableBeds" },
          totalBeds: { $first: "$totalBeds" },
          avgOccupiedIcu: { $avg: "$occupiedIcuBeds" },
          avgAvailableIcu: { $avg: "$availableIcuBeds" },
          totalIcu: { $first: "$totalIcuBeds" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      { $limit: days },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateFromParts: { year: "$_id.year", month: "$_id.month", day: "$_id.day" },
              },
            },
          },
          occupiedBeds: { $round: ["$avgOccupiedBeds", 0] },
          availableBeds: { $round: ["$avgAvailableBeds", 0] },
          totalBeds: 1,
          occupiedIcu: { $round: ["$avgOccupiedIcu", 0] },
          availableIcu: { $round: ["$avgAvailableIcu", 0] },
          totalIcu: 1,
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/resources/staff ────────────────────────────────────────
// Staff availability over time (daily averages)
// Query: ?days=30
router.get("/staff", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const stats = await ResourceStatus.aggregate([
      { $match: { hospitalId: req.user.hospitalId } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          avgDoctors: { $avg: "$availableDoctors" },
          avgNurses: { $avg: "$availableNurses" },
          totalDoctors: { $first: "$totalDoctors" },
          totalNurses: { $first: "$totalNurses" },
          avgStaffLoad: { $avg: "$staffLoadRatio" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      { $limit: days },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateFromParts: { year: "$_id.year", month: "$_id.month", day: "$_id.day" },
              },
            },
          },
          availableDoctors: { $round: ["$avgDoctors", 0] },
          availableNurses: { $round: ["$avgNurses", 0] },
          totalDoctors: 1,
          totalNurses: 1,
          staffLoadRatio: { $round: ["$avgStaffLoad", 2] },
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/resources/equipment ────────────────────────────────────
// Ventilator + oxygen usage over time (daily averages)
router.get("/equipment", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const stats = await ResourceStatus.aggregate([
      { $match: { hospitalId: req.user.hospitalId } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          avgVentInUse: { $avg: "$ventilatorsInUse" },
          ventTotal: { $first: "$ventilatorsTotal" },
          avgO2InUse: { $avg: "$oxygenUnitsInUse" },
          o2Total: { $first: "$oxygenUnitsTotal" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      { $limit: days },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateFromParts: { year: "$_id.year", month: "$_id.month", day: "$_id.day" },
              },
            },
          },
          ventilatorsInUse: { $round: ["$avgVentInUse", 0] },
          ventilatorsTotal: "$ventTotal",
          oxygenInUse: { $round: ["$avgO2InUse", 0] },
          oxygenTotal: "$o2Total",
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/resources/overview ─────────────────────────────────────
// Latest snapshot for quick stats cards
router.get("/overview", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const latest = await ResourceStatus.findOne({ hospitalId: req.user.hospitalId })
      .sort({ timestamp: -1 })
      .lean();

    if (!latest) return res.json(null);
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
