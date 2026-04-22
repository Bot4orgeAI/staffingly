# StaffVerify

Healthcare eligibility verification and prior authorization management platform.

## Project Structure

```
staffverify/
├── backend/          # Express.js API server (TypeScript)
├── frontend/         # React + Vite frontend (JavaScript + TypeScript)
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```bash
cp .env.example .env
```

4. Configure your `DATABASE_URL` in `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/staffverify?schema=public"
```

5. Generate Prisma client and push schema:

```bash
npm run prisma:generate
npm run prisma:push
```

6. Seed the database with sample data:

```bash
npm run prisma:seed
```

7. Start the development server:

```bash
npm run dev
```

Backend will run on http://localhost:3001

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

Frontend will run on http://localhost:5173

Note: In development, Vite proxies `/api` requests to the backend automatically. No `VITE_API_URL` needed.

## Test Accounts

After seeding, you can login with these accounts (any password works in development):

- **Super Admin:** admin@staffverify.com
- **Finance Admin:** finance@staffverify.com
- **Supervisor:** supervisor@staffverify.com
- **Specialist:** specialist@staffverify.com
- **Client User:** user@demopractice.com

## API Documentation

### Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Get a token by calling `POST /api/auth/login` with email and password.

### Available Endpoints

#### Authentication

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

#### Clients

- `GET /api/clients` - List clients
- `GET /api/clients/:id` - Get client
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

#### Prior Authorization

- `GET /api/prior-auth/cases` - List cases
- `GET /api/prior-auth/cases/:id` - Get case
- `POST /api/prior-auth/cases` - Create case
- `PUT /api/prior-auth/cases/:id` - Update case
- `DELETE /api/prior-auth/cases/:id` - Delete case
- `POST /api/prior-auth/cases/:id/documents` - Upload document
- `GET /api/prior-auth/cases/:id/documents` - Get documents

#### AI & Document Processing

- `POST /api/ai/invoke` - General LLM invocation
- `POST /api/ai/classify-document` - Classify document type and extract data
- `POST /api/ai/match-document` - Match extracted data to open cases

#### Billing

- `POST /api/billing/customers` - Create Stripe customer
- `POST /api/billing/charge` - Charge an invoice via Stripe
- `GET /api/billing/invoices` - List invoices
- `POST /api/billing/generate-invoices` - Generate weekly invoices

#### Eligibility

- `POST /api/eligibility/check` - Check patient eligibility
- `GET /api/eligibility/history` - Get check history
- `GET /api/eligibility/:id` - Get specific check details

#### Providers & Subscribers

- `GET /api/providers` - List healthcare providers
- `POST /api/providers` - Add provider
- `GET /api/subscribers` - List patient subscribers
- `POST /api/subscribers` - Add subscriber

#### Automation

- `POST /api/automation/trigger` - Trigger robotic automation job
- `GET /api/automation/queue` - Get queue status
- `GET /api/automation/jobs` - List jobs history

#### Storage & Sync

- `POST /api/storage/sync` - Sync documents from cloud storage (Google Drive, etc.)
- `GET /api/storage/config/:clientId` - Get client storage configuration

#### Knowledge Base

- `GET /api/knowledge-base/entries` - List KB articles
- `POST /api/knowledge-base/chatbot/converse` - Chat with AI assistant

#### Payroll & Activity

- `GET /api/payroll/rates` - Get specialist pay rates
- `GET /api/activity/daily-logs` - Get daily activity logs for staffing

## Database Management

### Prisma Studio

View and edit your database in a GUI:

```bash
cd backend
npm run prisma:studio
```

### Migrations

Create a new migration:

```bash
npm run prisma:migrate
```

Reset database:

```bash
npx prisma migrate reset
```

## Tech Stack

### Backend

- **Runtime:** Node.js 18+ (using `tsx` for development)
- **Framework:** Express.js 5+
- **Database:** PostgreSQL with Prisma ORM
- **AI:** Anthropic Claude API (@anthropic-ai/sdk)
- **Payments:** Stripe API
- **File Uploads:** Multer
- **Validation:** Joi
- **Auth:** JWT (jsonwebtoken) & bcryptjs

### Frontend

- **Core:** React 18 with Vite
- **Data Fetching:** TanStack Query (React Query)
- **Styling:** Tailwind CSS with Radix UI / Shadcn UI
- **Components:** Lucide React, Framer Motion, Recharts, Embla Carousel
- **Forms:** React Hook Form with Zod validation
- **Routing:** React Router 6

## Environment Variables

### Backend (.env)

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing
- `STRIPE_SECRET_KEY` - Stripe secret key
- `ANTHROPIC_API_KEY` - Anthropic API key for AI features
- `AVAILITY_API_KEY` - Availity API key for eligibility

### Frontend (.env)

- `VITE_API_URL` - Backend API URL (optional in dev)

## License

Proprietary - All rights reserved
