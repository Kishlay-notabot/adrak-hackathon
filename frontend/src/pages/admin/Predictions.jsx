// frontend/src/pages/admin/Predictions.jsx
// MODIFIED — Leaflet map replaces card grid for Delhi NCR hospitals
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bed, Siren, Stethoscope, Clock, BarChart3, MapPin, TrendingUp, AlertTriangle,
} from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"
import L from "leaflet"

// Fix default marker icons (leaflet CSS issue with bundlers)
import "leaflet/dist/leaflet.css"

const STATUS_CONFIG = {
  critical: { label: "Critical Surge ≥80%", color: "#EF4444", fillColor: "#FEE2E2" },
  high:     { label: "High Demand 65-79%",  color: "#F97316", fillColor: "#FED7AA" },
  moderate: { label: "Moderate 45-64%",      color: "#EAB308", fillColor: "#FEF3C7" },
  stable:   { label: "Stable <45%",          color: "#22C55E", fillColor: "#DCFCE7" },
}

function ProgressBar({ label, value, max, unit = "", icon: Icon }) {
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
          }`}>{pct}%</span>
        </div>
      </div>
      <div className="h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

export default function Predictions() {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [resource, setResource] = useState(null)
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mapFilter, setMapFilter] = useState("all")
  const [selectedHospital, setSelectedHospital] = useState(null)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") { navigate("/admin/login"); return }
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
    } catch (err) { console.error(err.message) }
    finally { setLoading(false) }
  }

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current, { scrollWheelZoom: true }).setView([28.55, 77.15], 10)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    mapInstanceRef.current = map
    return () => { map.remove(); mapInstanceRef.current = null }
  }, [loading])

  // Update markers when data or filter changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapData?.hospitals) return

    // Clear existing markers
    map.eachLayer((layer) => { if (layer instanceof L.CircleMarker) map.removeLayer(layer) })

    const hospitals = mapFilter === "all"
      ? mapData.hospitals
      : mapData.hospitals.filter((h) => h.status === mapFilter)

    hospitals.forEach((h) => {
      const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.stable
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: Math.max(8, Math.min(18, h.totalBeds / 80)),
        color: cfg.color,
        fillColor: cfg.color,
        fillOpacity: 0.7,
        weight: 2,
      }).addTo(map)

      marker.bindPopup(`
        <div style="min-width:200px;font-family:system-ui">
          <h3 style="margin:0 0 6px;font-size:14px;font-weight:700">${h.name}</h3>
          <div style="display:inline-block;background:${cfg.fillColor};color:${cfg.color};font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-bottom:8px">${h.utilization}% utilized</div>
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <tr><td style="color:#64748B;padding:2px 0">Beds</td><td style="text-align:right;font-weight:600">${h.occupiedBeds}/${h.totalBeds} <span style="color:#64748B">(${h.availableBeds} free)</span></td></tr>
            <tr><td style="color:#64748B;padding:2px 0">ICU</td><td style="text-align:right;font-weight:600">${h.icuOccupied}/${h.icuTotal} <span style="color:#64748B">(${h.icuAvailable} free)</span></td></tr>
            <tr><td style="color:#64748B;padding:2px 0">ER Load</td><td style="text-align:right;font-weight:600">${h.erLoad}%</td></tr>
            <tr><td style="color:#64748B;padding:2px 0">Region</td><td style="text-align:right">${h.region}</td></tr>
          </table>
        </div>
      `, { maxWidth: 280 })

      marker.on("click", () => setSelectedHospital(h))
    })
  }, [mapData, mapFilter])

  const cap = resource || {
    totalBeds: 500, occupiedBeds: 380, totalIcuBeds: 60, occupiedIcuBeds: 52,
    emergencyCases: 18, opdCases: 45, totalDoctors: 40, availableDoctors: 28,
    avgWaitTimeMinutes: 34, avgTreatmentTimeMinutes: 82, emergencyPressureScore: 22, bedTurnoverRate: 0.7,
    totalNurses: 80, availableNurses: 55,
  }

  const summary = mapData?.summary || { total: 0, critical: 0, high: 0, moderate: 0, stable: 0 }

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
            <div className="flex items-center justify-center h-64 text-[#64748B] text-sm">Loading predictions...</div>
          ) : (
            <div className="space-y-6">
              {/* ── Capacity Progress Bars ───────────────────── */}
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] mb-1">Current Capacity</h2>
                <p className="text-sm text-[#64748B] mb-4">Real-time hospital load</p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card className="bg-white border-[#E2E8F0] shadow-sm">
                      <CardContent className="p-6 space-y-5">
                        <ProgressBar label="General Beds" value={cap.occupiedBeds} max={cap.totalBeds} icon={Bed} />
                        <ProgressBar label="ICU Beds" value={cap.occupiedIcuBeds} max={cap.totalIcuBeds} icon={Bed} />
                        <ProgressBar label="Emergency Dept" value={cap.emergencyCases} max={Math.round(cap.totalBeds * 0.08)} icon={Siren} />
                        <ProgressBar label="OPD Load" value={cap.opdCases} max={Math.round(cap.totalBeds * 0.15)} icon={Stethoscope} />
                        <ProgressBar label="Avg Wait Time" value={cap.avgWaitTimeMinutes} max={90} unit="min" icon={Clock} />
                      </CardContent>
                    </Card>
                  </div>
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
                          <span className="text-sm font-bold text-[#0F172A]">{triageData.reduce((s, t) => s + t.count, 0)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border-[#E2E8F0] shadow-sm">
                      <CardContent className="p-4 grid grid-cols-2 gap-3">
                        {[
                          { l: "Avg Treatment", v: `${cap.avgTreatmentTimeMinutes}m` },
                          { l: "Bed Turnover", v: cap.bedTurnoverRate?.toFixed(2) || "0.70" },
                          { l: "Doctors Free", v: `${cap.availableDoctors}/${cap.totalDoctors}` },
                          { l: "EP Score", v: cap.emergencyPressureScore?.toFixed(1) || "—" },
                        ].map((s) => (
                          <div key={s.l} className="text-center p-3 bg-[#F8FAFC] rounded-lg">
                            <p className="text-xl font-bold text-[#0F172A]">{s.v}</p>
                            <p className="text-xs text-[#64748B] mt-1">{s.l}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* ── Leaflet Map ──────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
                      <MapPin className="w-5 h-5" /> Delhi NCR Hospital Map
                    </h2>
                    <p className="text-sm text-[#64748B]">{summary.total} hospitals — click markers for details</p>
                  </div>
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { key: "all", label: `All (${summary.total})`, dot: "#0F172A" },
                    { key: "critical", label: `Critical (${summary.critical})`, dot: "#EF4444" },
                    { key: "high", label: `High (${summary.high})`, dot: "#F97316" },
                    { key: "moderate", label: `Moderate (${summary.moderate})`, dot: "#EAB308" },
                    { key: "stable", label: `Stable (${summary.stable})`, dot: "#22C55E" },
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
                      {mapFilter !== f.key && (
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.dot }} />
                      )}
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Map */}
                  <div className="lg:col-span-2">
                    <Card className="bg-white border-[#E2E8F0] shadow-sm overflow-hidden">
                      <div ref={mapRef} className="h-[500px] w-full" />
                    </Card>
                  </div>

                  {/* Legend + selected hospital detail */}
                  <div className="space-y-4">
                    <Card className="bg-white border-[#E2E8F0] shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-[#0F172A]">Legend</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2" style={{ borderColor: cfg.color, backgroundColor: cfg.color + "40" }} />
                            <span className="text-xs text-[#0F172A]">{cfg.label}</span>
                          </div>
                        ))}
                        <p className="text-[10px] text-[#94A3B8] pt-2">Marker size = total bed capacity</p>
                      </CardContent>
                    </Card>

                    {selectedHospital ? (
                      <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4" style={{ borderLeftColor: STATUS_CONFIG[selectedHospital.status]?.color }}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-bold text-[#0F172A] leading-tight">{selectedHospital.name}</h4>
                            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
                              backgroundColor: STATUS_CONFIG[selectedHospital.status]?.fillColor,
                              color: STATUS_CONFIG[selectedHospital.status]?.color,
                            }}>{selectedHospital.utilization}%</span>
                          </div>
                          <p className="text-xs text-[#64748B]">{selectedHospital.region}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { l: "Total Beds", v: selectedHospital.totalBeds },
                              { l: "Available", v: selectedHospital.availableBeds },
                              { l: "ICU Total", v: selectedHospital.icuTotal },
                              { l: "ICU Free", v: selectedHospital.icuAvailable },
                            ].map((s) => (
                              <div key={s.l}>
                                <p className="text-[10px] text-[#64748B] uppercase">{s.l}</p>
                                <p className="text-sm font-bold text-[#0F172A]">{s.v}</p>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-[10px] text-[#64748B] uppercase mb-1">ER Load</p>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${selectedHospital.erLoad >= 85 ? "bg-red-500" : selectedHospital.erLoad >= 65 ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${selectedHospital.erLoad}%` }} />
                              </div>
                              <span className="text-xs font-bold">{selectedHospital.erLoad}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-[#F8FAFC] border-[#E2E8F0] shadow-sm">
                        <CardContent className="py-12 text-center">
                          <MapPin className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                          <p className="text-xs text-[#64748B]">Click a marker on the map to see hospital details</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
