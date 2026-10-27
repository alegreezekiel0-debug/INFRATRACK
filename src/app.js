/**
 * InfraTrack Desktop - Main Application Logic
 * Campus Maintenance Reporting System
 */

// =====================================================
// Data Store (using the Spring Boot API and MySQL)
// =====================================================
const Store = {
    getUsers() {
        const users = requestAdminApi('GET', '/users');
        return Array.isArray(users) ? users : [];
    },
    saveUsers(users) {
        return requestAdminApi('PUT', '/users', users);
    },
    getReports() {
        const reports = requestAdminApi('GET', '/reports');
        return Array.isArray(reports) ? reports.map(normalizeReportStatus) : [];
    },
    saveReports(reports) {
        return requestAdminApi('PUT', '/reports', reports);
    },
    getAdminReports() {
        return this.getReports();
    },
    getAdminUsers() {
        const users = requestAdminApi('GET', '/admin/users');
        return Array.isArray(users) ? users : [];
    },
    saveAdminReports(reports) {
        return this.saveReports(reports);
    },
    deleteAdminReport(reportId) {
        return requestAdminApi('DELETE', `/reports/${encodeURIComponent(reportId)}`);
    },
    getActivityLog() {
        const entries = requestAdminApi('GET', '/activity');
        return Array.isArray(entries) ? entries : [];
    },
    getAdminComments(reportId) {
        return this.getComments(reportId);
    },
    recordActivity(activity) {
        return requestAdminApi('POST', '/activity', activity);
    },
    getCurrentUser() {
        const userId = localStorage.getItem('infratrack.currentUserId');
        if (!userId) return null;
        return this.getUsers().find(user => String(user.id) === userId) || null;
    },
    setCurrentUser(userId) {
        if (userId) localStorage.setItem('infratrack.currentUserId', String(userId));
        else localStorage.removeItem('infratrack.currentUserId');
    },
    getComments(reportId) {
        const comments = requestAdminApi('GET', `/reports/${encodeURIComponent(reportId)}/comments`);
        return Array.isArray(comments) ? comments : [];
    },
    saveComment(reportId, comment) {
        return requestAdminApi('POST', `/reports/${encodeURIComponent(reportId)}/comments`, comment);
    }
};

function requestAdminApi(method, path, body) {
    try {
        const request = new XMLHttpRequest();
        request.open(method, `${window.INFRATRACK_API_URL || 'http://localhost:8080/api'}${path}`, false);
        if (body !== undefined) request.setRequestHeader('Content-Type', 'application/json');
        request.send(body === undefined ? null : JSON.stringify(body));
        if (request.status < 200 || request.status >= 300) return null;
        return request.responseText ? JSON.parse(request.responseText) : {};
    } catch (error) {
        return null;
    }
}

function normalizeReportStatus(report) {
    const status = report.status === 'In Progress' ? 'Ongoing' : report.status === 'Resolved' ? 'Done' : report.status;
    return { ...report, status };
}

// =====================================================
// State
// =====================================================
let currentUser = null;
let currentReportId = null;
let uploadedPhoto = null;

// =====================================================
// Navigation
// =====================================================
function showPage(pageId) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'none';

    if (pageId === 'loginPage' || pageId === 'registerPage') {
        document.getElementById('authPages').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById(pageId).style.display = 'flex';
    }
}

