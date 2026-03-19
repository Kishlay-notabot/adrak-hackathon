// backend/routes/forecast.js
// Patient flow forecasting endpoints

const router = require("express").Router();
const { Hospital, PatientInflow } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");
const { generateForecast } = require("../forecasting");

/**
 * GET /api/forecast/inflow - Get patient inflow forecast
 * Query params:
 *   - days: Number of days to forecast (default: 14)
 *   - historicalDays: Number of historical days to include (default: 90)
 *   - startDate: Custom start date (ISO format: 2023-01-01)
 *   - endDate: Custom end date (ISO format: 2023-12-31)
 */
router.get(
  "/inflow",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const forecastDays = parseInt(req.query.days) || 14;
      let historicalDays = parseInt(req.query.historicalDays) || 90;

      // Allow custom date range OR default to last N days
      let startDate, endDate;

      if (req.query.startDate && req.query.endDate) {
        // Custom date range provided
        startDate = new Date(req.query.startDate);
        endDate = new Date(req.query.endDate);
      } else {
        // Default: last N days from today
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        startDate = new Date();
        startDate.setDate(startDate.getDate() - historicalDays);
        startDate.setHours(0, 0, 0, 0);
      }

      const inflowData = await PatientInflow.find({
        hospitalId: req.user.hospitalId,
        date: { $gte: startDate, $lte: endDate },
      })
        .select("date count")
        .sort({ date: 1 })
        .lean();

      if (inflowData.length === 0) {
        return res.status(400).json({
          error: "Insufficient data for forecasting",
          message: `No patient inflow records found between ${startDate.toISOString().split("T")[0]} and ${endDate.toISOString().split("T")[0]}`,
          recordsFound: 0,
          hint: "Try using custom startDate/endDate params for historical data",
        });
      }

      // Generate forecast
      const forecast = await generateForecast(inflowData, forecastDays);

      res.json({
        success: true,
        hospitalId: req.user.hospitalId,
        dataPoints: inflowData.length,
        dateRange: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        },
        ...forecast,
      });
    } catch (err) {
      console.error("Forecast error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/forecast/summary - Quick summary of tomorrow's expected inflow
 */
router.get(
  "/summary",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const historicalDays = parseInt(req.query.historicalDays) || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historicalDays);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const inflowData = await PatientInflow.find({
        hospitalId: req.user.hospitalId,
        date: { $gte: startDate, $lte: endDate },
      })
        .select("date count")
        .sort({ date: -1 })
        .limit(1)
        .lean();

      if (inflowData.length < 3) {
        return res.json({
          warning: "Insufficient historical data",
          recommendedMinimumDays: 7,
        });
      }

      const forecast = await generateForecast(inflowData, 3);
      const tomorrow = forecast.forecastDates[0];
      const tomorrowForecast = forecast.forecastCounts[0];

      const today = new Date().toISOString().split("T")[0];
      const todayActual =
        inflowData.length > 0
          ? inflowData[0].count
          : "No data";

      res.json({
        today,
        todayActual,
        tomorrow,
        tomorrowExpected: tomorrowForecast,
        trend: forecast.trend,
        confidence: "Medium", // Based on data quality
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
