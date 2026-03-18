
import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Eye, QrCode, ChevronLeft, ChevronRight, SlidersHorizontal, Plus } from "lucide-react"

const patients = [
  { id: "PID-00421", name: "John Doe", age: 45, gender: "Male", phone: "+91 98765 43210", bloodGroup: "A+", arrivalTime: "2024-01-15 09:30", email: "john.doe@email.com", status: "Admitted" },
  { id: "PID-00422", name: "Jane Smith", age: 32, gender: "Female", phone: "+91 87654 32109", bloodGroup: "B-", arrivalTime: "2024-01-14 14:15", email: "jane.smith@email.com", status: "Critical" },
  { id: "PID-00423", name: "Robert Johnson", age: 58, gender: "Male", phone: "+91 76543 21098", bloodGroup: "O+", arrivalTime: "2024-01-13 11:00", email: "robert.j@email.com", status: "Admitted" },
  { id: "PID-00424", name: "Emily Davis", age: 28, gender: "Female", phone: "+91 65432 10987", bloodGroup: "AB+", arrivalTime: "2024-01-12 16:45", email: "emily.d@email.com", status: "Discharged" },
  { id: "PID-00425", name: "Michael Wilson", age: 67, gender: "Male", phone: "+91 54321 09876", bloodGroup: "A-", arrivalTime: "2024-01-11 08:20", email: "michael.w@email.com", status: "Admitted" },
  { id: "PID-00426", name: "Sarah Thompson", age: 41, gender: "Female", phone: "+91 43210 98765", bloodGroup: "B+", arrivalTime: "2024-01-10 13:30", email: "sarah.t@email.com", status: "Discharged" },
  { id: "PID-00427", name: "David Martinez", age: 53, gender: "Male", phone: "+91 32109 87654", bloodGroup: "O-", arrivalTime: "2024-01-09 10:00", email: "david.m@email.com", status: "Critical" },
  { id: "PID-00428", name: "Lisa Garcia", age: 36, gender: "Female", phone: "+91 21098 76543", bloodGroup: "AB-", arrivalTime: "2024-01-08 15:45", email: "lisa.g@email.com", status: "Admitted" },
]

const tabs = ["All Patients", "Admitted", "Discharged", "Critical"]

export function PatientsTable() {
  const [activeTab, setActiveTab] = useState("All Patients")

  const filteredPatients = patients.filter((patient) => {
    if (activeTab === "All Patients") return true
    return patient.status === activeTab
  })

  const getStatusStyles = (status) => {
    switch (status) {
      case "Admitted":
        return "bg-[#DCFCE7] text-[#16A34A]"
      case "Discharged":
        return "bg-[#F1F5F9] text-[#64748B]"
      case "Critical":
        return "bg-[#FEE2E2] text-[#DC2626]"
      default:
        return "bg-[#F1F5F9] text-[#64748B]"
    }
  }

  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center border-b border-[#E2E8F0]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab
                    ? "border-black text-[#0F172A]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Customize Columns
            </Button>
            <Button size="sm" className="bg-black hover:bg-black/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F1F5F9] hover:bg-[#F1F5F9]">
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Patient ID</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Full Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Age</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Gender</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Phone</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Blood Group</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Arrival Time</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-[#64748B] font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.map((patient, index) => (
              <TableRow
                key={patient.id}
                className={cn(
                  "hover:bg-[#F8FAFC]",
                  index % 2 === 1 && "bg-[#F8FAFC]"
                )}
              >
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium text-[#0F172A]">{patient.id}</TableCell>
                <TableCell className="text-[#0F172A]">{patient.name}</TableCell>
                <TableCell className="text-[#64748B]">{patient.age}</TableCell>
                <TableCell className="text-[#64748B]">{patient.gender}</TableCell>
                <TableCell className="text-[#64748B]">{patient.phone}</TableCell>
                <TableCell className="text-[#64748B]">{patient.bloodGroup}</TableCell>
                <TableCell className="text-[#64748B]">{patient.arrivalTime}</TableCell>
                <TableCell className="text-[#64748B] text-xs">{patient.email}</TableCell>
                <TableCell>
                  <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusStyles(patient.status))}>
                    {patient.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button className="text-[#64748B] hover:text-[#0F172A]">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-[#64748B] hover:text-[#0F172A]">
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E2E8F0]">
          <p className="text-sm text-[#64748B]">Showing 1-8 of 248 patients</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="border-[#E2E8F0] bg-black text-white hover:bg-black/90">
              1
            </Button>
            <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]">
              2
            </Button>
            <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]">
              3
            </Button>
            <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

