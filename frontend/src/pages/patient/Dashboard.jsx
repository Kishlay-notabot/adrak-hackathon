import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Stethoscope, Clock, Download, Printer } from "lucide-react"

export default function PatientDashboard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="My Dashboard" />
        <main className="flex-1 overflow-auto p-6">
          <Card className="bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-[#E2E8F0] mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mb-1">Welcome back, John Doe</h2>
                  <p className="text-[#64748B]">{today}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#64748B] mb-1">Next Appointment</p>
                  <p className="text-sm font-medium text-[#0F172A]">March 25, 2024 at 10:00 AM</p>
                  <p className="text-sm text-[#64748B]">Dr. Sarah Wilson</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#DBEAFE] rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Next Appointment</p>
                    <p className="text-lg font-bold text-[#0F172A]">March 25, 2024</p>
                    <p className="text-sm text-[#64748B]">10:00 AM - Dr. Sarah Wilson</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#DCFCE7] rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">My Doctor</p>
                    <p className="text-lg font-bold text-[#0F172A]">Dr. Sarah Wilson</p>
                    <p className="text-sm text-[#64748B]">Internal Medicine</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#F1F5F9] rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Member Since</p>
                    <p className="text-lg font-bold text-[#0F172A]">January 15, 2022</p>
                    <p className="text-sm text-[#64748B]">Patient ID: #PID-00421</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="bg-white border-[#E2E8F0] shadow-sm border-l-4 border-l-[#2563EB]">
              <CardContent className="p-6 text-center">
                <div className="w-48 h-48 mx-auto bg-[#F8FAFC] rounded-lg p-4 mb-4">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect x="10" y="10" width="20" height="20" fill="#0F172A" />
                    <rect x="35" y="10" width="10" height="10" fill="#0F172A" />
                    <rect x="50" y="10" width="10" height="10" fill="#0F172A" />
                    <rect x="70" y="10" width="20" height="20" fill="#0F172A" />
                    <rect x="10" y="35" width="10" height="10" fill="#0F172A" />
                    <rect x="30" y="35" width="15" height="15" fill="#0F172A" />
                    <rect x="55" y="35" width="10" height="10" fill="#0F172A" />
                    <rect x="80" y="35" width="10" height="10" fill="#0F172A" />
                    <rect x="10" y="55" width="10" height="10" fill="#0F172A" />
                    <rect x="35" y="55" width="30" height="10" fill="#0F172A" />
                    <rect x="80" y="55" width="10" height="10" fill="#0F172A" />
                    <rect x="10" y="70" width="20" height="20" fill="#0F172A" />
                    <rect x="40" y="75" width="10" height="10" fill="#0F172A" />
                    <rect x="60" y="70" width="10" height="15" fill="#0F172A" />
                    <rect x="80" y="75" width="10" height="15" fill="#0F172A" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-[#0F172A] mb-1">John Doe</p>
                <p className="text-sm text-[#64748B] mb-6">#PID-00421</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" className="border-[#E2E8F0] text-[#0F172A]">
                    <Download className="w-4 h-4 mr-2" />Download QR
                  </Button>
                  <Button className="bg-black hover:bg-black/90 text-white">
                    <Printer className="w-4 h-4 mr-2" />Print QR
                  </Button>
                </div>
                <p className="text-xs text-[#64748B] mt-4">
                  Show this QR to hospital staff for instant access to your records
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold text-[#0F172A]">My Profile</CardTitle>
                <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]">Edit Profile</Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: "Full Name", value: "John Doe" },
                    { label: "Age", value: "45" },
                    { label: "Gender", value: "Male" },
                    { label: "Blood Group", value: "A+" },
                    { label: "Known Allergies", value: "Penicillin, Peanuts" },
                    { label: "Medical Conditions", value: "Hypertension, Diabetes" },
                    { label: "Ward", value: "General" },
                    { label: "Assigned Doctor", value: "Dr. Sarah Wilson" },
                  ].map((field) => (
                    <div key={field.label}>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{field.label}</p>
                      <p className="text-sm font-medium text-[#0F172A]">{field.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#0F172A]">Recent Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { date: "March 15, 2024", doctor: "Dr. Sarah Wilson", reason: "Routine Checkup", status: "Completed" },
                  { date: "February 28, 2024", doctor: "Dr. Michael Chen", reason: "Blood Pressure Follow-up", status: "Completed" },
                  { date: "March 25, 2024", doctor: "Dr. Sarah Wilson", reason: "Diabetes Management", status: "Upcoming" },
                ].map((visit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-[#0F172A] rounded-full" />
                      {index < 2 && <div className="w-0.5 h-full bg-[#E2E8F0] mt-2" />}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-[#0F172A]">{visit.date}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${visit.status === "Completed" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF3C7] text-[#D97706]"}`}>
                          {visit.status}
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B]">{visit.doctor}</p>
                      <p className="text-sm text-[#64748B]">{visit.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}