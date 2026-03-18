import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"
import { api, setAuth } from "@/lib/api"

export default function AdminRegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    department: "",
    password: "",
    confirmPassword: "",
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const data = await api("/admin/signup", {
        method: "POST",
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          employeeId: formData.employeeId,
          department: formData.department,
          password: formData.password,
        }),
      })
      setAuth(data.token, data.admin, "admin")
      navigate("/admin/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-semibold text-[#0F172A]">MediCore</span>
          </Link>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Admin Registration</h1>
          <p className="text-[#64748B] mt-1">Create your admin account</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create Account</CardTitle>
            <CardDescription>Fill in your details to register</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm text-[#0F172A]">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Dr. John Smith"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-11 border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-[#0F172A]">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@medicore.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11 border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId" className="text-sm text-[#0F172A]">Employee ID</Label>
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="EMP-001"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="h-11 border-[#E2E8F0]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm text-[#0F172A]">Department</Label>
                  <Input
                    id="department"
                    type="text"
                    placeholder="Cardiology"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="h-11 border-[#E2E8F0]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-[#0F172A]">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-11 border-[#E2E8F0] pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm text-[#0F172A]">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="h-11 border-[#E2E8F0] pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white">
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-[#64748B]">
              Already have an account?{" "}
              <Link to="/admin/login" className="text-[#0F172A] font-medium hover:underline">Sign In</Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#94A3B8] mt-6">
          By registering, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}