# Feature Plan: Complete Check-in Interface

**Feature ID:** P0-001
**Priority:** P0 (MVP Blocker)
**Effort:** Medium (3-5 days)
**Status:** In Progress
**Owner:** Development Team
**Target Version:** v1.0

---

## 📋 User Story

**As an** event volunteer operating a check-in station,
**I want to** quickly search for and check in attendees with a single click,
**So that** I can process arrivals efficiently and keep the line moving.

### Acceptance Criteria

- [x] AC1: Attendee list displays with name, table, group, ticket type, and status
- [x] AC2: Search bar filters attendees by name in real-time
- [x] AC3: Click "Check In" button changes status from "pending" to "checked-in"
- [ ] AC4: Checked-in attendees show timestamp and visual confirmation
- [ ] AC5: "Undo" button appears for checked-in attendees
- [ ] AC6: Click "Undo" reverts status back to "pending"
- [ ] AC7: Status changes sync across all devices within 2 seconds
- [ ] AC8: Statistics update automatically (total, checked-in, pending)
- [ ] AC9: Works on mobile devices (phone/tablet)
- [ ] AC10: Handles 500+ attendees without performance degradation

---

## 🎯 Technical Approach

### Phase 1: Database Integration (Complete)
**Status:** ✅ Complete

1. **Database Schema**
   - Using `event_checkin.attendees` table
   - Columns: id, attendee_name, email, table_number, group_name, ticket_type, status, checked_in_at
   - Status values: 'pending', 'checked-in'

2. **Data Source Abstraction**
   - `data-sources.js` provides unified interface
   - Supports CSV, Google Sheets, Supabase
   - `updateAttendee()` method for status changes

### Phase 2: Check-in Flow Implementation (In Progress)
**Status:** 🚧 In Progress

#### 2.1 Update Check-in Function
**File:** `index.html` (embedded JavaScript)

```javascript
async function toggleCheckIn(attendeeId) {
    const attendee = attendees.find(a => a.id === attendeeId);
    if (!attendee) return;

    const newStatus = attendee.status === 'checked-in' ? 'pending' : 'checked-in';
    const timestamp = newStatus === 'checked-in' ? new Date().toISOString() : null;

    // Optimistic update
    attendee.status = newStatus;
    attendee.checkedInAt = timestamp;
    updateDisplay();

    // Persist to data source
    try {
        const dataSource = window.DataSourceManager.getCurrentSource();
        await dataSource.updateAttendee(attendeeId, {
            status: newStatus,
            checkedInAt: timestamp
        });

        console.log(`✅ ${newStatus === 'checked-in' ? 'Checked in' : 'Undid check-in for'} ${attendee.attendeeName}`);

        // Update statistics
        updateStatistics();

    } catch (error) {
        console.error('Failed to update check-in status:', error);

        // Revert optimistic update on error
        attendee.status = attendee.status === 'checked-in' ? 'pending' : 'checked-in';
        attendee.checkedInAt = attendee.status === 'checked-in' ? timestamp : null;
        updateDisplay();

        alert('Failed to update check-in status. Please try again.');
    }
}
```

#### 2.2 Render Attendee Cards with Actions
**File:** `index.html` (renderAttendees function)

