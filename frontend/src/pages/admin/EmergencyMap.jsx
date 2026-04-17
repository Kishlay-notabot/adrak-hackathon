// frontend/src/pages/admin/EmergencyMap.jsx
// NEW — real-time hospital map for emergency routing decisions
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MapPin, Bed, Siren, Search, RefreshCw, AlertTriangle,
  CheckCircle2, Phone, Navigation, Activity, X,
} from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const STATUS_CONFIG = {
  critical: { color: "#EF4444", fill: "#FEE2E2", label: "Critical ≥80%", ring: "ring-red-400" },
  high:     { color: "#F97316", fill: "#FED7AA", label: "High 65-79%",   ring: "ring-orange-400" },
  moderate: { color: "#EAB308", fill: "#FEF3C7", label: "Moderate 45-64%", ring: "ring-yellow-400" },
  stable:   { color: "#22C55E", fill: "#DCFCE7", label: "Stable <45%",   ring: "ring-green-400" },
}

const STATUS_BADGE = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  moderate: "bg-amber-100 text-amber-700 border-amber-200",
  stable: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

export default function EmergencyMap() {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])

  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") { navigate("/admin/login"); return }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const data = await api("/surge/hospital-map")
      setMapData(data)
    } catch (err) { console.error(err.message) }
    finally { setLoading(false); setRefreshing(false) }
  }

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || loading) return
    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView([28.55, 77.15], 11)

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 18,
    }).addTo(map)

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [loading])

  // Update markers
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !mapData?.hospitals) return

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    let hospitals = mapData.hospitals
    if (filter !== "all") hospitals = hospitals.filter((h) => h.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      hospitals = hospitals.filter((h) =>
        h.name.toLowerCase().includes(q) || h.region.toLowerCase().includes(q)
      )
    }

    hospitals.forEach((h) => {
      const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.stable

      // Create a pulsing marker for critical hospitals
      const isCritical = h.status === "critical"
      const markerSize = Math.max(8, Math.min(16, h.totalBeds / 100))

      const marker = L.circleMarker([h.lat, h.lng], {
        radius: markerSize,
        color: cfg.color,
        fillColor: cfg.color,
        fillOpacity: isCritical ? 0.9 : 0.7,
        weight: isCritical ? 3 : 2,
      }).addTo(map)

      // Rich popup
      marker.bindPopup(`
        <div style="min-width:220px;font-family:system-ui;padding:4px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:${cfg.color}"></div>
            <h3 style="margin:0;font-size:14px;font-weight:700">${h.name}</h3>
          </div>
          <div style="display:inline-block;background:${cfg.fill};color:${cfg.color};font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-bottom:10px">
            ${h.utilization}% utilized · ${h.status.toUpperCase()}
          </div>
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748B;padding:4px 0">🛏️ Beds</td>
              <td style="text-align:right;font-weight:600">${h.occupiedBeds}/${h.totalBeds} <span style="color:#16a34a">(${h.availableBeds} free)</span></td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748B;padding:4px 0">🫀 ICU</td>
              <td style="text-align:right;font-weight:600">${h.icuOccupied}/${h.icuTotal} <span style="color:#16a34a">(${h.icuAvailable} free)</span></td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748B;padding:4px 0">🚨 ER Load</td>
              <td style="text-align:right;font-weight:600">${h.erLoad}%</td>
            </tr>
            <tr>
              <td style="color:#64748B;padding:4px 0">📍 Region</td>
              <td style="text-align:right">${h.region}</td>
            </tr>
          </table>
        </div>
      `, { maxWidth: 300 })

      marker.on("click", () => setSelected(h))
      marker.on("mouseover", () => marker.openPopup())

      markersRef.current.push(marker)
    })
  }, [mapData, filter, search])

  const handleRefresh = () => { setRefreshing(true); fetchData() }

  const focusHospital = (h) => {
    setSelected(h)
    if (mapInstance.current) {
      mapInstance.current.setView([h.lat, h.lng], 14)
    }
  }

  const summary = mapData?.summary || { total: 0, critical: 0, high: 0, moderate: 0, stable: 0 }

  // Sort hospitals: critical first, then by available beds desc
  const sortedHospitals = mapData?.hospitals
    ? [...mapData.hospitals]
        .filter((h) => filter === "all" || h.status === filter)
        .filter((h) => !search.trim() || h.name.toLowerCase().includes(search.toLowerCase()) || h.region.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          const order = { critical: 0, high: 1, moderate: 2, stable: 3 }
          if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
          return b.availableBeds - a.availableBeds
        })
    : []

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC]">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
          <AdminNavbar title="Emergency Map" />
          <main className="flex-1 flex items-center justify-center text-[#64748B]">Loading map data...</main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Emergency Routing Map" />
        <main className="flex-1 overflow-hidden p-4">
          <div className="h-full flex gap-4">
            {/* ── MAP (left 2/3) ──────────────────────────────── */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2 text-[#64748B]" />
                    <Input
                      placeholder="Search hospital or region..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 pl-8 w-56 border-[#E2E8F0] text-sm"
                    />
                  </div>
                  <div className="flex gap-1">
                    {[
                      { key: "all", label: "All", count: summary.total },
                      { key: "critical", label: "Critical", count: summary.critical },
                      { key: "high", label: "High", count: summary.high },
                      { key: "moderate", label: "Moderate", count: summary.moderate },
                      { key: "stable", label: "Stable", count: summary.stable },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          filter === f.key
                            ? "bg-[#0F172A] text-white"
                            : "bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"
                        }`}
                      >
                        {f.key !== "all" && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[f.key]?.color }} />
                        )}
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs border-[#E2E8F0]" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Map container */}
              <div className="flex-1 rounded-xl overflow-hidden border border-[#E2E8F0] shadow-sm">
                <div ref={mapRef} className="h-full w-full" />
              </div>

              {/* Summary strip */}
              <div className="flex items-center gap-4 px-3 py-2 bg-white rounded-lg border border-[#E2E8F0] text-xs">
                <span className="text-[#64748B]">{summary.total} hospitals tracked</span>
                <span className="w-px h-4 bg-[#E2E8F0]" />
                {summary.critical > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> {summary.critical} critical
                  </span>
                )}
                <span className="flex items-center gap-1 text-orange-600">{summary.high} high load</span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {summary.stable} stable
                </span>
                <span className="flex-1" />
                <span className="text-[#94A3B8]">Delhi NCR Region</span>
              </div>
            </div>

            {/* ── SIDE PANEL (right 1/3) ──────────────────────── */}
            <div className="w-80 flex flex-col gap-3 shrink-0">
              {/* Selected hospital detail */}
              {selected ? (
                <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4 shrink-0" style={{ borderLeftColor: STATUS_CONFIG[selected.status]?.color }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A] leading-tight">{selected.name}</h3>
                        <p className="text-xs text-[#64748B]">{selected.region}</p>
                      </div>
                      <button onClick={() => setSelected(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_BADGE[selected.status]} mb-3`}>
                      <Activity className="w-3 h-3" /> {selected.utilization}% utilized · {selected.status}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-2 bg-[#F8FAFC] rounded-md text-center">
                        <p className="text-lg font-bold text-[#0F172A]">{selected.availableBeds}</p>
                        <p className="text-[10px] text-[#64748B]">Beds Free</p>
                      </div>
                      <div className="p-2 bg-[#F8FAFC] rounded-md text-center">
                        <p className="text-lg font-bold text-[#0F172A]">{selected.icuAvailable}</p>
                        <p className="text-[10px] text-[#64748B]">ICU Free</p>
                      </div>
                      <div className="p-2 bg-[#F8FAFC] rounded-md text-center">
                        <p className="text-lg font-bold text-[#0F172A]">{selected.erLoad}%</p>
                        <p className="text-[10px] text-[#64748B]">ER Load</p>
                      </div>
                      <div className="p-2 bg-[#F8FAFC] rounded-md text-center">
                        <p className="text-lg font-bold text-[#0F172A]">{selected.totalBeds}</p>
                        <p className="text-[10px] text-[#64748B]">Total Beds</p>
                      </div>
                    </div>

                    {/* Bed occupancy bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-[#64748B] mb-1">
                        <span>Bed Occupancy</span>
                        <span>{selected.occupiedBeds}/{selected.totalBeds}</span>
                      </div>
                      <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${selected.utilization}%`,
                            backgroundColor: STATUS_CONFIG[selected.status]?.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-[#64748B] mb-1">
                        <span>ICU Occupancy</span>
                        <span>{selected.icuOccupied}/{selected.icuTotal}</span>
                      </div>
                      <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${selected.icuTotal > 0 ? Math.round((selected.icuOccupied / selected.icuTotal) * 100) : 0}%`,
                            backgroundColor: STATUS_CONFIG[selected.status]?.color,
                          }}
                        />
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[#0F172A] text-white text-xs font-medium rounded-lg hover:bg-[#1E293B] transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Get Directions
                    </a>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-[#F8FAFC] border-[#E2E8F0] shadow-sm shrink-0">
                  <CardContent className="py-8 text-center">
                    <MapPin className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                    <p className="text-xs text-[#64748B]">Click a hospital marker on the map for details</p>
                  </CardContent>
                </Card>
              )}

              {/* Hospital list */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Hospitals ({sortedHospitals.length})
                </h3>
                <span className="text-[10px] text-[#94A3B8]">Sorted by urgency</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
                {sortedHospitals.map((h) => {
                  const cfg = STATUS_CONFIG[h.status]
                  const isSelected = selected?.name === h.name
                  return (
                    <button
                      key={h.name}
                      onClick={() => focusHospital(h)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-[#0F172A] text-white border-[#0F172A]"
                          : "bg-white border-[#E2E8F0] hover:border-[#94A3B8]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                          <span className="text-xs font-medium truncate">{h.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${isSelected ? "text-white/80" : ""}`}>
                          {h.utilization}%
                        </span>
                      </div>
                      <div className={`flex items-center gap-3 text-[10px] ${isSelected ? "text-white/70" : "text-[#64748B]"}`}>
                        <span>🛏️ {h.availableBeds} free</span>
                        <span>🫀 {h.icuAvailable} ICU</span>
                        <span>🚨 {h.erLoad}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between px-2 py-2 bg-white rounded-lg border border-[#E2E8F0] text-[10px] shrink-0">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                    <span className="text-[#64748B] capitalize">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
