import { useState } from "react"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"

export default function QRScannerPage() {
  const [scanned, setScanned] = useState(false)
  const [patient, setPatient] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [manualId, setManualId] = useState("")

  // In production this would use a camera QR library.
  // For now, admin types or pastes the patient ObjectId.
  const handleLookup = async (patientId) => {
    if (!patientId) return
    setError("")
    setLoading(true)
    try {
      const data = await api(`/patient/${patientId}`)
      setPatient(data)
      setScanned(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setScanned(false)
    setPatient(null)
    setError("")
    setManualId("")
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="QR Scanner" />
        <main className="p-6">
          <Card className="bg-white border-[#E2E8F0] shadow-sm max-w-2xl mx-auto">
            <CardContent className="p-8">
              {!scanned ? (
                <div className="flex flex-col items-center">
                  <h2 className="text-xl font-semibold text-[#0F172A] mb-6">Scan Patient QR Code</h2>
                  <div
                    className="relative w-72 h-72 bg-[#0F172A] rounded-xl flex items-center justify-center mb-6"
                  >
                    <div className="absolute top-4 left-4 w-10 h-10 border-l-4 border-t-4 border-white rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-10 h-10 border-r-4 border-t-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-10 h-10 border-l-4 border-b-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-10 h-10 border-r-4 border-b-4 border-white rounded-br-lg" />
                    <div className="w-56 h-0.5 bg-white/50 animate-pulse" />
                  </div>

                  <p className="text-[#64748B] text-sm mb-4">Or enter Patient ID manually:</p>

                  <div className="flex gap-2 w-full max-w-xs">
                    <Input
                      placeholder="Paste patient ObjectId..."
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      className="h-10 border-[#E2E8F0]"
                    />
                    <Button
                      onClick={() => handleLookup(manualId)}
                      disabled={loading || !manualId}
                      className="bg-black hover:bg-black/90 text-white h-10"
                    >
                      {loading ? "..." : "Look Up"}
                    </Button>
                  </div>

                  {error && (
                    <p className="text-red-600 text-sm mt-4">{error}</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[#0F172A]">Patient Information</h2>
                    <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]" onClick={handleReset}>
                      Scan Another
                    </Button>
                  </div>
                  {patient && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Full Name</p>
                        <p className="text-base font-medium text-[#0F172A]">{patient.name}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">PID</p>
                          <p className="text-base font-medium text-[#0F172A]">{patient.pid}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Age</p>
                          <p className="text-base font-medium text-[#0F172A]">{patient.age || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Gender</p>
                          <p className="text-base font-medium text-[#0F172A] capitalize">{patient.gender || "-"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Blood Group</p>
                          <p className="text-base font-medium text-[#0F172A]">{patient.bloodGroup || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Phone</p>
                          <p className="text-base font-medium text-[#0F172A]">{patient.phone || "-"}</p>
                        </div>
                      </div>
                      {patient.allergies?.length > 0 && (
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Allergies</p>
                          <p className="text-base font-medium text-[#0F172A]">{patient.allergies.join(", ")}</p>
                        </div>
                      )}
                      {patient.medicalConditions?.length > 0 && (
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Medical Conditions</p>
                          <p className="text-base font-medium text-[#0F172A]">{patient.medicalConditions.join(", ")}</p>
                        </div>
                      )}

                      {/* Remarks from other hospitals */}
                      {patient.remarks?.length > 0 && (
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-2">Transfer Remarks</p>
                          <div className="space-y-3">
                            {patient.remarks.map((r, i) => (
                              <div key={i} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm font-medium text-[#0F172A]">
                                    {r.hospitalId?.name || "Unknown Hospital"}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                                    r.urgency === "critical" ? "bg-red-100 text-red-700" :
                                    r.urgency === "high" ? "bg-orange-100 text-orange-700" :
                                    "bg-gray-100 text-gray-600"
                                  }`}>{r.urgency}</span>
                                </div>
                                <p className="text-sm text-[#64748B]">{r.note}</p>
                                {r.diagnosis && <p className="text-xs text-[#64748B] mt-1">Diagnosis: {r.diagnosis}</p>}
                                {r.referredTo && <p className="text-xs text-[#2563EB] mt-1">Referred to: {r.referredTo.name}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}