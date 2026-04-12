// backend/routes/surge.js
const router = require("express").Router();
const { ResourceStatus, Hospital, PatientInflow } = require("../models");
const { auth, requireRole, requireHospital } = require("../middleware/auth");

// ── Mock Delhi NCR news for surge intelligence ──────────────────────
// In production, replace with a real news API (Google News, NewsAPI, etc.)
function getMockNews() {
  const now = Date.now();
  return [
    {
      id: "n1",
      title: "Dengue Cases Surge Across South Delhi Districts",
      source: "Times of India",
      summary:
        "Health officials report a 40% increase in dengue cases across South Delhi. Hospitals advised to prepare additional beds and activate mosquito-borne disease protocols.",
      severity: "high",
      impact: "Expected 25-30% increase in emergency admissions over next 2 weeks",
      category: "outbreak",
      publishedAt: new Date(now - 2 * 3600000).toISOString(),
    },
    {
      id: "n2",
      title: "Air Quality Index Hits 'Severe' Category in NCR",
      source: "Hindustan Times",
      summary:
        "AQI crosses 400 in multiple NCR stations. Spike in respiratory distress cases expected across hospitals in Gurgaon, Noida, and Central Delhi.",
      severity: "high",
      impact: "Respiratory and cardiac ER visits likely to double in 48 hours",
      category: "environmental",
      publishedAt: new Date(now - 5 * 3600000).toISOString(),
    },
    {
      id: "n3",
      title: "Multi-Vehicle Pile-Up on NH-48 Near Manesar",
      source: "NDTV",
      summary:
        "12-vehicle collision on Delhi-Jaipur highway. Multiple trauma cases being routed to Gurgaon hospitals. Medanta and Fortis on high alert.",
      severity: "high",
      impact: "Immediate trauma surge — 15-20 critical patients expected",
      category: "accident",
      publishedAt: new Date(now - 1 * 3600000).toISOString(),
    },
    {
      id: "n4",
      title: "Heatwave Advisory Issued for Delhi NCR — 47°C Expected",
      source: "India Meteorological Department",
      summary:
        "IMD issues red alert for extreme heat. Heatstroke and dehydration cases expected to rise significantly, especially among elderly and outdoor workers.",
      severity: "moderate",
      impact: "10-15% increase in OPD and emergency visits for heat-related illness",
      category: "weather",
      publishedAt: new Date(now - 8 * 3600000).toISOString(),
    },
    {
      id: "n5",
      title: "Gastroenteritis Cluster Reported in East Delhi",
      source: "Indian Express",
      summary:
        "Over 200 cases of acute gastroenteritis reported in Shahdara and Laxmi Nagar. Contaminated water supply suspected. Local hospitals seeing increased footfall.",
      severity: "moderate",
      impact: "Moderate increase in GI-related admissions at East Delhi facilities",
      category: "outbreak",
      publishedAt: new Date(now - 12 * 3600000).toISOString(),
    },
    {
      id: "n6",
      title: "New COVID Sub-Variant Detected in Routine Surveillance",
      source: "ICMR Bulletin",
      summary:
        "New sub-variant detected in 3 samples from Delhi. No significant severity increase observed. Standard precautions advised.",
      severity: "low",
      impact: "Minimal — routine surveillance continues, no protocol changes needed",
      category: "surveillance",
      publishedAt: new Date(now - 24 * 3600000).toISOString(),
    },
    {
      id: "n7",
      title: "Marathon Event This Weekend — Road Closures in Central Delhi",
      source: "Delhi Traffic Police",
      summary:
        "Half-marathon on Sunday will close roads around India Gate and Connaught Place. Ambulance routes may be affected. Hospitals advised to plan alternate access.",
      severity: "low",
      impact: "Minor disruption to ambulance routes; possible minor injuries from event",
      category: "event",
      publishedAt: new Date(now - 18 * 3600000).toISOString(),
    },
    {
      id: "n8",
      title: "Construction Collapse in Noida Sector 62",
      source: "ANI",
      summary:
        "Under-construction building partially collapsed. Rescue operations underway. 5-8 workers feared trapped. Nearest hospitals alerted.",
      severity: "moderate",
      impact: "Potential trauma cases — 5-10 patients with crush injuries",
      category: "accident",
      publishedAt: new Date(now - 3 * 3600000).toISOString(),
    },
  ];
}

