import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, AlertCircle, IndianRupee } from "lucide-react"
import { api, isLoggedIn, getRole, getUser } from "@/lib/api"

const PURPOSES = ["consultation", "admission", "lab", "other"]

export default function PatientPayment() {
  const navigate = useNavigate()
  const user     = getUser()

  const [form, setForm] = useState({
    hospitalId:  "",
    amount:      "",
    purpose:     "consultation",
    description: "",
  })
  const [loading, setLoading]  = useState(false)
  const [error,   setError]    = useState("")
  const [success, setSuccess]  = useState(null)
  const [history, setHistory]  = useState([])

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "patient") {
      navigate("/patient/login")
      return
    }
    fetchHistory()
    loadRazorpayScript()
  }, [])

  const loadRazorpayScript = () => {
    if (document.getElementById("razorpay-script")) return
    const script  = document.createElement("script")
    script.id     = "razorpay-script"
    script.src    = "https://checkout.razorpay.com/v1/checkout.js"
    script.async  = true
    document.body.appendChild(script)
  }

  const fetchHistory = async () => {
    try {
      const data = await api("/payment/my")
      setHistory(data)
    } catch (err) {
      console.error("Failed to load payment history:", err.message)
    }
  }

  const handlePay = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess(null)

    if (!form.hospitalId) return setError("Please enter a hospital ID")
    if (!form.amount || parseFloat(form.amount) <= 0) return setError("Enter a valid amount")

    setLoading(true)
    try {
      const order = await api("/payment/create-order", {
        method: "POST",
        body: JSON.stringify({
          hospitalId:  form.hospitalId,
          amount:      parseFloat(form.amount),
          purpose:     form.purpose,
          description: form.description,
        }),
      })

      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        order.hospital.name,
        description: form.purpose,
        order_id:    order.orderId,
        prefill: {
          name:  user?.name  || "",
          email: user?.email || "",
        },
        theme: { color: "#0F172A" },

        handler: async (response) => {
          try {
            const result = await api("/payment/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            })
            setSuccess(result)
            setLoading(false)
            fetchHistory()
            setForm({ hospitalId: "", amount: "", purpose: "consultation", description: "" })
          } catch (err) {
            setError("Payment verification failed: " + err.message)
            setLoading(false)
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false)
            setError("Payment cancelled.")
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", (response) => {
        setError("Payment failed: " + response.error.description)
        setLoading(false)
      })
      rzp.open()

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "-"

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
                  <p className="text-sm text-green-700 mt-1">
                    ₹{success.amount} paid to {success.hospital} on {formatDate(success.paidAt)}
                  </p>
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
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                <form onSubmit={handlePay} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-[#0F172A]">Hospital ID</Label>
                    <Input
                      placeholder="Paste hospital ObjectId..."
                      value={form.hospitalId}
                      onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
                      className="h-10 border-[#E2E8F0]"
                      required
                    />
                    <p className="text-xs text-[#64748B]">
                      Ask hospital staff for their Hospital ID
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-[#0F172A]">Amount (₹)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="500"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="h-10 border-[#E2E8F0]"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-[#0F172A]">Purpose</Label>
                      <select
                        value={form.purpose}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                        className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm capitalize"
                      >
                        {PURPOSES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-[#0F172A]">Description (optional)</Label>
                    <Input
                      placeholder="e.g. Follow-up consultation with Dr. Sharma"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="h-10 border-[#E2E8F0]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black hover:bg-black/90 text-white h-11"
                  >
                    {loading ? "Opening payment..." : `Pay ₹${form.amount || "0"}`}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#0F172A]">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-[#64748B] text-center py-8">No payments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((p) => (
                      <div key={p._id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">
                            {p.hospitalId?.name || "Unknown Hospital"}
                          </p>
                          <p className="text-xs text-[#64748B] capitalize">
                            {p.purpose} · {formatDate(p.paidAt || p.createdAt)}
                          </p>
                          {p.description && (
                            <p className="text-xs text-[#64748B] mt-0.5">{p.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0F172A]">₹{p.amount}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                            p.status === "paid"   ? "bg-green-100 text-green-700" :
                            p.status === "failed" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {p.status}
                          </span>
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

