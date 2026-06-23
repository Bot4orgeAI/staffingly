# StaffVerify — GCP Infrastructure Reference

> **Project:** `peppy-ratio-497410-e7` (Staffingly Internal Projects)
> **Organization:** Staffingly Inc (`573981949909`)
> **Region:** `us-central1` (Iowa, USA)
> **Last Updated:** 2026-06-19

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Internet / Users                      │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS
          ┌──────────▼──────────┐
          │  Cloud Run          │
          │  staffverify-frontend│  React SPA (Nginx)
          │  Port 8080           │
          └──────────┬──────────┘
                     │ API Requests (HTTPS)
          ┌──────────▼──────────┐
          │  Cloud Run          │
          │  staffverify-backend │  Express.js API
          │  Port 8080           │
          │  VPC Connector       │
          └──────────┬──────────┘
                     │ Serverless VPC Connector (private IP)
          ┌──────────▼──────────┐
          │  Cloud SQL          │
          │  staffverify-db      │  PostgreSQL 16
          │  Private IP only     │
          └─────────────────────┘
```

---

## 1. Frontend — Cloud Run

| Property | Value |
|---|---|
| **Service Name** | `staffverify-frontend` |
| **Service URL** | https://staffverify-frontend-59021984001.us-central1.run.app |
| **Platform** | Google Cloud Run (Managed / Serverless) |
| **Region** | `us-central1` |
| **Latest Revision** | `staffverify-frontend-00003-2lv` |
| **Container Image** | `us-central1-docker.pkg.dev/peppy-ratio-497410-e7/staffverify-repo/frontend:latest` |
| **Container Port** | `8080` |
| **Base Image (Build)** | `node:20-alpine` (Vite build stage) |
| **Base Image (Serve)** | `nginx:alpine` |
| **CPU Limit** | `1000m` (1 vCPU) |
| **Memory Limit** | `512 MiB` |
| **Max Instances** | `20` |
| **Min Instances** | `0` (scales to zero) |
| **Concurrency** | `80` requests per instance |
| **Request Timeout** | `300s` |
| **Ingress** | All traffic |
| **Authentication** | Restricted by Org Policy (Domain Restricted Sharing) |
| **Created** | 2026-06-19 |

### Runtime Details
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Web Server:** Nginx (Alpine)
- **Build:** Static assets compiled at Docker build time with `VITE_API_URL` baked in
- **Backend URL (baked in):** `https://staffverify-backend-59021984001.us-central1.run.app`
- **SPA Routing:** Nginx `try_files` directive handles client-side routing

---

## 2. Backend API — Cloud Run

| Property | Value |
|---|---|
| **Service Name** | `staffverify-backend` |
| **Service URL** | https://staffverify-backend-59021984001.us-central1.run.app |
| **Platform** | Google Cloud Run (Managed / Serverless) |
| **Region** | `us-central1` |
| **Latest Revision** | `staffverify-backend-00013-hht` |
| **Container Image** | `us-central1-docker.pkg.dev/peppy-ratio-497410-e7/staffverify-repo/backend:latest` |
| **Container Port** | `8080` |
| **Base Image** | `node:20-alpine` |
| **CPU Limit** | `1000m` (1 vCPU) |
| **Memory Limit** | `512 MiB` |
| **Max Instances** | `20` |
| **Min Instances** | `0` (scales to zero) |
| **Concurrency** | `80` requests per instance |
| **Request Timeout** | `300s` |
| **Ingress** | All traffic |
| **Authentication** | Restricted by Org Policy (Domain Restricted Sharing) |
| **Cloud SQL Connection** | `peppy-ratio-497410-e7:us-central1:staffverify-db` (Unix socket via VPC connector) |
| **VPC Connector** | `staffverify-connector` (private-ranges-only egress) |
| **Created** | 2026-06-19 |

### Runtime Details
- **Framework:** Express.js 5 (Node.js 20)
- **Language:** TypeScript (compiled to JS via `tsc`)
- **ORM:** Prisma 7 (with `debian-openssl-3.0.x` + `linux-musl-openssl-3.0.x` binary targets)
- **Startup Command:** `prisma migrate deploy && node dist/server.js`
- **Database migrations run automatically on every deployment**

