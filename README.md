# SkillShare - Learn & Teach Skills Platform

A comprehensive skill-sharing application built with vanilla JavaScript and Firebase, allowing users to offer and request skills from peers with a credit-based payment system and favor exchanges.

## Features

### ✨ Key Features

- **User Authentication**: Secure Firebase Authentication with email/password
- **Profile Management**: Complete user profiles with academic information
- **Skills Management**: Add, view, edit, and delete skills with payment options
- **Session Booking**: Request and manage learning sessions
- **Wallet System**: Credit-based payment system with transaction tracking
- **Responsive Design**: Mobile-first, fully responsive interface

### 🔧 Technical Features

- **Firebase Integration**: Real-time database with Firestore
- **Security Rules**: Comprehensive Firestore security rules
- **Real-time Updates**: Live data synchronization
- **Modern UI**: Clean, professional design with smooth animations
- **Mobile Responsive**: Optimized for all device sizes

## Project Structure

```
skillshare-app/
├── index.html          # Main application HTML
├── styles.css          # Comprehensive CSS styles
├── app.js              # Main application logic
├── firebase-config.js  # Firebase configuration
└── README.md          # Project documentation
```

## Firebase Configuration

### Required Firebase Services

1. **Authentication**: Email/password authentication
2. **Firestore Database**: Real-time document database
3. **Security Rules**: Custom rules for data protection

### Firebase Security Rules

Apply these security rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User Profiles: Private data for authenticated users
    // Path: artifacts/{appId}/users/{userId}/profiles/{profileId}
    match /artifacts/{appId}/users/{userId}/profiles/{profileId} {
      // Allow authenticated user to read their own profile
      allow read: if request.auth != null && request.auth.uid == userId && profileId == userId;

      // Allow authenticated user to create their own profile
      // Ensure basic fields are present on initial creation
      allow create: if request.auth != null && request.auth.uid == userId && profileId == userId
                      && request.resource.data.keys().hasAll(['name', 'email', 'createdAt', 'credits', 'rollno', 'department', 'course', 'year']);

      // Allow authenticated user to update their own profile
      // This rule is designed to be very permissive for updates by the owner.
      // It allows any update as long as the user is authenticated and owns the profile.
      // It explicitly checks that immutable fields (email, createdAt) are not changed
      // and credits only increase or stay the same.
      // This should cover all partial updates including adding new fields.
      allow update: if request.auth != null && request.auth.uid == userId && profileId == userId
                      // Ensure email is not changed if it exists in the request
                      && (request.resource.data.email == null || request.resource.data.email == resource.data.email)
                      // Ensure createdAt is not changed if it exists in the request
                      && (request.resource.data.createdAt == null || request.resource.data.createdAt == resource.data.createdAt)
                      // Ensure credits only increase or stay the same
                      && (request.resource.data.credits == null || request.resource.data.credits >= resource.data.credits);
    }

    // Public Skills: Accessible to all authenticated users
    // Path: artifacts/{appId}/public/data/skills/{skillId}
    match /artifacts/{appId}/public/data/skills/{skillId} {
      // Anyone logged in can read all public skills
      allow read: if request.auth != null;
      // Anyone logged in can create a new public skill listing
      allow create: if request.auth != null
                      && request.resource.data.keys().hasAll(['name', 'description', 'paymentType', 'paymentAmount', 'teacherId', 'teacherEmail', 'createdAt', 'sessionType'])
                      && request.resource.data.teacherId == request.auth.uid; // Ensure teacherId matches authenticated user
      // Only the teacher (owner) can update or delete their own skill listing
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.teacherId;
    }

    // Public Sessions: Accessible by involved parties (teacher and learner)
    // Path: artifacts/{appId}/public/data/sessions/{sessionId}
    match /artifacts/{appId}/public/data/sessions/{sessionId} {
      // Anyone logged in can create a new session request
      allow create: if request.auth != null
                      && request.resource.data.keys().hasAll(['skillId', 'skillName', 'teacherId', 'teacherEmail', 'learnerId', 'learnerEmail', 'paymentType', 'paymentAmount', 'status', 'requestedAt', 'preferredDate1', 'preferredTime1'])
                      && request.resource.data.learnerId == request.auth.uid; // Ensure learnerId matches authenticated user
      // Only the teacher or learner can read their respective sessions
      allow read: if request.auth != null && (request.auth.uid == resource.data.teacherId || request.auth.uid == resource.data.learnerId);
      // Only the teacher can update the session status and scheduled time
      allow update: if request.auth != null && request.auth.uid == resource.data.teacherId
                      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'scheduledDateTime']);
      // Deny delete for simplicity
      allow delete: if false;
    }

    // Deny all other access by default to prevent unintended data exposure
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Application Features

