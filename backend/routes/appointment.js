// backend/routes/appointment.js
// Patient appointment booking + hospital-side management
const router = require("express").Router();
const { Appointment, Hospital } = require("../models-ext");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── Default time slots (30-min intervals, 9 AM – 5 PM) ─────────────
const DEFAULT_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
];

// ── POST /api/appointments ──────────────────────────────────────────
// Patient books an appointment at a hospital
router.post("/", auth, requireRole("patient"), async (req, res) => {
  try {
    const { hospitalId, date, timeSlot, reason } = req.body;

    if (!hospitalId || !date || !timeSlot) {
      return res.status(400).json({ error: "hospitalId, date, and timeSlot are required" });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital || !hospital.isActive) {
      return res.status(404).json({ error: "Hospital not found or inactive" });
    }

    // Validate date is not in the past
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({ error: "Cannot book appointments in the past" });
    }

    // Check for duplicate: same patient, same hospital, same date+slot, not cancelled
    const existing = await Appointment.findOne({
      patientId: req.user.id,
      hospitalId,
      date: appointmentDate,
      timeSlot,
      status: { $nin: ["cancelled"] },
    });
    if (existing) {
      return res.status(409).json({ error: "You already have an appointment at this time slot" });
    }

    // Check slot capacity (max 3 patients per slot per hospital)
    const slotCount = await Appointment.countDocuments({
      hospitalId,
      date: appointmentDate,
      timeSlot,
      status: { $nin: ["cancelled"] },
    });
    if (slotCount >= 3) {
      return res.status(409).json({ error: "This time slot is full. Please choose another." });
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      hospitalId,
      date: appointmentDate,
      timeSlot,
      reason: reason || null,
    });

    const populated = await Appointment.findById(appointment._id)
      .populate("hospitalId", "name address phone")
      .populate("patientId", "pid name phone email");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/appointments/my ────────────────────────────────────────
// Patient views their own appointments
router.get("/my", auth, requireRole("patient"), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { patientId: req.user.id };
    if (status && status !== "all") filter.status = status;

    const appointments = await Appointment.find(filter)
      .sort({ date: -1, timeSlot: 1 })
      .limit(50)
      .populate("hospitalId", "name address phone")
      .lean();

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/appointments/:id/cancel ──────────────────────────────
// Patient cancels their own appointment
router.patch("/:id/cancel", auth, requireRole("patient"), async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        patientId: req.user.id,
        status: { $in: ["pending", "confirmed"] },
      },
      { $set: { status: "cancelled", cancelledBy: "patient" } },
      { new: true }
    ).populate("hospitalId", "name");

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found or not cancellable" });
    }
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/appointments/available-slots ────────────────────────────
// Patient checks which slots are available for a hospital on a date
router.get("/available-slots", auth, requireRole("patient"), async (req, res) => {
  try {
    const { hospitalId, date } = req.query;
    if (!hospitalId || !date) {
      return res.status(400).json({ error: "hospitalId and date are required" });
    }

    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    // Count bookings per slot for this hospital+date
    const booked = await Appointment.aggregate([
      {
        $match: {
          hospitalId: require("mongoose").Types.ObjectId.createFromHexString(hospitalId),
          date: appointmentDate,
          status: { $nin: ["cancelled"] },
        },
      },
      { $group: { _id: "$timeSlot", count: { $sum: 1 } } },
    ]);

    const bookedMap = {};
    for (const b of booked) bookedMap[b._id] = b.count;

    // Check if date is today — filter out past slots
    const now = new Date();
    const isToday =
      appointmentDate.getFullYear() === now.getFullYear() &&
      appointmentDate.getMonth() === now.getMonth() &&
      appointmentDate.getDate() === now.getDate();

    const slots = DEFAULT_SLOTS.map((slot) => {
      const count = bookedMap[slot] || 0;
      let available = count < 3;

      // If today, disable slots that have already passed
      if (isToday) {
        const [h, m] = slot.split(":").map(Number);
        if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
          available = false;
        }
      }

      return { time: slot, booked: count, available };
    });

    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/appointments/hospitals ─────────────────────────────────
// Patient gets list of active hospitals for booking
router.get("/hospitals", auth, requireRole("patient"), async (req, res) => {
  try {
    const hospitals = await Hospital.find({ isActive: true })
      .select("name address phone opds")
      .sort({ name: 1 })
      .lean();
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// HOSPITAL / ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// ── GET /api/appointments/hospital ──────────────────────────────────
// Admin views all appointments for their hospital
router.get("/hospital", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const filter = { hospitalId: req.user.hospitalId };

    if (status && status !== "all") filter.status = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .sort({ date: 1, timeSlot: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("patientId", "pid name phone email age gender bloodGroup")
        .lean(),
      Appointment.countDocuments(filter),
    ]);

    res.json({
      appointments,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/appointments/hospital/upcoming ─────────────────────────
// Admin gets today's + tomorrow's appointments (for dashboard widget / notifications)
router.get("/hospital/upcoming", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const appointments = await Appointment.find({
      hospitalId: req.user.hospitalId,
      date: { $gte: today, $lt: dayAfterTomorrow },
      status: { $in: ["pending", "confirmed"] },
    })
      .sort({ date: 1, timeSlot: 1 })
      .populate("patientId", "pid name phone age gender")
      .lean();

    // Split into today and tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppts = appointments.filter((a) => new Date(a.date) < tomorrow);
    const tomorrowAppts = appointments.filter((a) => new Date(a.date) >= tomorrow);

    res.json({
      today: todayAppts,
      tomorrow: tomorrowAppts,
      totalToday: todayAppts.length,
      totalTomorrow: tomorrowAppts.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/appointments/hospital/counts ───────────────────────────
// Badge counts for sidebar
router.get("/hospital/counts", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPending = await Appointment.countDocuments({
      hospitalId: req.user.hospitalId,
      date: { $gte: today, $lt: tomorrow },
      status: "pending",
    });

    res.json({ todayPending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/appointments/:id/respond ─────────────────────────────
// Admin confirms, completes, or cancels an appointment
router.patch("/:id/respond", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { action, notes } = req.body;
    if (!["confirmed", "completed", "cancelled", "no-show"].includes(action)) {
      return res.status(400).json({
        error: "action must be 'confirmed', 'completed', 'cancelled', or 'no-show'",
      });
    }

    const update = { status: action };
    if (notes) update.notes = notes;
    if (action === "cancelled") update.cancelledBy = "hospital";

    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        hospitalId: req.user.hospitalId,
      },
      { $set: update },
      { new: true }
    )
      .populate("patientId", "pid name phone email")
      .populate("hospitalId", "name");

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
