// backend/models-ext.js
// NEW — extends models.js with ResourceRequest + AccessRequest
// New routes import from here: require("../models-ext")
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Re-export everything from original models
const originalModels = require("./models");

// ─── Resource Request (inter-hospital resource sharing) ─────────────
const resourceRequestSchema = new Schema(
  {
    fromHospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    toHospitalId:   { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    requestedBy:    { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    respondedBy:    { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    type:           { type: String, enum: ["request", "offer"], required: true },  // request = need, offer = giving
    resourceType:   { type: String, enum: ["beds", "icu_beds", "oxygen", "ventilators", "blood", "staff"], required: true },
    quantity:        { type: Number, required: true, min: 1 },
    urgency:        { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status:         { type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending" },
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
    expiresAt:    { type: Date, default: () => new Date(Date.now() + 7 * 24 * 3600000) }, // 7 days
  },
  { timestamps: true }
);
accessRequestSchema.index({ patientId: 1, status: 1 });
accessRequestSchema.index({ hospitalId: 1, patientId: 1 });

module.exports = {
  ...originalModels,
  ResourceRequest: mongoose.model("ResourceRequest", resourceRequestSchema),
  AccessRequest:   mongoose.model("AccessRequest", accessRequestSchema),
};
