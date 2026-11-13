# Kevin Fashion Shop

A bilingual (Kinyarwanda / English) fashion e-commerce starter for Rwanda.

## Features
- Customer registration and login (JWT + bcrypt)
- Browse/search/filter products, product details, shopping cart
- Checkout with delivery details and order placement
- Payment choices: Cash on Delivery or Mobile Money (manual payment confirmation)
- Customer order history
- Admin dashboard: create/update/delete products and view/update orders
- Responsive React storefront

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL

## Requirements
Node.js 20+, MySQL 8+

## Setup
1. Create a MySQL database and import `database/schema.sql`.
2. In `backend`, copy `.env.example` to `.env` and set database credentials and a long JWT secret.
3. Run backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. In another terminal run frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. Open the Vite URL (usually http://localhost:5173).

## First admin
Register a normal account in the app, then promote it in MySQL:
```sql
UPDATE users SET role='admin' WHERE email='your-email@example.com';
```

## Rwanda payments
The starter records Mobile Money orders and payment references but does not automatically debit a phone or connect to MTN MoMo/Airtel Money. To accept live payments, integrate an approved payment provider and configure its credentials/webhooks. Never ask customers for their MoMo PIN.

## Important
Change `JWT_SECRET`, configure HTTPS, add rate limiting, backups, and a production database before deployment.
