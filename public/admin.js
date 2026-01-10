let studentsData = [];
let originalStudentsData = [];
let assignmentsData = [];
let currentTab = 'students';
let currentPage = 1;
let assignmentsCurrentPage = 1;
const studentsPerPage = 20;
const assignmentsPerPage = 20;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin dashboard loaded');
    
    // Check session first
    const token = localStorage.getItem('adminToken');
    if (!token) {
        console.log('No admin token found, redirecting to login');
        window.location.href = '/admin-access';
        return;
    }
    
    fetch('/api/admin/session-check', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(r => r.json())
        .then(result => {
            console.log('Session check result:', result);
            if (!result.sessionExists) {
                console.log('No admin session found, redirecting to login');
                window.location.href = '/admin-access';
                return;
            }
            showTab('students');
        })
        .catch(err => {
            console.error('Session check failed:', err);
            window.location.href = '/admin-access';
        });
    
    // Add search functionality
    const searchInput = document.getElementById('student-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterStudents);
    }
});

// Mobile menu functionality
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = sidebar.classList.contains('w-16');
    
    if (isCollapsed) {
        sidebar.classList.remove('w-16');
        sidebar.classList.add('w-64');
        document.querySelectorAll('.sidebar-text').forEach(el => el.classList.remove('hidden'));
    } else {
        sidebar.classList.remove('w-64');
        sidebar.classList.add('w-16');
        document.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
    }
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    
    if (isOpen) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    } else {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }
}

