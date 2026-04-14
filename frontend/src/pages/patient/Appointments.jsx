// frontend/src/pages/patient/Appointments.jsx
// MODIFIED — full appointment booking system
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Calendar, Clock, Building2, Search, CheckCircle2, X, Loader2,
  ChevronRight, MapPin, AlertCircle, Ban,
} from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

const STATUS_STYLE = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  "no-show": "bg-gray-100 text-gray-600",
}

export default function PatientAppointments() {
  const navigate = useNavigate()

  // Booking flow state
  const [step, setStep] = useState("hospitals") // hospitals | slots | confirm
  const [hospitals, setHospitals] = useState([])
  const [hospitalSearch, setHospitalSearch] = useState("")
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [selectedDate, setSelectedDate] = useState("")
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState("")
  const [reason, setReason] = useState("")
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState("")
  const [bookSuccess, setBookSuccess] = useState("")

  // My appointments
  const [appointments, setAppointments] = useState([])
  const [apptLoading, setApptLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  const [apptFilter, setApptFilter] = useState("all")

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "patient") { navigate("/patient/login"); return }
    fetchHospitals()
    fetchMyAppointments()
  }, [])

  useEffect(() => {
    fetchMyAppointments()
  }, [apptFilter])

  const fetchHospitals = async () => {
    try {
      const data = await api("/appointments/hospitals")
      setHospitals(data)
    } catch (err) { console.error(err.message) }
  }

  const fetchMyAppointments = async () => {
    setApptLoading(true)
    try {
      const data = await api(`/appointments/my?status=${apptFilter}`)
      setAppointments(data)
    } catch (err) { console.error(err.message) }
    finally { setApptLoading(false) }
  }

  const fetchSlots = async () => {
    if (!selectedHospital || !selectedDate) return
    setSlotsLoading(true)
    setSelectedSlot("")
    try {
      const data = await api(`/appointments/available-slots?hospitalId=${selectedHospital._id}&date=${selectedDate}`)
      setSlots(data)
    } catch (err) { setSlots([]) }
    finally { setSlotsLoading(false) }
  }

  useEffect(() => {
    if (selectedHospital && selectedDate) fetchSlots()
  }, [selectedDate])

  const handleSelectHospital = (h) => {
    setSelectedHospital(h)
    setStep("slots")
    setSelectedDate("")
    setSelectedSlot("")
    setSlots([])
    setBookError("")
    setBookSuccess("")
  }

  const handleBook = async () => {
    setBookError("")
    setBookSuccess("")
    setBooking(true)
    try {
      await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          hospitalId: selectedHospital._id,
          date: selectedDate,
          timeSlot: selectedSlot,
          reason: reason || undefined,
        }),
      })
      setBookSuccess("Appointment booked successfully!")
      setSelectedSlot("")
      setReason("")
      fetchMyAppointments()
      fetchSlots() // refresh slot availability
      setTimeout(() => setBookSuccess(""), 4000)
    } catch (err) {
      setBookError(err.message)
    } finally {
      setBooking(false)
    }
  }

  const handleCancel = async (id) => {
    setCancellingId(id)
    try {
      await api(`/appointments/${id}/cancel`, { method: "PATCH" })
      fetchMyAppointments()
    } catch (err) { console.error(err.message) }
    finally { setCancellingId(null) }
  }

  const resetBooking = () => {
    setStep("hospitals")
    setSelectedHospital(null)
    setSelectedDate("")
    setSelectedSlot("")
    setSlots([])
    setReason("")
    setBookError("")
    setBookSuccess("")
  }

  const filteredHospitals = hospitalSearch.trim()
    ? hospitals.filter((h) =>
        h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
        h.address?.city?.toLowerCase().includes(hospitalSearch.toLowerCase())
      )
    : hospitals

  const todayStr = new Date().toISOString().split("T")[0]
  const maxDateStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30) // allow booking up to 30 days ahead
    return d.toISOString().split("T")[0]
  })()

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "-"

  const formatSlotLabel = (slot) => {
    const [h, m] = slot.split(":")
    const hour = parseInt(h)
    const suffix = hour >= 12 ? "PM" : "AM"
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${h12}:${m} ${suffix}`
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="Appointments" />
        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── LEFT: Booking Flow (3 cols) ─────────────────── */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">Book Appointment</h2>
                  <p className="text-sm text-[#64748B]">Select a hospital and pick a time slot</p>
                </div>
                {step !== "hospitals" && (
                  <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]" onClick={resetBooking}>
                    Change Hospital
                  </Button>
                )}
              </div>

              {/* Step 1: Hospital picker */}
              {step === "hospitals" && (
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> Select Hospital
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative mb-4">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
                      <Input
                        placeholder="Search by name or city..."
                        value={hospitalSearch}
                        onChange={(e) => setHospitalSearch(e.target.value)}
                        className="h-9 pl-9 border-[#E2E8F0]"
                      />
                    </div>
                    {filteredHospitals.length === 0 ? (
                      <p className="text-sm text-[#64748B] text-center py-8">No hospitals found</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {filteredHospitals.map((h) => (
                          <button
                            key={h._id}
                            onClick={() => handleSelectHospital(h)}
                            className="w-full text-left p-3 rounded-lg border border-[#E2E8F0] hover:border-[#0F172A] hover:bg-[#F8FAFC] transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5 text-[#64748B]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#0F172A]">{h.name}</p>
                                <p className="text-xs text-[#64748B] flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {[h.address?.city, h.address?.state].filter(Boolean).join(", ")}
                                  {h.phone && ` · ${h.phone}`}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Date + Slot picker */}
              {step === "slots" && selectedHospital && (
                <>
                  {/* Selected hospital banner */}
                  <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <div className="w-10 h-10 rounded-lg bg-[#0F172A] flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{selectedHospital.name}</p>
                      <p className="text-xs text-[#64748B]">
                        {[selectedHospital.address?.city, selectedHospital.address?.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>

                  {bookSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />{bookSuccess}
                    </div>
                  )}
                  {bookError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />{bookError}
                    </div>
                  )}

                  <Card className="bg-white border-[#E2E8F0] shadow-sm">
                    <CardContent className="p-5 space-y-5">
                      {/* Date picker */}
                      <div className="space-y-2">
                        <Label className="text-sm text-[#0F172A] flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> Select Date
                        </Label>
                        <Input
                          type="date"
                          min={todayStr}
                          max={maxDateStr}
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="h-10 border-[#E2E8F0] max-w-xs"
                        />
                      </div>

                      {/* Time slots */}
                      {selectedDate && (
                        <div className="space-y-2">
                          <Label className="text-sm text-[#0F172A] flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Available Slots — {formatDate(selectedDate)}
                          </Label>
                          {slotsLoading ? (
                            <div className="flex items-center justify-center py-8 text-[#64748B]">
                              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading slots...
                            </div>
                          ) : slots.length === 0 ? (
                            <p className="text-sm text-[#64748B] text-center py-6">No slots available</p>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {slots.map((s) => (
                                <button
                                  key={s.time}
                                  disabled={!s.available}
                                  onClick={() => setSelectedSlot(s.time)}
                                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                                    !s.available
                                      ? "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed line-through"
                                      : selectedSlot === s.time
                                      ? "bg-[#0F172A] text-white border-[#0F172A]"
                                      : "bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#0F172A]"
                                  }`}
                                >
                                  {formatSlotLabel(s.time)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reason + Book */}
                      {selectedSlot && (
                        <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                          <div className="space-y-2">
                            <Label className="text-sm text-[#0F172A]">Reason for Visit (optional)</Label>
                            <Input
                              placeholder="e.g. Follow-up, general checkup, chest pain..."
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="h-10 border-[#E2E8F0]"
                            />
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-[#0F172A]">
                                {formatDate(selectedDate)} at {formatSlotLabel(selectedSlot)}
                              </p>
                              <p className="text-xs text-[#64748B]">{selectedHospital.name}</p>
                            </div>
                          </div>
                          <Button
                            onClick={handleBook}
                            disabled={booking}
                            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-11"
                          >
                            {booking ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...</>
                            ) : (
                              <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Booking</>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* ── RIGHT: My Appointments (2 cols) ─────────────── */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0F172A]">My Appointments</h3>
              </div>

              {/* Filter pills */}
              <div className="flex flex-wrap gap-1.5">
                {["all", "pending", "confirmed", "cancelled", "completed"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setApptFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                      apptFilter === f
                        ? "bg-[#0F172A] text-white"
                        : "bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {apptLoading ? (
                <div className="text-center py-8 text-[#64748B] text-sm">Loading appointments...</div>
              ) : appointments.length === 0 ? (
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardContent className="flex flex-col items-center py-12">
                    <Calendar className="w-10 h-10 text-[#94A3B8] mb-3" />
                    <p className="text-sm text-[#64748B]">
                      {apptFilter === "all" ? "No appointments yet" : `No ${apptFilter} appointments`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {appointments.map((appt) => (
                    <Card key={appt._id} className="bg-white border-[#E2E8F0] shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">
                              {appt.hospitalId?.name || "Unknown Hospital"}
                            </p>
                            <p className="text-xs text-[#64748B] flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {[appt.hospitalId?.address?.city, appt.hospitalId?.address?.state].filter(Boolean).join(", ")}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_STYLE[appt.status]}`}>
                            {appt.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-3 p-2 bg-[#F8FAFC] rounded-md">
                          <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
                            <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                            {formatDate(appt.date)}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm font-medium text-[#0F172A]">
                            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                            {formatSlotLabel(appt.timeSlot)}
                          </div>
                        </div>

                        {appt.reason && (
                          <p className="text-xs text-[#64748B] mt-2">Reason: {appt.reason}</p>
                        )}
                        {appt.notes && (
                          <p className="text-xs text-blue-600 mt-1">Hospital note: {appt.notes}</p>
                        )}
                        {appt.cancelledBy && appt.status === "cancelled" && (
                          <p className="text-[10px] text-[#94A3B8] mt-1">
                            Cancelled by {appt.cancelledBy}
                          </p>
                        )}

                        {(appt.status === "pending" || appt.status === "confirmed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            disabled={cancellingId === appt._id}
                            onClick={() => handleCancel(appt._id)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            {cancellingId === appt._id ? "Cancelling..." : "Cancel"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
