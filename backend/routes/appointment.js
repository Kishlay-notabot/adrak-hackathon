const express = require("express");
const router = express.Router();
const axios = require("axios");
const { Appointment } = require("../models");

// Patient appointment book kare
router.post("/book", async (req, res) => {
  try {
    const { patientName, patientPhone, doctor, date, time } = req.body;

    const appointment = await Appointment.create({
      patientName, patientPhone, doctor, date, time, status: "pending"
    });

    // Python agent ko trigger karo
    await axios.post("http://localhost:8000/trigger-call", {
      appointmentId: appointment._id.toString(),
      patientName, patientPhone, doctor, date, time
    });

    res.json({ success: true, appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Python agent confirm hone ke baad yahan call karega
router.post("/confirmed", async (req, res) => {
  try {
    const { appointmentId } = req.body;
    await Appointment.findByIdAndUpdate(appointmentId, { status: "confirmed" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

module.exports = router;