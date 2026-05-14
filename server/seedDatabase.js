require('dotenv').config();
const mongoose = require('mongoose');

// Adjust these paths if your models folder is located differently
const Student = require('./models/Student');
const Unit = require('./models/Unit');
const ClassSession = require('./models/ClassSession');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');

const S_A = "69c7de7cb947c88b63bb3076"; // Test One
const S_B = "69c7d8a1b947c88b63bb2de6"; // Test Two
const S_C = "69e8f37b3acf747c5701bf43"; // Patrick Odhiambo

// Targets out of 25 to maintain the correct Green/Yellow/Red percentages
const RIGGED_TARGETS = {
   [S_A]: { "BME 401": 23, "BME 402": 21, "BME 403": 16 }, // ~92% (Green), ~84% (Green), 64% (Yellow)
   [S_B]: { "BME 401": 20, "BME 402": 15, "BME 403": 10 }, // 80% (Green), 60% (Yellow), 40% (Red)
   [S_C]: { "BME 401": 18, "BME 402": 9,  "BME 403": 5 }   // 72% (Yellow), 36% (Red), 20% (Red)
};

const seedDB = async () => {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || process.env.URI);
        
        console.log("1. Wiping old, corrupted test data...");
        await Attendance.deleteMany({});
        await ClassSession.deleteMany({});
        await Notification.deleteMany({});
        
        console.log("2. Resetting all Unit session counts to 25...");
        await Unit.updateMany({}, { totalSessions: 25 });

        const units = await Unit.find({});
        const allStudents = await Student.find({ role: 'student' }); 

        const now = new Date();
        // Set start time to mid-January 2026
        const START_TIME = new Date('2026-01-15T08:00:00.000Z');
        const TOTAL_DURATION = now.getTime() - START_TIME.getTime();
        const TIME_PER_SESSION = TOTAL_DURATION / 25;

        let attendanceDocs = [];
        let sessionDocs = [];

        console.log("3. Generating 25 sessions (Jan - May) with manual overrides...");
        for (const unit of units) {
           const enrolledStudents = allStudents.filter(s => s.course === unit.course && s.semester === unit.semester);

           for (let i = 0; i < 25; i++) {
               const sessionDate = new Date(START_TIME.getTime() + (i * TIME_PER_SESSION));
               const sessionId = `${unit.code}_S${i+1}_${sessionDate.getTime()}`;

               sessionDocs.push({
                   unitCode: unit.code,
                   unitName: unit.name,
                   sessionId: sessionId,
                   date: sessionDate
               });

               for (const student of enrolledStudents) {
                   let isPresent = false;
                   const sIdStr = student._id.toString();

                   // Apply Rigged Rules for our 3 Demo Students
                   if (RIGGED_TARGETS[sIdStr] && RIGGED_TARGETS[sIdStr][unit.code] !== undefined) {
                       const target = RIGGED_TARGETS[sIdStr][unit.code];
                       
                       // Force presence in the final week (session index 24) to ensure recent data
                       if (i === 24 && target > 0) {
                           isPresent = true;
                       } else if (i < target - 1) { // Fill the rest of their target count from the beginning
                           isPresent = true;
                       }
                   } else {
                       // Apply general 70% attendance logic for everyone else
                       isPresent = Math.random() < 0.7;
                   }

                   if (isPresent) {
                       let status = 'Present';
                       let distance = Math.floor(Math.random() * 46) + 5; // Normal distance 5m - 50m

                       // OVERRIDE LOGIC: 
                       // 1. Force the special students to have a 'Manual' entry in the last week
                       if (i === 24 && [S_A, S_B, S_C].includes(sIdStr)) {
                           status = 'Manual';
                           distance = 0;
                       } 
                       // 2. Give ~18% of the rest of the general population a Manual status
                       else if (Math.random() < 0.18) {
                           status = 'Manual';
                           distance = 0;
                       }

                       attendanceDocs.push({
                           student: student._id,
                           unitName: unit.name,
                           unitCode: unit.code,
                           sessionId: sessionId,
                           unitId: unit._id,
                           distance: distance,
                           date: sessionDate,
                           status: status
                       });
                   }
               }
           }
        }

        console.log("Inserting Sessions and Attendance records...");
        await ClassSession.insertMany(sessionDocs);
        await Attendance.insertMany(attendanceDocs);

        console.log("4. Injecting targeted UI Notifications with staggered timestamps...");
        
        // Helper to generate a random time within the last 48 hours so notifications don't group together
        const getRandomRecentDate = () => {
            return new Date(now.getTime() - Math.floor(Math.random() * 48 * 60 * 60 * 1000));
        };

        const notifs = [
           // Student A (Test One)
           { student: S_A, unitCode: "BME 403", title: "Attendance Warning", message: "Your attendance for Solid Mechanics is at 64%. (Requirement: 75%)", type: "warning", date: getRandomRecentDate() },
           { student: S_A, unitCode: "BME 402", title: "Attendance Recovered", message: "Great job! Your attendance for Heat transfer is back up to 84%.", type: "success", date: getRandomRecentDate() },
           { student: S_A, unitCode: "BME 401", title: "Attendance Recovered", message: "Great job! Your attendance for Thermodynamics is back up to 92%.", type: "success", date: getRandomRecentDate() },
           
           // Student B (Test Two)
           { student: S_B, unitCode: "BME 401", title: "Attendance Recovered", message: "Great job! Your attendance for Thermodynamics is back up to 80%.", type: "success", date: getRandomRecentDate() },
           { student: S_B, unitCode: "BME 402", title: "Attendance Warning", message: "Your attendance for Heat transfer has dropped to 60%. (Requirement: 75%)", type: "warning", date: getRandomRecentDate() },
           { student: S_B, unitCode: "BME 403", title: "Low Attendance Alert", message: "Critical Warning: Your attendance for Solid Mechanics is at 40%.", type: "warning", date: getRandomRecentDate() },
           
           // Student C (Patrick)
           { student: S_C, unitCode: "BME 401", title: "Attendance Warning", message: "Your attendance for Thermodynamics has dropped to 72%. (Requirement: 75%)", type: "warning", date: getRandomRecentDate() },
           { student: S_C, unitCode: "BME 402", title: "Low Attendance Alert", message: "Critical Warning: Your attendance for Heat transfer is at 36%.", type: "warning", date: getRandomRecentDate() },
           { student: S_C, unitCode: "BME 403", title: "Low Attendance Alert", message: "Critical Warning: Your attendance for Solid Mechanics is at 20%.", type: "warning", date: getRandomRecentDate() }
        ];
        
        await Notification.insertMany(notifs);

        console.log("=========================================");
        console.log("✅ SEED COMPLETE! Your database is now pristine and ready for the defense.");
        console.log("=========================================");
        process.exit(0);

    } catch(err) {
        console.error("❌ Seeding Failed:", err);
        process.exit(1);
    }
};

seedDB();