// Tab Management
function showTab(tab) {
    console.log('Switching to tab:', tab);
    
    // Hide all sections
    document.querySelectorAll('[id$="-section"]').forEach(el => {
        console.log('Hiding section:', el.id);
        el.classList.add('hidden');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('nav a').forEach(el => {
        el.classList.remove('text-white', 'bg-primary');
        el.classList.add('text-slate-600', 'dark:text-slate-300');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${tab}-section`);
    if (targetSection) {
        console.log('Showing section:', `${tab}-section`);
        targetSection.classList.remove('hidden');
    } else {
        console.error('Section not found:', `${tab}-section`);
    }
    
    const activeNav = document.getElementById(`${tab}-nav`);
    if (activeNav) {
        activeNav.classList.add('text-white', 'bg-primary');
        activeNav.classList.remove('text-slate-600', 'dark:text-slate-300');
    }
    
    // Update page title
    const titles = { 
        students: 'Students', 
        content: 'Content Management', 
        assignments: 'Assignment Management' 
    };
    document.getElementById('page-title').textContent = titles[tab] || 'Students';
    
    currentTab = tab;
    
    // Close mobile menu on mobile devices
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-menu-overlay');
        if (sidebar && overlay) {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    }
    
    // Load data
    if (tab === 'students') loadStudents();
    else if (tab === 'content') loadContent();
    else if (tab === 'assignments') loadAssignments();
}

// Students
async function loadStudents() {
    console.log('Loading students...');
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/students', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Students response status:', response.status);
        const result = await response.json();
        console.log('Students result:', result);
        
        if (result.success) {
            originalStudentsData = result.students.sort((a, b) => a.name.localeCompare(b.name));
            studentsData = [...originalStudentsData];
            renderStudents();
        } else {
            console.error('Failed to load students:', result.message);
            showMessage('Failed to load students: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showMessage('Error loading students', 'error');
    }
}

function renderStudents() {
    const list = document.getElementById('students-list');
    const totalStudents = studentsData.length;
    
    // Update student count
    document.getElementById('page-title').textContent = `Students (${totalStudents})`;
    
    if (totalStudents === 0) {
        list.innerHTML = '<tr><td colspan="4" class="px-6 py-12 text-center text-slate-500 dark:text-slate-400">No students found</td></tr>';
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(totalStudents / studentsPerPage);
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    const currentStudents = studentsData.slice(startIndex, endIndex);
    
    list.innerHTML = currentStudents.map(student => {
        const progress = student.approved || 0;
        const progressPercent = Math.round((progress/8)*100);
        return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">${student.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">${student.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex items-center gap-2">
                    <div class="w-24 h-2 rounded-full bg-background-light dark:bg-background-dark/80">
                        <div class="h-2 rounded-full bg-primary" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="text-slate-800 dark:text-white">${progressPercent}%</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <a class="text-primary hover:text-primary/80" href="#" onclick="viewStudent(${student.id})">View Details</a>
                <button class="text-red-600 hover:text-red-800" onclick="deleteStudent(${student.id}, '${student.name}')">Delete</button>
            </td>
        </tr>
        `;
    }).join('');
    
    // Render pagination
    renderPagination(totalPages);
}

async function viewStudent(id) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/admin/student/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        
        if (result.success) {
            const student = studentsData.find(s => s.id === id);
            const progress = result.progress;
            
            // Calculate statistics
            const completedWeeks = progress.filter(p => p.approved).length;
            const submittedWeeks = progress.filter(p => p.assignment_submitted).length;
            const avgVideoProgress = progress.reduce((sum, p) => sum + (p.video_progress || 0), 0) / progress.length;
            const avgQuizScore = progress.reduce((sum, p) => sum + (p.quiz_score || 0), 0) / progress.length;
            const totalTimeSpent = progress.reduce((sum, p) => sum + (p.time_spent || 0), 0);
            
            document.getElementById('student-modal-title').textContent = `${student.name} - Progress Details`;
            
            const content = `
                <div class="space-y-6">
                    <!-- Student Info -->
                    <div class="bg-gray-50 p-4 rounded">
                        <h4 class="font-medium mb-3">Student Information</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div><span class="text-gray-500">Name:</span> ${student.name}</div>
                            <div><span class="text-gray-500">Email:</span> ${student.email}</div>
                            <div><span class="text-gray-500">Completed:</span> ${completedWeeks}/8 weeks</div>
                            <div><span class="text-gray-500">Submitted:</span> ${submittedWeeks}/8 assignments</div>
                            <div><span class="text-gray-500">Avg Video:</span> ${Math.round(avgVideoProgress * 100)}%</div>
                            <div><span class="text-gray-500">Avg Quiz:</span> ${Math.round(avgQuizScore)}%</div>
                            <div><span class="text-gray-500">Time Spent:</span> ${Math.round(totalTimeSpent / 60)} minutes</div>
                            <div><span class="text-gray-500">Status:</span> ${completedWeeks > 0 ? 'Active' : 'Inactive'}</div>
                        </div>
                    </div>
                    
                    <!-- Weekly Progress -->
                    <div>
                        <h4 class="font-medium mb-3">Weekly Progress</h4>
                        <div class="space-y-2">
                            ${progress.map(week => {
                                const status = week.approved ? 'Approved' : 
                                             week.assignment_submitted ? 'Pending Review' : 'Not Started';
                                const statusColor = week.approved ? 'text-green-600' : 
                                                  week.assignment_submitted ? 'text-yellow-600' : 'text-gray-400';
                                
                                return `
                                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded text-sm">
                                        <div class="flex items-center gap-3">
                                            <div class="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-medium">
                                                ${week.week}
                                            </div>
                                            <span class="font-medium">Week ${week.week}</span>
                                        </div>
                                        <div class="flex items-center gap-4 text-xs">
                                            <span>Video: ${Math.round((week.video_progress || 0) * 100)}%</span>
                                
                                            ${week.assignment_file ? `<a href="/uploads/${week.assignment_file}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">📎 View File</a>` : ''}
                                            ${week.assignment_link ? `<a href="${week.assignment_link}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">🔗 View Link</a>` : ''}
                                            <span class="${statusColor} font-medium">${status}</span>
                                            ${week.assignment_submitted && !week.approved ? 
                                                `<div class="flex gap-1">
                                                    <button onclick="approveAssignment(${id}, ${week.week})" class="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs">Approve</button>
                                                    <button onclick="rejectAssignment(${id}, ${week.week})" class="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs">Reject</button>
                                                </div>` : 
                                                ''}
                                            ${week.video_watched && !week.approved ? 
                                                `<button onclick="rejectVideo(${id}, ${week.week})" class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-xs ml-1">Reject Video</button>` : 
                                                ''}
                                        </div>
                                    </div>
                                    ${week.feedback ? `<div class="ml-9 text-xs text-gray-600 bg-blue-50 p-2 rounded">Feedback: ${week.feedback}</div>` : ''}
                                    ${week.assignment_file ? `<div class="ml-9 text-xs text-gray-500">File: ${week.assignment_file}</div>` : ''}
                                    ${week.assignment_link ? `<div class="ml-9 text-xs text-gray-500">Link: <a href="${week.assignment_link}" target="_blank" class="text-blue-600 underline">${week.assignment_link}</a></div>` : ''}
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('student-modal-content').innerHTML = content;
            
            const modal = document.getElementById('student-modal');
            const container = document.getElementById('student-modal-container');
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            // Animate modal entrance
            setTimeout(() => {
                container.classList.remove('scale-95', 'opacity-0');
                container.classList.add('scale-100', 'opacity-100');
            }, 10);
        }
    } catch (error) {
        showMessage('Error loading student details', 'error');
    }
}

