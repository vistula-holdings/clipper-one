### Updates
- 2026-09-29 Update server with app and database
- 2026-09-30 Update server Docker, web app running.
- 2026-10-05 Update web app: mailer service with new parameters.
- 2026-10-19 Update web app: polski and espanol langs.
- 2026-10-20 Update web app: email footer for candidates, it was removed labels status from column "Read email", "Candidate was notified?".

# Clipper-One Backend

Production-ready backend service for candidate management, QR code processing, automated notifications, and reporting.

## Overview

Clipper-One Backend is built on Node.js and Express, designed to handle high-density candidate reporting, multi-language dynamic email distribution, and containerized deployment.

## Key Features

- **Dynamic Email System (Nodemailer & i18next)**: Generates and delivers dynamic HTML emails with embedded inline QR code graphics (via Content-ID) alongside dynamic PDF file attachments from local assets. Supports customizable fallback email body content submitted from frontend views.
- **Localization**: Full multi-language support (i18n) integrated into automated email templates and user interfaces.
- **Optimized Data Reporting**: Customized Handlebars (`.hbs`) views with helper functions (`formatDate` for `YYYY-MM-DD HH:mm` formatting) and scrollable centered responsive layouts for high-density 24-column data tables.
- **Excel Export Ready**: Backend architecture pre-configured for automated dynamic `.xlsx` report generation using `exceljs`.

## Tech Stack

- **Runtime & Framework**: Node.js, Express.js
- **Templating Engine**: Express Handlebars (`express-handlebars`)
- **Email & Templating**: Nodemailer, QRCode, i18next
- **Containerization & Web Server**: Docker, Docker Compose, Nginx, Certbot (Let's Encrypt SSL)

## Project Structure
clipper-one-backend/
├── assets/
│   └── attachments/        # PDF document attachments and static assets
├── views/
│   ├── layouts/            # Handlebars layout files
│   └── *.hbs               # Main template views
├── docker-compose.yml      # Orchestration configuration
├── Dockerfile              # Container definition
├── server.js               # Application entry point
└── .env.example            # Environment variable template
## Setup & Deployment

### Prerequisites

- Docker and Docker Compose
- Domain configured with DNS pointing to server IP

### Environment Configuration

Create a `.env` file in the root directory:

```env
PORT=3000
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

Local Development & Docker Deployment
Build and run containers in detached mode:

Bash
docker compose up -d --build
Inspect container logs:

Bash
docker compose logs -f
Rebuild after applying code changes:

Bash
docker compose up -d --build
Production Architecture Notes
Application process management is handled directly by Docker's restart policy (restart: always), replacing legacy PM2 process management.

Nginx acts as the reverse proxy handling SSL termination via Certbot and routing traffic to the Node.js application container.



