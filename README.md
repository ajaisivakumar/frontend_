# Campus Connect — New Frontend

A complete plain HTML/CSS/JavaScript frontend for the Campus Connect platform.
**No React. No Vite. No build step.** Just three files.

---

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | All UI — auth pages + full app layout |
| `style.css` | All styles — Lavender / Chartreuse / Tomato theme |
| `script.js` | All logic — API calls, routing, state management |
| `.env` | Configuration (API_BASE_URL) |
| `serve.bat` | One-click local dev server |
| `start-backend.bat` | Shortcut to start the backend |

---

## 🎨 Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Lavender** | `#B57BEE` | Primary actions, active nav, badges |
| **Chartreuse** | `#DFFF00` | Stats, CGPA values, logo |
| **Tomato Red** | `#E8453C` | Destructive actions, LOST items, errors |

---

## 🚀 How to Run

### Step 1 — Start the Backend
```bat
cd webinar\backend
node dist/index.js
```
Backend runs at `http://localhost:5000`

### Step 2 — Start the Frontend
Double-click **`serve.bat`** or run:
```bat
cd "webinar\new Frontend"
serve.bat
```
Frontend runs at **`http://localhost:3000`**

---

## ✅ Features

| Feature | Status |
|---------|--------|
| Sign Up / Login | ✅ Working |
| Forgot / Reset Password | ✅ Working |
| Google OAuth (if configured) | ✅ Working |
| Dashboard with stats | ✅ Working |
| Events — browse + create | ✅ Working |
| Polls — vote in real-time | ✅ Working |
| Lost & Found — report + browse | ✅ Working |
| Opportunities — post + browse | ✅ Working |
| CGPA Leaderboard — join + view | ✅ Working |
| Lab Complaints — file + track | ✅ Working |
| CGPA Calculator — multi-sem | ✅ Working |
| Notifications | ✅ Working |
| Profile — update name | ✅ Working |
| Change Password | ✅ Working |
| Admin Panel — metrics + users | ✅ Working (ADMIN role) |
| Responsive mobile layout | ✅ Working |

---

## 🔐 Auth Notes

- Passwords must be **at least 8 characters**
- JWT token stored in `localStorage` under `cc_token`
- Admin credentials from `backend/.env`:
  - Email: `admin@college.edu`
  - Password: `Admin@SecurePassword2026!`

---

## 🌐 API Base URL

Change `API_BASE` in `script.js` line 18 if your backend runs on a different port:
```js
const API_BASE = 'http://localhost:5000';
```
