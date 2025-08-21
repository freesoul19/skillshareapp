// Global variables
let currentUser = null;
let currentUserProfile = null;
let allSkills = [];
let userSessions = [];

// DOM Elements
const authSection = document.getElementById('auth-section');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loading = document.getElementById('loading');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded!');
        alert('Error: Firebase not loaded. Please check your internet connection and try again.');
        return;
    }
    
    console.log('Firebase loaded:', firebase);
    console.log('Firebase auth:', auth);
    console.log('Firebase firestore:', db);
    console.log('APP_ID:', APP_ID);
    console.log('PATHS:', PATHS);
    
    setupEventListeners();
    setupAuthStateListener();
    setupNavigation();
});

// Setup authentication state listener
function setupAuthStateListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProfile();
            showMainApp();
            loadDashboardData();
        } else {
            currentUser = null;
            currentUserProfile = null;
            showAuthSection();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Authentication forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    document.getElementById('show-signup').addEventListener('click', showSignupForm);
    document.getElementById('show-login').addEventListener('click', showLoginForm);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Profile form
    document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);

    // Skills management
    document.getElementById('add-skill-btn').addEventListener('click', showAddSkillModal);
    document.getElementById('add-skill-form').addEventListener('submit', handleAddSkill);
    document.getElementById('skill-payment-type').addEventListener('change', togglePaymentAmount);

    // Session request
    document.getElementById('session-request-form').addEventListener('submit', handleSessionRequest);

    // Filters
    document.getElementById('payment-filter').addEventListener('change', filterSkills);
    document.getElementById('session-filter').addEventListener('change', filterSkills);

    // Session tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadSessions(e.target.dataset.tab);
        });
    });

    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(close => {
        close.addEventListener('click', closeModal);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
}

// Setup navigation
function setupNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.target.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const sectionId = e.target.getAttribute('href').substring(1);
                if (sectionId && sectionId !== '#') {
                    showSection(sectionId);
                    // Close mobile menu
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            }
        });
    });
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    showLoading(true);
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Login successful!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
    showLoading(false);
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const rollno = document.getElementById('signup-rollno').value;
    const department = document.getElementById('signup-department').value;
    const course = document.getElementById('signup-course').value;
    const year = document.getElementById('signup-year').value;

    showLoading(true);
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Create user profile
        const profileData = {
            name: name,
            email: email,
            rollno: rollno,
            department: department,
            course: course,
            year: year,
            credits: 100, // Starting credits
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.doc(PATHS.userProfiles(user.uid)).set(profileData);
        showToast('Account created successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
    showLoading(false);
}

async function handleLogout() {
    try {
        await auth.signOut();
        showToast('Logged out successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Profile management
async function loadUserProfile() {
    if (!currentUser) return;

    try {
        const doc = await db.doc(PATHS.userProfiles(currentUser.uid)).get();
        if (doc.exists) {
            currentUserProfile = doc.data();
            populateProfileForm();
            updateWalletDisplay();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) return;

    const updatedProfile = {
        name: document.getElementById('profile-name').value,
        rollno: document.getElementById('profile-rollno').value,
        department: document.getElementById('profile-department').value,
        course: document.getElementById('profile-course').value,
        year: document.getElementById('profile-year').value
    };

    showLoading(true);
    try {
        await db.doc(PATHS.userProfiles(currentUser.uid)).update(updatedProfile);
        currentUserProfile = { ...currentUserProfile, ...updatedProfile };
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
    showLoading(false);
}

function populateProfileForm() {
    if (!currentUserProfile) return;

    document.getElementById('profile-name').value = currentUserProfile.name || '';
    document.getElementById('profile-email').value = currentUserProfile.email || '';
    document.getElementById('profile-rollno').value = currentUserProfile.rollno || '';
    document.getElementById('profile-department').value = currentUserProfile.department || '';
    document.getElementById('profile-course').value = currentUserProfile.course || '';
    document.getElementById('profile-year').value = currentUserProfile.year || '';
}

// Skills management
async function handleAddSkill(e) {
    console.log('handleAddSkill called', e);
    e.preventDefault();
    
    // Debug logging
    console.log('Current user:', currentUser);
    console.log('Current user profile:', currentUserProfile);
    console.log('Firebase auth:', auth);
    console.log('Firestore db:', db);
    console.log('APP_ID:', APP_ID);
    
    if (!currentUser) {
        showToast('Please log in to add a skill', 'error');
        console.error('No current user');
        return;
    }
    
    if (!currentUserProfile) {
        showToast('Please complete your profile first', 'error');
        console.error('No user profile');
        return;
    }

    // Validate form data
    const skillName = document.getElementById('skill-name').value.trim();
    const skillDescription = document.getElementById('skill-description').value.trim();
    const paymentType = document.getElementById('skill-payment-type').value;
    const paymentAmount = document.getElementById('skill-payment-amount').value || 0;
    const sessionType = document.getElementById('skill-session-type').value;
    
    console.log('Form data:', { skillName, skillDescription, paymentType, paymentAmount, sessionType });
    
    if (!skillName) {
        showToast('Please enter a skill name', 'error');
        return;
    }
    
    if (!skillDescription) {
        showToast('Please enter a skill description', 'error');
        return;
    }
    
    if (!paymentType) {
        showToast('Please select a payment type', 'error');
        return;
    }
    
    if (!sessionType) {
        showToast('Please select a session type', 'error');
        return;
    }
    
    if (paymentType === 'credits' && (!paymentAmount || paymentAmount <= 0)) {
        showToast('Please enter a valid payment amount', 'error');
        return;
    }

    const skillData = {
        name: skillName,
        description: skillDescription,
        paymentType: paymentType,
        paymentAmount: parseInt(paymentAmount) || 0,
        sessionType: sessionType,
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('Skill data to save:', skillData);

    showLoading(true);
    try {
        console.log('Attempting to save to Firebase...');
        const docRef = db.collection(`artifacts/${APP_ID}/public/data/skills`);
        console.log('Collection reference:', docRef);
        
        const result = await docRef.add(skillData);
        console.log('Skill saved successfully with ID:', result.id);
        
        showToast('Skill added successfully!', 'success');
        closeModal();
        document.getElementById('add-skill-form').reset();
        loadMySkills();
        loadAllSkills();
    } catch (error) {
        console.error('Error adding skill:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        showToast(`Error: ${error.message}`, 'error');
    }
    showLoading(false);
}

async function loadMySkills() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection(`artifacts/${APP_ID}/public/data/skills`)
            .where('teacherId', '==', currentUser.uid)
            .get();

        const mySkillsList = document.getElementById('my-skills-list');
        mySkillsList.innerHTML = '';

        if (snapshot.empty) {
            mySkillsList.innerHTML = '<p class="no-data">No skills added yet. Add your first skill!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const skill = { id: doc.id, ...doc.data() };
            const skillElement = createSkillCard(skill, true);
            mySkillsList.appendChild(skillElement);
        });
    } catch (error) {
        console.error('Error loading my skills:', error);
    }
}

async function loadAllSkills() {
    try {
        const snapshot = await db.collection(`artifacts/${APP_ID}/public/data/skills`).get();
        allSkills = [];

        snapshot.forEach(doc => {
            const skill = { id: doc.id, ...doc.data() };
            if (skill.teacherId !== currentUser?.uid) {
                allSkills.push(skill);
            }
        });

        displaySkills(allSkills);
        updateSkillsCount();
    } catch (error) {
        console.error('Error loading skills:', error);
    }
}

function displaySkills(skills) {
    const skillsList = document.getElementById('skills-list');
    skillsList.innerHTML = '';

    if (skills.length === 0) {
        skillsList.innerHTML = '<p class="no-data">No skills available.</p>';
        return;
    }

    skills.forEach(skill => {
        const skillElement = createSkillCard(skill, false);
        skillsList.appendChild(skillElement);
    });
}

function createSkillCard(skill, isOwned = false) {
    const div = document.createElement('div');
    div.className = 'skill-card';
    
    const paymentText = skill.paymentType === 'credits' 
        ? `${skill.paymentAmount} Credits`
        : 'Favor Exchange';

    div.innerHTML = `
        <div class="skill-header">
            <h3>${skill.name}</h3>
            <span class="skill-type ${skill.sessionType}">${skill.sessionType}</span>
        </div>
        <p class="skill-description">${skill.description}</p>
        <div class="skill-footer">
            <span class="skill-payment ${skill.paymentType}">${paymentText}</span>
            <span class="skill-teacher">by ${skill.teacherEmail}</span>
        </div>
        ${!isOwned ? `<button class="btn btn-primary request-btn" onclick="showSessionRequestModal('${skill.id}')">Request Session</button>` : ''}
        ${isOwned ? `<button class="btn btn-danger delete-btn" onclick="deleteSkill('${skill.id}')">Delete</button>` : ''}
    `;

    return div;
}

async function deleteSkill(skillId) {
    if (!confirm('Are you sure you want to delete this skill?')) return;

    showLoading(true);
    try {
        await db.doc(`artifacts/${APP_ID}/public/data/skills/${skillId}`).delete();
        showToast('Skill deleted successfully!', 'success');
        loadMySkills();
        loadAllSkills();
    } catch (error) {
        showToast(error.message, 'error');
    }
    showLoading(false);
}

// Session management
function showSessionRequestModal(skillId) {
    const skill = allSkills.find(s => s.id === skillId);
    if (!skill) return;

    const modal = document.getElementById('session-request-modal');
    const skillInfo = document.getElementById('skill-info');
    
    const paymentText = skill.paymentType === 'credits' 
        ? `${skill.paymentAmount} Credits`
        : 'Favor Exchange';

    skillInfo.innerHTML = `
        <div class="skill-info-display">
            <h3>${skill.name}</h3>
            <p>${skill.description}</p>
            <p><strong>Teacher:</strong> ${skill.teacherEmail}</p>
            <p><strong>Payment:</strong> ${paymentText}</p>
            <p><strong>Session Type:</strong> ${skill.sessionType}</p>
        </div>
    `;

    // Store skill data for form submission
    document.getElementById('session-request-form').dataset.skillId = skillId;
    modal.style.display = 'block';
}

async function handleSessionRequest(e) {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) return;

    const skillId = e.target.dataset.skillId;
    const skill = allSkills.find(s => s.id === skillId);
    if (!skill) return;

    // Check if user has enough credits
    if (skill.paymentType === 'credits' && currentUserProfile.credits < skill.paymentAmount) {
        showToast('Insufficient credits!', 'error');
        return;
    }

    const sessionData = {
        skillId: skillId,
        skillName: skill.name,
        teacherId: skill.teacherId,
        teacherEmail: skill.teacherEmail,
        learnerId: currentUser.uid,
        learnerEmail: currentUser.email,
        paymentType: skill.paymentType,
        paymentAmount: skill.paymentAmount,
        status: 'pending',
        requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
        preferredDate1: document.getElementById('preferred-date1').value,
        preferredTime1: document.getElementById('preferred-time1').value,
        preferredDate2: document.getElementById('preferred-date2').value || null,
        preferredTime2: document.getElementById('preferred-time2').value || null,
        preferredDate3: document.getElementById('preferred-date3').value || null,
        preferredTime3: document.getElementById('preferred-time3').value || null
    };

    showLoading(true);
    try {
        const docRef = db.collection(`artifacts/${APP_ID}/public/data/sessions`);
        await docRef.add(sessionData);
        showToast('Session requested successfully!', 'success');
        closeModal();
        document.getElementById('session-request-form').reset();
        loadSessions('requested');
    } catch (error) {
        showToast(error.message, 'error');
    }
    showLoading(false);
}

async function loadSessions(type = 'requested') {
    if (!currentUser) return;

    const sessionsQuery = type === 'requested'
        ? db.collection(`artifacts/${APP_ID}/public/data/sessions`).where('learnerId', '==', currentUser.uid)
        : db.collection(`artifacts/${APP_ID}/public/data/sessions`).where('teacherId', '==', currentUser.uid);

    try {
        const snapshot = await sessionsQuery.get();
        userSessions = [];

        snapshot.forEach(doc => {
            userSessions.push({ id: doc.id, ...doc.data() });
        });

        displaySessions(userSessions, type);
        updateActiveSessionsCount();
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function displaySessions(sessions, type) {
    const sessionsList = document.getElementById('sessions-list');
    sessionsList.innerHTML = '';

    if (sessions.length === 0) {
        sessionsList.innerHTML = `<p class="no-data">No ${type} sessions yet.</p>`;
        return;
    }

    sessions.forEach(session => {
        const sessionElement = createSessionCard(session, type);
        sessionsList.appendChild(sessionElement);
    });
}

function createSessionCard(session, type) {
    const div = document.createElement('div');
    div.className = `session-card ${session.status}`;
    
    const isTeacher = type === 'teaching';
    const otherUser = isTeacher ? session.learnerEmail : session.teacherEmail;
    const role = isTeacher ? 'Learner' : 'Teacher';

    const paymentText = session.paymentType === 'credits' 
        ? `${session.paymentAmount} Credits`
        : 'Favor Exchange';

    const statusActions = isTeacher && session.status === 'pending' 
        ? `
            <div class="session-actions">
                <button class="btn btn-success" onclick="updateSessionStatus('${session.id}', 'approved')">Approve</button>
                <button class="btn btn-danger" onclick="updateSessionStatus('${session.id}', 'rejected')">Reject</button>
            </div>
        `
        : '';

    div.innerHTML = `
        <div class="session-header">
            <h3>${session.skillName}</h3>
            <span class="session-status ${session.status}">${session.status}</span>
        </div>
        <p><strong>${role}:</strong> ${otherUser}</p>
        <p><strong>Payment:</strong> ${paymentText}</p>
        <div class="preferred-times">
            <p><strong>Preferred Times:</strong></p>
            <ul>
                <li>${session.preferredDate1} at ${session.preferredTime1}</li>
                ${session.preferredDate2 ? `<li>${session.preferredDate2} at ${session.preferredTime2}</li>` : ''}
                ${session.preferredDate3 ? `<li>${session.preferredDate3} at ${session.preferredTime3}</li>` : ''}
            </ul>
        </div>
        ${session.scheduledDateTime ? `<p><strong>Scheduled:</strong> ${new Date(session.scheduledDateTime.seconds * 1000).toLocaleString()}</p>` : ''}
        ${statusActions}
    `;

    return div;
}

async function updateSessionStatus(sessionId, status) {
    showLoading(true);
    try {
        const updateData = { status: status };
        
        if (status === 'approved') {
            updateData.scheduledDateTime = firebase.firestore.FieldValue.serverTimestamp();
            
            // Handle payment if credits
            const sessionDoc = await db.doc(`artifacts/${APP_ID}/public/data/sessions/${sessionId}`).get();
            if (sessionDoc.exists) {
                const session = sessionDoc.data();
                if (session.paymentType === 'credits') {
                    // Deduct credits from learner and add to teacher
                    const batch = db.batch();
                    
                    const learnerRef = db.doc(PATHS.userProfiles(session.learnerId));
                    const teacherRef = db.doc(PATHS.userProfiles(session.teacherId));
                    
                    batch.update(learnerRef, {
                        credits: firebase.firestore.FieldValue.increment(-session.paymentAmount)
                    });
                    
                    batch.update(teacherRef, {
                        credits: firebase.firestore.FieldValue.increment(session.paymentAmount)
                    });
                    
                    await batch.commit();
                }
            }
        }
        
        await db.doc(`artifacts/${APP_ID}/public/data/sessions/${sessionId}`).update(updateData);
        showToast(`Session ${status}!`, 'success');
        loadSessions('teaching');
        
        // Refresh user profile to update credits
        if (status === 'approved') {
            await loadUserProfile();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
    showLoading(false);
}

// Filter functions
function filterSkills() {
    const paymentFilter = document.getElementById('payment-filter').value;
    const sessionFilter = document.getElementById('session-filter').value;

    let filteredSkills = allSkills;

    if (paymentFilter) {
        filteredSkills = filteredSkills.filter(skill => skill.paymentType === paymentFilter);
    }

    if (sessionFilter) {
        filteredSkills = filteredSkills.filter(skill => skill.sessionType === sessionFilter);
    }

    displaySkills(filteredSkills);
}

// Wallet functions
function updateWalletDisplay() {
    if (!currentUserProfile) return;

    document.getElementById('wallet-credits').textContent = currentUserProfile.credits || 0;
    document.getElementById('user-credits').textContent = currentUserProfile.credits || 0;
}

// UI helper functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');

        // Load data based on section
        switch (sectionId) {
            case 'skills':
                loadAllSkills();
                break;
            case 'my-skills':
                loadMySkills();
                break;
            case 'sessions':
                loadSessions('requested');
                break;
            case 'wallet':
                updateWalletDisplay();
                break;
            case 'profile':
                populateProfileForm();
                break;
        }
    }
}

function showAuthSection() {
    authSection.style.display = 'flex';
    mainApp.style.display = 'none';
}

function showMainApp() {
    authSection.style.display = 'none';
    mainApp.style.display = 'block';
}

function showSignupForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
}

function showLoginForm() {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
}

function showAddSkillModal() {
    document.getElementById('add-skill-modal').style.display = 'block';
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function togglePaymentAmount() {
    const paymentType = document.getElementById('skill-payment-type').value;
    const paymentAmountGroup = document.getElementById('payment-amount-group');
    
    if (paymentType === 'credits') {
        paymentAmountGroup.style.display = 'block';
        document.getElementById('skill-payment-amount').required = true;
    } else {
        paymentAmountGroup.style.display = 'none';
        document.getElementById('skill-payment-amount').required = false;
    }
}

function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

// Dashboard data functions
async function loadDashboardData() {
    await Promise.all([
        loadAllSkills(),
        loadSessions('requested'),
        loadMySkills()
    ]);
    updateWalletDisplay();
    updateWelcomeMessage();
    loadDashboardSkills();
    loadDashboardSessions();
    loadDashboardMySkills();
    loadActivityFeed();
    
    // Setup search functionality
    setupDashboardSearch();
}

function updateSkillsCount() {
    document.getElementById('total-skills').textContent = allSkills.length;
}

function updateActiveSessionsCount() {
    const activeSessions = userSessions.filter(session => 
        session.status === 'approved' || session.status === 'pending'
    ).length;
    document.getElementById('active-sessions').textContent = activeSessions;
}

function updateWelcomeMessage() {
    if (currentUserProfile && currentUserProfile.name) {
        document.getElementById('welcome-message').textContent = `Welcome back, ${currentUserProfile.name.split(' ')[0]}!`;
    }
    
    if (currentUserProfile && currentUserProfile.credits !== undefined) {
        document.getElementById('header-credits').textContent = currentUserProfile.credits;
    }
}

function loadDashboardSkills() {
    const dashboardSkills = document.getElementById('dashboard-skills');
    dashboardSkills.innerHTML = '';
    
    if (allSkills.length === 0) {
        dashboardSkills.innerHTML = '<div class="no-data">No skills available at the moment.</div>';
        return;
    }
    
    // Show first 6 skills
    const skillsToShow = allSkills.slice(0, 6);
    
    skillsToShow.forEach(skill => {
        const skillElement = createDashboardSkillCard(skill);
        dashboardSkills.appendChild(skillElement);
    });
}

function createDashboardSkillCard(skill) {
    const div = document.createElement('div');
    div.className = 'dashboard-skill-card';
    div.onclick = () => showSessionRequestModal(skill.id);
    
    const paymentText = skill.paymentType === 'credits' 
        ? `${skill.paymentAmount} Credits`
        : 'Favor';
    
    div.innerHTML = `
        <h4>${skill.name}</h4>
        <p>${skill.description.length > 100 ? skill.description.substring(0, 100) + '...' : skill.description}</p>
        <div class="skill-meta">
            <span class="skill-payment-small">${paymentText}</span>
            <span class="skill-teacher-small">${skill.teacherEmail}</span>
        </div>
    `;
    
    return div;
}

function loadDashboardSessions() {
    const dashboardSessions = document.getElementById('dashboard-sessions');
    dashboardSessions.innerHTML = '';
    
    if (userSessions.length === 0) {
        dashboardSessions.innerHTML = '<div class="no-data">No sessions yet. Request a session to get started!</div>';
        return;
    }
    
    // Show first 5 sessions
    const sessionsToShow = userSessions.slice(0, 5);
    
    sessionsToShow.forEach(session => {
        const sessionElement = createDashboardSessionCard(session);
        dashboardSessions.appendChild(sessionElement);
    });
}

function createDashboardSessionCard(session) {
    const div = document.createElement('div');
    div.className = `dashboard-session-card ${session.status}`;
    
    div.innerHTML = `
        <div class="session-title">${session.skillName}</div>
        <div class="session-meta">
            <span>with ${session.teacherEmail}</span>
            <span class="session-status-small ${session.status}">${session.status}</span>
        </div>
    `;
    
    return div;
}

function loadDashboardMySkills() {
    const dashboardMySkills = document.getElementById('dashboard-my-skills');
    
    // We'll populate this after loadMySkills completes
    setTimeout(() => {
        dashboardMySkills.innerHTML = '';
        
        // Get my skills from the DOM (already loaded)
        const mySkillsList = document.getElementById('my-skills-list');
        const mySkillsCards = mySkillsList.querySelectorAll('.skill-card');
        
        if (mySkillsCards.length === 0) {
            dashboardMySkills.innerHTML = '<div class="no-data">No skills added yet. Share your expertise!</div>';
            return;
        }
        
        // Show first 4 skills
        Array.from(mySkillsCards).slice(0, 4).forEach(skillCard => {
            const skill = extractSkillDataFromCard(skillCard);
            const skillElement = createDashboardSkillCard(skill, true);
            dashboardMySkills.appendChild(skillElement);
        });
        
        // Update my skills count
        document.getElementById('my-skills-count').textContent = mySkillsCards.length;
    }, 1000);
}

function extractSkillDataFromCard(skillCard) {
    const name = skillCard.querySelector('h3').textContent;
    const description = skillCard.querySelector('.skill-description').textContent;
    const paymentSpan = skillCard.querySelector('.skill-payment');
    const teacherSpan = skillCard.querySelector('.skill-teacher');
    
    return {
        name: name,
        description: description,
        paymentType: paymentSpan.classList.contains('credits') ? 'credits' : 'favor',
        paymentAmount: paymentSpan.classList.contains('credits') ? 
            parseInt(paymentSpan.textContent.match(/\d+/)[0]) : 0,
        teacherEmail: teacherSpan.textContent.replace('by ', '')
    };
}

function loadActivityFeed() {
    const activityFeed = document.getElementById('activity-feed');
    const activities = [];
    
    // Generate some sample activities based on user data
    if (allSkills.length > 0) {
        activities.push({
            icon: '🎓',
            text: `${allSkills.length} new skills available to learn`,
            time: '2 hours ago'
        });
    }
    
    if (userSessions.length > 0) {
        const pendingSessions = userSessions.filter(s => s.status === 'pending').length;
        if (pendingSessions > 0) {
            activities.push({
                icon: '⏳',
                text: `${pendingSessions} session request${pendingSessions > 1 ? 's' : ''} pending approval`,
                time: '1 day ago'
            });
        }
        
        const approvedSessions = userSessions.filter(s => s.status === 'approved').length;
        if (approvedSessions > 0) {
            activities.push({
                icon: '✅',
                text: `${approvedSessions} session${approvedSessions > 1 ? 's' : ''} scheduled`,
                time: '2 days ago'
            });
        }
    }
    
    if (currentUserProfile && currentUserProfile.credits) {
        activities.push({
            icon: '💰',
            text: `You have ${currentUserProfile.credits} credits available`,
            time: '1 week ago'
        });
    }
    
    activities.push({
        icon: '🎉',
        text: 'Welcome to SkillShare! Start by adding your first skill.',
        time: 'When you joined'
    });
    
    activityFeed.innerHTML = '';
    
    if (activities.length === 0) {
        activityFeed.innerHTML = '<div class="no-activity">No recent activity</div>';
        return;
    }
    
    activities.slice(0, 8).forEach(activity => {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        
        activityElement.innerHTML = `
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `;
        
        activityFeed.appendChild(activityElement);
    });
}

function setupDashboardSearch() {
    const searchInput = document.getElementById('dashboard-search');
    const paymentFilter = document.getElementById('dashboard-payment-filter');
    const sessionFilter = document.getElementById('dashboard-session-filter');
    
    // Add event listeners for real-time search
    searchInput.addEventListener('input', performDashboardSearch);
    paymentFilter.addEventListener('change', performDashboardSearch);
    sessionFilter.addEventListener('change', performDashboardSearch);
}

function performDashboardSearch() {
    const searchTerm = document.getElementById('dashboard-search').value.toLowerCase();
    const paymentFilter = document.getElementById('dashboard-payment-filter').value;
    const sessionFilter = document.getElementById('dashboard-session-filter').value;
    const searchResults = document.getElementById('search-results');
    
    if (!searchTerm && !paymentFilter && !sessionFilter) {
        searchResults.innerHTML = '';
        return;
    }
    
    let filteredSkills = allSkills;
    
    // Filter by search term
    if (searchTerm) {
        filteredSkills = filteredSkills.filter(skill => 
            skill.name.toLowerCase().includes(searchTerm) ||
            skill.description.toLowerCase().includes(searchTerm) ||
            skill.teacherEmail.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by payment type
    if (paymentFilter) {
        filteredSkills = filteredSkills.filter(skill => skill.paymentType === paymentFilter);
    }
    
    // Filter by session type
    if (sessionFilter) {
        filteredSkills = filteredSkills.filter(skill => skill.sessionType === sessionFilter);
    }
    
    searchResults.innerHTML = '';
    
    if (filteredSkills.length === 0) {
        searchResults.innerHTML = '<div class="no-data">No skills found matching your search criteria.</div>';
        return;
    }
    
    // Show up to 6 results
    filteredSkills.slice(0, 6).forEach(skill => {
        const skillElement = createDashboardSkillCard(skill);
        searchResults.appendChild(skillElement);
    });
    
    if (filteredSkills.length > 6) {
        const moreResults = document.createElement('div');
        moreResults.className = 'no-data';
        moreResults.innerHTML = `<p>+${filteredSkills.length - 6} more results. <a href="#" onclick="showSection('skills')">View all skills</a></p>`;
        searchResults.appendChild(moreResults);
    }
}
