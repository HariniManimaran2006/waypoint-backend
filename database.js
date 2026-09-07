const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.join(__dirname, 'waypoint.db');

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      about TEXT,
      college TEXT,
      department TEXT,
      year_of_study TEXT,
      cgpa TEXT,
      role TEXT DEFAULT 'student',
      password TEXT
    )`);

    // 2. Internships Table
    db.run(`CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      title TEXT,
      company TEXT,
      location TEXT,
      duration TEXT,
      stipend TEXT,
      stipend_val INTEGER,
      skills TEXT,
      closes TEXT,
      deadline_days INTEGER,
      deadline_date TEXT,
      contact TEXT,
      description TEXT,
      about TEXT
    )`);

    // 3. Applications Table
    db.run(`CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_email TEXT,
      student_name TEXT,
      internship_title TEXT,
      company TEXT,
      applied_date TEXT,
      deadline TEXT,
      status TEXT,
      updated TEXT
    )`);

    // 4. Companies Table
    db.run(`CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      name TEXT,
      website TEXT,
      email TEXT,
      description TEXT,
      listings INTEGER
    )`);

    // 5. Students Table
    db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT,
      college TEXT,
      department TEXT,
      year TEXT,
      cgpa TEXT,
      status TEXT,
      skills TEXT
    )`);

    // 6. Documents Table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      type TEXT,
      size_bytes INTEGER,
      url TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed Default Admin Account
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row && row.count === 0) {
        console.log('Seeding default Admin user...');
        db.run(`INSERT INTO users (full_name, email, phone, college, department, year_of_study, cgpa, role, password) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['Placement Admin', 'admin@waypoint.edu', '+91 90000 00000', 'Waypoint HQ', 'Placement Cell', 'N/A', 'N/A', 'admin', 'admin123']
        );
      }
    });

    // Seed Initial Internships & Companies
    db.get("SELECT COUNT(*) as count FROM internships", (err, row) => {
      if (row && row.count === 0) {
        const sampleInternships = [
          ['GL', 'Supply Chain Analyst Intern', 'Greenline Logistics', 'Chennai', '10 weeks', '₹9,000/mo', 9000, 'Excel, SQL, Forecasting', 'Closes in 3d', 3, '03 Sept 2026', 'https://greenlinelogistics.com/careers/analyst', 'Analyze route efficiency data...', 'Supply-chain optimization platform.'],
          ['FR', 'Embedded Systems Intern', 'Fernbridge Robotics', 'Bengaluru', '16 weeks', '₹15,000/mo', 15000, 'C++, Embedded C, ROS', 'Closes in 4d', 4, '04 Sept 2026', 'https://fernbridge.io/careers/embedded', 'Support firmware development...', 'Early-stage robotics startup.'],
          ['LP', 'Backend Development Intern', 'Ledger Point', 'Hyderabad', '12 weeks', '₹14,000/mo', 14000, 'Node.js, PostgreSQL, REST APIs', 'Closes in 6d', 6, '06 Sept 2026', 'https://ledgerpoint.io/careers/backend', 'Build secure microservices...', 'Ledger Point builds financial ledger.']
        ];
        const stmtI = db.prepare(`INSERT INTO internships (code, title, company, location, duration, stipend, stipend_val, skills, closes, deadline_days, deadline_date, contact, description, about) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        sampleInternships.forEach(item => stmtI.run(item));
        stmtI.finalize();

        const sampleComps = [
          ['NA', 'Northwind Analytics', 'northwindanalytics.com', 'hiring@northwindanalytics.com', 'Data analytics consultancy.', 2],
          ['FR', 'Fernbridge Robotics', 'fernbridge.io', 'careers@fernbridge.io', 'Robotics startup.', 1]
        ];
        const stmtC = db.prepare(`INSERT INTO companies (code, name, website, email, description, listings) VALUES (?, ?, ?, ?, ?, ?)`);
        sampleComps.forEach(item => stmtC.run(item));
        stmtC.finalize();
      }
    });
  });
}

module.exports = db;