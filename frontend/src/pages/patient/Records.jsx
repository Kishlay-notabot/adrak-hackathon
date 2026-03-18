// frontend/src/pages/patient/Records.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

export default function PatientRecords() {
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

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "-"

  const visits = profile?.recentVisits || []

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="Medical Records" />
        <main className="flex-1 overflow-auto p-6">
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <FileText className="w-5 h-5" /> Visit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-[#64748B] text-sm">Loading records...</div>
              ) : visits.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <div className="w-16 h-16 bg-[#F1F5F9] rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-[#64748B]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No Records Yet</h3>
                  <p className="text-sm text-[#64748B] text-center max-w-md">
                    Your visit history will appear here once you've been admitted to a hospital.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visits.map((visit, index) => (
                    <div key={visit.id || index} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-[#0F172A]">{visit.hospital}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          visit.status === "discharged" ? "bg-[#DCFCE7] text-[#16A34A]" :
                          visit.status === "critical" ? "bg-[#FEE2E2] text-[#DC2626]" :
                          "bg-[#FEF3C7] text-[#D97706]"
                        }`}>
                          {visit.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-[#64748B]">Admitted: </span>
                          <span className="text-[#0F172A]">{formatDate(visit.admittedAt)}</span>
                        </div>
                        {visit.dischargedAt && (
                          <div>
                            <span className="text-[#64748B]">Discharged: </span>
                            <span className="text-[#0F172A]">{formatDate(visit.dischargedAt)}</span>
                          </div>
                        )}
                        {visit.doctor && (
                          <div>
                            <span className="text-[#64748B]">Doctor: </span>
                            <span className="text-[#0F172A]">{visit.doctor}</span>
                          </div>
                        )}
                        {visit.ward && (
                          <div>
                            <span className="text-[#64748B]">Ward: </span>
                            <span className="text-[#0F172A]">{visit.ward}</span>
                          </div>
                        )}
                        {visit.reason && (
                          <div className="col-span-2">
                            <span className="text-[#64748B]">Reason: </span>
                            <span className="text-[#0F172A]">{visit.reason}</span>
                          </div>
                        )}
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
