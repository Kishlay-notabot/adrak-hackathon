import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  QrCode,
  FileText,
  Settings,
  Phone,
  LogOut,
} from "lucide-react"
import { getUser, logout } from "@/lib/api"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/patients", label: "Patients", icon: Users },
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/admin/qr-scanner", label: "QR Scanner", icon: QrCode },
]

const managementItems = [
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const user = getUser()
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "AD"

  const handleLogout = () => {
    logout()
    navigate("/admin/login")
  }

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

      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-black text-white"
                    : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="mt-8">
          <p className="px-3 mb-2 text-xs font-medium text-[#64748B] uppercase tracking-wide">
            Management
          </p>
          <div className="space-y-1">
            {managementItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-black text-white"
                      : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
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