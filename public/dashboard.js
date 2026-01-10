let progressData = [];

let weekDescriptions = {};
let courseContent = [];

let currentPlayer = null;
let watchStartTime = null;

async function loadCourseContent() {
    try {
        console.log('Fetching course content...');
        const response = await fetch('/api/course-content');
        console.log('Course content response status:', response.status);
        const result = await response.json();
        console.log('Course content result:', result);
        
        if (result.success) {
            courseContent = result.content;
            weekDescriptions = {};
            
            courseContent.forEach(content => {
                // Determine type based on actual content
                let type = 'class';
                if (content.week === 6) {
                    type = 'certification';
                } else if (content.week >= 1 && content.week <= 5) {
                    type = 'class';
                }
                           
                weekDescriptions[content.week] = {
                    title: content.title,
                    description: content.description,
                    videoId: content.videoid || content.videoId,
                    videoIds: content.videoids || content.videoIds,
                    assignmentQuestion: content.assignmentquestion || content.assignmentQuestion,
                    imageIcon: content.imageicon || content.imageIcon,
                    type: type
                };
            });
            console.log('Week descriptions loaded:', weekDescriptions);
        } else {
            console.log('Course content load failed:', result.message);
        }
    } catch (error) {
        console.error('Error loading course content:', error);
    }
}

async function loadProgress() {
    try {
        console.log('Loading course content...');
        await loadCourseContent();
        
        console.log('Fetching progress...');
        const response = await fetch('/api/progress');
        console.log('Progress response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            console.log('Authentication failed');
            showMessage('Session expired. Please login again.', 'error');
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }
        
        const result = await response.json();
        console.log('Progress result:', result);
        
        if (result.success) {
            progressData = result.progress;
            console.log('Progress data loaded:', progressData);
            // Update welcome message with student name
            const welcomeTitle = document.getElementById('welcome-title');
            const avatarElement = document.getElementById('student-avatar');
            const avatarLarge = document.getElementById('student-avatar-large');
            if (welcomeTitle && result.studentName) {
                const firstName = result.studentName.split(' ')[0];
                welcomeTitle.textContent = `Welcome back, ${firstName}!`;
                // Generate initials for avatar
                const initials = result.studentName.split(' ').map(name => name.charAt(0).toUpperCase()).join('').substring(0, 2);
                if (avatarElement) {
                    avatarElement.textContent = initials;
                }
                if (avatarLarge) {
                    avatarLarge.textContent = initials;
                }
            }
            renderWeeks();
        } else {
            console.log('Progress load failed:', result.message);
            showMessage(result.message || 'Failed to load progress', 'error');
            setTimeout(() => window.location.href = '/', 2000);
        }
    } catch (error) {
        console.error('Error loading progress:', error);
        showMessage('Network error. Please check your connection.', 'error');
        setTimeout(() => window.location.href = '/', 3000);
    }
}

function renderWeeks() {
    let completedWeeks = 0;
    let currentWeek = null;
    
    // Find current week and count completed
    progressData.forEach((week, index) => {
        if (week.approved) {
            completedWeeks++;
        } else if (!currentWeek) {
            const canAccess = week.week === 1 || (index > 0 && progressData[index - 1] && progressData[index - 1].approved);
            if (canAccess) {
                currentWeek = week;
            }
        }
    });
    
    // Update progress ring and percentage
    const progressPercent = Math.round((completedWeeks / progressData.length) * 100);
    updateProgressRing(progressPercent);
    
    // Update continue learning section
    updateContinueLearning(currentWeek);
    
    // Update course timeline
    updateCourseTimeline();
}

function updateProgressRing(percentage) {
    const progressRing = document.getElementById('progress-ring');
    const progressText = document.getElementById('progress-percentage');
    
    if (progressRing && progressText) {
        const circumference = 2 * Math.PI * 52; // radius = 52
        const offset = circumference - (percentage / 100) * circumference;
        
        progressRing.style.strokeDasharray = circumference;
        progressRing.style.strokeDashoffset = offset;
        progressText.textContent = `${percentage}%`;
    }
}

