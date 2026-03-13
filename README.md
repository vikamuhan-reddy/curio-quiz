# Curio Quiz — Deployment Documentation

## 1. Project Overview

Curio Quiz is a **real-time multiplayer quiz platform** where users can:

* Create quizzes
* Host live quiz sessions
* Join sessions with a PIN
* Compete on real-time leaderboards

### Tech Stack

Frontend

* React (Vite)
* Tailwind CSS
* Socket.IO Client

Backend

* Node.js
* Express
* Socket.IO

Database

* Supabase (PostgreSQL)

Infrastructure

* AWS EC2
* AWS S3
* AWS CloudFront
* Nginx
* PM2
* Let's Encrypt SSL

---

# 2. Architecture

```
User Browser
     ↓
CloudFront CDN
     ↓
S3 Static Hosting (React Frontend)
     ↓
HTTPS API (EC2 + Nginx)
     ↓
Node.js Express Server
     ↓
Supabase PostgreSQL
```

---

# 3. Deployment Process

## Backend Deployment (EC2)

### Launch EC2

Instance type:

```
t3.micro
Ubuntu 22.04
```

### Install dependencies

```
sudo apt update
sudo apt install nodejs npm nginx
sudo npm install -g pm2
```

### Run backend

```
pm2 start server.js --name curio-backend
pm2 save
```

---

## Reverse Proxy Setup (Nginx)

Nginx forwards traffic from port **80 → Node backend (3001)**.

Example config:

```
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
    }
}
```

---

## Frontend Deployment (S3)

React build generated using:

```
npm run build
```

The `dist/` folder was uploaded to:

```
AWS S3 bucket
```

Static hosting enabled with:

```
Index document: index.html
Error document: index.html
```

---

## CDN (CloudFront)

CloudFront was used to:

* Serve static assets globally
* Provide HTTPS for frontend

Configuration included:

```
Origin: S3 bucket
Default root object: index.html
Error mapping:
403 → index.html
404 → index.html
```

---

# 4. Major Technical Issues Faced

## Issue 1 — Frontend API calls hitting S3

### Problem

Login requests were going to:

```
S3 website endpoint
/api/auth/login
```

instead of the backend.

Example error:

```
405 MethodNotAllowed
```

### Cause

Environment variable `VITE_API_URL` was not injected during the build.

### Fix

Configured production environment:

```
VITE_API_URL=http://EC2_IP
```

Rebuilt frontend:

```
npm run build
```

---

## Issue 2 — CORS errors

### Problem

Frontend requests were blocked by the backend.

### Cause

CORS was not configured to allow the frontend domain.

### Fix

Updated Express CORS configuration:

```
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173'
];
```

---

## Issue 3 — React Router returning 404 on refresh

### Problem

Refreshing routes like:

```
/login
/dashboard
```

returned **404 errors**.

### Cause

S3 static hosting does not understand SPA routing.

### Fix

Configured error document:

```
index.html
```

So all routes fall back to the React app.

---

## Issue 4 — Mixed Content Error

### Problem

Browser blocked login requests.

Error:

```
Blocked loading mixed active content
```

### Cause

Frontend was loaded via HTTPS but backend used HTTP.

Example:

```
Frontend → https://cloudfront-url
Backend → http://EC2_IP
```

Browsers block this for security.

### Fix

Added HTTPS to EC2 using **Let's Encrypt**.

Steps:

```
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d EC2_IP.nip.io
```

Backend became accessible via:

```
https://EC2_IP.nip.io
```

Frontend env updated:

```
VITE_API_URL=https://EC2_IP.nip.io
```

---

## Issue 5 — Express rate limiter behind Nginx

### Problem

Logs showed:

```
ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
```

### Cause

Express did not trust the proxy (Nginx).

### Fix

Added:

```
app.set('trust proxy', 1);
```

---

## Issue 6 — CloudFront caching old builds

### Problem

New frontend builds did not appear.

### Cause

CloudFront cached old files.

### Fix

Invalidate cache:

```
aws cloudfront create-invalidation --paths "/*"
```

---

# 5. Security Improvements

Implemented:

* Helmet for HTTP security headers
* CORS restrictions
* HTTPS backend
* Rate limiting
* JWT authentication

---

# 6. Monitoring

Backend process management:

```
pm2 logs curio-backend
pm2 restart curio-backend
```

---

# 7. Future Improvements

Possible improvements:

* Move backend behind CloudFront
* Use AWS Application Load Balancer
* Add CI/CD pipeline
* Add Redis for session scaling
* Use AWS Route53 with a custom domain

---

# 8. Lessons Learned

Major lessons from the deployment process:

1. Environment variables must be set **before frontend build**.
2. HTTPS is required for modern browsers when using APIs.
3. CDNs cache aggressively and must be invalidated.
4. Reverse proxies require Express `trust proxy`.
5. SPA frameworks need fallback routing on static hosting.

