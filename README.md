# ✨ Wishr

A beautifully designed, cozy, multi-user wishlist app. Users can quickly create profiles, log in securely with an animated lock-screen style PIN pad, and manage draggable wish items. Non-logged-in users can browse friends' wishlists with a gorgeous full-screen accent theme.

Built with React, Vite, Firebase, and `dnd-kit`.

### 🚀 Getting Started

**1. Clone & Install**
Clone this repository locally, move into the directory, and install dependencies.
```bash
git clone <your-repo-url>
cd wishr
npm install
```

**2. Configure Firestore Rules**
Go to your Firebase console, navigate to your Firestore Database rules, and update them to open permissions for quick start/testing:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**3. Test locally & Deploy**
Run `npm run dev` to test it locally.
When ready, push your project to GitHub, and import your repository on Vercel to instantly deploy it live!
