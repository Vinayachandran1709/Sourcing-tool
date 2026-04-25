# TalentBox — Tech Talent Sourcing Platform

> **Live demo:** [talentbox.co](https://talentbox.co)

TalentBox is an AI-powered tech talent sourcing tool built for recruitment agencies and IT staffing firms. It gives recruiters instant access to 2,00,000+ pre-scored developer profiles ranked by verified contribution data — cutting screening time from days to minutes.

---

## What It Does

Recruiters search by role, location, skills, experience level, and contribution score. Each profile is scored 0–100 based on verified open-source contributions. An AI layer (Groq / Llama 3.1 70B) generates plain-English summaries of each developer's technical background, and a JD parser extracts filters automatically from a pasted job description.

**Core features:**
- Search across 2,00,000+ indexed developer profiles with multi-filter support
- Contribution score (0–100) per profile based on verified coding activity
- AI profile summaries via Groq (Llama 3.1 70B)
- JD-to-filter parser: paste a job description, filters auto-populate
- Save profiles to named lists; export to CSV
- Email outreach to saved candidates via Resend
- Role detection (Backend, Frontend, ML, DevOps, etc.)
- Trial + subscription billing via Razorpay
- DevCard — shareable visual developer profile page

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Create React App) |
| Backend | Python, FastAPI |
| Database | PostgreSQL (Neon) |
| Backend Hosting | Railway |
| Frontend Hosting | Vercel |
| AI | Groq API — Llama 3.1 70B |
| Email | Resend |
| Payments | Razorpay |
| Auth | JWT (PyJWT + bcrypt) |
| Background Jobs | APScheduler |
| Caching | Redis |

---

## Folder Structure

```
Sourcing-tool/
├── backend folder/            # FastAPI backend
│   ├── main.py                # App entry point, all core routes
│   ├── config.py              # Env var loading
│   ├── database.py            # SQLAlchemy engine + session
│   ├── models.py              # ORM models (User, Developer, etc.)
│   ├── auth_middleware.py     # JWT validation middleware
│   ├── auth_routes.py         # Signup / login / password reset
│   ├── ai_service.py          # Groq AI — profile summaries + JD parser
│   ├── filter_service.py      # Search + filter logic
│   ├── github_service.py      # Contribution data ingestion
│   ├── github_graphql_service.py  # GraphQL queries for stats
│   ├── github_integration_service.py
│   ├── github_rate_limiter.py
│   ├── campaign_service.py    # Email outreach campaigns
│   ├── email_service.py       # Resend integration
│   ├── email_settings_routes.py
│   ├── lists_routes.py        # Saved lists API
│   ├── lists_service.py
│   ├── usage_service.py       # Search quota tracking
│   ├── rate_limit_service.py
│   ├── profile_cache_service.py
│   ├── profile_refresh_service.py
│   ├── role_detection_service.py  # ML/Backend/Frontend role classifier
│   ├── location_parser.py
│   ├── archive_search_service.py
│   ├── perpetual_indexer.py   # Background developer indexing
│   ├── scheduler.py           # APScheduler jobs
│   ├── redis_service.py
│   ├── feedback_routes.py
│   ├── cache_cleanup.py
│   ├── reset_usage.py
│   ├── requirements.txt
│   ├── railway.json           # Railway deploy config
│   ├── migration.sql          # Initial schema
│   ├── migrations/            # Incremental schema migrations
│   │   ├── add_email_settings_fields.sql
│   │   ├── migration_005_payments.sql
│   │   └── migration_006_feedback.sql
│   ├── routes/
│   │   └── payment_routes.py  # Razorpay payment endpoints
│   └── scripts/               # One-time database scripts
│       ├── seed_us_developers.py
│       ├── backfill_roles.py
│       ├── add_detected_roles_column.py
│       └── create_github_developers_table.py
│
└── frontend/                  # React frontend
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js
    │   ├── contexts/
    │   │   └── AuthContext.jsx      # Global auth state
    │   ├── components/
    │   │   ├── FilterPanel.jsx      # Search filters + JD parser UI
    │   │   ├── ProfileCard.jsx      # Developer card with AI summary button
    │   │   ├── ProfileDetailModal.jsx
    │   │   ├── DevCard.jsx          # Public developer profile card
    │   │   ├── EmailModal.jsx
    │   │   ├── EmailSettingsCard.jsx
    │   │   ├── EmailSettingsModal.jsx
    │   │   ├── FeedbackModal.jsx
    │   │   ├── UsageMeter.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   ├── PrivateRoute.jsx
    │   │   ├── FloatingHelpButton.jsx
    │   │   └── ErrorBoundary.jsx
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── PricingPage.jsx
    │   │   ├── ContactPage.jsx
    │   │   ├── DevCardPage.jsx
    │   │   ├── DevProfilePage.jsx
    │   │   ├── HireFreePage.jsx
    │   │   ├── ForCandidatesPage.jsx
    │   │   ├── ForCompaniesPage.jsx
    │   │   ├── ForgotPasswordPage.jsx
    │   │   ├── ResetPasswordPage.jsx
    │   │   ├── PrivacyPage.jsx
    │   │   ├── TermsPage.jsx
    │   │   ├── RefundPage.jsx
    │   │   └── Dashboard/
    │   │       ├── SearchDashboard.jsx   # Main search interface
    │   │       ├── SavedListsPage.jsx
    │   │       ├── SavedProfilesPage.jsx
    │   │       └── SubscriptionPage.jsx
    │   └── components/dashboard/
    │       ├── DashboardHeader.jsx
    │       ├── DashboardSidebar.jsx
    │       └── DashboardLayout.jsx
    └── package.json
```

