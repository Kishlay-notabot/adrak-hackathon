require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────
app.use("/api/admin", require("./admin"));
app.use("/api/patient", require("./patient"));
app.use("/api/hospital", require("./hospital"));

// ── Health check ────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

  console.log("MONGO_URI:", process.env.MONGO_URI);
  mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
  