function updateContinueLearning(currentWeek) {
    const titleEl = document.getElementById('current-week-title');
    const descEl = document.getElementById('current-week-desc');
    const btnEl = document.getElementById('continue-btn');
    
    if (currentWeek && weekDescriptions[currentWeek.week]) {
        const weekInfo = weekDescriptions[currentWeek.week];
        titleEl.textContent = weekInfo.title;
        descEl.textContent = weekInfo.description;
        btnEl.onclick = () => openWeekModal(currentWeek.week);
        btnEl.querySelector('span:last-child').textContent = `Continue Week ${currentWeek.week}`;
    } else {
        titleEl.textContent = 'Course Complete!';
        descEl.textContent = 'Congratulations on completing the Administrative Toolkit course!';
        btnEl.style.display = 'none';
    }
}

function updateCourseTimeline() {
    const timeline = document.getElementById('course-timeline');
    timeline.innerHTML = '';
    
    // Tool logos mapping for 6-week structure
    const toolLogos = {
        1: 'https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_31.ico', // Meet + Calendar
        2: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', // Forms + Gmail
        3: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico', // Drive + Docs
        4: 'https://cdn.worldvectorlogo.com/logos/trello.svg', // Trello + Keep
        5: 'https://ssl.gstatic.com/docs/spreadsheets/favicon_jfk2.png', // Sheets
        6: 'https://fonts.gstatic.com/s/i/productlogos/admin_2020q4/v6/web-512dp/logo_admin_2020q4_color_2x_web_512dp.png' // Graduation
    };
    
    // Display individual weeks with enhanced design
    progressData.forEach((week, index) => {
        const isLast = index === progressData.length - 1;
        const weekInfo = weekDescriptions[week.week];
        const canAccess = week.week === 1 || (index > 0 && progressData[index - 1] && progressData[index - 1].approved) || week.approved;
        
        let status, statusColor, bgGradient, borderColor, textColor;
        if (week.approved) {
            status = 'Completed';
            statusColor = 'text-emerald-600 dark:text-emerald-400';
            bgGradient = 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20';
            borderColor = 'border-emerald-200 dark:border-emerald-800/50';
            textColor = 'text-emerald-800 dark:text-emerald-200';
        } else if (canAccess) {
            status = 'Available';
            statusColor = 'text-blue-600 dark:text-blue-400';
            bgGradient = 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20';
            borderColor = 'border-blue-200 dark:border-blue-800/50';
            textColor = 'text-blue-800 dark:text-blue-200';
        } else {
            status = 'Locked';
            statusColor = 'text-slate-500 dark:text-slate-400';
            bgGradient = 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50';
            borderColor = 'border-slate-200 dark:border-slate-700';
            textColor = 'text-slate-600 dark:text-slate-400';
        }
        
        const progressWidth = week.approved ? 100 : (week.video_watched ? 50 : 0);
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="group relative ${!isLast ? 'mb-4' : ''}">
                <div class="${bgGradient} ${borderColor} border-2 rounded-2xl p-6 transition-all duration-300 ${canAccess ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] hover:border-opacity-80' : 'opacity-70'} ${canAccess ? 'hover:-translate-y-1' : ''}" ${canAccess ? `onclick="openWeekModal(${week.week})"` : ''}>
                    
                    <!-- Header Section -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-start gap-3 sm:gap-4">
                            <div class="relative flex-shrink-0">
                                <div class="w-12 h-12 sm:w-16 sm:h-16 ${week.approved ? 'bg-emerald-100 dark:bg-emerald-900/30' : canAccess ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg p-2 sm:p-3">
                                    <img src="${weekInfo?.imageIcon || toolLogos[week.week] || 'https://fonts.gstatic.com/s/i/productlogos/admin_2020q4/v6/web-512dp/logo_admin_2020q4_color_2x_web_512dp.png'}" alt="Tool ${week.week}" class="w-full h-full object-contain" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                    <span class="text-lg sm:text-2xl hidden">📚</span>
                                </div>
                                ${week.approved ? '<div class="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-white text-xs sm:text-sm">check</span></div>' : ''}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                                    <span class="px-2 py-1 sm:px-3 text-xs font-bold ${textColor} bg-white/60 dark:bg-black/20 rounded-full whitespace-nowrap">Week ${week.week}</span>
                                    <span class="px-2 py-1 sm:px-3 text-xs font-medium ${statusColor} bg-white/80 dark:bg-black/30 rounded-full whitespace-nowrap">${status}</span>
                                </div>
                                <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 leading-tight">${weekInfo?.title || `Week ${week.week}`}</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">${weekInfo?.description || 'Course content'}</p>
                            </div>
                        </div>
                        
                        <div class="flex-shrink-0">
                            ${canAccess ? '<div class="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"><span class="material-symbols-outlined text-xl sm:text-2xl">arrow_forward</span></div>' : '<div class="text-gray-300 dark:text-gray-600"><span class="material-symbols-outlined text-xl sm:text-2xl">lock</span></div>'}
                        </div>
                    </div>
                    
                    <!-- Progress Section -->
                    <div class="space-y-3">
                        <!-- Progress Bar -->
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div class="h-full ${week.approved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : canAccess ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-300 dark:bg-gray-600'} transition-all duration-500 ease-out" style="width: ${progressWidth}%"></div>
                        </div>
                        
                        <!-- Stats Row -->
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                ${week.video_watched ? '<div class="flex items-center gap-1 text-green-600 dark:text-green-400"><span class="material-symbols-outlined text-sm">play_circle</span><span class="truncate">Video Watched</span></div>' : '<div class="flex items-center gap-1 text-gray-500 dark:text-gray-400"><span class="material-symbols-outlined text-sm">play_circle</span><span class="truncate">Video Pending</span></div>'}
                                ${week.assignment_submitted ? '<div class="flex items-center gap-1 text-green-600 dark:text-green-400"><span class="material-symbols-outlined text-sm">assignment_turned_in</span><span class="truncate">Assignment Done</span></div>' : '<div class="flex items-center gap-1 text-gray-500 dark:text-gray-400"><span class="material-symbols-outlined text-sm">assignment</span><span class="truncate">Assignment Pending</span></div>'}
                            </div>

                        </div>
                    </div>
                    
                    ${canAccess ? '<div class="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/30 dark:border-black/20"><p class="text-xs text-center text-gray-500 dark:text-gray-400 font-medium">Tap to ' + (week.approved ? 'review content' : 'start learning') + '</p></div>' : ''}
                </div>
            </div>
        `;
        timeline.appendChild(li);
    });
}

function continueCurrentWeek() {
    const currentWeek = progressData.find((week, index) => {
        if (week.approved) return false;
        const canAccess = week.week === 1 || (index > 0 && progressData[index - 1] && progressData[index - 1].approved);
        return canAccess;
    });
    
    if (currentWeek) {
        openWeekModal(currentWeek.week);
    }
}



function openWeekModal(weekNumber) {
    const week = progressData.find(w => w.week === weekNumber);
    const weekInfo = weekDescriptions[weekNumber];
    
    // Check if student can access this week
    const previousWeek = progressData.find(w => w.week === weekNumber - 1);
    const canAccess = weekNumber === 1 || (previousWeek && previousWeek.approved) || week.approved;
    
    document.getElementById('modal-title').textContent = weekInfo.title;
    document.getElementById('modal-subtitle').textContent = `Week ${weekNumber} • Digital Productivity Course`;

    let modalContent = `
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl p-6 mb-8">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">About This Week</h3>
                    <p class="text-gray-700 dark:text-gray-300 leading-relaxed">${weekInfo.description}</p>
                </div>
            </div>
        </div>
    `;
    
    if (!canAccess && weekNumber > 1) {
        modalContent += `
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <div class="flex items-center gap-3">
                    <span class="text-amber-600 dark:text-amber-400 text-xl">⚠️</span>
                    <p class="text-amber-800 dark:text-amber-200 font-medium">Complete Week ${weekNumber - 1} first to unlock this content</p>
                </div>
            </div>
        `;
    } else {
        if (week.feedback) {
            modalContent += `
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <div class="flex items-start gap-3">
                        <span class="text-blue-600 dark:text-blue-400 text-xl">💬</span>
                        <div>
                            <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-1">Instructor Feedback</h4>
                            <p class="text-blue-800 dark:text-blue-200">${week.feedback}</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (weekInfo.type === 'class') {
            modalContent += `
                <div class="space-y-8">
                    <!-- Video Section -->
                    <div class="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-100 dark:border-purple-800/30">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center">
                                <span class="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">play_circle</span>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Video Lesson</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Watch and learn at your own pace</p>
                            </div>
                        </div>
                        ${generateVideoSection(weekInfo, weekNumber)}
                        
                        <div class="flex flex-col sm:flex-row gap-3">
                            <a href="${weekInfo.videoIds || weekInfo.videoId}" target="_blank" class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-center">
                                <span class="flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-sm">open_in_new</span>
                                    Watch in Drive
                                </span>
                            </a>
                            <button class="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" onclick="markVideoComplete(${weekNumber})" ${week.video_watched ? 'disabled' : ''}>
                                <span class="flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-sm">${week.video_watched ? 'check_circle' : 'done'}</span>
                                    ${week.video_watched ? 'Video Completed' : 'Mark Video Complete'}
                                </span>
                            </button>
                        </div>
                    </div>
                    

                    
                    <!-- Assignment Section -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 border border-green-100 dark:border-green-800/30">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-2xl flex items-center justify-center">
                                <span class="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">assignment</span>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Practical Assignment</h3>
                                <div class="text-sm text-gray-600 dark:text-gray-400">${(weekInfo?.assignmentQuestion || 'Apply what you\'ve learned').replace(/\n/g, '<br>')}</div>
                            </div>
                        </div>
                        <form id="assignment-form-${weekNumber}" onsubmit="submitAssignmentFile(event, ${weekNumber})" class="space-y-6">
                            <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Upload File</label>
                                    <div class="flex flex-col sm:flex-row gap-3">
                                        <input type="file" name="file" accept=".pdf,.doc,.docx,.txt,.jpg,.png" 
                                               class="flex-1 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-green-600 file:to-emerald-600 file:text-white hover:file:from-green-700 hover:file:to-emerald-700 file:font-semibold file:shadow-lg file:transition-all"
                                               ${week.assignment_submitted ? 'disabled' : ''}>
                                    </div>
                                    ${week.assignment_file ? `<div class="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400"><span class="material-symbols-outlined text-sm">attach_file</span><span>${week.assignment_file}</span></div>` : ''}
                                </div>
                                
                                <div class="text-center text-sm text-gray-500 dark:text-gray-400 font-medium">OR</div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Share Link</label>
                                    <input type="url" name="link" placeholder="https://drive.google.com/... or any other link" 
                                           class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                           ${week.assignment_submitted ? 'disabled' : ''}>
                                    ${week.assignment_link ? `<div class="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400"><span class="material-symbols-outlined text-sm">link</span><a href="${week.assignment_link}" target="_blank" class="underline">${week.assignment_link}</a></div>` : ''}
                                </div>
                                
                                <button type="submit" class="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
                                        ${week.assignment_submitted ? 'disabled' : ''}>
                                    <span class="flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined text-sm">${week.assignment_submitted ? 'check_circle' : 'upload'}</span>
                                        ${week.assignment_submitted ? 'Submitted' : 'Submit Work'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                ${week.assignment_submitted && !week.approved ? '<div class="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"><div class="flex items-center gap-3"><span class="text-yellow-600 dark:text-yellow-400 text-xl">⏳</span><p class="text-yellow-800 dark:text-yellow-200 font-medium">Waiting for instructor approval</p></div></div>' : ''}
                ${week.approved ? '<div class="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"><div class="flex items-center gap-3"><span class="text-green-600 dark:text-green-400 text-xl">✅</span><p class="text-green-800 dark:text-green-200 font-medium">Approved - You can proceed to the next week</p></div></div>' : ''}
            `;
        } else if (weekInfo.type === 'certification') {
            modalContent += `
                <div class="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-8 border border-yellow-100 dark:border-yellow-800/30">
                    <div class="text-center">
                        <div class="text-6xl mb-4">🎓</div>
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Graduation Week</h3>
                        <p class="text-gray-600 dark:text-gray-400 mb-6">Complete your final assessment to earn your Administrative Toolkit certificate</p>
                        
                        <div class="space-y-6">
                            <!-- Video Section for Certification -->
                            <div class="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-lg">
                                <iframe id="video-${weekNumber}" 
                                        src="${getEmbedUrl(weekInfo.videoIds || weekInfo.videoId)}" 
                                        class="w-full h-full" frameborder="0" allowfullscreen webkitallowfullscreen mozallowfullscreen>
                                </iframe>
                            </div>
                            
                            <button class="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" onclick="markVideoComplete(${weekNumber})"
                                    ${week.video_watched ? 'disabled' : ''}>
                                <span class="flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-sm">${week.video_watched ? 'check_circle' : 'school'}</span>
                                    ${week.video_watched ? '✓ Certification Completed' : 'Complete Certification'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    document.getElementById('modal-body').innerHTML = modalContent;
    document.getElementById('modal-body').innerHTML = modalContent;
    const modal = document.getElementById('week-modal');
    const container = document.getElementById('modal-container');
    
    if (modal && container) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Animate in
        setTimeout(() => {
            container.classList.remove('scale-95', 'opacity-0');
            container.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

function closeModal() {
    const modal = document.getElementById('week-modal');
    const container = document.getElementById('modal-container');
    
    if (modal && container) {
        // Animate out
        container.classList.add('scale-95', 'opacity-0');
        container.classList.remove('scale-100', 'opacity-100');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 200);
    }
    
    watchStartTime = null;
    
    // Clear all tracking intervals
    if (typeof trackingIntervals !== 'undefined') {
        Object.keys(trackingIntervals).forEach(weekNumber => {
            clearInterval(trackingIntervals[weekNumber]);
            delete trackingIntervals[weekNumber];
        });
    }
}

function closeModalOnBackdrop(event) {
    if (event.target === event.currentTarget) {
        closeModal();
    }
}

async function markVideoComplete(weekNumber) {
    try {
        const response = await fetch('/api/mark-video-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ week: weekNumber })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Video marked as complete!');
            await loadProgress();
            closeModal();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Error marking video complete', 'error');
    }
}



async function submitAssignmentFile(event, weekNumber) {
    event.preventDefault();
    const fileInput = event.target.querySelector('input[type="file"]');
    const linkInput = event.target.querySelector('input[type="url"]');
    
    const hasFile = fileInput.files.length > 0;
    const hasLink = linkInput.value.trim() !== '';
    
    if (!hasFile && !hasLink) {
        showMessage('Please provide either a file or a link', 'error');
        return;
    }
    
    if (hasFile && hasLink) {
        showMessage('Please provide either a file OR a link, not both', 'error');
        return;
    }
    
    if (hasFile) {
        const file = fileInput.files[0];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (file.size > maxSize) {
            showMessage('File size must be less than 10MB', 'error');
            return;
        }
        
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            showMessage('Please upload a valid file type (PDF, DOC, DOCX, TXT, JPG, PNG)', 'error');
            return;
        }
    }
    
    if (hasLink) {
        try {
            new URL(linkInput.value.trim());
        } catch {
            showMessage('Please enter a valid URL', 'error');
            return;
        }
    }
    
    const formData = new FormData(event.target);
    formData.append('week', weekNumber);
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = hasFile ? 'Uploading...' : 'Submitting...';
    
    try {
        const response = await fetch('/api/submit-assignment', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message);
            await loadProgress();
            closeModal();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Error submitting assignment. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Assignment';
    }
}



async function logout() {
    console.log('Logout function called');
    try {
        console.log('Sending logout request...');
        const response = await fetch('/logout', { method: 'POST' });
        console.log('Logout response:', response.status);
        console.log('Redirecting to home...');
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/';
    }
}

function showMessage(text, type = 'success') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `fixed top-4 right-4 z-50 rounded-lg p-4 text-white shadow-lg ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`;
        messageDiv.classList.remove('hidden');
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 3000);
    }
}







// Get embed URL for different video platforms
function getEmbedUrl(videoUrl) {
    if (!videoUrl) return 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    
    // Google Drive video
    if (videoUrl.includes('drive.google.com')) {
        const fileIdMatch = videoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
            return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview?usp=sharing`;
        }
        // If already in preview format, return as-is
        if (videoUrl.includes('/preview')) {
            return videoUrl;
        }
    }
    
    // YouTube video
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const videoId = extractVideoId(videoUrl);
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
    }
    
    // If it's already an embed URL, return as-is
    if (videoUrl.includes('/embed/') || videoUrl.includes('/preview')) {
        return videoUrl;
    }
    
    // For any other URL, return as-is (don't default to YouTube)
    return videoUrl;
}

