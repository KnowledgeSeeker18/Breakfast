const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Routes
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


// ✅ Export for Vercel (don’t use app.listen)
module.exports = app;
