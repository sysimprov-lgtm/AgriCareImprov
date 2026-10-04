# 🌾 AgriCare

![Under Development](https://img.shields.io/badge/Status-Under%20Development-yellow)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![Django](https://img.shields.io/badge/Django-5.2.2-green)
![React](https://img.shields.io/badge/React-19-61dafb)

> A smart ticketing and support system designed to connect farmers with extension workers, providing faster solutions to agricultural concerns.

---

## 🚧 This project is currently under active development.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Django + Django REST Framework + Daphne |
| Database | Firebase Firestore |
| Auth | JWT (djangorestframework-simplejwt) + Supabase Auth (toggleable) |
| Real-time | Django Channels + Redis |
| Email | Gmail SMTP (production), terminal print (development) |
| State Management | Redux Toolkit |
| HTTP Client | Axios |

---

## 👥 Roles

- **SuperAdmin** — Hardcoded, mobile-only panel at `/system/init`
- **Admin** — Manages farmers, extension workers, tickets
- **Farmer** — Submits tickets
- **Extension Worker** — Handles tickets, needs admin approval

---

## ✨ Key Features

- 4-step registration flow (Account Setup → OTP → Personal Info → Success)
- OTP via Supabase Auth (primary) or Gmail SMTP (fallback/custom) depending on SuperAdmin toggle
- Supabase Auth toggle — SuperAdmin can switch between Supabase Auth (primary) and custom JWT + Gmail OTP (fallback) from System Control panel
- Configurable theme by SuperAdmin (colors, border radius, Minecraft mode 🎮)
- Real-time theme/system updates via WebSocket
- Maintenance mode & endpoint control by SuperAdmin
- Session Expired ⏰ and Unauthorized 🔒 dialogs
- Remember Me — JWT lifetime 1 day or 7 days
- Switchable layout (Topbar / Sidebar)
- Profile panel with change password (OTP flow) and logout
- Profile picture upload (base64, compressed to 200x200 JPEG, stored in Firestore)
- Dedicated admin login at `/admin-login` (`/backdoor` alias)
- Role blocking — each login page only accepts its own role
- Sidebar click-to-lock-open — clicking anywhere on the sidebar when collapsed locks it open
- Page transitions — fade animation on route change applied inside layout `<main>` content only
- Dialog + SidePanel transitions — fade/slide animations on open and close
- Notifications page redesigned — split layout with timeline list (left) + stats + detail panel (right)
- FarmersAccounts and ExtensionWorkers tables — pagination with page size selector (10/50/100)
- Settings icon in nav (replaces profile avatar) — opens ProfilePanel
- Dashboard redesigned for all 3 roles — hero banner with profile picture, gradient, stat cards with color accent bar, bar chart
- positionName in login/me response, stored in Redux, shown instantly in Extension Worker dashboard
- SuperAdmin Templates page — per-role, per-page template selection with skeleton previews
- Admin login always uses custom JWT (not Supabase)
- Session expired triggers on failed /auth/me/ or /auth/supabase/me/ on page load
- SupabaseAuthentication backend class — validates Supabase JWTs on all protected endpoints
- Dashboard nav added to Farmer and Extension Worker layouts
- Per-user notifications subcollection (`users/{userId}/notifications/`)
- Real-time notification badge via WebSocket (`ws/notifications/{userId}/`) — wired in AdminLayout, FarmerLayout, ExtensionWorkerLayout
- Real-time admin pages (FarmersAccounts, ExtensionWorkers, Dashboard) via WebSocket (`ws/admin-updates/`)
- Real-time ticket pages (farmer KnowledgeRepository, extension worker Tickets, admin KnowledgeRepository) via WebSocket (`ws/ticket-updates/`) — broadcast on ticket submit, join, delete
- Approval email sent to extension worker via Gmail SMTP when admin approves account
- Extension worker position management (add, edit, toggle, delete positions)
- Change position dialog with current position shown as disabled default
- Approve extension worker from View Dialog or table action
- Ticket system — farmers submit tickets to extension workers with a title and concern text
- Keyword extraction — backend strips stopwords and extracts keywords from both title + concern text (extract_keywords_combined())
- Fuzzy ticket matching — if existing ticket for same worker has overlapping keywords (from title+concern), farmer is prompted to join
- Ticket flow: Submit form → check existing → join existing or confirm new → ticket created/joined
- Tickets are public — all farmers can see all tickets (knowledge base)
- Extension workers only see their own tickets
- Ticket statuses: pending → ongoing → waiting_for_feedback → resolved
- Ticket resolution flow — extension worker clicks Mark as Resolved → status becomes waiting_for_feedback → original farmer (participants[0]) must confirm → status becomes resolved. Extension worker can cancel resolution request (back to ongoing). Admin can force resolve.
- Ticket messages subcollection — conversation thread between farmer and extension worker
- Multiple farmers can join same ticket thread as participants
- Farmer dashboard and Extension Worker dashboard — stat cards (Total, Pending, Resolved Tickets) + bar chart wired to real data from /dashboard/farmer-stats/ and /dashboard/worker-stats/
- Admin Dashboard — stat cards (Active Workers, Inactive Workers, Repo Visits, Tickets Today) + bar chart wired to /dashboard/stats/
- Reports & Analytics page — `/admin/reports`, 2x2 grid: Monthly Tickets (bar chart, click → matrix table by position, year filter + export CSV), Monthly New Farmers (bar chart, click → table with year filter + export CSV), Extension Worker Status (4 inner cards: Total, Online, Offline, Deleted + click → weekly/monthly table with week nav + year filter + export CSV), Monthly Repository Visits (bar chart, click → weekly/monthly table with week nav + year filter + export CSV). All years are dynamic (only years with actual data).
- Farmer Extension Workers page — card grid, only active workers shown, Submit Ticket button opens ticket flow
- MeView includes barangay field for farmers
- Knowledge Repository — farmer page at `/farmer/knowledge-repository`, lists all tickets, search by concern/worker, filter by status tabs, visit counter (increments on page load)
- Ticket detail dialog — shows concern, pinned answer block (with image/file), full message thread, reply input for participants only
- Pinned answer — extension worker can pin one message per ticket, shown above thread; clicking it scrolls to that message in thread
- Ticket real-time — WebSocket `ws/tickets/<ticket_id>/` updates message thread live for all open dialogs
- Extension Worker Tickets page — `/extension-worker/tickets`, lists own tickets, status tabs, detail dialog with reply, pin, status update
- Auto mark as ongoing — when extension worker sends first reply, ticket status auto-changes from pending to ongoing
- File/image attachments in messages — base64 stored in Firestore, 750KB max enforced on frontend (accounts for base64 inflation), backend also validates against Firestore 1MB field limit
- File upload in Submit Ticket form — farmer can attach file when submitting a ticket, stored in initial message
- Images render inline in message bubbles, click → fullscreen lightbox with close button
- Non-image files render as downloadable link with filename and file icon
- Pinned answer block shows file icon + filename for images (clicks open lightbox) and non-images (clicks download) — no inline image in pinned block
- barangay included in LoginView response so Redux user has it immediately after login (not just after refresh)
- Admin Knowledge Repository — `/admin/knowledge-repository`, lists all tickets, server-side filtered by week (‹ › nav), month dropdown, year dropdown (dynamic), search + status tabs filter client-side on top. Detail dialog with full thread, Mark as Ongoing/Resolved, Delete individual messages. Delete Ticket button on each ticket card opens confirm Dialog
- Ticket notifications — submit ticket → notifies extension worker; join ticket → notifies extension worker; extension worker reply → notifies all participants with message preview; farmer reply → notifies extension worker with message preview; file-only reply → 'replied and sent an attachment'; pin → notifies all participants; ongoing → notifies all participants; resolved → notifies all participants
- Notification relatedTicketId field — all ticket notifications store relatedTicketId. Notifications page shows View Ticket button → navigates to correct page with ticketId in location state → auto-opens ticket dialog and scrolls to card
- Notification detail panel shows file icon when message contains 'sent an attachment'
- Notifications page uses correct layout per role (FarmerLayout / ExtensionWorkerLayout / AdminLayout)
- FarmerLayout and ExtensionWorkerLayout — unread count fetch + ws/notifications/{userId}/ WebSocket for real-time badge. Notifications nav link added automatically by Sidebar/Topbar
- FarmersAccounts — table with search, export CSV (filtered list), view/toggle/delete actions
- ExtensionWorkers — table with search, export CSV (filtered list), view/toggle/approve/delete actions, manage positions side panel
- Send Notification — admin can send notification from /notifications page via dialog: search users by name (dropdown chips), or send to all, with free-type type + message fields. POST /users/notifications/send/
- Mobile responsive admin — all admin pages work at 392px viewport. Sidebar layout: fixed bottom nav bar (icons + short labels) on mobile, sidebar hidden. Topbar layout: same fixed bottom nav bar on mobile, nav links hidden. Both layouts show mobile header (logo + avatar) on mobile. All dialogs slide up from bottom on mobile (full width, rounded-t-2xl), centered on desktop. All tables have overflow-x-auto + min-width + whitespace-nowrap on cells for horizontal scroll with long data
- Knowledge Repository top-level tabs — All Tickets (default) / My Tickets (participant) / My Resolved (participant + resolved). Switching top tab resets status tab to all
- Mobile layout toggle hidden — Layout toggle (Topbar/Sidebar) in ProfilePanel wrapped with `hidden md:block`, useless on mobile
- Notification dialog on mobile — tapping a notification opens a Dialog on mobile (window.innerWidth < 768). `notifDetail()` helper reused by both mobile Dialog and desktop right panel
- Dialog z-index order — Bottom nav `z-[60]` → SidePanel `z-[65]` → Dialog `z-[70]` → Confirmation `z-[75]` → Lightbox `z-[80]`
- Dialog `mobileMaxH` prop — cleanly overrides mobile max-height without Tailwind class conflicts. Default `max-h-[70vh]`. Panel has `mb-16 sm:mb-0` to float above bottom nav on mobile
- Notification stat cards on Notifications page — fixed predefined types only (Total, Unread, New Farmer, New Extension Worker, Ticket Reply, Ticket Pinned, Ticket Resolved, Awaiting Confirmation) — always shown even if count is 0. Free-type manual notifications no longer generate extra cards.
- Dashboard bar chart Y-axis — precision: 0 added to prevent decimal numbers when values are low

---

## 💻 Local Development

### Requirements
- Python 3.11 — https://www.python.org/downloads/release/python-3119/
- Node.js 20 — https://nodejs.org/en/download
- Docker Desktop — https://www.docker.com/products/docker-desktop/

### Environment Variables
Create a `.env` file inside `server/`:
```env
SECRET_KEY=your-secret-key
DEBUG=True
SUPERADMIN_USERNAME=your-superadmin-username
SUPERADMIN_PASSWORD=your-superadmin-password
RESEND_API_KEY=your-resend-api-key
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Redis (first time)
```bash
docker run -d --name redis -p 6379:6379 redis
```

### Redis (after first time)
```bash
docker start redis
```

### Backend Setup
```bash
cd server
py -3.11 -m venv venv
venv\Scripts\activate
pip install -r req_utf8.txt
pip install cffi==1.17.1
pip install grpcio==1.80.0
python -m daphne -p 8000 core.asgi:application
```

### Frontend Setup
```bash
cd client
npm install
npm run dev
```

### Create Admin Account
```bash
cd server
venv\Scripts\activate
python manage.py createadmin --username <username> --password <password> --firstname <firstname> --lastname <lastname> --mobile <mobile>
```

---

## 🔁 Startup (after setup)

```bash
# 1. Redis
docker start redis

# 2. Backend
cd server
venv\Scripts\activate
python -m daphne -p 8000 core.asgi:application

# 3. Frontend
cd client
npm run dev
```

---

## 📁 Project Structure

```
TicketingSystem/
├── client/         # React + Vite + Tailwind (Frontend)
└── server/         # Django + DRF (Backend)
```

---

> Built with ❤️ for Filipino farmers.
