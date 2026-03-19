// backend/seed.js
//
// Usage:
//   1. Place your CSV file(s) in backend/data/
//   2. npm install csv-parser
//   3. node seed.js
//
// Supports BOTH CSV formats:
//   - HDHI_Admission_data_processed.csv (has patient names)
//   - datset1.csv / dataset_2.csv (raw with all medical flags)
//
// Run with: node seed.js [--file=datset1.csv] [--clear]
//   --clear  wipes existing data before seeding
//   --file   specify CSV filename inside backend/data/

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const bcrypt = require("bcryptjs");
const {
  Patient,
  Admin,
  Hospital,
  Admission,
  MedicalRecord,
  PatientInflow,
  Counter,
} = require("./models");

// ── Config ──────────────────────────────────────────────────────────
const BATCH_SIZE = 100;
const DEFAULT_PASSWORD = "patient123"; // seeded patients get this password

// ── Indian name generator for raw dataset ───────────────────────────
const FIRST_NAMES_M = [
  "Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Ayaan","Krishna","Ishaan",
  "Shaurya","Atharva","Advik","Pranav","Advaith","Dhruv","Kabir","Ritvik","Aarush","Kayaan",
  "Darsh","Veer","Yash","Rohan","Rahul","Amit","Siddharth","Vikram","Raj","Anil",
  "Suresh","Mahesh","Rajesh","Deepak","Ravi","Mohan","Ashok","Vijay","Arun","Karan",
  "Nikhil","Sahil","Gaurav","Manish","Harsh","Pankaj","Sachin","Tushar","Ankur","Varun",
];
const FIRST_NAMES_F = [
  "Aadhya","Aanya","Diya","Saanvi","Myra","Ananya","Pari","Anika","Navya","Ira",
  "Prisha","Kavya","Riya","Aarohi","Anvi","Siya","Meera","Ishita","Pooja","Neha",
  "Rekha","Sunita","Priya","Anjali","Deepa","Rani","Lakshmi","Geeta","Suman","Nisha",
  "Shreya","Tanvi","Divya","Swati","Komal","Jyoti","Seema","Radha","Pallavi","Shweta",
];
const LAST_NAMES = [
  "Sharma","Verma","Gupta","Patel","Singh","Kumar","Jain","Agarwal","Mehta","Shah",
  "Desai","Reddy","Nair","Pillai","Iyer","Menon","Bose","Das","Ghosh","Sen",
  "Chatterjee","Mukherjee","Banerjee","Roy","Dutta","Sinha","Mishra","Pandey","Dubey","Tiwari",
  "Chauhan","Thakur","Yadav","Rathore","Saxena","Kapoor","Malhotra","Bhatia","Kohli","Ahuja",
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(gender) {
  const first = gender === "F" ? randomFrom(FIRST_NAMES_F) : randomFrom(FIRST_NAMES_M);
  return `${first} ${randomFrom(LAST_NAMES)}`;
}

function generateEmail(name, index) {
  const slug = name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
  return `${slug}.${index}@medicore-seed.com`;
}

function generatePhone() {
  return `+91${Math.floor(7000000000 + Math.random() * 3000000000)}`;
}

// ── Date parsing ────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null;
  // Handle both M/D/YYYY and DD/MM/YYYY formats
  const parts = str.split("/");
  if (parts.length !== 3) return null;

  // If first part > 12, it's DD/MM/YYYY
  if (parseInt(parts[0]) > 12) {
    return new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
  }
  return new Date(str);
}

