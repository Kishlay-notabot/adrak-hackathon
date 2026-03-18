// frontend/src/pages/admin/Doctors.jsx
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Stethoscope } from "lucide-react"
import { isLoggedIn, getRole } from "@/lib/api"

export default function AdminDoctors() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") navigate("/admin/login")
  }, [])

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Doctors" />
        <main className="flex-1 overflow-auto p-6">
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-[#F1F5F9] rounded-full flex items-center justify-center mb-4">
                <Stethoscope className="w-8 h-8 text-[#64748B]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Doctor Management</h3>
              <p className="text-sm text-[#64748B] text-center max-w-md">
                Doctor profiles and scheduling will be available here.
                Currently, doctors can be assigned when admitting patients.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
