const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const mongoURI = 'mongodb+srv://abdulmuthalibmohammed18_db_user:tdX2yTZ53FXZb@breakfast.scikfmx.mongodb.net/';

// Connect to MongoDB
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'employeePortalDB' // Specify the database name here
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Employee Schema and Model
const employeeSchema = new mongoose.Schema({
    employeeId: { type: String, unique: true, required: true },
    mailId: { type: String, required: true },
    name: { type: String, required: true },
    team: { type: String, required: true },
    mobileNumber: { type: String },
    submissions: [{ type: String }] // Array of dates (DD-MM-YYYY)
});
const Employee = mongoose.model('Employee', employeeSchema);

// API Endpoints

// Check Employee
app.get('/api/employee/:employeeId', async (req, res) => {
    try {
        const employee = await Employee.findOne({ employeeId: req.params.employeeId });
        if (employee) {
            res.status(200).json(employee);
        } else {
            res.status(404).json({ message: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save Employee Details (for new employees)
app.post('/api/employee', async (req, res) => {
    try {
        const { employeeId, mailId, name, team, mobileNumber } = req.body;
        const newEmployee = new Employee({ employeeId, mailId, name, team, mobileNumber, submissions: [] });
        await newEmployee.save();
        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit Date
app.post('/api/submission', async (req, res) => {
    try {
        const { employeeId, date } = req.body;

        const employee = await Employee.findOne({ employeeId });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (employee.submissions.includes(date)) {
            return res.status(409).json({ message: 'You have already submitted for today!' });
        }

        employee.submissions.push(date);
        await employee.save();
        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Submission History for an Employee
app.get('/api/submissions/:employeeId', async (req, res) => {
    try {
        const employee = await Employee.findOne({ employeeId: req.params.employeeId });
        if (employee) {
            res.status(200).json(employee.submissions);
        } else {
            res.status(404).json({ message: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
