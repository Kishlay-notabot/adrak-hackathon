import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { StatsCard } from "@/components/stats-card"
import { PatientVisitsChart } from "@/components/admin/patient-visits-chart"
import { PatientsTable } from "@/components/admin/patients-table"

export default function AdminDashboard() {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Dashboard" />
        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatsCard
              label="Total Patients"
              value="12,430"
              trend="+8.2%"
              description="Registered patients across all wards"
            />
            <StatsCard
              label="Total Staff / Doctors"
              value="284"
              trend="+3.1%"
              description="Includes doctors, nurses, and support staff"
            />
            <StatsCard
              label="Active Patients"
              value="1,847"
              trend="-5.4%"
              description="Currently admitted or under treatment"
            />
            <StatsCard
              label="Total Wards"
              value="36"
              trend="+2 new"
              description="General, ICU, pediatric, and surgical"
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