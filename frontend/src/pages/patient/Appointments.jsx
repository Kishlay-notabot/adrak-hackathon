// frontend/src/pages/patient/Appointments.jsx
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { isLoggedIn, getRole } from "@/lib/api"

export default function PatientAppointments() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "patient") navigate("/patient/login")
  }, [])

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="Appointments" />
        <main className="flex-1 overflow-auto p-6">
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-[#DBEAFE] rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-[#2563EB]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Appointments</h3>
              <p className="text-sm text-[#64748B] text-center max-w-md">
                Appointment scheduling will be available here soon.
                For now, visit your hospital directly or contact them to book an appointment.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
