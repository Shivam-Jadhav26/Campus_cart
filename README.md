# 🛒 CampusCart

A campus-centric peer-to-peer student marketplace where verified students buy, sell, and trade items safely within their campus community.

---

## 🎯 Problem It Solves

Students constantly need to buy and sell textbooks, electronics, lab equipment, and other campus essentials. Existing platforms like OLX or Facebook Marketplace aren't campus-specific — they lack trust, proximity, and student verification. **CampusCart** solves this by creating a closed, campus-only marketplace with built-in escrow, reviews, and peer delivery.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite |
| **Backend** | Node.js + Express 5 |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT (HTTP-only cookies) + Passport.js (Google & GitHub OAuth) |
| **Real-time** | Socket.io (Chat & Notifications) |
| **Email** | Brevo Transactional API |
| **AI Support** | Gemini 1.5 Pro (Search Assistant) |
| **Hosting** | Vercel (frontend) · Render (backend) · MongoDB Atlas (DB) |

---

## 📁 Project Structure

```
url_shortner/
├── client/                    → React frontend (Vite)
│   ├── src/
│   │   ├── pages/             → Page components
│   │   ├── components/        → Reusable UI elements
│   │   ├── context/           → Auth & Chat context providers
│   │   └── services/          → API instance with refresh logic
│
├── server/                    → Express backend
│   ├── config/                → DB connection, Passport strategies
│   ├── controllers/           → Route handlers (MVC)
│   ├── models/                → Mongoose schemas
│   ├── routes/                → Express route definitions
│   ├── sockets/               → Socket.io events and logic
│   └── server.js              → App entry point
│
└── README.md
```

---

## ⚙️ Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-username/campuscart.git
cd campuscart
```

### 2. Install dependencies
```bash
# In the root (or individually)
cd server && npm install
cd ../client && npm install
```

### 3. Set up environment variables
```bash
# Backend (.env)
PORT=10000
MONGO_URI=your_mongodb_uri
ACCESS_TOKEN_SECRET=your_secret
EMAIL_FROM=your_email
BrevoApiKey=your_brevo_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GEMINI_API_KEY=your_gemini_key

# Frontend (.env)
VITE_API_URL=http://localhost:10000
```

### 4. Run Development
```bash
# Backend (Server Terminal)
npm run dev

# Frontend (Client Terminal)
npm run dev
```

---

## 📡 API Endpoints

### 🔐 Authentication
| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Log in user |
| `POST` | `/api/auth/logout` | Log out user |
| `GET` | `/api/auth/me` | Get current user profile |

### 🛒 Listings & Categories
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/listings` | Get all listings (paginated) |
| `GET` | `/api/listings?category=Electronics` | Filter by category (case-insensitive) |
| `GET` | `/api/listings/:id` | Get single listing |

---

## 🚀 Deployment

- **Frontend**: Push `client` to Vercel/Netlify. Set `VITE_API_URL` environment variable.
- **Backend**: Push `server` to Render/Railway. Set all `.env` variables in the dashboard.
- **Database**: Use MongoDB Atlas for a managed cluster.

---

## 📄 License
ISC
