// frontend/src/components/admin/resource-charts.jsx
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/stats-card"
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { api } from "@/lib/api"
import { Bed, Users, Wind, Activity } from "lucide-react"

export function ResourceCharts() {
  const [overview, setOverview] = useState(null)
  const [bedData, setBedData] = useState([])
  const [staffData, setStaffData] = useState([])
  const [equipData, setEquipData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [ov, beds, staff, equip] = await Promise.all([
        api("/resources/overview").catch(() => null),
        api("/resources/bed-utilization?days=60").catch(() => []),
        api("/resources/staff?days=60").catch(() => []),
        api("/resources/equipment?days=60").catch(() => []),
      ])
      setOverview(ov)
      setBedData(beds.map((d) => ({ ...d, date: d.date.slice(5) })))
      setStaffData(staff.map((d) => ({ ...d, date: d.date.slice(5) })))
      setEquipData(equip.map((d) => ({ ...d, date: d.date.slice(5) })))
    } catch (err) {
      console.error("Failed to load resources:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const tooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  }

  if (loading) {
    return <div className="py-12 text-center text-[#64748B] text-sm">Loading resource data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            label="Bed Occupancy"
            value={`${overview.occupiedBeds}/${overview.totalBeds}`}
            trend={`${Math.round((overview.occupiedBeds / overview.totalBeds) * 100)}%`}
            description="General beds in use"
          />
          <StatsCard
            label="ICU Occupancy"
            value={`${overview.occupiedIcuBeds}/${overview.totalIcuBeds}`}
            trend={`${Math.round((overview.occupiedIcuBeds / overview.totalIcuBeds) * 100)}%`}
            description="ICU beds in use"
          />
          <StatsCard
            label="Doctors Available"
            value={`${overview.availableDoctors}/${overview.totalDoctors}`}
            description="On-duty right now"
          />
          <StatsCard
            label="Emergency Pressure"
            value={overview.emergencyPressureScore.toFixed(1)}
            trend={overview.emergencyPressureScore > 25 ? "High" : overview.emergencyPressureScore > 15 ? "Medium" : "Low"}
            description="Current load score"
          />
        </div>
      )}

      {/* Bed Utilization */}
      {bedData.length > 0 && (
        <Card className="bg-white border-[#E2E8F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
              <Bed className="w-5 h-5" /> Bed Utilization
            </CardTitle>
            <CardDescription className="text-[#64748B]">Daily average occupancy — general beds and ICU</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false}
                    interval={Math.max(0, Math.floor(bedData.length / 10))} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#0F172A", fontWeight: 600 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="occupiedBeds" name="Occupied Beds" stroke="#2563EB"
                    fill="#2563EB" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="occupiedIcu" name="Occupied ICU" stroke="#DC2626"
                    fill="#DC2626" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Availability */}
      {staffData.length > 0 && (
        <Card className="bg-white border-[#E2E8F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
              <Users className="w-5 h-5" /> Staff Availability
            </CardTitle>
            <CardDescription className="text-[#64748B]">Daily average available doctors and nurses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false}
                    interval={Math.max(0, Math.floor(staffData.length / 10))} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#0F172A", fontWeight: 600 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  <Bar dataKey="availableDoctors" name="Doctors" fill="#0F172A" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="availableNurses" name="Nurses" fill="#64748B" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment Usage */}
      {equipData.length > 0 && (
        <Card className="bg-white border-[#E2E8F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
              <Wind className="w-5 h-5" /> Equipment Usage
            </CardTitle>
            <CardDescription className="text-[#64748B]">Ventilators and oxygen units in use over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equipData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false}
                    interval={Math.max(0, Math.floor(equipData.length / 10))} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#0F172A", fontWeight: 600 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  <Line type="monotone" dataKey="ventilatorsInUse" name="Ventilators In Use"
                    stroke="#7C3AED" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="oxygenInUse" name="Oxygen Units In Use"
                    stroke="#0891B2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No resource data fallback */}
      {!overview && bedData.length === 0 && (
        <Card className="bg-white border-[#E2E8F0] shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="w-12 h-12 text-[#64748B] mb-4" />
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No Resource Data</h3>
            <p className="text-sm text-[#64748B] text-center max-w-md">
              Seed the resource CSV to see bed utilization, staff availability, and equipment usage graphs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
