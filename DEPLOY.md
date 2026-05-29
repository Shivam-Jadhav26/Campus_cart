## Backend — Render.com
Build command: npm install
Start command: node server.js (or npm start)
Root directory: server/

Environment variables needed:
- NODE_ENV
- PORT
- MONGO_URI
- SESSION_SECRET
- ACCESS_TOKEN_SECRET
- CLIENT_URL
- BASE_URL
- EMAIL_FROM
- BrevoApiKey
- EMAIL_USER
- EMAIL_PASS
- RESEND_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

## Frontend — Netlify
Build command: npm run build
Publish directory: dist
Root directory: client/

Environment variables needed:
- VITE_API_URL = (Render backend URL will go here)

## Steps to deploy:
1. Push code to GitHub
2. Deploy backend on Render first
3. Copy Render URL
4. Deploy frontend on Netlify
5. Set VITE_API_URL = Render URL in Netlify env
6. Set CLIENT_URL = Netlify URL in Render env
