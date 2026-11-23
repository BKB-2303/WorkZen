# WorkZen (MERN)
1. Node.js 18+, MongoDB Atlas. Edit server/.env (MONGO_URI, JWT_SECRET).
2. npm run install-all
3. npm run dev -> http://localhost:5173
Default admin (created automatically if no admin exists): BKB / BKBWORK@COM
Admin manages users only (add, reset password, enable/disable, delete). Users manage their own tasks, notes and bookmarks.
Single server: npm run build, then npm start -> http://localhost:5000
Shortcuts (desktop): N = new task, / = search.

Personal section: Saved passwords (AES-256-GCM encrypted; to view them you must re-enter your LOGIN password, auto-locks after 5 min idle), open Notes (no lock) and Bookmarks.
IMPORTANT: server/.env VAULT_KEY encrypts the saved passwords. Back it up and never change it, or saved items become unreadable.
Mobile: slide-out menu, bottom tab bar with a quick "+" for new task, bottom-sheet forms.
Upgrade note: the old locked Secure notes are copied into Notes automatically on first start (needs the old VAULT_KEY still in server/.env).
The old Saved passwords vault has been removed; its data is left untouched in the database but is no longer shown.