// Extract video ID from YouTube URL or return as-is if already an ID
function extractVideoId(videoIdOrUrl) {
    if (!videoIdOrUrl) return 'dQw4w9WgXcQ';
    
    // If it's already just an ID (11 characters, no special chars), return it
    if (videoIdOrUrl.length === 11 && !/[^a-zA-Z0-9_-]/.test(videoIdOrUrl)) {
        return videoIdOrUrl;
    }
    
    // Extract from various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = videoIdOrUrl.match(pattern);
        if (match) return match[1];
    }
    
    // If no pattern matches, return default
    return 'dQw4w9WgXcQ';
}

// Generate video section with support for multiple videos and different platforms
function generateVideoSection(weekInfo, weekNumber) {
    const videoIds = weekInfo.videoIds || weekInfo.videoId;
    
    if (!videoIds) {
        return `<div class="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden mb-6 shadow-lg flex items-center justify-center">
            <p class="text-white">No video available</p>
        </div>`;
    }
    
    // Check if multiple videos (comma-separated)
    const videoList = videoIds.includes(',') ? videoIds.split(',').map(v => v.trim()) : [videoIds];
    
    if (videoList.length === 1) {
        // Single video
        return `<div class="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden mb-6 shadow-lg">
            <iframe id="video-${weekNumber}" 
                    src="${getEmbedUrl(videoList[0])}" 
                    class="w-full h-full" frameborder="0" allowfullscreen webkitallowfullscreen mozallowfullscreen>
            </iframe>
        </div>`;
    } else {
        // Multiple videos
        return `<div class="space-y-4 mb-6">
            ${videoList.map((video, index) => `
                <div class="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-lg">
                    <iframe id="video-${weekNumber}-${index}" 
                            src="${getEmbedUrl(video)}" 
                            class="w-full h-full" frameborder="0" allowfullscreen webkitallowfullscreen mozallowfullscreen>
                    </iframe>
                </div>
            `).join('')}
        </div>`;
    }
}

// Load progress when page loads
document.addEventListener('DOMContentLoaded', loadProgress);