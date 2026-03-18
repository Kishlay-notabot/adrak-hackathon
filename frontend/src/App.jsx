import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import AdminLogin from './pages/admin/Login'
import AdminRegister from './pages/admin/Register'
import AdminDashboard from './pages/admin/Dashboard'
import AdminQrScanner from './pages/admin/QrScanner'
import PatientLogin from './pages/patient/Login'
import PatientRegister from './pages/patient/Register'
import PatientDashboard from './pages/patient/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/qr-scanner" element={<AdminQrScanner />} />
        <Route path="/patient/login" element={<PatientLogin />} />
        <Route path="/patient/register" element={<PatientRegister />} />
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
