# Surest Plug — InfinityFree Deployment Guide

This guide walks you through deploying **Surest Plug** to **InfinityFree** free web hosting.

---

## 1. Prerequisites on InfinityFree

1. Sign up / Log in to your [InfinityFree Account](https://infinityfree.com).
2. Create a new hosting account with your free subdomain (e.g. `surestplug.infinityfreeapp.com` or `surestplug.epizy.com`).
3. In your InfinityFree Control Panel (cPanel):
   - Open **MySQL Databases**.
   - Create a new database (e.g. `if0_xxxxxxx_surestplug`).
   - Note down:
     - **MySQL Hostname** (e.g. `sql300.infinityfree.com` or `sql205.epizy.com`)
     - **MySQL Database Name** (e.g. `if0_38000000_surestplug`)
     - **MySQL Username** (e.g. `if0_38000000`)
     - **MySQL Password** (Your vPanel account password)

---

## 2. Import the MySQL Database Schema

1. In the InfinityFree cPanel, click **phpMyAdmin** next to your database.
2. Select your newly created database.
3. Click the **Import** tab at the top.
4. Click **Choose File** and select `database.sql` from this project.
5. Click **Go / Import**. All tables (`users`, `products`, `orders`, `transactions`, `deposits`, `custom_orders`, `support_tickets`, `notifications`, `system_settings`) will be created cleanly.

---

## 3. Upload Website Files to `htdocs/`

1. Open **Online File Manager** (or connect via FTP using FileZilla with your FTP credentials from InfinityFree).
2. Open the **`htdocs`** folder of your domain.
3. Upload all files and folders into `htdocs/`:
   ```
   htdocs/
   ├── assets/
   │   ├── css/
   │   ├── images/
   │   │   ├── sp-logo.png
   │   │   └── favicon.png
   │   └── js/
   ├── config/
   │   ├── database.php
   │   ├── app_config.php
   │   ├── smm_config.php
   │   └── google_auth.php
   ├── includes/
   ├── api/
   ├── admin/
   ├── dashboard/
   ├── index.php
   ├── marketplace.php
   ├── product.php
   ├── custom-website.php
   ├── boosting.php
   ├── login.php
   ├── register.php
   ├── logout.php
   ├── about.php
   ├── how-it-works.php
   ├── contact.php
   ├── terms.php
   ├── privacy.php
   ├── refund.php
   ├── install.php
   └── .htaccess
   ```

---

## 4. Configure Database Credentials

Edit `config/database.php` in the File Manager (or use `install.php`):

```php
define('DB_HOST', 'sqlXXX.infinityfree.com'); // Your InfinityFree MySQL Hostname
define('DB_NAME', 'if0_XXXXXXX_surestplug');  // Your Database Name
define('DB_USER', 'if0_XXXXXXX');             // Your Database Username
define('DB_PASS', 'YOUR_VPANEL_PASSWORD');    // Your Database Password
```

---

## 5. First-Time Setup & Administrator Creation

1. Open your browser and navigate to:
   ```
   http://yourdomain.infinityfreeapp.com/install.php
   ```
2. Enter your desired Administrator Name, Email, and Password.
3. Click **"Initialize Database & Create Admin"**.
4. Once completed, the installer will lock itself for security.

---

## 6. SMM Boosting API Setup (Optional / Real Production)

1. Log in to the Admin Dashboard at `/admin/settings.php`.
2. Enter your SMM provider's API URL (e.g. `https://smm-provider.com/api/v2`) and your SMM API key.
3. The API key is stored securely in MySQL and `config/smm_config.php` and is **never** exposed to the browser or JavaScript.

---

## 7. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and configure the OAuth consent screen.
3. Under **Credentials**, create an **OAuth 2.0 Client ID (Web Application)**.
4. Set **Authorized redirect URI** to:
   `https://yourdomain.infinityfreeapp.com/api/auth/google-callback.php`
5. Copy the Client ID & Secret into `/admin/settings.php`.
