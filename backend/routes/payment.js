const router    = require("express").Router();
const Razorpay  = require("razorpay");
const crypto    = require("crypto");
const { Payment, Hospital } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /api/payment/create-order ──────────────────────────────────
router.post("/create-order", auth, requireRole("patient"), async (req, res) => {
  try {
    const { hospitalId, amount, purpose = "consultation", description } = req.body;

    if (!hospitalId || !amount) {
      return res.status(400).json({ error: "hospitalId and amount are required" });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: "INR",
      receipt:  `rcpt_${Date.now()}`,
      notes: {
        patientId:  req.user.id,
        hospitalId: hospitalId,
        purpose,
      },
    });

    const payment = await Payment.create({
      patientId:       req.user.id,
      hospitalId,
      razorpayOrderId: order.id,
      amount:          amountInPaise,
      currency:        "INR",
      status:          "created",
      purpose,
      description:     description || null,
    });

    res.status(201).json({
      orderId:    order.id,
      amount:     amountInPaise,
      currency:   "INR",
      keyId:      process.env.RAZORPAY_KEY_ID,
      paymentId:  payment._id,
      hospital:   { name: hospital.name },
    });
  } catch (err) {
    console.error("PAYMENT ERROR:", err);
    const msg =
      (err && err.message) ||
      (err && err.error && (err.error.description || err.error.reason)) ||
      (err && err.toString && err.toString()) ||
      "Payment failed";
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/payment/verify ─────────────────────────────────────────
router.post("/verify", auth, requireRole("patient"), async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: "All three Razorpay fields are required" });
    }

    const body     = razorpayOrderId + "|" + razorpayPaymentId;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpaySignature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { status: "failed" }
      );
      return res.status(403).json({ error: "Payment verification failed. Invalid signature." });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: "paid",
        paidAt: new Date(),
      },
      { new: true }
    ).populate("hospitalId", "name");

    if (!payment) return res.status(404).json({ error: "Payment record not found" });

    res.json({
      success:   true,
      message:   "Payment verified successfully",
      paymentId: payment._id,
      amount:    payment.amount / 100,
      hospital:  payment.hospitalId?.name,
      paidAt:    payment.paidAt,
    });
  } catch (err) {
    const msg =
      (err && err.message) ||
      (err && err.error && (err.error.description || err.error.reason)) ||
      (err && err.toString && err.toString()) ||
      "Payment failed";
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/payment/my ──────────────────────────────────────────────
router.get("/my", auth, requireRole("patient"), async (req, res) => {
  try {
    const payments = await Payment.find({ patientId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("hospitalId", "name address")
      .lean();

    res.json(payments.map((p) => ({
      ...p,
      amount: p.amount / 100,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payment/hospital ────────────────────────────────────────
router.get("/hospital", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const payments = await Payment.find({
      hospitalId: req.user.hospitalId,
      status: "paid",
    })
      .sort({ paidAt: -1 })
      .populate("patientId", "pid name phone")
      .lean();

    res.json(payments.map((p) => ({
      ...p,
      amount: p.amount / 100,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;