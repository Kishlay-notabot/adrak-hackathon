import { Card, CardContent } from "@/components/ui/card"

export function StatsCard({ label, value, trend, description }) {
  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-[#64748B]">{label}</p>
          {trend && (
            <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-green-600' : trend.startsWith('-') ? 'text-red-600' : 'text-blue-600'}`}>
              {trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-[#0F172A] mb-1">{value}</p>
        <p className="text-xs text-[#64748B]">{description}</p>
      </CardContent>
    </Card>
  )
}