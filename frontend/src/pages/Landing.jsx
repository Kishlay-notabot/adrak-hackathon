import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, User } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-2xl font-bold text-[#0F172A]">MediCore</span>
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Hospital Management System</h1>
          <p className="text-[#64748B]">Select your dashboard to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-[#F1F5F9] rounded-lg flex items-center justify-center mb-2">
                <Building2 className="w-6 h-6 text-[#0F172A]" />
              </div>
              <CardTitle className="text-[#0F172A]">Admin Dashboard</CardTitle>
              <CardDescription className="text-[#64748B]">
                Manage patients, staff, wards, and hospital operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-black hover:bg-black/90 text-white">
                <Link to="/admin/login">Access Admin Portal</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-[#F1F5F9] rounded-lg flex items-center justify-center mb-2">
                <User className="w-6 h-6 text-[#0F172A]" />
              </div>
              <CardTitle className="text-[#0F172A]">Patient Dashboard</CardTitle>
              <CardDescription className="text-[#64748B]">
                View your health records, appointments, and QR code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]">
                <Link to="/patient/login">Access Patient Portal</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}