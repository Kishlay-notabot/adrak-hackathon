// frontend/src/pages/admin/Dashboard.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { StatsCard } from "@/components/stats-card"
import { PatientVisitsChart } from "@/components/admin/patient-visits-chart"
import { AdmissionFlowChart } from "@/components/admin/admission-flow-chart"
import { PatientsTable } from "@/components/admin/patients-table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2 } from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalPatients: 0, totalStaff: 0, activePatients: 0, totalWards: 0 })
  const [loading, setLoading] = useState(true)
  const [noHospital, setNoHospital] = useState(false)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") {
      navigate("/admin/login")
      return
    }
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await api("/admin/dashboard/stats")
      setStats(data)
    } catch (err) {
      if (err.message?.includes("No hospital assigned")) {
        setNoHospital(true)
      }
      console.error("Failed to load stats:", err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Dashboard" />
        <main className="flex-1 overflow-auto p-6">
          {noHospital ? (
            <Card className="bg-white border-[#E2E8F0] shadow-sm max-w-lg mx-auto mt-12">
              <CardContent className="flex flex-col items-center py-16">
                <div className="w-16 h-16 bg-[#F1F5F9] rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-[#64748B]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No Hospital Linked</h3>
                <p className="text-sm text-[#64748B] mb-6 text-center max-w-sm">
                  You need to create or join a hospital to start managing patients and view dashboard stats.
                </p>
                <Button onClick={() => navigate("/admin/hospital-setup")} className="bg-black hover:bg-black/90 text-white">
                  Setup Hospital
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatsCard
                  label="Total Patients"
                  value={loading ? "..." : stats.totalPatients.toLocaleString()}
                  description="Registered patients across all wards"
                />
                <StatsCard
                  label="Total Staff / Doctors"
                  value={loading ? "..." : stats.totalStaff.toLocaleString()}
                  description="Includes doctors, nurses, and support staff"
                />
                <StatsCard
                  label="Active Patients"
                  value={loading ? "..." : stats.activePatients.toLocaleString()}
                  description="Currently admitted or under treatment"
                />
                <StatsCard
                  label="Total Wards"
                  value={loading ? "..." : stats.totalWards.toLocaleString()}
                  description="Active bed categories"
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <PatientVisitsChart />
                <AdmissionFlowChart />
              </div>
              <PatientsTable />
            </>
          )}
        </main>
      </div>
    </div>
  )
}