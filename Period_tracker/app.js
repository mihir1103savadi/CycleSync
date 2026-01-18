/**
 * CycleSync - Period Tracker Application
 * Pure Vanilla JS Implementation (MPA Style with Hash Routing)
 */

const STORAGE_KEY = 'cyclesync_data_v1';
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

// --- STATE MANAGEMENT ---
const AppState = {
    data: {
        currentUserIndex: null,
        users: []
    },
    
    init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            this.data = JSON.parse(stored);
        }
        // Ensure data integrity for new features
        if (this.data.users) {
            this.data.users.forEach(u => {
                if (!u.logs) u.logs = {}; // Init logs if missing
            });
        }
    },

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    },

    // Import Data
    importData(jsonData) {
        try {
            const parsed = JSON.parse(jsonData);
            if (parsed.users && Array.isArray(parsed.users)) {
                this.data = parsed;
                this.save();
                return true;
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    },

    getCurrentUser() {
        if (this.data.currentUserIndex === null || !this.data.users[this.data.currentUserIndex]) return null;
        return this.data.users[this.data.currentUserIndex];
    },

    addUser(name, lastPeriodDate) {
        const newUser = {
            id: 'u' + Date.now(),
            name: name,
            themeColor: '#FF8DA1',
            cycles: [],
            logs: {} // Date string Key -> { mood, flow, symptoms[] }
        };
        
        if (lastPeriodDate) {
            newUser.cycles.push({
                startDate: lastPeriodDate,
                endDate: null
            });
        }

        this.data.users.push(newUser);
        this.data.currentUserIndex = this.data.users.length - 1;
        this.save();
        return newUser;
    },

    switchUser(index) {
        this.data.currentUserIndex = index;
        this.save();
    },

    deleteUser(index) {
        const isCurrentUser = index === this.data.currentUserIndex;
        this.data.users.splice(index, 1);
        if (this.data.users.length === 0) {
            this.data.currentUserIndex = null;
        } else {
            if (index < this.data.currentUserIndex) {
                this.data.currentUserIndex--;
            } else if (isCurrentUser) {
                this.data.currentUserIndex = 0;
            }
        }
        this.save();
    },

    // --- LOGIC: Cycle Calculations ---
    getCycles() {
        const user = this.getCurrentUser();
        return user ? user.cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)) : [];
    },

    getLatestCycle() {
        const cycles = this.getCycles();
        return cycles.length > 0 ? cycles[0] : null;
    },

    getAverageCycleLength() {
        const cycles = this.getCycles();
        if (cycles.length < 2) return DEFAULT_CYCLE_LENGTH;
        let totalDays = 0;
        let count = 0;
        const recentCycles = cycles.slice(0, 4); 
        for (let i = 0; i < recentCycles.length - 1; i++) {
            const current = new Date(recentCycles[i].startDate);
            const prev = new Date(recentCycles[i+1].startDate);
            const diff = Math.ceil(Math.abs(current - prev) / (1000 * 60 * 60 * 24));
            totalDays += diff;
            count++;
        }
        return count === 0 ? DEFAULT_CYCLE_LENGTH : Math.round(totalDays / count);
    },

    isPeriodActive() {
        const latest = this.getLatestCycle();
        return latest && !latest.endDate;
    },

    logPeriodStart(dateStr) {
        const user = this.getCurrentUser();
        const latest = this.getLatestCycle();
        if (latest && !latest.endDate) latest.endDate = dateStr;
        user.cycles.push({ startDate: dateStr, endDate: null });
        this.save();
    },

    logPeriodEnd(dateStr) {
        const cycles = this.getCycles(); // this returns sorted copy, careful. We need ref to original object in array.
        // Actually getCycles returns sorted array of refs if objects are refs. Yes.
        if (cycles.length > 0 && !cycles[0].endDate) {
            cycles[0].endDate = dateStr;
            this.save();
        }
    },

    // --- LOGIC: Daily Logs ---
    saveDailyLog(dateStr, data) {
        const user = this.getCurrentUser();
        if (!user.logs) user.logs = {};
        user.logs[dateStr] = data;
        this.save();
    },

    getLog(dateStr) {
        const user = this.getCurrentUser();
        return (user && user.logs) ? user.logs[dateStr] : null;
    }
};

