document.addEventListener('DOMContentLoaded', () => {
    const employeeIdInput = document.getElementById('employeeId');
    const employeeIdSection = document.getElementById('employee-id-section');
    const employeeDetailsSection = document.getElementById('employee-details-section');
    const displayEmployeeName = document.getElementById('displayEmployeeName');
    const mailIdInput = document.getElementById('mailId');
    const employeeNameInput = document.getElementById('employeeName');
    const teamSelect = document.getElementById('teamSelect');
    const otherTeamInput = document.getElementById('otherTeamInput');
    const mobileNumberInput = document.getElementById('mobileNumber');
    const saveDetailsBtn = document.getElementById('saveDetailsBtn');
    const submissionSection = document.getElementById('submission-section');
    const currentDateSpan = document.getElementById('currentDate');
    const submitDateBtn = document.getElementById('submitDateBtn');
    const previousSubmissionsLink = document.getElementById('previousSubmissionsLink');
    const totalSubmissionsCount = document.getElementById('totalSubmissionsCount');
    const submissionDatesList = document.getElementById('submissionDatesList');

    const API_BASE_URL = '/api'; // Changed to relative path for Vercel deployment
    let currentEmployeeId = null;

    function getISTDate() {
        const now = new Date();
        const options = {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        };
        return new Intl.DateTimeFormat('en-GB', options).format(now);
    }

    async function updateSubmissionHistory(employeeId) {
        submissionDatesList.innerHTML = '';
        try {
            const response = await fetch(`${API_BASE_URL}/submissions/${employeeId}`);
            const submissions = await response.json();

            if (submissions.length === 0) {
                totalSubmissionsCount.textContent = '0';
                previousSubmissionsLink.style.display = 'none';
            } else {
                totalSubmissionsCount.textContent = submissions.length;
                previousSubmissionsLink.style.display = 'inline';

                submissions.forEach(submission => {
                    const li = document.createElement('li');
                    li.textContent = String(submission);
                    submissionDatesList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Error fetching submission history:', error);
            alert('Failed to load submission history.');
        }
    }

    // Event listener for the submission link
    previousSubmissionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (submissionDatesList.style.display === 'none') {
            submissionDatesList.style.display = 'block';
        } else {
            submissionDatesList.style.display = 'none';
        }
    });

    // Modified submitDateBtn to handle employee check/save and then submission
    submitDateBtn.addEventListener('click', async () => {
        const empId = employeeIdInput.value.trim();
        if (!empId) {
            alert('Please enter an Employee ID.');
            return;
        }

        currentEmployeeId = empId;

        try {
            // First, check if employee exists
            const checkResponse = await fetch(`${API_BASE_URL}/employee/${empId}`);
            if (checkResponse.ok) {
                // Existing employee
                const employee = await checkResponse.json();
                displayEmployeeName.textContent = employee.name;
                employeeIdSection.style.display = 'none';
                employeeDetailsSection.style.display = 'block';
                mailIdInput.value = employee.mailId;
                employeeNameInput.value = employee.name;
                teamSelect.value = employee.team;
                if (['Interns', 'Tech', 'Operations'].includes(employee.team)) {
                    otherTeamInput.style.display = 'none';
                } else {
                    teamSelect.value = 'Others';
                    otherTeamInput.style.display = 'block';
                    otherTeamInput.value = employee.team;
                }
                mobileNumberInput.value = employee.mobileNumber;
                saveDetailsBtn.style.display = 'none'; // Hide save details button for existing employees
                // submissionSection is now visible by default
                currentDateSpan.textContent = getISTDate();
                await updateSubmissionHistory(empId);
                // Proceed to submit date for existing employee
                await submitTodayDate(empId);
            } else if (checkResponse.status === 404) {
                // New employee - show details section for input
                employeeIdSection.style.display = 'none';
                employeeDetailsSection.style.display = 'block';
                saveDetailsBtn.style.display = 'block'; // Show save details button for new employees
                // submissionSection is now visible by default, but we hide its content for new employee input
                submitDateBtn.style.display = 'none'; // Hide submit button for new employee until details are saved
                previousSubmissionsLink.style.display = 'none';
                submissionDatesList.style.display = 'none';
                mailIdInput.value = '';
                employeeNameInput.value = '';
                teamSelect.value = '';
                otherTeamInput.value = '';
                otherTeamInput.style.display = 'none';
                mobileNumberInput.value = '';
                alert('New Employee. Please fill in details and save.');
            } else {
                alert('Error checking employee ID.');
                console.error('Error checking employee:', await checkResponse.text());
            }
        } catch (error) {
            console.error('Network error checking employee:', error);
            alert('Network error. Please try again.');
        }
    });

    // Function to handle date submission
    async function submitTodayDate(employeeId) {
        const todayDate = getISTDate();
        try {
            const response = await fetch(`${API_BASE_URL}/submission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ employeeId: employeeId, date: todayDate })
            });

            if (response.ok) {
                await updateSubmissionHistory(employeeId);
                alert(`Date ${todayDate} submitted successfully!`);
            } else if (response.status === 409) {
                alert('You have already submitted for today!');
            } else {
                alert('Error submitting date.');
                console.error('Error submitting date:', await response.text());
            }
        } catch (error) {
            console.error('Network error submitting date:', error);
            alert('Network error. Please try again.');
        }
    }

    // Handle team dropdown change
    teamSelect.addEventListener('change', () => {
        if (teamSelect.value === 'Others') {
            otherTeamInput.style.display = 'block';
            otherTeamInput.setAttribute('required', 'true');
        } else {
            otherTeamInput.style.display = 'none';
            otherTeamInput.removeAttribute('required');
            otherTeamInput.value = '';
        }
    });

    saveDetailsBtn.addEventListener('click', async () => {
        const mailId = mailIdInput.value.trim();
        const name = employeeNameInput.value.trim();
        const selectedTeam = teamSelect.value;
        const team = selectedTeam === 'Others' ? otherTeamInput.value.trim() : selectedTeam;
        const mobileNumber = mobileNumberInput.value.trim();

        // Email validation
        if (!mailId.endsWith('@mondee.com')) {
            alert('Mail ID must end with @mondee.com');
            return;
        }

        if (!mailId || !name || !team || !mobileNumber) {
            alert('Please fill in all employee details.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/employee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ employeeId: currentEmployeeId, mailId, name, team, mobileNumber })
            });

            if (response.ok) {
                const newEmployee = await response.json();
                displayEmployeeName.textContent = newEmployee.name;
                employeeDetailsSection.style.display = 'block';
                saveDetailsBtn.style.display = 'none';
                // submissionSection is now visible by default
                submitDateBtn.style.display = 'block'; // Show submit button after saving
                currentDateSpan.textContent = getISTDate();
                await updateSubmissionHistory(currentEmployeeId);
                alert('Employee details saved successfully!');
                // After saving, automatically submit today's date
                await submitTodayDate(currentEmployeeId);
            } else {
                alert('Error saving employee details.');
                console.error('Error saving employee:', await response.text());
            }
        } catch (error) {
            console.error('Network error saving employee:', error);
            alert('Network error. Please try again.');
        }
    });

    // Initial setup
    currentDateSpan.textContent = getISTDate();
    submissionDatesList.style.display = 'none';
    // employeeIdSection is visible by default
    // employeeDetailsSection is hidden by default (set in index.html)
    // submissionSection is visible by default (set in index.html)
});