function navigateTo(page) {
    if (['admin', 'activity-log', 'reports-analytics'].includes(page) && !isAdmin()) return;

    document.querySelectorAll('.page-content').forEach(el => {
        el.style.display = 'none';
    });

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    const pageEl = document.getElementById(page + 'Page');
    if (pageEl) pageEl.style.display = 'block';

    const titles = {
        'dashboard': 'Dashboard',
        'report': 'Report an Issue',
        'reports': 'My Reports',
        'faq': 'FAQs',
        'support': 'Contact Support',
        'admin': 'Admin Panel',
        'activity-log': 'Activity Log',
        'reports-analytics': 'Reports & Analytics'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'InfraTrack';

    document.getElementById('sidebar').classList.remove('open');

    if (page === 'dashboard') loadDashboard();
    if (page === 'reports') loadReports();
    if (page === 'reportDetails') loadReportDetails();
    if (page === 'admin') loadAdminPanel();
    if (page === 'activity-log') loadActivityLog();
    if (page === 'reports-analytics') loadReportsAnalytics();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// =====================================================
// Auth Functions
// =====================================================
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    const health = requestAdminApi('GET', '/health');
    if (!health || health.status !== 'ok') {
        errorEl.textContent = 'Cannot connect to the MySQL database. Start MySQL and the InfraTrack backend, then try again.';
        errorEl.style.display = 'block';
        return;
    }

    const users = Store.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = user;
        Store.setCurrentUser(user.id);
        errorEl.style.display = 'none';
        showMainApp();
    } else {
        errorEl.textContent = 'Invalid email or password.';
        errorEl.style.display = 'block';
    }
}

function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const studentId = document.getElementById('regStudentId').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorEl = document.getElementById('registerError');

    const health = requestAdminApi('GET', '/health');
    if (!health || health.status !== 'ok') {
        errorEl.textContent = 'Cannot connect to the MySQL database. Start MySQL and the InfraTrack backend, then try again.';
        errorEl.style.display = 'block';
        return;
    }

    if (password !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match.';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        errorEl.style.display = 'block';
        return;
    }

    const users = Store.getUsers();

    if (users.find(u => u.email === email)) {
        errorEl.textContent = 'Email already registered.';
        errorEl.style.display = 'block';
        return;
    }

    if (users.find(u => u.studentId === studentId)) {
        errorEl.textContent = 'Student ID already registered.';
        errorEl.style.display = 'block';
        return;
    }

    const newUser = {
        id: 'user_' + Date.now(),
        fullName: name,
        studentId: studentId,
        email: email,
        password: password,
        role: 'student',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    const saved = Store.saveUsers(users);
    if (!saved || saved.success !== true) {
        errorEl.textContent = 'Could not create the account in MySQL. Please try again.';
        errorEl.style.display = 'block';
        return;
    }

    currentUser = newUser;
    Store.setCurrentUser(newUser.id);
    errorEl.style.display = 'none';
    showMainApp();
}

function logout() {
    currentUser = null;
    Store.setCurrentUser(null);
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('authPages').style.display = 'flex';
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('loginForm').reset();
}

function showMainApp() {
    document.getElementById('authPages').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    const firstName = currentUser.fullName.split(' ')[0];
    document.getElementById('welcomeText').textContent = `Welcome, ${firstName}!`;
    document.getElementById('dashboardWelcome').textContent = `Welcome Back, ${firstName}!`;
    document.getElementById('sidebarUserName').textContent = currentUser.fullName;
    document.getElementById('sidebarUserId').textContent = currentUser.studentId;
    document.getElementById('sidebarUserRole').textContent = currentUser.role;

    const admin = isAdmin();
    document.getElementById('adminNavItem').style.display = admin ? 'flex' : 'none';
    document.getElementById('studentReportNavItem').style.display = admin ? 'none' : 'flex';
    document.getElementById('studentReportsNavItem').style.display = admin ? 'none' : 'flex';
    document.getElementById('adminActivityNavItem').style.display = admin ? 'flex' : 'none';
    document.getElementById('adminAnalyticsNavItem').style.display = admin ? 'flex' : 'none';

    navigateTo('dashboard');
}