async function deleteStudent(id, name) {
    if (!confirm(`Delete student "${name}"? This action cannot be undone.`)) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/admin/student/${id}`, { 
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message);
            loadStudents();
        } else {
            showMessage(result.message || 'Failed to delete student', 'error');
        }
    } catch (error) {
        showMessage('Error deleting student', 'error');
    }
}

// Content
async function loadContent() {
    console.log('Loading content...');
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/content', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Content response status:', response.status);
        const result = await response.json();
        console.log('Content result:', result);
        
        if (result.success) {
            renderContent(result.content);
        } else {
            console.error('Failed to load content:', result.message);
            showMessage('Failed to load content: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading content:', error);
        showMessage('Error loading content', 'error');
    }
}

function renderContent(content) {
    const list = document.getElementById('content-list');
    
    if (content.length === 0) {
        list.innerHTML = '<div class="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">No content found</div>';
        return;
    }
    
    list.innerHTML = content.map(week => `
        <div class="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-700 p-6 card-hover">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
                        ${week.imageIcon ? 
                            `<img src="${week.imageIcon}" alt="Week ${week.week}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : 
                            ''}
                        <span class="text-primary font-bold text-sm ${week.imageIcon ? 'hidden' : ''}">W${week.week}</span>
                    </div>
                    <div>
                        <h4 class="font-semibold text-slate-800 dark:text-white">${week.title}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Week ${week.week}</p>
                    </div>
                </div>
                <button onclick="editContent(${week.week})" class="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                    <span class="material-symbols-outlined text-lg">edit</span>
                </button>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">${week.description}</p>
            ${week.assignmentQuestion ? `<div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><p class="text-xs text-blue-800 dark:text-blue-200 font-medium">Assignment: ${week.assignmentQuestion.substring(0, 100)}${week.assignmentQuestion.length > 100 ? '...' : ''}</p></div>` : ''}
            <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">play_circle</span>
                    ${(week.videoIds || week.videoid) ? 'Video Available' : 'No Video'}
                </span>
                <div class="flex items-center gap-2">
                    ${(week.assignmentQuestion || week.assignmentquestion) ? '<span class="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-xs">Assignment Set</span>' : ''}
                    <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs max-w-32 truncate">
                        ${(week.videoIds || week.videoid) ? 'Video Set' : 'No Video'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

function showContentModal(week = null) {
    const modal = document.getElementById('content-modal');
    const container = document.getElementById('content-modal-container');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Animate modal entrance
    setTimeout(() => {
        container.classList.remove('scale-95', 'opacity-0');
        container.classList.add('scale-100', 'opacity-100');
    }, 10);
    
    if (week) {
        // Edit mode
        const token = localStorage.getItem('adminToken');
        fetch(`/api/admin/content/${week}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    const content = result.content;
                    console.log('Loading content for edit:', content);
                    document.getElementById('content-week').value = week;
                    document.getElementById('content-week-number').value = week;
                    document.getElementById('content-title').value = content.title || '';
                    document.getElementById('content-description').value = content.description || '';
                    document.getElementById('content-video-ids').value = content.videoids || '';
                    document.getElementById('content-assignment-question').value = content.assignmentquestion || '';
                    document.getElementById('content-image-icon').value = content.imageicon || '';
                } else {
                    console.error('Failed to load content:', result);
                }
            })
            .catch(error => {
                console.error('Error loading content:', error);
            });
    } else {
        // Add mode
        document.getElementById('content-week').value = '';
        document.getElementById('content-week-number').value = '';
        document.getElementById('content-title').value = '';
        document.getElementById('content-description').value = '';
        document.getElementById('content-video-ids').value = '';
        document.getElementById('content-assignment-question').value = '';
        document.getElementById('content-image-icon').value = '';
    }
}

function closeContentModal() {
    const modal = document.getElementById('content-modal');
    const container = document.getElementById('content-modal-container');
    
    // Animate modal exit
    container.classList.remove('scale-100', 'opacity-100');
    container.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 200);
}

