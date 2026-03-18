import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, Camera, AlertCircle, Loader2 } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"

/**
 * Extracts the patient Mongo _id from whatever the QR encodes.
 * Supports:
 *   - full URL:  https://domain.com/patient/6654abc...
 *   - path only: /patient/6654abc...
 *   - raw id:    6654abc...
 */
function extractPatientId(raw) {
  const trimmed = raw.trim()

  // URL or path containing /patient/:id
  const match = trimmed.match(/\/patient\/([a-f0-9]{24})/i)
  if (match) return match[1]

  // Raw 24-char hex ObjectId
  if (/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed

  return null
}

export function QRScannerModal({ trigger }) {
  const [open, setOpen] = useState(false)
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const scannerRef = useRef(null)
  const containerRef = useRef(null)

  // ── Start camera scanner when dialog opens ──────────────────────
  useEffect(() => {
    if (!open) return

    let scanner = null

    async function startScanner() {
      // Dynamically import so the page doesn't break if the lib is missing
      const { Html5Qrcode } = await import("html5-qrcode")

      // Small delay to let the DOM element mount
      await new Promise((r) => setTimeout(r, 300))

      if (!containerRef.current) return

      scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          onScanSuccess,
          () => {} // ignore scan failures (no QR in frame)
        )
        setCameraReady(true)
      } catch (err) {
        console.warn("Camera start failed:", err)
        setError("camera")
      }
    }

    startScanner()

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {})
      }
      scannerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Handle a successful QR decode ───────────────────────────────
  async function onScanSuccess(decoded) {
    // Stop camera immediately so it doesn't keep firing
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {})
    }

    const patientId = extractPatientId(decoded)
    if (!patientId) {
      setError("invalid")
      return
    }

    await fetchPatient(patientId)
  }

  // ── Fetch patient from backend ──────────────────────────────────
  async function fetchPatient(id) {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("token") // admin JWT
      const res = await fetch(`${API_BASE}/api/patient/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Status ${res.status}`)
      }

      const data = await res.json()
      setPatient(data)
    } catch (err) {
      console.error("Fetch patient failed:", err)
      setError(err.message || "fetch")
    } finally {
      setLoading(false)
    }
  }

  // ── Reset everything when dialog closes ─────────────────────────
  function handleOpenChange(isOpen) {
    if (!isOpen) {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
      setPatient(null)
      setError(null)
      setLoading(false)
      setCameraReady(false)
    }
    setOpen(isOpen)
  }

  // ── Simulate scan (dev / fallback) ──────────────────────────────
  function handleSimulatedScan() {
    const fakeId = prompt("Enter patient MongoDB _id (24-char hex):")
    if (fakeId) {
      const id = extractPatientId(fakeId)
      if (id) fetchPatient(id)
      else setError("invalid")
    }
  }

  // ── Format date helper ──────────────────────────────────────────
  function fmt(dateStr) {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-[#E2E8F0]">
            <QrCode className="w-4 h-4 mr-2" />
            Scan QR
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A]">Scan Patient QR Code</DialogTitle>
        </DialogHeader>

        {/* ── LOADING STATE ─────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0F172A]" />
            <p className="text-[#64748B] text-sm mt-4">Fetching patient info…</p>
          </div>
        )}

        {/* ── ERROR STATE ───────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            {error === "camera" ? (
              <>
                <p className="text-sm font-medium text-[#0F172A]">Camera access denied</p>
                <p className="text-xs text-[#64748B] mt-1 max-w-xs">
                  Allow camera permissions in your browser, or enter the patient ID manually.
                </p>
              </>
            ) : error === "invalid" ? (
              <>
                <p className="text-sm font-medium text-[#0F172A]">Invalid QR code</p>
                <p className="text-xs text-[#64748B] mt-1">
                  The scanned code doesn't contain a valid patient ID.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[#0F172A]">Could not load patient</p>
                <p className="text-xs text-[#64748B] mt-1">{error}</p>
              </>
            )}
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-[#E2E8F0]"
                onClick={() => {
                  setError(null)
                  setOpen(false)
                  setTimeout(() => setOpen(true), 200) // re-mount camera
                }}
              >
                Try again
              </Button>
              <Button
                size="sm"
                className="bg-black hover:bg-black/90 text-white"
                onClick={handleSimulatedScan}
              >
                Enter ID manually
              </Button>
            </div>
          </div>
        )}

        {/* ── CAMERA / SCANNER VIEW ─────────────────────────────── */}
        {!loading && !error && !patient && (
          <div className="flex flex-col items-center py-6">
            {/* html5-qrcode renders the video feed inside this div */}
            <div
              ref={containerRef}
              id="qr-reader"
              className="w-64 h-64 rounded-xl overflow-hidden bg-[#0F172A] relative"
            >
              {/* Corner brackets (shown on top of video) */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute top-3 left-3 w-7 h-7 border-l-[3px] border-t-[3px] border-white rounded-tl-md" />
                <div className="absolute top-3 right-3 w-7 h-7 border-r-[3px] border-t-[3px] border-white rounded-tr-md" />
                <div className="absolute bottom-3 left-3 w-7 h-7 border-l-[3px] border-b-[3px] border-white rounded-bl-md" />
                <div className="absolute bottom-3 right-3 w-7 h-7 border-r-[3px] border-b-[3px] border-white rounded-br-md" />
              </div>
              {/* Placeholder pulse while camera initializes */}
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <Camera className="w-10 h-10 text-white/30 animate-pulse" />
                </div>
              )}
            </div>

            <p className="text-[#64748B] text-sm mt-5">
              Point the camera at the patient's QR code
            </p>

            <button
              onClick={handleSimulatedScan}
              className="text-xs text-[#94A3B8] mt-3 underline underline-offset-2 hover:text-[#64748B] transition-colors"
            >
              Or enter patient ID manually
            </button>
          </div>
        )}

        {/* ── PATIENT INFO (after successful scan) ──────────────── */}
        {!loading && !error && patient && (
          <div className="py-4">
            <div className="flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Name</p>
                  <p className="text-sm font-medium text-[#0F172A]">{patient.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Age</p>
                    <p className="text-sm font-medium text-[#0F172A]">{patient.age ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Gender</p>
                    <p className="text-sm font-medium text-[#0F172A] capitalize">
                      {patient.gender ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Blood Group</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {patient.bloodGroup ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Phone</p>
                    <p className="text-sm font-medium text-[#0F172A]">{patient.phone ?? "—"}</p>
                  </div>
                </div>
                {patient.medicalConditions?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">
                      Medical Conditions
                    </p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {patient.medicalConditions.join(", ")}
                    </p>
                  </div>
                )}
                {patient.allergies?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Allergies</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {patient.allergies.join(", ")}
                    </p>
                  </div>
                )}
                {patient.admissions?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">
                      Last Admission
                    </p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {fmt(patient.admissions[0].admittedAt)}
                      {patient.admissions[0].ward &&
                        ` · ${patient.admissions[0].ward}`}
                      {patient.admissions[0].doctor &&
                        ` · ${patient.admissions[0].doctor}`}
                    </p>
                  </div>
                )}
              </div>

              {/* QR + PID badge */}
              <div className="w-28 shrink-0 flex flex-col items-center">
                <div className="w-28 h-28 bg-[#F1F5F9] rounded-lg flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-[#94A3B8]" />
                </div>
                <p className="text-xs font-mono text-[#64748B] mt-2">{patient.pid}</p>
              </div>
            </div>

            {/* Remarks preview */}
            {patient.remarks?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
                <p className="text-xs text-[#64748B] uppercase tracking-wide mb-2">
                  Recent Remarks ({patient.remarks.length})
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {patient.remarks.slice(-3).reverse().map((r, i) => (
                    <div key={i} className="text-xs bg-[#F8FAFC] rounded-md p-2">
                      <span className="font-medium text-[#0F172A]">{r.note}</span>
                      {r.diagnosis && (
                        <span className="text-[#64748B]"> · {r.diagnosis}</span>
                      )}
                      {r.urgency && r.urgency !== "low" && (
                        <span
                          className={`ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            r.urgency === "critical"
                              ? "bg-red-100 text-red-700"
                              : r.urgency === "high"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {r.urgency}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full mt-5 bg-black hover:bg-black/90 text-white"
              onClick={() => window.print()}
            >
              Print Patient Info
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}