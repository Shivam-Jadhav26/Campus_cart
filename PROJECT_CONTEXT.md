# CampusCart - Project Context for LLM

## 🛒 Project Overview
**CampusCart** is a peer-to-peer student marketplace designed specifically for campus communities. It allows verified students to buy, sell, and trade items (textbooks, electronics, etc.) within their campus, solving trust and proximity issues found in general marketplaces.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: `react-router-dom` (v7)
- **State/API**: Axios (centralized in `client/src/services/api.js`)
- **Real-time**: `socket.io-client` for chat features

### Backend
- **Framework**: Node.js + Express 5
- **Database**: MongoDB + Mongoose (v9)
- **Authentication**: 
  - JWT (stored in HTTP-only cookies)
  - Passport.js (Google & GitHub OAuth)
  - Custom email verification + password setting flow
- **Real-time**: `socket.io` for messaging
- **Utilities**: 
  - Multer + Cloudinary (for image uploads)
  - Brevo/Resend/Nodemailer (for transactional emails)
  - Morgan/Helmet/CORS (standard middleware)

---

## 📁 Key File Structure
```
url_shortner/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI elements
│   │   ├── pages/          # Full page views
│   │   ├── hooks/          # Custom hooks (e.g., useChat.js)
│   │   ├── services/       # API interface (api.js)
│   │   └── styles/         # CSS modules/Vanilla CSS
│
├── server/                 # Express Backend
│   ├── config/             # DB & Passport configuration
│   ├── controllers/        # Request handlers (business logic)
│   ├── middlewares/        # Auth, Validation, Error handling
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   ├── utils/              # Helper functions (tokens, cookies)
│   └── server.js           # Entry point
```

---

## 🎯 Current Status & Recent Focus
We have recently focused on **standardizing connectivity** and **debugging the authentication flow**.

### Critical Information:
1.  **API Paths**: The backend groups all routes under `/api/`. 
    - *Example*: `POST /api/auth/login`
2.  **Request Prefixing**: The frontend `api` service (Axios) is configured with a `baseURL`. We are ensuring that *every* request from the frontend explicitly prefixes with `/api/` to avoid path mismatch issues (404s).
3.  **Authentication**: Users verify via email first, then set a password. We also support Google/GitHub OAuth.
4.  **Real-time Chat**: Socket.io is implemented for messaging. Handshake tokens are fetched from `/api/auth/token`.

### Recent Wins:
- Refactored `CategoryBar` and `Home` page for interactive filtering.
- Standardized API requests in `Login.jsx`, `Register.jsx`, and `AddItem.jsx`.
- Fixed socket connection handshake path issues.
- Implemented robust Axios interceptors for handling token refresh and errors.

---

## 🚀 How to Run locally

### Backend
1. `cd server`
2. `npm install`
3. `npm run dev` (Runs on `http://localhost:5000`)

### Frontend
1. `cd client`
2. `npm install`
3. `npm run dev` (Runs on `http://localhost:5173`)

---

## 🗺️ Roadmap Topics
- **Completed**: Auth (Email/OAuth), Listing CRUD, Category Filtering.
- **In-Progress**: Image uploads, Socket.io Chat stabilization.
- **Upcoming**: Razorpay payments, Escrow flow, Seller/Buyer reviews.
