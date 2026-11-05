# GymDesk — Individual Gym Management Software

A light-theme management workspace for one gym, used by the gym owner and authorized staff.

## Phase 1 frontend prototype

- Responsive light-theme dashboard shell
- Sidebar navigation for all planned modules
- KPI cards for members, revenue and attendance
- Revenue chart (illustrative sample data)
- Today's attendance and recent check-ins
- QR scanner entry point
- Recent member registrations with client-side search
- Membership expiry reminders
- Notification popover and quick-action menu

**Important:** This is currently a frontend prototype with illustrative sample data. It is not connected to Supabase, does not yet authenticate users, and the navigation items are the planned module destinations. Backend and working module flows will be added in later phases.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Recharts
- Lucide icons
- Supabase (planned for Phase 2 onward)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Roadmap

1. Frontend screens and interactions
2. Supabase schema, relationships and row-level security
3. Owner/staff authentication and permissions
4. Members, memberships, attendance, payments and expenses
5. Secure QR token generation and server-validated scanning
6. Testing and Vercel deployment
