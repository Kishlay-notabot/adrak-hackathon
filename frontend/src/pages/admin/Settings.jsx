// frontend/src/pages/admin/Settings.jsx
// MODIFIED — added staff count editing section
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Bed, Users, Save } from "lucide-react"
import { api, isLoggedIn, getRole, getUser } from "@/lib/api"

const BED_CATEGORIES = ["general", "icu", "emergency", "pediatric", "maternity"]

export default function AdminSettings() {
  const navigate = useNavigate()
  const [hospital, setHospital] = useState(null)
  const [loading, setLoading] = useState(true)

  // Beds
  const [beds, setBeds] = useState({})
  const [savingBeds, setSavingBeds] = useState(false)
  const [bedMessage, setBedMessage] = useState("")

  // Staff
  const [staff, setStaff] = useState({ totalDoctors: 0, availableDoctors: 0, totalNurses: 0, availableNurses: 0 })
  const [savingStaff, setSavingStaff] = useState(false)
  const [staffMessage, setStaffMessage] = useState("")

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") { navigate("/admin/login"); return }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [hosp, staffData] = await Promise.all([
        api("/hospital/mine").catch(() => null),
        api("/hospital/mine/staff").catch(() => ({ totalDoctors: 0, availableDoctors: 0, totalNurses: 0, availableNurses: 0 })),
      ])
      setHospital(hosp)
      setBeds(hosp?.beds || {})
      setStaff(staffData)
    } catch { setHospital(null) }
    finally { setLoading(false) }
  }

  // ── Bed handlers ──────────────────────────────────────────────
  const updateBedField = (category, field, value) => {
    setBeds((prev) => ({ ...prev, [category]: { ...prev[category], [field]: value } }))
  }

  const handleBedUpdate = async () => {
    setSavingBeds(true); setBedMessage("")
    try {
      const payload = {}
      for (const cat of BED_CATEGORIES) {
        if (beds[cat]) {
          payload[cat] = { total: parseInt(beds[cat].total) || 0, available: parseInt(beds[cat].available) || 0 }
        }
      }
      await api("/hospital/mine/beds", { method: "PATCH", body: JSON.stringify(payload) })
      setBedMessage("Bed availability updated!")
      setTimeout(() => setBedMessage(""), 3000)
    } catch (err) { setBedMessage("Error: " + err.message) }
    finally { setSavingBeds(false) }
  }

  // ── Staff handlers ────────────────────────────────────────────
  const updateStaffField = (field, value) => {
    setStaff((prev) => ({ ...prev, [field]: value }))
  }

  const handleStaffUpdate = async () => {
    setSavingStaff(true); setStaffMessage("")
    try {
      await api("/hospital/mine/staff", {
        method: "PATCH",
        body: JSON.stringify({
          totalDoctors: parseInt(staff.totalDoctors) || 0,
          availableDoctors: parseInt(staff.availableDoctors) || 0,
          totalNurses: parseInt(staff.totalNurses) || 0,
          availableNurses: parseInt(staff.availableNurses) || 0,
        }),
      })
      setStaffMessage("Staff counts updated!")
      setTimeout(() => setStaffMessage(""), 3000)
    } catch (err) { setStaffMessage("Error: " + err.message) }
    finally { setSavingStaff(false) }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC]">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
          <AdminNavbar title="Settings" />
          <main className="flex-1 flex items-center justify-center text-[#64748B]">Loading...</main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Settings" />
        <main className="flex-1 overflow-auto p-6">
          {!hospital ? (
            <Card className="bg-white border-[#E2E8F0] shadow-sm max-w-lg mx-auto">
              <CardContent className="flex flex-col items-center py-16">
                <Building2 className="w-12 h-12 text-[#64748B] mb-4" />
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No Hospital Linked</h3>
                <p className="text-sm text-[#64748B] mb-6 text-center">
                  You need to create or join a hospital before managing settings.
                </p>
                <Button onClick={() => navigate("/admin/hospital-setup")} className="bg-black hover:bg-black/90 text-white">
                  Setup Hospital
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Hospital Info */}
              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                    <Building2 className="w-5 h-5" /> Hospital Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Name</p>
                      <p className="text-sm font-medium text-[#0F172A]">{hospital.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Phone</p>
                      <p className="text-sm font-medium text-[#0F172A]">{hospital.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Registration #</p>
                      <p className="text-sm font-medium text-[#0F172A]">{hospital.registrationNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Address</p>
                      <p className="text-sm font-medium text-[#0F172A]">
                        {[hospital.address?.street, hospital.address?.city, hospital.address?.state, hospital.address?.pincode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Hospital ID</p>
                      <p className="text-xs font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded inline-block">
                        {hospital._id}
                      </p>
                      <p className="text-[10px] text-[#94A3B8] mt-1">Share this ID with other admins to join</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bed Availability */}
              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                    <Bed className="w-5 h-5" /> Bed Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bedMessage && (
                    <div className={`mb-4 p-3 text-sm rounded-md ${bedMessage.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                      {bedMessage}
                    </div>
                  )}
                  <div className="space-y-4">
                    {BED_CATEGORIES.map((cat) => (
                      <div key={cat} className="flex items-center gap-4">
                        <span className="w-24 text-sm font-medium text-[#0F172A] capitalize">{cat}</span>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-[#64748B]">Total</Label>
                          <Input type="number" min="0" className="w-20 h-9 border-[#E2E8F0]"
                            value={beds[cat]?.total ?? 0}
                            onChange={(e) => updateBedField(cat, "total", e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-[#64748B]">Available</Label>
                          <Input type="number" min="0" className="w-20 h-9 border-[#E2E8F0]"
                            value={beds[cat]?.available ?? 0}
                            onChange={(e) => updateBedField(cat, "available", e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleBedUpdate} disabled={savingBeds} className="mt-6 bg-black hover:bg-black/90 text-white">
                    <Save className="w-4 h-4 mr-2" />{savingBeds ? "Saving..." : "Update Beds"}
                  </Button>
                </CardContent>
              </Card>

              {/* Staff Counts — NEW */}
              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                    <Users className="w-5 h-5" /> Staff Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {staffMessage && (
                    <div className={`mb-4 p-3 text-sm rounded-md ${staffMessage.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                      {staffMessage}
                    </div>
                  )}
                  <p className="text-xs text-[#64748B] mb-4">
                    Set your hospital's current staff numbers. These appear in resource dashboards and capacity calculations.
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-3">
                      <p className="text-sm font-semibold text-[#0F172A]">Doctors</p>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-[#64748B]">Total Doctors</Label>
                          <Input type="number" min="0" className="h-9 border-[#E2E8F0] mt-1"
                            value={staff.totalDoctors}
                            onChange={(e) => updateStaffField("totalDoctors", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs text-[#64748B]">Available (on-duty)</Label>
                          <Input type="number" min="0" className="h-9 border-[#E2E8F0] mt-1"
                            value={staff.availableDoctors}
                            onChange={(e) => updateStaffField("availableDoctors", e.target.value)} />
                        </div>
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {parseInt(staff.totalDoctors) > 0 && (
                          <span className={parseInt(staff.availableDoctors) / parseInt(staff.totalDoctors) < 0.3 ? "text-red-600 font-medium" : ""}>
                            {Math.round((parseInt(staff.availableDoctors || 0) / parseInt(staff.totalDoctors)) * 100)}% available
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-3">
                      <p className="text-sm font-semibold text-[#0F172A]">Nurses</p>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-[#64748B]">Total Nurses</Label>
                          <Input type="number" min="0" className="h-9 border-[#E2E8F0] mt-1"
                            value={staff.totalNurses}
                            onChange={(e) => updateStaffField("totalNurses", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs text-[#64748B]">Available (on-duty)</Label>
                          <Input type="number" min="0" className="h-9 border-[#E2E8F0] mt-1"
                            value={staff.availableNurses}
                            onChange={(e) => updateStaffField("availableNurses", e.target.value)} />
                        </div>
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {parseInt(staff.totalNurses) > 0 && (
                          <span className={parseInt(staff.availableNurses) / parseInt(staff.totalNurses) < 0.3 ? "text-red-600 font-medium" : ""}>
                            {Math.round((parseInt(staff.availableNurses || 0) / parseInt(staff.totalNurses)) * 100)}% available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleStaffUpdate} disabled={savingStaff} className="mt-6 bg-black hover:bg-black/90 text-white">
                    <Save className="w-4 h-4 mr-2" />{savingStaff ? "Saving..." : "Update Staff"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