```javascript
function renderAttendees() {
    const container = document.getElementById('attendeesList');
    if (!container) return;

    if (filteredAttendees.length === 0) {
        container.innerHTML = '<div class="no-results">No attendees found</div>';
        return;
    }

    container.innerHTML = filteredAttendees.map(attendee => {
        const isCheckedIn = attendee.status === 'checked-in';
        const statusClass = isCheckedIn ? 'checked-in' : 'pending';
        const checkedInTime = attendee.checkedInAt ?
            new Date(attendee.checkedInAt).toLocaleTimeString() : '';

        // Escape all user-controlled data
        const safeName = escapeHtml(attendee.attendeeName);
        const safeTable = escapeHtml(attendee.tableNumber);
        const safeGroup = escapeHtml(attendee.groupName);
        const safeTicket = escapeHtml(attendee.ticketType);
        const safeEmail = attendee.email && window.EmailValidator ?
            window.EmailValidator.formatForDisplay(attendee.email) : '';

        return `
            <div class="attendee-card ${statusClass}" data-id="${escapeHtml(attendee.id)}">
                <div class="attendee-info">
                    <div class="attendee-name">${safeName}</div>
                    ${safeTable ? `<div class="attendee-detail">Table: ${safeTable}</div>` : ''}
                    ${safeGroup ? `<div class="attendee-detail">Group: ${safeGroup}</div>` : ''}
                    ${safeTicket ? `<div class="attendee-detail">Ticket: ${safeTicket}</div>` : ''}
                    ${safeEmail ? `<div class="attendee-detail">Email: ${safeEmail}</div>` : ''}
                    ${isCheckedIn ? `<div class="check-in-time">✓ Checked in at ${checkedInTime}</div>` : ''}
                </div>
                <div class="attendee-actions">
                    ${!isCheckedIn ?
                        `<button class="btn-check-in" onclick="toggleCheckIn('${escapeHtml(attendee.id)}')">
                            Check In
                        </button>` :
                        `<button class="btn-undo" onclick="toggleCheckIn('${escapeHtml(attendee.id)}')">
                            Undo
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}
```

#### 2.3 Update Statistics Display
**File:** `index.html`

```javascript
function updateStatistics() {
    const total = attendees.length;
    const checkedIn = attendees.filter(a => a.status === 'checked-in').length;
    const pending = total - checkedIn;
    const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('checkedInCount').textContent = checkedIn;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('checkInRate').textContent = `${percentage}%`;
}
```

### Phase 3: Real-time Sync (Needs Implementation)
**Status:** 📝 Planned

#### 3.1 Set Up Supabase Realtime
**File:** `data-sources.js` (SupabaseDataSource class)

```javascript
setupRealtimeSubscription() {
    if (!this.supabase) return;

    console.log('Setting up Supabase real-time subscription...');

    this.realtimeSubscription = this.supabase
        .channel('attendees-changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'event_checkin',  // Use new schema
            table: 'attendees'
        }, (payload) => {
            console.log('Real-time update received:', payload);
            window.handleRealtimeUpdate(payload);
        })
        .subscribe((status) => {
            console.log('Real-time subscription status:', status);
        });
}
```

#### 3.2 Handle Real-time Updates
**File:** `index.html` or `data-sources.js`

```javascript
window.handleRealtimeUpdate = function(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'UPDATE' && newRecord) {
        // Find and update the local record
        const index = attendees.findIndex(a => a.id === newRecord.id);
        if (index >= 0) {
            attendees[index] = {
                id: newRecord.id,
                tableNumber: newRecord.table_number || '',
                groupName: newRecord.group_name || '',
                attendeeName: newRecord.attendee_name || '',
                ticketType: newRecord.ticket_type || '',
                email: newRecord.email || '',
                status: newRecord.status || 'pending',
                checkedInAt: newRecord.checked_in_at,
                rowIndex: newRecord.row_index
            };

            console.log('✅ Updated local record from real-time sync');
            updateDisplay();
            updateStatistics();

            // Show toast notification
            showToast(`${attendees[index].attendeeName} was checked in on another device`);
        }
    }
};
```

### Phase 4: Performance Optimization
**Status:** 📝 Planned

- Virtual scrolling for 1000+ attendees
- Debounced search (300ms delay)
- Lazy loading for images/badges
- IndexedDB caching for offline support

---

## 🧪 Test Cases (TDD)

### Unit Tests
**File:** `.claude/plans/tests/check-in-interface.test.js`

```javascript
describe('Check-in Interface', () => {
    describe('toggleCheckIn()', () => {
        test('should change status from pending to checked-in', async () => {
            const attendee = { id: '1', status: 'pending', attendeeName: 'John Doe' };
            attendees = [attendee];

            await toggleCheckIn('1');

            expect(attendees[0].status).toBe('checked-in');
            expect(attendees[0].checkedInAt).toBeTruthy();
        });

        test('should change status from checked-in to pending', async () => {
            const attendee = {
                id: '1',
                status: 'checked-in',
                checkedInAt: '2026-01-23T10:00:00Z',
                attendeeName: 'John Doe'
            };
            attendees = [attendee];

            await toggleCheckIn('1');

            expect(attendees[0].status).toBe('pending');
            expect(attendees[0].checkedInAt).toBeNull();
        });

        test('should update statistics after check-in', async () => {
            attendees = [
                { id: '1', status: 'pending', attendeeName: 'John' },
                { id: '2', status: 'pending', attendeeName: 'Jane' }
            ];

            await toggleCheckIn('1');

            expect(document.getElementById('checkedInCount').textContent).toBe('1');
            expect(document.getElementById('pendingCount').textContent).toBe('1');
        });

        test('should handle data source errors gracefully', async () => {
            const mockDataSource = {
                updateAttendee: jest.fn().mockRejectedValue(new Error('Network error'))
            };
            window.DataSourceManager.getCurrentSource = () => mockDataSource;

            const attendee = { id: '1', status: 'pending' };
            attendees = [attendee];

            await toggleCheckIn('1');

            // Should revert optimistic update
            expect(attendees[0].status).toBe('pending');
        });
    });

    describe('renderAttendees()', () => {
        test('should escape HTML in attendee names', () => {
            attendees = [{
                id: '1',
                attendeeName: '<script>alert("XSS")</script>',
                status: 'pending'
            }];
            filteredAttendees = attendees;

            renderAttendees();

            const container = document.getElementById('attendeesList');
            expect(container.innerHTML).not.toContain('<script>');
            expect(container.innerHTML).toContain('&lt;script&gt;');
        });

        test('should show check-in button for pending attendees', () => {
            attendees = [{ id: '1', attendeeName: 'John', status: 'pending' }];
            filteredAttendees = attendees;

            renderAttendees();

            expect(document.querySelector('.btn-check-in')).toBeTruthy();
            expect(document.querySelector('.btn-undo')).toBeFalsy();
        });

        test('should show undo button for checked-in attendees', () => {
            attendees = [{
                id: '1',
                attendeeName: 'John',
                status: 'checked-in',
                checkedInAt: new Date().toISOString()
            }];
            filteredAttendees = attendees;

            renderAttendees();

            expect(document.querySelector('.btn-undo')).toBeTruthy();
            expect(document.querySelector('.btn-check-in')).toBeFalsy();
        });
    });

    describe('updateStatistics()', () => {
        test('should calculate correct statistics', () => {
            attendees = [
                { id: '1', status: 'checked-in' },
                { id: '2', status: 'checked-in' },
                { id: '3', status: 'pending' },
                { id: '4', status: 'pending' }
            ];

            updateStatistics();

            expect(document.getElementById('totalCount').textContent).toBe('4');
            expect(document.getElementById('checkedInCount').textContent).toBe('2');
            expect(document.getElementById('pendingCount').textContent).toBe('2');
            expect(document.getElementById('checkInRate').textContent).toBe('50%');
        });

        test('should handle empty attendee list', () => {
            attendees = [];

            updateStatistics();

            expect(document.getElementById('checkInRate').textContent).toBe('0%');
        });
    });
});
```

### Integration Tests
**Using Playwright MCP**

```javascript
describe('Check-in Flow Integration', () => {
    test('should check in attendee and sync across tabs', async () => {
        // Open two browser tabs
        const tab1 = await browser.newPage();
        const tab2 = await browser.newPage();

        await tab1.goto('http://localhost:8000');
        await tab2.goto('http://localhost:8000');

        // Check in attendee on tab1
        await tab1.click('[data-id="1"] .btn-check-in');

        // Wait for sync
        await tab2.waitForTimeout(2000);

        // Verify status updated on tab2
        const status = await tab2.textContent('[data-id="1"] .attendee-card');
        expect(status).toContain('Checked in');
    });

    test('should handle offline scenario gracefully', async () => {
        const page = await browser.newPage();
        await page.goto('http://localhost:8000');

        // Simulate offline
        await page.setOfflineMode(true);

        // Try to check in
        await page.click('[data-id="1"] .btn-check-in');

        // Should show error message
        const alert = await page.waitForSelector('.alert-error');
        expect(await alert.textContent()).toContain('Failed to update');
    });
});
```

### E2E Test Scenarios

1. **Happy Path Check-in**
   - Load app with test data
   - Search for "John Doe"
   - Click "Check In" button
   - Verify status changes to "checked-in"
   - Verify timestamp appears
   - Verify statistics update

2. **Undo Check-in**
   - Check in an attendee
   - Click "Undo" button
   - Verify status reverts to "pending"
   - Verify timestamp cleared
   - Verify statistics update

3. **Multi-Device Sync**
   - Open app in two tabs/devices
   - Check in attendee on device 1
   - Verify device 2 updates within 2 seconds
   - Check statistics match on both devices

4. **Search and Check-in**
   - Enter partial name in search
   - Results filter in real-time
   - Check in filtered result
   - Clear search
   - Verify check-in persisted

5. **Error Handling**
   - Disconnect network
   - Attempt check-in
   - Verify error message
   - Reconnect network
   - Retry check-in successfully

---

## 📦 Dependencies

### Code Dependencies
- ✅ `email-validation.js` - Already implemented
- ✅ `data-sources.js` - Already implemented
- ✅ `supabase-auth.js` - Already implemented
- ✅ Database schema `event_checkin.attendees` - Created

### External Services
- ✅ Supabase project - Configured
- ✅ Supabase Realtime - Available
- 📝 PostgreSQL schema migration - Needs execution

### Testing Tools
- 📝 Playwright MCP - Available in Claude Code
- 📝 Browser test environment - Setup needed

---

## 🚀 Implementation Plan

### Step 1: Database Migration (2 hours)
- [ ] Connect to Supabase via MCP
- [ ] Create `event_checkin.attendees` table
- [ ] Set up RLS policies
- [ ] Create indexes
- [ ] Test read/write operations

### Step 2: Update Check-in Logic (4 hours)
- [ ] Update `toggleCheckIn()` function
- [ ] Add error handling with rollback
- [ ] Update `renderAttendees()` for new UI
- [ ] Implement statistics calculations
- [ ] Add toast notifications

### Step 3: Real-time Sync (3 hours)
- [ ] Configure Supabase Realtime channel
- [ ] Set up subscription listeners
- [ ] Handle update events
- [ ] Test cross-device sync
- [ ] Add connection status indicator

### Step 4: Testing (8 hours)
- [ ] Write unit tests
- [ ] Create Playwright integration tests
- [ ] Run E2E scenarios
- [ ] Performance testing with 500+ attendees
- [ ] Mobile device testing

### Step 5: Polish & Documentation (3 hours)
- [ ] Add loading states
- [ ] Improve error messages
- [ ] Update user documentation
- [ ] Record demo video
- [ ] Update ROADMAP.md

**Total Estimated Time:** 20 hours (3-4 days)

---

## 🔒 Security Considerations

1. **Input Escaping**
   - ✅ All attendee data escaped before rendering
   - ✅ `escapeHtml()` function used consistently
   - ✅ Email validated via EmailValidator

2. **SQL Injection Prevention**
   - ✅ Parameterized queries via Supabase client
   - ✅ No raw SQL from client
   - ✅ RLS policies enforce access control

3. **Authentication**
   - ✅ Supabase Auth required for updates
   - ✅ Anonymous read-only for public check-in stations (optional)

4. **Rate Limiting**
   - 📝 Implement client-side debouncing
   - 📝 Monitor for abuse patterns
   - 📝 Consider Supabase rate limits

---

## 📊 Success Metrics

### Performance
- Page load time < 3 seconds
- Check-in action < 500ms
- Real-time sync < 2 seconds
- Handles 500+ attendees smoothly

### Reliability
- 99.9% uptime during events
- Zero data loss
- Graceful offline degradation

### Usability
- One-click check-in
- Clear visual feedback
- Mobile-friendly interface
- Minimal training required

---

## 🐛 Known Issues

1. **Real-time subscription not connecting**
   - Status: 🚧 In Progress
   - Need to update schema reference from `public` to `event_checkin`

2. **Statistics not updating immediately**
   - Status: 📝 Planned
   - Add `updateStatistics()` call after check-in

3. **Mobile keyboard covers search bar**
   - Status: 📝 Planned
   - Implement better mobile viewport handling

---

## 📝 Notes

- Focus on completing AC4-AC10 to reach MVP
- Real-time sync is critical for multi-device scenarios
- Performance with 500+ attendees must be validated
- Mobile testing required before production use

---

**Ready for /plan?** Yes - This document contains all details needed for implementation.
