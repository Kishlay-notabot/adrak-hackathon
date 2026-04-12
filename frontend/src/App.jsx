// frontend/src/App.jsx
// MODIFIED — added /admin/surge, /admin/predictions, /admin/inventory routes
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { isLoggedIn, getRole, getUser } from "@/lib/api"
import Landing from "./pages/Landing"
import AdminLogin from "./pages/admin/Login"
import AdminRegister from "./pages/admin/Register"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminQrScanner from "./pages/admin/QrScanner"
import AdminPatients from "./pages/admin/Patients"
import AdminDoctors from "./pages/admin/Doctors"
import AdminReports from "./pages/admin/Reports"
import AdminSettings from "./pages/admin/Settings"
import AdminHospitalSetup from "./pages/admin/HospitalSetup"
import AdminResources from "./pages/admin/Resources"
import AdminReferrals from "./pages/admin/Referrals"
import AdminSurge from "./pages/admin/SurgeIntelligence"
import AdminPredictions from "./pages/admin/Predictions"
import AdminInventory from "./pages/admin/Inventory"
import PatientLogin from "./pages/patient/Login"
import PatientRegister from "./pages/patient/Register"
import PatientDashboard from "./pages/patient/Dashboard"
import PatientProfile from "./pages/patient/Profile"
import PatientQrCode from "./pages/patient/QrCode"
import PatientAppointments from "./pages/patient/Appointments"
import PatientRecords from "./pages/patient/Records"
import PatientPayment from "./pages/patient/Payment"

function AdminGuard({ children, needsHospital = true }) {
  if (!isLoggedIn() || getRole() !== "admin") return <Navigate to="/admin/login" replace />
  if (needsHospital && !getUser()?.hospitalId) return <Navigate to="/admin/hospital-setup" replace />
  return children
}

function PatientGuard({ children }) {
  if (!isLoggedIn() || getRole() !== "patient") return <Navigate to="/patient/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Admin — public */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* Admin — protected, no hospital needed yet */}
        <Route path="/admin/hospital-setup" element={
          <AdminGuard needsHospital={false}><AdminHospitalSetup /></AdminGuard>
        } />

        {/* Admin — protected, hospital required */}
        <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/patients" element={<AdminGuard><AdminPatients /></AdminGuard>} />
        <Route path="/admin/doctors" element={<AdminGuard><AdminDoctors /></AdminGuard>} />
        <Route path="/admin/qr-scanner" element={<AdminGuard><AdminQrScanner /></AdminGuard>} />
        <Route path="/admin/resources" element={<AdminGuard><AdminResources /></AdminGuard>} />
        <Route path="/admin/reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
        <Route path="/admin/referrals" element={<AdminGuard><AdminReferrals /></AdminGuard>} />
        <Route path="/admin/surge" element={<AdminGuard><AdminSurge /></AdminGuard>} />
        <Route path="/admin/predictions" element={<AdminGuard><AdminPredictions /></AdminGuard>} />
        <Route path="/admin/inventory" element={<AdminGuard><AdminInventory /></AdminGuard>} />

        {/* Patient — public */}
        <Route path="/patient/login" element={<PatientLogin />} />
        <Route path="/patient/register" element={<PatientRegister />} />

        {/* Patient — protected */}
        <Route path="/patient/dashboard" element={<PatientGuard><PatientDashboard /></PatientGuard>} />
        <Route path="/patient/profile" element={<PatientGuard><PatientProfile /></PatientGuard>} />
        <Route path="/patient/qr-code" element={<PatientGuard><PatientQrCode /></PatientGuard>} />
        <Route path="/patient/appointments" element={<PatientGuard><PatientAppointments /></PatientGuard>} />
        <Route path="/patient/records" element={<PatientGuard><PatientRecords /></PatientGuard>} />
        <Route path="/patient/payment" element={<PatientGuard><PatientPayment /></PatientGuard>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
