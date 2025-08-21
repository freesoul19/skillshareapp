// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqyyOV7fXnfEZBNRChGWlU8XVCBn7Zy40",
    authDomain: "skillshare-746fb.firebaseapp.com",
    projectId: "skillshare-746fb",
    storageBucket: "skillshare-746fb.firebasestorage.app",
    messagingSenderId: "571656018320",
    appId: "1:571656018320:web:8f6bdb99bf4f10e11e7b15",
    measurementId: "G-NJRSQ0FCM1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// App configuration constants
const APP_ID = 'skillshare-app'; // Used in Firestore paths

// Firestore paths
const PATHS = {
    userProfiles: (userId) => `artifacts/${APP_ID}/users/${userId}/profiles/${userId}`,
    publicSkills: (skillId) => `artifacts/${APP_ID}/public/data/skills/${skillId}`,
    publicSessions: (sessionId) => `artifacts/${APP_ID}/public/data/sessions/${sessionId}`
};

// Export for use in other files
window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.APP_ID = APP_ID;
window.PATHS = PATHS;