---

## AI Integration

This project integrates AI at three points as part of the Hykr Build Challenge:

**1. AI Profile Summaries** (`ai_service.py` → `ProfileCard.jsx`)
Each developer profile has an "AI Summary" button. On click, the backend calls Groq (Llama 3.1 70B) and returns a 2-3 sentence plain-English technical summary of the developer — role, top skills, activity level.

**2. JD-to-Filter Parser** (`ai_service.py` → `FilterPanel.jsx`)
Recruiters paste a job description. The backend sends it to Groq, which extracts structured filters (role, skills, location, experience) and returns them as JSON. The UI auto-populates the search filters.

**3. Role Detection** (`role_detection_service.py`)
Each indexed developer profile is classified into engineering roles (Backend, Frontend, ML/AI, DevOps, Mobile, etc.) based on their language usage, contribution patterns, and bio keywords.

---

## Environment Variables

All secrets are loaded from environment variables. **No credentials are hardcoded anywhere in this codebase.**

Create a `.env` file in the `backend folder/` directory (never commit this file):

```env
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Auth
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256

# Contribution data API
CONTRIBUTION_API_TOKEN=your-token

# AI
GROQ_API_KEY=your-groq-api-key

# Email
RESEND_API_KEY=your-resend-api-key
COMPANY_EMAIL=noreply@talentbox.co

# Payments
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Admin
ADMIN_SECRET_KEY=your-admin-key

# CORS
CORS_ORIGINS=https://talentbox.co,http://localhost:3000

# Environment
ENVIRONMENT=production
```

Frontend `.env` (in `frontend/` directory):

```env
REACT_APP_API_URL=https://your-backend-url.railway.app
```

---

## Local Setup

### Backend

```bash
cd "backend folder"
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
# Create .env file with variables above
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# Create .env file with REACT_APP_API_URL
npm start
```

---

## Deployment

- **Backend:** Railway (auto-deploys from `main` branch via `railway.json`)
- **Frontend:** Vercel (auto-deploys from `main` branch)
- **Database:** Neon PostgreSQL (serverless)

---

## Security Notes

- All secrets loaded via `os.getenv()` — never hardcoded
- JWT-based authentication with bcrypt password hashing
- Rate limiting on search and API endpoints
- `.env` files are git-ignored
- Admin endpoints protected by `ADMIN_SECRET_KEY`

---

## Built By

[Vinay Chandran](https://talentbox.co) — Solo founder, TalentBox  
Submission for Hykr Build Challenge — AI Agents for Enterprise/Dev Tech category
