#!/bin/bash

# Medicine Inventory Management System - Setup Helper

echo "🏥 Medicine Inventory Management System"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi
echo "✅ Node.js found: $(node -v)"

# Check MongoDB
echo ""
echo "Checking MongoDB..."
if mongosh --version &> /dev/null || mongo --version &> /dev/null; then
    echo "✅ MongoDB client found"
else
    echo "⚠️  MongoDB client not found (but server might still be running)"
fi

echo ""
echo "📋 Setup Checklist:"
echo "═══════════════════════════════════════════════"
echo ""

echo "1️⃣  BACKEND SETUP"
echo "   ✅ Models created: Medicine, MedicineUsageLog, RestockingAlert"
echo "   ✅ API endpoints added in /api/inventory/*"
echo "   ✅ Seed script created: seed-medicines.js"
echo ""

echo "2️⃣  FRONTEND SETUP"
echo "   ✅ Component created: inventory-management.jsx"
echo "   ✅ Resources page updated with inventory tab"
echo "   ✅ UI includes: Overview, Medicines, Restock, Analytics"
echo ""

echo "3️⃣  NEXT STEPS:"
echo "   Step 1: Navigate to backend directory"
echo "           $ cd backend"
echo ""
echo "   Step 2: Update package.json scripts (if not already done)"
echo "           Add: \"seed-medicines\": \"node seed-medicines.js\""
echo ""
echo "   Step 3: Seed the CSV data to MongoDB"
echo "           $ MEDICINE_CSV_PATH='../synthetic_medicine_inventory_5000.csv' npm run seed-medicines"
echo ""
echo "   Step 4: Start the backend server"
echo "           $ npm run dev"
echo ""
echo "   Step 5: Start the frontend (in another terminal)"
echo "           $ cd frontend && npm run dev"
echo ""
echo "   Step 6: Access the system"
echo "           → Go to http://localhost:3000/admin/dashboard"
echo "           → Click 'Resources' tab"
echo "           → Click 'Medicine Inventory' tab"
echo ""

echo "═══════════════════════════════════════════════"
echo ""

echo "📊 What You Can Do:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Overview Tab"
echo "   • See total medicines, stock status"
echo "   • View top 5 fastest depleting medicines"
echo "   • Get critical alerts (out of stock, depleting)"
echo ""
echo "💊 Medicines Tab"
echo "   • Search available medicines"
echo "   • Filter by category, status"
echo "   • View stock levels, depletion rates"
echo "   • Check days until stockout"
echo ""
echo "📦 Restock Tab"
echo "   • Get AI-powered restocking recommendations"
echo "   • See urgency levels (critical, high, medium)"
echo "   • Calculate restocking costs"
echo "   • Order medicines directly"
echo ""
echo "📈 Analytics Tab"
echo "   • View inventory by category"
echo "   • See total inventory value"
echo "   • Monitor stock status distribution"
echo ""

echo "═══════════════════════════════════════════════"
echo ""

echo "🗂️  File Locations:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend:"
echo "  • Models: backend/models.js (Medicine, MedicineUsageLog, RestockingAlert)"
echo "  • API Routes: backend/routes/inventory.js"
echo "  • Seed Script: backend/seed-medicines.js"
echo "  • Server Routes: backend/server.js (updated)"
echo ""
echo "Frontend:"
echo "  • Component: frontend/src/components/admin/inventory-management.jsx"
echo "  • Resources Page: frontend/src/pages/admin/Resources.jsx"
echo ""
echo "Documentation:"
echo "  • Full Guide: INVENTORY_MANAGEMENT_GUIDE.md"
echo ""

echo "═══════════════════════════════════════════════"
echo ""
echo "✨ System ready! Follow the setup steps above to get started."
echo ""
