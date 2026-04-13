// frontend/src/pages/patient/Payment.jsx
// MODIFIED — hospital search dropdown replaces raw ObjectId input
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, AlertCircle, IndianRupee, Search, Building2, X } from "lucide-react"
import { api, isLoggedIn, getRole, getUser } from "@/lib/api"

const PURPOSES = ["consultation", "admission", "lab", "other"]

export default function PatientPayment() {
  const navigate = useNavigate()
  const user = getUser()

  const [hospitals, setHospitals] = useState([])
  const [hospitalSearch, setHospitalSearch] = useState("")
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const [form, setForm] = useState({ amount: "", purpose: "consultation", description: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "patient") { navigate("/patient/login"); return }
    fetchHistory()
    fetchHospitals()
    loadRazorpayScript()
  }, [])

  const loadRazorpayScript = () => {
    if (document.getElementById("razorpay-script")) return
    const script = document.createElement("script")
    script.id = "razorpay-script"
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)
  }

  const fetchHospitals = async () => {
    try {
      const data = await api("/access-requests/hospital-list")
      setHospitals(data)
    } catch (err) {
      console.error("Failed to load hospitals:", err.message)
    }
  }

  const fetchHistory = async () => {
    try {
      const data = await api("/payment/my")
      setHistory(data)
    } catch (err) {
      console.error("Failed to load payment history:", err.message)
    }
  }

  const filteredHospitals = hospitalSearch.trim()
    ? hospitals.filter((h) =>
        h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
        h.address?.city?.toLowerCase().includes(hospitalSearch.toLowerCase())
      )
    : hospitals

  const selectHospital = (h) => {
    setSelectedHospital(h)
    setHospitalSearch("")
    setShowDropdown(false)
  }

  const handlePay = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess(null)

    if (!selectedHospital) return setError("Please select a hospital")
    if (!form.amount || parseFloat(form.amount) <= 0) return setError("Enter a valid amount")

    setLoading(true)
    try {
      const order = await api("/payment/create-order", {
        method: "POST",
        body: JSON.stringify({
          hospitalId: selectedHospital._id,
          amount: parseFloat(form.amount),
          purpose: form.purpose,
          description: form.description,
        }),
      })

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.hospital.name,
        description: form.purpose,
        order_id: order.orderId,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#0F172A" },
        handler: async (response) => {
          try {
            const result = await api("/payment/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            })
            setSuccess(result)
            setLoading(false)
            fetchHistory()
            setForm({ amount: "", purpose: "consultation", description: "" })
            setSelectedHospital(null)
          } catch (err) {
            setError("Payment verification failed: " + err.message)
            setLoading(false)
          }
        },
        modal: { ondismiss: () => { setLoading(false); setError("Payment cancelled.") } },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", (response) => { setError("Payment failed: " + response.error.description); setLoading(false) })
      rzp.open()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="Pay Hospital" />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {success && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Payment Successful!</p>
                  <p className="text-sm text-green-700 mt-1">₹{success.amount} paid to {success.hospital} on {formatDate(success.paidAt)}</p>
                </div>
              </div>
            )}

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                  <IndianRupee className="w-5 h-5" /> Make a Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}
                <form onSubmit={handlePay} className="space-y-4">
                  {/* Hospital selector */}
                  <div className="space-y-2">
                    <Label className="text-sm text-[#0F172A]">Hospital</Label>
                    {selectedHospital ? (
                      <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#0F172A] flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{selectedHospital.name}</p>
                            <p className="text-xs text-[#64748B]">
                              {[selectedHospital.address?.city, selectedHospital.address?.state].filter(Boolean).join(", ")}
                              {selectedHospital.phone && ` · ${selectedHospital.phone}`}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setSelectedHospital(null)} className="text-[#64748B] hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                          <Input
                            placeholder="Search hospital by name or city..."
                            value={hospitalSearch}
                            onChange={(e) => { setHospitalSearch(e.target.value); setShowDropdown(true) }}
                            onFocus={() => setShowDropdown(true)}
                            className="h-10 pl-9 border-[#E2E8F0]"
                          />
                        </div>
                        {showDropdown && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                            {filteredHospitals.length === 0 ? (
                              <p className="text-xs text-[#64748B] text-center py-4">No hospitals found</p>
                            ) : (
                              filteredHospitals.map((h) => (
                                <button
                                  type="button"
                                  key={h._id}
                                  onClick={() => selectHospital(h)}
                                  className="w-full text-left px-3 py-2.5 hover:bg-[#F8FAFC] border-b border-[#F1F5F9] last:border-0 transition-colors"
                                >
                                  <p className="text-sm font-medium text-[#0F172A]">{h.name}</p>
                                  <p className="text-xs text-[#64748B]">
                                    {[h.address?.city, h.address?.state].filter(Boolean).join(", ")}
                                    {h.phone && ` · ${h.phone}`}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-[#0F172A]">Amount (₹)</Label>
                      <Input type="number" min="1" step="0.01" placeholder="500" value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-10 border-[#E2E8F0]" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-[#0F172A]">Purpose</Label>
                      <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                        className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm capitalize">
                        {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-[#0F172A]">Description (optional)</Label>
                    <Input placeholder="e.g. Follow-up consultation with Dr. Sharma" value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-10 border-[#E2E8F0]" />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-black hover:bg-black/90 text-white h-11">
                    {loading ? "Opening payment..." : `Pay ₹${form.amount || "0"}`}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader><CardTitle className="text-lg font-semibold text-[#0F172A]">Payment History</CardTitle></CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-[#64748B] text-center py-8">No payments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((p) => (
                      <div key={p._id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{p.hospitalId?.name || "Unknown Hospital"}</p>
                          <p className="text-xs text-[#64748B] capitalize">{p.purpose} · {formatDate(p.paidAt || p.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0F172A]">₹{p.amount}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                            p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          }`}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
