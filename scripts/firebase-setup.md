# Firebase Setup Guide for Launch Playbook

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it `remodely-playbook`
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Enable **Email/Password** provider
4. Enable **Email link (passwordless sign-in)** under Email/Password settings
5. Enable **Google** provider:
   - Use your OAuth Client ID: `254256003480-nvjrgj2gqnc90p6t0ue9tqcllcb8e4md.apps.googleusercontent.com`
   - Add your domain to authorized domains

## Step 3: Create Firestore Database

1. Go to **Build > Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode**
4. Select a location (us-central1 recommended)
5. Click "Enable"

## Step 4: Add Firestore Security Rules

Go to **Firestore Database > Rules** and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/settings/admins) &&
        request.auth.token.email in get(/databases/$(database)/documents/settings/admins).data.emails;
    }

    // Users can only read/write their own playbook data
    match /playbook_users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Clients can read/write their own data, admins can read all
    match /clients/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
    }

    // Admin settings - admins can read/write, authenticated users can read
    match /settings/admins {
      allow read: if request.auth != null;
      allow write: if isAdmin() ||
        (request.auth != null && request.auth.token.email == 'help.remodely@gmail.com');
    }
  }
}
```

Click **Publish**.

## Step 5: Get Your Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click the web icon `</>`
4. Register app as "Playbook Web"
5. Copy the config object

## Step 6: Update launch-playbook.html

Find this section in `launch-playbook.html`:

```javascript
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyDYOURKEYHERE",
  authDomain: "remodely-playbook.firebaseapp.com",
  projectId: "remodely-playbook",
  ...
};
```

Replace with your actual config:

```javascript
var FIREBASE_CONFIG = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "254256003480",
  appId: "YOUR_APP_ID"
};
```

## Step 7: Add Authorized Domains

1. Go to **Authentication > Settings > Authorized domains**
2. Add your domains:
   - `remodely.ai`
   - `localhost` (for development)

## Firestore Data Structure

```
playbook_users/
  {userId}/
    email: "user@example.com"
    tasks: {
      "pre-1": true,
      "pre-2": false,
      ...
    }
    goals: {
      "customers-target": "10",
      "customers-actual": "3",
      ...
    }
    dueDates: {
      "pre-1": { date: "2026-02-15", time: "09:00" },
      ...
    }
    preferences: {
      notifyDueSoon: true,
      reminderTime: "86400000",
      enableEmailDigest: false,
      digestTime: "9",
      digestTimezone: "America/Phoenix"
    }
    updatedAt: Timestamp
```

## Free Tier Limits

Firebase Spark (Free) Plan:
- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day
- **Authentication**: 50K monthly active users
- **Hosting**: 10 GB storage, 360 MB/day transfer

For a single-user playbook, you'll never hit these limits.

## Verification

1. Open the playbook page
2. Click "Sign In"
3. Sign in with Google or Email Link
4. Complete a task
5. Open in another browser/incognito and sign in
6. Verify the task is synced

## Troubleshooting

**"Cloud sync not configured"**
- Make sure FIREBASE_CONFIG has real values (not placeholder text)

**Google Sign-in popup blocked**
- Add your domain to authorized domains in Firebase Console

**Email link not working**
- Verify "Email link sign-in" is enabled in Authentication settings
- Check spam folder

**Permission denied errors**
- Verify Firestore rules are published
- Make sure user is signed in before sync attempts
