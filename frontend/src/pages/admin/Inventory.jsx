// frontend/src/pages/admin/Inventory.jsx
// MODIFIED — added Resource Request/Give tab with nearby hospitals sorted by distance
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Bed, Wind, Users, Package, TrendingUp, AlertTriangle, CheckCircle2,
  Loader2, Save, Sparkles, ChevronRight, X, ArrowRightLeft, Send,
  MapPin, Search,
} from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

const BED_CATEGORIES = [
  { key: "general", label: "General", icon: "🛏️" },
  { key: "icu", label: "ICU", icon: "🫀" },
  { key: "emergency", label: "Emergency", icon: "🚨" },
  { key: "pediatric", label: "Pediatric", icon: "👶" },
  { key: "maternity", label: "Maternity", icon: "🤱" },
]

const RESOURCE_TYPES = [
  { value: "beds", label: "Beds" },
  { value: "icu_beds", label: "ICU Beds" },
  { value: "oxygen", label: "Oxygen Tanks" },
  { value: "ventilators", label: "Ventilators" },
  { value: "blood", label: "Blood Bottles" },
  { value: "staff", label: "Staff" },
]

const URGENCY_COLORS = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
}

function UsageBar({ used, total, label }) {
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

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Inventory() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("inventory") // inventory | requests
  const [hospital, setHospital] = useState(null)
  const [resource, setResource] = useState(null)
  const [beds, setBeds] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  // Prediction
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState(null)

  // Resource requests
  const [nearbyHospitals, setNearbyHospitals] = useState([])
  const [hospitalSearch, setHospitalSearch] = useState("")
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [reqLoading, setReqLoading] = useState(false)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [reqForm, setReqForm] = useState({
    toHospitalId: "", type: "request", resourceType: "beds", quantity: 1, urgency: "high", message: "",
  })
  const [reqSending, setReqSending] = useState(false)
  const [reqError, setReqError] = useState("")

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") { navigate("/admin/login"); return }
    fetchAll()
  }, [])

  useEffect(() => {
    if (tab === "requests") fetchRequests()
  }, [tab])

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
    } catch (err) { console.error(err.message) }
    finally { setLoading(false) }
  }

  const fetchRequests = async () => {
    setReqLoading(true)
    try {
      const [inc, out, nearby] = await Promise.all([
        api("/resource-requests/incoming").catch(() => []),
        api("/resource-requests/outgoing").catch(() => []),
        api("/resource-requests/nearby-hospitals").catch(() => []),
      ])
      setIncoming(inc)
      setOutgoing(out)
      setNearbyHospitals(nearby)
    } catch (err) { console.error(err.message) }
    finally { setReqLoading(false) }
  }

  const updateBedField = (cat, field, val) => {
    setBeds((prev) => ({ ...prev, [cat]: { ...prev[cat], [field]: val } }))
  }

  const handleSave = async () => {
    setSaving(true); setMessage("")
    try {
      const payload = {}
      for (const c of BED_CATEGORIES) {
        if (beds[c.key]) payload[c.key] = { total: parseInt(beds[c.key].total) || 0, available: parseInt(beds[c.key].available) || 0 }
      }
      await api("/hospital/mine/beds", { method: "PATCH", body: JSON.stringify(payload) })
      setMessage("Inventory updated!")
      setTimeout(() => setMessage(""), 3000)
    } catch (err) { setMessage("Error: " + err.message) }
    finally { setSaving(false) }
  }

  const handlePredict = async () => {
    setPredicting(true); setPrediction(null)
    try {
      const surge = await api("/surge/intelligence").catch(() => null)
      const surgeScore = surge?.surgeScore || 30
      const level = surge?.surgeLevel || "low"
      const multiplier = surgeScore >= 80 ? 1.4 : surgeScore >= 50 ? 1.2 : 1.05
      const predictions = BED_CATEGORIES.map((cat) => {
        const total = parseInt(beds[cat.key]?.total) || 0
        const avail = parseInt(beds[cat.key]?.available) || 0
        const occupied = total - avail
        const predicted = Math.round(occupied * multiplier)
        const deficit = Math.max(0, predicted - total)
        return { ...cat, total, available: avail, occupied, predictedOccupied: Math.min(predicted, total + deficit), deficit, risk: deficit > 0 ? "critical" : predicted / total > 0.85 ? "high" : predicted / total > 0.65 ? "moderate" : "low" }
      })
      setPrediction({ surgeLevel: level, surgeScore, beds: predictions, recommendations: surge?.predictions?.recommendations || [] })
    } catch (err) { console.error(err.message) }
    finally { setPredicting(false) }
  }

  const handleSendRequest = async (e) => {
    e.preventDefault(); setReqError(""); setReqSending(true)
    try {
      await api("/resource-requests", { method: "POST", body: JSON.stringify(reqForm) })
      setShowNewRequest(false)
      setReqForm({ toHospitalId: "", type: "request", resourceType: "beds", quantity: 1, urgency: "high", message: "" })
      fetchRequests()
    } catch (err) { setReqError(err.message) }
    finally { setReqSending(false) }
  }

  const handleRespond = async (id, action) => {
    try {
      await api(`/resource-requests/${id}/respond`, { method: "PATCH", body: JSON.stringify({ action }) })
      fetchRequests()
    } catch (err) { console.error(err.message) }
  }

  const handleCancel = async (id) => {
    try {
      await api(`/resource-requests/${id}/cancel`, { method: "PATCH" })
      fetchRequests()
    } catch (err) { console.error(err.message) }
  }

  const filteredNearby = hospitalSearch
    ? nearbyHospitals.filter((h) => h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) || h.address?.city?.toLowerCase().includes(hospitalSearch.toLowerCase()))
    : nearbyHospitals

  const RISK_STYLE = { critical: "bg-red-100 text-red-700 border-red-200", high: "bg-orange-100 text-orange-700 border-orange-200", moderate: "bg-amber-100 text-amber-700 border-amber-200", low: "bg-emerald-100 text-emerald-700 border-emerald-200" }

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

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Inventory" />
        <main className="flex-1 overflow-auto p-6">
          {/* Tab switcher */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-lg">
              <button onClick={() => setTab("inventory")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === "inventory" ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>
                <Package className="w-4 h-4 inline mr-2" />Inventory
              </button>
              <button onClick={() => setTab("requests")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === "requests" ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>
                <ArrowRightLeft className="w-4 h-4 inline mr-2" />Request &amp; Give
              </button>
            </div>
            {tab === "inventory" && (
              <Button onClick={handlePredict} disabled={predicting} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                {predicting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {predicting ? "Predicting..." : "Predict Demand"}
              </Button>
            )}
            {tab === "requests" && (
              <Button onClick={() => setShowNewRequest(true)} className="bg-black hover:bg-black/90 text-white">
                <Send className="w-4 h-4 mr-2" /> New Request
              </Button>
            )}
          </div>

          {/* ── INVENTORY TAB ──────────────────────────────── */}
          {tab === "inventory" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="bg-white border-[#E2E8F0] shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2"><Bed className="w-5 h-5" /> Bed Inventory</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {message && <div className={`mb-4 p-3 text-sm rounded-md ${message.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>{message}</div>}
                      <div className="space-y-4">
                        {BED_CATEGORIES.map((cat) => {
                          const total = parseInt(beds[cat.key]?.total) || 0
                          const avail = parseInt(beds[cat.key]?.available) || 0
                          const pct = total > 0 ? Math.round(((total - avail) / total) * 100) : 0
                          return (
                            <div key={cat.key} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2"><span className="text-lg">{cat.icon}</span><span className="text-sm font-semibold text-[#0F172A]">{cat.label}</span></div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${pct >= 85 ? "bg-red-100 text-red-700" : pct >= 65 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{pct}% occupied</span>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1"><Label className="text-xs text-[#64748B]">Total</Label><Input type="number" min="0" className="h-9 border-[#E2E8F0]" value={beds[cat.key]?.total ?? 0} onChange={(e) => updateBedField(cat.key, "total", e.target.value)} /></div>
                                <div className="space-y-1"><Label className="text-xs text-[#64748B]">Available</Label><Input type="number" min="0" className="h-9 border-[#E2E8F0]" value={beds[cat.key]?.available ?? 0} onChange={(e) => updateBedField(cat.key, "available", e.target.value)} /></div>
                                <div className="space-y-1"><Label className="text-xs text-[#64748B]">Occupied</Label><div className="h-9 flex items-center px-3 bg-[#E2E8F0]/50 rounded-md text-sm font-medium">{total - avail}</div></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <Button onClick={handleSave} disabled={saving} className="mt-4 bg-black hover:bg-black/90 text-white"><Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Changes"}</Button>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4">
                  <Card className="bg-white border-[#E2E8F0] shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2"><Wind className="w-5 h-5" /> Equipment</CardTitle></CardHeader><CardContent className="space-y-4"><UsageBar label="Ventilators" used={resource?.ventilatorsInUse || 0} total={resource?.ventilatorsTotal || 0} /><UsageBar label="Oxygen Units" used={resource?.oxygenUnitsInUse || 0} total={resource?.oxygenUnitsTotal || 0} /></CardContent></Card>
                  <Card className="bg-white border-[#E2E8F0] shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2"><Users className="w-5 h-5" /> Staff</CardTitle></CardHeader><CardContent className="space-y-4"><UsageBar label="Doctors" used={(resource?.totalDoctors || 0) - (resource?.availableDoctors || 0)} total={resource?.totalDoctors || 0} /><UsageBar label="Nurses" used={(resource?.totalNurses || 0) - (resource?.availableNurses || 0)} total={resource?.totalNurses || 0} /></CardContent></Card>
                  <Card className="bg-[#0F172A] border-none shadow-sm text-white"><CardContent className="p-5"><p className="text-xs text-white/60 uppercase tracking-wider mb-2">Total Capacity</p><div className="grid grid-cols-2 gap-3"><div><p className="text-2xl font-bold">{BED_CATEGORIES.reduce((s, c) => s + (parseInt(beds[c.key]?.total) || 0), 0)}</p><p className="text-xs text-white/60">Total Beds</p></div><div><p className="text-2xl font-bold">{BED_CATEGORIES.reduce((s, c) => s + (parseInt(beds[c.key]?.available) || 0), 0)}</p><p className="text-xs text-white/60">Available</p></div></div></CardContent></Card>
                </div>
              </div>
              {/* Prediction results */}
              {prediction && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> Demand Prediction</h3>
                    <button onClick={() => setPrediction(null)} className="text-[#64748B] hover:text-[#0F172A]"><X className="w-5 h-5" /></button>
                  </div>
                  <Card className="bg-white border-[#E2E8F0] shadow-sm"><CardContent className="p-5 space-y-3">
                    {prediction.beds.map((b) => (
                      <div key={b.key} className="flex items-center gap-4 p-3 bg-[#F8FAFC] rounded-lg">
                        <span className="text-lg w-6">{b.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[#0F172A]">{b.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#64748B]">Now: {b.occupied}/{b.total}</span>
                              <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                              <span className="text-xs font-bold">Predicted: {b.predictedOccupied}/{b.total}</span>
                              {b.deficit > 0 && <span className="text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" />-{b.deficit}</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${RISK_STYLE[b.risk]}`}>{b.risk}</span>
                      </div>
                    ))}
                  </CardContent></Card>
                </div>
              )}
            </>
          )}

          {/* ── REQUEST & GIVE TAB ─────────────────────────── */}
          {tab === "requests" && (
            <div className="space-y-6">
              {/* New Request Form */}
              {showNewRequest && (
                <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4 border-l-blue-500">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-[#0F172A]">New Resource Request / Offer</h3>
                      <button onClick={() => setShowNewRequest(false)} className="text-[#64748B]"><X className="w-5 h-5" /></button>
                    </div>
                    {reqError && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{reqError}</div>}
                    <form onSubmit={handleSendRequest} className="space-y-4">
                      <div>
                        <Label className="text-sm text-[#0F172A] mb-2 block">Select Hospital (nearest first)</Label>
                        <div className="relative mb-2">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
                          <Input placeholder="Search hospitals..." value={hospitalSearch} onChange={(e) => setHospitalSearch(e.target.value)} className="h-9 pl-9 border-[#E2E8F0]" />
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-[#E2E8F0] rounded-lg">
                          {filteredNearby.length === 0 ? (
                            <p className="text-xs text-[#64748B] text-center py-4">No hospitals found</p>
                          ) : filteredNearby.map((h) => (
                            <button type="button" key={h._id} onClick={() => setReqForm({ ...reqForm, toHospitalId: h._id })}
                              className={`w-full text-left px-3 py-2 text-sm border-b border-[#F1F5F9] last:border-0 transition-colors ${
                                reqForm.toHospitalId === h._id ? "bg-blue-50 text-blue-700" : "hover:bg-[#F8FAFC]"
                              }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-[#0F172A]">{h.name}</p>
                                  <p className="text-xs text-[#64748B]"><MapPin className="w-3 h-3 inline mr-1" />{[h.address?.city, h.address?.state].filter(Boolean).join(", ")}</p>
                                </div>
                                {reqForm.toHospitalId === h._id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <select value={reqForm.type} onChange={(e) => setReqForm({ ...reqForm, type: e.target.value })} className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
                            <option value="request">Request (I need)</option>
                            <option value="offer">Offer (I can give)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Resource</Label>
                          <select value={reqForm.resourceType} onChange={(e) => setReqForm({ ...reqForm, resourceType: e.target.value })} className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
                            {RESOURCE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input type="number" min="1" value={reqForm.quantity} onChange={(e) => setReqForm({ ...reqForm, quantity: e.target.value })} className="h-9 border-[#E2E8F0]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Urgency</Label>
                          <select value={reqForm.urgency} onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })} className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Message (optional)</Label>
                        <Input placeholder="Additional details..." value={reqForm.message} onChange={(e) => setReqForm({ ...reqForm, message: e.target.value })} className="h-9 border-[#E2E8F0]" />
                      </div>
                      <Button type="submit" disabled={reqSending || !reqForm.toHospitalId} className="w-full bg-black hover:bg-black/90 text-white">
                        {reqSending ? "Sending..." : reqForm.type === "request" ? "Send Request" : "Send Offer"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {reqLoading ? (
                <div className="text-center py-12 text-[#64748B] text-sm">Loading requests...</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Incoming */}
                  <Card className="bg-white border-[#E2E8F0] shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-[#0F172A]">Incoming Requests ({incoming.filter((r) => r.status === "pending").length} pending)</CardTitle></CardHeader>
                    <CardContent>
                      {incoming.length === 0 ? (
                        <p className="text-sm text-[#64748B] text-center py-8">No incoming requests</p>
                      ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                          {incoming.map((r) => (
                            <div key={r._id} className={`p-3 rounded-lg border ${r.status === "pending" ? "bg-blue-50/50 border-blue-200" : "bg-[#F8FAFC] border-[#E2E8F0]"}`}>
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium text-[#0F172A]">{r.fromHospitalId?.name}</p>
                                  <p className="text-xs text-[#64748B]">{r.requestedBy?.name} · {timeAgo(r.createdAt)}</p>
                                </div>
                                <div className="flex gap-1">
                                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${r.type === "request" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{r.type}</span>
                                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${URGENCY_COLORS[r.urgency]}`}>{r.urgency}</span>
                                </div>
                              </div>
                              <p className="text-sm text-[#0F172A] mb-1">{r.type === "request" ? "Needs" : "Offering"}: <strong>{r.quantity} {RESOURCE_TYPES.find((t) => t.value === r.resourceType)?.label || r.resourceType}</strong></p>
                              {r.message && <p className="text-xs text-[#64748B] mb-2">{r.message}</p>}
                              {r.status === "pending" ? (
                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleRespond(r._id, "accepted")}>Accept</Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600" onClick={() => handleRespond(r._id, "declined")}>Decline</Button>
                                </div>
                              ) : (
                                <span className={`text-xs font-medium capitalize ${r.status === "accepted" ? "text-emerald-600" : "text-red-600"}`}>{r.status}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Outgoing */}
                  <Card className="bg-white border-[#E2E8F0] shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-[#0F172A]">Outgoing Requests ({outgoing.filter((r) => r.status === "pending").length} pending)</CardTitle></CardHeader>
                    <CardContent>
                      {outgoing.length === 0 ? (
                        <p className="text-sm text-[#64748B] text-center py-8">No outgoing requests</p>
                      ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                          {outgoing.map((r) => (
                            <div key={r._id} className="p-3 rounded-lg border bg-[#F8FAFC] border-[#E2E8F0]">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium text-[#0F172A]">To: {r.toHospitalId?.name}</p>
                                  <p className="text-xs text-[#64748B]">{timeAgo(r.createdAt)}</p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  r.status === "pending" ? "bg-yellow-100 text-yellow-700" : r.status === "accepted" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}>{r.status}</span>
                              </div>
                              <p className="text-sm text-[#0F172A]">{r.type === "request" ? "Requested" : "Offered"}: <strong>{r.quantity} {RESOURCE_TYPES.find((t) => t.value === r.resourceType)?.label || r.resourceType}</strong></p>
                              {r.status === "pending" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs mt-2 border-[#E2E8F0]" onClick={() => handleCancel(r._id)}>Cancel</Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
