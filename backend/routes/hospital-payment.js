// backend/routes/hospital-payment.js
// Inter-hospital resource payments via Razorpay
const router = require("express").Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Hospital } = require("../models");
const { ResourceRequest, HospitalPayment } = require("../models-ext");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /api/hospital-payment/create-order ─────────────────────────
// Admin creates a payment for an accepted resource request
router.post("/create-order", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { resourceRequestId, amount, description } = req.body;

    if (!resourceRequestId || !amount) {
      return res.status(400).json({ error: "resourceRequestId and amount are required" });
    }

    // Validate the resource request exists, is accepted, and belongs to this hospital
    const rr = await ResourceRequest.findById(resourceRequestId)
      .populate("toHospitalId", "name");
    if (!rr) return res.status(404).json({ error: "Resource request not found" });
    if (rr.status !== "accepted") {
      return res.status(400).json({ error: "Can only pay for accepted resource requests" });
    }
    if (rr.fromHospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ error: "You can only pay for your own requests" });
    }

    // Check if already paid
    const existingPayment = await HospitalPayment.findOne({
      resourceRequestId,
      status: "paid",
    });
    if (existingPayment) {
      return res.status(409).json({ error: "This resource request has already been paid" });
    }

    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `hosp_${Date.now()}`,
      notes: {
        fromHospitalId: req.user.hospitalId.toString(),
        toHospitalId: rr.toHospitalId._id.toString(),
        resourceRequestId: resourceRequestId,
        resourceType: rr.resourceType,
        quantity: rr.quantity,
      },
    });

    const payment = await HospitalPayment.create({
      fromHospitalId: req.user.hospitalId,
      toHospitalId: rr.toHospitalId._id,
      resourceRequestId,
      createdBy: req.user.id,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      status: "created",
      description: description || `Payment for ${rr.quantity} ${rr.resourceType}`,
    });

    res.status(201).json({
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
      toHospital: { name: rr.toHospitalId.name },
    });
  } catch (err) {
    console.error("HOSPITAL PAYMENT ERROR:", err);
    const msg =
      (err && err.message) ||
      (err && err.error && (err.error.description || err.error.reason)) ||
      "Payment failed";
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/hospital-payment/verify ────────────────────────────────
router.post("/verify", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: "All three Razorpay fields are required" });
    }

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpaySignature) {
      await HospitalPayment.findOneAndUpdate(
        { razorpayOrderId },
        { status: "failed" }
      );
      return res.status(403).json({ error: "Payment verification failed. Invalid signature." });
    }

    const payment = await HospitalPayment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: "paid",
        paidAt: new Date(),
      },
      { new: true }
    ).populate("toHospitalId", "name");

    if (!payment) return res.status(404).json({ error: "Payment record not found" });

    // Mark the resource request as paid
    await ResourceRequest.findByIdAndUpdate(payment.resourceRequestId, {
      $set: { status: "paid" },
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: payment._id,
      amount: payment.amount / 100,
      hospital: payment.toHospitalId?.name,
      paidAt: payment.paidAt,
    });
  } catch (err) {
    const msg =
      (err && err.message) ||
      (err && err.error && (err.error.description || err.error.reason)) ||
      "Payment verification failed";
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/hospital-payment/history ────────────────────────────────
router.get("/history", auth, requireRole("admin"), requireHospital, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    const payments = await HospitalPayment.find({
      $or: [{ fromHospitalId: hospitalId }, { toHospitalId: hospitalId }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("fromHospitalId", "name")
      .populate("toHospitalId", "name")
      .populate("resourceRequestId", "resourceType quantity type")
      .lean();

    res.json(
      payments.map((p) => ({
        ...p,
        amount: p.amount / 100,
        direction:
          p.fromHospitalId?._id?.toString() === hospitalId.toString()
            ? "outgoing"
            : "incoming",
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
