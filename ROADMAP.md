# Event Check-in System - Product Roadmap

**Version:** 1.0.0
**Last Updated:** 2026-01-23
**Project Type:** HTML/CSS/JavaScript Web Application
**Status:** Active Development - Approaching MVP

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema](#database-schema)
4. [Feature Priority Matrix](#feature-priority-matrix)
5. [Version Milestones](#version-milestones)
6. [Implementation Status](#implementation-status)
7. [Technical Decisions](#technical-decisions)

---

## 🎯 Project Overview

### Mission
Create a lightweight, secure, and user-friendly event check-in system that works seamlessly across devices without requiring complex build tools or frameworks.

### Vision
The go-to solution for event organizers who need a simple, reliable check-in system that "just works" - deployable to any web server with minimal setup.

### Target Users
- **Event Organizers** - Setting up check-in for conferences, galas, workshops
- **Volunteers** - Operating check-in stations at event entrances
- **Administrators** - Managing attendee lists and event configuration

### Key Differentiators
- ✅ **Zero Build Tools** - Pure HTML/CSS/JavaScript
- ✅ **Multiple Data Sources** - CSV, Google Sheets, or Supabase
- ✅ **Real-time Sync** - Multi-device coordination
- ✅ **Security First** - XSS/SQL injection prevention, secure auth
- ✅ **Mobile Responsive** - Works on any device
- ✅ **Easy Deployment** - Upload and go

---

## 🏗️ Technical Architecture

### Frontend Stack
```
├── HTML5 - Semantic structure
├── CSS3 - Custom properties for theming
├── Vanilla JavaScript - No frameworks
│   ├── email-validation.js (TDD, 26 tests)
│   ├── supabase-auth.js (Authentication)
│   ├── data-sources.js (CSV/Sheets/Supabase)
│   ├── admin-panel.js (Configuration UI)
│   └── config.js (Settings management)
└── Test Runner - Browser-based testing
```

### Backend Services
```
├── Supabase
│   ├── PostgreSQL Database (event_checkin schema)
│   ├── Realtime Subscriptions
│   └── Auth (Magic Link)
├── Google Sheets API (optional)
│   └── Attendee data import
└── PHP Backend (optional, for CSV)
    └── csv-handler.php
```

### Data Flow
```
User Action → Frontend Logic → Data Source → PostgreSQL/Sheets/CSV
                 ↓                              ↓
            Real-time Sync ←─────────────── Supabase Realtime
                 ↓
            Multi-Device Update
```

### Security Layers
1. **Input Validation** - Email validation, XSS prevention
2. **Authentication** - Supabase Auth with magic links
3. **Authorization** - Row Level Security (RLS) policies
4. **Transport** - HTTPS in production
5. **Output Escaping** - HTML entity encoding

---

## 🗄️ Database Schema

### Schema Configuration
- **Schema Name:** `event_checkin`
- **Database:** PostgreSQL (via Supabase)
- **Always use prefix:** `event_checkin.tablename`

### Role Permissions
```sql
-- anon: SELECT on tables, EXECUTE on functions
-- authenticated: SELECT, INSERT, UPDATE, DELETE on tables
-- service_role: Full access (bypasses RLS)
```

### Core Tables

#### 1. `event_checkin.attendees`
Primary table for storing attendee information and check-in status.

```sql
CREATE TABLE event_checkin.attendees (
    id BIGSERIAL PRIMARY KEY,

    -- Attendee Information
    attendee_name TEXT NOT NULL,
    email TEXT,
    table_number TEXT,
    group_name TEXT,
    ticket_type TEXT,

    -- Check-in Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'checked-in')),
    checked_in_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    row_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Future: Link to events table
    event_id BIGINT, -- Will be foreign key in v1.1

    -- Indexes
    CONSTRAINT attendees_email_check CHECK (
        email IS NULL OR
        email ~* '^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
);

-- Indexes for performance
CREATE INDEX idx_attendees_status ON event_checkin.attendees(status);
CREATE INDEX idx_attendees_name ON event_checkin.attendees(attendee_name);
CREATE INDEX idx_attendees_email ON event_checkin.attendees(email) WHERE email IS NOT NULL;
CREATE INDEX idx_attendees_event_id ON event_checkin.attendees(event_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION event_checkin.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendees_updated_at
    BEFORE UPDATE ON event_checkin.attendees
    FOR EACH ROW
    EXECUTE FUNCTION event_checkin.update_updated_at_column();
```

#### 2. `event_checkin.events` (Planned for v1.1)
Manage multiple events within the same system.

```sql
CREATE TABLE event_checkin.events (
    id BIGSERIAL PRIMARY KEY,

    -- Event Details
    event_name TEXT NOT NULL,
    event_subtitle TEXT,
    event_date DATE,
    event_time TIME,
    event_location TEXT,

    -- Customization
    primary_color TEXT DEFAULT '#5ac1ee',

    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

    -- Metadata
    created_by BIGINT, -- Links to admin user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Settings (JSON)
    settings JSONB DEFAULT '{}'::jsonb
);

-- Add foreign key to attendees
ALTER TABLE event_checkin.attendees
    ADD CONSTRAINT fk_attendees_event
    FOREIGN KEY (event_id) REFERENCES event_checkin.events(id)
    ON DELETE CASCADE;
```

#### 3. `event_checkin.check_in_log` (Planned for v1.1)
Audit trail for all check-in activities.

```sql
CREATE TABLE event_checkin.check_in_log (
    id BIGSERIAL PRIMARY KEY,

    -- References
    attendee_id BIGINT NOT NULL REFERENCES event_checkin.attendees(id) ON DELETE CASCADE,
    event_id BIGINT REFERENCES event_checkin.events(id) ON DELETE CASCADE,

    -- Action Details
    action TEXT NOT NULL CHECK (action IN ('check-in', 'undo', 'reset')),
    previous_status TEXT,
    new_status TEXT NOT NULL,

    -- Metadata
    performed_by TEXT, -- User email or identifier
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Index for audit queries
CREATE INDEX idx_check_in_log_attendee ON event_checkin.check_in_log(attendee_id);
CREATE INDEX idx_check_in_log_event ON event_checkin.check_in_log(event_id);
CREATE INDEX idx_check_in_log_timestamp ON event_checkin.check_in_log(performed_at);
```

#### 4. `event_checkin.admin_users` (Planned for v1.2)
Track admin users (currently handled by Supabase Auth only).

```sql
CREATE TABLE event_checkin.admin_users (
    id BIGSERIAL PRIMARY KEY,

    -- Auth Integration
    auth_user_id UUID NOT NULL UNIQUE, -- Links to auth.users

    -- Profile
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'organizer', 'volunteer')),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);
```

### Row Level Security (RLS) Policies

#### Attendees Table RLS
```sql
-- Enable RLS
ALTER TABLE event_checkin.attendees ENABLE ROW LEVEL SECURITY;

-- Anon users can only read
CREATE POLICY "Anon users can view attendees"
    ON event_checkin.attendees
    FOR SELECT
    TO anon
    USING (true);

-- Authenticated users can read and update
CREATE POLICY "Authenticated users can view attendees"
    ON event_checkin.attendees
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update check-in status"
    ON event_checkin.attendees
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can insert attendees"
    ON event_checkin.attendees
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendees"
    ON event_checkin.attendees
    FOR DELETE
    TO authenticated
    USING (true);
```

#### Events Table RLS (v1.1)
```sql
-- Enable RLS
ALTER TABLE event_checkin.events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all events
CREATE POLICY "Authenticated users can view events"
    ON event_checkin.events
    FOR SELECT
    TO authenticated
    USING (true);

-- Only creators can modify their events
CREATE POLICY "Users can update their own events"
    ON event_checkin.events
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);
```

### Database Functions

#### Reset All Check-ins
```sql
CREATE OR REPLACE FUNCTION event_checkin.reset_all_checkins(p_event_id BIGINT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    IF p_event_id IS NOT NULL THEN
        -- Reset for specific event
        UPDATE event_checkin.attendees
        SET status = 'pending',
            checked_in_at = NULL,
            updated_at = NOW()
        WHERE event_id = p_event_id
          AND status = 'checked-in';
    ELSE
        -- Reset all
        UPDATE event_checkin.attendees
        SET status = 'pending',
            checked_in_at = NULL,
            updated_at = NOW()
        WHERE status = 'checked-in';
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION event_checkin.reset_all_checkins TO authenticated;
```

#### Get Event Statistics
```sql
CREATE OR REPLACE FUNCTION event_checkin.get_event_stats(p_event_id BIGINT DEFAULT NULL)
RETURNS TABLE (
    total_attendees BIGINT,
    checked_in BIGINT,
    pending BIGINT,
    check_in_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_attendees,
        COUNT(*) FILTER (WHERE status = 'checked-in')::BIGINT AS checked_in,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending,
        ROUND(
            (COUNT(*) FILTER (WHERE status = 'checked-in')::NUMERIC /
             NULLIF(COUNT(*), 0)::NUMERIC) * 100,
            2
        ) AS check_in_rate
    FROM event_checkin.attendees
    WHERE p_event_id IS NULL OR event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION event_checkin.get_event_stats TO authenticated, anon;
```

---

## 📊 Feature Priority Matrix

### P0 - MVP (Must Have for v1.0)
**Target:** Week of January 27, 2026

| Feature | Status | Notes |
|---------|--------|-------|
| ✅ Email validation | Complete | 26 tests, XSS/SQL injection prevention |
| ✅ Supabase authentication | Complete | Magic link login |
| ✅ Google Sheets integration | Complete | With proxy support |
| ✅ Database schema setup | Complete | `event_checkin` schema created |
| ✅ Multiple data sources | Complete | CSV, Sheets, Supabase |
| ✅ Admin panel | Complete | Configuration UI |
| 🚧 Check-in interface | In Progress | Code exists, needs testing |
| 🚧 Attendee list display | In Progress | Real-time updates partial |
| 📝 Search and filtering | Planned | Search by name, filter by status |
| 📝 Basic statistics | Planned | Total, checked-in, pending counts |
| 📝 Manual check-in/undo | Planned | Click to check-in, undo action |

### P1 - Enhanced (Should Have for v1.1-1.2)
**Target:** February-March 2026

| Feature | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| Event management (CRUD) | High | M | Database schema v1.1 |
| Attendee management (CRUD) | High | M | Event management |
| Check-in audit log | High | S | Database schema v1.1 |
| CSV export | Medium | S | None |
| PDF reports | Medium | M | CSV export |
| Multi-event switching | High | M | Event management |
| Bulk operations | Medium | S | Current check-in flow |
| Advanced search | Medium | S | Basic search |
| User roles | Medium | L | Admin users table |

### P2 - Advanced (Nice to Have for v2.0+)
**Target:** Q2 2026

| Feature | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| Offline support (PWA) | High | L | Service Worker |
| QR code check-in | Medium | M | Camera API |
| Badge printing | Low | M | PDF generation |
| Analytics dashboard | Medium | L | Data aggregation |
| Custom branding per event | Low | M | Event settings |
| Email notifications | Medium | M | Email service |
| SMS notifications | Low | M | SMS service |
| API for integrations | Medium | L | Authentication |

**Effort Sizing:**
- **S (Small):** 1-2 days
- **M (Medium):** 3-5 days
- **L (Large):** 1-2 weeks

---

## 🎯 Version Milestones

### v0.9 - Current (Pre-MVP)
**Status:** Active Development
**Completion:** ~85%

**Completed:**
- ✅ Email validation with comprehensive security
- ✅ Supabase Auth integration
- ✅ Multiple data source support
- ✅ Admin panel UI
- ✅ Database schema designed
- ✅ Google Sheets proxy for development

**In Progress:**
- 🚧 Check-in flow testing
- 🚧 Real-time sync verification
- 🚧 Database migration to new schema

**Blockers:**
- Need to migrate existing Supabase tables to new schema
- Real-time subscriptions need testing with new schema

### v1.0 - MVP Release
**Target:** Week of January 27, 2026
**Goal:** Production-ready single-event check-in system

**Must Complete:**
- [ ] Migrate database to `event_checkin` schema
- [ ] Complete check-in flow implementation
- [ ] Test real-time sync across devices
- [ ] Implement basic search and filtering
- [ ] Add statistics display
- [ ] Complete E2E testing with Playwright
- [ ] Security audit pass
- [ ] Documentation update
- [ ] Deployment guide

**Success Criteria:**
- Can check in 100+ attendees reliably
- Real-time sync works across 3+ devices
- Zero XSS/injection vulnerabilities
- Mobile-responsive on iOS and Android
- Load time < 3 seconds

### v1.1 - Multi-Event Support
**Target:** February 2026
**Goal:** Manage multiple events in one system

**Features:**
- [ ] Create/edit/delete events
- [ ] Event selection interface
- [ ] Event-specific attendee lists
- [ ] Basic event dashboard
- [ ] Check-in audit log

**Database Changes:**
- Add `events` table
- Add `event_id` to attendees
- Add `check_in_log` table
- Update RLS policies

### v1.2 - Enhanced Management
**Target:** March 2026
**Goal:** Advanced attendee and data management

**Features:**
- [ ] Attendee CRUD operations
- [ ] CSV/PDF export functionality
- [ ] Bulk check-in operations
- [ ] Advanced search and filters
- [ ] User role management

**Infrastructure:**
- [ ] Automated backups
- [ ] Performance monitoring
- [ ] Error tracking

### v2.0 - Advanced Features
**Target:** Q2 2026
**Goal:** Enterprise-ready with offline support

**Major Features:**
- [ ] Progressive Web App (PWA)
- [ ] Offline check-in capability
- [ ] QR code scanning
- [ ] Analytics dashboard
- [ ] API for integrations

---

## 📈 Implementation Status

### Completed Features ✅

#### Email Validation System
- **File:** `email-validation.js`
- **Tests:** 26 comprehensive test cases
- **Features:**
  - RFC 5321 compliant validation
  - XSS attack prevention
  - SQL injection prevention
  - HTML entity escaping
  - Multi-email validation
- **Documentation:** `Projects/Event Check-in Email Validation Feature.md`

#### Supabase Authentication
- **File:** `supabase-auth.js`
- **Features:**
  - Magic link email authentication
  - Session management
  - Password reset
  - Secure password hashing (server-side)
- **Documentation:** `Projects/Supabase Auth Setup Guide.md`

#### Data Source Management
- **File:** `data-sources.js`
- **Supported Sources:**
  - CSV file upload with PHP backend
  - Google Sheets with proxy support
  - Supabase realtime database
- **Features:**
  - Unified data interface
  - Automatic polling
  - Real-time subscriptions
  - Check-in sync across sources

#### Admin Panel
- **File:** `admin-panel.js`
- **Features:**
  - Event customization
  - Color scheme editor
  - Data source configuration
  - Feature toggles

#### Database Schema
- **Schema:** `event_checkin`
- **Migration:** `create_event_checkin_schema` (2026-01-23)
- **Permissions:** Configured for all roles

### In Progress 🚧

#### Check-in Interface
- **Status:** Code exists, needs integration testing
- **Tasks:**
  - [ ] Test check-in button functionality
  - [ ] Verify status updates
  - [ ] Test undo functionality
  - [ ] Validate multi-device sync

#### Real-time Sync
- **Status:** Partial implementation
- **Tasks:**
  - [ ] Set up Supabase Realtime with new schema
  - [ ] Test subscription handling
  - [ ] Verify cross-device updates
  - [ ] Handle connection drops

### Planned 📝

#### Event Management (v1.1)
- Create new events
- Edit event details
- Delete events
- Event selection interface

#### Attendee Management (v1.1)
- Add attendees manually
- Edit attendee information
- Delete attendees
- Import from CSV/Sheets

#### Audit Logging (v1.1)
- Track all check-in actions
- Store IP and user agent
- Audit report generation

#### Export Functionality (v1.2)
- CSV export of attendee list
- PDF report generation
- Filtered export options

---

## 🤔 Technical Decisions

### Architecture Decisions

#### 1. No Build Tools
**Decision:** Use vanilla JavaScript without webpack/rollup/vite

**Rationale:**
- Maximum portability
- Minimal dependencies
- Easy deployment (just upload files)
- No build step = faster development

**Trade-offs:**
- No module bundling
- Larger initial payload
- Manual dependency management

**Status:** ✅ Confirmed

#### 2. PostgreSQL Schema Isolation
**Decision:** Use `event_checkin` schema instead of `public`

**Rationale:**
- Clear separation from other projects
- Easier to manage permissions
- Prevents naming conflicts
- Better for multi-tenant scenarios

**Implementation:**
- All tables prefixed with `event_checkin.`
- Default privileges configured
- RLS policies per schema

**Status:** ✅ Implemented

#### 3. Multiple Data Source Support
**Decision:** Support CSV, Google Sheets, and Supabase

**Rationale:**
- Flexibility for different use cases
- Easy migration path (start with CSV, upgrade to Supabase)
- Offline capability with CSV
- Collaboration with Google Sheets

**Complexity:**
- Abstract data source interface
- Separate check-in sync logic
- Different polling strategies

**Status:** ✅ Implemented

#### 4. Client-Side Authentication Only
**Decision:** Use Supabase Auth without custom backend

**Rationale:**
- Secure without building auth system
- Magic links for better UX
- Session management handled by Supabase
- Reduced maintenance burden

**Limitations:**
- Dependent on Supabase availability
- Limited customization
- Must trust Supabase security

**Status:** ✅ Implemented

#### 5. Test-Driven Development for Security
**Decision:** TDD approach for email validation and security features

**Rationale:**
- Prevent regression
- Document expected behavior
- Catch edge cases early
- Build confidence in security

**Implementation:**
- Browser-based test runner
- 26 tests for email validation
- Security-focused test cases

**Status:** ✅ Implemented

### Data Model Decisions

#### 1. Single Table for MVP
**Decision:** Start with single `attendees` table

**Rationale:**
- Simpler to implement and test
- Faster to MVP
- Easy to query

**Future Migration:**
- Add `events` table in v1.1
- Add `event_id` foreign key
- Maintain backward compatibility

**Status:** ✅ Implemented

#### 2. Status as Enum
**Decision:** Use TEXT with CHECK constraint instead of ENUM type

**Rationale:**
- More flexible (can add values)
- Better PostgreSQL compatibility
- Clearer error messages

**Values:** `pending`, `checked-in`

**Status:** ✅ Implemented

#### 3. Audit Log Separate Table
**Decision:** Dedicated `check_in_log` table instead of triggers

**Rationale:**
- More control over what's logged
- Better performance (no trigger overhead)
- Easier to query audit data
- Can add metadata (IP, user agent)

**Status:** 📝 Planned for v1.1

### Security Decisions

#### 1. Row Level Security (RLS)
**Decision:** Enable RLS on all tables

**Rationale:**
- Defense in depth
- Protect against SQL injection
- Granular access control
- Supabase best practice

**Policies:**
- Anon: Read-only
- Authenticated: Full CRUD
- Service role: Bypass RLS

**Status:** 📝 Pending schema migration

#### 2. Input Validation
**Decision:** Comprehensive client-side validation

**Rationale:**
- Better UX (immediate feedback)
- Reduce server load
- Catch errors early

**Note:** Server-side validation still required

**Status:** ✅ Email validation complete

#### 3. HTTPS Only in Production
**Decision:** Require HTTPS for production deployments

**Rationale:**
- Protect auth tokens
- Prevent MITM attacks
- Required for PWA features

**Status:** 📋 In deployment guide

### UX Decisions

#### 1. Real-time vs Polling
**Decision:** Support both based on data source

**Rationale:**
- Supabase: Real-time subscriptions
- CSV/Sheets: Polling with configurable interval
- Best performance for each source

**Trade-off:** More complex implementation

**Status:** ✅ Implemented

#### 2. Mobile-First Design
**Decision:** Optimize for mobile devices first

**Rationale:**
- Primary use case is tablet/phone at event entrance
- Easier to scale up than down
- Better accessibility

**Implementation:**
- Responsive CSS
- Touch-friendly buttons
- Readable fonts

**Status:** ✅ Implemented

#### 3. Color Customization
**Decision:** Allow event-specific colors

**Rationale:**
- Branding requirements
- Event identity
- User delight

**Implementation:**
- CSS custom properties
- Admin panel color picker
- Real-time preview

**Status:** ✅ Implemented

---

## 📚 Related Documentation

### Project Files
- `README.md` - User-facing documentation
- `INSTALLATION.md` - Deployment guide
- `TESTING.md` - Test strategy and Playwright integration
- `.claude/CLAUDE.md` - Claude Code configuration

### Obsidian Vault
- `Projects/Event Checkin/Event Checkin - Basic HTML Web App.md` - Project overview
- `Projects/Event Check-in Email Validation Feature.md` - Email validation details
- `Projects/Supabase Auth Setup Guide.md` - Authentication setup
- `Claude-Code-Setup/08 - Supabase MCP Guide.md` - Database configuration

### Feature Plans (`.claude/plans/`)
- `01-check-in-interface.md` - Complete check-in flow
- `02-event-management.md` - CRUD operations for events
- `03-attendee-management.md` - CRUD operations for attendees

---

## 🔄 Change Log

### 2026-01-23
- Created comprehensive roadmap
- Documented database schema requirements
- Defined feature priority matrix
- Established version milestones
- Recorded technical decisions
- Created `event_checkin` schema in Supabase

### Next Updates
- Track migration progress to new schema
- Update implementation status as features complete
- Add performance benchmarks
- Document deployment procedures

---

**Maintained by:** Troy Shimkus
**Review Schedule:** Weekly during active development
**Feedback:** Update this document as decisions are made
