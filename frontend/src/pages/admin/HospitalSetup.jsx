// frontend/src/pages/admin/HospitalSetup.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Link2 } from "lucide-react"
import { api, isLoggedIn, getRole, setAuth, getUser } from "@/lib/api"

export default function AdminHospitalSetup() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [createForm, setCreateForm] = useState({
    name: "", phone: "", registrationNumber: "",
    street: "", city: "", state: "", pincode: "",
    lng: "", lat: "",
  })
  const [joinId, setJoinId] = useState("")

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") navigate("/admin/login")
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await api("/hospital/create", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name,
          phone: createForm.phone,
          registrationNumber: createForm.registrationNumber || undefined,
          address: {
            street: createForm.street,
            city: createForm.city,
            state: createForm.state,
            pincode: createForm.pincode,
          },
          coordinates: [
            parseFloat(createForm.lng) || 77.2090,
            parseFloat(createForm.lat) || 28.6139,
          ],
        }),
      })
      const user = getUser()
      localStorage.setItem("token", data.token)
      if (user) {
        user.hospitalId = data.hospital._id
        localStorage.setItem("user", JSON.stringify(user))
      }
      navigate("/admin/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await api("/hospital/join", {
        method: "POST",
        body: JSON.stringify({ hospitalId: joinId }),
      })
      const user = getUser()
      localStorage.setItem("token", data.token)
      if (user) {
        user.hospitalId = data.hospital._id
        localStorage.setItem("user", JSON.stringify(user))
      }
      navigate("/admin/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Hospital Setup</h1>
          <p className="text-[#64748B] mt-1">Create a new hospital or join an existing one</p>
        </div>

        {!mode ? (
          <div className="grid grid-cols-2 gap-4">
            <Card
              className="border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setMode("create")}
            >
              <CardContent className="flex flex-col items-center py-10">
                <Building2 className="w-10 h-10 text-[#0F172A] mb-3" />
                <p className="font-semibold text-[#0F172A]">Create Hospital</p>
                <p className="text-xs text-[#64748B] mt-1 text-center">Register a new hospital</p>
              </CardContent>
            </Card>
            <Card
              className="border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setMode("join")}
            >
              <CardContent className="flex flex-col items-center py-10">
                <Link2 className="w-10 h-10 text-[#0F172A] mb-3" />
                <p className="font-semibold text-[#0F172A]">Join Hospital</p>
                <p className="text-xs text-[#64748B] mt-1 text-center">Link to existing hospital</p>
              </CardContent>
            </Card>
          </div>
        ) : mode === "create" ? (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Register Hospital</CardTitle>
              <CardDescription>Enter your hospital details</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Hospital Name</Label>
                  <Input placeholder="City General Hospital" value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="h-10 border-[#E2E8F0]" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Phone</Label>
                    <Input placeholder="+91 98765 43210" value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="h-10 border-[#E2E8F0]" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Registration #</Label>
                    <Input placeholder="Optional" value={createForm.registrationNumber}
                      onChange={(e) => setCreateForm({ ...createForm, registrationNumber: e.target.value })}
                      className="h-10 border-[#E2E8F0]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Street Address</Label>
                  <Input placeholder="123 Main Road" value={createForm.street}
                    onChange={(e) => setCreateForm({ ...createForm, street: e.target.value })}
                    className="h-10 border-[#E2E8F0]" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">City</Label>
                    <Input placeholder="Delhi" value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      className="h-10 border-[#E2E8F0]" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">State</Label>
                    <Input placeholder="Delhi" value={createForm.state}
                      onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                      className="h-10 border-[#E2E8F0]" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Pincode</Label>
                    <Input placeholder="110001" value={createForm.pincode}
                      onChange={(e) => setCreateForm({ ...createForm, pincode: e.target.value })}
                      className="h-10 border-[#E2E8F0]" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Longitude</Label>
                    <Input type="number" step="any" placeholder="77.2090" value={createForm.lng}
                      onChange={(e) => setCreateForm({ ...createForm, lng: e.target.value })}
                      className="h-10 border-[#E2E8F0]" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Latitude</Label>
                    <Input type="number" step="any" placeholder="28.6139" value={createForm.lat}
                      onChange={(e) => setCreateForm({ ...createForm, lat: e.target.value })}
                      className="h-10 border-[#E2E8F0]" required />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 border-[#E2E8F0]" onClick={() => { setMode(null); setError("") }}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 bg-black hover:bg-black/90 text-white">
                    {loading ? "Creating..." : "Create Hospital"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Join Hospital</CardTitle>
              <CardDescription>Enter the hospital ID provided by your administrator</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Hospital ID</Label>
                  <Input placeholder="Paste hospital ObjectId..." value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    className="h-10 border-[#E2E8F0]" required />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 border-[#E2E8F0]" onClick={() => { setMode(null); setError("") }}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 bg-black hover:bg-black/90 text-white">
                    {loading ? "Joining..." : "Join Hospital"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
