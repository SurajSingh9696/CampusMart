# CampusMart

Campus-first marketplace platform built with Next.js App Router, MongoDB, and secure role-based workflows for customers, sellers, and admins.

## Stack

- Next.js 16 + TypeScript + Tailwind CSS
- MongoDB + Mongoose
- NextAuth credential login with strict role checks
- Framer Motion for 3D tab transitions
- Recharts for seller analytics
- Razorpay integration with secure fallback mode

## Roles and Flows

- Unified login for customer, seller, and admin
- Two registration routes:
  - Customer: simpler onboarding with ID card number
  - Seller: complete profile with ID proof, payout details, logo, and banner
- Seller approval workflow:
  - Status starts as pending
  - Admin approves or rejects with mandatory comment
  - Rejected seller auto-deletes after 24 hours (scheduled endpoint)
- Blocked users are prevented from accessing dashboards and protected APIs

## Main Features Implemented

- Landing page with modern professional UI
- Landing/auth content hydrated from PageContent collection (DB-driven copy)
- Smooth motion and 3D tab transitions across dashboards
- Customer dashboard with products/projects/notes/events tabs + campus warning
- Seller dashboard with inventory states, chart, and listing actions
- Admin dashboard with approval queue, stats, moderation endpoints
- Listing lifecycle:
  - Seller creates listings in pending_approval
  - Admin approves or rejects
  - Seller can deactivate/activate/delete own listings
  - Stale listings auto-deactivate after 28 days via scheduled endpoint
- Event ticketing response capture + CSV export endpoint
- Support message endpoint for account-number-based help workflow
- Razorpay order creation with fallback paid mode if keys are missing
- Dedicated collections per module:
  - Product
  - Project
  - Note
  - Event
  - MediaAsset
  - PageContent
- Image uploads stored in MongoDB binary (MediaAsset) with strict 500KB max size

## Environment Variables

Copy .env.example to .env.local and set values.

Required:

- MONGODB_URI
- NEXTAUTH_SECRET

Optional but recommended:

- NEXTAUTH_URL
- ADMIN_BOOTSTRAP_TOKEN
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET

## Run Locally

1. Install dependencies:

	npm install

2. Configure environment variables:

	copy .env.example .env.local

3. Start dev server:

	npm run dev

4. Open:

	http://localhost:3000

## Key API Endpoints

- POST /api/register/customer
- POST /api/register/seller
- GET /api/admin/sellers/pending
- POST /api/admin/sellers/decision
- POST /api/admin/users/block
- GET, POST /api/listings
- PATCH /api/listings/:id
- POST /api/payment/order
- POST /api/events/register
- GET /api/events/export/:listingId
- POST /api/system/deactivate-stale-listings
- POST /api/system/cleanup-rejected-sellers
- POST /api/system/bootstrap-admin

## Bootstrap First Admin

Use /api/system/bootstrap-admin once with ADMIN_BOOTSTRAP_TOKEN to create the first admin account.

## Notes

- Media upload fields currently store URLs. You can attach Cloudinary/S3 upload pipeline next.
- Payment fallback exists only for development and testing.
- Schedule cleanup and deactivation endpoints using cron in production.
# CampusMart
