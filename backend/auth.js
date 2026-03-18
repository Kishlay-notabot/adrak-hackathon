const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Generic token verification — attaches { id, role, hospitalId? } to req.user
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "No token provided" });

  try {
    req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    // cast hospitalId to ObjectId so it works in both find() and aggregate()
    if (req.user.hospitalId) {
      req.user.hospitalId = new mongoose.Types.ObjectId(req.user.hospitalId);
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Role guard — accepts one or more allowed roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// Checks that the admin has a hospital assigned
function requireHospital(req, res, next) {
  if (!req.user.hospitalId)
    return res.status(400).json({ error: "No hospital assigned. Create or join a hospital first." });
  next();
}

module.exports = { auth, requireRole, requireHospital };