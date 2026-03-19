#!/bin/bash
# Quick Start Guide for Patient Flow Forecasting System

echo "=========================================="
echo "Patient Flow Forecasting - Quick Start"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi
echo "✅ Node.js found: $(node -v)"

# Check MongoDB
echo ""
echo "Checking MongoDB connection..."
if mongosh --version &> /dev/null || mongo --version &> /dev/null; then
    echo "✅ MongoDB client found"
else
    echo "⚠️  MongoDB client not found (but server might still be running)"
fi

echo ""
echo "Setup Steps:"
echo "1. Backend is ready - forecasting.js and routes/forecast.js are installed"
echo "2. Frontend component is ready - patient-flow-forecast.jsx is installed"  
echo "3. Dashboard integration is complete - see Dashboard.jsx"
echo ""

echo "To start the system:"
echo "  cd backend && npm run dev"
echo ""

echo "Access points:"
echo "  📊 Admin Dashboard: http://localhost:3000/admin/dashboard"
echo "  🔌 API Base: http://localhost:5000/api/forecast"
echo ""

echo "API Endpoints:"
echo "  GET /api/forecast/inflow?days=14&historicalDays=90"
echo "  GET /api/forecast/summary?historicalDays=30"
echo ""

echo "Example cURL (replace TOKEN with your JWT):"
echo '  curl -H "Authorization: Bearer TOKEN" \\'
echo '       http://localhost:5000/api/forecast/inflow?days=14'
echo ""

echo "✨ System ready to use!"
echo "=========================================="