async function saveContent(event) {
    event.preventDefault();
    
    const videoInput = document.getElementById('content-video-ids').value.trim();
    const data = {
        week: document.getElementById('content-week').value || document.getElementById('content-week-number').value,
        title: document.getElementById('content-title').value,
        description: document.getElementById('content-description').value,
        videoId: videoInput.includes(',') ? videoInput.split(',')[0].trim() : (videoInput || null),
        videoIds: videoInput,
        assignmentQuestion: document.getElementById('content-assignment-question').value,
        imageIcon: document.getElementById('content-image-icon').value
    };
    
    console.log('Saving content data:', data);
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/content', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Content saved');
            closeContentModal();
            loadContent();
        } else {
            showMessage('Failed to save content', 'error');
        }
    } catch (error) {
        showMessage('Error saving content', 'error');
    }
}

function editContent(week) {
    showContentModal(week);
}

async function deleteContent(week) {
    if (!confirm(`Delete Week ${week}?`)) return;
    
    try {
        const response = await fetch(`/api/admin/content/${week}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            showMessage('Content deleted');
            loadContent();
        }
    } catch (error) {
        showMessage('Error deleting content', 'error');
    }
}

// Assignments
async function loadAssignments() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/assignments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        
        if (result.success) {
            assignmentsData = result.assignments;
            renderAssignments();
        }
    } catch (error) {
        showMessage('Error loading assignments', 'error');
    }
}

function renderAssignments() {
    const list = document.getElementById('assignments-list');
    const totalAssignments = assignmentsData.length;
    
    if (totalAssignments === 0) {
        list.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-slate-500 dark:text-slate-400">No assignments submitted</td></tr>';
        document.getElementById('assignments-pagination-container').innerHTML = '';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(totalAssignments / assignmentsPerPage);
    const startIndex = (assignmentsCurrentPage - 1) * assignmentsPerPage;
    const endIndex = startIndex + assignmentsPerPage;
    const currentAssignments = assignmentsData.slice(startIndex, endIndex);
    
    list.innerHTML = currentAssignments.map(assignment => {
        const approvalRate = Math.round((assignment.approved_assignments / assignment.total_assignments) * 100);
        
        return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">${assignment.student_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">${assignment.student_email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">${assignment.total_assignments}/8</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">${assignment.approved_assignments}/${assignment.total_assignments}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="viewStudentAssignments(${assignment.student_id}, '${assignment.student_name}')" class="text-primary hover:text-primary/80">View Details</button>
            </td>
        </tr>
        `;
    }).join('');
    
    // Render assignments pagination
    renderAssignmentsPagination(totalPages);
}

function reviewAssignment(studentId, week, studentName, weekTitle) {
    const modal = document.getElementById('assignment-modal');
    const container = document.getElementById('assignment-modal-container');
    
    document.getElementById('assignment-modal-title').textContent = `Review Assignment - ${studentName} (${weekTitle})`;
    document.getElementById('assignment-student-id').value = studentId;
    document.getElementById('assignment-week').value = week;
    document.getElementById('assignment-feedback').value = '';
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        container.classList.remove('scale-95', 'opacity-0');
        container.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    const container = document.getElementById('assignment-modal-container');
    
    container.classList.remove('scale-100', 'opacity-100');
    container.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 200);
}

async function approveAssignmentFromModal() {
    const studentId = document.getElementById('assignment-student-id').value;
    const week = document.getElementById('assignment-week').value;
    const feedback = document.getElementById('assignment-feedback').value;
    
    try {
        const response = await fetch('/api/admin/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, week, feedback })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Assignment approved successfully');
            closeAssignmentModal();
            loadAssignments();
        } else {
            showMessage('Failed to approve assignment', 'error');
        }
    } catch (error) {
        showMessage('Error approving assignment', 'error');
    }
}

async function rejectAssignmentFromModal() {
    const studentId = document.getElementById('assignment-student-id').value;
    const week = document.getElementById('assignment-week').value;
    const feedback = document.getElementById('assignment-feedback').value || 'Assignment rejected. Please resubmit.';
    
    try {
        const response = await fetch('/api/admin/reject-assignment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, week, feedback })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Assignment rejected');
            closeAssignmentModal();
            loadAssignments();
        } else {
            showMessage('Failed to reject assignment', 'error');
        }
    } catch (error) {
        showMessage('Error rejecting assignment', 'error');
    }
}

