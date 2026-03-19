// backend/seed-resources.js
//
// Uploads resource CSV directly to MongoDB under the seed admin's hospital.
//
// Usage:
//   1. Place your resource CSV in backend/data/
//   2. node seed-resources.js [--clear] [--file=hospital_resource_data.csv]

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Admin, ResourceStatus } = require("./models");

const BATCH_SIZE = 500;
const SEED_ADMIN_EMAIL = "seedadmin@hdhi-seed.com";

function num(val) {
  if (!val || val === "" || val === "NA" || val === "EMPTY") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function seed() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");
  const fileArg = args.find((a) => a.startsWith("--file="));

  // Find CSV
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.error("\n❌ Created backend/data/ — place your resource CSV there and re-run.\n");
    process.exit(1);
  }

  let csvPath;
  if (fileArg) {
    csvPath = path.join(dataDir, fileArg.split("=")[1]);
  } else {
    const candidates = fs.readdirSync(dataDir).filter(
      (f) => f.endsWith(".csv") && f.toLowerCase().includes("resource")
    );
    if (candidates.length > 0) {
      csvPath = path.join(dataDir, candidates[0]);
    } else {
      // Fallback: try any CSV that isn't the patient dataset
      const allCsv = fs.readdirSync(dataDir).filter(
        (f) => f.endsWith(".csv") && !f.toLowerCase().includes("datset") && !f.toLowerCase().includes("hdhi")
      );
      if (allCsv.length > 0) csvPath = path.join(dataDir, allCsv[0]);
    }
  }

  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error("\n❌ No resource CSV found in backend/data/");
    console.error("   Place it there or use: node seed-resources.js --file=yourfile.csv\n");
    process.exit(1);
  }

  console.log(`\n📁 CSV: ${path.basename(csvPath)}`);

  // Connect
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  // Find seed admin → get hospitalId
  const admin = await Admin.findOne({ email: SEED_ADMIN_EMAIL });
  if (!admin) {
    console.error(`\n❌ Seed admin not found (${SEED_ADMIN_EMAIL})`);
    console.error("   Run 'node seed.js' first to create the admin and hospital.\n");
    process.exit(1);
  }
  if (!admin.hospitalId) {
    console.error(`\n❌ Seed admin has no hospital linked.`);
    console.error("   Run 'node seed.js' first.\n");
    process.exit(1);
  }

  const hospitalId = admin.hospitalId;
  console.log(`👤 Admin: ${admin.name} (${admin.email})`);
  console.log(`🏥 Hospital ID: ${hospitalId}`);

  if (shouldClear) {
    const deleted = await ResourceStatus.deleteMany({ hospitalId });
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing resource records`);
  }

  // Read CSV
  const rows = await new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });

  console.log(`📊 Read ${rows.length} rows\n`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const docs = [];

    for (const row of batch) {
      try {
        const ts = row["timestamp"];
        if (!ts) { skipped++; continue; }

        docs.push({
          hospitalId,
          timestamp: new Date(ts),
          totalBeds: num(row["total_beds"]) || 0,
          occupiedBeds: num(row["occupied_beds"]) || 0,
          availableBeds: num(row["available_beds"]) || 0,
          totalIcuBeds: num(row["total_icu_beds"]) || 0,
          occupiedIcuBeds: num(row["occupied_icu_beds"]) || 0,
          availableIcuBeds: num(row["available_icu_beds"]) || 0,
          totalDoctors: num(row["total_doctors"]) || 0,
          availableDoctors: num(row["available_doctors"]) || 0,
          totalNurses: num(row["total_nurses"]) || 0,
          availableNurses: num(row["available_nurses"]) || 0,
          ventilatorsTotal: num(row["ventilators_total"]) || 0,
          ventilatorsInUse: num(row["ventilators_in_use"]) || 0,
          oxygenUnitsTotal: num(row["oxygen_units_total"]) || 0,
          oxygenUnitsInUse: num(row["oxygen_units_in_use"]) || 0,
          incomingPatients: num(row["incoming_patients"]) || 0,
          dischargedPatients: num(row["discharged_patients"]) || 0,
          emergencyCases: num(row["emergency_cases"]) || 0,
          opdCases: num(row["opd_cases"]) || 0,
          avgWaitTimeMinutes: num(row["avg_wait_time_minutes"]) || 0,
          avgTreatmentTimeMinutes: num(row["avg_treatment_time_minutes"]) || 0,
          bedTurnoverRate: num(row["bed_turnover_rate"]) || 0,
          resourceUtilizationRate: num(row["resource_utilization_rate"]) || 0,
          icuUtilizationRate: num(row["icu_utilization_rate"]) || 0,
          staffLoadRatio: num(row["staff_load_ratio"]) || 0,
          emergencyPressureScore: num(row["emergency_pressure_score"]) || 0,
        });
      } catch {
        skipped++;
      }
    }

    if (docs.length > 0) {
      await ResourceStatus.insertMany(docs, { ordered: false });
      created += docs.length;
    }

    process.stdout.write(`\r   Uploading... ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log(`\n\n✅ Done!`);
  console.log(`   📊 Records uploaded: ${created}`);
  console.log(`   ⚠️  Rows skipped:    ${skipped}`);
  console.log(`   🏥 Linked to hospital: ${hospitalId}\n`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});