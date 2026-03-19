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
  ComposedChart,
} from "recharts"
import { Loader2, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"

const timeRanges = ["14 Days", "30 Days"]

export function PatientFlowForecastChart() {
  const [activeRange, setActiveRange] = useState("14 Days")
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [trend, setTrend] = useState("stable")
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [customStartDate, setCustomStartDate] = useState("2023-01-01")
  const [customEndDate, setCustomEndDate] = useState("2023-12-31")

  useEffect(() => {
    fetchForecast()
  }, [activeRange])

  const fetchForecast = async () => {
    setLoading(true)
    setError(null)
    try {
      const forecastDays = activeRange === "30 Days" ? 30 : 14
      let url = `/forecast/inflow?days=${forecastDays}`

      // Use custom dates if enabled, else use default historical days
      if (showCustomDates) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`
      } else {
        const historicalDays = activeRange === "30 Days" ? 90 : 60
        url += `&historicalDays=${historicalDays}`
      }

      const response = await api(url)

      if (!response.success) {
        setError(response.message || "Failed to generate forecast")
        setChartData([])
        return
      }

      // Combine historical and forecast data
      const combined = response.historicalDates.map((date, idx) => ({
        date,
        actual: response.historicalCounts[idx],
        predicted: null,
        isPast: true,
      }))

      // Add forecast data
      response.forecastDates.forEach((date, idx) => {
        combined.push({
          date,
          actual: null,
          predicted: response.forecastCounts[idx],
          isPast: false,
        })
      })

      setChartData(combined)
      setStats(response.stats)
      setTrend(response.trend)
    } catch (err) {
      setError(err.message || "Failed to load forecast")
      console.error("Forecast error:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-[#0F172A]">
            Patient Flow Forecast
          </CardTitle>
          <CardDescription className="text-[#64748B]">
            Predicted daily patient admissions (solid line = actual, dotted line = forecast)
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomDates(!showCustomDates)}
            className="text-xs px-2 py-1 rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"
            title="Use custom date range (for historical data)"
          >
            📅 Custom Dates
          </button>
          <div className="flex items-center bg-[#F1F5F9] rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeRange === range
                    ? "bg-black text-white"
                    : "text-[#64748B] hover:text-[#0F172A]"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Custom Date Range Selector */}
          {showCustomDates && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
              <p className="text-sm font-medium text-blue-900">Custom Date Range (for historical data)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  fetchForecast()
                }}
                className="w-full text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Load Data for This Range
              </button>
            </div>
          )}

          {/* Stats Summary */}
          {stats && !error && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#F8FAFC] p-3 rounded-lg">
                <p className="text-xs text-[#64748B] mb-1">Average Daily</p>
                <p className="text-lg font-semibold text-[#0F172A]">{stats.mean}</p>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-lg">
                <p className="text-xs text-[#64748B] mb-1">Std. Deviation</p>
                <p className="text-lg font-semibold text-[#0F172A]">{stats.stdDev}</p>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-lg">
                <p className="text-xs text-[#64748B] mb-1">Min/Max</p>
                <p className="text-lg font-semibold text-[#0F172A]">
                  {stats.min}/{stats.max}
                </p>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-lg">
                <p className="text-xs text-[#64748B] mb-1">Trend</p>
                <p
                  className={cn(
                    "text-lg font-semibold capitalize",
                    trend === "increasing"
                      ? "text-red-600"
                      : trend === "decreasing"
                      ? "text-green-600"
                      : "text-blue-600"
                  )}
                >
                  {trend}
                </p>
              </div>
            </div>
          )}

          {/* Chart or Error/Loading State */}
          <div className="h-[350px]">
            {error && (
              <div className="h-full flex items-center justify-center text-[#64748B]">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm">{error}</p>
                  <p className="text-xs mt-1 text-[#94A3B8]">
                    (Need at least 3 days of historical data)
                  </p>
                </div>
              </div>
            )}
            {loading && (
              <div className="h-full flex items-center justify-center text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
            {!loading && !error && chartData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDate}
                    interval={
                      chartData.length > 30 ? Math.floor(chartData.length / 12) : 0
                    }
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: "Patients", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                    labelFormatter={(label) => `Date: ${formatDate(label)}`}
                    formatter={(value) => (value !== null ? value : "—")}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="line"
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                  {/* Actual patient flow - solid line */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={false}
                    name="Actual Admissions"
                    isAnimationActive={true}
                  />
                  {/* Predicted flow - dotted line */}
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Predicted Admissions"
                    isAnimationActive={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            {!loading && !error && chartData.length === 0 && (
              <div className="h-full flex items-center justify-center text-[#64748B] text-sm">
                No forecast data available. Ensure patient admissions are being tracked.
              </div>
            )}
          </div>

          {/* Legend Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2 bg-blue-50 p-2 rounded">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-[#64748B]">
                <strong>Solid Blue:</strong> Historical admissions
              </span>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 p-2 rounded">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-[#64748B]">
                <strong>Dotted Orange:</strong> Predicted admissions
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