async function rejectAssignment(studentId, week) {
    const feedback = prompt('Enter feedback for rejection (optional):');
    
    try {
        const response = await fetch('/api/admin/reject-assignment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, week, feedback })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Assignment rejected');
            closeStudentModal();
            loadStudents();
        } else {
            showMessage('Failed to reject assignment', 'error');
        }
    } catch (error) {
        showMessage('Error rejecting assignment', 'error');
    }
}

async function rejectVideo(studentId, week) {
    const feedback = prompt('Enter feedback for video rejection (optional):');
    
    try {
        const response = await fetch('/api/admin/reject-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, week, feedback })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Video progress rejected');
            closeStudentModal();
            loadStudents();
        } else {
            showMessage('Failed to reject video progress', 'error');
        }
    } catch (error) {
        showMessage('Error rejecting video progress', 'error');
    }
}

// Utilities
function showMessage(text, type = 'success') {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `fixed top-4 right-4 p-4 rounded ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`;
    msg.classList.remove('hidden');
    
    setTimeout(() => {
        msg.classList.add('hidden');
    }, 3000);
}

async function logout() {
    try {
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        window.location.href = '/';
    }
}

// Search functionality
function filterStudents() {
    const searchTerm = document.getElementById('student-search').value.toLowerCase();
    
    if (searchTerm === '') {
        // Reset to original data
        studentsData = [...originalStudentsData];
    } else {
        // Filter all students data
        studentsData = originalStudentsData.filter(student => 
            student.name.toLowerCase().includes(searchTerm) || 
            student.email.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    renderStudents();
}

// Close student modal
function closeStudentModal() {
    const modal = document.getElementById('student-modal');
    const container = document.getElementById('student-modal-container');
    
    // Animate modal exit
    container.classList.remove('scale-100', 'opacity-100');
    container.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 200);
}

// Close modal on backdrop click
function closeModalOnBackdrop(event) {
    if (event.target === event.currentTarget) {
        const modalId = event.target.id;
        if (modalId === 'content-modal') closeContentModal();
        else if (modalId === 'assignment-modal') closeAssignmentModal();
        else if (modalId === 'student-modal') closeStudentModal();
    }
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let pagination = '<div class="flex items-center justify-between mt-4">';
    pagination += `<div class="text-sm text-slate-600 dark:text-slate-300">Page ${currentPage} of ${totalPages}</div>`;
    pagination += '<div class="flex gap-2">';
    
    if (currentPage > 1) {
        pagination += `<button onclick="changePage(${currentPage - 1})" class="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90">Previous</button>`;
    }
    
    if (currentPage < totalPages) {
        pagination += `<button onclick="changePage(${currentPage + 1})" class="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90">Next</button>`;
    }
    
    pagination += '</div></div>';
    container.innerHTML = pagination;
}

function changePage(page) {
    currentPage = page;
    renderStudents();
}

// Approve assignment
async function viewStudentAssignments(studentId, studentName) {
    try {
        const response = await fetch(`/api/admin/student/${studentId}`);
        const result = await response.json();
        
        if (result.success) {
            viewStudent(studentId);
        } else {
            showMessage('Error loading student assignments', 'error');
        }
    } catch (error) {
        showMessage('Error loading student assignments', 'error');
    }
}

function renderAssignmentsPagination(totalPages) {
    const container = document.getElementById('assignments-pagination-container');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let pagination = '<div class="flex items-center justify-between mt-4">';
    pagination += `<div class="text-sm text-slate-600 dark:text-slate-300">Page ${assignmentsCurrentPage} of ${totalPages}</div>`;
    pagination += '<div class="flex gap-2">';
    
    if (assignmentsCurrentPage > 1) {
        pagination += `<button onclick="changeAssignmentsPage(${assignmentsCurrentPage - 1})" class="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90">Previous</button>`;
    }
    
    if (assignmentsCurrentPage < totalPages) {
        pagination += `<button onclick="changeAssignmentsPage(${assignmentsCurrentPage + 1})" class="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90">Next</button>`;
    }
    
    pagination += '</div></div>';
    container.innerHTML = pagination;
}

function changeAssignmentsPage(page) {
    assignmentsCurrentPage = page;
    renderAssignments();
}

async function approveAssignment(studentId, week) {
    const feedback = prompt('Enter feedback (optional):');
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/approve', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ studentId, week, feedback })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Assignment approved successfully');
            closeStudentModal();
            loadStudents();
        } else {
            showMessage('Failed to approve assignment', 'error');
        }
    } catch (error) {
        showMessage('Error approving assignment', 'error');
    }
}