// frontend/src/pages/admin/Resources.jsx
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { ResourceCharts } from "@/components/admin/resource-charts"
import { isLoggedIn, getRole } from "@/lib/api"

export default function AdminResources() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") navigate("/admin/login")
  }, [])

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Resources" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">Hospital Resources</h2>
            <p className="text-sm text-[#64748B]">Bed utilization, staff availability, and equipment usage over time</p>
          </div>
          <ResourceCharts />
        </main>
      </div>
    </div>
  )
}