// --- DATA: EMOTIONAL SUPPORT ---
const AffirmationLibrary = {
    'Menstrual Phase': [
        "It is productive to rest. You don't have to do it all today.",
        "Listen to your body. Slow down and recharge.",
        "Be gentle with yourself. You are doing enough."
    ],
    'Follicular Phase': [
        "Your potential is limitless today.",
        "Embrace your rising energy. Create something new!",
        "You are glowing from the inside out."
    ],
    'Ovulation Phase': [
        "You are magnetic and powerful.",
        "Confidence looks good on you.",
        "Connect with others and share your light."
    ],
    'Luteal Phase': [
        "Honor your boundaries. It's okay to say no.",
        "Your feelings are valid. Take care of your heart.",
        "Turn inward and find your calm."
    ],
    'Late Phase': [
        "Breathe. Stressing won't help. Trust your body.",
        "Patience is a form of self-love."
    ]
};

const PartnerMessages = {
    'Menstrual Phase': "Hey! I'm on Day 1 of my cycle. Operating on low power mode today. Warm hugs and snacks would be amazing. 🍫❤️",
    'Follicular Phase': "Feeling energized and creative today! Ready to take on the world. ✨",
    'Ovulation Phase': "Feeling super confident and high energy today! 🌟 Let's do something fun!",
    'Luteal Phase': "I'm in my Luteal phase (pre-period). My social battery is a bit low and I might need some extra patience today. 🔋💛",
    'Late Phase': "My period is a bit late and I'm feeling a little stressed about it. Just a heads up! 🤍"
};

// --- ROUTER ---
const Router = {
    routes: {
        '#dashboard': 'view-dashboard',
        '#calendar': 'view-calendar',
        '#analytics': 'view-analytics',
        '#settings': 'view-settings',
        '#learn': 'view-learn',
        '#log': 'view-log',
        'default': 'view-dashboard'
    },

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); // Initial load
    },

    handleRoute() {
        const hash = window.location.hash || '#dashboard';
        const user = AppState.getCurrentUser();

        // Guard: If no user, force onboarding
        if (!user) {
            this.showScreen('view-onboarding');
            return;
        }

        this.showScreen('main-app'); // Ensure main app is visible

        // Special handling for log (maybe pass date params later)
        if (hash.startsWith('#log')) {
             // allow render
        }

        const targetId = this.routes[hash] || this.routes['default'];
        
        // Update Nav Active State
        document.querySelectorAll('.nav-item').forEach(el => {
            if(el.getAttribute('href') === hash) el.classList.add('active');
            else el.classList.remove('active');
        });

        // Show View
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        const targetEl = document.getElementById(targetId);
        if(targetEl) {
            targetEl.classList.add('active');
            // Trigger specific renderers
            if(targetId === 'view-dashboard') UI.renderDashboard();
            if(targetId === 'view-calendar') UI.renderCalendar();
            if(targetId === 'view-analytics') UI.renderAnalytics();
            if(targetId === 'view-log') UI.LogController.initForm();
        }
    },

    showScreen(screenId) {
        // Toggle between Onboarding and Main App
        if(screenId === 'view-onboarding') {
            document.getElementById('view-onboarding').classList.add('active');
            document.getElementById('view-onboarding').classList.remove('hidden');
            document.getElementById('main-app').classList.add('hidden');
        } else {
            document.getElementById('view-onboarding').classList.remove('active');
            document.getElementById('view-onboarding').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
        }
    }
};

