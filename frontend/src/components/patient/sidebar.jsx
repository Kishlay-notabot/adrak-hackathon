import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  User,
  QrCode,
  Calendar,
  FileText,
  MoreVertical,
  Headphones,
} from "lucide-react"

const navItems = [
  { href: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patient/profile", label: "My Profile", icon: User },
  { href: "/patient/qr-code", label: "My QR Code", icon: QrCode },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/records", label: "Medical Records", icon: FileText },
]

export function PatientSidebar() {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-[#E2E8F0] flex flex-col z-10">
      <div className="p-6">
        <Link to="/patient/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-lg text-[#0F172A]">MediCore</span>
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
      </nav>

      <div className="border-t border-[#E2E8F0] p-4">
        <div className="flex items-center gap-2 text-[#64748B] mb-3">
          <Headphones className="w-4 h-4" />
          <div>
            <p className="text-xs">Need Help?</p>
            <p className="text-xs text-[#2563EB]">Contact Hospital Support</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Patient" />
            <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-sm">PT</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0F172A] truncate">John Doe</p>
            <p className="text-xs text-[#64748B] truncate">#PID-00421</p>
          </div>
          <button className="text-[#64748B] hover:text-[#0F172A]">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  )
}