const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const multer = require('multer'); // Import multer
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' }); // Temporary directory for uploads

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB Connection URI
const mongoURI =process.env.MONGODB_URI;
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'employeePortalDB',
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema & Model
const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, required: true, set: (v) => v.toLowerCase(), get: (v) => v.toLowerCase() },
  mailId: { type: String, required: true },
  name: { type: String, required: true },
  team: { type: String, required: true },
  mobileNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v); // Validates 10 digits
      },
      message: props => `${props.value} is not a valid 10-digit mobile number!`
    },
    required: [true, 'Mobile number required']
  },
  submissions: [{ type: String }],
});

const Employee = mongoose.model('Employee', employeeSchema);

// Function to read CSV and populate database
async function populateEmployeesFromCSV() {
  const results = [];
  fs.createReadStream(path.join(__dirname, '../employees.csv'))
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        const employeeId = row['emp id'].toLowerCase();
        const mailId = row['mail'];
        const name = row['mail'].split('@')[0].replace('.', ' '); // Derive name from mail
        const team = row['team'];
        const mobileNumber = row['mobile number'];

        try {
          const existingEmployee = await Employee.findOne({ employeeId });
          if (!existingEmployee) {
            const newEmployee = new Employee({
              employeeId,
              mailId,
              name,
              team,
              mobileNumber,
              submissions: []
            });
            await newEmployee.save();
          } else {
          }
        } catch (error) {
          console.error(`Error adding employee ${employeeId}:`, error.message);
        }
      }
    });
}

// Call populate function after successful MongoDB connection
mongoose.connection.once('open', () => {
  populateEmployeesFromCSV();
});

// Admin authentication route
app.post('/api/admin-auth', (req, res) => {
  const { secretKey } = req.body;
  if (secretKey === process.env.ADMIN_SECRET_KEY) {
    res.status(200).json({ message: 'Authentication successful' });
  } else {
    res.status(401).json({ message: 'Invalid secret key' });
  }
});

// New route for CSV upload
app.post('/api/upload-employees', upload.single('employeesCsv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let employeesAdded = 0;
      let employeesUpdated = 0;
      let errors = [];

      for (const row of results) {
        const employeeId = row['emp id'] ? String(row['emp id']).toLowerCase() : null;
        const mailId = row['mail'] || '';
        const name = row['name'] || (mailId.split('@')[0] ? mailId.split('@')[0].replace('.', ' ') : '');
        const team = row['team'] || '';
        const mobileNumber = row['mobile number'] ? String(row['mobile number']) : '';

        if (!employeeId) {
          errors.push(`Skipping row due to missing 'emp id': ${JSON.stringify(row)}`);
          continue;
        }

        try {
          let employee = await Employee.findOne({ employeeId });
          if (employee) {
            // Update existing employee
            employee.mailId = mailId;
            employee.name = name;
            employee.team = team;
            employee.mobileNumber = mobileNumber;
            await employee.save();
            employeesUpdated++;
          } else {
            // Create new employee
            const newEmployee = new Employee({
              employeeId,
              mailId,
              name,
              team,
              mobileNumber,
              submissions: []
            });
            await newEmployee.save();
            employeesAdded++;
          }
        } catch (error) {
          errors.push(`Error processing employee ${employeeId}: ${error.message}`);
          console.error(`Error processing employee ${employeeId}:`, error);
        }
      }

      // Clean up the uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });

      if (errors.length > 0) {
        return res.status(207).json({
          message: `Processed CSV with some issues. Added: ${employeesAdded}, Updated: ${employeesUpdated}.`,
          errors: errors
        });
      } else {
        return res.status(200).json({
          message: `CSV processed successfully. Added: ${employeesAdded}, Updated: ${employeesUpdated}.`
        });
      }
    });
});

// Routes
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/employee/:employeeId', async (req, res) => {
  try {
    const employeeId = req.params.employeeId.toLowerCase();
    const employee = await Employee.findOne({ employeeId });
    if (employee) res.status(200).json(employee);
    else res.status(404).json({ message: 'Employee not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employee', async (req, res) => {
  try {
    const { employeeId, mailId, name, team, mobileNumber } = req.body;
    const newEmployee = new Employee({ employeeId: employeeId.toLowerCase(), mailId, name, team, mobileNumber, submissions: [] });
    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Changed status to 400 for validation errors
  }
});

app.post('/api/submission', async (req, res) => {
  try {
    const { employeeId, date } = req.body;
    const lowerCaseEmployeeId = employeeId.toLowerCase();
    const employee = await Employee.findOne({ employeeId: lowerCaseEmployeeId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (employee.submissions.includes(date))
      return res.status(409).json({ message: 'You have already submitted for today!' });

    employee.submissions.push(date);
    await employee.save();
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/submissions/:employeeId', async (req, res) => {
  try {
    const employeeId = req.params.employeeId.toLowerCase();
    const employee = await Employee.findOne({ employeeId });
    if (employee) res.status(200).json(employee.submissions);
    else res.status(404).json({ message: 'Employee not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from the 'public' directory for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// Export for Vercel (don’t use app.listen)
module.exports = app;
