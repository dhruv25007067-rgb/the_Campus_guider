# Professor Room Tracker 📍

A React Native (Expo) app for professors to log in, set their lecture schedule, and scan room QR codes to update their live location — stored in Firebase Realtime Database.

---

## Features

- **Login** — Each professor signs in with their email & password
- **QR Code Scanning** — Scan a room's QR code to instantly update current location
- **Schedule Manager** — Set which room each of your 6 lectures is in
- **Room Assignments** — Live view of all professors and their current rooms + schedules
- **Add Professors** — Admin can create new professor accounts from the Settings tab
- **Dark Mode** — Toggleable light/dark theme
- **Cross-platform** — iOS, Android, and Web

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
npm start
```

---

## Firebase Database Structure

Each professor is stored as an object (not a plain string):

```json
{
  "Professor": {
    "dr_kp": {
      "name": "Dr. K.P.",
      "email": "kp@college.edu",
      "password": "Kp@123",
      "current_room": "B504",
      "schedule": {
        "lecture_1": "ECE B",
        "lecture_2": "",
        "lecture_3": "ELCE A",
        "lecture_4": "CSIT A",
        "lecture_5": "",
        "lecture_6": ""
      }
    }
  }
}
```

### Migrating existing professors

Your current flat structure (`dr_kp: "B504"`) needs to be converted. Run this once per professor in your Firebase console or via a script:

```js
fetch('https://campusguide-32721-default-rtdb.firebaseio.com/Professor/dr_kp.json', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Dr. K.P.",
    email: "kp@college.edu",
    password: "set-a-password",
    current_room: "B504",
    schedule: {
      lecture_1: "ECE B", lecture_2: "", lecture_3: "ELCE A",
      lecture_4: "CSIT A", lecture_5: "", lecture_6: ""
    }
  })
})
```

Repeat for: `dr_khan`, `dr_kp`, `dr_manisha`, `dr_mohit`, `dr_namit`, `dr_sachin`, `dr_sharma`

---

## How It Works

| Step | Action |
|------|--------|
| 1 | Professor opens app → enters email + password → taps Sign In |
| 2 | App fetches `/Professor.json` and matches credentials |
| 3 | After login, **Schedule tab** lets professor set rooms for lectures 1–6 |
| 4 | **Scanner tab** shows today's schedule + a big Scan button |
| 5 | Scanning a QR code does a `PATCH` to update `current_room` in Firebase |
| 6 | **Records tab** shows all professors, their current room, and full schedule |
| 7 | **Settings tab** → admins can add new professors with name/email/password |

---

## Project Structure

```
professor-room-tracker/
├── src/
│   └── App.js        # Full app: Login, Scanner, Schedule, Records, Settings
├── package.json
├── .gitignore
└── README.md
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React Native + Expo | Cross-platform mobile |
| React Navigation (Bottom Tabs) | Tab navigation |
| Firebase Realtime Database | Live data storage |
| Expo Vector Icons (Material) | Icons |
| React Native Safe Area Context | Safe area insets |

---

## License

MIT
