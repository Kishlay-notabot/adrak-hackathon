// frontend/src/pages/admin/Patients.jsx
// MODIFIED — new "Add Patient" form (name/phone/email), search patients, share credentials
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
import {
  UserPlus,
  Search,
  QrCode,
  Copy,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

export default function AdminPatients() {
  const navigate = useNavigate()

  // ── Add Patient dialog ────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [addStep, setAddStep] = useState("form") // form | credentials | admit
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState("")
  const [newPatient, setNewPatient] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [copied, setCopied] = useState(false)
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    bloodGroup: "",
    password: "",
  })

  // ── Admit dialog (after creating or finding patient) ──
  const [admitOpen, setAdmitOpen] = useState(false)
  const [admitPatient, setAdmitPatient] = useState(null)
  const [admitForm, setAdmitForm] = useState({ doctor: "", ward: "", reason: "" })
  const [admitLoading, setAdmitLoading] = useState(false)
  const [admitSuccess, setAdmitSuccess] = useState("")
  const [admitError, setAdmitError] = useState("")

  // ── Search ────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") navigate("/admin/login")
  }, [])

  // ── Add patient handler ───────────────────────────────
  const handleAddPatient = async (e) => {
    e.preventDefault()
    setAddError("")
    setAddLoading(true)
    try {
      const body = {
        name: addForm.name,
        email: addForm.email,
        phone: addForm.phone,
      }
      if (addForm.age) body.age = parseInt(addForm.age)
      if (addForm.gender) body.gender = addForm.gender
      if (addForm.bloodGroup) body.bloodGroup = addForm.bloodGroup
      if (addForm.password) body.password = addForm.password

      const data = await api("/patient/register-by-admin", {
        method: "POST",
        body: JSON.stringify(body),
      })

      setNewPatient(data.patient)
      setCredentials(data.credentials)
      setAddStep("credentials")
    } catch (err) {
      // If patient already exists, show the existing patient info
      if (err.message === "Email already registered") {
        setAddError("This email is already registered. Use Search to find the patient.")
      } else {
        setAddError(err.message)
      }
    } finally {
      setAddLoading(false)
    }
  }

  const handleCopyCredentials = () => {
    if (!credentials) return
    const text = `medflow Login Credentials\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nLogin at: ${window.location.origin}/patient/login`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleAdmitFromAdd = () => {
    setAdmitPatient(newPatient)
    setAddOpen(false)
    setAdmitOpen(true)
    resetAddForm()
  }

  const resetAddForm = () => {
    setAddForm({ name: "", email: "", phone: "", age: "", gender: "", bloodGroup: "", password: "" })
    setAddStep("form")
    setAddError("")
    setNewPatient(null)
    setCredentials(null)
    setCopied(false)
  }

  // ── Search handler ────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await api("/patient/search", {
        method: "POST",
        body: JSON.stringify({ query: searchQuery }),
      })
      setSearchResults(results)
    } catch (err) {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectPatientFromSearch = (patient) => {
    setAdmitPatient(patient)
    setSearchOpen(false)
    setAdmitOpen(true)
    setSearchQuery("")
    setSearchResults([])
  }

  // ── Admit handler ─────────────────────────────────────
  const handleAdmit = async (e) => {
    e.preventDefault()
    setAdmitError("")
    setAdmitLoading(true)
    try {
      await api("/admission", {
        method: "POST",
        body: JSON.stringify({ patientId: admitPatient.id || admitPatient._id, ...admitForm }),
      })
      setAdmitSuccess("Patient admitted successfully!")
      setAdmitForm({ doctor: "", ward: "", reason: "" })
      setTimeout(() => {
        setAdmitOpen(false)
        setAdmitSuccess("")
        setAdmitPatient(null)
        window.location.reload()
      }, 1200)
    } catch (err) {
      setAdmitError(err.message)
    } finally {
      setAdmitLoading(false)
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
              <p className="text-sm text-[#64748B]">Register, search, admit, and manage patients</p>
            </div>
            <div className="flex gap-2">
              {/* Search Patient */}
              <Dialog open={searchOpen} onOpenChange={(v) => { setSearchOpen(v); if (!v) { setSearchQuery(""); setSearchResults([]) } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[#E2E8F0] text-[#64748B]">
                    <Search className="w-4 h-4 mr-2" />
                    Find &amp; Admit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-[#0F172A]">Find Patient</DialogTitle>
                  </DialogHeader>
                  <p className="text-xs text-[#64748B] -mt-2">
                    Search by name, email, phone, or PID
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search patients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-10 border-[#E2E8F0]"
                    />
                    <Button onClick={handleSearch} disabled={searching} className="bg-black hover:bg-black/90 text-white h-10">
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                    </Button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {searchResults.map((p) => (
                        <div
                          key={p._id}
                          className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] hover:border-[#0F172A] cursor-pointer transition-colors"
                          onClick={() => selectPatientFromSearch(p)}
                        >
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{p.name}</p>
                            <p className="text-xs text-[#64748B]">
                              {p.pid} · {p.phone} · {p.email}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#64748B]" />
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.length === 0 && searchQuery && !searching && (
                    <p className="text-xs text-[#64748B] text-center py-4">
                      No patients found. Try a different search or register a new patient.
                    </p>
                  )}
                </DialogContent>
              </Dialog>

              {/* QR Scanner shortcut */}
              <Button variant="outline" className="border-[#E2E8F0] text-[#64748B]" onClick={() => navigate("/admin/qr-scanner")}>
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR
              </Button>

              {/* Add New Patient */}
              <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetAddForm() }}>
                <DialogTrigger asChild>
                  <Button className="bg-black hover:bg-black/90 text-white">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Patient
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-[#0F172A]">
                      {addStep === "form" ? "Register New Patient" : "Patient Created"}
                    </DialogTitle>
                  </DialogHeader>

                  {/* ── Step 1: Registration Form ────────────── */}
                  {addStep === "form" && (
                    <>
                      {addError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                          {addError}
                        </div>
                      )}
                      <form onSubmit={handleAddPatient} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2">
                            <Label className="text-sm text-[#0F172A]">Full Name *</Label>
                            <Input
                              placeholder="Patient's full name"
                              value={addForm.name}
                              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                              className="h-10 border-[#E2E8F0]"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-[#0F172A]">Email *</Label>
                            <Input
                              type="email"
                              placeholder="patient@email.com"
                              value={addForm.email}
                              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                              className="h-10 border-[#E2E8F0]"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-[#0F172A]">Phone *</Label>
                            <Input
                              placeholder="9876543210"
                              value={addForm.phone}
                              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                              className="h-10 border-[#E2E8F0]"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-[#0F172A]">Age</Label>
                            <Input
                              type="number"
                              placeholder="35"
                              value={addForm.age}
                              onChange={(e) => setAddForm({ ...addForm, age: e.target.value })}
                              className="h-10 border-[#E2E8F0]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-[#0F172A]">Gender</Label>
                            <select
                              value={addForm.gender}
                              onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                              className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm"
                            >
                              <option value="">Select</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-[#0F172A]">Blood Group</Label>
                            <select
                              value={addForm.bloodGroup}
                              onChange={(e) => setAddForm({ ...addForm, bloodGroup: e.target.value })}
                              className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm"
                            >
                              <option value="">Select</option>
                              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-[#0F172A]">
                              Password <span className="text-[#64748B] text-xs">(auto-generated if empty)</span>
                            </Label>
                            <Input
                              placeholder="Leave blank to auto-generate"
                              value={addForm.password}
                              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                              className="h-10 border-[#E2E8F0]"
                            />
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={addLoading}
                          className="w-full bg-black hover:bg-black/90 text-white"
                        >
                          {addLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                          ) : (
                            <><UserPlus className="w-4 h-4 mr-2" /> Register Patient</>
                          )}
                        </Button>
                      </form>
                    </>
                  )}

                  {/* ── Step 2: Show Credentials ─────────────── */}
                  {addStep === "credentials" && newPatient && credentials && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <p className="text-sm text-green-800">
                          Patient <strong>{newPatient.name}</strong> registered successfully with PID{" "}
                          <strong>{newPatient.pid}</strong>
                        </p>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <p className="text-xs text-[#64748B] uppercase tracking-wider mb-3 font-medium">
                          Login Credentials — share with patient
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#64748B]">Email:</span>
                            <span className="text-sm font-mono font-medium text-[#0F172A]">
                              {credentials.email}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#64748B]">Password:</span>
                            <span className="text-sm font-mono font-medium text-[#0F172A] bg-yellow-100 px-2 py-0.5 rounded">
                              {credentials.password}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full border-[#E2E8F0]"
                          onClick={handleCopyCredentials}
                        >
                          {copied ? (
                            <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Copied!</>
                          ) : (
                            <><Copy className="w-4 h-4 mr-2" /> Copy Credentials</>
                          )}
                        </Button>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          className="flex-1 bg-black hover:bg-black/90 text-white"
                          onClick={handleAdmitFromAdd}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Admit Now
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-[#E2E8F0]"
                          onClick={() => { setAddOpen(false); resetAddForm() }}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── Admit Patient Dialog ──────────────────────── */}
          <Dialog open={admitOpen} onOpenChange={(v) => { setAdmitOpen(v); if (!v) { setAdmitPatient(null); setAdmitSuccess(""); setAdmitError("") } }}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-[#0F172A]">Admit Patient</DialogTitle>
              </DialogHeader>
              {admitPatient && (
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] mb-2">
                  <p className="text-sm font-medium text-[#0F172A]">{admitPatient.name}</p>
                  <p className="text-xs text-[#64748B]">
                    {admitPatient.pid} · {admitPatient.phone || admitPatient.email}
                  </p>
                </div>
              )}
              {admitError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                  {admitError}
                </div>
              )}
              {admitSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">
                  {admitSuccess}
                </div>
              )}
              <form onSubmit={handleAdmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-[#0F172A]">Doctor</Label>
                    <Input
                      placeholder="Dr. Smith"
                      value={admitForm.doctor}
                      onChange={(e) => setAdmitForm({ ...admitForm, doctor: e.target.value })}
                      className="h-10 border-[#E2E8F0]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-[#0F172A]">Ward</Label>
                    <Input
                      placeholder="General / ICU"
                      value={admitForm.ward}
                      onChange={(e) => setAdmitForm({ ...admitForm, ward: e.target.value })}
                      className="h-10 border-[#E2E8F0]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#0F172A]">Reason for Admission</Label>
                  <Input
                    placeholder="e.g. Chest pain, routine checkup..."
                    value={admitForm.reason}
                    onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })}
                    className="h-10 border-[#E2E8F0]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={admitLoading}
                  className="w-full bg-black hover:bg-black/90 text-white"
                >
                  {admitLoading ? "Admitting..." : "Confirm Admission"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <PatientsTable />
        </main>
      </div>
    </div>
  )
}
