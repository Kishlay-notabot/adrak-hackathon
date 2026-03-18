// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import AdminLogin from './pages/admin/Login'
import AdminRegister from './pages/admin/Register'
import AdminDashboard from './pages/admin/Dashboard'
import AdminQrScanner from './pages/admin/QrScanner'
import AdminPatients from './pages/admin/Patients'
import AdminDoctors from './pages/admin/Doctors'
import AdminReports from './pages/admin/Reports'
import AdminSettings from './pages/admin/Settings'
import AdminHospitalSetup from './pages/admin/HospitalSetup'
import PatientLogin from './pages/patient/Login'
import PatientRegister from './pages/patient/Register'
import PatientDashboard from './pages/patient/Dashboard'
import PatientProfile from './pages/patient/Profile'
import PatientQrCode from './pages/patient/QrCode'
import PatientAppointments from './pages/patient/Appointments'
import PatientRecords from './pages/patient/Records'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/patients" element={<AdminPatients />} />
        <Route path="/admin/doctors" element={<AdminDoctors />} />
        <Route path="/admin/qr-scanner" element={<AdminQrScanner />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/hospital-setup" element={<AdminHospitalSetup />} />

        {/* Patient routes */}
        <Route path="/patient/login" element={<PatientLogin />} />
        <Route path="/patient/register" element={<PatientRegister />} />
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/profile" element={<PatientProfile />} />
        <Route path="/patient/qr-code" element={<PatientQrCode />} />
        <Route path="/patient/appointments" element={<PatientAppointments />} />
        <Route path="/patient/records" element={<PatientRecords />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App