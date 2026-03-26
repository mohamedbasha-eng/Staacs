# Firebase Setup Guide for Staccs E-Commerce

## Step 1: Create a Firebase Project

1. Go to **[Firebase Console](https://console.firebase.google.com)**
2. Click **"Add project"**
3. Enter project name: `staccs-store`
4. Accept terms and create project
5. Wait for project to initialize

## Step 2: Enable Firestore Database

1. In Firebase Console, go to **Build → Firestore Database**
2. Click **"Create database"**
3. Start in **production mode** (you can update rules later)
4. Select region: **us-central1** (or closest to your location)
5. Click **"Create"**

## Step 3: Set Firestore Security Rules

After Firestore is created:

1. Go to **Firestore Database → Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read products (public store)
    match /staccs/products {
      allow read;
      allow write: if request.auth != null;
    }
    
    // Allow anyone to read/write orders (for now)
    match /staccs/orders {
      allow read, write;
    }
  }
}
```

3. Click **"Publish"**

## Step 4: Get Your Firebase Config

1. In Firebase Console, click the **gear icon** (⚙️) → **Project Settings**
2. Scroll to **"Your apps"** section
3. Click **"</>"** (Web app icon) if not already created
4. You'll see your `firebaseConfig` object with these values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

Copy these values.

## Step 5: Update firebase-config.js

1. Open `firebase-config.js` in your editor
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "staccs-store.firebaseapp.com",
  projectId: "staccs-store",
  storageBucket: "staccs-store.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_ID",
  appId: "YOUR_ACTUAL_ID"
};
```

## Step 6: Test the Connection

1. Open `index.html` in your browser
2. Open browser **Developer Console** (F12 → Console tab)
3. You should see: 
   - No Firebase errors
   - Products loading from Firestore (or empty array)

4. Open `admin.html` and add a product
5. Refresh `index.html` → **New product should appear immediately**

✅ **Your database is connected!**

---

## Features Enabled

- ✅ **Real-time sync** — Products update instantly across all pages
- ✅ **Cloud storage** — Data stored safely in Google servers
- ✅ **Scalable** — Handles growth from 10 to 10,000 products
- ✅ **Automatic backups** — Firebase automatically backs up your data

---

## Troubleshooting

**Q: Getting CORS errors?**
A: This is expected with Firebase. It's secure. Check browser console for Firebase-specific errors.

**Q: Products not syncing?**
A: 
- Verify `firebase-config.js` has correct values
- Check Firestore database exists and has rules published
- Open browser console and check for errors

**Q: "Missing or insufficient permissions"?**
A: Update Firestore security rules (Step 3) and click Publish

---

## Next Steps (Optional)

1. **Add user authentication** — Login system for admin
2. **Migrate existing data** — Move localStorage data to Firestore
3. **Backup strategy** — Set up automated backups
4. **Performance tracking** — Monitor Firestore usage in Firebase Console

---

## Firebase Pricing

- **Free tier** (Spark Plan):
  - 1 GB storage
  - 50,000 reads/day
  - 20,000 writes/day
  - Perfect for small stores!

- **Upgrade when needed** (Blaze Plan):
  - Pay-as-you-go
  - No storage limits
  - 1 million+ operations/day
