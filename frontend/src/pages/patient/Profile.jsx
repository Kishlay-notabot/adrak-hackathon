// frontend/src/pages/patient/Profile.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Heart, Shield } from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

export default function PatientProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC]">
        <PatientSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
          <PatientNavbar title="My Profile" />
          <main className="flex-1 flex items-center justify-center text-[#64748B]">Loading...</main>
        </div>
      </div>
    )
  }

  const p = profile || {}
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "-"

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="My Profile" />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                  <User className="w-5 h-5" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: "Full Name", value: p.name },
                    { label: "Patient ID", value: p.pid },
                    { label: "Email", value: p.email },
                    { label: "Phone", value: p.phone },
                    { label: "Age", value: p.age },
                    { label: "Gender", value: p.gender },
                    { label: "Blood Group", value: p.bloodGroup },
                    { label: "Member Since", value: formatDate(p.createdAt) },
                  ].map((field) => (
                    <div key={field.label}>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{field.label}</p>
                      <p className="text-sm font-medium text-[#0F172A] capitalize">{field.value || "-"}</p>
                    </div>
                  ))}
                </div>
                {p.address && (p.address.street || p.address.city) && (
                  <div className="mt-6">
                    <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Address</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {[p.address.street, p.address.city, p.address.state, p.address.pincode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                  <Heart className="w-5 h-5" /> Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Allergies</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {p.allergies?.length > 0 ? p.allergies.join(", ") : "None listed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Medical Conditions</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {p.medicalConditions?.length > 0 ? p.medicalConditions.join(", ") : "None listed"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {p.remarks?.length > 0 && (
              <Card className="bg-white border-[#E2E8F0] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                    <Shield className="w-5 h-5" /> Hospital Remarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {p.remarks.map((r, i) => (
                      <div key={i} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-[#0F172A]">{r.hospitalId?.name || "Unknown"}</span>
                          <span className="text-xs text-[#64748B]">{formatDate(r.date)}</span>
                        </div>
                        <p className="text-sm text-[#64748B]">{r.note}</p>
                        {r.diagnosis && <p className="text-xs text-[#64748B] mt-1">Diagnosis: {r.diagnosis}</p>}
                        {r.referredTo && <p className="text-xs text-[#2563EB] mt-1">Referred to: {r.referredTo.name}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
