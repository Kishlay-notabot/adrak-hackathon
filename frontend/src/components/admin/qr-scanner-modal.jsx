
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"



export function QRScannerModal({ trigger }: QRScannerModalProps) {
  const [scanned, setScanned] = useState(false)

  const handleScan = () => {
    setTimeout(() => setScanned(true), 1500)
  }

  return (
    <Dialog onOpenChange={(open) => !open && setScanned(false)}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-[#E2E8F0]">
            <QrCode className="w-4 h-4 mr-2" />
            Scan QR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A]">Scan Patient QR Code</DialogTitle>
        </DialogHeader>
        
        {!scanned ? (
          <div className="flex flex-col items-center py-8">
            <div 
              className="relative w-64 h-64 bg-[#0F172A] rounded-xl flex items-center justify-center cursor-pointer"
              onClick={handleScan}
            >
              <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />
              <div className="w-48 h-0.5 bg-white/50 animate-pulse" />
            </div>
            <p className="text-[#64748B] text-sm mt-6">Point the camera at the patient QR code</p>
            <p className="text-[#64748B] text-xs mt-2">(Click to simulate scan)</p>
          </div>
        ) : (
          <div className="py-4">
            <div className="flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Name</p>
                  <p className="text-sm font-medium text-[#0F172A]">John Doe</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Age</p>
                    <p className="text-sm font-medium text-[#0F172A]">45</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Gender</p>
                    <p className="text-sm font-medium text-[#0F172A]">Male</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Blood Group</p>
                    <p className="text-sm font-medium text-[#0F172A]">A+</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wide">Ward</p>
                    <p className="text-sm font-medium text-[#0F172A]">General</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Medical Conditions</p>
                  <p className="text-sm font-medium text-[#0F172A]">Hypertension, Type 2 Diabetes</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Assigned Doctor</p>
                  <p className="text-sm font-medium text-[#0F172A]">Dr. Sarah Wilson</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Admission Date</p>
                  <p className="text-sm font-medium text-[#0F172A]">January 15, 2024</p>
                </div>
              </div>
              <div className="w-32">
                <div className="w-32 h-32 bg-[#F1F5F9] rounded-lg p-2">
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
            <Button className="w-full mt-6 bg-black hover:bg-black/90 text-white">
              Print Patient Info
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

