// frontend/src/pages/admin/Predictions.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bed,
  Siren,
  Stethoscope,
  Clock,
  BarChart3,
  MapPin,
  X,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
} from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

// ── Helpers ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  critical: { label: "Critical Surge", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200", ring: "ring-red-500" },
  high:     { label: "High Demand",    color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-400" },
  moderate: { label: "Moderate Load",  color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-400" },
  stable:   { label: "Stable",         color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-400" },
}

function ProgressBar({ label, value, max, unit = "", icon: Icon, color = "bg-[#0F172A]", warning = false }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-orange-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#64748B]" />}
          <span className="text-sm font-medium text-[#0F172A]">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {pct >= 85 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          <span className="text-sm font-semibold text-[#0F172A]">
            {value}{unit && ` ${unit}`}
            {max > 0 && <span className="text-[#64748B] font-normal"> / {max}{unit && ` ${unit}`}</span>}
          </span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            pct >= 85 ? "bg-red-100 text-red-700" : pct >= 65 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
          }`}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

function StatBlock({ label, value, sub }) {
  return (
    <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
      <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
      <p className="text-xs text-[#64748B] mt-1">{label}</p>
      {sub && <p className="text-[10px] text-[#94A3B8] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────
export default function Predictions() {
  const navigate = useNavigate()
  const [resource, setResource] = useState(null)
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mapFilter, setMapFilter] = useState("all")
  const [selectedHospital, setSelectedHospital] = useState(null)

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
      const [res, map] = await Promise.all([
        api("/resources/overview").catch(() => null),
        api("/surge/hospital-map").catch(() => null),
      ])
      setResource(res)
      setMapData(map)
    } catch (err) {
      console.error("Predictions fetch error:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // Demo fallback if no resource data
  const cap = resource || {
    totalBeds: 500, occupiedBeds: 380, availableBeds: 120,
    totalIcuBeds: 60, occupiedIcuBeds: 52, availableIcuBeds: 8,
    emergencyCases: 18, opdCases: 45, incomingPatients: 63,
    totalDoctors: 40, availableDoctors: 28, totalNurses: 80, availableNurses: 55,
    avgWaitTimeMinutes: 34, avgTreatmentTimeMinutes: 82,
    emergencyPressureScore: 22, bedTurnoverRate: 0.7,
  }

  const hospitals = mapData?.hospitals || []
  const summary = mapData?.summary || { total: 0, critical: 0, high: 0, moderate: 0, stable: 0 }

  const filteredHospitals =
    mapFilter === "all" ? hospitals : hospitals.filter((h) => h.status === mapFilter)

  // Group by region
  const regions = {}
  filteredHospitals.forEach((h) => {
    if (!regions[h.region]) regions[h.region] = []
    regions[h.region].push(h)
  })

  // Mock triage breakdown (would come from real data in production)
  const triageTotal = (cap.emergencyCases || 0) + (cap.opdCases || 0)
  const triageData = [
    { label: "Red (Immediate)", count: Math.round((cap.emergencyCases || 0) * 0.3), color: "bg-red-500" },
    { label: "Orange (Urgent)", count: Math.round((cap.emergencyCases || 0) * 0.5), color: "bg-orange-500" },
    { label: "Yellow (Delayed)", count: Math.round((cap.opdCases || 0) * 0.4), color: "bg-amber-400" },
    { label: "Green (Minor)", count: Math.round((cap.opdCases || 0) * 0.6), color: "bg-emerald-500" },
  ]

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Predictions & Capacity" />
        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-[#64748B] text-sm">
              Loading predictions...
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Section 1: Capacity Progress Bars ────────── */}
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] mb-1">Current Capacity</h2>
                <p className="text-sm text-[#64748B] mb-4">
                  Real-time hospital load across beds, emergency, OPD, and triage
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Progress bars */}
                  <div className="lg:col-span-2 space-y-5">
                    <Card className="bg-white border-[#E2E8F0] shadow-sm">
                      <CardContent className="p-6 space-y-5">
                        <ProgressBar label="General Beds" value={cap.occupiedBeds} max={cap.totalBeds} icon={Bed} />
                        <ProgressBar label="ICU Beds" value={cap.occupiedIcuBeds} max={cap.totalIcuBeds} icon={Bed} />
                        <ProgressBar
                          label="Emergency Department"
                          value={cap.emergencyCases}
                          max={Math.round(cap.totalBeds * 0.08)}
                          icon={Siren}
                        />
                        <ProgressBar
                          label="OPD Load"
                          value={cap.opdCases}
                          max={Math.round(cap.totalBeds * 0.15)}
                          icon={Stethoscope}
                        />
                        <ProgressBar
                          label="Avg Wait Time"
                          value={cap.avgWaitTimeMinutes}
                          max={90}
                          unit="min"
                          icon={Clock}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: Triage + quick stats */}
                  <div className="space-y-4">
                    <Card className="bg-white border-[#E2E8F0] shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" /> Triage Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {triageData.map((t) => (
                          <div key={t.label} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${t.color} shrink-0`} />
                            <span className="text-sm text-[#0F172A] flex-1">{t.label}</span>
                            <span className="text-sm font-bold text-[#0F172A]">{t.count}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-[#E2E8F0] flex justify-between">
                          <span className="text-sm text-[#64748B]">Total Active</span>
                          <span className="text-sm font-bold text-[#0F172A]">
                            {triageData.reduce((s, t) => s + t.count, 0)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-[#E2E8F0] shadow-sm">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <StatBlock label="Avg Treatment" value={`${cap.avgTreatmentTimeMinutes}m`} />
                          <StatBlock label="Bed Turnover" value={cap.bedTurnoverRate?.toFixed(2) || "0.7"} />
                          <StatBlock label="Doctors Free" value={`${cap.availableDoctors}/${cap.totalDoctors}`} />
                          <StatBlock label="EP Score" value={cap.emergencyPressureScore?.toFixed(1) || "—"} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* ── Section 2: Delhi NCR Hospital Heat Map ──── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
                      <MapPin className="w-5 h-5" /> Delhi NCR Hospital Map
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      Utilization across {summary.total} hospitals in the region
                    </p>
                  </div>
                </div>

                {/* Summary pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { key: "all", label: `All (${summary.total})`, color: "bg-[#0F172A]" },
                    { key: "critical", label: `Critical ≥80% (${summary.critical})`, color: "bg-red-500" },
                    { key: "high", label: `High 65-79% (${summary.high})`, color: "bg-orange-500" },
                    { key: "moderate", label: `Moderate 45-64% (${summary.moderate})`, color: "bg-amber-500" },
                    { key: "stable", label: `Stable <45% (${summary.stable})`, color: "bg-emerald-500" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setMapFilter(f.key); setSelectedHospital(null) }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        mapFilter === f.key
                          ? "bg-[#0F172A] text-white"
                          : "bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {mapFilter !== f.key && <span className={`w-2 h-2 rounded-full ${f.color}`} />}
                      {f.label}
                    </button>
                  ))}
                </div>

                {filteredHospitals.length === 0 ? (
                  <Card className="bg-white border-[#E2E8F0] shadow-sm">
                    <CardContent className="py-12 text-center">
                      <p className="text-sm text-[#64748B]">No hospitals match this filter.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(regions)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([region, hospitals]) => (
                        <div key={region}>
                          <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" />
                            {region}
                            <span className="text-xs font-normal bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                              {hospitals.length} hospital{hospitals.length > 1 ? "s" : ""}
                            </span>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {hospitals.map((h) => {
                              const cfg = STATUS_CONFIG[h.status]
                              const isSelected = selectedHospital?.name === h.name
                              return (
                                <Card
                                  key={h.name}
                                  className={`cursor-pointer transition-all duration-200 border-2 ${
                                    isSelected
                                      ? `${cfg.border} ${cfg.bg} ring-2 ${cfg.ring} shadow-md`
                                      : `border-[#E2E8F0] bg-white hover:${cfg.bg} hover:${cfg.border} hover:shadow-md`
                                  }`}
                                  onClick={() => setSelectedHospital(isSelected ? null : h)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                      <h4 className="text-sm font-semibold text-[#0F172A] leading-tight pr-2">
                                        {h.name}
                                      </h4>
                                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                                        {h.utilization}%
                                      </span>
                                    </div>
                                    {/* Mini progress bar */}
                                    <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden mb-3">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${cfg.color}`}
                                        style={{ width: `${h.utilization}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between text-xs text-[#64748B]">
                                      <span>Beds: {h.availableBeds} free</span>
                                      <span>ICU: {h.icuAvailable} free</span>
                                    </div>

                                    {/* Expanded detail */}
                                    {isSelected && (
                                      <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-2.5">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Total Beds</p>
                                            <p className="text-sm font-bold text-[#0F172A]">{h.totalBeds}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Occupied</p>
                                            <p className="text-sm font-bold text-[#0F172A]">{h.occupiedBeds}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] text-[#64748B] uppercase tracking-wide">ICU Total</p>
                                            <p className="text-sm font-bold text-[#0F172A]">{h.icuTotal}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] text-[#64748B] uppercase tracking-wide">ICU Used</p>
                                            <p className="text-sm font-bold text-[#0F172A]">{h.icuOccupied}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-[#64748B] uppercase tracking-wide">ER Load</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <div className="h-2 flex-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                                              <div
                                                className={`h-full rounded-full ${
                                                  h.erLoad >= 85 ? "bg-red-500" : h.erLoad >= 65 ? "bg-orange-500" : "bg-emerald-500"
                                                }`}
                                                style={{ width: `${h.erLoad}%` }}
                                              />
                                            </div>
                                            <span className="text-xs font-bold text-[#0F172A]">{h.erLoad}%</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 pt-1">
                                          <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
                                          <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
