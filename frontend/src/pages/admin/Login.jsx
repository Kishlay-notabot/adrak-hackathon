import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: "", password: "" })

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate("/admin/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-semibold text-[#0F172A]">MediCore</span>
          </Link>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Admin Portal</h1>
          <p className="text-[#64748B] mt-1">Sign in to access the admin dashboard</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-[#0F172A]">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#64748B]">
                  <input type="checkbox" className="rounded border-[#E2E8F0]" />
                  Remember me
                </label>
                <Link to="#" className="text-sm text-[#0F172A] hover:underline">Forgot password?</Link>
              </div>

              <Button type="submit" className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white">
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-[#64748B]">
              Don't have an account?{" "}
              <Link to="/admin/register" className="text-[#0F172A] font-medium hover:underline">Register</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}