import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { StatsCard } from "@/components/stats-card"
import { PatientVisitsChart } from "@/components/admin/patient-visits-chart"
import { PatientsTable } from "@/components/admin/patients-table"
import { api, isLoggedIn, getRole } from "@/lib/api"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalPatients: 0, totalStaff: 0, activePatients: 0, totalWards: 0 })
  const [loading, setLoading] = useState(true)

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
      // If no hospital assigned yet, stats will be 0
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
          <div className="mb-6">
            <PatientVisitsChart />
          </div>
          <PatientsTable />
        </main>
      </div>
    </div>
  )
}