# Feature Plan: Event Management (CRUD Operations)

**Feature ID:** P1-001
**Priority:** P1 (v1.1 Enhancement)
**Effort:** Medium (4-5 days)
**Status:** Planned
**Owner:** Development Team
**Target Version:** v1.1

---

## 📋 User Story

**As an** event organizer,
**I want to** create, manage, and switch between multiple events in the same system,
**So that** I can run multiple check-in sessions without separate installations.

### Acceptance Criteria

- [ ] AC1: Can create a new event with name, date, time, location
- [ ] AC2: Can edit existing event details
- [ ] AC3: Can delete events (with confirmation)
- [ ] AC4: Can set custom colors per event
- [ ] AC5: Event list shows all events with status indicators
- [ ] AC6: Can switch active event from dashboard
- [ ] AC7: Attendee lists are scoped to selected event
- [ ] AC8: Event settings persist across sessions
- [ ] AC9: Cannot delete event with existing attendees (or cascade delete option)
- [ ] AC10: Event statistics show on event card

---

## 🎯 Technical Approach

### Phase 1: Database Schema
**Status:** 📝 Planned

#### 1.1 Create Events Table
**Migration:** `create_events_table.sql`

```sql
-- Create events table in event_checkin schema
CREATE TABLE IF NOT EXISTS event_checkin.events (
    id BIGSERIAL PRIMARY KEY,

    -- Event Details
    event_name TEXT NOT NULL,
    event_subtitle TEXT,
    event_date DATE,
    event_time TIME,
    event_location TEXT,
    event_description TEXT,

    -- Customization
    primary_color TEXT DEFAULT '#5ac1ee',
    secondary_color TEXT,
    logo_url TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

    -- Metadata
    created_by UUID, -- Links to auth.users.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Settings (JSON for flexibility)
    settings JSONB DEFAULT '{
        "enableRealtime": true,
        "allowPublicView": false,
        "requireEmail": false,
        "autoCompleteAt": null
    }'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_events_status ON event_checkin.events(status);
CREATE INDEX idx_events_created_by ON event_checkin.events(created_by);
CREATE INDEX idx_events_date ON event_checkin.events(event_date);

-- Updated timestamp trigger
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON event_checkin.events
    FOR EACH ROW
    EXECUTE FUNCTION event_checkin.update_updated_at_column();

-- Enable RLS
ALTER TABLE event_checkin.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can view all events
CREATE POLICY "Authenticated users can view events"
    ON event_checkin.events
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can create events
CREATE POLICY "Authenticated users can create events"
    ON event_checkin.events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Users can only update their own events
CREATE POLICY "Users can update their own events"
    ON event_checkin.events
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Users can only delete their own events
CREATE POLICY "Users can delete their own events"
    ON event_checkin.events
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);
```

#### 1.2 Link Attendees to Events
**Migration:** `link_attendees_to_events.sql`

```sql
-- Add event_id to attendees table
ALTER TABLE event_checkin.attendees
    ADD COLUMN event_id BIGINT;

-- Create foreign key with cascade
ALTER TABLE event_checkin.attendees
    ADD CONSTRAINT fk_attendees_event
    FOREIGN KEY (event_id)
    REFERENCES event_checkin.events(id)
    ON DELETE CASCADE; -- Delete attendees when event deleted

-- Index for performance
CREATE INDEX idx_attendees_event_id ON event_checkin.attendees(event_id);

-- Update RLS policies to scope by event
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view attendees" ON event_checkin.attendees;

-- Create new scoped policy
CREATE POLICY "Authenticated users can view attendees"
    ON event_checkin.attendees
    FOR SELECT
    TO authenticated
    USING (
        event_id IS NULL OR  -- Allow NULL for legacy data
        EXISTS (
            SELECT 1 FROM event_checkin.events e
            WHERE e.id = attendees.event_id
            AND e.created_by = auth.uid()
        )
    );
```

### Phase 2: Backend Functions
**Status:** 📝 Planned

#### 2.1 Create Event Function
```sql
CREATE OR REPLACE FUNCTION event_checkin.create_event(
    p_event_name TEXT,
    p_event_subtitle TEXT DEFAULT NULL,
    p_event_date DATE DEFAULT NULL,
    p_event_time TIME DEFAULT NULL,
    p_event_location TEXT DEFAULT NULL,
    p_primary_color TEXT DEFAULT '#5ac1ee',
    p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS event_checkin.events AS $$
DECLARE
    v_event event_checkin.events;
BEGIN
    INSERT INTO event_checkin.events (
        event_name,
        event_subtitle,
        event_date,
        event_time,
        event_location,
        primary_color,
        created_by,
        settings,
        status
    ) VALUES (
        p_event_name,
        p_event_subtitle,
        p_event_date,
        p_event_time,
        p_event_location,
        p_primary_color,
        auth.uid(),
        p_settings,
        'active'
    )
    RETURNING * INTO v_event;

    RETURN v_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION event_checkin.create_event TO authenticated;
```

