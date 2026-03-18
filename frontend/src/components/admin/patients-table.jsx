import { useState, useEffect } from "react"
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
import { Eye, QrCode, ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/api"

const tabs = ["All Patients", "Admitted", "Discharged", "Critical"]

export function PatientsTable() {
  const [activeTab, setActiveTab] = useState("All Patients")
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    setPage(1) // reset to page 1 on tab change
  }, [activeTab])

  useEffect(() => {
    fetchPatients()
  }, [activeTab, page])

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const statusParam = activeTab === "All Patients" ? "all" : activeTab.toLowerCase()
      const data = await api(`/patient/list?status=${statusParam}&page=${page}&limit=${limit}`)
      setPatients(data.patients)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err) {
      console.error("Failed to load patients:", err.message)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusStyles = (status) => {
    switch (status) {
      case "admitted":
        return "bg-[#DCFCE7] text-[#16A34A]"
      case "discharged":
        return "bg-[#F1F5F9] text-[#64748B]"
      case "critical":
        return "bg-[#FEE2E2] text-[#DC2626]"
      default:
        return "bg-[#F1F5F9] text-[#64748B]"
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleString("en-IN", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
  }

  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

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
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="py-12 text-center text-[#64748B] text-sm">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="py-12 text-center text-[#64748B] text-sm">
            No patients found. Admit patients to see them here.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F1F5F9] hover:bg-[#F1F5F9]">
                  <TableHead className="w-12"><Checkbox /></TableHead>
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
                {patients.map((patient, index) => (
                  <TableRow
                    key={patient.admissionId}
                    className={cn("hover:bg-[#F8FAFC]", index % 2 === 1 && "bg-[#F8FAFC]")}
                  >
                    <TableCell><Checkbox /></TableCell>
                    <TableCell className="font-medium text-[#0F172A]">{patient.pid || "-"}</TableCell>
                    <TableCell className="text-[#0F172A]">{patient.name || "-"}</TableCell>
                    <TableCell className="text-[#64748B]">{patient.age || "-"}</TableCell>
                    <TableCell className="text-[#64748B] capitalize">{patient.gender || "-"}</TableCell>
                    <TableCell className="text-[#64748B]">{patient.phone || "-"}</TableCell>
                    <TableCell className="text-[#64748B]">{patient.bloodGroup || "-"}</TableCell>
                    <TableCell className="text-[#64748B]">{formatDate(patient.arrivalTime)}</TableCell>
                    <TableCell className="text-[#64748B] text-xs">{patient.email || "-"}</TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-1 rounded text-xs font-medium capitalize", getStatusStyles(patient.status))}>
                        {patient.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button className="text-[#64748B] hover:text-[#0F172A]"><Eye className="w-4 h-4" /></button>
                        <button className="text-[#64748B] hover:text-[#0F172A]"><QrCode className="w-4 h-4" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E2E8F0]">
              <p className="text-sm text-[#64748B]">
                Showing {startIndex}-{endIndex} of {total} patients
              </p>
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
  )
}