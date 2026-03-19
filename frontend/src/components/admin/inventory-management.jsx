import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle, AlertCircle, TrendingDown, Package } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts"
import { api } from "@/lib/api"

const CATEGORIES = [
  "antibiotic",
  "fever",
  "cardiac",
  "diabetic",
  "respiratory",
  "pain",
  "gastrointestinal",
  "other",
]

export function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("overview")
  const [medicines, setMedicines] = useState([])
  const [criticalAlerts, setCriticalAlerts] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    depleting: false,
    outOfStock: false,
    lowStock: false,
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("🔄 Fetching inventory data...")
      const [medicinesRes, alertsRes, recsRes, analyticsRes] = await Promise.all([
        api("/inventory/medicines"),
        api("/inventory/critical"),
        api("/inventory/recommendations"),
        api("/inventory/analytics"),
      ])

      console.log("✅ Medicines response:", medicinesRes)
      console.log("✅ Critical alerts:", alertsRes)
      console.log("✅ Recommendations:", recsRes)
      console.log("✅ Analytics:", analyticsRes)

      setMedicines(medicinesRes.medicines || [])
      setCriticalAlerts(alertsRes)
      setRecommendations(recsRes)
      setAnalytics(analyticsRes)
    } catch (err) {
      setError(err.message || "Failed to load inventory data")
      console.error("❌ Inventory error:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredMedicines = medicines.filter((med) => {
    if (selectedCategory && med.category !== selectedCategory) return false
    if (searchTerm && !med.medicineName.toLowerCase().includes(searchTerm.toLowerCase()))
      return false
    if (filters.depleting && !med.isDepletingFast) return false
    if (filters.outOfStock && !med.isOutOfStock) return false
    if (filters.lowStock && !med.isLowStock) return false
    return true
  })

  const getStatusBadge = (medicine) => {
    if (medicine.isOutOfStock)
      return <Badge className="bg-red-600">Out of Stock</Badge>
    if (medicine.isDepletingFast)
      return <Badge className="bg-orange-600">Depleting Fast</Badge>
    if (medicine.isLowStock)
      return <Badge className="bg-yellow-600">Low Stock</Badge>
    return <Badge className="bg-green-600">In Stock</Badge>
  }

  const getSeverityColor = (daysUntilStockout) => {
    if (daysUntilStockout <= 0) return "text-red-600"
    if (daysUntilStockout <= 3) return "text-red-500"
    if (daysUntilStockout <= 7) return "text-orange-500"
    return "text-green-600"
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      default:
        return "bg-blue-100 text-blue-800 border-blue-300"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Critical Alerts */}
      {criticalAlerts && criticalAlerts.totalAlerts > 0 && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>⚠️ {criticalAlerts.totalAlerts} Critical Inventory Alerts</strong>
            {criticalAlerts.outOfStock.length > 0 && (
              <p className="mt-1">
                🔴 Out of Stock: {criticalAlerts.outOfStock.length} medicines
              </p>
            )}
            {criticalAlerts.depletingFast.length > 0 && (
              <p>🟠 Depleting Fast: {criticalAlerts.depletingFast.length} medicines</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medicines">Medicines</TabsTrigger>
          <TabsTrigger value="recommendations">Restock</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Total Medicines</p>
                  <p className="text-3xl font-bold">{analytics?.totalMedicines || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-red-600 mb-2 font-semibold">Out of Stock</p>
                  <p className="text-3xl font-bold text-red-600">{analytics?.outOfStock || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-orange-600 mb-2 font-semibold">Depleting Fast</p>
                  <p className="text-3xl font-bold text-orange-600">{analytics?.depletingFast || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-yellow-600 mb-2 font-semibold">Low Stock</p>
                  <p className="text-3xl font-bold text-yellow-600">{analytics?.lowStock || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Depleting */}
          {analytics?.topDepleting && (
            <Card>
              <CardHeader>
                <CardTitle>Top Depleting Medicines</CardTitle>
                <CardDescription>Highest consumption rate medicines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topDepleting.map((med, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-gray-600">
                          {med.depletionRate?.toFixed(1)} units/day
                        </p>
                      </div>
                      <div className={`text-right ${getSeverityColor(med.daysLeft)}`}>
                        <p className="font-semibold">{med.daysLeft} days left</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Medicines List */}
          {criticalAlerts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {criticalAlerts.outOfStock.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600">Out of Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {criticalAlerts.outOfStock.map((med) => (
                        <div key={med._id} className="text-sm p-2 bg-red-50 rounded">
                          <p className="font-medium">{med.medicineName}</p>
                          <p className="text-gray-600">{med.category}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {criticalAlerts.depletingFast.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-orange-600">Depleting Fast</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {criticalAlerts.depletingFast.map((med) => (
                        <div key={med._id} className="text-sm p-2 bg-orange-50 rounded">
                          <p className="font-medium">{med.medicineName}</p>
                          <p className="text-gray-600">
                            {med.daysUntilStockout} days • {med.depletionRate?.toFixed(1)}/day
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* MEDICINES TAB */}
        <TabsContent value="medicines" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status Filters</label>
                <div className="space-y-2">
                  {["depleting", "lowStock", "outOfStock"].map((filter) => (
                    <label key={filter} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters[filter]}
                        onChange={(e) =>
                          setFilters({ ...filters, [filter]: e.target.checked })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {filter === "depleting"
                          ? "Depleting Fast"
                          : filter === "lowStock"
                          ? "Low Stock"
                          : "Out of Stock"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medicines List */}
          <Card>
            <CardHeader>
              <CardTitle>Medicines List ({filteredMedicines.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredMedicines.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No medicines found</p>
                ) : (
                  filteredMedicines.map((med) => (
                    <div
                      key={med._id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{med.medicineName}</h3>
                          <p className="text-sm text-gray-600">
                            {med.category} • Price: ₹{med.pricePerUnit}/unit
                          </p>
                        </div>
                        {getStatusBadge(med)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-gray-500">Current Stock</p>
                          <p className="font-semibold">{med.totalStock} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Daily Usage</p>
                          <p className="font-semibold">{med.dailyAverageUsage?.toFixed(1)} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Days Left</p>
                          <p
                            className={`font-semibold ${getSeverityColor(
                              med.daysUntilStockout
                            )}`}
                          >
                            {med.daysUntilStockout} days
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Min Threshold</p>
                          <p className="font-semibold">{med.minimumThreshold} units</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECOMMENDATIONS TAB */}
        <TabsContent value="recommendations" className="space-y-6">
          {recommendations && (
            <>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">
                    Total Restocking Recommendations: <strong>{recommendations.totalRecommendations}</strong>
                  </p>
                  <p className="text-lg font-bold text-blue-600 mt-2">
                    Estimated Cost: ₹{recommendations.estimatedTotalCost?.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {recommendations.recommendations?.map((rec) => (
                  <Card key={rec.medicineId} className={`border-2 ${getUrgencyColor(rec.urgency)}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{rec.medicineName}</h3>
                            <Badge
                              className={`${
                                rec.urgency === "critical"
                                  ? "bg-red-600"
                                  : rec.urgency === "high"
                                  ? "bg-orange-600"
                                  : "bg-yellow-600"
                              }`}
                            >
                              {rec.urgency.toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-gray-600">Current Stock</p>
                              <p className="font-semibold">{rec.currentStock} units</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Recommended</p>
                              <p className="font-semibold">{rec.recommendedQuantity} units</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Days Until Stockout</p>
                              <p className={`font-semibold ${getSeverityColor(rec.daysUntilStockout)}`}>
                                {rec.daysUntilStockout} days
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Est. Cost</p>
                              <p className="font-semibold">₹{rec.estimatedCost?.toLocaleString()}</p>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 mb-2">
                            Reason: <strong>{rec.reason.split("_").join(" ").toUpperCase()}</strong>
                          </p>
                        </div>

                        <Button className="ml-4 bg-blue-600 hover:bg-blue-700">
                          Order Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Inventory by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.byCategory).map(([cat, data]) => (
                      <div key={cat} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{cat}</span>
                          <span className="text-sm text-gray-600">
                            {data.count} medicines • ₹{data.totalValue?.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{
                              width: `${Math.min(
                                100,
                                (data.count / analytics.totalMedicines) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {data.outOfStock} out of stock, {data.lowStock} low stock
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600 mb-1">Total Inventory Value</p>
                    <p className="text-2xl font-bold">₹{analytics.totalValue?.toLocaleString()}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600 mb-1">Avg Days Until Stockout</p>
                    <p className="text-2xl font-bold">{analytics.averageDaysUntilStockout} days</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button
          onClick={fetchAllData}
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Data"
          )}
        </Button>
      </div>
    </div>
  )
}