#### 2.2 Get Event Statistics
```sql
CREATE OR REPLACE FUNCTION event_checkin.get_event_with_stats(p_event_id BIGINT)
RETURNS TABLE (
    id BIGINT,
    event_name TEXT,
    event_subtitle TEXT,
    event_date DATE,
    event_time TIME,
    event_location TEXT,
    primary_color TEXT,
    status TEXT,
    total_attendees BIGINT,
    checked_in BIGINT,
    pending BIGINT,
    check_in_rate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.event_name,
        e.event_subtitle,
        e.event_date,
        e.event_time,
        e.event_location,
        e.primary_color,
        e.status,
        COUNT(a.id)::BIGINT AS total_attendees,
        COUNT(*) FILTER (WHERE a.status = 'checked-in')::BIGINT AS checked_in,
        COUNT(*) FILTER (WHERE a.status = 'pending')::BIGINT AS pending,
        ROUND(
            (COUNT(*) FILTER (WHERE a.status = 'checked-in')::NUMERIC /
             NULLIF(COUNT(a.id), 0)::NUMERIC) * 100,
            2
        ) AS check_in_rate,
        e.created_at
    FROM event_checkin.events e
    LEFT JOIN event_checkin.attendees a ON a.event_id = e.id
    WHERE e.id = p_event_id
    GROUP BY e.id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION event_checkin.get_event_with_stats TO authenticated;
```

### Phase 3: Frontend Implementation
**Status:** 📝 Planned

#### 3.1 Event Management UI
**New File:** `event-management.js`

