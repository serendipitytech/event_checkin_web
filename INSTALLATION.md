# Installation Guide

Step-by-step instructions for deploying the Event Check-in System.

## Server Requirements

### Minimum Requirements
- **Web Server**: Apache, Nginx, or similar
- **PHP**: Version 7.4 or higher (for CSV upload feature)
- **Storage**: 100MB free space
- **Bandwidth**: Sufficient for your expected traffic

### Recommended
- **HTTPS**: SSL certificate for secure connections
- **PHP**: Version 8.0 or higher
- **Storage**: 1GB+ for large attendee lists
- **CDN**: For better performance with multiple users

## Installation Steps

### Step 1: Download Files

Download all files to your web server:

```
basic_html/
├── index.html
├── config.js
├── data-sources.js
├── admin-panel.js
├── gsheet-integration.js
├── csv-handler.php
├── supabase-setup.sql
├── README.md
└── INSTALLATION.md
```

### Step 2: Set File Permissions

```bash
# Make PHP file executable
chmod 755 csv-handler.php

# Create data directory with write permissions
mkdir data
chmod 755 data
chmod 644 data/*

# Set appropriate permissions for web files
chmod 644 *.html *.js *.md
```

### Step 3: Test Basic Functionality

1. **Open** `index.html` in your web browser
2. **Verify** the page loads without errors
3. **Check** the browser console for any JavaScript errors
4. **Test** the admin panel (⚙️ button)

### Step 4: Configure Data Source

Choose one of the three data source options:

#### Option A: CSV File Upload (Easiest)

1. Go to Admin Panel → Data Source → Select "CSV File"
2. Upload your attendee CSV file
3. Verify the file appears in the status section

**Requirements**: PHP must be enabled on your server

#### Option B: Google Sheets (Best for Collaboration)

1. Create a Google Sheet with your attendee data
2. Publish the sheet: File → Share → Publish to web → CSV format
3. Go to Admin Panel → Data Source → Select "Google Sheets"
4. Enter the published sheet URL
5. Test the connection

**Requirements**: Public internet access, published Google Sheet

#### Option C: Supabase Database (Most Powerful)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Copy and paste the contents of `supabase-setup.sql`
5. Run the SQL to create the table
6. Go to Admin Panel → Data Source → Select "Supabase Database"
7. Enter your project URL and API key

**Requirements**: Supabase account, database setup

### Step 5: Test Multi-Device Sync

1. **Open** the app on multiple devices/browsers
2. **Check in** an attendee on one device
3. **Verify** the change appears on other devices
4. **Test** different data sources if applicable

## Platform-Specific Instructions

### Apache Server

```apache
# .htaccess file for better security
<Files "csv-handler.php">
    Order Allow,Deny
    Allow from all
</Files>

# Enable CORS for Google Sheets
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
```

### Nginx Server

```nginx
# nginx.conf additions
location /csv-handler.php {
    try_files $uri =404;
    fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}

# CORS headers
add_header Access-Control-Allow-Origin "*" always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
```

### Shared Hosting (cPanel, etc.)

1. **Upload** all files via File Manager or FTP
2. **Create** the `data` directory
3. **Set permissions** to 755 for directories, 644 for files
4. **Test** PHP functionality by visiting `csv-handler.php?action=status`

### Cloud Hosting (AWS, DigitalOcean, etc.)

1. **Deploy** to your web server
2. **Configure** security groups to allow HTTP/HTTPS traffic
3. **Set up** SSL certificate for HTTPS
4. **Configure** backup for the `data` directory

## Environment Configuration

### Development Environment

For local development, you can use any of these methods:

**Python Server**:
```bash
cd basic_html
python -m http.server 8000
# Access at http://localhost:8000
```

**Node.js Server**:
```bash
cd basic_html
npx serve .
# Access at http://localhost:3000
```

**PHP Server**:
```bash
cd basic_html
php -S localhost:8000
# Access at http://localhost:8000
```

### Production Environment

**Environment Variables** (optional):
```bash
# Set these in your server environment
export ENV_SUPABASE_URL="https://your-project.supabase.co"
export ENV_SUPABASE_ANON_KEY="your-api-key"
export ENV_PROXY_URL="https://your-domain.com/gsheet"
```

