// backend/models-ext.js
// MODIFIED — adds HospitalPayment + Appointment schemas
const mongoose = require("mongoose");
const { Schema } = mongoose;

const originalModels = require("./models");

// ─── Resource Request (inter-hospital resource sharing) ─────────────
const resourceRequestSchema = new Schema(
  {
    fromHospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    toHospitalId:   { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    requestedBy:    { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    respondedBy:    { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    type:           { type: String, enum: ["request", "offer"], required: true },
    resourceType:   { type: String, enum: ["beds", "icu_beds", "oxygen", "ventilators", "blood", "staff"], required: true },
    quantity:       { type: Number, required: true, min: 1 },
    urgency:        { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status:         { type: String, enum: ["pending", "accepted", "declined", "cancelled", "paid"], default: "pending" },
    message:        { type: String, trim: true },
    respondedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);
resourceRequestSchema.index({ fromHospitalId: 1, status: 1 });
resourceRequestSchema.index({ toHospitalId: 1, status: 1 });

// ─── Access Request (patient data permission) ───────────────────────
const accessRequestSchema = new Schema(
  {
    hospitalId:   { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patientId:    { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    requestedBy:  { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    reason:       { type: String, trim: true },
    status:       { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
    respondedAt:  { type: Date, default: null },
    expiresAt:    { type: Date, default: () => new Date(Date.now() + 7 * 24 * 3600000) },
  },
  { timestamps: true }
);
accessRequestSchema.index({ patientId: 1, status: 1 });
accessRequestSchema.index({ hospitalId: 1, patientId: 1 });

// ─── Appointment (patient booking system) ────────────────────────────
const appointmentSchema = new Schema(
  {
    patientId:   { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    hospitalId:  { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    date:        { type: Date, required: true },
    timeSlot:    { type: String, required: true },
    reason:      { type: String, trim: true },
    status:      { type: String, enum: ["pending", "confirmed", "cancelled", "completed", "no-show"], default: "pending" },
    cancelledBy: { type: String, enum: ["patient", "hospital"], default: null },
    notes:       { type: String, trim: true },
  },
  { timestamps: true }
);
appointmentSchema.index({ hospitalId: 1, date: 1, timeSlot: 1 });
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ hospitalId: 1, status: 1 });

// ─── Hospital Payment (inter-hospital resource payments) ─────────────
const hospitalPaymentSchema = new Schema(
  {
    fromHospitalId:     { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    toHospitalId:       { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    resourceRequestId:  { type: Schema.Types.ObjectId, ref: "ResourceRequest", required: true },
    createdBy:          { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    razorpayOrderId:    { type: String, required: true, unique: true },
    razorpayPaymentId:  { type: String, default: null },
    razorpaySignature:  { type: String, default: null },
    amount:             { type: Number, required: true },
    currency:           { type: String, default: "INR" },
    status:             { type: String, enum: ["created", "paid", "failed"], default: "created" },
    description:        { type: String },
    paidAt:             { type: Date, default: null },
  },
  { timestamps: true }
);
hospitalPaymentSchema.index({ fromHospitalId: 1 });
hospitalPaymentSchema.index({ resourceRequestId: 1 });

module.exports = {
  ...originalModels,
  ResourceRequest: mongoose.model("ResourceRequest", resourceRequestSchema),
  AccessRequest:   mongoose.model("AccessRequest", accessRequestSchema),
  Appointment:     mongoose.model("Appointment", appointmentSchema),
  HospitalPayment: mongoose.model("HospitalPayment", hospitalPaymentSchema),
};
