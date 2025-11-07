document.addEventListener('DOMContentLoaded', () => {
    const employeeIdInput = document.getElementById('employeeId');
    const currentDateSpan = document.getElementById('currentDate');
    const submitDateBtn = document.getElementById('submitDateBtn');
    const previousSubmissionsLink = document.getElementById('previousSubmissionsLink');
    const totalSubmissionsCount = document.getElementById('totalSubmissionsCount');
    const submissionDatesList = document.getElementById('submissionDatesList');

    const API_BASE_URL = 'http://localhost:3000/api';
    let currentEmployeeId = null;

    // Event listener for Employee ID input change
    employeeIdInput.addEventListener('change', async () => {
        const empId = employeeIdInput.value.trim();
        if (empId) {
            currentEmployeeId = empId;
            await updateSubmissionHistory(empId);
        } else {
            currentEmployeeId = null;
            totalSubmissionsCount.textContent = '0';
            previousSubmissionsLink.style.display = 'none';
            submissionDatesList.innerHTML = '';
        }
    });

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
                previousSubmissionsLink.style.display = 'inline'; // Show the link

                submissions.forEach(submission => {
                    const li = document.createElement('li');
                    li.textContent = String(submission); // Ensure it's displayed as a string
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
        e.preventDefault(); // Prevent default link behavior
        if (submissionDatesList.style.display === 'none') {
            submissionDatesList.style.display = 'block';
        } else {
            submissionDatesList.style.display = 'none';
        }
    });

    submitDateBtn.addEventListener('click', async () => {
        const empId = employeeIdInput.value.trim();
        if (!empId) {
            alert('Please enter an Employee ID.');
            return;
        }

        currentEmployeeId = empId; // Set currentEmployeeId for submission

        const todayDate = getISTDate();

        try {
            const response = await fetch(`${API_BASE_URL}/submission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ employeeId: currentEmployeeId, date: todayDate })
            });

            if (response.ok) {
                await updateSubmissionHistory(currentEmployeeId);
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
    });

    // Initial setup
    currentDateSpan.textContent = getISTDate();
    // Initially hide the submission dates list
    submissionDatesList.style.display = 'none';

    // Load submission history if an employee ID is already present (e.g., after refresh, though not persistent in this setup)
    // For a truly persistent state, you'd need to store currentEmployeeId in localStorage or similar.
    // For now, we'll assume employeeId is entered each time.
});
