# TAURIDA ATELIER — Deployment & Setup Guide

This project is a full-stack React 19 + Vite application powered by an Express backend and an ACID SQLite 3 database (`better-sqlite3`).

---

## Quick Start: Running Locally

### Prerequisites
- **Node.js**: Version 18+ or 20+ (Node 22 LTS recommended)
- **npm** or **pnpm** or **yarn**
- **Git**

### 1. Clone or Extract the Project
```bash
cd taurida-atelier
```

### 2. Install Dependencies
```bash
npm install
```

> **Note for Windows / macOS / Linux**: `better-sqlite3` includes pre-built native binaries. If compilation is requested, ensure Python and standard build tools (C/C++ compiler) are available (`npm install -g windows-build-tools` on Windows or `xcode-select --install` on macOS).

### 3. Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default parameters in `.env`:
```env
PORT=3000
JWT_SECRET=taurida_secret_jwt_key_2026
ADMIN_DEFAULT_PASSWORD=haven2026
```

### 4. Run in Development Mode
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## Production Deployment on VPS (Ubuntu / Debian)

### 1. Server Preparation
Connect to your VPS via SSH and install Node.js 20/22 & Nginx:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git build-essential nginx

# Install PM2 process manager
sudo npm install -g pm2
```

### 2. Clone/Upload Code to `/var/www/taurida`
```bash
sudo mkdir -p /var/www/taurida
sudo chown -R $USER:$USER /var/www/taurida
cd /var/www/taurida

# Copy project files here, then:
npm install
```

### 3. Build Frontend & Verify Database
```bash
npm run build
```
This bundles the production client into the `dist/` directory.

### 4. Start the Application with PM2
```bash
# Start with PM2 using tsx runner
pm2 start npm --name "taurida-app" -- run start

# Save PM2 process list and configure auto-restart on boot
pm2 save
pm2 startup
```

Useful PM2 commands:
```bash
pm2 status          # Check status
pm2 logs taurida-app # View live application logs
pm2 restart taurida-app # Restart server
```

---

## Configure Nginx & SSL (HTTPS)

### 1. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/taurida.conf
```

Paste the following configuration (replace `yourdomain.com` with your actual domain or VPS IP):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Maximum file upload size (for 3D models and photos)
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Enable Site and Reload Nginx
```bash
sudo ln -s /etc/nginx/sites-available/taurida.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Enable Free SSL with Let's Encrypt (Certbot)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Backup & Database Management

- The SQLite database is located at: `data/taurida.sqlite`
- You can download live binary `.sqlite` backups or `.sql` dumps directly from the **Admin Panel** (`/admin` → **База данных & Бэкапы** tab).
- Automated backup cronjob example (daily at 03:00):
```bash
(crontab -l 2>/dev/null; echo "0 3 * * * cp /var/www/taurida/data/taurida.sqlite /var/backups/taurida_\$(date +\%F).sqlite") | crontab -
```
