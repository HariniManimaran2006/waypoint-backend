const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const upload = multer({ dest: uploadDir });

/* ==================== INTERNSHIPS API ==================== */
app.get('/api/internships', (req, res) => {
  db.all("SELECT * FROM internships", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map(r => ({ ...r, skills: r.skills ? r.skills.split(', ') : [] }));
    res.json(formatted);
  });
});

app.post('/api/internships', (req, res) => {
  const { code, title, company, location, duration, stipend, stipend_val, skills, closes, deadline_days, deadline_date, contact, description, about } = req.body;
  const skillsStr = Array.isArray(skills) ? skills.join(', ') : skills;

  const sql = `INSERT INTO internships (code, title, company, location, duration, stipend, stipend_val, skills, closes, deadline_days, deadline_date, contact, description, about) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  db.run(sql, [code || 'IN', title, company, location, duration, stipend, stipend_val || 10000, skillsStr, closes || 'Open', deadline_days || 7, deadline_date, contact, description, about], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Internship added successfully' });
  });
});

app.delete('/api/internships/:id', (req, res) => {
  db.run("DELETE FROM internships WHERE id = ?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Deleted successfully', rowsAffected: this.changes });
  });
});

/* ==================== APPLICATIONS API ==================== */
app.get('/api/applications', (req, res) => {
  const studentEmail = req.query.email;
  let sql = "SELECT * FROM applications";
  let params = [];

  if (studentEmail && studentEmail !== 'admin@waypoint.edu') {
    sql += " WHERE student_email = ?";
    params.push(studentEmail);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/applications', (req, res) => {
  const { student_email, student_name, internship_title, company, applied_date, deadline, status, updated } = req.body;
  const sql = `INSERT INTO applications (student_email, student_name, internship_title, company, applied_date, deadline, status, updated) VALUES (?,?,?,?,?,?,?,?)`;
  
  db.run(sql, [
    student_email, 
    student_name || 'Student', 
    internship_title, 
    company, 
    applied_date || 'Today', 
    deadline || 'Soon', 
    status || 'Applied', 
    updated || 'Just now'
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Application submitted successfully' });
  });
});

app.put('/api/applications/:id', (req, res) => {
  const { status } = req.body;
  db.run("UPDATE applications SET status = ?, updated = 'Just now' WHERE id = ?", [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Application status updated successfully' });
  });
});

/* ==================== COMPANIES API ==================== */
app.get('/api/companies', (req, res) => {
  db.all("SELECT * FROM companies", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/companies', (req, res) => {
  const { code, name, website, email, description, listings } = req.body;
  db.run("INSERT INTO companies (code, name, website, email, description, listings) VALUES (?,?,?,?,?,?)",
    [code || 'CO', name, website, email, description, listings || 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Company added successfully' });
  });
});

app.delete('/api/companies/:id', (req, res) => {
  db.run("DELETE FROM companies WHERE id = ?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Company deleted successfully' });
  });
});

/* ==================== STUDENTS API ==================== */
app.get('/api/students', (req, res) => {
  db.all("SELECT * FROM students", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map(r => ({ ...r, skills: r.skills ? r.skills.split(', ') : [] }));
    res.json(formatted);
  });
});

app.put('/api/students/:id/status', (req, res) => {
  const { status } = req.body;
  db.run("UPDATE students SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Student status toggled successfully' });
  });
});

/* ==================== DOCUMENTS API ==================== */
app.get('/api/documents', (req, res) => {
  const userId = req.query.user_id || 1;
  db.all("SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/documents', upload.single('file'), (req, res) => {
  const { type, user_id } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded.' });

  const url = `/uploads/${file.filename}`;
  const sql = `INSERT INTO documents (user_id, name, type, size_bytes, url) VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [user_id || 1, file.originalname, type || 'Resume', file.size, url], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get("SELECT * FROM documents WHERE id = ?", [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Document uploaded successfully', document: row });
    });
  });
});

app.delete('/api/documents/:id', (req, res) => {
  db.get("SELECT * FROM documents WHERE id = ?", [req.params.id], (err, doc) => {
    if (err || !doc) return res.status(404).json({ error: 'Document not found.' });

    const filePath = path.join(__dirname, doc.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.run("DELETE FROM documents WHERE id = ?", [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Document deleted successfully' });
    });
  });
});

/* ==================== AUTHENTICATION API ==================== */
app.post('/api/auth/register', (req, res) => {
  const { full_name, email, phone, college, department, year_of_study, password } = req.body;
  const userSql = `INSERT INTO users (full_name, email, phone, college, department, year_of_study, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, 'student')`;
  
  db.run(userSql, [full_name, email, phone, college, department, year_of_study, password], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Email already exists or invalid data.' });
    }
    
    const newUserId = this.lastID;
    const studentSql = `INSERT INTO students (name, email, phone, college, department, year, cgpa, status, skills) VALUES (?, ?, ?, ?, ?, ?, '8.5', 'Active', 'Python, Problem Solving')`;
    db.run(studentSql, [full_name, email, phone, college || 'PSG College', department || 'Computer Science', year_of_study || '3rd Year']);

    db.get(`SELECT * FROM users WHERE id = ?`, [newUserId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'User registered successfully!', user });
    });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  
  if (role === 'admin' && email === 'admin@waypoint.edu' && password === 'admin123') {
    return res.json({ 
      message: 'Login successful', 
      user: { id: 999, full_name: 'Placement Admin', email: 'admin@waypoint.edu', role: 'admin' } 
    });
  }

  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (role && row.role && row.role !== role) {
      return res.status(401).json({ error: `Account exists, but is not registered as a ${role}.` });
    }

    res.json({ message: 'Login successful', user: row });
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }
    res.json({ message: `Password reset instructions have been sent to ${email}.` });
  });
});

app.listen(PORT, () => {
  console.log(`Waypoint Backend server running on port ${PORT}`);
});