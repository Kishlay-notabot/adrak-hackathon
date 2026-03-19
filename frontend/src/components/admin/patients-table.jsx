// frontend/src/components/admin/patients-table.jsx
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Eye, QrCode, ChevronLeft, ChevronRight, ArrowRightLeft } from "lucide-react"
import { api } from "@/lib/api"
import { QRCodeCanvas } from "@/components/qr-code"
import { ReferralModal } from "@/components/admin/referral-modal"

const tabs = ["All Patients", "Admitted", "Discharged", "Critical"]

export function PatientsTable() {
  const [activeTab, setActiveTab] = useState("All Patients")
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  // Modal state
  const [viewPatient, setViewPatient] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [qrPatient, setQrPatient] = useState(null)

  // Referral modal state
  const [referralPatient, setReferralPatient] = useState(null)
  const [referralAdmissionId, setReferralAdmissionId] = useState(null)

  useEffect(() => {
    setPage(1)
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

  const handleView = async (patientId) => {
    if (!patientId) return
    setViewLoading(true)
    try {
      const data = await api(`/patient/${patientId}`)
      setViewPatient(data)
    } catch (err) {
      console.error("Failed to load patient:", err.message)
    } finally {
      setViewLoading(false)
    }
  }

  const handleStatusChange = async (admissionId, newStatus) => {
    try {
      await api(`/admission/${admissionId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      fetchPatients()
      setViewPatient(null)
    } catch (err) {
      console.error("Failed to update status:", err.message)
    }
  }

  const handleOpenReferral = (patient, admissionId) => {
    setReferralPatient(patient)
    setReferralAdmissionId(admissionId || null)
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
    <>
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
                      <TableCell>
                        <span className={cn("px-2 py-1 rounded text-xs font-medium capitalize", getStatusStyles(patient.status))}>
                          {patient.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(patient.patientId)}
                            className="text-[#64748B] hover:text-[#0F172A]"
                            title="View patient details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setQrPatient(patient)}
                            className="text-[#64748B] hover:text-[#0F172A]"
                            title="View QR code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {(patient.status === "admitted" || patient.status === "critical") && (
                            <button
                              onClick={() => handleOpenReferral(
                                { _id: patient.patientId, name: patient.name, pid: patient.pid },
                                patient.admissionId
                              )}
                              className="text-[#64748B] hover:text-[#2563EB]"
                              title="Refer to another hospital"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
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

      {/* View Patient Detail Modal */}
      <Dialog open={!!viewPatient || viewLoading} onOpenChange={() => { setViewPatient(null); setViewLoading(false) }}>
        <DialogContent className="sm:max-w-lg bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A]">Patient Details</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="py-8 text-center text-[#64748B] text-sm">Loading patient data...</div>
          ) : viewPatient ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Full Name</p>
                  <p className="text-sm font-medium text-[#0F172A]">{viewPatient.name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">PID</p>
                  <p className="text-sm font-medium text-[#0F172A]">{viewPatient.pid}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Age</p>
                  <p className="text-sm font-medium text-[#0F172A]">{viewPatient.age || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Gender</p>
                  <p className="text-sm font-medium text-[#0F172A] capitalize">{viewPatient.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Blood Group</p>
                  <p className="text-sm font-medium text-[#0F172A]">{viewPatient.bloodGroup || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-sm font-medium text-[#0F172A]">{viewPatient.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm font-medium text-[#0F172A]">{viewPatient.email || "-"}</p>
                </div>
              </div>
              {viewPatient.allergies?.length > 0 && (
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Allergies</p>
                  <p className="text-sm font-medium text-[#0F172A]">{viewPatient.allergies.join(", ")}</p>
                </div>
              )}
              {viewPatient.medicalConditions?.length > 0 && (
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Medical Conditions</p>
                  <p className="text-sm font-medium text-[#0F172A]">{viewPatient.medicalConditions.join(", ")}</p>
                </div>
              )}
              {viewPatient.remarks?.length > 0 && (
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-2">Transfer Remarks</p>
                  <div className="space-y-2">
                    {viewPatient.remarks.map((r, i) => (
                      <div key={i} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-[#0F172A]">{r.hospitalId?.name || "Unknown"}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded capitalize",
                            r.urgency === "critical" ? "bg-red-100 text-red-700" :
                            r.urgency === "high" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-600"
                          )}>{r.urgency}</span>
                        </div>
                        <p className="text-sm text-[#64748B]">{r.note}</p>
                        {r.diagnosis && <p className="text-xs text-[#64748B] mt-1">Diagnosis: {r.diagnosis}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewPatient.admissions?.length > 0 && (
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide mb-2">Admission History (This Hospital)</p>
                  <div className="space-y-2">
                    {viewPatient.admissions.map((a) => (
                      <div key={a._id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="text-sm text-[#0F172A]">{formatDate(a.admittedAt)}</p>
                            <p className="text-xs text-[#64748B]">{[a.doctor, a.ward, a.reason].filter(Boolean).join(" · ")}</p>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium capitalize", getStatusStyles(a.status))}>
                            {a.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {a.status === "admitted" && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs h-7 border-[#E2E8F0]"
                                onClick={() => handleStatusChange(a._id, "discharged")}>
                                Discharge
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleStatusChange(a._id, "critical")}>
                                Mark Critical
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleOpenReferral(
                                  { _id: viewPatient._id, name: viewPatient.name, pid: viewPatient.pid },
                                  a._id
                                )}>
                                <ArrowRightLeft className="w-3 h-3 mr-1" />
                                Refer
                              </Button>
                            </>
                          )}
                          {a.status === "critical" && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs h-7 border-[#E2E8F0]"
                                onClick={() => handleStatusChange(a._id, "discharged")}>
                                Discharge
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 border-green-200 text-green-600 hover:bg-green-50"
                                onClick={() => handleStatusChange(a._id, "admitted")}>
                                Downgrade
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleOpenReferral(
                                  { _id: viewPatient._id, name: viewPatient.name, pid: viewPatient.pid },
                                  a._id
                                )}>
                                <ArrowRightLeft className="w-3 h-3 mr-1" />
                                Refer
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={!!qrPatient} onOpenChange={() => setQrPatient(null)}>
        <DialogContent className="sm:max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A]">Patient QR Code</DialogTitle>
          </DialogHeader>
          {qrPatient && (
            <div className="flex flex-col items-center py-4">
              <QRCodeCanvas value={qrPatient.patientId} size={200} />
              <p className="text-lg font-bold text-[#0F172A] mt-4">{qrPatient.name}</p>
              <p className="text-sm text-[#64748B]">{qrPatient.pid}</p>
              <p className="text-xs text-[#64748B] mt-4">
                This QR encodes the patient's ID for quick lookup
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Referral Modal */}
      <ReferralModal
        open={!!referralPatient}
        onOpenChange={(open) => { if (!open) { setReferralPatient(null); setReferralAdmissionId(null) } }}
        patient={referralPatient}
        admissionId={referralAdmissionId}
        onSuccess={() => {
          setReferralPatient(null)
          setReferralAdmissionId(null)
          fetchPatients()
        }}
      />
    </>
  )
}