// ── Numeric parser (handles EMPTY, blanks) ──────────────────────────
function num(val) {
  if (!val || val === "EMPTY" || val === "" || val === "NA") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function bool(val) {
  return val === "1" || val === 1 || val === true;
}

// ── Detect CSV format ───────────────────────────────────────────────
function detectFormat(headers) {
  if (headers.includes("patient_name")) return "processed";
  if (headers.includes("SNO") || headers.includes("MRD No.")) return "raw";
  return "unknown";
}

// ── Parse outcome ───────────────────────────────────────────────────
function mapOutcome(val) {
  if (!val) return "discharged";
  const v = val.toUpperCase().trim();
  if (v === "DISCHARGE" || v === "DISCHARGED") return "discharged";
  if (v === "EXPIRY" || v === "EXPIRED") return "expired";
  if (v === "DAMA") return "dama";
  if (v === "CRITICAL") return "critical";
  return "discharged";
}

// ── Main seed ───────────────────────────────────────────────────────
async function seed() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");
  const fileArg = args.find((a) => a.startsWith("--file="));
  const csvFilename = fileArg ? fileArg.split("=")[1] : null;

  // Find CSV file
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.error(`\n❌ Created backend/data/ directory. Place your CSV file there and re-run.\n`);
    process.exit(1);
  }

  let csvPath;
  if (csvFilename) {
    csvPath = path.join(dataDir, csvFilename);
  } else {
    // Auto-detect: prefer processed, fallback to raw
    const candidates = [
      "HDHI_Admission_data_processed.csv",
      "datset1.csv",
      "dataset_2.csv",
    ];
    for (const c of candidates) {
      const p = path.join(dataDir, c);
      if (fs.existsSync(p)) {
        csvPath = p;
        break;
      }
    }
  }

  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error(`\n❌ No CSV file found in backend/data/`);
    console.error(`   Place your CSV there or use: node seed.js --file=yourfile.csv\n`);
    process.exit(1);
  }

  console.log(`\n📁 Using: ${path.basename(csvPath)}`);

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  if (shouldClear) {
    console.log("🗑️  Clearing existing data...");
    await Promise.all([
      Patient.deleteMany({}),
      Admission.deleteMany({}),
      MedicalRecord.deleteMany({}),
      PatientInflow.deleteMany({}),
      Counter.deleteMany({}),
    ]);
    console.log("   Done.");
  }

  // Create seed hospital
  let hospital = await Hospital.findOne({ name: "HDHI Seed Hospital" });
  if (!hospital) {
    hospital = await Hospital.create({
      name: "HDHI Seed Hospital",
      phone: "+911234567890",
      email: "admin@hdhi-seed.com",
      address: { street: "Sector 62", city: "Chandigarh", state: "Punjab", pincode: "160062" },
      location: { type: "Point", coordinates: [76.7794, 30.7333] },
      beds: {
        general: { total: 200, available: 80 },
        icu: { total: 50, available: 15 },
        emergency: { total: 30, available: 10 },
        pediatric: { total: 20, available: 8 },
        maternity: { total: 15, available: 5 },
      },
      opds: [
        { name: "Cardiology", dailyCapacity: 100, currentLoad: 0, isActive: true },
        { name: "General Medicine", dailyCapacity: 80, currentLoad: 0, isActive: true },
        { name: "Emergency", dailyCapacity: 50, currentLoad: 0, isActive: true },
      ],
    });
    console.log("🏥 Created seed hospital:", hospital.name);
  } else {
    console.log("🏥 Using existing seed hospital:", hospital.name);
  }

  // Create seed admin
  const hashedPw = await bcrypt.hash("admin123", 10);
  let admin = await Admin.findOne({ email: "seedadmin@hdhi-seed.com" });
  if (!admin) {
    admin = await Admin.create({
      name: "Seed Admin",
      email: "seedadmin@hdhi-seed.com",
      password: hashedPw,
      phone: "+910000000000",
      employeeId: "SEED-001",
      department: "Administration",
      role: "superadmin",
      hospitalId: hospital._id,
    });
    console.log("👤 Created seed admin: seedadmin@hdhi-seed.com / admin123");
  }

  // Read CSV rows
  const rows = await new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });

  console.log(`📊 Read ${rows.length} rows from CSV`);

  // Detect format
  const headers = Object.keys(rows[0]);
  const format = detectFormat(headers);
  console.log(`📋 Detected format: ${format}`);

  if (format === "unknown") {
    console.error("❌ Unrecognized CSV format. Check headers.");
    process.exit(1);
  }

  // Track patients by source ID to deduplicate
  const patientMap = new Map(); // sourceId -> mongoId
  const hashedDefaultPw = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const inflowMap = new Map(); // "YYYY-MM-DD" -> count

  let created = { patients: 0, admissions: 0, medicalRecords: 0 };
  let skipped = 0;

  // Process in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const patientDocs = [];
    const admissionDocs = [];
    const medRecDocs = [];

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const globalIdx = i + j;

      try {
        let sourceId, name, age, gender, genderFull, bloodGroup, residenceType;
        let admissionDate, dischargeDate, admissionType, isEmergency;
        let durationOfStay, icuStay, comorbidityScore, serviceIntensity, outcome;
        let hb, tlc, platelets, glucose, urea, creatinine, bnp, raisedCardiac, ef;
        let smoking, alcohol, dm, htn, cadFlag, priorCmp, ckd;
        let diagnosisFlags = {};

        if (format === "processed") {
          sourceId = row["patient_id"];
          name = row["patient_name"];
          age = num(row["AGE"]);
          gender = row["gender"] === "Male" ? "M" : "F";
          genderFull = row["gender"] === "Male" ? "male" : "female";
          bloodGroup = row["blood_group"];
          residenceType = row["residence_type"];
          admissionDate = parseDate(row["admission_date"]);
          dischargeDate = parseDate(row["discharge_date"]);
          admissionType = row["admission_type"] === "Emergency" ? "Emergency" : "OPD";
          isEmergency = row["is_emergency"] === "1";
          durationOfStay = num(row["length_of_stay_hours"]);
          icuStay = num(row["duration of intensive unit stay"]);
          comorbidityScore = num(row["comorbidity_score"]);
          serviceIntensity = num(row["service_intensity"]);
          outcome = mapOutcome(row["outcome"]);
          hb = num(row["HB"]);
          tlc = num(row["TLC"]);
          platelets = num(row["PLATELETS"]);
          glucose = num(row["GLUCOSE"]);
          urea = num(row["UREA"]);
          creatinine = num(row["CREATININE"]);
        } else {
          // Raw format
          sourceId = row["MRD No."] || `RAW-${globalIdx}`;
          gender = (row["GENDER"] || "").trim().toUpperCase();
          if (gender !== "M" && gender !== "F") gender = "M";
          genderFull = gender === "F" ? "female" : "male";
          name = generateName(gender);
          age = num(row["AGE"]);
          bloodGroup = randomFrom(BLOOD_GROUPS);
          residenceType = row["RURAL"] === "R" ? "Rural" : "Urban";
          admissionDate = parseDate(row["D.O.A"]);
          dischargeDate = parseDate(row["D.O.D"]);
          const admType = (row["TYPE OF ADMISSION-EMERGENCY/OPD"] || "").trim().toUpperCase();
          admissionType = admType === "E" ? "Emergency" : "OPD";
          isEmergency = admType === "E";
          durationOfStay = num(row["DURATION OF STAY"]) ? num(row["DURATION OF STAY"]) * 24 : null;
          icuStay = num(row["duration of intensive unit stay"]);
          outcome = mapOutcome(row["OUTCOME"]);

          // Lab values
          hb = num(row["HB"]);
          tlc = num(row["TLC"]);
          platelets = num(row["PLATELETS"]);
          glucose = num(row["GLUCOSE"]);
          urea = num(row["UREA"]);
          creatinine = num(row["CREATININE"]);
          bnp = num(row["BNP"]);
          raisedCardiac = bool(row["RAISED CARDIAC ENZYMES"]);
          ef = num(row["EF"]);

          // Risk factors
          smoking = bool(row["SMOKING"] || row["SMOKING "]);
          alcohol = bool(row["ALCOHOL"]);
          dm = bool(row["DM"]);
          htn = bool(row["HTN"]);
          cadFlag = bool(row["CAD"]);
          priorCmp = bool(row["PRIOR CMP"]);
          ckd = bool(row["CKD"]);

          // Diagnosis flags
          diagnosisFlags = {
            severeAnaemia: bool(row["SEVERE ANAEMIA"]),
            anaemia: bool(row["ANAEMIA"]),
            stableAngina: bool(row["STABLE ANGINA"]),
            acs: bool(row["ACS"]),
            stemi: bool(row["STEMI"]),
            atypicalChestPain: bool(row["ATYPICAL CHEST PAIN"]),
            heartFailure: bool(row["HEART FAILURE"]),
            hfref: bool(row["HFREF"]),
            hfnef: bool(row["HFNEF"]),
            valvular: bool(row["VALVULAR"]),
            chb: bool(row["CHB"]),
            sss: bool(row["SSS"]),
            aki: bool(row["AKI"]),
            cvaInfarct: bool(row["CVA INFRACT"]),
            cvaBleed: bool(row["CVA BLEED"]),
            af: bool(row["AF"]),
            vt: bool(row["VT"]),
            psvt: bool(row["PSVT"]),
            congenital: bool(row["CONGENITAL"]),
            uti: bool(row["UTI"]),
            neuroCardiogenicSyncope: bool(row["NEURO CARDIOGENIC SYNCOPE"]),
            orthostatic: bool(row["ORTHOSTATIC"]),
            infectiveEndocarditis: bool(row["INFECTIVE ENDOCARDITIS"]),
            dvt: bool(row["DVT"]),
            cardiogenicShock: bool(row["CARDIOGENIC SHOCK"]),
            shock: bool(row["SHOCK"]),
            pulmonaryEmbolism: bool(row["PULMONARY EMBOLISM"]),
            chestInfection: bool(row["CHEST INFECTION"]),
          };
        }

        // Build medical conditions list from flags
        const conditions = [];
        if (dm) conditions.push("Diabetes");
        if (htn) conditions.push("Hypertension");
        if (cadFlag) conditions.push("Coronary Artery Disease");
        if (ckd) conditions.push("Chronic Kidney Disease");
        if (priorCmp) conditions.push("Prior Cardiomyopathy");

        // Create or reuse patient
        let patientId = patientMap.get(sourceId);
        if (!patientId) {
          const patient = new Patient({
            name: name,
            email: generateEmail(name, globalIdx),
            password: hashedDefaultPw,
            phone: generatePhone(),
            age: age,
            gender: genderFull,
            bloodGroup: BLOOD_GROUPS.includes(bloodGroup) ? bloodGroup : undefined,
            residenceType: residenceType,
            medicalConditions: conditions,
          });
          await patient.save(); // triggers PID auto-gen
          patientMap.set(sourceId, patient._id);
          patientId = patient._id;
          created.patients++;
        }

        // Create admission
        const admission = await Admission.create({
          patientId: patientId,
          hospitalId: hospital._id,
          admittedBy: admin._id,
          admissionType: admissionType,
          isEmergency: isEmergency,
          status: outcome,
          admittedAt: admissionDate || new Date("2017-04-01"),
          dischargedAt: dischargeDate || null,
          lengthOfStayHours: durationOfStay,
          icuStayDuration: icuStay,
          comorbidityScore: comorbidityScore || null,
          serviceIntensity: serviceIntensity || null,
          ward: isEmergency ? "Emergency" : "General",
        });
        created.admissions++;

        // Create medical record
        const medRec = {
          patientId: patientId,
          admissionId: admission._id,
          hospitalId: hospital._id,
          hb: hb,
          tlc: tlc,
          platelets: platelets,
          glucose: glucose,
          urea: urea,
          creatinine: creatinine,
          bnp: bnp || null,
          raisedCardiacEnzymes: raisedCardiac || false,
          ef: ef || null,
          smoking: smoking || false,
          alcohol: alcohol || false,
          diabetes: dm || false,
          hypertension: htn || false,
          cad: cadFlag || false,
          priorCmp: priorCmp || false,
          ckd: ckd || false,
          ...diagnosisFlags,
          recordedAt: admissionDate || new Date("2017-04-01"),
        };
        await MedicalRecord.create(medRec);
        created.medicalRecords++;

        // Track inflow per day
        if (admissionDate) {
          const dayKey = admissionDate.toISOString().split("T")[0];
          inflowMap.set(dayKey, (inflowMap.get(dayKey) || 0) + 1);
        }
      } catch (err) {
        skipped++;
        if (skipped <= 5) {
          console.error(`   ⚠️ Row ${globalIdx + 1} skipped: ${err.message}`);
        }
      }
    }

    process.stdout.write(`\r   Processing... ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log(""); // newline after progress

  // Create patient inflow records
  let inflowCount = 0;
  for (const [dayKey, count] of inflowMap) {
    try {
      await PatientInflow.findOneAndUpdate(
        { hospitalId: hospital._id, date: new Date(dayKey) },
        { $inc: { count: count } },
        { upsert: true }
      );
      inflowCount++;
    } catch (err) {
      // ignore duplicate key errors
    }
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`   📋 Patients created:        ${created.patients}`);
  console.log(`   🏥 Admissions created:       ${created.admissions}`);
  console.log(`   🧪 Medical records created:  ${created.medicalRecords}`);
  console.log(`   📈 Inflow days tracked:      ${inflowCount}`);
  console.log(`   ⚠️  Rows skipped:            ${skipped}`);
  console.log(`\n   🔐 Seed admin login: seedadmin@hdhi-seed.com / admin123`);
  console.log(`   🔐 Seed patient passwords: ${DEFAULT_PASSWORD}`);
  console.log(`   🏥 Hospital: ${hospital.name} (ID: ${hospital._id})\n`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
