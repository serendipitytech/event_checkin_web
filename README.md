# Event Check-in System

A modern, configurable event check-in application that supports multiple data sources and real-time synchronization. Perfect for conferences, banquets, and any event requiring attendee check-in management.

## Features

- **Multiple Data Sources**: CSV uploads, Google Sheets sync, or Supabase database
- **Real-time Updates**: Live synchronization across multiple devices
- **Admin Panel**: Easy configuration of event details, colors, and data sources
- **Search & Filter**: Quick attendee lookup with multiple sorting options
- **Mobile Responsive**: Works perfectly on phones, tablets, and desktops
- **Bulk Operations**: Reset all check-ins, export reports, and more

## Quick Start

1. **Download** all files to your web server
2. **Configure** your data source in the admin panel (⚙️ button)
3. **Upload** your attendee list or connect to your data source
4. **Start** checking in attendees!

## Data Source Options

### Option 1: CSV File Upload (Recommended for Simple Setup)

**Best for**: Events with a single attendee list that doesn't change frequently.

**Setup**:
1. Prepare your CSV file with columns: `Table Number`, `Group Name`, `Attendee Name`, `Ticket Type`
2. Go to Admin Panel → Data Source → Select "CSV File"
3. Upload your CSV file
4. The file will be stored on your server and synced across all devices

**Requirements**: PHP-enabled web server

### Option 2: Google Sheets (Best for Collaborative Lists)

**Best for**: Events where multiple people need to update the attendee list.

**Setup**:
1. Create a Google Sheet with your attendee data
2. Publish the sheet: File → Share → Publish to web → CSV format
3. Go to Admin Panel → Data Source → Select "Google Sheets"
4. Enter your published sheet URL
5. The app will automatically sync every 5 seconds

**Required Format**:
```
Table Number | Group Name | Attendee Name | Ticket Type
Table 1     | VIP        | John Smith    | VIP Ticket
Table 2     | General    | Jane Doe      | Standard
```

### Option 3: Supabase Database (Most Powerful)

**Best for**: Events requiring real-time updates and advanced features.

**Setup**:
1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the provided setup SQL (see `supabase-setup.sql`)
4. Go to Admin Panel → Data Source → Select "Supabase Database"
5. Enter your project URL and API key

**Benefits**:
- Real-time updates across all devices
- No polling delays
- Advanced data management
- Built-in backup and recovery

## Configuration

### Admin Panel Access

Click the ⚙️ settings button in the top-right corner to access the admin panel.

### Event Settings

- **Event Title**: Change the main heading
- **Event Subtitle**: Update the subtitle text
- **Primary Color**: Customize the app's color scheme

### Data Source Configuration

Each data source has specific settings:

**CSV Settings**:
- Upload new CSV files
- View current file status
- Configure polling interval

**Google Sheets Settings**:
- Enter sheet URL
- Test connection
- Configure polling interval
- Set proxy URL (if needed)

**Supabase Settings**:
- Project URL
- API key
- Table name
- Test connection

### Features

Toggle these features on/off:
- **Bulk Actions**: Enable bulk check-in operations
- **Export Reports**: Allow data export
- **Real-time Sync**: Enable live updates (Supabase only)
- **Statistics**: Show/hide attendee counts

## Data Format Requirements

Your attendee data should include these columns (in any order):

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| Table Number | No | Table or section assignment | "Table 1", "VIP Section" |
| Group Name | No | Group or organization | "VIP Sponsors", "Tech Partners" |
| Attendee Name | Yes | Full name of attendee | "John Smith" |
| Ticket Type | No | Type of ticket or admission | "VIP", "Standard", "Complimentary" |

**Note**: At least one of Table Number, Group Name, or Attendee Name must be provided for each row.

## Usage

### Checking In Attendees

1. **Search**: Use the search bar to find specific attendees
2. **Sort**: Click column headers to sort by name, table, group, or ticket type
3. **Check In**: Click the "Check In" button next to any attendee
4. **Undo**: Click "Undo" to reverse a check-in

### Managing Data

- **Refresh**: Click "Refresh Event Data" to reload from your data source
- **Reset**: Use "Reset All Check-Ins" to mark everyone as pending
- **Upload**: Replace data by uploading a new file (CSV source)

### Multi-Device Sync

- **CSV**: Updates every 5 seconds automatically
- **Google Sheets**: Polls for changes every 5 seconds
- **Supabase**: Real-time updates with no delay

## Troubleshooting

### Common Issues

**"No data source configured"**
- Go to Admin Panel and select a data source
- Configure the required settings for your chosen source

**"Connection failed"**
- Check your internet connection
- Verify your data source settings
- For Google Sheets, ensure the sheet is published publicly
- For Supabase, verify your URL and API key

**"File upload failed"**
- Ensure your server supports PHP
- Check file permissions on the `data/` directory
- Verify the file is in CSV or XLSX format

**"CORS error" with Google Sheets**
- Use the proxy URL setting in Google Sheets configuration
- Or publish your sheet with different sharing settings

### Performance Tips

- **Large Lists**: For 1000+ attendees, consider using Supabase for better performance
- **Slow Loading**: Check your internet connection and server response times
- **Mobile Usage**: The app is optimized for mobile, but very large lists may be slower

## Security Notes

### Production Deployment

- **HTTPS**: Always use HTTPS in production
- **File Permissions**: Ensure proper permissions on uploaded files
- **API Keys**: Never expose Supabase API keys in client-side code
- **CORS**: Configure CORS headers appropriately for your domain

### Data Privacy

- **Local Storage**: Settings are stored in browser localStorage
- **File Storage**: CSV files are stored on your server
- **Database**: Supabase provides enterprise-grade security
- **Google Sheets**: Data remains in your Google account

## File Structure

```
basic_html/
├── index.html              # Main application
├── config.js               # Configuration system
├── data-sources.js         # Data source management
├── admin-panel.js          # Admin interface
├── gsheet-integration.js   # Google Sheets integration
├── csv-handler.php         # CSV upload handler
├── supabase-setup.sql      # Database setup script
├── README.md               # This file
└── data/                   # CSV storage directory (auto-created)
```

## Support

### Getting Help

1. **Check the Admin Panel**: Most issues can be resolved through configuration
2. **Test Connections**: Use the "Test Connection" buttons in the admin panel
3. **Browser Console**: Check for error messages in your browser's developer tools
4. **File Permissions**: Ensure your web server can write to the `data/` directory

### Common Solutions

**App won't load**:
- Check that all files are uploaded correctly
- Verify your web server supports the required technologies
- Ensure JavaScript is enabled in your browser

**Data not syncing**:
- Verify your data source configuration
- Check your internet connection
- For Google Sheets, ensure the sheet is published publicly
- For Supabase, verify your project is active

**Upload errors**:
- Check file format (CSV or XLSX)
- Verify file size (under 10MB)
- Ensure PHP is enabled on your server
- Check directory permissions

## License

This application is provided as-is for event management purposes. Feel free to modify and distribute according to your needs.

---

**Need more help?** Check the admin panel for configuration options, or review the troubleshooting section above.