### Environment Variables

| Variable | Source | Description |
|---|---|---|
| `NODE_ENV` | Inline | `production` |
| `JWT_EXPIRES_IN` | Inline | `7d` |
| `CORS_ORIGIN` | Inline | Frontend Cloud Run URL |
| `N8N_MASTER_GATEWAY_URL` | Inline | n8n automation webhook |
| `FROM_EMAIL` | Inline | Sender address for transactional emails |
| `DATABASE_URL` | Secret Manager → `database-url:latest` | PostgreSQL connection string (Cloud SQL Unix socket, private IP via VPC) |
| `JWT_SECRET` | Secret Manager → `jwt-secret:latest` | JWT signing key |
| `GOOGLE_CLIENT_ID` | Secret Manager → `google-client-id:latest` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Secret Manager → `google-client-secret:latest` | Google OAuth client secret |
| `RESEND_API_KEY` | Secret Manager → `resend-api-key:latest` | Resend email API key |
| `OCR_SPACE_API_KEY` | Secret Manager → `ocr-space-api-key:latest` | OCR.space API key |

### IAM Permissions (Service Account: `59021984001-compute@developer.gserviceaccount.com`)

| Role | Purpose |
|---|---|
| `roles/secretmanager.secretAccessor` | Read secrets from Secret Manager |
| `roles/cloudsql.client` | Connect to Cloud SQL via Auth Proxy |
| `roles/run.builder` | Build and deploy Cloud Run revisions |

---

## 3. Database — Cloud SQL (PostgreSQL)

| Property | Value |
|---|---|
| **Instance Name** | `staffverify-db` |
| **Connection Name** | `peppy-ratio-497410-e7:us-central1:staffverify-db` |
| **Public IP Address** | `—` (disabled) |
| **Private IP Address** | `10.87.0.3` |
| **Database Engine** | PostgreSQL 16 |
| **Instance Type** | `db-f1-micro` (Shared-core, 1 vCPU, 614 MB RAM) |
| **Generation** | Second Generation |
| **Availability** | Zonal (`us-central1-f`) |
| **Storage Type** | SSD (`PD_SSD`) |
| **Storage Size** | 10 GB (auto-resize enabled, no upper limit) |
| **Backups** | **Disabled** (enable via Cloud Console → SQL → Backups) |
| **Backup Start Time** | `05:00 UTC` (when re-enabled) |
| **Point-in-Time Recovery** | Disabled |
| **Transaction Log Retention** | 7 days |
| **SSL Required** | No (SSL available but not enforced) |
| **Authorized Networks** | None (public access fully disabled) |
| **Pricing Plan** | Per Use |
| **Created** | 2026-06-17 |
| **State** | `RUNNABLE` |

### Databases on this instance

| Database | Schema | User |
|---|---|---|
| `staffverify` | `public` | `postgres` |

---

## 4. Serverless VPC Connector

| Property | Value |
|---|---|
| **Name** | `staffverify-connector` |
| **Region** | `us-central1` |
| **Network** | `default` |
| **IP Range** | `10.8.0.0/28` |

The VPC connector enables Cloud Run to reach the private IP of Cloud SQL. Backend Cloud Run uses it with `private-ranges-only` egress — all traffic to private IPs (including Cloud SQL) goes through the VPC, while public internet traffic bypasses it.

---

## 5. Container Registry — Artifact Registry

| Property | Value |
|---|---|
| **Repository Name** | `staffverify-repo` |
| **Format** | Docker |
| **Location** | `us-central1` |
| **Encryption** | Google-managed key |
| **Created** | 2026-06-17 |

### Images

| Image | Tag | Size | Last Updated |
|---|---|---|---|
| `staffverify-repo/backend` | `latest` | ~285 MB | 2026-06-19 |
| `staffverify-repo/frontend` | `latest` | ~22 MB | 2026-06-19 |

---

## 6. Secret Manager

All sensitive configuration is stored in **Google Secret Manager** under project `peppy-ratio-497410-e7`. Secrets are injected at runtime into the backend Cloud Run container.

