
import { useState } from "react"
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

const monthlyData = [
  { name: "Jan", newPatients: 420, returningPatients: 380 },
  { name: "Feb", newPatients: 380, returningPatients: 420 },
  { name: "Mar", newPatients: 520, returningPatients: 450 },
  { name: "Apr", newPatients: 480, returningPatients: 520 },
  { name: "May", newPatients: 550, returningPatients: 480 },
  { name: "Jun", newPatients: 620, returningPatients: 540 },
]

const dailyData = [
  { name: "Mon", newPatients: 65, returningPatients: 48 },
  { name: "Tue", newPatients: 72, returningPatients: 55 },
  { name: "Wed", newPatients: 58, returningPatients: 62 },
  { name: "Thu", newPatients: 80, returningPatients: 70 },
  { name: "Fri", newPatients: 75, returningPatients: 68 },
  { name: "Sat", newPatients: 45, returningPatients: 38 },
  { name: "Sun", newPatients: 32, returningPatients: 25 },
]

const sixMonthData = [
  { name: "Sep", newPatients: 1850, returningPatients: 1620 },
  { name: "Oct", newPatients: 2100, returningPatients: 1780 },
  { name: "Nov", newPatients: 1920, returningPatients: 1850 },
  { name: "Dec", newPatients: 1680, returningPatients: 1920 },
  { name: "Jan", newPatients: 2250, returningPatients: 2050 },
  { name: "Feb", newPatients: 2480, returningPatients: 2180 },
]

const yearlyData = [
  { name: "2021", newPatients: 18500, returningPatients: 15200 },
  { name: "2022", newPatients: 22400, returningPatients: 18900 },
  { name: "2023", newPatients: 26800, returningPatients: 22100 },
  { name: "2024", newPatients: 31200, returningPatients: 26400 },
]

const filters = ["Day", "Month", "6 Months", "Year"]

export function PatientVisitsChart() {
  const [activeFilter, setActiveFilter] = useState("Month")

  const getData = () => {
    switch (activeFilter) {
      case "Day":
        return dailyData
      case "Month":
        return monthlyData
      case "6 Months":
        return sixMonthData
      case "Year":
        return yearlyData
      default:
        return monthlyData
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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                name="New Patients"
                stroke="#0F172A"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#0F172A" }}
              />
              <Line
                type="monotone"
                dataKey="returningPatients"
                name="Returning Patients"
                stroke="#64748B"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: "#64748B" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

