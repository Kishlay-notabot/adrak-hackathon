// frontend/src/pages/admin/SurgeIntelligence.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Bed,
  Clock,
  Newspaper,
  Activity,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import { api, isLoggedIn, getRole } from "@/lib/api"

const SEVERITY_CONFIG = {
  high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
  moderate: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  low: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
}

const SURGE_BANNER = {
  high: { bg: "bg-red-600", icon: AlertTriangle, label: "HIGH SURGE", desc: "Critical load detected — activate surge protocols" },
  moderate: { bg: "bg-amber-500", icon: Shield, label: "MODERATE SURGE", desc: "Elevated patient load — increased monitoring advised" },
  low: { bg: "bg-emerald-600", icon: ShieldCheck, label: "NORMAL", desc: "Patient flow within normal parameters" },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function SurgeIntelligence() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") {
      navigate("/admin/login")
      return
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!loading) fetchData()
  }, [filter])

  const fetchData = async () => {
    try {
      const params = filter !== "all" ? `?severity=${filter}` : ""
      const result = await api(`/surge/intelligence${params}`)
      setData(result)
    } catch (err) {
      console.error("Surge fetch failed:", err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const banner = data ? SURGE_BANNER[data.surgeLevel] || SURGE_BANNER.low : null

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Surge Intelligence" />
        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-[#64748B] text-sm">
              Loading surge intelligence...
            </div>
          ) : !data ? (
            <Card className="bg-white border-[#E2E8F0] shadow-sm max-w-lg mx-auto mt-12">
              <CardContent className="flex flex-col items-center py-16">
                <Activity className="w-12 h-12 text-[#64748B] mb-4" />
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No Surge Data</h3>
                <p className="text-sm text-[#64748B] text-center">
                  Surge intelligence could not be loaded. Try again later.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* ── Surge Level Banner ──────────────────────────── */}
              {banner && (
                <div className={`${banner.bg} rounded-xl p-6 text-white flex items-center justify-between`}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                      <banner.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold tracking-wide">{banner.label}</h2>
                        <span className="text-sm font-medium bg-white/20 px-3 py-0.5 rounded-full">
                          Score: {data.surgeScore}/100
                        </span>
                      </div>
                      <p className="text-white/90 text-sm">{banner.desc}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              )}

              {/* ── Prediction Stats ───────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm text-[#64748B]">Expected Today</p>
                    </div>
                    <p className="text-2xl font-bold text-[#0F172A]">
                      {data.predictions.expectedInflowToday}
                      <span className="text-sm font-normal text-[#64748B] ml-1">patients</span>
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <p className="text-sm text-[#64748B]">Expected Tomorrow</p>
                    </div>
                    <p className="text-2xl font-bold text-[#0F172A]">
                      {data.predictions.expectedInflowTomorrow}
                      <span className="text-sm font-normal text-[#64748B] ml-1">patients</span>
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Bed className="w-5 h-5 text-orange-600" />
                      </div>
                      <p className="text-sm text-[#64748B]">Bed Demand ↑</p>
                    </div>
                    <p className="text-2xl font-bold text-[#0F172A]">{data.predictions.bedDemandIncrease}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Users className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-sm text-[#64748B]">Staff Readiness</p>
                    </div>
                    <p className="text-lg font-bold text-[#0F172A]">{data.predictions.staffReadiness}</p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Recommendations ─────────────────────────────── */}
              {data.predictions.recommendations?.length > 0 && (
                <Card className="bg-white border-[#E2E8F0] shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                      <Shield className="w-5 h-5" /> Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {data.predictions.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-[#F8FAFC] rounded-lg">
                          <ChevronRight className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
                          <span className="text-sm text-[#0F172A]">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── News Feed ──────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-[#0F172A]" />
                    <h3 className="text-lg font-semibold text-[#0F172A]">Local News & Alerts</h3>
                    <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                      Delhi NCR
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {["all", "high", "moderate", "low"].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setFilter(sev)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          filter === sev
                            ? "bg-[#0F172A] text-white"
                            : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                        }`}
                      >
                        {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {data.news.length === 0 ? (
                  <Card className="bg-white border-[#E2E8F0] shadow-sm">
                    <CardContent className="py-12 text-center">
                      <p className="text-sm text-[#64748B]">No news items matching this filter.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.news.map((item) => {
                      const cfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.low
                      return (
                        <Card
                          key={item.id}
                          className={`${cfg.bg} ${cfg.border} border shadow-sm hover:shadow-md transition-shadow`}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                  <span className="text-xs font-medium text-[#64748B]">{item.source}</span>
                                  <span className="text-xs text-[#94A3B8]">·</span>
                                  <span className="text-xs text-[#94A3B8]">{timeAgo(item.publishedAt)}</span>
                                </div>
                                <h4 className="text-sm font-semibold text-[#0F172A] leading-snug">{item.title}</h4>
                              </div>
                              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${cfg.badge}`}>
                                {item.severity}
                              </span>
                            </div>
                            <p className="text-sm text-[#475569] mb-3 leading-relaxed">{item.summary}</p>
                            <div className="flex items-start gap-2 p-2.5 bg-white/60 rounded-lg border border-white/80">
                              <Activity className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] uppercase tracking-wide font-medium text-[#64748B] mb-0.5">
                                  Hospital Impact
                                </p>
                                <p className="text-xs text-[#0F172A] font-medium">{item.impact}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