// ── Mock Delhi NCR hospitals for heat map ────────────────────────────
// In production these would come from the real Hospital collection.
function getDelhiNCRHospitals() {
  return [
    { name: "AIIMS Delhi", region: "Central Delhi", lat: 28.5672, lng: 77.21, totalBeds: 2500, occupiedBeds: 2200, icuTotal: 200, icuOccupied: 185, erLoad: 92 },
    { name: "Safdarjung Hospital", region: "Central Delhi", lat: 28.5685, lng: 77.2065, totalBeds: 1800, occupiedBeds: 1500, icuTotal: 120, icuOccupied: 98, erLoad: 78 },
    { name: "Sir Ganga Ram Hospital", region: "Central Delhi", lat: 28.6381, lng: 77.1890, totalBeds: 675, occupiedBeds: 580, icuTotal: 80, icuOccupied: 72, erLoad: 85 },
    { name: "GTB Hospital", region: "East Delhi", lat: 28.6862, lng: 77.3105, totalBeds: 1500, occupiedBeds: 1100, icuTotal: 100, icuOccupied: 68, erLoad: 65 },
    { name: "Lok Nayak Hospital (LNJP)", region: "Central Delhi", lat: 28.6369, lng: 77.2395, totalBeds: 2000, occupiedBeds: 1750, icuTotal: 150, icuOccupied: 140, erLoad: 88 },
    { name: "Max Super Speciality, Saket", region: "South Delhi", lat: 28.5275, lng: 77.2130, totalBeds: 500, occupiedBeds: 320, icuTotal: 60, icuOccupied: 35, erLoad: 55 },
    { name: "Fortis Escorts, Okhla", region: "South Delhi", lat: 28.5355, lng: 77.2750, totalBeds: 310, occupiedBeds: 200, icuTotal: 45, icuOccupied: 22, erLoad: 48 },
    { name: "Apollo Hospital, Sarita Vihar", region: "South Delhi", lat: 28.5310, lng: 77.2890, totalBeds: 710, occupiedBeds: 500, icuTotal: 75, icuOccupied: 58, erLoad: 68 },
    { name: "Medanta — The Medicity", region: "Gurgaon", lat: 28.4395, lng: 77.0420, totalBeds: 1250, occupiedBeds: 900, icuTotal: 200, icuOccupied: 150, erLoad: 70 },
    { name: "Fortis Memorial, Gurgaon", region: "Gurgaon", lat: 28.4440, lng: 77.0565, totalBeds: 1000, occupiedBeds: 780, icuTotal: 120, icuOccupied: 100, erLoad: 76 },
    { name: "Artemis Hospital, Gurgaon", region: "Gurgaon", lat: 28.4500, lng: 77.0720, totalBeds: 400, occupiedBeds: 180, icuTotal: 50, icuOccupied: 20, erLoad: 38 },
    { name: "Jaypee Hospital, Noida", region: "Noida", lat: 28.5705, lng: 77.3260, totalBeds: 525, occupiedBeds: 380, icuTotal: 60, icuOccupied: 45, erLoad: 66 },
    { name: "Fortis Noida", region: "Noida", lat: 28.5745, lng: 77.3560, totalBeds: 260, occupiedBeds: 110, icuTotal: 30, icuOccupied: 12, erLoad: 35 },
    { name: "Yatharth Hospital, Noida Ext", region: "Noida", lat: 28.4940, lng: 77.4580, totalBeds: 350, occupiedBeds: 250, icuTotal: 40, icuOccupied: 30, erLoad: 62 },
    { name: "Asian Hospital, Faridabad", region: "Faridabad", lat: 28.3720, lng: 77.3120, totalBeds: 300, occupiedBeds: 260, icuTotal: 35, icuOccupied: 32, erLoad: 84 },
    { name: "QRG Health City, Faridabad", region: "Faridabad", lat: 28.4110, lng: 77.3080, totalBeds: 400, occupiedBeds: 200, icuTotal: 45, icuOccupied: 18, erLoad: 42 },
    { name: "BLK-Max Hospital", region: "West Delhi", lat: 28.6540, lng: 77.1850, totalBeds: 700, occupiedBeds: 610, icuTotal: 85, icuOccupied: 78, erLoad: 87 },
    { name: "Rajiv Gandhi Super Speciality", region: "East Delhi", lat: 28.7012, lng: 77.2940, totalBeds: 650, occupiedBeds: 420, icuTotal: 70, icuOccupied: 40, erLoad: 58 },
  ];
}

// ── GET /api/surge/intelligence ──────────────────────────────────────
router.get(
  "/intelligence",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const hospitalId = req.user.hospitalId;

      // Latest resource snapshot
      const latest = await ResourceStatus.findOne({ hospitalId })
        .sort({ timestamp: -1 })
        .lean();

      // Compute surge score 0–100
      let surgeScore = 0;
      if (latest) {
        const bedUtil =
          latest.totalBeds > 0
            ? (latest.occupiedBeds / latest.totalBeds) * 100
            : 0;
        const icuUtil =
          latest.totalIcuBeds > 0
            ? (latest.occupiedIcuBeds / latest.totalIcuBeds) * 100
            : 0;
        const epScore = Math.min(latest.emergencyPressureScore || 0, 100);
        surgeScore = Math.round(bedUtil * 0.3 + icuUtil * 0.4 + epScore * 0.3);
      } else {
        // No resource data — generate a plausible demo score
        surgeScore = 62;
      }

      const surgeLevel =
        surgeScore >= 80 ? "high" : surgeScore >= 50 ? "moderate" : "low";

      // News — filter if requested
      const severityFilter = req.query.severity;
      let news = getMockNews();
      if (severityFilter && severityFilter !== "all") {
        news = news.filter((n) => n.severity === severityFilter);
      }

      // Recent inflow for predictions
      const recentInflow = await PatientInflow.find({ hospitalId })
        .sort({ date: -1 })
        .limit(7)
        .lean();

      const avgDaily =
        recentInflow.length > 0
          ? Math.round(
              recentInflow.reduce((s, d) => s + d.count, 0) /
                recentInflow.length
            )
          : 45; // fallback demo value

      res.json({
        surgeLevel,
        surgeScore,
        news,
        predictions: {
          expectedInflowToday: Math.round(avgDaily * (1 + surgeScore / 200)),
          expectedInflowTomorrow: Math.round(avgDaily * (1 + surgeScore / 150)),
          bedDemandIncrease: `${Math.round(surgeScore * 0.4)}%`,
          staffReadiness:
            surgeScore >= 80
              ? "Critical — call backup"
              : surgeScore >= 50
              ? "Alert — monitor closely"
              : "Normal",
          recommendations:
            surgeScore >= 80
              ? [
                  "Activate surge protocol immediately",
                  "Call in off-duty staff",
                  "Prepare overflow / corridor beds",
                  "Coordinate referrals with nearby hospitals",
                  "Defer elective procedures",
                ]
              : surgeScore >= 50
              ? [
                  "Monitor bed availability every 2 hours",
                  "Alert on-call staff for possible activation",
                  "Review discharge-ready patients",
                  "Ensure emergency supply stock",
                ]
              : [
                  "Continue routine operations",
                  "Standard monitoring schedule",
                  "Maintain normal staffing levels",
                ],
        },
        resourceSnapshot: latest || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/surge/hospital-map ──────────────────────────────────────
// Returns Delhi NCR hospitals with utilization for heat map.
// Merges real DB hospitals (if any have coordinates in NCR) with mock data.
router.get(
  "/hospital-map",
  auth,
  requireRole("admin"),
  requireHospital,
  async (req, res) => {
    try {
      const mockHospitals = getDelhiNCRHospitals();

      // Add slight randomness so the demo feels live
      const jitter = () => Math.round((Math.random() - 0.5) * 20);
      const hospitals = mockHospitals.map((h) => {
        const occupied = Math.max(
          0,
          Math.min(h.totalBeds, h.occupiedBeds + jitter())
        );
        const utilization = Math.round((occupied / h.totalBeds) * 100);
        const icuOccupied = Math.max(
          0,
          Math.min(h.icuTotal, h.icuOccupied + Math.round((Math.random() - 0.5) * 6))
        );
        const erLoad = Math.max(0, Math.min(100, h.erLoad + jitter()));

        let status = "stable";
        if (utilization >= 80) status = "critical";
        else if (utilization >= 65) status = "high";
        else if (utilization >= 45) status = "moderate";

        return {
          name: h.name,
          region: h.region,
          lat: h.lat,
          lng: h.lng,
          totalBeds: h.totalBeds,
          occupiedBeds: occupied,
          availableBeds: h.totalBeds - occupied,
          icuTotal: h.icuTotal,
          icuOccupied,
          icuAvailable: h.icuTotal - icuOccupied,
          erLoad,
          utilization,
          status,
        };
      });

      // Optional filter
      const statusFilter = req.query.status;
      const filtered =
        statusFilter && statusFilter !== "all"
          ? hospitals.filter((h) => h.status === statusFilter)
          : hospitals;

      res.json({
        hospitals: filtered,
        summary: {
          total: hospitals.length,
          critical: hospitals.filter((h) => h.status === "critical").length,
          high: hospitals.filter((h) => h.status === "high").length,
          moderate: hospitals.filter((h) => h.status === "moderate").length,
          stable: hospitals.filter((h) => h.status === "stable").length,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
