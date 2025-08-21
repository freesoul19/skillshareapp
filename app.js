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
    e.preventDefault();
    if (!currentUser || !currentUserProfile) return;

    const skillData = {
        name: document.getElementById('skill-name').value,
        description: document.getElementById('skill-description').value,
        paymentType: document.getElementById('skill-payment-type').value,
        paymentAmount: document.getElementById('skill-payment-amount').value || 0,
        sessionType: document.getElementById('skill-session-type').value,
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    showLoading(true);
    try {
        const docRef = db.collection(`artifacts/${APP_ID}/public/data/skills`);
        await docRef.add(skillData);
        showToast('Skill added successfully!', 'success');
        closeModal();
        document.getElementById('add-skill-form').reset();
        loadMySkills();
        loadAllSkills();
    } catch (error) {
        showToast(error.message, 'error');
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
    loadAllSkills();
    loadSessions('requested');
    updateWalletDisplay();
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
