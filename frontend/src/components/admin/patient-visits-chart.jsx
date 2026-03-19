import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { api } from "@/lib/api"

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const filters = ["6 Months", "Year"]

export function PatientVisitsChart() {
  const [activeFilter, setActiveFilter] = useState("6 Months")
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [activeFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const months = activeFilter === "Year" ? 12 : 6
      const stats = await api(`/hospital/inflow/stats?months=all`)

      // Transform API response { year, month, total } into chart-friendly format
      const data = stats.map((s) => ({
        name: MONTH_NAMES[s.month],
        newPatients: s.total,
      }))
      setChartData(data)
    } catch (err) {
      // No hospital assigned or no data yet — show empty chart
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-[#0F172A]">Patient Visits</CardTitle>
          <CardDescription className="text-[#64748B]">Total visits over selected period</CardDescription>
        </div>
        <div className="flex items-center bg-[#F1F5F9] rounded-lg p-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeFilter === filter
                  ? "bg-black text-white"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-[#64748B] text-sm">Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#64748B] text-sm">
              No inflow data yet. Admit patients to start tracking.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                  labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-sm text-[#64748B]">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="newPatients"
                  name="Patient Visits"
                  stroke="#0F172A"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#0F172A" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}