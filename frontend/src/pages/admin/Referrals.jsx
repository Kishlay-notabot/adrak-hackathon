// frontend/src/pages/admin/Referrals.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowDownLeft, ArrowUpRight, Check, X, Ban } from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

const tabs = ["Incoming", "Outgoing"]
const statusFilters = ["all", "pending", "accepted", "rejected", "cancelled"]

export default function AdminReferrals() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("Incoming")
  const [statusFilter, setStatusFilter] = useState("all")
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") navigate("/admin/login")
  }, [])

  useEffect(() => {
    fetchReferrals()
  }, [activeTab, statusFilter])

  const fetchReferrals = async () => {
    setLoading(true)
    try {
      const direction = activeTab === "Incoming" ? "incoming" : "outgoing"
      const data = await api(`/referral/${direction}?status=${statusFilter}&limit=50`)
      setReferrals(data.referrals)
      setTotal(data.total)
    } catch (err) {
      console.error("Failed to load referrals:", err.message)
      setReferrals([])
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async (id, action) => {
    setActionLoading(id)
    try {
      await api(`/referral/${id}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      })
      fetchReferrals()
    } catch (err) {
      console.error("Failed to respond:", err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id) => {
    setActionLoading(id)
    try {
      await api(`/referral/${id}/cancel`, { method: "PATCH" })
      fetchReferrals()
    } catch (err) {
      console.error("Failed to cancel:", err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusStyles = (status) => {
    switch (status) {
      case "pending": return "bg-[#FEF9C3] text-[#A16207]"
      case "accepted": return "bg-[#DCFCE7] text-[#16A34A]"
      case "rejected": return "bg-[#FEE2E2] text-[#DC2626]"
      case "cancelled": return "bg-[#F1F5F9] text-[#64748B]"
      case "completed": return "bg-[#DBEAFE] text-[#2563EB]"
      default: return "bg-[#F1F5F9] text-[#64748B]"
    }
  }

  const getUrgencyStyles = (urgency) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-700"
      case "high": return "bg-orange-100 text-orange-700"
      case "medium": return "bg-yellow-100 text-yellow-700"
      default: return "bg-gray-100 text-gray-600"
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleString("en-IN", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Referrals" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">Inter-Hospital Referrals</h2>
            <p className="text-sm text-[#64748B]">Manage patient referrals between hospitals in the medflow network</p>
          </div>

          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                {/* Direction tabs */}
                <div className="flex items-center border-b border-[#E2E8F0]">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setStatusFilter("all") }}
                      className={cn(
                        "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
                        activeTab === tab
                          ? "border-black text-[#0F172A]"
                          : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                      )}
                    >
                      {tab === "Incoming" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Status filter */}
                <div className="flex items-center bg-[#F1F5F9] rounded-lg p-1">
                  {statusFilters.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                        statusFilter === s
                          ? "bg-black text-white"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {loading ? (
                <div className="py-12 text-center text-[#64748B] text-sm">Loading referrals...</div>
              ) : referrals.length === 0 ? (
                <div className="py-12 text-center text-[#64748B] text-sm">
                  No {statusFilter !== "all" ? statusFilter : ""} {activeTab.toLowerCase()} referrals found.
                </div>
              ) : (
                <div className="space-y-3">
                  {referrals.map((ref) => (
                    <div
                      key={ref._id}
                      className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-[#0F172A]">
                              {ref.patientId?.name || "Unknown Patient"}
                            </p>
                            <span className="text-xs text-[#64748B]">{ref.patientId?.pid}</span>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium capitalize", getUrgencyStyles(ref.urgency))}>
                              {ref.urgency}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B]">
                            {activeTab === "Incoming"
                              ? `From: ${ref.fromHospitalId?.name || "Unknown"}`
                              : `To: ${ref.toHospitalId?.name || "Unknown"}`
                            }
                            {" · "}
                            {formatDate(ref.createdAt)}
                          </p>
                          {ref.patientId && (
                            <p className="text-xs text-[#64748B] mt-0.5">
                              {[
                                ref.patientId.age && `${ref.patientId.age}y`,
                                ref.patientId.gender,
                                ref.patientId.bloodGroup,
                              ].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className={cn("px-2 py-1 rounded text-xs font-medium capitalize", getStatusStyles(ref.status))}>
                          {ref.status}
                        </span>
                      </div>

                      {ref.reason && (
                        <div className="mb-2">
                          <p className="text-xs text-[#64748B] uppercase tracking-wide">Reason</p>
                          <p className="text-sm text-[#0F172A]">{ref.reason}</p>
                        </div>
                      )}
                      {ref.notes && (
                        <div className="mb-2">
                          <p className="text-xs text-[#64748B] uppercase tracking-wide">Notes</p>
                          <p className="text-sm text-[#0F172A]">{ref.notes}</p>
                        </div>
                      )}

                      {ref.referredBy && (
                        <p className="text-xs text-[#64748B]">
                          Referred by: {ref.referredBy.name}
                          {ref.respondedBy && ` · Responded by: ${ref.respondedBy.name}`}
                          {ref.respondedAt && ` on ${formatDate(ref.respondedAt)}`}
                        </p>
                      )}

                      {/* Action buttons */}
                      {ref.status === "pending" && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-[#E2E8F0]">
                          {activeTab === "Incoming" ? (
                            <>
                              <Button
                                size="sm"
                                className="bg-[#16A34A] hover:bg-[#16A34A]/90 text-white text-xs h-8"
                                disabled={actionLoading === ref._id}
                                onClick={() => handleRespond(ref._id, "accepted")}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                {actionLoading === ref._id ? "..." : "Accept"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                                disabled={actionLoading === ref._id}
                                onClick={() => handleRespond(ref._id, "rejected")}
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                {actionLoading === ref._id ? "..." : "Reject"}
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 border-[#E2E8F0] text-[#64748B]"
                              disabled={actionLoading === ref._id}
                              onClick={() => handleCancel(ref._id)}
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              {actionLoading === ref._id ? "..." : "Cancel Referral"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {total > referrals.length && (
                    <p className="text-center text-xs text-[#64748B] pt-2">
                      Showing {referrals.length} of {total} referrals
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}