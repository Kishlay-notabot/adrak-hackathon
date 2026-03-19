// frontend/src/components/admin/referral-modal.jsx
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

/**
 * Modal for creating an inter-hospital referral.
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (open: boolean) => void
 *  - patient: { _id, name, pid }  (the patient being referred)
 *  - admissionId?: string          (optional — links referral to a specific admission)
 *  - onSuccess?: () => void        (called after successful creation)
 */
export function ReferralModal({ open, onOpenChange, patient, admissionId, onSuccess }) {
  const [hospitals, setHospitals] = useState([])
  const [hospitalsLoading, setHospitalsLoading] = useState(false)
  const [form, setForm] = useState({
    toHospitalId: "",
    reason: "",
    notes: "",
    urgency: "medium",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")

  // Fetch all hospitals in the network when the modal opens
  useEffect(() => {
    if (!open) return
    setError("")
    setSuccess("")
    setForm({ toHospitalId: "", reason: "", notes: "", urgency: "medium" })
    setSearch("")
    fetchHospitals()
  }, [open])

  const fetchHospitals = async () => {
    setHospitalsLoading(true)
    try {
      const data = await api("/hospital/all")
      setHospitals(data)
    } catch (err) {
      setError("Failed to load hospitals: " + err.message)
    } finally {
      setHospitalsLoading(false)
    }
  }

  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.address?.city?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.toHospitalId) {
      setError("Please select a hospital")
      return
    }
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      await api("/referral", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient._id,
          admissionId: admissionId || undefined,
          toHospitalId: form.toHospitalId,
          reason: form.reason || undefined,
          notes: form.notes || undefined,
          urgency: form.urgency,
        }),
      })
      setSuccess("Referral sent successfully!")
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
      }, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedHospital = hospitals.find((h) => h._id === form.toHospitalId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A]">Refer Patient</DialogTitle>
        </DialogHeader>

        {patient && (
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] mb-2">
            <p className="text-sm font-medium text-[#0F172A]">{patient.name}</p>
            <p className="text-xs text-[#64748B]">{patient.pid}</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hospital selector */}
          <div className="space-y-2">
            <Label className="text-sm text-[#0F172A]">Refer To Hospital</Label>
            <Input
              placeholder="Search hospitals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 border-[#E2E8F0]"
            />
            <div className="max-h-48 overflow-y-auto border border-[#E2E8F0] rounded-lg">
              {hospitalsLoading ? (
                <p className="text-sm text-[#64748B] p-3">Loading hospitals...</p>
              ) : filteredHospitals.length === 0 ? (
                <p className="text-sm text-[#64748B] p-3">
                  {hospitals.length === 0 ? "No other hospitals in the network yet." : "No hospitals match your search."}
                </p>
              ) : (
                filteredHospitals.map((h) => (
                  <button
                    type="button"
                    key={h._id}
                    onClick={() => setForm({ ...form, toHospitalId: h._id })}
                    className={`w-full text-left px-3 py-2.5 border-b border-[#F1F5F9] last:border-0 transition-colors ${
                      form.toHospitalId === h._id
                        ? "bg-black text-white"
                        : "hover:bg-[#F8FAFC] text-[#0F172A]"
                    }`}
                  >
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className={`text-xs ${form.toHospitalId === h._id ? "text-white/70" : "text-[#64748B]"}`}>
                      {[h.address?.city, h.address?.state].filter(Boolean).join(", ")}
                      {h.phone && ` · ${h.phone}`}
                    </p>
                  </button>
                ))
              )}
            </div>
            {selectedHospital && (
              <p className="text-xs text-[#16A34A]">
                Selected: {selectedHospital.name}
              </p>
            )}
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label className="text-sm text-[#0F172A]">Urgency</Label>
            <select
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-sm text-[#0F172A]">Reason for Referral</Label>
            <Input
              placeholder="e.g. Requires cardiac surgery, ICU not available..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="h-10 border-[#E2E8F0]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm text-[#0F172A]">Additional Notes</Label>
            <textarea
              placeholder="Clinical notes, current condition, medications..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !form.toHospitalId}
            className="w-full bg-black hover:bg-black/90 text-white"
          >
            {loading ? "Sending Referral..." : "Send Referral"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}