## Security Configuration

### File Permissions

```bash
# Secure file permissions
find . -type f -name "*.php" -exec chmod 644 {} \;
find . -type f -name "*.html" -exec chmod 644 {} \;
find . -type f -name "*.js" -exec chmod 644 {} \;
chmod 755 data/
chmod 644 data/*
```

### PHP Security

Add to your `php.ini` or `.htaccess`:

```ini
# Disable dangerous functions
disable_functions = exec,passthru,shell_exec,system

# Limit file uploads
upload_max_filesize = 10M
post_max_size = 10M
max_execution_time = 30
```

### Web Server Security

**Apache (.htaccess)**:
```apache
# Prevent direct access to data files
<Files "*.json">
    Order Deny,Allow
    Deny from all
</Files>

# Prevent directory browsing
Options -Indexes

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

## Testing Checklist

### Basic Functionality

- [ ] App loads without JavaScript errors
- [ ] Admin panel opens and closes properly
- [ ] Data source can be selected and configured
- [ ] Settings can be saved and applied
- [ ] Color changes are applied immediately

### Data Source Testing

**CSV Source**:
- [ ] File upload works
- [ ] Data displays correctly
- [ ] Multi-device sync works
- [ ] File status shows correctly

**Google Sheets Source**:
- [ ] Connection test passes
- [ ] Data loads from sheet
- [ ] Polling updates work
- [ ] CORS issues resolved (if any)

**Supabase Source**:
- [ ] Connection test passes
- [ ] Data loads from database
- [ ] Real-time updates work
- [ ] Check-in updates persist

### Multi-Device Testing

- [ ] Open app on 2+ devices
- [ ] Check in attendee on Device A
- [ ] Verify update appears on Device B
- [ ] Test with different data sources
- [ ] Verify search and filtering work

### Performance Testing

- [ ] App loads quickly (< 3 seconds)
- [ ] Large attendee lists (500+ people) work smoothly
- [ ] Mobile performance is acceptable
- [ ] No memory leaks during extended use

## Troubleshooting

### Common Installation Issues

**"File not found" errors**:
- Check file paths and permissions
- Verify all files are uploaded
- Ensure web server is configured correctly

**PHP errors**:
- Verify PHP is installed and enabled
- Check PHP error logs
- Ensure `csv-handler.php` has correct permissions

**CORS errors**:
- Configure CORS headers in your web server
- Use HTTPS for production
- Check browser console for specific errors

**Database connection errors**:
- Verify Supabase project is active
- Check API key and URL
- Ensure table was created correctly

### Getting Help

1. **Check logs**: Look at web server and PHP error logs
2. **Browser console**: Check for JavaScript errors
3. **Network tab**: Verify API calls are working
4. **Test connections**: Use admin panel test buttons

### Performance Optimization

**For large events (1000+ attendees)**:
- Use Supabase for better performance
- Enable gzip compression
- Use a CDN for static files
- Consider database indexing

**For multiple concurrent users**:
- Use Supabase for real-time sync
- Implement rate limiting
- Monitor server resources
- Consider load balancing

## Backup and Recovery

### Data Backup

**CSV Source**:
- Backup the `data/` directory
- Include `attendees.json` and `metadata.json`

**Supabase Source**:
- Use Supabase dashboard backup features
- Export data regularly
- Keep API keys secure

**Google Sheets Source**:
- Google handles backup automatically
- Export sheets periodically
- Keep sharing settings documented

### Recovery Procedures

1. **Restore files** from backup
2. **Verify permissions** are correct
3. **Test data source** connection
4. **Verify multi-device sync** works
5. **Check admin panel** functionality

## Maintenance

### Regular Tasks

- **Monitor** server resources and performance
- **Backup** data regularly (daily for important events)
- **Update** dependencies as needed
- **Test** functionality before major events
- **Review** security settings periodically

### Updates

- **Download** new versions when available
- **Test** updates in development environment first
- **Backup** current installation before updating
- **Verify** all features work after update

---

**Need help?** Check the README.md file for detailed usage instructions, or review the troubleshooting section above.