// =====================================================
// Dashboard
// =====================================================
function loadDashboard() {
    const reports = Store.getReports();
    const userReports = reports.filter(r => r.userId === currentUser.id);

    document.getElementById('statTotal').textContent = userReports.length;
    document.getElementById('statPending').textContent = userReports.filter(r => r.status === 'Pending').length;
    document.getElementById('statInProgress').textContent = userReports.filter(r => r.status === 'In Progress').length;
    document.getElementById('statResolved').textContent = userReports.filter(r => r.status === 'Resolved').length;

    const table = document.getElementById('recentReportsTable');
    const recentReports = userReports.slice(-5).reverse();

    if (recentReports.length === 0) {
        table.innerHTML = '<div class="empty-state"><p>No reports yet.</p></div>';
    } else {
        table.innerHTML = recentReports.map(report => `
            <div class="report-row" onclick="viewReport('${report.id}')">
                <div class="report-thumb">
                    ${report.photo ? `<img src="${getPhotoUrl(report.photo)}" alt="">` : '<div class="thumb-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>'}
                </div>
                <div class="report-info">
                    <span class="report-title">${escapeHtml(report.title)}</span>
                    <span class="report-location">${escapeHtml(report.location)}</span>
                </div>
                <div class="report-date">${formatDate(report.createdAt)}</div>
                <div class="report-status">
                    <span class="status-badge status-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
                </div>
            </div>
        `).join('');
    }
}

// =====================================================
// Reports
// =====================================================
function loadReports() {
    const reports = Store.getReports();
    const userReports = reports.filter(r => r.userId === currentUser.id).reverse();

    const emptyState = document.getElementById('reportsEmptyState');
    const listCard = document.getElementById('reportsListCard');
    const list = document.getElementById('reportsList');

    if (userReports.length === 0) {
        emptyState.style.display = 'flex';
        listCard.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        listCard.style.display = 'block';
        list.innerHTML = userReports.map(report => `
            <div class="report-item" onclick="viewReport('${report.id}')">
                <div class="report-item-thumb">
                    ${report.photo ? `<img src="${getPhotoUrl(report.photo)}" alt="">` : ''}
                </div>
                <div class="report-item-info">
                    <h4>${escapeHtml(report.title)}</h4>
                    <span class="report-item-location">${escapeHtml(report.location)}</span>
                </div>
                <div class="report-item-date">${formatDate(report.createdAt)}</div>
                <span class="status-badge status-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
            </div>
        `).join('');
    }
}

function viewReport(reportId) {
    currentReportId = reportId;
    navigateTo('reportDetails');
}

function loadReportDetails() {
    if (!currentReportId) return;

    const reports = isAdmin() ? Store.getAdminReports() : Store.getReports();
    const report = reports.find(r => String(r.id) === String(currentReportId));
    if (!report) return;
    if (!isAdmin() && String(report.userId) !== String(currentUser.id)) {
        currentReportId = null;
        navigateTo('dashboard');
        return;
    }

    const statusEl = document.getElementById('detailsStatus');
    statusEl.textContent = report.status;
    statusEl.className = 'status-badge status-' + report.status.toLowerCase().replace(' ', '-');

    document.getElementById('detailsTitle').textContent = report.title;
    document.getElementById('detailsLocation').textContent = report.location;
    document.getElementById('detailsDescription').textContent = report.description;

    const photoSection = document.getElementById('detailsPhotoSection');
    if (report.photo) {
        photoSection.style.display = 'block';
        document.getElementById('detailsPhoto').src = getPhotoUrl(report.photo);
    } else {
        photoSection.style.display = 'none';
    }

    document.getElementById('infoLocation').textContent = report.location;
    document.getElementById('infoIssue').textContent = report.title;
    document.getElementById('infoDate').textContent = formatDate(report.createdAt);
    document.getElementById('infoSubmitter').textContent = currentUser.fullName;

    loadComments();
}

