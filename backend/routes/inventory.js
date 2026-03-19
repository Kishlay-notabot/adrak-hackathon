// backend/routes/inventory.js
// Medicine and pharmacy inventory management

const router = require("express").Router();
const {
  Medicine,
  MedicineUsageLog,
  RestockingAlert,
  Admission,
  Hospital,
} = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

/**
 * GET /api/inventory/medicines - Get all medicines for hospital
 * Query: ?category=antibiotic&depleting=true&outofstock=true&lowstock=true
 */
router.get("/medicines", auth, requireHospital, async (req, res) => {
  try {
    const { category, depleting, outofstock, lowstock, search } = req.query;

    let query = { hospitalId: req.user.hospitalId };

    if (category) query.category = category;
    if (depleting === "true") query.isDepletingFast = true;
    if (outofstock === "true") query.isOutOfStock = true;
    if (lowstock === "true") query.isLowStock = true;
    if (search)
      query.medicineName = { $regex: search, $options: "i" };

    const medicines = await Medicine.find(query).sort({ isDepletingFast: -1, daysUntilStockout: 1 });

    res.json({
      count: medicines.length,
      medicines,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inventory/medicines/:id - Get single medicine detail
 */
router.get("/medicines/:id", auth, requireHospital, async (req, res) => {
  try {
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      hospitalId: req.user.hospitalId,
    });

    if (!medicine)
      return res.status(404).json({ error: "Medicine not found" });

    // Get 30-day usage trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageTrend = await MedicineUsageLog.find({
      medicineId: medicine._id,
      date: { $gte: thirtyDaysAgo },
    })
      .sort({ date: 1 })
      .select("date quantityUsed stockRemaining");

    res.json({
      medicine,
      usageTrend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inventory/critical - Get critical inventory alerts
 */
router.get(
  "/critical",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const alerts = {
        outOfStock: [],
        lowStock: [],
        depletingFast: [],
      };

      // Out of stock medicines
      alerts.outOfStock = await Medicine.find({
        hospitalId: req.user.hospitalId,
        isOutOfStock: true,
      }).limit(10);

      // Low stock medicines
      alerts.lowStock = await Medicine.find({
        hospitalId: req.user.hospitalId,
        isLowStock: true,
        isOutOfStock: false,
      })
        .sort({ daysUntilStockout: 1 })
        .limit(15);

      // Depleting fast
      alerts.depletingFast = await Medicine.find({
        hospitalId: req.user.hospitalId,
        isDepletingFast: true,
      })
        .sort({ daysUntilStockout: 1 })
        .limit(10);

      res.json({
        totalAlerts:
          alerts.outOfStock.length +
          alerts.lowStock.length +
          alerts.depletingFast.length,
        ...alerts,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/inventory/recommendations - Get restocking recommendations based on diseases
 */
router.get(
  "/recommendations",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      // Get admission trends to predict diseases
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Map diseases to common medicines
      const diseaseToMedicines = {
        cardiac: ["Atorvastatin", "Aspirin", "Amlodipine", "Lisinopril"],
        fever: ["Paracetamol", "Ibuprofen"],
        antibiotic: ["Amoxicillin", "Cephalexin", "Ciprofloxacin"],
        respiratory: ["Montelukast", "Salbutamol", "Budesonide"],
        diabetic: ["Metformin", "Glipizide", "Insulin"],
        infections: ["Doxycycline", "Erythromycin"],
      };

      // Count admission reasons (simplified - using medical records)
      const recommendations = [];

      // Find critically low medicines
      const criticalMedicines = await Medicine.find({
        hospitalId: req.user.hospitalId,
        $or: [
          { isOutOfStock: true },
          { isLowStock: true },
          { isDepletingFast: true },
        ],
      }).sort({ daysUntilStockout: 1 });

      for (const medicine of criticalMedicines) {
        const recommendedQuantity =
          medicine.reorderQuantity *
          Math.max(1, Math.ceil(2 / (medicine.daysUntilStockout + 1)));

        let reason = "low_stock";
        if (medicine.isOutOfStock) reason = "stockout_risk";
        else if (medicine.isDepletingFast) reason = "fast_depleting";

        recommendations.push({
          medicineId: medicine._id,
          medicineName: medicine.medicineName,
          category: medicine.category,
          currentStock: medicine.totalStock,
          recommendedQuantity: Math.round(recommendedQuantity),
          reason,
          urgency: medicine.isOutOfStock
            ? "critical"
            : medicine.isDepletingFast
            ? "high"
            : "medium",
          daysUntilStockout: medicine.daysUntilStockout,
          depletionRate: medicine.depletionRate,
          estimatedCost:
            Math.round(recommendedQuantity) * medicine.pricePerUnit,
        });
      }

      res.json({
        totalRecommendations: recommendations.length,
        estimatedTotalCost: recommendations.reduce(
          (sum, r) => sum + r.estimatedCost,
          0
        ),
        recommendations: recommendations.sort(
          (a, b) =>
            (b.urgency === "critical" ? 1 : 0) -
            (a.urgency === "critical" ? 1 : 0)
        ),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * PUT /api/inventory/medicines/:id - Update medicine stock
 * Body: { totalStock, quantityUsed }
 */
router.put(
  "/medicines/:id",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const { totalStock, quantityUsed } = req.body;

      const medicine = await Medicine.findOne({
        _id: req.params.id,
        hospitalId: req.user.hospitalId,
      });

      if (!medicine)
        return res.status(404).json({ error: "Medicine not found" });

      // Update stock if provided
      if (totalStock !== undefined) {
        medicine.totalStock = totalStock;
        medicine.lastRestocked = new Date();
      }

      // Log usage if provided
      if (quantityUsed !== undefined) {
        medicine.quantityUsed = quantityUsed;
        medicine.lastUsedAt = new Date();

        // Update rolling averages
        medicine.dailyAverageUsage = Math.round(
          (medicine.dailyAverageUsage * 6 + quantityUsed) / 7
        );
        medicine.weeklyUsage =
          (medicine.weeklyUsage * 6 + quantityUsed * 7) / 7;
      }

      // Recalculate depletion metrics
      const depletionRate = medicine.dailyAverageUsage || 1;
      medicine.depletionRate = depletionRate;
      medicine.daysUntilStockout = Math.ceil(medicine.totalStock / depletionRate);
      medicine.isDepletingFast = medicine.daysUntilStockout < 7;
      medicine.isOutOfStock = medicine.totalStock === 0;
      medicine.isLowStock = medicine.totalStock < medicine.minimumThreshold;

      await medicine.save();

      res.json({
        success: true,
        medicine,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/inventory/analytics - Get inventory analytics
 */
router.get(
  "/analytics",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const medicines = await Medicine.find({
        hospitalId: req.user.hospitalId,
      });

      const analytics = {
        totalMedicines: medicines.length,
        outOfStock: medicines.filter((m) => m.isOutOfStock).length,
        lowStock: medicines.filter((m) => m.isLowStock && !m.isOutOfStock)
          .length,
        depletingFast: medicines.filter((m) => m.isDepletingFast).length,
        totalValue: medicines.reduce(
          (sum, m) => sum + m.totalStock * m.pricePerUnit,
          0
        ),
        averageDaysUntilStockout: Math.round(
          medicines.reduce((sum, m) => sum + m.daysUntilStockout, 0) /
            medicines.length
        ),
        topDepletingByCategory: {},
        byCategory: {},
      };

      // Group by category
      for (const medicine of medicines) {
        if (!analytics.byCategory[medicine.category]) {
          analytics.byCategory[medicine.category] = {
            count: 0,
            outOfStock: 0,
            lowStock: 0,
            totalValue: 0,
          };
        }

        analytics.byCategory[medicine.category].count++;
        if (medicine.isOutOfStock)
          analytics.byCategory[medicine.category].outOfStock++;
        if (medicine.isLowStock)
          analytics.byCategory[medicine.category].lowStock++;
        analytics.byCategory[medicine.category].totalValue +=
          medicine.totalStock * medicine.pricePerUnit;
      }

      // Top depleting
      const topDepleting = medicines
        .sort((a, b) => b.depletionRate - a.depletionRate)
        .slice(0, 5)
        .map((m) => ({
          name: m.medicineName,
          depletionRate: m.depletionRate,
          daysLeft: m.daysUntilStockout,
        }));

      analytics.topDepleting = topDepleting;

      res.json(analytics);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/inventory/restock-alerts - Create restocking alert
 */
router.post(
  "/restock-alerts",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const { medicineId, reason, urgency, predictedDisease } = req.body;

      const medicine = await Medicine.findOne({
        _id: medicineId,
        hospitalId: req.user.hospitalId,
      });

      if (!medicine)
        return res.status(404).json({ error: "Medicine not found" });

      const alert = await RestockingAlert.create({
        hospitalId: req.user.hospitalId,
        medicineId,
        medicineName: medicine.medicineName,
        medicineCategory: medicine.category,
        currentStock: medicine.totalStock,
        recommendedQuantity: medicine.reorderQuantity,
        reason: reason || "low_stock",
        urgency: urgency || "medium",
        predictedDisease,
        status: "pending",
      });

      res.status(201).json(alert);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/inventory/restock-alerts - Get all restocking alerts
 */
router.get(
  "/restock-alerts",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const { status } = req.query;

      let query = { hospitalId: req.user.hospitalId };
      if (status) query.status = status;

      const alerts = await RestockingAlert.find(query)
        .sort({ urgency: -1, createdAt: -1 })
        .limit(50);

      res.json({
        count: alerts.length,
        alerts,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
