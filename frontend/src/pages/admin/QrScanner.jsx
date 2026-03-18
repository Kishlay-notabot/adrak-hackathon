// frontend/src/pages/admin/QrScanner.jsx
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QRCodeCanvas } from "@/components/qr-code"
import { Camera, AlertCircle } from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

/**
 * Extracts a 24-char hex Mongo ObjectId from whatever the QR encodes.
 * Handles full URLs, paths like /patient/:id, or raw ObjectIds.
 */
function extractPatientId(raw) {
  const trimmed = raw.trim()
  const match = trimmed.match(/(?:\/patient\/)?([a-f0-9]{24})/i)
  return match ? match[1] : null
}

export default function QRScannerPage() {
  const navigate = useNavigate()
  const [scanned, setScanned] = useState(false)
  const [patient, setPatient] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [manualId, setManualId] = useState("")

  // Camera state
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const scannerRef = useRef(null)

  const [showRemarkForm, setShowRemarkForm] = useState(false)
  const [remarkForm, setRemarkForm] = useState({ note: "", diagnosis: "", urgency: "low" })
  const [remarkLoading, setRemarkLoading] = useState(false)
  const [remarkSuccess, setRemarkSuccess] = useState("")

  const [showAdmitForm, setShowAdmitForm] = useState(false)
  const [admitForm, setAdmitForm] = useState({ doctor: "", ward: "", reason: "" })
  const [admitLoading, setAdmitLoading] = useState(false)
  const [admitSuccess, setAdmitSuccess] = useState("")

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") navigate("/admin/login")
  }, [])

  // ── Start camera when page is in scan mode ──────────────────────
  useEffect(() => {
    if (scanned) return

    let scanner = null
    let cancelled = false

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")

        // Wait longer for DOM to settle (React 19 Strict Mode double-mounts)
        await new Promise((r) => setTimeout(r, 600))
        if (cancelled) return

        const el = document.getElementById("qr-reader")
        if (!el) return

        // Clear any leftover children from a previous mount/unmount cycle
        // html5-qrcode injects <video> and other elements that persist across
        // React Strict Mode's mount → unmount → remount in dev
        el.innerHTML = ""

        scanner = new Html5Qrcode("qr-reader", { verbose: false })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1,
          },
          onScanSuccess,
          () => {} // ignore per-frame misses
        )

        if (!cancelled) {
          setCameraReady(true)
          setCameraError("")
        } else {
          // If cancelled during await, clean up immediately
          if (scanner.isScanning) scanner.stop().catch(() => {})
        }
      } catch (err) {
        // Ignore abort errors from cleanup racing with start
        if (cancelled) return
        const msg = typeof err === "string" ? err : err?.message || ""
        if (msg.includes("AbortError") || msg.includes("aborted")) return
        console.warn("Camera start failed:", err)
        if (!cancelled) {
          setCameraError(msg || "Could not access camera")
        }
      }
    }

    startScanner()

    return () => {
      cancelled = true
      if (scanner) {
        try {
          if (scanner.isScanning) scanner.stop().catch(() => {})
        } catch {
          // scanner may already be in a bad state, ignore
        }
      }
      scannerRef.current = null
      setCameraReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanned])

  // ── QR decoded ──────────────────────────────────────────────────
  const scanHandledRef = useRef(false)

  async function onScanSuccess(decoded) {
    // Prevent duplicate fires while stop() is in-flight
    if (scanHandledRef.current) return
    scanHandledRef.current = true

    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {})
      setCameraReady(false)
    }

    const patientId = extractPatientId(decoded)
    if (patientId) {
      handleLookup(patientId)
    } else {
      setError("Scanned QR does not contain a valid patient ID")
      scanHandledRef.current = false // allow retry
    }
  }

  // ── Fetch patient ───────────────────────────────────────────────
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

  // ── Reset (go back to scanner) ─────────────────────────────────
  const handleReset = () => {
    scanHandledRef.current = false
    setScanned(false)
    setPatient(null)
    setError("")
    setManualId("")
    setShowRemarkForm(false)
    setShowAdmitForm(false)
    setRemarkSuccess("")
    setAdmitSuccess("")
    setCameraError("")
    setCameraReady(false)
  }

  // ── Add remark ──────────────────────────────────────────────────
  const handleAddRemark = async (e) => {
    e.preventDefault()
    setRemarkLoading(true)
    try {
      await api(`/patient/${patient._id}/remarks`, {
        method: "POST",
        body: JSON.stringify(remarkForm),
      })
      setRemarkSuccess("Remark added successfully!")
      setRemarkForm({ note: "", diagnosis: "", urgency: "low" })
      setShowRemarkForm(false)
      const updated = await api(`/patient/${patient._id}`)
      setPatient(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setRemarkLoading(false)
    }
  }

  // ── Admit patient ───────────────────────────────────────────────
  const handleAdmit = async (e) => {
    e.preventDefault()
    setAdmitLoading(true)
    try {
      await api("/admission", {
        method: "POST",
        body: JSON.stringify({ patientId: patient._id, ...admitForm }),
      })
      setAdmitSuccess("Patient admitted successfully!")
      setAdmitForm({ doctor: "", ward: "", reason: "" })
      setShowAdmitForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setAdmitLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="QR Scanner" />
        <main className="flex-1 overflow-auto p-6">
          <Card className="bg-white border-[#E2E8F0] shadow-sm max-w-2xl mx-auto">
            <CardContent className="p-8">
              {!scanned ? (
                <div className="flex flex-col items-center">
                  <h2 className="text-xl font-semibold text-[#0F172A] mb-6">Scan Patient QR Code</h2>

                  {/* ── Camera viewfinder ──────────────────────────── */}
                  {/* Hide html5-qrcode's default UI (file upload, camera swap, border) */}
                  <style>{`
                    #qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
                    #qr-reader img[alt="Info icon"] { display: none !important; }
                    #qr-reader__dashboard { display: none !important; }
                    #qr-reader__scan_region > img { display: none !important; }
                    #qr-reader { border: none !important; }
                    #qr-reader__scan_region { position: absolute !important; inset: 0 !important; min-height: 0 !important; }
                  `}</style>
                  <div className="relative w-72 h-72 rounded-xl overflow-hidden mb-6">
                    {/* html5-qrcode MUST have an empty div — it injects its own children */}
                    <div
                      id="qr-reader"
                      className="absolute inset-0 bg-[#0F172A]"
                    />

                    {/* Corner brackets overlay (always on top of video) */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      <div className="absolute top-4 left-4 w-10 h-10 border-l-4 border-t-4 border-white rounded-tl-lg" />
                      <div className="absolute top-4 right-4 w-10 h-10 border-r-4 border-t-4 border-white rounded-tr-lg" />
                      <div className="absolute bottom-4 left-4 w-10 h-10 border-l-4 border-b-4 border-white rounded-bl-lg" />
                      <div className="absolute bottom-4 right-4 w-10 h-10 border-r-4 border-b-4 border-white rounded-br-lg" />
                    </div>

                    {/* Loading placeholder while camera initializes */}
                    {!cameraReady && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                        <Camera className="w-10 h-10 text-white/30 animate-pulse" />
                        <p className="text-white/40 text-xs mt-2">Starting camera…</p>
                      </div>
                    )}

                    {/* Camera error state */}
                    {cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-6">
                        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                        <p className="text-white/70 text-xs text-center leading-relaxed">
                          {cameraError}
                        </p>
                        <p className="text-white/40 text-[10px] mt-2 text-center">
                          Use manual entry below instead
                        </p>
                      </div>
                    )}
                  </div>

                  {cameraReady && (
                    <p className="text-green-600 text-xs mb-3 font-medium">
                      Camera active — point at a patient QR code
                    </p>
                  )}

                  <p className="text-[#64748B] text-sm mb-2">Enter Patient ID manually:</p>
                  <p className="text-xs text-[#64748B] mb-3">
                    The patient's QR code encodes their ID. Ask the patient to show their QR from the MediCore app.
                  </p>

                  <div className="flex gap-2 w-full max-w-sm">
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

                  {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[#0F172A]">Patient Information</h2>
                    <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]" onClick={handleReset}>
                      Scan Another
                    </Button>
                  </div>

                  {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
                  {remarkSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">{remarkSuccess}</div>}
                  {admitSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">{admitSuccess}</div>}

                  {patient && (
                    <div className="space-y-5">
                      <div className="flex gap-6">
                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Full Name</p>
                            <p className="text-base font-medium text-[#0F172A]">{patient.name}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">PID</p>
                              <p className="text-sm font-medium text-[#0F172A]">{patient.pid}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Age</p>
                              <p className="text-sm font-medium text-[#0F172A]">{patient.age || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Gender</p>
                              <p className="text-sm font-medium text-[#0F172A] capitalize">{patient.gender || "-"}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Blood Group</p>
                              <p className="text-sm font-medium text-[#0F172A]">{patient.bloodGroup || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Phone</p>
                              <p className="text-sm font-medium text-[#0F172A]">{patient.phone || "-"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-28 h-28 bg-[#F1F5F9] rounded-lg p-2 flex items-center justify-center">
                            <QRCodeCanvas value={patient._id} size={96} />
                          </div>
                          <p className="text-xs text-[#64748B] text-center mt-2">{patient.pid}</p>
                        </div>
                      </div>

                      {patient.allergies?.length > 0 && (
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Allergies</p>
                          <p className="text-sm font-medium text-[#0F172A]">{patient.allergies.join(", ")}</p>
                        </div>
                      )}
                      {patient.medicalConditions?.length > 0 && (
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Medical Conditions</p>
                          <p className="text-sm font-medium text-[#0F172A]">{patient.medicalConditions.join(", ")}</p>
                        </div>
                      )}

                      {patient.remarks?.length > 0 && (
                        <div>
                          <p className="text-xs text-[#64748B] uppercase tracking-wide mb-2">Transfer Remarks</p>
                          <div className="space-y-3">
                            {patient.remarks.map((r, i) => (
                              <div key={i} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm font-medium text-[#0F172A]">{r.hospitalId?.name || "Unknown Hospital"}</span>
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

                      <div className="flex gap-3 pt-2">
                        <Button className="flex-1 bg-black hover:bg-black/90 text-white" onClick={() => { setShowAdmitForm(true); setShowRemarkForm(false) }}>
                          Admit Patient
                        </Button>
                        <Button variant="outline" className="flex-1 border-[#E2E8F0]" onClick={() => { setShowRemarkForm(true); setShowAdmitForm(false) }}>
                          Add Remark
                        </Button>
                      </div>

                      {showAdmitForm && (
                        <form onSubmit={handleAdmit} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-3">
                          <p className="text-sm font-medium text-[#0F172A]">Admit Patient</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Doctor</Label>
                              <Input placeholder="Dr. Smith" value={admitForm.doctor}
                                onChange={(e) => setAdmitForm({ ...admitForm, doctor: e.target.value })}
                                className="h-9 border-[#E2E8F0]" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Ward</Label>
                              <Input placeholder="General / ICU" value={admitForm.ward}
                                onChange={(e) => setAdmitForm({ ...admitForm, ward: e.target.value })}
                                className="h-9 border-[#E2E8F0]" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Reason</Label>
                            <Input placeholder="Reason for admission" value={admitForm.reason}
                              onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })}
                              className="h-9 border-[#E2E8F0]" />
                          </div>
                          <Button type="submit" disabled={admitLoading} className="w-full bg-black hover:bg-black/90 text-white h-9">
                            {admitLoading ? "Admitting..." : "Confirm Admission"}
                          </Button>
                        </form>
                      )}

                      {showRemarkForm && (
                        <form onSubmit={handleAddRemark} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-3">
                          <p className="text-sm font-medium text-[#0F172A]">Add Remark</p>
                          <div className="space-y-1">
                            <Label className="text-xs">Note</Label>
                            <Input placeholder="Clinical notes..." value={remarkForm.note}
                              onChange={(e) => setRemarkForm({ ...remarkForm, note: e.target.value })}
                              className="h-9 border-[#E2E8F0]" required />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Diagnosis</Label>
                              <Input placeholder="Optional" value={remarkForm.diagnosis}
                                onChange={(e) => setRemarkForm({ ...remarkForm, diagnosis: e.target.value })}
                                className="h-9 border-[#E2E8F0]" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Urgency</Label>
                              <select value={remarkForm.urgency}
                                onChange={(e) => setRemarkForm({ ...remarkForm, urgency: e.target.value })}
                                className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                              </select>
                            </div>
                          </div>
                          <Button type="submit" disabled={remarkLoading} className="w-full bg-black hover:bg-black/90 text-white h-9">
                            {remarkLoading ? "Saving..." : "Save Remark"}
                          </Button>
                        </form>
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