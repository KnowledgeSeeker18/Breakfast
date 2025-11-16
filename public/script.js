document.addEventListener('DOMContentLoaded', () => {
    const getElement = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found.`);
        }
        return element;
    };

    const employeeIdInput = getElement('employeeId');
    const enterEmployeeIdBtn = getElement('enterEmployeeIdBtn');
    const employeeIdSection = getElement('employee-id-section');
    const employeeDetailsSection = getElement('employee-details-section');
    const displayEmployeeName = getElement('displayEmployeeName');
    const mailIdInput = getElement('mailId');
    const employeeNameInput = getElement('employeeName');
    const teamSelect = getElement('teamSelect'); // This is now an input type="text"
    const mobileNumberInput = getElement('mobileNumber');
    const submissionSection = getElement('submission-section');
    const currentDateSpan = getElement('currentDate');
    const submitDateBtn = getElement('submitDateBtn');
    const previousSubmissionsLink = getElement('previousSubmissionsLink');
    const totalSubmissionsCount = getElement('totalSubmissionsCount');
    const submissionDatesList = getElement('submissionDatesList');
    const toastContainer = getElement('toast-container');
    const loadingOverlay = getElement('loading-overlay');

    // Admin Panel Elements
    const adminLoginBtn = getElement('adminLoginBtn');
    const adminAuthPanel = getElement('admin-auth-panel');
    const adminSecretKeyInput = getElement('adminSecretKey');
    const submitAdminKeyBtn = getElement('submitAdminKeyBtn');
    const adminPanel = getElement('admin-panel');
    const csvFile = getElement('csvFile');
    const uploadCsvBtn = getElement('uploadCsvBtn');
    const uploadMessage = getElement('uploadMessage');

    const API_BASE_URL = '/api';
    let currentEmployeeId = null;

    // --- Utility Functions for Toast and Loading ---
    function showToast(message, type = 'info') {
        if (!toastContainer) {
            console.error('Toast container not found.');
            return;
        }
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
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
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
                mobileNumberInput.value = employee.mobileNumber;

                employeeIdSection.style.display = 'none';
                employeeDetailsSection.style.display = 'block';
                submissionSection.style.display = 'block';
                submitDateBtn.style.display = 'block';
                previousSubmissionsLink.style.display = 'inline'; // Ensure link is visible for existing employees

                currentDateSpan.textContent = getISTDate();
                await updateSubmissionHistory(empId);
                showToast(`Welcome back, ${employee.name}!`, 'success');

            } else if (checkResponse.status === 404) {
                showToast('Employee ID not found. Please check the ID.', 'error');
                employeeIdInput.value = ''; // Clear input for re-entry
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

    // Initial setup
    currentDateSpan.textContent = getISTDate();
    submissionDatesList.style.display = 'none';
    employeeDetailsSection.style.display = 'none';
    submissionSection.style.display = 'none';
    employeeIdSection.style.display = 'block'; // Ensure employee ID section is visible initially

    // --- Admin Panel Logic ---
    adminLoginBtn.addEventListener('click', () => {
        if (adminAuthPanel.style.display === 'none') {
            adminAuthPanel.style.display = 'block';
            adminLoginBtn.textContent = 'Hide Admin Login';
        } else {
            adminAuthPanel.style.display = 'none';
            adminPanel.style.display = 'none'; // Hide admin panel if visible
            adminLoginBtn.textContent = 'Admin Login';
            uploadMessage.textContent = ''; // Clear message when hiding
            adminSecretKeyInput.value = ''; // Clear input
        }
    });

    submitAdminKeyBtn.addEventListener('click', async () => {
        const secretKey = adminSecretKeyInput.value.trim();
        if (!secretKey) {
            showToast('Please enter the secret key.', 'warning');
            return;
        }

        showLoading();

        try {
            const response = await fetch(`${API_BASE_URL}/admin-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ secretKey })
            });

            if (response.ok) {
                adminAuthPanel.style.display = 'none';
                adminPanel.style.display = 'block';
                showToast('Admin access granted!', 'success');
            } else {
                let errorMessage = 'Unknown error';
                try {
                    const errorJson = await response.json();
                    if (errorJson && errorJson.message) {
                        errorMessage = errorJson.message;
                    } else {
                        errorMessage = await response.text();
                    }
                } catch (jsonError) {
                    errorMessage = await response.text();
                }
                showToast(`Authentication failed: ${errorMessage}`, 'error');
                console.error('Admin auth error:', errorMessage);
            }
        } catch (error) {
            showToast(`Network error during authentication: ${error.message}`, 'error');
            console.error('Network error during admin auth:', error);
        } finally {
            hideLoading();
        }
    });

    uploadCsvBtn.addEventListener('click', async () => {
        const file = csvFile.files[0];
        if (!file) {
            uploadMessage.textContent = 'Please select a CSV file to upload.';
            uploadMessage.style.color = 'orange';
            return;
        }

        showLoading();
        uploadMessage.textContent = 'Uploading...';
        uploadMessage.style.color = 'blue';

        const formData = new FormData();
        formData.append('employeesCsv', file);

        try {
            const response = await fetch(`${API_BASE_URL}/upload-employees`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                uploadMessage.textContent = result.message;
                uploadMessage.style.color = 'green';
                csvFile.value = ''; // Clear the file input
            } else {
                const errorText = await response.text();
                uploadMessage.textContent = `Upload failed: ${errorText}`;
                uploadMessage.style.color = 'red';
                console.error('CSV upload error:', errorText);
            }
        } catch (error) {
            uploadMessage.textContent = `Network error during upload: ${error.message}`;
            uploadMessage.style.color = 'red';
            console.error('Network error during CSV upload:', error);
        } finally {
            hideLoading();
        }
    });
    // --- End Admin Panel Logic ---
});
