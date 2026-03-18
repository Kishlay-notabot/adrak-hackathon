// frontend/src/pages/admin/Settings.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Bed } from "lucide-react"
import { api, isLoggedIn, getRole, getUser } from "@/lib/api"

const BED_CATEGORIES = ["general", "icu", "emergency", "pediatric", "maternity"]

export default function AdminSettings() {
  const navigate = useNavigate()
  const [hospital, setHospital] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [beds, setBeds] = useState({})
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") {
      navigate("/admin/login")
      return
    }
    fetchHospital()
  }, [])

  const fetchHospital = async () => {
    try {
      const data = await api("/hospital/mine")
      setHospital(data)
      setBeds(data.beds || {})
    } catch {
      setHospital(null)
    } finally {
      setLoading(false)
    }
  }

  const handleBedUpdate = async () => {
    setSaving(true)
    setMessage("")
    try {
      const payload = {}
      for (const cat of BED_CATEGORIES) {
        if (beds[cat]) {
          payload[cat] = {
            total: parseInt(beds[cat].total) || 0,
            available: parseInt(beds[cat].available) || 0,
          }
        }
      }
      await api("/hospital/mine/beds", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setMessage("Bed availability updated!")
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      setMessage("Error: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateBedField = (category, field, value) => {
    setBeds((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }))
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
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                    <Bed className="w-5 h-5" /> Bed Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {message && (
                    <div className={`mb-4 p-3 text-sm rounded-md ${message.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                      {message}
                    </div>
                  )}
                  <div className="space-y-4">
                    {BED_CATEGORIES.map((cat) => (
                      <div key={cat} className="flex items-center gap-4">
                        <span className="w-24 text-sm font-medium text-[#0F172A] capitalize">{cat}</span>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-[#64748B]">Total</Label>
                          <Input
                            type="number"
                            min="0"
                            className="w-20 h-9 border-[#E2E8F0]"
                            value={beds[cat]?.total ?? 0}
                            onChange={(e) => updateBedField(cat, "total", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-[#64748B]">Available</Label>
                          <Input
                            type="number"
                            min="0"
                            className="w-20 h-9 border-[#E2E8F0]"
                            value={beds[cat]?.available ?? 0}
                            onChange={(e) => updateBedField(cat, "available", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleBedUpdate} disabled={saving} className="mt-6 bg-black hover:bg-black/90 text-white">
                    {saving ? "Saving..." : "Update Beds"}
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
