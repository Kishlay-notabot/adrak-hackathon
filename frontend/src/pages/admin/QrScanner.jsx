
import { useState } from "react"
import { AdminNavbar } from "@/components/admin/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function QRScannerPage() {
  const [scanned, setScanned] = useState(false)

  const handleScan = () => {
    setTimeout(() => setScanned(true), 1500)
  }

  const handleReset = () => {
    setScanned(false)
  }

  return (
    <>
      <AdminNavbar title="QR Scanner" />
      <main className="p-6">
        <Card className="bg-white border-[#E2E8F0] shadow-sm max-w-2xl mx-auto">
          <CardContent className="p-8">
            {!scanned ? (
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-semibold text-[#0F172A] mb-6">Scan Patient QR Code</h2>
                <div 
                  className="relative w-72 h-72 bg-[#0F172A] rounded-xl flex items-center justify-center cursor-pointer mb-6"
                  onClick={handleScan}
                >
                  <div className="absolute top-4 left-4 w-10 h-10 border-l-4 border-t-4 border-white rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-10 h-10 border-r-4 border-t-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-10 h-10 border-l-4 border-b-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-10 h-10 border-r-4 border-b-4 border-white rounded-br-lg" />
                  <div className="w-56 h-0.5 bg-white/50 animate-pulse" />
                </div>
                <p className="text-[#64748B] text-sm">Point the camera at the patient QR code</p>
                <p className="text-[#64748B] text-xs mt-2">(Click the scanner to simulate a scan)</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#0F172A]">Patient Information</h2>
                  <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#64748B]" onClick={handleReset}>
                    Scan Another
                  </Button>
                </div>
                <div className="flex gap-8">
                  <div className="flex-1 space-y-5">
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Full Name</p>
                      <p className="text-base font-medium text-[#0F172A]">John Doe</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Age</p>
                        <p className="text-base font-medium text-[#0F172A]">45</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Gender</p>
                        <p className="text-base font-medium text-[#0F172A]">Male</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Blood Group</p>
                        <p className="text-base font-medium text-[#0F172A]">A+</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Ward</p>
                        <p className="text-base font-medium text-[#0F172A]">General</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Medical Conditions</p>
                      <p className="text-base font-medium text-[#0F172A]">Hypertension, Type 2 Diabetes</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Assigned Doctor</p>
                      <p className="text-base font-medium text-[#0F172A]">Dr. Sarah Wilson</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">Admission Date</p>
                      <p className="text-base font-medium text-[#0F172A]">January 15, 2024</p>
                    </div>
                  </div>
                  <div className="w-40">
                    <div className="w-40 h-40 bg-[#F1F5F9] rounded-lg p-3">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <rect x="10" y="10" width="20" height="20" fill="#0F172A" />
                        <rect x="35" y="10" width="10" height="10" fill="#0F172A" />
                        <rect x="50" y="10" width="10" height="10" fill="#0F172A" />
                        <rect x="70" y="10" width="20" height="20" fill="#0F172A" />
                        <rect x="10" y="35" width="10" height="10" fill="#0F172A" />
                        <rect x="30" y="35" width="15" height="15" fill="#0F172A" />
                        <rect x="55" y="35" width="10" height="10" fill="#0F172A" />
                        <rect x="80" y="35" width="10" height="10" fill="#0F172A" />
                        <rect x="10" y="55" width="10" height="10" fill="#0F172A" />
                        <rect x="35" y="55" width="30" height="10" fill="#0F172A" />
                        <rect x="80" y="55" width="10" height="10" fill="#0F172A" />
                        <rect x="10" y="70" width="20" height="20" fill="#0F172A" />
                        <rect x="40" y="75" width="10" height="10" fill="#0F172A" />
                        <rect x="60" y="70" width="10" height="15" fill="#0F172A" />
                        <rect x="80" y="75" width="10" height="15" fill="#0F172A" />
                      </svg>
                    </div>
                    <p className="text-xs text-[#64748B] text-center mt-2">PID-00421</p>
                  </div>
                </div>
                <Button className="w-full mt-8 bg-black hover:bg-black/90 text-white">
                  Print Patient Info
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}

