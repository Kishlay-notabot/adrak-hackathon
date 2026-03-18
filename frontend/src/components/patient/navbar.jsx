import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { getUser } from "@/lib/api"

export function PatientNavbar({ title }) {
  const user = getUser()
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "PT"

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6">
      <h1 className="text-xl font-bold text-[#0F172A]">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative text-[#64748B] hover:text-[#0F172A]">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <Avatar className="w-8 h-8">
          <AvatarImage src="/placeholder-avatar.jpg" alt="Patient" />
          <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}