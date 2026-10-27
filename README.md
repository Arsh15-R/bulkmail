# BulkMailer 🚀

> A production-grade, full-stack bulk email web application with four sending modes, dynamic mail merge, real-time engagement tracking, queue deliverability safeguards, and automated scheduling powered by Supabase PostgreSQL.

🌐 **Live Demo:** [https://bulkmail-gold.vercel.app](https://bulkmail-gold.vercel.app)

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
- **Google OAuth 2.0 & One-Click Sign-In:** Authenticate with Google Identity Services (GIS) or standard email/password, with automatic profile sync and Google avatar support.
- **Real-Time Quota Telemetry Meter:** Interactive live meter tracking daily sends against your 500 email quota, synchronized automatically on send and window focus.
- **Mail Record Deletion & Cascade Cleanup:** Delete individual recipient logs or entire campaign dispatches with automatic cascading cleanup of all tracking events and tokens, plus bulk delete capabilities.
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
  - Supabase PostgreSQL with connection pooling (`pg`) and `@supabase/supabase-js`
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
│   │   ├── config/           # Supabase PostgreSQL database, and Mailer configuration
│   │   ├── controllers/      # Route controllers (tracking, campaigns, auth, contacts)
│   │   ├── middleware/       # Auth JWT, Multer uploads, security rate limiting
│   │   ├── models/           # Supabase PostgreSQL schema and table definitions
│   │   ├── routes/           # Express API endpoints (/auth, /send, /contacts, etc.)
│   │   ├── services/         # Mailer engine, Queue dispatcher, Scheduler
│   │   └── server.js         # Express app entrypoint & static frontend server
│   ├── uploads/              # Attachment file storage
│   ├── tests/                # Automated test suites (Auth, Queue, Security, E2E)
│   └── package.json
├── frontend/                 # React + Vite frontend application
│   ├── src/
│   │   ├── components/       # Arc UI modals, Rich Editor, Navbar, Sidebar
│   │   ├── context/          # Auth Context & Dark Mode Theme Context
│   │   ├── pages/            # Compose, Contacts, Groups, Templates, History
│   │   └── services/         # Backend Axios API client
│   └── package.json
├── sample-data/              # Sample CSV contacts & invoices for immediate demo
├── supabase_schema.sql       # Supabase PostgreSQL schema initialization script
└── README.md
```

---

## 💻 Local Setup Guide

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Arsh15-R/bulkmail.git
cd bulkmail

# Install both backend and frontend dependencies in one command
npm run install:all
```

### 2. Configure Environment Variables

Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```

Open `backend/.env` and update:
- `JWT_SECRET` (generate a random 32+ char string)
- `DATABASE_URL` (your Supabase PostgreSQL connection string)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_USER` and `SMTP_PASS` (e.g., your Gmail App Password)

### 3. Initialize Supabase Database

Run the SQL script `supabase_schema.sql` in your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new) to create all 11 tables and indexes.

### 4. Run Development Servers

```bash
# Terminal 1 - Backend API (runs on http://localhost:5000)
npm run dev:backend

# Terminal 2 - Frontend UI (runs on http://localhost:5173)
npm run dev:frontend
```

---

## 🔑 Environment Variables

| Variable | Description | Default / Example | Required |
|---|---|---|:---:|
| `PORT` | Port the backend server listens on | `5000` | Yes |
| `FRONTEND_URL` | Allowed frontend origin(s) for CORS | `http://localhost:5173` | Yes |
| `APP_BASE_URL` | Public backend URL for tracking pixels, clicks, and unsubscribes | `http://localhost:5000` | Yes |
| `JWT_SECRET` | Cryptographic secret for signing auth tokens (min 32 chars) | `your_secret_key` | Yes |
| `DATABASE_URL` | Supabase PostgreSQL URI (Transaction Pooler port 6543 recommended) | `postgresql://...` | Yes |
| `SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key | `sb_secret_...` | Yes |
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
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID for Google Sign-In | `xxxx.apps.googleusercontent.com` | Optional |
| `VITE_GOOGLE_CLIENT_ID` | *(Frontend only)* Google Client ID if built statically | `xxxx.apps.googleusercontent.com` | Optional |
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
> **Supabase PostgreSQL Database:**
> BulkMailer uses Supabase PostgreSQL for cloud-native persistence with zero local disk dependencies.
> 1. Run `supabase_schema.sql` in your [Supabase SQL Editor](https://supabase.com/dashboard).
> 2. Set `DATABASE_URL` in your hosting dashboard with your Supabase Transaction Pooler URI.
> 3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

### Option B: Separate Frontend & Backend Deployment

#### 1. Backend Service
- **Root Directory:** `backend/`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Port:** Auto-assigned by host (`process.env.PORT`)
- **Environment Variables:** Set all variables from `.env.example`, including:
  - `FRONTEND_URL=https://[YOUR-FRONTEND-URL]`
  - `APP_BASE_URL=https://[YOUR-BACKEND-URL]`
  - `DATABASE_URL=postgresql://postgres.yourprojectref:yourpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

#### 2. Frontend Service
- **Root Directory:** `frontend/`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variable:**
  - `VITE_API_URL=https://[YOUR-BACKEND-URL]`

---

## 🌐 Custom Subdomain Setup: `*.runs-on.dev`

If you are deploying on a platform that supports GitHub-managed subdomains (such as `runs-on.dev`):
1. Fork or open the [runs-on.dev DNS repository](https://github.com/runs-on-dev/dns).
2. Add a JSON record under `domains/`:
   ```json
   {
     "description": "BulkMailer production web application",
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
Production-grade bulk email web app with mail merge, scheduling, open/click tracking, templates, and Supabase PostgreSQL backend.
```

### Suggested Repository Topics
```text
email, bulk-email, mail-merge, nodemailer, react, vite, tailwindcss, arc-ui, supabase, postgresql, express, email-marketing, email-automation, open-tracking, click-tracking, linear-style
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
