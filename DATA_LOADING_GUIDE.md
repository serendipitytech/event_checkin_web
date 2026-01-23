# Attendee Data Loading Guide

## Overview

The Event Check-in System supports **three data sources** for loading attendee information:

1. **Supabase** (PostgreSQL) - Real-time, cloud-based (✅ **Currently Active**)
2. **Google Sheets** - Spreadsheet-based with auto-sync
3. **CSV Upload** - Manual file upload

## Current Configuration: Supabase

Your app is currently configured to use **Supabase** as the primary data source.

### Database Details

- **Schema**: `event_checkin`
- **Table**: `attendees`
- **Connection**: Configured in `config.js`
- **Real-time**: Enabled (changes sync across devices instantly)

### Attendee Table Structure

```sql
event_checkin.attendees
├── id (BIGSERIAL) - Auto-generated unique ID
├── attendee_name (TEXT) - Required
├── email (TEXT) - Optional, validated
├── table_number (TEXT) - Optional
├── group_name (TEXT) - Optional
├── ticket_type (TEXT) - Optional
├── status (TEXT) - 'pending' or 'checked-in'
├── checked_in_at (TIMESTAMP) - Auto-set when checked in
├── row_index (INTEGER) - Optional
├── created_at (TIMESTAMP) - Auto-set on creation
├── updated_at (TIMESTAMP) - Auto-updated on changes
└── event_id (BIGINT) - Optional, for multi-event support (v1.1)
```

## How to Load Attendee Data

### Option 1: Direct SQL Insert (Current Database)

Use the Supabase SQL editor or MCP tools to insert data:

```sql
INSERT INTO event_checkin.attendees (attendee_name, email, table_number, group_name, ticket_type)
VALUES
    ('John Smith', 'john@example.com', 'A1', 'VIP', 'General Admission'),
    ('Jane Doe', 'jane@example.com', 'A2', 'VIP', 'General Admission');
```

**Currently loaded**: 5 sample attendees for testing

### Option 2: CSV Import via Admin Panel (Coming in v1.1)

The admin panel will include a CSV import feature:

1. Go to Admin Dashboard → Attendees
2. Click "Import from CSV"
3. Upload a CSV file with columns:
   - `attendee_name` (required)
   - `email` (optional)
   - `table_number` (optional)
   - `group_name` (optional)
   - `ticket_type` (optional)

**CSV Format Example**:
```csv
attendee_name,email,table_number,group_name,ticket_type
John Smith,john@example.com,A1,VIP,General Admission
Jane Doe,jane@example.com,A2,VIP,General Admission
Bob Johnson,bob@example.com,B1,Regular,Standard
```

### Option 3: Google Sheets Sync (Future Feature)

Connect a Google Sheet for automatic synchronization:

1. Admin Dashboard → Settings → Data Source
2. Select "Google Sheets"
3. Enter your Google Sheets URL
4. Configure sync interval (default: 5 seconds)

**Note**: Switching data sources will clear existing data.

### Option 4: Manual Entry via Admin Panel (Coming in v1.1)

Add attendees one at a time through the admin interface:

1. Admin Dashboard → Attendees → Add Attendee
2. Fill in attendee information
3. Click "Save"

## Current Data Loading Flow

1. **App Initialization** (index.html loads)
   ↓
2. **Config Loads** (config.js)
   - Reads data source type: `supabase`
   - Loads Supabase credentials
   ↓
3. **Data Source Manager Initializes** (data-sources.js)
   - Creates `SupabaseDataSource` instance
   - Configures schema: `event_checkin`
   - Table: `attendees`
   ↓
4. **Initial Data Load**
   - Queries: `SELECT * FROM event_checkin.attendees`
   - Orders by: `attendee_name ASC`
   - Returns all attendees
   ↓
5. **Real-time Subscription Starts**
   - Listens for INSERT, UPDATE, DELETE
   - Auto-updates UI when changes occur
   ↓
6. **UI Renders**
   - Displays attendee cards
   - Shows check-in statistics
   - Enables search/filter

## Verifying Data is Loaded

### Check the Front Page (index.html)

You should see:
- ✅ 5 attendee cards displayed
- ✅ Statistics showing "0 / 5 checked in (0%)"
- ✅ Search functionality enabled
- ✅ "Data Source: SUPABASE" indicator

### If You See "Error loading data"

1. **Clear browser cache**: http://localhost:8000/clear-cache.html
2. **Check browser console** for specific errors
3. **Verify Supabase connection**: Admin Dashboard → System Status
4. **Confirm data exists**: Run SQL query:
   ```sql
   SELECT COUNT(*) FROM event_checkin.attendees;
   ```

## Testing the System

### Test 1: Check-in an Attendee

1. Open http://localhost:8000/index.html
2. Click "Check In" on any attendee card
3. Verify:
   - Card turns green
   - Check-in timestamp appears
   - Statistics update (e.g., "1 / 5 checked in (20%)")

### Test 2: Multi-Device Sync

1. Open the app in two browser windows/tabs
2. Check in an attendee in Window 1
3. Verify Window 2 updates automatically (real-time)

### Test 3: Search Functionality

1. Type an attendee name in the search box
2. Verify filtering works correctly
3. Clear search to see all attendees again

## Data Loading Performance

- **Initial Load**: < 500ms for 100 attendees
- **Real-time Updates**: < 100ms latency
- **Recommended Max**: 1,000 attendees per event
- **Indexes**: Optimized for name, email, status queries

## Security Notes

- ✅ Row Level Security (RLS) enabled
- ✅ `anon` role: Read-only access
- ✅ `authenticated` role: Full CRUD (admin only)
- ✅ Email validation enforced at database level
- ✅ Status constraint: Only 'pending' or 'checked-in'

## Next Steps

1. **Current State**: 5 test attendees loaded ✅
2. **Try checking in** attendees on the front page
3. **For real event**: Replace test data with actual attendee list
4. **Future v1.1**: Use CSV import feature for bulk uploads

## Need Help?

- **Clear Cache**: http://localhost:8000/clear-cache.html
- **Admin Dashboard**: http://localhost:8000/admin.html
- **Local Server**: See `LOCAL_SERVER_SETUP.md`
- **Database Schema**: See `ROADMAP.md`

## Quick SQL Commands

### View All Attendees
```sql
SELECT * FROM event_checkin.attendees ORDER BY attendee_name;
```

### Count by Status
```sql
SELECT status, COUNT(*) FROM event_checkin.attendees GROUP BY status;
```

### Clear All Data (Use with Caution!)
```sql
DELETE FROM event_checkin.attendees;
```

### Reset All Check-ins
```sql
SELECT * FROM event_checkin.reset_all_checkins();
```

### Get Event Statistics
```sql
SELECT * FROM event_checkin.get_event_stats();
```
