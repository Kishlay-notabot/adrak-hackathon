// frontend/src/pages/admin/Resources.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminNavbar } from "@/components/admin/navbar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { ResourceCharts } from "@/components/admin/resource-charts"
import { InventoryManagement } from "@/components/admin/inventory-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isLoggedIn, getRole } from "@/lib/api"

export default function AdminResources() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("hospital-resources")

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== "admin") navigate("/admin/login")
  }, [])

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <AdminNavbar title="Resources" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">Hospital Resources</h2>
            <p className="text-sm text-[#64748B]">
              Manage bed utilization, staff availability, equipment usage, and medicine inventory
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="hospital-resources">Hospital Resources</TabsTrigger>
              <TabsTrigger value="inventory">Medicine Inventory</TabsTrigger>
            </TabsList>

            <TabsContent value="hospital-resources" className="mt-6">
              <ResourceCharts />
            </TabsContent>

            <TabsContent value="inventory" className="mt-6">
              <InventoryManagement />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}