# 🏛️ CampusCart: Architecture Overview

This document provides a technical walkthrough of the **CampusCart** codebase.

---

## 🎨 Frontend (Client)
The frontend is built with **React 19 + Vite**.

### 🏠 App Shell & Routing
*   **`src/main.jsx`** — Root entry point. Wraps the app in a `BrowserRouter`.
*   **`src/App.jsx`** — Main routing hub. Handles protected routes and session restoration.

### 📄 Pages
*   **`src/pages/MarketplacePlaceholder.jsx`** — The landing page (Premium UI).
*   **`src/pages/DashboardPlaceholder.jsx`** — The user's account hub.
*   **`src/login.jsx` & `src/Register.jsx`** — Secure authentication screens.

### 🌐 Services & Auth
*   **`services/api.js`** — Axios instance with silent JWT refresh interceptors.

---

## ⚙️ Backend (Server)
The backend is a **Node.js + Express** server using **MongoDB**.

### 🏗️ Structure
*   **`server.js`** — Entry point with security middleware (Helmet, CORS, Rate Limiters).
*   **`models/`** — Mongoose schemas: `User.js`, `Listing.js`, `Transaction.js`, `Review.js`.
*   **`controllers/`** — Business logic functions wrapped in `asyncHandler`.
*   **`routes/`** — RESTful API surface (Auth routes + Listing routes).
*   **`middlewares/`** — Authentication and global error handling.
*   **`utils/`** — Helpers for JWT, emails (Brevo), and cookies.

---

## 🚦 File Classification Map

| Status | File / Folder | Role |
| :--- | :--- | :--- |
| ✅ **Core** | `server.js`, `App.jsx`, `api.js` | The backbone. Must understand first. |
| ✅ **Core** | `models/`, `controllers/` | The "Meat" of the app. Feature implementation. |
| ⚠️ **Intermediate**| `middlewares/`, `utils/` | Security and system stability. |
| ❌ **Optional** | `tests/`, `eslint.config.js` | Development and linting tools. |

---

## 🔄 Request Flow (End-to-End)

1.  **Trigger**: User submits a "Sell" form on the **Frontend**.
2.  **API Call**: `services/api.js` sends a `POST` request to `/api/listings`.
3.  **Middleware**: `authMiddleware.js` verifies the JWT.
4.  **Route**: `listing.routes.js` directs the request to the controller.
5.  **Controller**: `listingController.js` validates input and saves using the `Listing` **Model**.
6.  **Database**: **MongoDB** persists the record.
7.  **Response**: Server sends the success object back.
8.  **Update**: Frontend updates the UI state.
