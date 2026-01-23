# Local Server Setup for Event Check-in App

The Event Check-in app requires a local web server to function properly. You **cannot** open the HTML files directly using `file://` protocol due to browser security restrictions (CORS).

## Quick Start

Choose one of the following methods to run a local server:

### Option 1: Python (Recommended - easiest)

If you have Python installed:

```bash
# Navigate to the project directory
cd /Users/troyshimkus/Dev_Projects/event_checkin/basic_html

# Python 3.x (most common)
python3 -m http.server 8000

# Or Python 2.x
python -m SimpleHTTPServer 8000
```

Then open your browser to: http://localhost:8000

### Option 2: Node.js (http-server)

If you have Node.js installed:

```bash
# Install http-server globally (one time only)
npm install -g http-server

# Run server
cd /Users/troyshimkus/Dev_Projects/event_checkin/basic_html
http-server -p 8000
```

Then open your browser to: http://localhost:8000

### Option 3: PHP

If you have PHP installed:

```bash
cd /Users/troyshimkus/Dev_Projects/event_checkin/basic_html
php -S localhost:8000
```

Then open your browser to: http://localhost:8000

### Option 4: VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html` or `admin.html`
3. Select "Open with Live Server"

## Accessing the Application

Once your server is running:

- **Main Check-in Interface**: http://localhost:8000/index.html
- **Admin Dashboard**: http://localhost:8000/admin.html

## Current Data Source Configuration

Your app is currently configured to use **Supabase** as the data source:

- **Supabase URL**: https://mwgusnjwqkznzohmxugu.supabase.co
- **Table**: event_checkin.attendees
- **Configuration file**: `config.js`

No PHP server is required when using Supabase!

## Troubleshooting

### "Supabase Configuration Required" Message

If you see this message:

1. Start your local server (see options above)
2. Open http://localhost:8000/admin.html
3. Click "Temporary Bypass" button
4. Go to Settings → Data Source
5. Verify Supabase settings are configured correctly
6. The configuration should already be set in `config.js`

### CORS Errors in Console

This means you're opening the file directly (file:// protocol). You must use one of the local server options above.

### Port 8000 Already in Use

If port 8000 is already in use, try a different port:

```bash
# Python
python3 -m http.server 8080

# Node.js
http-server -p 8080

# PHP
php -S localhost:8080
```

Then access the app at http://localhost:8080

## Why Do I Need a Local Server?

Modern web browsers block certain operations when files are opened directly (file:// protocol) for security reasons:

- ❌ Fetch/AJAX requests (CORS)
- ❌ LocalStorage across files
- ❌ Modern JavaScript modules
- ❌ Service workers

A local server solves all these issues by serving files over HTTP protocol.
