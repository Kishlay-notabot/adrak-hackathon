// frontend/src/components/admin/navbar.jsx
// MODIFIED — notification bell is now functional with dropdown
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Bell, ArrowRightLeft, Calendar, Package, AlertTriangle, X,
} from "lucide-react"
import { getUser, api, isLoggedIn, getRole } from "@/lib/api"

const TYPE_CONFIG = {
  referral:         { icon: ArrowRightLeft, color: "text-blue-600", bg: "bg-blue-50" },
  appointment:      { icon: Calendar,       color: "text-purple-600", bg: "bg-purple-50" },
  resource_request: { icon: Package,        color: "text-orange-600", bg: "bg-orange-50" },
}

const URGENCY_DOT = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-emerald-500",
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function AdminNavbar({ title }) {
  const navigate = useNavigate()
  const user = getUser()
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "AD"

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(null)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fetch on open
  useEffect(() => {
    if (!open) return
    fetchNotifications()
  }, [open])

  // Poll count every 30s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    if (!isLoggedIn() || getRole() !== "admin") return
    try {
      const data = await api("/notifications/admin")
      setNotifications(data)
    } catch {
      // silently ignore
    }
  }

  const totalPending = notifications?.totalPending || 0

  const handleItemClick = (link) => {
    setOpen(false)
    navigate(link)
  }

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6">
      <h1 className="text-xl font-bold text-[#0F172A]">{title}</h1>
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="relative text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            <Bell className="w-5 h-5" />
            {totalPending > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {totalPending > 99 ? "99+" : totalPending}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-10 w-96 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Notifications</h3>
                  {totalPending > 0 && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                      {totalPending} pending
                    </span>
                  )}
                </div>
                <button onClick={() => setOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Counts summary */}
              {notifications?.counts && (
                <div className="grid grid-cols-4 gap-0 border-b border-[#E2E8F0]">
                  {[
                    { label: "Referrals", count: notifications.counts.pendingReferrals, color: "text-blue-600" },
                    { label: "Appointments", count: notifications.counts.todayAppointments, color: "text-purple-600" },
                    { label: "Resources", count: notifications.counts.pendingResourceReqs, color: "text-orange-600" },
                    { label: "Critical", count: notifications.counts.criticalPatients, color: "text-red-600" },
                  ].map((c) => (
                    <div key={c.label} className="text-center py-2.5 border-r border-[#F1F5F9] last:border-0">
                      <p className={`text-lg font-bold ${c.color}`}>{c.count}</p>
                      <p className="text-[10px] text-[#64748B]">{c.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Items */}
              <div className="max-h-80 overflow-y-auto">
                {(!notifications?.items || notifications.items.length === 0) ? (
                  <div className="py-10 text-center">
                    <Bell className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                    <p className="text-sm text-[#64748B]">No pending notifications</p>
                  </div>
                ) : (
                  notifications.items.map((item) => {
                    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.referral
                    const Icon = cfg.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.link)}
                        className="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-[#0F172A] truncate">{item.title}</p>
                            {item.urgency && item.urgency !== "low" && (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${URGENCY_DOT[item.urgency] || ""}`} />
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] truncate">{item.description}</p>
                          <p className="text-[10px] text-[#94A3B8] mt-0.5">{timeAgo(item.time)}</p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {notifications?.items?.length > 0 && (
                <div className="border-t border-[#E2E8F0] px-4 py-2.5 bg-[#F8FAFC]">
                  <button
                    onClick={() => { setOpen(false); navigate("/admin/referrals") }}
                    className="text-xs text-[#2563EB] font-medium hover:underline w-full text-center"
                  >
                    View all activity
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
            <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-[#0F172A] hidden md:block">{user?.name || "Admin"}</span>
        </div>
      </div>
    </header>
  )
}
