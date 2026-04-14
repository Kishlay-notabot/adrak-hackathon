// frontend/src/pages/admin/Appointments.jsx
// NEW — admin view for managing patient appointment bookings
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  Calendar, Clock, Users, CheckCircle2, X, Ban, Eye,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { api, isLoggedIn, getRole } from "@/lib/api"

const STATUS_STYLE = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  "no-show": "bg-gray-100 text-gray-600",
}

const statusFilters = ["all", "pending", "confirmed", "completed", "cancelled", "no-show"]

export default function AdminAppointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [actionLoading, setActionLoading] = useState(null)
  const limit = 15

  // Upcoming widget
  const [upcoming, setUpcoming] = useState(null)
  const [upcomingLoading, setUpcomingLoading] = useState(true)

  // Detail modal
  const [detailAppt, setDetailAppt] = useState(null)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") { navigate("/admin/login"); return }
    fetchUpcoming()
  }, [])

  useEffect(() => { setPage(1) }, [statusFilter, dateFilter])
  useEffect(() => { fetchAppointments() }, [statusFilter, dateFilter, page])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      let url = `/appointments/hospital?status=${statusFilter}&page=${page}&limit=${limit}`
      if (dateFilter) url += `&date=${dateFilter}`
      const data = await api(url)
      setAppointments(data.appointments)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      console.error(err.message)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcoming = async () => {
    setUpcomingLoading(true)
    try {
      const data = await api("/appointments/hospital/upcoming")
      setUpcoming(data)
    } catch { setUpcoming(null) }
    finally { setUpcomingLoading(false) }
  }

  const handleAction = async (id, action) => {
    setActionLoading(id)
    try {
      await api(`/appointments/${id}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      })
      fetchAppointments()
      fetchUpcoming()
    } catch (err) { console.error(err.message) }
    finally { setActionLoading(null) }
  }

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "-"

  const formatSlot = (slot) => {
    if (!slot) return "-"
    const [h, m] = slot.split(":")
    const hour = parseInt(h)
    const suffix = hour >= 12 ? "PM" : "AM"
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${h12}:${m} ${suffix}`
  }

  const todayStr = new Date().toISOString().split("T")[0]
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Appointments" />
        <main className="flex-1 overflow-auto p-6">
          {/* ── Upcoming Summary Cards ─────────────────────── */}
          {!upcomingLoading && upcoming && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-[#0F172A]">Today's Appointments</h3>
                    </div>
                    <span className="text-2xl font-bold text-[#0F172A]">{upcoming.totalToday}</span>
                  </div>
                  {upcoming.today.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {upcoming.today.slice(0, 5).map((a) => (
                        <div key={a._id} className="flex items-center justify-between text-xs p-1.5 bg-[#F8FAFC] rounded">
                          <div>
                            <span className="font-medium text-[#0F172A]">{a.patientId?.name}</span>
                            <span className="text-[#64748B] ml-1.5">{a.patientId?.pid}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#0F172A] font-medium">{formatSlot(a.timeSlot)}</span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLE[a.status]}`}>
                              {a.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {upcoming.today.length > 5 && (
                        <p className="text-[10px] text-[#94A3B8] text-center">+{upcoming.today.length - 5} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">No appointments today</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4 border-l-purple-500">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <h3 className="text-sm font-semibold text-[#0F172A]">Tomorrow</h3>
                    </div>
                    <span className="text-2xl font-bold text-[#0F172A]">{upcoming.totalTomorrow}</span>
                  </div>
                  {upcoming.tomorrow.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {upcoming.tomorrow.slice(0, 5).map((a) => (
                        <div key={a._id} className="flex items-center justify-between text-xs p-1.5 bg-[#F8FAFC] rounded">
                          <div>
                            <span className="font-medium text-[#0F172A]">{a.patientId?.name}</span>
                            <span className="text-[#64748B] ml-1.5">{a.patientId?.pid}</span>
                          </div>
                          <span className="text-[#0F172A] font-medium">{formatSlot(a.timeSlot)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">No appointments tomorrow</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── All Appointments Table ─────────────────────── */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-[#0F172A]">All Appointments</CardTitle>
                  <CardDescription className="text-[#64748B]">Manage patient bookings</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-9 border-[#E2E8F0] w-40"
                  />
                  {dateFilter && (
                    <button onClick={() => setDateFilter("")} className="text-[#64748B] hover:text-[#0F172A]">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center gap-1 mt-3 border-b border-[#E2E8F0] -mx-6 px-6">
                {statusFilters.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors capitalize",
                      statusFilter === s
                        ? "border-black text-[#0F172A]"
                        : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-[#64748B] text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <Calendar className="w-10 h-10 text-[#94A3B8] mb-3" />
                  <p className="text-sm text-[#64748B]">No appointments found</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F1F5F9] hover:bg-[#F1F5F9]">
                        <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Patient</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Date</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Time</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Reason</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Status</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appt, i) => (
                        <TableRow key={appt._id} className={cn("hover:bg-[#F8FAFC]", i % 2 === 1 && "bg-[#F8FAFC]")}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-[#0F172A]">{appt.patientId?.name || "-"}</p>
                              <p className="text-xs text-[#64748B]">
                                {appt.patientId?.pid}
                                {appt.patientId?.phone && ` · ${appt.patientId.phone}`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-[#0F172A]">{formatDate(appt.date)}</TableCell>
                          <TableCell className="text-sm font-medium text-[#0F172A]">{formatSlot(appt.timeSlot)}</TableCell>
                          <TableCell className="text-sm text-[#64748B] max-w-[150px] truncate">{appt.reason || "-"}</TableCell>
                          <TableCell>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", STATUS_STYLE[appt.status])}>
                              {appt.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {appt.status === "pending" && (
                                <>
                                  <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                                    disabled={actionLoading === appt._id}
                                    onClick={() => handleAction(appt._id, "confirmed")}>
                                    {actionLoading === appt._id ? "..." : "Confirm"}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] border-red-200 text-red-600 px-2"
                                    disabled={actionLoading === appt._id}
                                    onClick={() => handleAction(appt._id, "cancelled")}>
                                    Decline
                                  </Button>
                                </>
                              )}
                              {appt.status === "confirmed" && (
                                <>
                                  <Button size="sm" className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2"
                                    disabled={actionLoading === appt._id}
                                    onClick={() => handleAction(appt._id, "completed")}>
                                    Complete
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] border-[#E2E8F0] text-[#64748B] px-2"
                                    disabled={actionLoading === appt._id}
                                    onClick={() => handleAction(appt._id, "no-show")}>
                                    No-Show
                                  </Button>
                                </>
                              )}
                              <button onClick={() => setDetailAppt(appt)} className="text-[#64748B] hover:text-[#0F172A]" title="Details">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E2E8F0]">
                    <p className="text-sm text-[#64748B]">Showing {startIndex}-{endIndex} of {total}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]"
                        disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                        <Button key={p} variant="outline" size="sm"
                          className={cn("border-[#E2E8F0]", page === p ? "bg-black text-white hover:bg-black/90" : "text-[#64748B]")}
                          onClick={() => setPage(p)}>
                          {p}
                        </Button>
                      ))}
                      <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]"
                        disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Detail Modal ──────────────────────────────── */}
          <Dialog open={!!detailAppt} onOpenChange={() => setDetailAppt(null)}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-[#0F172A]">Appointment Details</DialogTitle>
              </DialogHeader>
              {detailAppt && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Patient</p>
                      <p className="text-sm font-medium text-[#0F172A]">{detailAppt.patientId?.name}</p>
                      <p className="text-xs text-[#64748B]">{detailAppt.patientId?.pid}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Contact</p>
                      <p className="text-sm text-[#0F172A]">{detailAppt.patientId?.phone || "-"}</p>
                      <p className="text-xs text-[#64748B]">{detailAppt.patientId?.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Date & Time</p>
                      <p className="text-sm font-medium text-[#0F172A]">{formatDate(detailAppt.date)}</p>
                      <p className="text-sm text-[#0F172A]">{formatSlot(detailAppt.timeSlot)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Status</p>
                      <span className={cn("px-2 py-0.5 rounded text-xs font-bold uppercase", STATUS_STYLE[detailAppt.status])}>
                        {detailAppt.status}
                      </span>
                    </div>
                    {detailAppt.patientId?.age && (
                      <div>
                        <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Age / Gender</p>
                        <p className="text-sm text-[#0F172A] capitalize">
                          {detailAppt.patientId.age}y · {detailAppt.patientId.gender || "-"}
                        </p>
                      </div>
                    )}
                    {detailAppt.patientId?.bloodGroup && (
                      <div>
                        <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Blood Group</p>
                        <p className="text-sm font-medium text-[#0F172A]">{detailAppt.patientId.bloodGroup}</p>
                      </div>
                    )}
                  </div>
                  {detailAppt.reason && (
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Reason</p>
                      <p className="text-sm text-[#0F172A]">{detailAppt.reason}</p>
                    </div>
                  )}
                  {detailAppt.notes && (
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm text-[#0F172A]">{detailAppt.notes}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-[#94A3B8]">
                    Booked: {new Date(detailAppt.createdAt).toLocaleString("en-IN")}
                    {detailAppt.cancelledBy && ` · Cancelled by ${detailAppt.cancelledBy}`}
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