| Secret Name | Description |
|---|---|
| `database-url` | PostgreSQL connection string (Cloud SQL Unix socket format) |
| `jwt-secret` | Secret key for signing JWT authentication tokens |
| `google-client-id` | Google OAuth 2.0 Client ID |
| `google-client-secret` | Google OAuth 2.0 Client Secret |
| `resend-api-key` | API key for Resend transactional email service |
| `ocr-space-api-key` | API key for OCR.space document scanning service |

---

## 7. Deployment Pipeline

Builds are run using **Google Cloud Build** (serverless CI). There is no persistent build server.

### Manual Commands

| Step | Command |
|---|---|
| Backend build & push | `gcloud builds submit backend/ --tag us-central1-docker.pkg.dev/.../staffverify-repo/backend:latest` |
| Frontend build & push | `gcloud builds submit frontend/ --config cloudbuild.yaml` |
| Backend deploy | `gcloud run deploy staffverify-backend --image=... --region=us-central1 --port=8080 --add-cloudsql-instances=peppy-ratio-497410-e7:us-central1:staffverify-db --vpc-connector=staffverify-connector --vpc-egress=private-ranges-only` |
| Frontend deploy | `gcloud run deploy staffverify-frontend --image=... --region=us-central1 --port=8080` |

### Automated CI/CD

The `.github/workflows/deploy.yml` workflow runs on push to `main`:
- **Lint** — ESLint + Prettier check on both backend and frontend
- **Backend** — Builds container, deploys to Cloud Run with env vars from Secret Manager and GitHub Secrets
- **Frontend** — Builds container with `VITE_API_URL` from GitHub Secret, deploys to Cloud Run

> **Note:** The frontend `VITE_API_URL` is baked into the container at build time via Docker `ARG`. To change the backend URL, a full frontend rebuild and redeploy is required.

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_SA_KEY` | Service account key for authentication |
| `FRONTEND_URL` | Frontend Cloud Run URL (for CORS) |
| `BACKEND_URL` | Backend Cloud Run URL (for VITE_API_URL) |

---

## 8. Estimated Monthly Cost (at low traffic)

| Service | Tier | Est. Cost |
|---|---|---|
| Cloud Run (Backend) | Scales to zero, pay per request | ~$0–5/mo |
| Cloud Run (Frontend) | Scales to zero, pay per request | ~$0–2/mo |
| Cloud SQL | `db-f1-micro`, 10 GB SSD | ~$7–10/mo |
| Artifact Registry | ~300 MB storage | ~$0.03/mo |
| Cloud Build | 120 free build-minutes/day | ~$0/mo |
| Secret Manager | 6 secrets, low access volume | ~$0/mo |
| **Total** | | **~$7–17/mo** |

> Costs will increase proportionally with traffic and data volume.

---

## 9. Quick Reference Commands

```bash
# View backend logs
gcloud run services logs read staffverify-backend --region=us-central1 --limit=50

# View frontend logs
gcloud run services logs read staffverify-frontend --region=us-central1 --limit=50

# Redeploy backend (after code change + rebuild)
cd backend
gcloud builds submit --tag us-central1-docker.pkg.dev/peppy-ratio-497410-e7/staffverify-repo/backend:latest .
gcloud run deploy staffverify-backend --image=us-central1-docker.pkg.dev/peppy-ratio-497410-e7/staffverify-repo/backend:latest --region=us-central1

# Redeploy frontend (after code change + rebuild)
cd frontend
gcloud builds submit --config cloudbuild.yaml .
gcloud run deploy staffverify-frontend --image=us-central1-docker.pkg.dev/peppy-ratio-497410-e7/staffverify-repo/frontend:latest --region=us-central1 --port=8080

# Update a secret value
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Connect to the database directly (local dev)
gcloud sql connect staffverify-db --user=postgres --database=staffverify

# Update backend CORS after deploying a new frontend URL
gcloud run services update staffverify-backend --region=us-central1 --update-env-vars="CORS_ORIGIN=https://YOUR-NEW-FRONTEND-URL"
```
