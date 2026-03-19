require("dotenv").config();
const mongoose = require("mongoose");
const { Medicine } = require("./models");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const count = await Medicine.countDocuments();
    console.log(`\n📊 Total medicines in DB: ${count}`);

    if (count > 0) {
      const medicines = await Medicine.find().limit(5);
      console.log("\n📋 Sample medicines:");
      medicines.forEach((m) => {
        console.log(
          `  - ${m.medicineName} (${m.category}) - Stock: ${m.totalStock}, Days until stockout: ${m.daysUntilStockout}`
        );
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

check();