```javascript
window.EventManager = {
    currentEventId: null,
    events: [],

    /**
     * Initialize event manager
     */
    async init() {
        await this.loadEvents();
        this.setupEventListeners();
        this.loadCurrentEvent();
    },

    /**
     * Load all events from database
     */
    async loadEvents() {
        try {
            const { data, error } = await window.SupabaseAuth.supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.events = data;
            this.renderEventsList();

        } catch (error) {
            console.error('Failed to load events:', error);
            showToast('Failed to load events', 'error');
        }
    },

    /**
     * Create new event
     */
    async createEvent(eventData) {
        try {
            const { data, error } = await window.SupabaseAuth.supabase
                .rpc('create_event', {
                    p_event_name: eventData.name,
                    p_event_subtitle: eventData.subtitle,
                    p_event_date: eventData.date,
                    p_event_time: eventData.time,
                    p_event_location: eventData.location,
                    p_primary_color: eventData.color || '#5ac1ee',
                    p_settings: eventData.settings || {}
                });

            if (error) throw error;

            console.log('✅ Event created:', data);
            await this.loadEvents();
            return { success: true, event: data };

        } catch (error) {
            console.error('Failed to create event:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update existing event
     */
    async updateEvent(eventId, updates) {
        try {
            const { data, error } = await window.SupabaseAuth.supabase
                .from('events')
                .update(updates)
                .eq('id', eventId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Event updated:', data);
            await this.loadEvents();
            return { success: true, event: data };

        } catch (error) {
            console.error('Failed to update event:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete event
     */
    async deleteEvent(eventId) {
        // Confirm with user
        if (!confirm('Delete this event and all its attendees? This cannot be undone.')) {
            return { success: false, cancelled: true };
        }

        try {
            const { error } = await window.SupabaseAuth.supabase
                .from('events')
                .delete()
                .eq('id', eventId);

            if (error) throw error;

            console.log('✅ Event deleted');
            await this.loadEvents();

            // Switch to another event if current was deleted
            if (this.currentEventId === eventId) {
                this.currentEventId = null;
                localStorage.removeItem('currentEventId');
            }

            return { success: true };

        } catch (error) {
            console.error('Failed to delete event:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Switch active event
     */
    async switchEvent(eventId) {
        this.currentEventId = eventId;
        localStorage.setItem('currentEventId', eventId);

        // Load attendees for this event
        await window.loadEventAttendees(eventId);

        // Apply event customization
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            window.applyColorScheme(event.primary_color);
            window.updateEventTitle(event.event_name);
        }

        this.renderEventsList();
        showToast(`Switched to ${event.event_name}`, 'success');
    },

    /**
     * Load current event from localStorage
     */
    loadCurrentEvent() {
        const savedEventId = localStorage.getItem('currentEventId');
        if (savedEventId && this.events.find(e => e.id === parseInt(savedEventId))) {
            this.switchEvent(parseInt(savedEventId));
        } else if (this.events.length > 0) {
            // Default to most recent event
            this.switchEvent(this.events[0].id);
        }
    },

    /**
     * Render events list in UI
     */
    renderEventsList() {
        const container = document.getElementById('eventsList');
        if (!container) return;

        if (this.events.length === 0) {
            container.innerHTML = `
                <div class="no-events">
                    <p>No events yet</p>
                    <button onclick="EventManager.showCreateEventModal()">
                        Create Your First Event
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.events.map(event => {
            const isActive = event.id === this.currentEventId;
            const stats = this.getEventStats(event.id);

            return `
                <div class="event-card ${isActive ? 'active' : ''}"
                     onclick="EventManager.switchEvent(${event.id})">
                    <div class="event-header">
                        <h3>${escapeHtml(event.event_name)}</h3>
                        <span class="event-status ${event.status}">${event.status}</span>
                    </div>
                    <div class="event-details">
                        ${event.event_date ? `<div>📅 ${formatDate(event.event_date)}</div>` : ''}
                        ${event.event_location ? `<div>📍 ${escapeHtml(event.event_location)}</div>` : ''}
                    </div>
                    <div class="event-stats">
                        <span>${stats.total} attendees</span>
                        <span>${stats.checkedIn} checked in</span>
                        <span>${stats.checkInRate}% rate</span>
                    </div>
                    <div class="event-actions" onclick="event.stopPropagation()">
                        <button onclick="EventManager.showEditModal(${event.id})">Edit</button>
                        <button onclick="EventManager.deleteEvent(${event.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Show create event modal
     */
    showCreateEventModal() {
        // Implementation of modal UI
        // See HTML implementation section below
    }
};
```

#### 3.2 Event Form Modal HTML
**File:** `index.html` (add to body)

```html
<!-- Event Management Modal -->
<div id="eventModal" class="modal" style="display: none;">
    <div class="modal-content">
        <span class="modal-close" onclick="closeEventModal()">&times;</span>
        <h2 id="eventModalTitle">Create Event</h2>

        <form id="eventForm" onsubmit="submitEventForm(event)">
            <div class="form-group">
                <label for="eventName">Event Name *</label>
                <input type="text" id="eventName" required
                       placeholder="e.g., Annual Gala 2026">
            </div>

            <div class="form-group">
                <label for="eventSubtitle">Subtitle</label>
                <input type="text" id="eventSubtitle"
                       placeholder="e.g., A Night to Remember">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="eventDate">Date</label>
                    <input type="date" id="eventDate">
                </div>

                <div class="form-group">
                    <label for="eventTime">Time</label>
                    <input type="time" id="eventTime">
                </div>
            </div>

            <div class="form-group">
                <label for="eventLocation">Location</label>
                <input type="text" id="eventLocation"
                       placeholder="e.g., Grand Ballroom, City Hall">
            </div>

            <div class="form-group">
                <label for="eventDescription">Description</label>
                <textarea id="eventDescription" rows="3"
                          placeholder="Event details..."></textarea>
            </div>

            <div class="form-group">
                <label for="eventColor">Primary Color</label>
                <input type="color" id="eventColor" value="#5ac1ee">
            </div>

            <div class="form-actions">
                <button type="button" onclick="closeEventModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Event</button>
            </div>
        </form>
    </div>
</div>
```

---

## 🧪 Test Cases (TDD)

### Unit Tests

```javascript
describe('EventManager', () => {
    describe('createEvent()', () => {
        test('should create event with required fields', async () => {
            const eventData = {
                name: 'Test Event',
                subtitle: 'Test Subtitle',
                date: '2026-02-15',
                time: '18:00',
                location: 'Test Venue'
            };

            const result = await EventManager.createEvent(eventData);

            expect(result.success).toBe(true);
            expect(result.event.event_name).toBe('Test Event');
            expect(result.event.status).toBe('active');
        });

        test('should validate required fields', async () => {
            const result = await EventManager.createEvent({});

            expect(result.success).toBe(false);
            expect(result.error).toContain('event_name');
        });

        test('should apply default color if not provided', async () => {
            const result = await EventManager.createEvent({
                name: 'Test Event'
            });

            expect(result.event.primary_color).toBe('#5ac1ee');
        });
    });

    describe('updateEvent()', () => {
        test('should update event name', async () => {
            const event = await createTestEvent();

            const result = await EventManager.updateEvent(event.id, {
                event_name: 'Updated Name'
            });

            expect(result.success).toBe(true);
            expect(result.event.event_name).toBe('Updated Name');
        });

        test('should not allow updating other users events', async () => {
            // Create event as different user
            const otherEvent = await createTestEventAsOtherUser();

            const result = await EventManager.updateEvent(otherEvent.id, {
                event_name: 'Hacked'
            });

            expect(result.success).toBe(false);
        });
    });

    describe('deleteEvent()', () => {
        test('should delete event and cascade attendees', async () => {
            const event = await createTestEvent();
            await addTestAttendees(event.id, 5);

            const result = await EventManager.deleteEvent(event.id);

            expect(result.success).toBe(true);

            // Verify attendees were deleted
            const attendees = await getEventAttendees(event.id);
            expect(attendees.length).toBe(0);
        });
    });

    describe('switchEvent()', () => {
        test('should load attendees for new event', async () => {
            const event1 = await createTestEvent({ name: 'Event 1' });
            const event2 = await createTestEvent({ name: 'Event 2' });

            await EventManager.switchEvent(event2.id);

            expect(EventManager.currentEventId).toBe(event2.id);
            expect(localStorage.getItem('currentEventId')).toBe(String(event2.id));
        });

        test('should apply event customization', async () => {
            const event = await createTestEvent({
                name: 'Custom Event',
                color: '#FF0000'
            });

            await EventManager.switchEvent(event.id);

            const colorVar = getComputedStyle(document.documentElement)
                .getPropertyValue('--primary-color');
            expect(colorVar.trim()).toBe('#FF0000');
        });
    });
});
```

### Integration Tests (Playwright)

```javascript
describe('Event Management UI', () => {
    test('should create new event via form', async () => {
        await page.goto('http://localhost:8000');

        // Open create event modal
        await page.click('button:has-text("Create Event")');

        // Fill form
        await page.fill('#eventName', 'Test Event');
        await page.fill('#eventDate', '2026-03-15');
        await page.fill('#eventLocation', 'Test Venue');

        // Submit
        await page.click('button[type="submit"]');

        // Verify event appears in list
        await page.waitForSelector('.event-card:has-text("Test Event")');
    });

    test('should switch between events', async () => {
        await page.goto('http://localhost:8000');

        // Create two events
        await createEventViaUI('Event A');
        await createEventViaUI('Event B');

        // Click on Event A
        await page.click('.event-card:has-text("Event A")');

        // Verify Event A is active
        expect(await page.locator('.event-card.active')).toContainText('Event A');
    });

    test('should delete event with confirmation', async () => {
        await page.goto('http://localhost:8000');
        await createEventViaUI('Event to Delete');

        // Click delete button
        page.on('dialog', dialog => dialog.accept());
        await page.click('.event-card:has-text("Event to Delete") button:has-text("Delete")');

        // Verify event removed
        await page.waitForTimeout(1000);
        expect(await page.locator('.event-card:has-text("Event to Delete")')).toHaveCount(0);
    });
});
```

---

## 📦 Dependencies

### Database
- ✅ `event_checkin` schema exists
- 📝 `event_checkin.events` table creation
- 📝 `event_checkin.attendees.event_id` foreign key

### Code
- ✅ Supabase client configured
- ✅ Supabase Auth implemented
- 📝 Event management module

### UI Components
- 📝 Event list view
- 📝 Event form modal
- 📝 Event switcher dropdown

---

## 🚀 Implementation Plan

### Step 1: Database Setup (3 hours)
- [ ] Create `events` table migration
- [ ] Add `event_id` to attendees
- [ ] Set up RLS policies
- [ ] Create database functions
- [ ] Test CRUD operations via SQL

### Step 2: Backend Functions (2 hours)
- [ ] Implement `create_event` function
- [ ] Implement `get_event_with_stats` function
- [ ] Test via Supabase dashboard

### Step 3: Frontend Module (6 hours)
- [ ] Create `event-management.js`
- [ ] Implement CRUD methods
- [ ] Build event list UI
- [ ] Create event form modal
- [ ] Add event switcher

### Step 4: Integration (4 hours)
- [ ] Connect to main app
- [ ] Scope attendee queries by event
- [ ] Update navigation
- [ ] Test multi-event scenarios

### Step 5: Testing (5 hours)
- [ ] Write unit tests
- [ ] Create Playwright tests
- [ ] Test RLS policies
- [ ] Performance testing

**Total Estimated Time:** 20 hours (4-5 days)

---

## 🔒 Security Considerations

1. **Row Level Security**
   - Users can only modify their own events
   - Attendees scoped to user's events
   - Service role bypass for admin operations

2. **Cascade Deletes**
   - Attendees deleted when event deleted
   - Warning shown before deletion
   - Audit log entry created

3. **Input Validation**
   - Event name required
   - Date format validated
   - Color format validated (hex)

---

## 📝 Notes

- This feature enables multi-event support for v1.1
- Backward compatible (null event_id for legacy data)
- Foundation for event templates and recurring events (v2.0)
- Consider event archival vs deletion in future

---

**Ready for /plan?** Yes - Detailed schema and implementation provided.
