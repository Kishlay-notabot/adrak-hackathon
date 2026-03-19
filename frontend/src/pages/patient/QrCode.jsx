// frontend/src/pages/patient/QrCode.jsx
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { PatientNavbar } from "@/components/patient/navbar"
import { PatientSidebar } from "@/components/patient/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"
import { api, isLoggedIn, getRole, getUser } from "@/lib/api"
import { QRCodeCanvas, downloadQR, printQR, useQRCodeDataURL } from "@/components/qr-code"

export default function PatientQrCode() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const user = getUser()

  const qrValue = user?.id || ""
  const qrDataUrl = useQRCodeDataURL(qrValue)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "patient") {
      navigate("/patient/login")
      return
    }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await api("/patient/me")
      setProfile(data)
    } catch (err) {
      console.error("Failed to load profile:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    downloadQR(qrDataUrl, `QR-${profile?.pid || "patient"}.png`)
  }

  const handlePrint = () => {
    printQR(qrDataUrl, profile?.name, profile?.pid)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC]">
        <PatientSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
          <PatientNavbar title="My QR Code" />
          <main className="flex-1 flex items-center justify-center text-[#64748B]">Loading...</main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <PatientSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <PatientNavbar title="My QR Code" />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-md mx-auto">
            <Card className="bg-white border-[#E2E8F0] shadow-sm border-t-4 border-t-[#2563EB]">
              <CardContent className="p-8 text-center">
                <h2 className="text-xl font-bold text-[#0F172A] mb-6">Your Patient QR Code</h2>

                <div className="w-56 h-56 mx-auto bg-[#F8FAFC] rounded-lg p-4 flex items-center justify-center mb-6">
                  {qrValue ? (
                    <QRCodeCanvas value={qrValue} size={200} />
                  ) : (
                    <p className="text-sm text-[#64748B]">No QR available</p>
                  )}
                </div>

                <p className="text-lg font-bold text-[#0F172A] mb-1">{profile?.name || "-"}</p>
                <p className="text-sm text-[#64748B] mb-1">{profile?.pid || "-"}</p>
                <p className="text-xs text-[#64748B] mb-8">
                  Blood Group: {profile?.bloodGroup || "-"} · Age: {profile?.age || "-"}
                </p>

                <div className="flex items-center justify-center gap-3 mb-6">
                  <Button variant="outline" className="border-[#E2E8F0] text-[#0F172A]" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />Download QR
                  </Button>
                  <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />Print QR
                  </Button>
                </div>

                <div className="bg-[#F1F5F9] rounded-lg p-4">
                  <p className="text-sm text-[#0F172A] font-medium mb-1">How to use</p>
                  <p className="text-xs text-[#64748B]">
                    Show this QR code at any medflow-connected hospital.
                    Staff will scan it to instantly access your medical records
                    and history — no paperwork needed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