// --- VIEW CONTROLLER ---
const UI = {
    currentDate: new Date(), // For calendar navigation
    currentPartnerMsg: "", // Store for sharing

    init() {
        // --- GLOBAL EVENT LISTENERS ---
        
        // Onboarding
        document.getElementById('btn-create-profile').addEventListener('click', () => {
            document.getElementById('new-profile-modal').classList.remove('hidden');
        });
        document.getElementById('btn-cancel-create').addEventListener('click', () => {
            document.getElementById('new-profile-modal').classList.add('hidden');
            this.clearCreateForm();
        });
        document.getElementById('btn-save-profile').addEventListener('click', () => {
            const name = document.getElementById('input-name').value;
            const date = document.getElementById('input-last-date').value;
            if(name) {
                AppState.addUser(name, date);
                document.getElementById('new-profile-modal').classList.add('hidden');
                this.clearCreateForm();
                
                // Instantly update all profile lists
                this.renderProfileListOnboarding();
                this.renderProfileManager();

                // Close manager if it was open so user sees their new dashboard
                document.getElementById('profile-manager-modal').classList.add('hidden');

                // Redirect to dashboard and refresh UI
                window.location.hash = '#dashboard';
                Router.handleRoute(); 
            }
        });

        // Manager
        document.getElementById('btn-manage-profiles').addEventListener('click', () => {
            this.renderProfileManager();
            document.getElementById('profile-manager-modal').classList.remove('hidden');
        });
        document.getElementById('btn-close-manager').addEventListener('click', () => {
            document.getElementById('profile-manager-modal').classList.add('hidden');
        });
        document.getElementById('btn-manager-add').addEventListener('click', () => {
            document.getElementById('new-profile-modal').classList.remove('hidden');
        });

        // Dashboard Actions
        document.getElementById('btn-log-period').addEventListener('click', () => {
            if (AppState.isPeriodActive()) {
                this.showConfirm('End Period?', 'Are you sure your period has ended?', () => {
                    const today = new Date().toISOString().split('T')[0];
                    AppState.logPeriodEnd(today);
                    this.renderDashboard();
                });
            } else {
                this.showConfirm('Log Period Start?', 'Is today the first day of your period?', () => {
                    const today = new Date().toISOString().split('T')[0];
                    AppState.logPeriodStart(today);
                    this.renderDashboard();
                });
            }
        });

        // Partner Share
        document.getElementById('btn-partner-share').addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Cycle Update',
                    text: this.currentPartnerMsg
                }).catch(console.error);
            } else {
                // Fallback: Copy to clipboard
                navigator.clipboard.writeText(this.currentPartnerMsg).then(() => {
                    alert('Message copied to clipboard! Ready to paste to your partner.');
                });
            }
        });

        // Breathe Feature
        document.getElementById('btn-start-breathe').addEventListener('click', () => {
            this.BreatheController.start();
        });
        document.getElementById('btn-close-breathe').addEventListener('click', () => {
            this.BreatheController.stop();
        });

        // Retroactive
        document.getElementById('btn-retroactive').addEventListener('click', () => {
             document.getElementById('retroactive-modal').classList.remove('hidden');
        });
        document.getElementById('btn-retro-cancel').addEventListener('click', () => {
            document.getElementById('retroactive-modal').classList.add('hidden');
        });
        document.getElementById('btn-retro-save').addEventListener('click', () => {
            const date = document.getElementById('retro-date-picker').value;
            if(date) {
                AppState.logPeriodStart(date);
                document.getElementById('retroactive-modal').classList.add('hidden');
                this.renderDashboard();
            }
        });

        // Modal Confirm
        document.getElementById('btn-confirm-no').addEventListener('click', () => this.hideConfirm());

        // Calendar Nav
        document.getElementById('btn-prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });
        document.getElementById('btn-next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // --- SUB CONTROLLERS ---
        this.SettingsController.init();
        this.LogController.init();

        // Check Notifications
        this.checkNotifications();

        // Initial Render
        if (!AppState.getCurrentUser()) {
             this.renderProfileListOnboarding();
             Router.showScreen('view-onboarding');
        } else {
            Router.init();
        }
    },

    clearCreateForm() {
        document.getElementById('input-name').value = '';
        document.getElementById('input-last-date').value = '';
    },

    showConfirm(title, msg, onYes) {
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-msg').innerText = msg;
        const modal = document.getElementById('confirm-modal');
        modal.classList.remove('hidden');
        
        const yesBtn = document.getElementById('btn-confirm-yes');
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        
        newYesBtn.addEventListener('click', () => {
            onYes();
            this.hideConfirm();
        });
    },

    hideConfirm() {
        document.getElementById('confirm-modal').classList.add('hidden');
    },

    // --- RENDERERS ---

    renderProfileListOnboarding() {
        const container = document.getElementById('profile-list');
        container.innerHTML = '';
        AppState.data.users.forEach((user, index) => {
            const el = document.createElement('div');
            el.className = 'profile-item';
            el.innerHTML = `
                <div class="profile-avatar">${user.name.charAt(0)}</div>
                <span>${user.name}</span>
            `;
            el.onclick = () => {
                AppState.switchUser(index);
                window.location.hash = '#dashboard';
                Router.init(); // Re-init router logic
            };
            container.appendChild(el);
        });
    },

    renderProfileManager() {
        const container = document.getElementById('manager-profile-list');
        container.innerHTML = '';
        const currentIndex = AppState.data.currentUserIndex;

        AppState.data.users.forEach((user, index) => {
            const el = document.createElement('div');
            el.className = 'profile-item';
            if (index === currentIndex) el.classList.add('active-user');
            
            const avatar = `<div class="profile-avatar">${user.name.charAt(0)}</div>`;
            const name = `<span style="flex:1; text-align:left">${user.name}</span>`;
            const activeMark = index === currentIndex ? '<span class="material-icons-round" style="font-size:16px; margin-right:8px;">check_circle</span>' : '';
            const deleteBtn = `<button class="btn-delete-profile" title="Delete Profile"><span class="material-icons-round">delete</span></button>`;
            
            el.innerHTML = avatar + name + activeMark + deleteBtn;
            
            const btnDel = el.querySelector('.btn-delete-profile');
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation(); 
                this.showConfirm('Delete Profile?', `Delete ${user.name}? This cannot be undone.`, () => {
                    AppState.deleteUser(index);
                    if (AppState.data.users.length === 0) {
                        document.getElementById('profile-manager-modal').classList.add('hidden');
                        Router.showScreen('view-onboarding');
                        this.renderProfileListOnboarding();
                    } else {
                        // Refresh context
                        Router.handleRoute(); // Refresh current view or redirect
                        this.renderProfileManager();
                    }
                });
            });

            el.addEventListener('click', () => {
                if (index !== currentIndex) {
                    AppState.switchUser(index);
                    document.getElementById('profile-manager-modal').classList.add('hidden');
                    // Force dashboard view and refresh
                    window.location.hash = '#dashboard'; 
                    // If we are already on dashboard, hashchange won't fire, so force update:
                    Router.handleRoute();
                    // Also explicitly update the header name right now to be sure
                    const newUser = AppState.getCurrentUser();
                    if(newUser) document.getElementById('header-username').innerText = newUser.name;
                }
            });

            container.appendChild(el);
        });
    },

    renderDashboard() {
        const currentUser = AppState.getCurrentUser();
        if(currentUser) {
            document.getElementById('greeting-text').innerText = `Hello, ${currentUser.name}`;
            document.getElementById('header-username').innerText = currentUser.name;
        }

        const cycle = AppState.getLatestCycle();
        const avgLength = AppState.getAverageCycleLength();
        
        const circleGradient = document.getElementById('cycle-circle-gradient');
        const btn = document.getElementById('btn-log-period');
        const predText = document.getElementById('prediction-text');
        const statusBadge = document.getElementById('cycle-status-badge');

        if (!cycle) {
            document.getElementById('cycle-day-count').innerText = "Day ?";
            document.getElementById('cycle-phase-text').innerText = "No data yet";
            btn.innerText = "Log Period Start";
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
            circleGradient.style.background = `conic-gradient(#eee 0% 100%)`;
            return;
        }

        const startDate = new Date(cycle.startDate);
        const today = new Date();
        const diffTime = Math.abs(today - startDate);
        const dayInCycle = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        document.getElementById('cycle-day-count').innerText = `Day ${dayInCycle}`;
        
        let phase = "";
        let colorA = "#FF8DA1";
        
        if (AppState.isPeriodActive() || (dayInCycle <= DEFAULT_PERIOD_LENGTH && !cycle.endDate)) {
            phase = "Menstrual Phase";
            colorA = "#FF8DA1";
        } else if (dayInCycle < 12) {
            phase = "Follicular Phase";
            colorA = "#C8B6FF";
        } else if (dayInCycle >= 12 && dayInCycle <= 16) {
            phase = "Ovulation Phase";
            colorA = "#B8E0D2";
        } else {
            phase = "Luteal Phase";
            colorA = "#FFD166";
        }

        if (dayInCycle > avgLength + 5) {
            phase = "Late Phase";
            colorA = "#FF9F1C";
        }

        document.getElementById('cycle-phase-text').innerText = phase;
        
        // Emotional Logic (Affirmation & Partner)
        const affirmations = AffirmationLibrary[phase] || AffirmationLibrary['Menstrual Phase'];
        // Pick random
        const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
        document.getElementById('affirmation-text').innerText = randomAffirmation;
        
        this.currentPartnerMsg = PartnerMessages[phase] || PartnerMessages['Menstrual Phase'];

        if (AppState.isPeriodActive()) {
            btn.innerText = "Log Period End";
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        } else {
            btn.innerText = "Log Period Start";
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        }

        const percent = Math.min((dayInCycle / avgLength) * 100, 100);
        circleGradient.style.background = `conic-gradient(${colorA} 0% ${percent}%, #f0f0f0 ${percent}% 100%)`;

        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + avgLength);
        const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntil > 0) {
            predText.innerText = `Next period predicted in ${daysUntil} days.`;
            statusBadge.classList.add('hidden');
        } else if (daysUntil === 0) {
            predText.innerText = `Period expected today.`;
            statusBadge.className = 'status-badge badge-green';
            statusBadge.innerText = 'Expected Today';
            statusBadge.classList.remove('hidden');
        } else {
            const lateBy = Math.abs(daysUntil);
            predText.innerText = `Period was expected ${lateBy} days ago.`;
            statusBadge.className = 'status-badge badge-orange';
            statusBadge.innerText = `${lateBy} days late`;
            statusBadge.classList.remove('hidden');
        }
    },

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        const monthYear = document.getElementById('calendar-month-year');
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYear.innerText = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const d = document.createElement('div');
            d.className = 'calendar-day empty';
            grid.appendChild(d);
        }

        const cycles = AppState.getCycles();
        const avgLength = AppState.getAverageCycleLength();

        for (let i = 1; i <= daysInMonth; i++) {
            const cellDate = new Date(year, month, i);
            const dateStr = cellDate.toISOString().split('T')[0];
            const d = document.createElement('div');
            d.className = 'calendar-day';
            d.innerText = i;
            
            const today = new Date();
            if (cellDate.toDateString() === today.toDateString()) d.classList.add('today');

            // Period Logic
            cycles.forEach(c => {
                const start = new Date(c.startDate);
                let end = c.endDate ? new Date(c.endDate) : new Date(); 
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                cellDate.setHours(0,0,0,0);
                if (cellDate >= start && cellDate <= end) d.classList.add('is-period');
            });

            // Prediction Logic
            if (cellDate > today) {
                const latest = AppState.getLatestCycle();
                if (latest) {
                    const lastStart = new Date(latest.startDate);
                    const predictedStart = new Date(lastStart);
                    predictedStart.setDate(lastStart.getDate() + avgLength);
                    predictedStart.setHours(0,0,0,0);
                    if (cellDate.getTime() === predictedStart.getTime()) d.classList.add('is-predicted');
                    
                    const ovul = new Date(predictedStart);
                    ovul.setDate(predictedStart.getDate() - 14);
                    const fStart = new Date(ovul); fStart.setDate(ovul.getDate() - 2);
                    const fEnd = new Date(ovul); fEnd.setDate(ovul.getDate() + 2);
                    if (cellDate >= fStart && cellDate <= fEnd) d.classList.add('is-fertile');
                }
            }

            // Log Indicator
            if (AppState.getLog(dateStr)) {
                d.classList.add('has-log');
            }

            d.addEventListener('click', () => {
                // Future: Navigate to log for this date
            });

            grid.appendChild(d);
        }
    },

    renderAnalytics() {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        const cycles = AppState.getCycles();
        const avg = AppState.getAverageCycleLength();

        cycles.forEach((c, idx) => {
            let length = 0;
            let status = '';
            let statusClass = '';

            if (idx > 0) { // logic for previous cycle duration
                const nextCycleStart = new Date(cycles[idx-1].startDate);
                const currentCycleStart = new Date(c.startDate);
                length = Math.ceil((nextCycleStart - currentCycleStart) / (1000 * 60 * 60 * 24));
                const variance = length - avg;
                
                if (Math.abs(variance) <= 2) {
                    status = 'Regular'; statusClass = 'badge-green';
                } else {
                    status = (variance > 0 ? `+${variance}` : variance) + ' days';
                    statusClass = 'badge-orange';
                }
            } else {
                length = 'Current'; status = 'Active';
            }

            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div>
                    <div class="history-date">${new Date(c.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                    <small style="color:#888">${length === 'Current' ? 'Ongoing' : length + ' days'}</small>
                </div>
                ${status ? `<span class="history-badge ${statusClass}">${status}</span>` : ''}
            `;
            list.appendChild(item);
        });

        // Chart logic (existing)
        const chart = document.getElementById('trend-chart');
        chart.innerHTML = '';
        const chartData = [];
        for(let i = Math.min(cycles.length - 1, 6); i > 0; i--) {
            const nextCycleStart = new Date(cycles[i-1].startDate);
            const currentCycleStart = new Date(cycles[i].startDate);
            const diff = Math.ceil((nextCycleStart - currentCycleStart) / (1000 * 60 * 60 * 24));
            chartData.push({ len: diff, date: cycles[i].startDate });
        }

        if (chartData.length === 0) {
            chart.innerHTML = '<p style="width:100%; text-align:center; color:#ccc">Not enough data</p>';
            return;
        }
        
        const maxLen = Math.max(...chartData.map(d => d.len), 35);
        chartData.forEach(d => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = `${(d.len / maxLen) * 100}%`;
            const label = document.createElement('div');
            label.className = 'chart-label';
            const dateObj = new Date(d.date);
            label.innerText = `${dateObj.getMonth()+1}/${dateObj.getDate()}`;
            bar.appendChild(label);
            chart.appendChild(bar);
        });
    },

    checkNotifications() {
        if (!("Notification" in window)) return;
        const cycle = AppState.getLatestCycle();
        if (!cycle) return;
        
        const avgLength = AppState.getAverageCycleLength();
        const start = new Date(cycle.startDate);
        const next = new Date(start);
        next.setDate(start.getDate() + avgLength);
        const today = new Date();
        const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
        
        if (diff === 1 && Notification.permission === "granted") {
            new Notification("CycleSync", { body: "Your period is predicted to start tomorrow!" });
        }
    },

    // --- SUB-CONTROLLERS ---

    BreatheController: {
        timer: null,
        textEl: null,
        circleEl: null,
        
        start() {
            document.getElementById('breathe-modal').classList.remove('hidden');
            this.textEl = document.getElementById('breathe-instruction');
            this.circleEl = document.querySelector('.breathe-circle');
            
            this.circleEl.classList.add('breathe-anim');
            this.runCycle();
        },
        
        stop() {
            document.getElementById('breathe-modal').classList.add('hidden');
            if(this.timer) clearTimeout(this.timer);
            this.circleEl.classList.remove('breathe-anim');
        },
        
        runCycle() {
            // Match animation: 4s Inhale, 4s Hold, 4s Exhale, 4s Hold
            const step = () => {
                // Inhale
                this.textEl.innerText = "Inhale...";
                
                this.timer = setTimeout(() => {
                    // Hold
                    this.textEl.innerText = "Hold...";
                    
                    this.timer = setTimeout(() => {
                        // Exhale
                        this.textEl.innerText = "Exhale...";
                        
                        this.timer = setTimeout(() => {
                            // Hold
                             this.textEl.innerText = "Hold...";
                             
                             this.timer = setTimeout(() => {
                                 step(); // Loop
                             }, 4000);
                        }, 4000);
                    }, 4000);
                }, 4000);
            };
            step();
        }
    },

    LogController: {
        selectedMood: null,
        selectedFlow: null,
        selectedSymptoms: new Set(),
        
        init() {
            // Toggle Views
            document.getElementById('btn-show-log-form').addEventListener('click', () => {
                document.getElementById('log-form-container').classList.remove('hidden');
                document.getElementById('log-history-container').classList.add('hidden');
                document.getElementById('btn-show-log-form').classList.add('active');
                document.getElementById('btn-show-log-history').classList.remove('active');
            });
            
            document.getElementById('btn-show-log-history').addEventListener('click', () => {
                document.getElementById('log-form-container').classList.add('hidden');
                document.getElementById('log-history-container').classList.remove('hidden');
                document.getElementById('btn-show-log-form').classList.remove('active');
                document.getElementById('btn-show-log-history').classList.add('active');
                this.renderHistory();
            });

            // Mood
            document.querySelectorAll('#mood-selector button').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('#mood-selector button').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedMood = btn.dataset.mood;
                });
            });

            // Flow
            document.querySelectorAll('#flow-selector button').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('#flow-selector button').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedFlow = btn.dataset.flow;
                });
            });

            // Symptoms
            document.querySelectorAll('.tag').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sym = btn.dataset.symptom;
                    if (this.selectedSymptoms.has(sym)) {
                        this.selectedSymptoms.delete(sym);
                        btn.classList.remove('selected');
                    } else {
                        this.selectedSymptoms.add(sym);
                        btn.classList.add('selected');
                    }
                });
            });

            // Save
            document.getElementById('btn-save-log').addEventListener('click', () => {
                const today = new Date().toISOString().split('T')[0];
                const data = {
                    mood: this.selectedMood,
                    flow: this.selectedFlow,
                    symptoms: Array.from(this.selectedSymptoms)
                };
                AppState.saveDailyLog(today, data);
                // Return to dashboard
                window.location.hash = '#dashboard';
            });
        },

        initForm() {
            // Reset Toggle to Form
            document.getElementById('btn-show-log-form').click();

            // Reset or Load existing data for today
            const today = new Date().toISOString().split('T')[0];
            const data = AppState.getLog(today);
            
            // Reset UI
            document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
            this.selectedMood = null;
            this.selectedFlow = null;
            this.selectedSymptoms.clear();

            if (data) {
                // Pre-fill
                if(data.mood) {
                    const b = document.querySelector(`button[data-mood="${data.mood}"]`);
                    if(b) b.click();
                }
                if(data.flow) {
                    const b = document.querySelector(`button[data-flow="${data.flow}"]`);
                    if(b) b.click();
                }
                if(data.symptoms) {
                    data.symptoms.forEach(s => {
                         const b = document.querySelector(`button[data-symptom="${s}"]`);
                         if(b) b.click(); // trigger toggle logic
                    });
                }
            }
        },

        renderHistory() {
            const list = document.getElementById('log-history-list');
            list.innerHTML = '';
            const user = AppState.getCurrentUser();
            if(!user || !user.logs || Object.keys(user.logs).length === 0) {
                list.innerHTML = '<p style="text-align:center; color:#999; padding:2rem;">No logs yet. Start tracking today!</p>';
                return;
            }

            // Convert logs object to array and sort descending
            const logsArr = Object.entries(user.logs)
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            const moodMap = {
                'happy': '😊', 'calm': '😌', 'sad': '😢', 'tired': '😴', 'angry': '😡'
            };

            logsArr.forEach(log => {
                const dateObj = new Date(log.date);
                const displayDate = dateObj.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
                const moodIcon = moodMap[log.mood] || '😐';
                const flowText = log.flow ? `Flow: ${log.flow}` : '';
                
                let tagsHtml = '';
                if(log.symptoms && log.symptoms.length > 0) {
                    tagsHtml = log.symptoms.map(s => `<span class="mini-tag">${s}</span>`).join('');
                }

                const item = document.createElement('div');
                item.className = 'log-history-item';
                item.innerHTML = `
                    <div class="log-history-mood">${moodIcon}</div>
                    <div class="log-history-details">
                        <div class="log-history-date">${displayDate}</div>
                        <div class="log-history-meta">${flowText}</div>
                        <div class="log-history-symptoms">${tagsHtml}</div>
                    </div>
                `;
                list.appendChild(item);
            });
        }
    },

    SettingsController: {
        init() {
            // Export
            document.getElementById('btn-export-data').addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState.data));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "cyclesync_backup.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            });

            // Import
            document.getElementById('file-import').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    const success = AppState.importData(e.target.result);
                    if(success) {
                        alert("Data restored successfully!");
                        window.location.reload();
                    } else {
                        alert("Invalid file format.");
                    }
                };
                reader.readAsText(file);
            });

            // Notifications
            document.getElementById('btn-enable-notifs').addEventListener('click', () => {
                Notification.requestPermission().then(perm => {
                    if(perm === 'granted') alert("Notifications enabled!");
                });
            });
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    UI.init();

    // Register Service Worker for PWA / Offline Support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('CycleSync: Offline Service Worker Active'))
            .catch(err => console.error('Service Worker Error', err));
    }
});