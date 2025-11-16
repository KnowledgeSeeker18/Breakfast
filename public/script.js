document.addEventListener('DOMContentLoaded', () => {
    const employeeIdInput = document.getElementById('employeeId');
    const enterEmployeeIdBtn = document.getElementById('enterEmployeeIdBtn');
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
    const toastContainer = document.getElementById('toast-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    const API_BASE_URL = '/api';
    let currentEmployeeId = null;

    // --- Utility Functions for Toast and Loading ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.classList.add('toast', type);
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10); // Small delay to trigger transition

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 3000);
    }

    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }
    // --- End Utility Functions ---

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
            showToast('Failed to load submission history.', 'error');
        }
    }

    previousSubmissionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (submissionDatesList.style.display === 'none') {
            submissionDatesList.style.display = 'block';
        } else {
            submissionDatesList.style.display = 'none';
        }
    });

    // New event listener for the "Enter" button
    enterEmployeeIdBtn.addEventListener('click', async () => {
        const empId = employeeIdInput.value.trim();
        if (!empId) {
            showToast('Please enter an Employee ID.', 'warning');
            return;
        }

        currentEmployeeId = empId;
        showLoading();

        try {
            const checkResponse = await fetch(`${API_BASE_URL}/employee/${empId}`);
            if (checkResponse.ok) {
                const employee = await checkResponse.json();
                displayEmployeeName.textContent = employee.name;
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

                employeeIdSection.style.display = 'none';
                employeeDetailsSection.style.display = 'block';
                submissionSection.style.display = 'block';
                saveDetailsBtn.style.display = 'none';
                submitDateBtn.style.display = 'block';
                previousSubmissionsLink.style.display = 'inline'; // Ensure link is visible for existing employees

                currentDateSpan.textContent = getISTDate();
                await updateSubmissionHistory(empId);
                showToast(`Welcome back, ${employee.name}!`, 'success');

            } else if (checkResponse.status === 404) {
                employeeIdSection.style.display = 'none';
                employeeDetailsSection.style.display = 'block';
                submissionSection.style.display = 'none'; // Hide submission section for new employee input
                saveDetailsBtn.style.display = 'block';
                submitDateBtn.style.display = 'none';
                previousSubmissionsLink.style.display = 'none';
                submissionDatesList.style.display = 'none';

                mailIdInput.value = '';
                employeeNameInput.value = '';
                teamSelect.value = '';
                otherTeamInput.value = '';
                otherTeamInput.style.display = 'none';
                mobileNumberInput.value = '';
                showToast('New Employee. Please fill in details and save.', 'info');
            } else {
                showToast('Error checking employee ID.', 'error');
                console.error('Error checking employee:', await checkResponse.text());
            }
        } catch (error) {
            console.error('Network error checking employee:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    });

    submitDateBtn.addEventListener('click', async () => {
        showLoading();
        await submitTodayDate(currentEmployeeId);
        hideLoading();
    });

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
                showToast(`Date ${todayDate} submitted successfully!`, 'success');
            } else if (response.status === 409) {
                showToast('You have already submitted for today!', 'warning');
            } else {
                showToast('Error submitting date.', 'error');
                console.error('Error submitting date:', await response.text());
            }
        } catch (error) {
            console.error('Network error submitting date:', error);
            showToast('Network error. Please try again.', 'error');
        }
    }

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

        if (!mailId.endsWith('@mondee.com')) {
            showToast('Mail ID must end with @mondee.com', 'warning');
            return;
        }

        if (!mailId || !name || !team || !mobileNumber) {
            showToast('Please fill in all employee details.', 'warning');
            return;
        }

        showLoading();
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
                submissionSection.style.display = 'block'; // Show submission section after saving
                submitDateBtn.style.display = 'block';
                currentDateSpan.textContent = getISTDate();
                await updateSubmissionHistory(currentEmployeeId);
                showToast('Employee details saved successfully!', 'success');
                await submitTodayDate(currentEmployeeId);
            } else {
                showToast('Error saving employee details.', 'error');
                console.error('Error saving employee:', await response.text());
            }
        } catch (error) {
            console.error('Network error saving employee:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    });

    // Initial setup
    currentDateSpan.textContent = getISTDate();
    submissionDatesList.style.display = 'none';
    employeeDetailsSection.style.display = 'none';
    submissionSection.style.display = 'none';
    employeeIdSection.style.display = 'block'; // Ensure employee ID section is visible initially
});
