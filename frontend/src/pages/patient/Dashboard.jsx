// frontend/src/pages/patient/Dashboard.jsx
// MODIFIED — added Access Requests section for patient permission system
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Calendar, Stethoscope, Clock, Download, Printer, Shield,
  CheckCircle2, XCircle, Building2, Bell,
} from "lucide-react"
import { api, isLoggedIn, getRole, getUser } from "@/lib/api"
import { QRCodeCanvas, downloadQR, printQR, useQRCodeDataURL } from "@/components/qr-code"

export default function PatientDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessRequests, setAccessRequests] = useState([])
  const [respondingId, setRespondingId] = useState(null)
  const localUser = getUser()

  const qrValue = localUser?.id || ""
  const qrDataUrl = useQRCodeDataURL(qrValue)

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "patient") { navigate("/patient/login"); return }
    fetchProfile()
    fetchAccessRequests()
    // Poll for new requests every 30s
    const interval = setInterval(fetchAccessRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchProfile = async () => {
    try { setProfile(await api("/patient/me")) }
    catch (err) { console.error(err.message) }
    finally { setLoading(false) }
  }

  const fetchAccessRequests = async () => {
    try { setAccessRequests(await api("/access-requests/my")) }
    catch { /* ignore */ }
  }

  const handleRespond = async (id, action) => {
    setRespondingId(id)
    try {
      await api(`/access-requests/${id}/respond`, { method: "PATCH", body: JSON.stringify({ action }) })
      fetchAccessRequests()
    } catch (err) { console.error(err.message) }
    finally { setRespondingId(null) }
  }

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "-"

  const pendingRequests = accessRequests.filter((r) => r.status === "pending")
  const recentResponded = accessRequests.filter((r) => r.status !== "pending").slice(0, 5)

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC]">
        <PatientSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
          <PatientNavbar title="My Dashboard" />
          <main className="flex-1 flex items-center justify-center text-[#64748B]">Loading...</main>
        </div>
      </div>
    )
  }

  const p = profile || {}

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="My Dashboard" />
        <main className="flex-1 overflow-auto p-6">
          {/* Welcome */}
          <Card className="bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-[#E2E8F0] mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mb-1">Welcome back, {p.name || "Patient"}</h2>
                  <p className="text-[#64748B]">{today}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#64748B] mb-1">Patient ID</p>
                  <p className="text-sm font-medium text-[#0F172A]">{p.pid || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Access Request Alerts ──────────────────────── */}
          {pendingRequests.length > 0 && (
            <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4 border-l-blue-500 mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  Data Access Requests
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingRequests.length} pending
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-[#64748B] mb-2">
                  These hospitals are requesting access to your medical records. You control who sees your data.
                </p>
                {pendingRequests.map((req) => (
                  <div key={req._id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{req.hospitalId?.name || "Unknown Hospital"}</p>
                        <p className="text-xs text-[#64748B]">
                          Requested by {req.requestedBy?.name || "Staff"}
                          {req.reason && ` · ${req.reason}`}
                        </p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {new Date(req.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={respondingId === req._id}
                        onClick={() => handleRespond(req._id, "approved")}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {respondingId === req._id ? "..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                        disabled={respondingId === req._id}
                        onClick={() => handleRespond(req._id, "denied")}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#DBEAFE] rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Blood Group</p>
                    <p className="text-lg font-bold text-[#0F172A]">{p.bloodGroup || "-"}</p>
                    <p className="text-sm text-[#64748B]">Age: {p.age || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#DCFCE7] rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Total Visits</p>
                    <p className="text-lg font-bold text-[#0F172A]">{p.recentVisits?.length || 0}</p>
                    <p className="text-sm text-[#64748B] capitalize">{p.gender || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#F1F5F9] rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Member Since</p>
                    <p className="text-lg font-bold text-[#0F172A]">{formatDate(p.createdAt)}</p>
                    <p className="text-sm text-[#64748B]">{p.pid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* QR Code */}
            <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4 border-l-[#2563EB]">
              <CardContent className="p-6 text-center">
                <div className="w-48 h-48 mx-auto bg-[#F8FAFC] rounded-lg p-3 mb-4 flex items-center justify-center">
                  {qrValue ? <QRCodeCanvas value={qrValue} size={168} /> : <p className="text-sm text-[#64748B]">No QR available</p>}
                </div>
                <p className="text-lg font-bold text-[#0F172A] mb-1">{p.name || "-"}</p>
                <p className="text-sm text-[#64748B] mb-6">{p.pid || "-"}</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" className="border-[#E2E8F0] text-[#0F172A]"
                    onClick={() => downloadQR(qrDataUrl, `QR-${p.pid || "patient"}.png`)}>
                    <Download className="w-4 h-4 mr-2" />Download QR
                  </Button>
                  <Button className="bg-black hover:bg-black/90 text-white"
                    onClick={() => printQR(qrDataUrl, p.name, p.pid)}>
                    <Printer className="w-4 h-4 mr-2" />Print QR
                  </Button>
                </div>
                <p className="text-xs text-[#64748B] mt-4">
                  When a hospital scans your QR, they'll need your approval to access your records
                </p>
              </CardContent>
            </Card>

            {/* Profile + Access History */}
            <div className="space-y-4">
              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[#0F172A]">My Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { label: "Full Name", value: p.name },
                      { label: "Age", value: p.age },
                      { label: "Gender", value: p.gender },
                      { label: "Blood Group", value: p.bloodGroup },
                      { label: "Phone", value: p.phone },
                      { label: "Email", value: p.email },
                    ].map((field) => (
                      <div key={field.label}>
                        <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{field.label}</p>
                        <p className="text-sm font-medium text-[#0F172A] capitalize">{field.value || "-"}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent access decisions */}
              {recentResponded.length > 0 && (
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Recent Access Decisions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recentResponded.map((r) => (
                      <div key={r._id} className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-md">
                        <div>
                          <p className="text-xs font-medium text-[#0F172A]">{r.hospitalId?.name}</p>
                          <p className="text-[10px] text-[#64748B]">{new Date(r.respondedAt || r.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          r.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>{r.status}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Recent Visits */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#0F172A]">Recent Visits</CardTitle>
            </CardHeader>
            <CardContent>
              {(!p.recentVisits || p.recentVisits.length === 0) ? (
                <p className="text-sm text-[#64748B] text-center py-8">No visits recorded yet.</p>
              ) : (
                <div className="space-y-6">
                  {p.recentVisits.map((visit, index) => (
                    <div key={visit.id || index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-[#0F172A] rounded-full" />
                        {index < p.recentVisits.length - 1 && <div className="w-0.5 h-full bg-[#E2E8F0] mt-2" />}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-[#0F172A]">{formatDate(visit.admittedAt)}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                            visit.status === "discharged" ? "bg-[#DCFCE7] text-[#16A34A]" :
                            visit.status === "critical" ? "bg-[#FEE2E2] text-[#DC2626]" :
                            "bg-[#FEF3C7] text-[#D97706]"
                          }`}>{visit.status}</span>
                        </div>
                        <p className="text-sm text-[#64748B]">{visit.hospital}</p>
                        {visit.doctor && <p className="text-sm text-[#64748B]">{visit.doctor}</p>}
                        {visit.reason && <p className="text-sm text-[#64748B]">{visit.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
