// frontend/src/components/admin/sidebar.jsx
// MODIFIED — added Emergency Map nav item
import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard, Users, QrCode, Activity, Settings, Phone, LogOut,
  ArrowRightLeft, Zap, TrendingUp, Package, CalendarCheck, Map,
} from "lucide-react"
import { getUser, logout, isLoggedIn, getRole } from "@/lib/api"
import { api } from "@/lib/api"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/patients", label: "Patients", icon: Users },
  { href: "/admin/qr-scanner", label: "QR Scanner", icon: QrCode },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarCheck, badge: "appointments" },
  { href: "/admin/referrals", label: "Referrals", icon: ArrowRightLeft, badge: "referrals" },
  { href: "/admin/emergency-map", label: "Emergency Map", icon: Map },
  { href: "/admin/surge", label: "Surge Intel", icon: Zap },
  { href: "/admin/predictions", label: "Predictions", icon: TrendingUp },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/resources", label: "Resources", icon: Activity },
]

const managementItems = [
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const user = getUser()
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "AD"

  const [pendingCount, setPendingCount] = useState(0)
  const [apptCount, setApptCount] = useState(0)

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchCounts = async () => {
    try {
      if (!isLoggedIn() || getRole() !== "admin") return
      const [refData, apptData] = await Promise.all([
        api("/referral/counts").catch(() => ({ incomingPending: 0 })),
        api("/appointments/hospital/counts").catch(() => ({ todayPending: 0 })),
      ])
      setPendingCount(refData.incomingPending || 0)
      setApptCount(apptData.todayPending || 0)
    } catch { /* ignore */ }
  }

  const getBadgeCount = (key) => {
    if (key === "referrals") return pendingCount
    if (key === "appointments") return apptCount
    return 0
  }

  const handleLogout = () => { logout(); navigate("/admin/login") }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-[#E2E8F0] flex flex-col z-10">
      <div className="p-6">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-lg text-[#0F172A]">medflow</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const badgeVal = item.badge ? getBadgeCount(item.badge) : 0
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-black text-white" : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {badgeVal > 0 && (
                  <span className={cn(
                    "min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5",
                    isActive ? "bg-white text-black" : "bg-red-500 text-white"
                  )}>
                    {badgeVal}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-8">
          <p className="px-3 mb-2 text-xs font-medium text-[#64748B] uppercase tracking-wide">Management</p>
          <div className="space-y-1">
            {managementItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-black text-white" : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  )}>
                  <item.icon className="w-5 h-5" />{item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-[#E2E8F0] p-4">
        <div className="flex items-center gap-2 text-[#64748B] mb-3">
          <Phone className="w-4 h-4" />
          <div>
            <p className="text-xs">Emergency Hotline</p>
            <p className="text-sm font-medium text-[#0F172A]">108</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
            <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0F172A] truncate">{user?.name || "Admin User"}</p>
            <p className="text-xs text-[#64748B] truncate">{user?.email || "admin@medflow.com"}</p>
          </div>
          <button onClick={handleLogout} className="text-[#64748B] hover:text-red-600" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
