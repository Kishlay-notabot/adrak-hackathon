// backend/routes/notification.js
// Aggregates pending items across referrals, appointments, resource requests
const router = require("express").Router();
const { Referral, Admission } = require("../models");
const { ResourceRequest, Appointment } = require("../models-ext");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── GET /api/notifications/admin ────────────────────────────────────
router.get(
  "/admin",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const hospitalId = req.user.hospitalId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Run all counts in parallel
      const [
        pendingReferrals,
        pendingResourceReqs,
        todayAppointments,
        criticalPatients,
        recentReferrals,
        recentAppointments,
        recentResourceReqs,
      ] = await Promise.all([
        Referral.countDocuments({ toHospitalId: hospitalId, status: "pending" }),
        ResourceRequest.countDocuments({ toHospitalId: hospitalId, status: "pending" }),
        Appointment.countDocuments({
          hospitalId,
          date: { $gte: today, $lt: tomorrow },
          status: { $in: ["pending", "confirmed"] },
        }),
        Admission.countDocuments({ hospitalId, status: "critical" }),

        // Recent items for the dropdown (last 10 across types)
        Referral.find({ toHospitalId: hospitalId, status: "pending" })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("patientId", "pid name")
          .populate("fromHospitalId", "name")
          .lean(),
        Appointment.find({
          hospitalId,
          date: { $gte: today },
          status: { $in: ["pending", "confirmed"] },
        })
          .sort({ date: 1, timeSlot: 1 })
          .limit(5)
          .populate("patientId", "pid name")
          .lean(),
        ResourceRequest.find({ toHospitalId: hospitalId, status: "pending" })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("fromHospitalId", "name")
          .lean(),
      ]);

      // Build notification items
      const items = [];

      for (const r of recentReferrals) {
        items.push({
          id: r._id,
          type: "referral",
          title: `Referral from ${r.fromHospitalId?.name || "Unknown"}`,
          description: `Patient: ${r.patientId?.name || "Unknown"} (${r.patientId?.pid || ""})`,
          urgency: r.urgency,
          time: r.createdAt,
          link: "/admin/referrals",
        });
      }

      for (const a of recentAppointments) {
        const slotH = parseInt(a.timeSlot?.split(":")[0] || 0);
        const suffix = slotH >= 12 ? "PM" : "AM";
        const h12 = slotH > 12 ? slotH - 12 : slotH === 0 ? 12 : slotH;
        const slotLabel = `${h12}:${a.timeSlot?.split(":")[1] || "00"} ${suffix}`;

        items.push({
          id: a._id,
          type: "appointment",
          title: `Appointment: ${a.patientId?.name || "Patient"}`,
          description: `${new Date(a.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} at ${slotLabel}`,
          urgency: "low",
          time: a.createdAt,
          link: "/admin/appointments",
        });
      }

      for (const rr of recentResourceReqs) {
        items.push({
          id: rr._id,
          type: "resource_request",
          title: `${rr.type === "request" ? "Resource request" : "Resource offer"} from ${rr.fromHospitalId?.name || "Unknown"}`,
          description: `${rr.quantity} ${rr.resourceType}`,
          urgency: rr.urgency,
          time: rr.createdAt,
          link: "/admin/inventory",
        });
      }

      // Sort by time desc
      items.sort((a, b) => new Date(b.time) - new Date(a.time));

      const totalPending = pendingReferrals + pendingResourceReqs + todayAppointments;

      res.json({
        totalPending,
        counts: {
          pendingReferrals,
          pendingResourceReqs,
          todayAppointments,
          criticalPatients,
        },
        items: items.slice(0, 15),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
