// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
// ── Routes ──────────────────────────────────────────────────────────
app.use("/api/admin", require("./routes/admin"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api/hospital", require("./routes/hospital"));
app.use("/api/admission", require("./routes/admission"));
app.use("/api/medical-records", require("./routes/medical-record"));
app.use("/api/resources", require("./routes/resource"));
app.use("/api/referral", require("./routes/referral"));
// ── Health check ────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
// ── Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });