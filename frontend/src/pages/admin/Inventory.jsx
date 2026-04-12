// frontend/src/pages/admin/Inventory.jsx
// NEW — separate inventory page with demand prediction
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Bed,
  Wind,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

const BED_CATEGORIES = [
  { key: "general", label: "General", icon: "🛏️" },
  { key: "icu", label: "ICU", icon: "🫀" },
  { key: "emergency", label: "Emergency", icon: "🚨" },
  { key: "pediatric", label: "Pediatric", icon: "👶" },
  { key: "maternity", label: "Maternity", icon: "🤱" },
]

function UsageBar({ used, total, label, color = "bg-[#0F172A]" }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const barColor = pct >= 85 ? "bg-red-500" : pct >= 65 ? "bg-orange-500" : pct >= 40 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-[#64748B]">{label}</span>
        <span className="text-xs font-medium text-[#0F172A]">{used}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

export default function Inventory() {
  const navigate = useNavigate()
  const [hospital, setHospital] = useState(null)
  const [resource, setResource] = useState(null)
  const [beds, setBeds] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  // Prediction state
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState(null)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") {
      navigate("/admin/login")
      return
    }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [hosp, res] = await Promise.all([
        api("/hospital/mine").catch(() => null),
        api("/resources/overview").catch(() => null),
      ])
      setHospital(hosp)
      setBeds(hosp?.beds || {})
      setResource(res)
    } catch (err) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateBedField = (category, field, value) => {
    setBeds((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    try {
      const payload = {}
      for (const cat of BED_CATEGORIES) {
        if (beds[cat.key]) {
          payload[cat.key] = {
            total: parseInt(beds[cat.key].total) || 0,
            available: parseInt(beds[cat.key].available) || 0,
          }
        }
      }
      await api("/hospital/mine/beds", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setMessage("Inventory updated!")
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      setMessage("Error: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePredict = async () => {
    setPredicting(true)
    setPrediction(null)
    try {
      const surge = await api("/surge/intelligence").catch(() => null)

      // Build prediction from surge data + current inventory
      const surgeScore = surge?.surgeScore || 30
      const level = surge?.surgeLevel || "low"
      const expectedInflow = surge?.predictions?.expectedInflowToday || 45
      const bedDemand = surge?.predictions?.bedDemandIncrease || "15%"

      // Calculate per-category predictions
      const totalBeds = BED_CATEGORIES.reduce((s, c) => s + (parseInt(beds[c.key]?.total) || 0), 0)
      const totalAvail = BED_CATEGORIES.reduce((s, c) => s + (parseInt(beds[c.key]?.available) || 0), 0)
      const multiplier = surgeScore >= 80 ? 1.4 : surgeScore >= 50 ? 1.2 : 1.05

      const predictions = BED_CATEGORIES.map((cat) => {
        const total = parseInt(beds[cat.key]?.total) || 0
        const avail = parseInt(beds[cat.key]?.available) || 0
        const occupied = total - avail
        const predicted = Math.round(occupied * multiplier)
        const deficit = Math.max(0, predicted - total)
        return {
          ...cat,
          total,
          available: avail,
          occupied,
          predictedOccupied: Math.min(predicted, total + deficit),
          deficit,
          risk: deficit > 0 ? "critical" : predicted / total > 0.85 ? "high" : predicted / total > 0.65 ? "moderate" : "low",
        }
      })

      // Equipment predictions
      const ventUsed = resource?.ventilatorsInUse || 8
      const ventTotal = resource?.ventilatorsTotal || 15
      const o2Used = resource?.oxygenUnitsInUse || 20
      const o2Total = resource?.oxygenUnitsTotal || 30

      setPrediction({
        surgeLevel: level,
        surgeScore,
        expectedInflow,
        bedDemand,
        beds: predictions,
        equipment: {
          ventilators: { used: ventUsed, total: ventTotal, predicted: Math.round(ventUsed * multiplier), deficit: Math.max(0, Math.round(ventUsed * multiplier) - ventTotal) },
          oxygen: { used: o2Used, total: o2Total, predicted: Math.round(o2Used * multiplier), deficit: Math.max(0, Math.round(o2Used * multiplier) - o2Total) },
        },
        staffNeeded: surgeScore >= 80 ? "Call in all off-duty staff" : surgeScore >= 50 ? "Alert on-call team" : "Normal staffing sufficient",
        recommendations: surge?.predictions?.recommendations || ["Normal operations"],
        newsFactors: (surge?.news || []).filter((n) => n.severity !== "low").slice(0, 3),
      })
    } catch (err) {
      console.error("Prediction failed:", err.message)
    } finally {
      setPredicting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC]">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
          <AdminNavbar title="Inventory" />
          <main className="flex-1 flex items-center justify-center text-[#64748B]">Loading...</main>
        </div>
      </div>
    )
  }

  const RISK_STYLE = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    moderate: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Inventory" />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A]">Hospital Inventory</h2>
              <p className="text-sm text-[#64748B]">
                Manage beds, track equipment, and predict demand
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handlePredict}
                disabled={predicting}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {predicting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {predicting ? "Predicting..." : "Predict Demand"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Left: Bed Management ──────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <Bed className="w-5 h-5" /> Bed Inventory
                  </CardTitle>
                  <CardDescription className="text-[#64748B]">
                    Update total and available beds per category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {message && (
                    <div
                      className={`mb-4 p-3 text-sm rounded-md ${
                        message.startsWith("Error")
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {message}
                    </div>
                  )}
                  <div className="space-y-4">
                    {BED_CATEGORIES.map((cat) => {
                      const total = parseInt(beds[cat.key]?.total) || 0
                      const avail = parseInt(beds[cat.key]?.available) || 0
                      const occupied = total - avail
                      const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
                      return (
                        <div key={cat.key} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cat.icon}</span>
                              <span className="text-sm font-semibold text-[#0F172A]">{cat.label}</span>
                            </div>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                pct >= 85
                                  ? "bg-red-100 text-red-700"
                                  : pct >= 65
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {pct}% occupied
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-[#64748B]">Total</Label>
                              <Input
                                type="number"
                                min="0"
                                className="h-9 border-[#E2E8F0]"
                                value={beds[cat.key]?.total ?? 0}
                                onChange={(e) => updateBedField(cat.key, "total", e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-[#64748B]">Available</Label>
                              <Input
                                type="number"
                                min="0"
                                className="h-9 border-[#E2E8F0]"
                                value={beds[cat.key]?.available ?? 0}
                                onChange={(e) => updateBedField(cat.key, "available", e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-[#64748B]">Occupied</Label>
                              <div className="h-9 flex items-center px-3 bg-[#E2E8F0]/50 rounded-md text-sm font-medium text-[#0F172A]">
                                {occupied}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-4 bg-black hover:bg-black/90 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* ── Right: Equipment & Staff snapshot ─────────── */}
            <div className="space-y-4">
              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <Wind className="w-5 h-5" /> Equipment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <UsageBar
                    label="Ventilators"
                    used={resource?.ventilatorsInUse || 0}
                    total={resource?.ventilatorsTotal || 0}
                  />
                  <UsageBar
                    label="Oxygen Units"
                    used={resource?.oxygenUnitsInUse || 0}
                    total={resource?.oxygenUnitsTotal || 0}
                  />
                  {!resource && (
                    <p className="text-xs text-[#94A3B8] text-center py-2">
                      No equipment data — seed resources CSV
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <Users className="w-5 h-5" /> Staff
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <UsageBar
                    label="Doctors"
                    used={(resource?.totalDoctors || 0) - (resource?.availableDoctors || 0)}
                    total={resource?.totalDoctors || 0}
                  />
                  <UsageBar
                    label="Nurses"
                    used={(resource?.totalNurses || 0) - (resource?.availableNurses || 0)}
                    total={resource?.totalNurses || 0}
                  />
                  {!resource && (
                    <p className="text-xs text-[#94A3B8] text-center py-2">
                      No staff data — seed resources CSV
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quick summary card */}
              <Card className="bg-[#0F172A] border-none shadow-sm text-white">
                <CardContent className="p-5">
                  <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Total Capacity</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xl font-bold">
                        {BED_CATEGORIES.reduce((s, c) => s + (parseInt(beds[c.key]?.total) || 0), 0)}
                      </p>
                      <p className="text-xs text-white/60">Total Beds</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {BED_CATEGORIES.reduce((s, c) => s + (parseInt(beds[c.key]?.available) || 0), 0)}
                      </p>
                      <p className="text-xs text-white/60">Available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Prediction Results ──────────────────────────── */}
          {prediction && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" /> Demand Prediction
                </h3>
                <button
                  onClick={() => setPrediction(null)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Prediction summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={`border shadow-sm ${
                  prediction.surgeLevel === "high"
                    ? "bg-red-50 border-red-200"
                    : prediction.surgeLevel === "moderate"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-[#64748B] mb-1">Surge Level</p>
                    <p className="text-xl font-bold capitalize">{prediction.surgeLevel}</p>
                    <p className="text-xs text-[#64748B]">Score: {prediction.surgeScore}/100</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-[#64748B] mb-1">Expected Inflow</p>
                    <p className="text-xl font-bold text-[#0F172A]">{prediction.expectedInflow}</p>
                    <p className="text-xs text-[#64748B]">patients today</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-[#64748B] mb-1">Bed Demand ↑</p>
                    <p className="text-xl font-bold text-[#0F172A]">{prediction.bedDemand}</p>
                    <p className="text-xs text-[#64748B]">above baseline</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-[#64748B] mb-1">Staff Advisory</p>
                    <p className="text-sm font-bold text-[#0F172A]">{prediction.staffNeeded}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-category bed predictions */}
              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-[#0F172A]">
                    Predicted Bed Demand by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prediction.beds.map((b) => (
                      <div key={b.key} className="flex items-center gap-4 p-3 bg-[#F8FAFC] rounded-lg">
                        <span className="text-lg w-6">{b.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[#0F172A]">{b.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#64748B]">
                                Now: {b.occupied}/{b.total}
                              </span>
                              <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                              <span className="text-xs font-bold text-[#0F172A]">
                                Predicted: {b.predictedOccupied}/{b.total}
                              </span>
                              {b.deficit > 0 && (
                                <span className="text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  -{b.deficit} deficit
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden relative">
                            <div
                              className="h-full bg-[#0F172A] rounded-full absolute"
                              style={{ width: `${b.total > 0 ? (b.occupied / b.total) * 100 : 0}%` }}
                            />
                            <div
                              className="h-full bg-purple-400/50 rounded-full absolute"
                              style={{ width: `${b.total > 0 ? Math.min((b.predictedOccupied / b.total) * 100, 100) : 0}%` }}
                            />
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${RISK_STYLE[b.risk]}`}>
                          {b.risk}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Equipment predictions + news factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-[#0F172A]">
                      Equipment Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Ventilators", ...prediction.equipment.ventilators },
                      { label: "Oxygen Units", ...prediction.equipment.oxygen },
                    ].map((eq) => (
                      <div key={eq.label} className="p-3 bg-[#F8FAFC] rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[#0F172A]">{eq.label}</span>
                          {eq.deficit > 0 ? (
                            <span className="text-xs text-red-700 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Shortage: {eq.deficit}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Sufficient
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B]">
                          Current: {eq.used}/{eq.total} → Predicted: {eq.predicted}/{eq.total}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {prediction.newsFactors.length > 0 && (
                  <Card className="bg-white border-[#E2E8F0] shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-[#0F172A]">
                        Contributing News Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {prediction.newsFactors.map((n) => (
                        <div key={n.id} className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${
                              n.severity === "high" ? "bg-red-500" : "bg-amber-500"
                            }`} />
                            <span className="text-xs font-medium text-[#64748B]">{n.source}</span>
                          </div>
                          <p className="text-xs font-medium text-[#0F172A]">{n.title}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
