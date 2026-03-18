// frontend/src/pages/admin/Patients.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { PatientsTable } from "@/components/admin/patients-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UserPlus } from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

export default function AdminPatients() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({ patientId: "", doctor: "", ward: "", reason: "" })

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") navigate("/admin/login")
  }, [])

  const handleAdmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      await api("/admission", {
        method: "POST",
        body: JSON.stringify(form),
      })
      setSuccess("Patient admitted successfully!")
      setForm({ patientId: "", doctor: "", ward: "", reason: "" })
      setTimeout(() => {
        setOpen(false)
        setSuccess("")
        window.location.reload()
      }, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Patients" />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A]">Patient Management</h2>
              <p className="text-sm text-[#64748B]">View, admit, and manage patients</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-black hover:bg-black/90 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Admit Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="text-[#0F172A]">Admit Patient</DialogTitle>
                </DialogHeader>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>
                )}
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">{success}</div>
                )}
                <form onSubmit={handleAdmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-[#0F172A]">Patient ID (MongoDB ObjectId)</Label>
                    <Input
                      placeholder="Paste patient ObjectId from QR scan..."
                      value={form.patientId}
                      onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                      className="h-10 border-[#E2E8F0]"
                      required
                    />
                    <p className="text-xs text-[#64748B]">Use the QR Scanner to get the patient ID</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-[#0F172A]">Doctor</Label>
                      <Input
                        placeholder="Dr. Smith"
                        value={form.doctor}
                        onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                        className="h-10 border-[#E2E8F0]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-[#0F172A]">Ward</Label>
                      <Input
                        placeholder="General / ICU"
                        value={form.ward}
                        onChange={(e) => setForm({ ...form, ward: e.target.value })}
                        className="h-10 border-[#E2E8F0]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-[#0F172A]">Reason for Admission</Label>
                    <Input
                      placeholder="e.g. Chest pain, routine checkup..."
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      className="h-10 border-[#E2E8F0]"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-black hover:bg-black/90 text-white">
                    {loading ? "Admitting..." : "Admit Patient"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <PatientsTable />
        </main>
      </div>
    </div>
  )
}
