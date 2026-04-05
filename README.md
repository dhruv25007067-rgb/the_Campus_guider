# Professor Room Tracker 📍

A React Native (Expo) app that lets professors update their current room location by scanning QR codes. Built for campus use — scan a room's QR code and the location is instantly updated in the database.

---

## Features

- **QR Code Scanning** — Scan room QR codes to update a professor's location
- **Professor Profiles** — Add and manage multiple professor accounts
- **Room Assignments** — View all current professor–room assignments at a glance
- **Dark Mode** — Toggleable light/dark theme
- **Firebase Integration** — Real-time updates via Firebase Realtime Database
- **Cross-platform** — Runs on iOS, Android, and Web

---

## Screenshots

| Scanner | Professors | Records | Settings |
|---------|------------|---------|----------|
| Scan QR to update room | Manage professor list | View all assignments | Stats & dark mode |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

```bash
npm install -g expo-cli
```

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/professor-room-tracker.git
cd professor-room-tracker
npm install
```

### Running the App

```bash
# Start the Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

---

## Firebase Setup

This app uses **Firebase Realtime Database** to store professor room assignments.

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Realtime Database**
3. Update the `firebaseDB` URL in `src/App.js`:

```js
const firebaseDB = 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com';
```

### Database Structure

```json
{
  "Professor": {
    "dr_sharma": "G104",
    "prof_mehta": "B201"
  }
}
```

---

## How It Works

1. A professor opens the app and selects their profile from the **Scanner** tab
2. They tap **Scan Room QR Code** to open the camera
3. Scanning a room's QR code sends a `PATCH` request to Firebase with the new room code
4. The **Records** tab shows all current professor–room assignments in real time

> **Test Mode:** In the scanner modal, you can manually type a room code (e.g. `G104`) and tap **Simulate Scan** to test without a physical QR code.

---

## Project Structure

```
professor-room-tracker/
├── src/
│   └── App.js          # Main application component
├── package.json
├── .gitignore
└── README.md
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React Native + Expo | Cross-platform mobile framework |
| React Navigation | Bottom tab navigation |
| Firebase RTDB | Real-time database |
| Expo Vector Icons | Material Icons |
| React Native Safe Area Context | Safe area insets |

---

## License

MIT
