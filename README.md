# BulkMailer 🚀

> A production-grade, full-stack bulk email web application with four sending modes, dynamic mail merge, real-time engagement tracking, queue deliverability safeguards, and automated scheduling.

🌐 **Live Demo:** [[LIVE URL]]([LIVE URL])

---

## 📑 Table of Contents
1. [Overview & Key Features](#-key-features)
2. [Tech Stack & Architecture](#-tech-stack)
3. [Project Structure](#-project-structure)
4. [Local Setup Guide](#-local-setup-guide)
5. [Environment Variables](#-environment-variables)
6. [Deployment Guide](#-deployment-guide)
7. [GitHub Repository Metadata](#-github-repository-metadata)
8. [Anti-Spam & Deliverability Safeguards](#-anti-spam--deliverability-safeguards)
9. [License](#-license)

---

## ✨ Key Features

- **Four Flexible Sending Modes:**
  1. **Same to Many:** Broadcast identical emails to multiple recipients with instant chip input and syntax validation.
  2. **Single Recipient:** Fast 1-on-1 personalized outreach with full tracking and formatting.
  3. **Mail Merge CSV:** Upload a CSV spreadsheet, auto-detect columns, and dynamically personalize content per recipient with custom fallback variables (e.g. `{{name|valued customer}}`, `{{invoice_id}}`).
  4. **Custom Table Mode:** Interactive spreadsheet grid editor to construct recipient tables and custom merge fields directly in your browser.
- **Dynamic Mail Merge & Fallbacks:** Inject any custom variable `{{key}}` with default fallbacks `{{key|fallback}}` that automatically populate across subjects and bodies.
- **Rich Visual & Code Editor:** Three-tab editor supporting Visual WYSIWYG, HTML source code, and Plain-Text with interactive variable chips.
- **Email Templates Library:** Save, duplicate, preview, and reuse modular email templates with pre-defined subject lines and placeholders.
- **Audience Segmentation (Contact Groups):** Organize contacts into custom groups (e.g., *VIP Clients*, *Beta Users*) for one-click campaign dispatch.
- **Automated Campaign Scheduling:** Set date and time for future dispatches via persistent `node-cron` scheduler that survives server restarts.
- **Complete Email Headers:** Collapsible CC, BCC, and custom Reply-To address support.
- **Drag-and-Drop Attachments:** Upload files or attach per-recipient personalized documents (e.g. invoices, certificates) using ZIP archives.
- **Real-Time Open & Click Tracking:** Zero-impact 1x1 transparent tracking pixels and secure 302 redirect click counters with full campaign analytics.
- **Dry-Run Simulation Mode:** Execute complete mock campaigns to preview delivery metrics, rate-limits, and logs without sending real emails.
- **One-Click Test Dispatch:** Send an immediate rendered test sample to your authenticated email before launching a mass campaign.
- **Automated List Hygiene & Cleaning:** Built-in scanner detects and strips invalid email syntax, duplicates, previously unsubscribed users, and prior bounces.
- **Modern Arc UI Design System:** Premium SaaS aesthetic inspired by Linear and Stripe, featuring light and dark modes, smooth spring physics (`motion/react`), and responsive layouts.

---

## 🛠 Tech Stack

- **Frontend:**
  - React 18, Vite
  - Arc UI Design Tokens (`@uiarc`), Tailwind CSS
  - Motion (`motion/react`) for spring animations
  - Lucide React iconography
  - PapaParse for client-side CSV processing
- **Backend:**
  - Node.js & Express.js (RESTful API architecture)
  - Nodemailer (SMTP abstraction with Gmail, SendGrid, Mailgun, Amazon SES support)
  - SQLite3 (WAL journal mode, foreign keys enabled) with optional Firebase Firestore support
  - `node-cron` for scheduled automation
  - Server-Sent Events (SSE) for real-time progress streaming
  - JWT Authentication & `bcryptjs` password hashing
  - `sanitize-html` & `validator` for security sanitization

---

## 📂 Project Structure

```text
bulkmailer/
├── backend/                  # Node.js + Express API server
│   ├── src/
│   │   ├── config/           # Database, Firebase, and Mailer configuration
│   │   ├── controllers/      # Route controllers (tracking, campaigns)
│   │   ├── middleware/       # Auth JWT, Multer uploads, security
│   │   ├── models/           # SQLite schema and migration definitions
│   │   ├── routes/           # Express API endpoints (/auth, /send, /contacts, etc.)
│   │   ├── services/         # Mailer engine, Queue dispatcher, Scheduler
│   │   └── server.js         # Express app entrypoint & static frontend server
│   ├── data/                 # SQLite database storage (bulkmailer.db)
│   ├── uploads/              # Attachment file storage
│   ├── tests/                # Automated test suites (Auth, Queue, Security, E2E)
│   └── package.json
├── frontend/                 # React + Vite frontend application
│   ├── src/
│   │   ├── components/       # Modals, Navbar, Sidebar, RichEditor, Arc tokens
│   │   ├── context/          # AuthContext, ThemeContext
│   │   ├── pages/            # Compose, Contacts, Groups, Templates, History, Settings
│   │   ├── services/         # API client connector
│   │   ├── App.jsx           # Application shell & routing
│   │   └── main.jsx          # Vite root entrypoint
│   ├── vite.config.js        # Vite config with proxy & path aliases
│   └── package.json
├── .env.example              # Master environment variable template
├── .gitignore                # Git exclusions (credentials, databases, node_modules)
└── package.json              # Monorepo build and start scripts
```

---

## 💻 Local Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/[YOUR-USERNAME]/[YOUR-REPO-NAME].git
cd [YOUR-REPO-NAME]
```

### 3. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

### 4. Configure Environment Variables
Copy the `.env.example` file to create your backend `.env`:
```bash
cp .env.example backend/.env
```

Open `backend/.env` and configure your credentials:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
APP_BASE_URL=http://localhost:5000
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars

# SMTP Configuration (Example: Gmail App Password)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
EMAIL_FROM="BulkMailer Dispatcher" <your_email@gmail.com>
```

> **Gmail App Password Instructions:**
> 1. Enable 2-Step Verification on your Google Account: [myaccount.google.com/security](https://myaccount.google.com/security).
> 2. Generate an **App Password**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
> 3. Select "Mail" and "Other (Custom name)", name it `BulkMailer`, and copy the 16-character code into `SMTP_PASS`.

### 5. Run the Application
In your terminal, start the backend and frontend concurrently:
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:backend

# Terminal 2: Frontend Client (port 5173)
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Environment Variables

| Variable | Description | Default / Example | Required |
|---|---|---|:---:|
| `PORT` | Port the backend server listens on | `5000` | Yes |
| `FRONTEND_URL` | Allowed frontend origin(s) for CORS (comma-separated for multiple) | `http://localhost:5173` | Yes |
| `APP_BASE_URL` | Public backend URL for tracking pixels, clicks, and unsubscribes | `http://localhost:5000` | Yes |
| `JWT_SECRET` | Cryptographic secret for signing auth tokens (min 32 chars) | `your_secret_key` | Yes |
| `DATABASE_PROVIDER` | Database adapter (`supabase`, `sqlite`, or `firebase`) | `supabase` | Yes |
| `DATABASE_URL` | Supabase PostgreSQL URI (Transaction Pooler port 6543 recommended) | `postgresql://...` | If Supabase |
| `DB_PATH` | Path to SQLite database file (when using SQLite) | `./data/bulkmailer.db` | If SQLite |
| `UPLOADS_DIR` | Directory to store uploaded attachments | `./uploads` | No |
| `EMAIL_PROVIDER` | Sending provider (`smtp` or `mock`) | `smtp` | Yes |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` | If SMTP |
| `SMTP_PORT` | SMTP port (`587` for STARTTLS, `465` for SSL) | `587` | If SMTP |
| `SMTP_SECURE` | Use SSL/TLS (`true` for 465, `false` for 587) | `false` | If SMTP |
| `SMTP_USER` | SMTP username or email address | `user@gmail.com` | If SMTP |
| `SMTP_PASS` | SMTP password or 16-char App Password | `app_password` | If SMTP |
| `EMAIL_FROM` | Default sender header formatted as `"Name" <email>` | `"BulkMailer" <user@gmail.com>` | Yes |
| `DELAY_BETWEEN_EMAILS_MS` | Milliseconds between individual email sends in queue | `500` | No |
| `DAILY_SEND_LIMIT` | Maximum emails per 24 hours per user | `500` | No |
| `VITE_API_URL` | *(Frontend only)* Backend URL if frontend is deployed on separate domain | `http://localhost:5000` | If split |

---

## 🚀 Deployment Guide

BulkMailer supports **single-service full-stack deployment** (recommended for simplicity) as well as **separate frontend & backend deployment**.

### Option A: Single Full-Stack Service (Render, Railway, Fly.io, VPS)
In this mode, the backend serves both the `/api` endpoints and the compiled React frontend static files from `frontend/dist/`.

- **Root Directory:** `/` (repo root)
- **Build Command:**
  ```bash
  npm run install:all && npm run build
  ```
- **Start Command:**
  ```bash
  npm start
  ```
- **Publish / Output Directory:** `frontend/dist`
- **Port:** Auto-detected via `process.env.PORT` (defaults to `5000`)

> [!IMPORTANT]
> **Persistent Disk for SQLite:**
> Cloud platforms (like Render, Railway, Fly) use ephemeral containers that wipe local disk changes on restart. To keep your contacts, templates, and history:
> 1. Attach a **Persistent Disk Volume** in your hosting dashboard (e.g. mount path: `/data`).
> 2. Set the environment variable: `DB_PATH=/data/bulkmailer.db`.
> 3. Set `UPLOADS_DIR=/data/uploads` if you want uploaded attachments to persist across restarts.
> *(Alternatively, set `DATABASE_PROVIDER=firebase` to use cloud-hosted Firebase Firestore with zero disk dependencies).*

---

### Option B: Separate Frontend (Vercel / Cloudflare / Netlify) + Backend (Render / Railway / OnDev)

#### 1. Backend Service
- **Root Directory:** `backend/`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Port:** Auto-assigned by host (`process.env.PORT`)
- **Environment Variables:** Set all variables from `.env.example`, including:
  - `FRONTEND_URL=https://[YOUR-FRONTEND-URL]`
  - `APP_BASE_URL=https://[YOUR-BACKEND-URL]`
  - Attach a persistent disk and set `DB_PATH=/data/bulkmailer.db`.

#### 2. Frontend Service
- **Root Directory:** `frontend/`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_URL=https://[YOUR-BACKEND-URL]`

---

### Option C: Custom Domain with `runs-on.dev`
To point a free developer subdomain from [runs-on.dev](https://runs-on.dev) to your live deployment:
1. Fork or open the [runs-on.dev GitHub repository](https://github.com/zordhalo/runs-on.dev).
2. Create `domains/yourname.json`:
   ```json
   {
     "name": "yourname",
     "owner": {
       "github": "your-github-username"
     },
     "records": {
       "CNAME": "[YOUR-HOSTING-URL]"
     }
   }
   ```
3. Submit a Pull Request. Once merged, your app will be live at `https://yourname.runs-on.dev`!

---

## 🏷️ GitHub Repository Metadata

### Suggested About Description
```text
Full-stack bulk email web app with mail merge, scheduling, open/click tracking, templates, and deliverability safeguards built with React & Node.js.
```
*(150 characters — fits within GitHub's 160-character limit)*

### Suggested Repository Topics
```text
email, bulk-email, mail-merge, nodemailer, react, vite, tailwindcss, arc-ui, sqlite, express, email-marketing, email-automation, open-tracking, click-tracking, linear-style
```

---

## 🛡️ Anti-Spam & Deliverability Safeguards

BulkMailer is built strictly for legitimate transactional and opt-in marketing email delivery. It implements multi-layer protection out-of-the-box:
- **Rate-Limiting Throttle:** Sequential sending with a mandatory 500ms delay prevents provider IP bans.
- **Daily Send Quota:** Hard daily cap (default 500 emails/day) to prevent accidental spam spikes.
- **List Hygiene Engine:** Automatic suppression of invalid syntax, duplicate addresses, unsubscribed contacts, and hard bounces.
- **One-Click Unsubscribe:** Automatic RFC-compliant unsubscribe link generation (`/unsubscribe/:token`) with instant database opt-out status.
- **CRLF Injection Prevention:** Header sanitization strips `\r` and `\n` control characters to prevent header injection attacks.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
