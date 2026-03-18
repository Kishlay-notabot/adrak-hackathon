// frontend/src/pages/patient/Dashboard.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Stethoscope, Clock, Download, Printer } from "lucide-react"
import { api, isLoggedIn, getRole, getUser } from "@/lib/api"
import { QRCodeCanvas, downloadQR, printQR, useQRCodeDataURL } from "@/components/qr-code"

export default function PatientDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const localUser = getUser()

  const qrValue = localUser?.id || ""
  const qrDataUrl = useQRCodeDataURL(qrValue)

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "patient") {
      navigate("/patient/login")
      return
    }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await api("/patient/me")
      setProfile(data)
    } catch (err) {
      console.error("Failed to load profile:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })
  }

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
            <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4 border-l-[#2563EB]">
              <CardContent className="p-6 text-center">
                <div className="w-48 h-48 mx-auto bg-[#F8FAFC] rounded-lg p-3 mb-4 flex items-center justify-center">
                  {qrValue ? (
                    <QRCodeCanvas value={qrValue} size={168} />
                  ) : (
                    <p className="text-sm text-[#64748B]">No QR available</p>
                  )}
                </div>
                <p className="text-lg font-bold text-[#0F172A] mb-1">{p.name || "-"}</p>
                <p className="text-sm text-[#64748B] mb-6">{p.pid || "-"}</p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    className="border-[#E2E8F0] text-[#0F172A]"
                    onClick={() => downloadQR(qrDataUrl, `QR-${p.pid || "patient"}.png`)}
                  >
                    <Download className="w-4 h-4 mr-2" />Download QR
                  </Button>
                  <Button
                    className="bg-black hover:bg-black/90 text-white"
                    onClick={() => printQR(qrDataUrl, p.name, p.pid)}
                  >
                    <Printer className="w-4 h-4 mr-2" />Print QR
                  </Button>
                </div>
                <p className="text-xs text-[#64748B] mt-4">
                  Show this QR to hospital staff for instant access to your records
                </p>
              </CardContent>
            </Card>

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
                    { label: "Allergies", value: p.allergies?.join(", ") || "None listed" },
                    { label: "Medical Conditions", value: p.medicalConditions?.join(", ") || "None listed" },
                  ].map((field) => (
                    <div key={field.label}>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{field.label}</p>
                      <p className="text-sm font-medium text-[#0F172A] capitalize">{field.value || "-"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

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
                          }`}>
                            {visit.status}
                          </span>
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