function loadComments() {
    const comments = isAdmin() ? Store.getAdminComments(currentReportId) : Store.getComments(currentReportId);
    const container = document.getElementById('commentsContainer');
    const list = document.getElementById('commentsList');

    if (comments.length === 0) {
        list.style.display = 'none';
    } else {
        list.style.display = 'block';
        container.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-header">
                    <strong>${escapeHtml(c.author)}</strong>
                    <span class="comment-role">${c.role}</span>
                    <span class="comment-date">${formatDate(c.date)}</span>
                </div>
                <p>${escapeHtml(c.text)}</p>
            </div>
        `).join('');
    }
}

function addComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    const comment = {
        author: currentUser.fullName,
        role: currentUser.role,
        text: text,
        date: new Date().toISOString()
    };

    const saved = Store.saveComment(currentReportId, comment);
    if (!saved || saved.success !== true) {
        alert('Could not save the comment to MySQL. Check that the backend is running.');
        return;
    }
    input.value = '';
    loadComments();
}

// =====================================================
// Report Submission
// =====================================================
function handleReportSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('issueTitle').value.trim();
    const location = document.getElementById('issueLocation').value;
    const description = document.getElementById('issueDescription').value.trim();

    if (!title || !location || !description) return;

    const reports = Store.getReports();
    const newReport = {
        id: 'report_' + Date.now(),
        userId: currentUser.id,
        title: title,
        location: location,
        description: description,
        photo: uploadedPhoto,
        status: 'Pending',
        createdAt: new Date().toISOString()
    };

    reports.push(newReport);
    const saved = Store.saveReports(reports);
    if (!saved || saved.success !== true) {
        alert('Could not save the report to MySQL. Check that the backend is running.');
        return;
    }

    document.getElementById('reportForm').reset();
    document.getElementById('charCount').textContent = '0';
    clearPhoto();

    navigateTo('reports');
}

// =====================================================
// Photo Upload
// =====================================================
function handlePhotoUpload() {
    const fileInput = document.getElementById('photoInput');
    fileInput.click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedPhoto = e.target.result;
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('uploadPreview').style.display = 'block';
        document.getElementById('previewImage').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearPhoto() {
    uploadedPhoto = null;
    document.getElementById('uploadPlaceholder').style.display = 'block';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('previewImage').src = '';
    document.getElementById('photoInput').value = '';
}

function getPhotoUrl(photo) {
    if (photo && photo.startsWith('data:')) return photo;
    return photo || '';
}

// =====================================================
// Admin Panel
// =====================================================
function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

function loadAdminPanel() {
    if (!isAdmin()) return;

    const reports = Store.getAdminReports();
    const users = Store.getAdminUsers();
    const filterStatus = document.getElementById('adminFilterStatus') ? document.getElementById('adminFilterStatus').value : '';

    document.getElementById('adminStatTotal').textContent = reports.length;
    document.getElementById('adminStatPending').textContent = reports.filter(r => r.status === 'Pending').length;
    document.getElementById('adminStatInProgress').textContent = reports.filter(r => normalizeReportStatus(r).status === 'Ongoing').length;
    document.getElementById('adminStatResolved').textContent = reports.filter(r => normalizeReportStatus(r).status === 'Done').length;

    let filteredReports = reports;
    if (filterStatus) {
        filteredReports = reports.filter(r => normalizeReportStatus(r).status === filterStatus);
    }

    filteredReports = filteredReports.slice().reverse();

    const table = document.getElementById('adminReportsTable');

    if (filteredReports.length === 0) {
        table.innerHTML = '<div class="empty-state"><p>No reports found.</p></div>';
    } else {
        table.innerHTML = filteredReports.map(report => {
            const submitter = users.find(u => u.id === report.userId);
            const submitterName = submitter ? submitter.fullName : 'Unknown';
            return `
                <div class="report-row" style="flex-wrap:wrap;">
                    <div class="report-thumb">
                        ${report.photo ? `<img src="${getPhotoUrl(report.photo)}" alt="">` : '<div class="thumb-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>'}
                    </div>
                    <div class="report-info">
                        <span class="report-title">${escapeHtml(report.title)}</span>
                        <span class="report-location">${escapeHtml(report.location)} • ${escapeHtml(submitterName)}</span>
                    </div>
                    <div class="report-date">${formatDate(report.createdAt)}</div>
                    <div class="admin-actions">
        <select onchange="updateReportStatus('${report.id}', this.value)">
            <option value="Pending" ${normalizeReportStatus(report).status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Ongoing" ${normalizeReportStatus(report).status === 'Ongoing' ? 'selected' : ''}>Ongoing</option>
            <option value="Done" ${normalizeReportStatus(report).status === 'Done' ? 'selected' : ''}>Done</option>
                        </select>
                        <button class="btn-view" onclick="viewReport('${report.id}')">View</button>
                        <button class="btn-danger" onclick="deleteReport('${report.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function updateReportStatus(reportId, newStatus) {
    const reports = Store.getAdminReports();
    const report = reports.find(r => String(r.id) === String(reportId));
    if (report && report.status !== newStatus) {
        const previousStatus = normalizeReportStatus(report).status;
        report.status = newStatus;
        const saved = Store.saveAdminReports(reports);
        if (!saved || saved.success !== true) {
            alert('Could not update the report in MySQL. Check that the backend is running.');
            return;
        }
        Store.recordActivity(createAdminActivity(`Changed status from ${previousStatus} to ${newStatus}`, report));
        loadAdminPanel();
    }
}

function deleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    const reports = Store.getAdminReports();
    const report = reports.find(item => String(item.id) === String(reportId));
    if (!report) return;
    const result = Store.deleteAdminReport(reportId);
    if (!result || result.success !== true) {
        alert('Could not delete the report. Check that the MySQL backend is running.');
        return;
    }
    Store.recordActivity(createAdminActivity('Deleted report', report));
    loadAdminPanel();
}

function createAdminActivity(action, report) {
    return {
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        action,
        reportId: report.id,
        reportTitle: report.title,
        occurredAt: new Date().toISOString()
    };
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

function loadActivityLog() {
    if (!isAdmin()) return;
    const entries = Store.getActivityLog();
    const table = document.getElementById('activityLogTable');
    const empty = document.getElementById('activityLogEmpty');
    if (entries.length === 0) {
        table.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }
    empty.style.display = 'none';
    table.innerHTML = entries.map(entry => `
        <tr>
            <td>${escapeHtml(entry.actorName || 'Unknown')}</td>
            <td class="activity-action">${escapeHtml(entry.action || '')}</td>
            <td>${escapeHtml(entry.reportTitle || 'Untitled report')}<span class="activity-report-id">${escapeHtml(entry.reportId || '')}</span></td>
            <td>${escapeHtml(formatDateTime(entry.occurredAt))}</td>
        </tr>
    `).join('');
}

function loadReportsAnalytics() {
    if (!isAdmin()) return;
    const reports = Store.getAdminReports().map(normalizeReportStatus);
    const pending = reports.filter(report => report.status === 'Pending').length;
    const ongoing = reports.filter(report => report.status === 'Ongoing').length;
    const done = reports.filter(report => report.status === 'Done').length;

    document.getElementById('analyticsTotal').textContent = reports.length;
    document.getElementById('analyticsPending').textContent = pending;
    document.getElementById('analyticsOngoing').textContent = ongoing;
    document.getElementById('analyticsDone').textContent = done;
    document.getElementById('analyticsResolutionRate').textContent = reports.length ? `${Math.round(done / reports.length * 100)}%` : '0%';
    document.getElementById('statusDonutTotal').textContent = reports.length;

    const problemCounts = new Map();
    reports.forEach(report => {
        const title = (report.title || 'Uncategorized').trim() || 'Uncategorized';
        const key = title.toLocaleLowerCase();
        const current = problemCounts.get(key) || { label: title, count: 0 };
        current.count += 1;
        problemCounts.set(key, current);
    });
    const commonProblems = Array.from(problemCounts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
    const topProblemCount = Math.max(1, ...commonProblems.map(problem => problem.count));
    document.getElementById('problemChart').innerHTML = commonProblems.length ? commonProblems.map(problem => `
        <div class="chart-row" title="${escapeHtml(problem.label)}: ${problem.count} reports">
            <span class="chart-label">${escapeHtml(problem.label)}</span>
            <span class="chart-track"><span class="chart-bar" style="display:block;width:${problem.count / topProblemCount * 100}%"></span></span>
            <span class="chart-value">${problem.count}</span>
        </div>
    `).join('') : '<div class="empty-state"><p>No report data available.</p></div>';

    const statusData = [
        { label: 'Pending', count: pending, color: '#f59e0b', className: 'legend-pending' },
        { label: 'Ongoing', count: ongoing, color: '#3b82f6', className: 'legend-ongoing' },
        { label: 'Done', count: done, color: '#22a05a', className: 'legend-done' }
    ];
    let degrees = 0;
    const statusStops = statusData.map(status => {
        const start = degrees;
        degrees += reports.length ? status.count / reports.length * 360 : 0;
        return `${status.color} ${start}deg ${degrees}deg`;
    });
    document.getElementById('statusDonut').style.background = reports.length ? `conic-gradient(${statusStops.join(',')})` : 'conic-gradient(var(--border) 0deg 360deg)';
    document.getElementById('statusLegend').innerHTML = statusData.map(status => `
        <span class="status-legend-item"><i class="legend-dot ${status.className}"></i>${status.label}<strong>${status.count}</strong></span>
    `).join('');

    const today = new Date();
    const months = Array.from({ length: 6 }, (_, index) => new Date(today.getFullYear(), today.getMonth() - 5 + index, 1));
    const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthly = months.map(date => ({ date, key: monthKey(date), submitted: 0, done: 0 }));
    const monthlyIndex = new Map(monthly.map((month, index) => [month.key, index]));
    reports.forEach(report => {
        const date = new Date(report.createdAt);
        if (Number.isNaN(date.getTime())) return;
        const index = monthlyIndex.get(monthKey(date));
        if (index === undefined) return;
        monthly[index].submitted += 1;
        if (report.status === 'Done') monthly[index].done += 1;
    });

    document.getElementById('resolutionChart').innerHTML = monthly.map(month => {
        const rate = month.submitted ? Math.round(month.done / month.submitted * 100) : 0;
        return `
            <div class="chart-row" title="${month.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}: ${rate}% resolved">
                <span class="chart-label">${month.date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}</span>
                <span class="chart-track"><span class="chart-bar resolution-bar" style="display:block;width:${rate}%"></span></span>
                <span class="chart-value">${rate}%</span>
            </div>
        `;
    }).join('');

    const trendMax = Math.max(1, ...monthly.flatMap(month => [month.submitted, month.done]));
    document.getElementById('trendChart').innerHTML = monthly.map(month => `
        <div class="trend-month" title="${month.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}: ${month.submitted} submitted, ${month.done} done">
            <div class="trend-bars">
                <span class="trend-bar" style="height:${Math.max(2, month.submitted / trendMax * 126)}px"></span>
                <span class="trend-bar done" style="height:${Math.max(2, month.done / trendMax * 126)}px"></span>
            </div>
            <span>${month.date.toLocaleDateString(undefined, { month: 'short' })}</span>
        </div>
    `).join('');
}

// =====================================================
// FAQ Toggle
// =====================================================
function toggleFaq(element) {
    const faqItem = element.parentElement;
    faqItem.classList.toggle('active');
}

// =====================================================
// Support Form
// =====================================================
function handleSupportSubmit(event) {
    event.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    event.target.reset();
}

// =====================================================
// Utility Functions
// =====================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// =====================================================
// Initialization
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const health = requestAdminApi('GET', '/health');

    currentUser = Store.getCurrentUser();
    if (currentUser) {
        showMainApp();
    } else {
        showPage('loginPage');
        if (!health || health.status !== 'ok') {
            const errorEl = document.getElementById('loginError');
            errorEl.textContent = 'Cannot connect to the MySQL database. Start MySQL and the InfraTrack backend, then try again.';
            errorEl.style.display = 'block';
        }
    }

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('reportForm').addEventListener('submit', handleReportSubmit);
    document.getElementById('supportForm').addEventListener('submit', handleSupportSubmit);

    document.getElementById('issueDescription').addEventListener('input', function() {
        document.getElementById('charCount').textContent = this.value.length;
    });

    document.getElementById('fileUploadArea').addEventListener('click', function(e) {
        if (e.target.id !== 'removeFile') {
            handlePhotoUpload();
        }
    });
    document.getElementById('photoInput').addEventListener('change', handleFileSelect);
    document.getElementById('removeFile').addEventListener('click', function(e) {
        e.stopPropagation();
        clearPhoto();
    });

    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
});