### 🏠 Home Page
- Dashboard with statistics
- Quick overview of available skills
- Active sessions count
- User credits display

### 👤 User Authentication
- **Sign Up**: Complete registration with academic details
  - Full name, email, password
  - Roll number, department, course, year
  - Automatic 100 starting credits
- **Login**: Secure email/password authentication
- **Profile Management**: Edit personal and academic information

### 🎓 Skills Management
- **Add Skills**: Create skill listings with:
  - Skill name and description
  - Payment type (Credits or Favor)
  - Session type (Online or Offline)
  - Credit amount (for credit-based skills)
- **View Skills**: Browse all available skills with filtering
- **My Skills**: Manage your own skill listings
- **Filter Options**: Filter by payment type and session type

### 📅 Session Management
- **Request Sessions**: Book sessions with preferred dates/times
- **Session Approval**: Teachers can approve/reject requests
- **Credit Transactions**: Automatic credit transfer on approval
- **Session Tracking**: Monitor requested and teaching sessions

### 💳 My Wallet
- **Credit Balance**: View current Skill Credits balance
- **Real-time Updates**: Balance updates automatically
- **Transaction History**: Placeholder for future transaction tracking
- **Upcoming Features**:
  - View all credit transactions
  - Filter by date range
  - Export transaction history
  - Detailed transaction receipts

## Setup Instructions

### 1. Firebase Project Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password provider
3. Create a Firestore database
4. Apply the security rules provided above
5. Get your Firebase configuration from Project Settings

### 2. Application Configuration

1. Update `firebase-config.js` with your Firebase configuration:
```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id",
    measurementId: "your-measurement-id"
};
```

### 3. Local Development

1. Serve the files using a local web server (Firebase CLI recommended):
```bash
npm install -g firebase-tools
firebase serve
```

2. Or use any other static file server:
```bash
# Python 3
python -m http.server 3000

# Node.js
npx serve .
```

### 4. Deployment

Deploy to Firebase Hosting:
```bash
firebase init hosting
firebase deploy
```

## Data Structure

### User Profiles
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  rollno: "CS2021001",
  department: "Computer Science",
  course: "B.Tech",
  year: "3",
  credits: 100,
  createdAt: Timestamp
}
```

### Skills
```javascript
{
  name: "Web Development",
  description: "Learn HTML, CSS, and JavaScript",
  paymentType: "credits", // or "favor"
  paymentAmount: 50,
  sessionType: "online", // or "offline"
  teacherId: "user-id",
  teacherEmail: "teacher@example.com",
  createdAt: Timestamp
}
```

### Sessions
```javascript
{
  skillId: "skill-id",
  skillName: "Web Development",
  teacherId: "teacher-id",
  teacherEmail: "teacher@example.com",
  learnerId: "learner-id",
  learnerEmail: "learner@example.com",
  paymentType: "credits",
  paymentAmount: 50,
  status: "pending", // "approved", "rejected"
  requestedAt: Timestamp,
  scheduledDateTime: Timestamp, // when approved
  preferredDate1: "2024-01-15",
  preferredTime1: "14:00",
  preferredDate2: "2024-01-16", // optional
  preferredTime2: "15:00", // optional
  preferredDate3: "2024-01-17", // optional
  preferredTime3: "16:00" // optional
}
```

## Security Features

- **Authentication Required**: All features require user authentication
- **User Data Protection**: Users can only access their own profile data
- **Ownership Validation**: Users can only modify their own skills and sessions
- **Credit Protection**: Credits can only increase through legitimate transactions
- **Input Validation**: Comprehensive validation on all user inputs
- **XSS Protection**: All user content is properly escaped

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore)
- **Design**: CSS Grid, Flexbox, CSS Custom Properties
- **Icons**: No external icon library (using CSS for simple icons)

## Future Enhancements

- [ ] Real-time chat for session coordination
- [ ] Video call integration for online sessions
- [ ] Rating and review system
- [ ] Advanced search and filtering
- [ ] Mobile app using Cordova/PhoneGap
- [ ] Email notifications for session updates
- [ ] Payment gateway integration for credit purchases
- [ ] Calendar integration
- [ ] Skill categories and tags
- [ ] User verification system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please create an issue in the repository or contact the development team.

---

**SkillShare** - Empowering peer-to-peer learning through skill exchange! 🎓✨
