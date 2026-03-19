// frontend/src/pages/patient/Appointments.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, CheckCircle } from "lucide-react"
import { isLoggedIn, getRole } from "@/lib/api"
import axios from "axios"

export default function PatientAppointments() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    doctor: "",
    date: "",
    time: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "patient") navigate("/patient/login")
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    // Basic validation
    if (!form.patientName || !form.patientPhone || !form.doctor || !form.date || !form.time) {
      setError("Please fill all fields.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await axios.post("http://localhost:5000/api/appointments/book", form)
      setSuccess(true)
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="Appointments" />
        <main className="flex-1 overflow-auto p-6">

          {success ? (
            // ── Success State ──────────────────────────────
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                  Appointment Booked!
                </h3>
                <p className="text-sm text-[#64748B] text-center max-w-md mb-6">
                  You will receive a confirmation call shortly on{" "}
                  <span className="font-medium text-[#0F172A]">{form.patientPhone}</span>.
                </p>
                <button
                  onClick={() => {
                    setSuccess(false)
                    setForm({ patientName: "", patientPhone: "", doctor: "", date: "", time: "" })
                  }}
                  className="bg-[#2563EB] text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  Book Another
                </button>
              </CardContent>
            </Card>
          ) : (
            // ── Booking Form ───────────────────────────────
            <Card className="bg-white border-[#E2E8F0] shadow-sm max-w-xl">
              <CardContent className="p-6">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#DBEAFE] rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A]">Book Appointment</h3>
                    <p className="text-xs text-[#64748B]">Fill details — you'll get a confirmation call</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-[#64748B] mb-1 block">Patient Name</label>
                    <input
                      name="patientName"
                      value={form.patientName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[#64748B] mb-1 block">Phone Number</label>
                    <input
                      name="patientPhone"
                      value={form.patientPhone}
                      onChange={handleChange}
                      placeholder="10 digit mobile number"
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[#64748B] mb-1 block">Doctor</label>
                    <input
                      name="doctor"
                      value={form.doctor}
                      onChange={handleChange}
                      placeholder="Dr. Sharma"
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm text-[#64748B] mb-1 block">Date</label>
                      <input
                        name="date"
                        type="date"
                        value={form.date}
                        onChange={handleChange}
                        className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-[#64748B] mb-1 block">Time</label>
                      <input
                        name="time"
                        type="time"
                        value={form.time}
                        onChange={handleChange}
                        className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-[#2563EB] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 mt-2"
                  >
                    {loading ? "Booking..." : "Book Appointment"}
                  </button>
                </div>

              </CardContent>
            </Card>
          )}

        </main>
      </div>
    </div>
  )
}