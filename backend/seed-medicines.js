// backend/seed-medicines.js
// Seed script to load medicine inventory from CSV to MongoDB

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const { Medicine, MedicineUsageLog, Hospital } = require("./models");

const CSV_PATH = process.env.MEDICINE_CSV_PATH || "../synthetic_medicine_inventory_5000.csv";

async function seedMedicines() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Get or create default hospital for seeding
    let hospital = await Hospital.findOne();
    if (!hospital) {
      console.log("⚠️  No hospital found. Creating default hospital for seeding...");
      hospital = await Hospital.create({
        name: "Default Hospital",
        phone: "1234567890",
        address: {
          street: "Main St",
          city: "City",
          state: "State",
          pincode: "00000",
        },
        location: {
          type: "Point",
          coordinates: [0, 0],
        },
      });
    }

    console.log(`\n🏥 Using hospital: ${hospital.name}`);

    // Track medicines and their stats
    const medicineStats = {};
    const usageLogs = [];
    let recordCount = 0;

    // Read CSV and process records
    console.log("📖 Reading CSV file...");

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => {
        recordCount++;

        const medicineKey = `${row.medicine_name}-${row.medicine_category}`;

        // Aggregate medicine stats
        if (!medicineStats[medicineKey]) {
          medicineStats[medicineKey] = {
            medicineName: row.medicine_name,
            category: row.medicine_category || "other",
            department: row.department,
            totalStockRemaining: parseInt(row.stock_remaining) || 0,
            totalQuantityUsed: parseInt(row.quantity_used) || 0,
            usageCount: 0,
            lastStockRemaining: parseInt(row.stock_remaining) || 0,
            records: [],
          };
        }

        medicineStats[medicineKey].totalQuantityUsed += parseInt(row.quantity_used) || 0;
        medicineStats[medicineKey].usageCount++;
        medicineStats[medicineKey].lastStockRemaining = parseInt(row.stock_remaining) || 0;
        medicineStats[medicineKey].records.push(row);

        // Store usage log
        usageLogs.push({
          hospitalId: hospital._id,
          date: new Date(row.date),
          hour: parseInt(row.hour),
          medicineName: row.medicine_name,
          medicineCategory: row.medicine_category,
          department: row.department,
          quantityUsed: parseInt(row.quantity_used) || 0,
          stockRemaining: parseInt(row.stock_remaining) || 0,
          patientCount: parseInt(row.patient_count) || 0,
          emergencyCases: parseInt(row.emergency_cases) || 0,
          opdCases: parseInt(row.opd_cases) || 0,
          season: row.season,
          isWeekend: row.is_weekend === "1",
        });
      })
      .on("end", async () => {
        console.log(`\n✅ CSV read complete: ${recordCount} records processed`);

        // Create or update medicines in database
        console.log("\n📝 Creating/updating medicines in MongoDB...");

        const medicinesToInsert = [];

        for (const [key, stats] of Object.entries(medicineStats)) {
          const dailyAveragUsage = Math.round(
            stats.totalQuantityUsed / stats.usageCount
          );
          const depletionRate = dailyAveragUsage;
          const daysUntilStockout =
            depletionRate > 0
              ? Math.ceil(stats.lastStockRemaining / depletionRate)
              : 999;

          const medicine = {
            hospitalId: hospital._id,
            medicineName: stats.medicineName,
            category: stats.category,
            totalStock: stats.lastStockRemaining,
            minimumThreshold: 100,
            reorderQuantity: 500,
            pricePerUnit: Math.floor(Math.random() * 100) + 10, // Random price
            quantityUsed: stats.records[stats.records.length - 1]?.quantity_used || 0,
            dailyAverageUsage: dailyAveragUsage,
            weeklyUsage: dailyAveragUsage * 7,
            monthlyUsage: dailyAveragUsage * 30,
            depletionRate: depletionRate,
            daysUntilStockout: daysUntilStockout,
            isDepletingFast: daysUntilStockout < 7,
            isOutOfStock: stats.lastStockRemaining === 0,
            isLowStock: stats.lastStockRemaining < 100,
            allocatedTo: [
              {
                department: stats.department,
                quantity: stats.lastStockRemaining,
                lastUpdated: new Date(),
              },
            ],
            lastUsedAt: new Date(stats.records[stats.records.length - 1]?.date),
          };

          medicinesToInsert.push(medicine);
        }

        // Bulk insert or update medicines
        try {
          for (const medicine of medicinesToInsert) {
            await Medicine.updateOne(
              {
                hospitalId: medicine.hospitalId,
                medicineName: medicine.medicineName,
              },
              { $set: medicine },
              { upsert: true }
            );
          }
          console.log(`✅ ${medicinesToInsert.length} medicines created/updated`);
        } catch (err) {
          console.error("❌ Error creating medicines:", err);
        }

        // Store usage logs
        console.log("\n📊 Creating medicine usage logs...");
        try {
          // Clear old logs
          await MedicineUsageLog.deleteMany({
            hospitalId: hospital._id,
          });

          // Batch insert usage logs (MongoDB has a size limit, so do in chunks)
          const batchSize = 1000;
          for (let i = 0; i < usageLogs.length; i += batchSize) {
            const batch = usageLogs.slice(i, i + batchSize);

            // Enrich logs with medicine IDs
            for (const log of batch) {
              const medicine = await Medicine.findOne({
                hospitalId: hospital._id,
                medicineName: log.medicineName,
              });
              if (medicine) {
                log.medicineId = medicine._id;
              }
            }

            await MedicineUsageLog.insertMany(batch, { ordered: false }).catch(
              (err) => {
                if (err.code === 11000) {
                  console.log("⚠️  Some duplicate logs skipped");
                } else {
                  throw err;
                }
              }
            );
          }
          console.log(`✅ ${usageLogs.length} usage logs created`);
        } catch (err) {
          console.error("❌ Error creating usage logs:", err);
        }

        // Summary
        console.log("\n📈 SEEDING SUMMARY");
        console.log("═══════════════════════════════════════");
        console.log(
          `Total Records Processed: ${recordCount}`
        );
        console.log(
          `Unique Medicines: ${Object.keys(medicineStats).length}`
        );
        console.log(`Usage Logs: ${usageLogs.length}`);

        // Show top depleting medicines
        console.log("\n⚠️  TOP 10 DEPLETING MEDICINES:");
        const depleting = Object.values(medicineStats)
          .sort((a, b) => b.totalQuantityUsed - a.totalQuantityUsed)
          .slice(0, 10);

        depleting.forEach((med, idx) => {
          console.log(
            `${idx + 1}. ${med.medicineName} (${med.category}) - Used: ${med.totalQuantityUsed} units, Stock: ${med.lastStockRemaining}`
          );
        });

        console.log("\n✅ Seeding completed successfully!");
        process.exit(0);
      })
      .on("error", (err) => {
        console.error("❌ CSV reading error:", err);
        process.exit(1);
      });
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

seedMedicines();
