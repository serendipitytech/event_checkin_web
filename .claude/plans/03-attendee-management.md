# Feature Plan: Attendee Management (CRUD Operations)

**Feature ID:** P1-002
**Priority:** P1 (v1.1 Enhancement)
**Effort:** Medium (4-5 days)
**Status:** Planned
**Owner:** Development Team
**Target Version:** v1.1
**Dependencies:** Event Management (P1-001)

---

## 📋 User Story

**As an** event organizer,
**I want to** add, edit, and remove attendees directly in the system,
**So that** I can manage last-minute registrations and updates without re-uploading data files.

### Acceptance Criteria

- [ ] AC1: Can add single attendee with name, email, table, group, ticket type
- [ ] AC2: Email validation applies to manually added attendees
- [ ] AC3: Can edit existing attendee information
- [ ] AC4: Can delete individual attendees (with confirmation)
- [ ] AC5: Can import attendees from CSV (existing feature enhanced)
- [ ] AC6: Can export attendees to CSV
- [ ] AC7: Changes sync across all devices in real-time
- [ ] AC8: Duplicate email detection with warning
- [ ] AC9: Bulk import validates all emails before saving
- [ ] AC10: Audit log tracks all attendee changes

---

## 🎯 Technical Approach

### Phase 1: Enhanced Database Schema
**Status:** 📝 Planned

#### 1.1 Add Audit Fields to Attendees
**Migration:** `enhance_attendees_table.sql`

```sql
-- Add audit fields
ALTER TABLE event_checkin.attendees
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
        CHECK (source IN ('manual', 'csv', 'google_sheets', 'api')),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP WITH TIME ZONE;

-- Create update trigger for modified fields
CREATE OR REPLACE FUNCTION event_checkin.update_attendee_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = NOW();
    NEW.modified_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendees_modified_trigger
    BEFORE UPDATE ON event_checkin.attendees
    FOR EACH ROW
    EXECUTE FUNCTION event_checkin.update_attendee_modified();

-- Add unique constraint for email per event (allow NULL)
CREATE UNIQUE INDEX idx_attendees_event_email_unique
    ON event_checkin.attendees(event_id, email)
    WHERE email IS NOT NULL;
```

### Phase 2: Database Functions
**Status:** 📝 Planned

#### 2.1 Add Attendee Function
```sql
CREATE OR REPLACE FUNCTION event_checkin.add_attendee(
    p_event_id BIGINT,
    p_attendee_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_table_number TEXT DEFAULT NULL,
    p_group_name TEXT DEFAULT NULL,
    p_ticket_type TEXT DEFAULT NULL
)
RETURNS event_checkin.attendees AS $$
DECLARE
    v_attendee event_checkin.attendees;
BEGIN
    -- Validate event exists and user has access
    IF NOT EXISTS (
        SELECT 1 FROM event_checkin.events
        WHERE id = p_event_id
        AND created_by = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Event not found or access denied';
    END IF;

    -- Validate email format if provided
    IF p_email IS NOT NULL AND p_email !~* '^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- Check for duplicate email in same event
    IF p_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM event_checkin.attendees
        WHERE event_id = p_event_id
        AND email = p_email
    ) THEN
        RAISE EXCEPTION 'Email already registered for this event';
    END IF;

    -- Insert attendee
    INSERT INTO event_checkin.attendees (
        event_id,
        attendee_name,
        email,
        table_number,
        group_name,
        ticket_type,
        source,
        created_by,
        status
    ) VALUES (
        p_event_id,
        p_attendee_name,
        p_email,
        p_table_number,
        p_group_name,
        p_ticket_type,
        'manual',
        auth.uid(),
        'pending'
    )
    RETURNING * INTO v_attendee;

    RETURN v_attendee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION event_checkin.add_attendee TO authenticated;
```

#### 2.2 Update Attendee Function
```sql
CREATE OR REPLACE FUNCTION event_checkin.update_attendee(
    p_attendee_id BIGINT,
    p_attendee_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_table_number TEXT DEFAULT NULL,
    p_group_name TEXT DEFAULT NULL,
    p_ticket_type TEXT DEFAULT NULL
)
RETURNS event_checkin.attendees AS $$
DECLARE
    v_attendee event_checkin.attendees;
    v_event_id BIGINT;
BEGIN
    -- Get current attendee to verify access
    SELECT event_id INTO v_event_id
    FROM event_checkin.attendees
    WHERE id = p_attendee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attendee not found';
    END IF;

    -- Verify user has access to event
    IF NOT EXISTS (
        SELECT 1 FROM event_checkin.events
        WHERE id = v_event_id
        AND created_by = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Validate email format if being updated
    IF p_email IS NOT NULL AND p_email !~* '^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- Check for duplicate email (excluding current attendee)
    IF p_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM event_checkin.attendees
        WHERE event_id = v_event_id
        AND email = p_email
        AND id != p_attendee_id
    ) THEN
        RAISE EXCEPTION 'Email already registered for this event';
    END IF;

    -- Update attendee (only provided fields)
    UPDATE event_checkin.attendees
    SET
        attendee_name = COALESCE(p_attendee_name, attendee_name),
        email = COALESCE(p_email, email),
        table_number = COALESCE(p_table_number, table_number),
        group_name = COALESCE(p_group_name, group_name),
        ticket_type = COALESCE(p_ticket_type, ticket_type)
    WHERE id = p_attendee_id
    RETURNING * INTO v_attendee;

    RETURN v_attendee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION event_checkin.update_attendee TO authenticated;
```

#### 2.3 Bulk Import Function
```sql
CREATE OR REPLACE FUNCTION event_checkin.bulk_import_attendees(
    p_event_id BIGINT,
    p_attendees JSONB
)
RETURNS TABLE (
    imported INTEGER,
    failed INTEGER,
    errors JSONB
) AS $$
DECLARE
    v_attendee JSONB;
    v_imported INTEGER := 0;
    v_failed INTEGER := 0;
    v_errors JSONB := '[]'::jsonb;
    v_error_detail JSONB;
BEGIN
    -- Verify user has access to event
    IF NOT EXISTS (
        SELECT 1 FROM event_checkin.events
        WHERE id = p_event_id
        AND created_by = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Event not found or access denied';
    END IF;

    -- Process each attendee
    FOR v_attendee IN SELECT * FROM jsonb_array_elements(p_attendees)
    LOOP
        BEGIN
            INSERT INTO event_checkin.attendees (
                event_id,
                attendee_name,
                email,
                table_number,
                group_name,
                ticket_type,
                source,
                created_by
            ) VALUES (
                p_event_id,
                v_attendee->>'name',
                NULLIF(v_attendee->>'email', ''),
                NULLIF(v_attendee->>'table_number', ''),
                NULLIF(v_attendee->>'group_name', ''),
                NULLIF(v_attendee->>'ticket_type', ''),
                'csv',
                auth.uid()
            );

            v_imported := v_imported + 1;

        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            v_error_detail := jsonb_build_object(
                'name', v_attendee->>'name',
                'email', v_attendee->>'email',
                'error', SQLERRM
            );
            v_errors := v_errors || v_error_detail;
        END;
    END LOOP;

    RETURN QUERY SELECT v_imported, v_failed, v_errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION event_checkin.bulk_import_attendees TO authenticated;
```

### Phase 3: Frontend Implementation
**Status:** 📝 Planned

#### 3.1 Attendee Management Module
**New File:** `attendee-management.js`

```javascript
window.AttendeeManager = {
    /**
     * Add new attendee
     */
    async addAttendee(eventId, attendeeData) {
        // Validate email if provided
        if (attendeeData.email) {
            const validation = window.EmailValidator.validate(attendeeData.email);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }
            attendeeData.email = validation.sanitized;
        }

        try {
            const { data, error } = await window.SupabaseAuth.supabase
                .rpc('add_attendee', {
                    p_event_id: eventId,
                    p_attendee_name: attendeeData.name,
                    p_email: attendeeData.email || null,
                    p_table_number: attendeeData.tableNumber || null,
                    p_group_name: attendeeData.groupName || null,
                    p_ticket_type: attendeeData.ticketType || null
                });

            if (error) throw error;

            console.log('✅ Attendee added:', data);
            showToast(`Added ${attendeeData.name}`, 'success');

            return { success: true, attendee: data };

        } catch (error) {
            console.error('Failed to add attendee:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update existing attendee
     */
    async updateAttendee(attendeeId, updates) {
        // Validate email if being updated
        if (updates.email) {
            const validation = window.EmailValidator.validate(updates.email);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }
            updates.email = validation.sanitized;
        }

        try {
            const { data, error } = await window.SupabaseAuth.supabase
                .rpc('update_attendee', {
                    p_attendee_id: attendeeId,
                    p_attendee_name: updates.name || null,
                    p_email: updates.email || null,
                    p_table_number: updates.tableNumber || null,
                    p_group_name: updates.groupName || null,
                    p_ticket_type: updates.ticketType || null
                });

            if (error) throw error;

            console.log('✅ Attendee updated:', data);
            showToast('Attendee updated', 'success');

            return { success: true, attendee: data };

        } catch (error) {
            console.error('Failed to update attendee:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete attendee
     */
    async deleteAttendee(attendeeId, attendeeName) {
        if (!confirm(`Delete ${attendeeName}? This cannot be undone.`)) {
            return { success: false, cancelled: true };
        }

        try {
            const { error } = await window.SupabaseAuth.supabase
                .from('attendees')
                .delete()
                .eq('id', attendeeId);

            if (error) throw error;

            console.log('✅ Attendee deleted');
            showToast(`Deleted ${attendeeName}`, 'success');

            return { success: true };

        } catch (error) {
            console.error('Failed to delete attendee:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Bulk import from CSV
     */
    async bulkImport(eventId, csvData) {
        // Parse CSV
        const rows = this.parseCSV(csvData);

        // Validate all emails first
        const validationErrors = [];
        const validRows = rows.filter((row, index) => {
            if (row.email) {
                const validation = window.EmailValidator.validate(row.email);
                if (!validation.valid) {
                    validationErrors.push({
                        row: index + 2, // +2 for header and 0-index
                        name: row.name,
                        email: row.email,
                        error: validation.error
                    });
                    return false;
                }
                row.email = validation.sanitized;
            }
            return true;
        });

        if (validationErrors.length > 0) {
            console.warn('Validation errors:', validationErrors);
            const proceed = confirm(
                `${validationErrors.length} rows have invalid emails and will be skipped.\\n\\n` +
                `Continue importing ${validRows.length} valid rows?`
            );
            if (!proceed) {
                return { success: false, cancelled: true };
            }
        }

        // Convert to JSONB format
        const attendeesJson = validRows.map(row => ({
            name: row.name,
            email: row.email || null,
            table_number: row.tableNumber || null,
            group_name: row.groupName || null,
            ticket_type: row.ticketType || null
        }));

        try {
            const { data, error } = await window.SupabaseAuth.supabase
                .rpc('bulk_import_attendees', {
                    p_event_id: eventId,
                    p_attendees: attendeesJson
                });

            if (error) throw error;

            console.log('✅ Bulk import result:', data);
            showToast(
                `Imported ${data[0].imported} attendees. ` +
                `${data[0].failed} failed.`,
                data[0].failed > 0 ? 'warning' : 'success'
            );

            return {
                success: true,
                imported: data[0].imported,
                failed: data[0].failed,
                errors: data[0].errors
            };

        } catch (error) {
            console.error('Bulk import failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Export attendees to CSV
     */
    async exportToCSV(eventId) {
        try {
            const { data, error } = await window.SupabaseAuth.supabase
                .from('attendees')
                .select('*')
                .eq('event_id', eventId)
                .order('attendee_name');

            if (error) throw error;

            // Generate CSV
            const csv = this.generateCSV(data);

            // Download file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendees-${eventId}-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Exported to CSV', 'success');
            return { success: true };

        } catch (error) {
            console.error('Export failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Parse CSV data
     */
    parseCSV(csvText) {
        const lines = csvText.split('\\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length >= 3) {
                rows.push({
                    name: values[2] || '',
                    tableNumber: values[0] || '',
                    groupName: values[1] || '',
                    ticketType: values[3] || '',
                    email: values[4] || ''
                });
            }
        }
        return rows;
    },

    /**
     * Parse single CSV line (handles quoted fields)
     */
    parseCSVLine(line) {
        const values = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        return values;
    },

    /**
     * Generate CSV from attendee data
     */
    generateCSV(attendees) {
        const headers = ['Table Number', 'Group Name', 'Attendee Name', 'Ticket Type', 'Email', 'Status', 'Checked In At'];
        const rows = [headers];

        attendees.forEach(a => {
            rows.push([
                a.table_number || '',
                a.group_name || '',
                a.attendee_name || '',
                a.ticket_type || '',
                a.email || '',
                a.status || 'pending',
                a.checked_in_at || ''
            ]);
        });

        return rows.map(row =>
            row.map(field => {
                // Quote fields containing commas or quotes
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        ).join('\\n');
    },

    /**
     * Show add attendee modal
     */
    showAddModal() {
        document.getElementById('attendeeModalTitle').textContent = 'Add Attendee';
        document.getElementById('attendeeForm').reset();
        document.getElementById('attendeeId').value = '';
        document.getElementById('attendeeModal').style.display = 'block';
    },

    /**
     * Show edit attendee modal
     */
    showEditModal(attendee) {
        document.getElementById('attendeeModalTitle').textContent = 'Edit Attendee';
        document.getElementById('attendeeId').value = attendee.id;
        document.getElementById('attendeeName').value = attendee.attendee_name;
        document.getElementById('attendeeEmail').value = attendee.email || '';
        document.getElementById('attendeeTable').value = attendee.table_number || '';
        document.getElementById('attendeeGroup').value = attendee.group_name || '';
        document.getElementById('attendeeTicket').value = attendee.ticket_type || '';
        document.getElementById('attendeeModal').style.display = 'block';
    }
};
```

#### 3.2 Attendee Form Modal HTML
**File:** `index.html` (add to body)

```html
<!-- Attendee Management Modal -->
<div id="attendeeModal" class="modal" style="display: none;">
    <div class="modal-content">
        <span class="modal-close" onclick="closeAttendeeModal()">&times;</span>
        <h2 id="attendeeModalTitle">Add Attendee</h2>

        <form id="attendeeForm" onsubmit="submitAttendeeForm(event)">
            <input type="hidden" id="attendeeId">

            <div class="form-group">
                <label for="attendeeName">Name *</label>
                <input type="text" id="attendeeName" required
                       placeholder="Full name">
            </div>

            <div class="form-group">
                <label for="attendeeEmail">Email</label>
                <input type="email" id="attendeeEmail"
                       placeholder="email@example.com">
                <small class="form-help">Optional, but recommended</small>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="attendeeTable">Table Number</label>
                    <input type="text" id="attendeeTable"
                           placeholder="e.g., Table 5">
                </div>

                <div class="form-group">
                    <label for="attendeeGroup">Group</label>
                    <input type="text" id="attendeeGroup"
                           placeholder="e.g., VIP">
                </div>
            </div>

            <div class="form-group">
                <label for="attendeeTicket">Ticket Type</label>
                <input type="text" id="attendeeTicket"
                       placeholder="e.g., General Admission">
            </div>

            <div class="form-actions">
                <button type="button" onclick="closeAttendeeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>
```

---

## 🧪 Test Cases (TDD)

### Unit Tests

```javascript
describe('AttendeeManager', () => {
    describe('addAttendee()', () => {
        test('should add attendee with valid data', async () => {
            const result = await AttendeeManager.addAttendee(1, {
                name: 'John Doe',
                email: 'john@example.com',
                tableNumber: '5',
                groupName: 'VIP',
                ticketType: 'Premium'
            });

            expect(result.success).toBe(true);
            expect(result.attendee.attendee_name).toBe('John Doe');
        });

        test('should validate email format', async () => {
            const result = await AttendeeManager.addAttendee(1, {
                name: 'John Doe',
                email: 'invalid-email'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('email');
        });

        test('should detect duplicate emails', async () => {
            await AttendeeManager.addAttendee(1, {
                name: 'John Doe',
                email: 'john@example.com'
            });

            const result = await AttendeeManager.addAttendee(1, {
                name: 'Jane Doe',
                email: 'john@example.com'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('already registered');
        });
    });

    describe('bulkImport()', () => {
        test('should import valid CSV data', async () => {
            const csv = `Table,Group,Name,Ticket,Email
5,VIP,John Doe,Premium,john@example.com
3,General,Jane Smith,Standard,jane@example.com`;

            const result = await AttendeeManager.bulkImport(1, csv);

            expect(result.success).toBe(true);
            expect(result.imported).toBe(2);
            expect(result.failed).toBe(0);
        });

        test('should skip rows with invalid emails', async () => {
            const csv = `Table,Group,Name,Ticket,Email
5,VIP,John Doe,Premium,john@example.com
3,General,Jane Smith,Standard,invalid-email`;

            const result = await AttendeeManager.bulkImport(1, csv);

            expect(result.imported).toBe(1);
            expect(result.failed).toBe(1);
        });
    });

    describe('exportToCSV()', () => {
        test('should generate valid CSV', async () => {
            const attendees = [
                {
                    attendee_name: 'John Doe',
                    email: 'john@example.com',
                    table_number: '5',
                    status: 'checked-in'
                }
            ];

            const csv = AttendeeManager.generateCSV(attendees);

            expect(csv).toContain('John Doe');
            expect(csv).toContain('john@example.com');
            expect(csv).toContain('checked-in');
        });

        test('should escape special characters', async () => {
            const attendees = [{
                attendee_name: 'Doe, John',
                email: 'john@example.com'
            }];

            const csv = AttendeeManager.generateCSV(attendees);

            expect(csv).toContain('"Doe, John"');
        });
    });
});
```

### Integration Tests (Playwright)

```javascript
describe('Attendee CRUD Operations', () => {
    test('should add new attendee via form', async () => {
        await page.goto('http://localhost:8000');

        // Open add modal
        await page.click('button:has-text("Add Attendee")');

        // Fill form
        await page.fill('#attendeeName', 'Test User');
        await page.fill('#attendeeEmail', 'test@example.com');
        await page.fill('#attendeeTable', 'Table 10');

        // Submit
        await page.click('button[type="submit"]');

        // Verify appears in list
        await page.waitForSelector('.attendee-card:has-text("Test User")');
    });

    test('should edit existing attendee', async () => {
        // Add test attendee first
        await addTestAttendee('Original Name');

        // Click edit button
        await page.click('.attendee-card:has-text("Original Name") .btn-edit');

        // Update name
        await page.fill('#attendeeName', 'Updated Name');
        await page.click('button[type="submit"]');

        // Verify update
        await page.waitForSelector('.attendee-card:has-text("Updated Name")');
        expect(await page.locator('.attendee-card:has-text("Original Name")')).toHaveCount(0);
    });

    test('should delete attendee with confirmation', async () => {
        await addTestAttendee('To Delete');

        // Accept confirmation dialog
        page.on('dialog', dialog => dialog.accept());
        await page.click('.attendee-card:has-text("To Delete") .btn-delete');

        // Verify removal
        await page.waitForTimeout(1000);
        expect(await page.locator('.attendee-card:has-text("To Delete")')).toHaveCount(0);
    });

    test('should import CSV file', async () => {
        const csvContent = `Table,Group,Name,Ticket,Email
1,VIP,Import Test,Premium,import@test.com`;

        // Upload file
        await page.setInputFiles('#csvFileInput', {
            name: 'test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
        });

        // Verify import
        await page.waitForSelector('.attendee-card:has-text("Import Test")');
    });
});
```

---

## 📦 Dependencies

### Database
- ✅ `event_checkin.attendees` table exists
- 📝 Audit fields added
- 📝 Unique email constraint per event
- 📝 Database functions created

### Code
- ✅ EmailValidator module
- ✅ Supabase client
- 📝 AttendeeManager module

### UI
- 📝 Add/Edit modal
- 📝 Delete confirmation
- 📝 CSV import/export UI

---

## 🚀 Implementation Plan

### Step 1: Database Enhancements (2 hours)
- [ ] Add audit fields to attendees
- [ ] Create unique email constraint
- [ ] Write database functions
- [ ] Test via SQL

### Step 2: Backend Functions (3 hours)
- [ ] Implement add_attendee function
- [ ] Implement update_attendee function
- [ ] Implement bulk_import function
- [ ] Test with sample data

### Step 3: Frontend Module (8 hours)
- [ ] Create attendee-management.js
- [ ] Build add/edit modal
- [ ] Implement CRUD methods
- [ ] Add CSV import/export
- [ ] Connect to main app

### Step 4: Testing (7 hours)
- [ ] Write unit tests
- [ ] Create Playwright tests
- [ ] Test duplicate detection
- [ ] Test bulk import edge cases
- [ ] Performance testing

**Total Estimated Time:** 20 hours (4-5 days)

---

## 🔒 Security Considerations

1. **Email Validation**
   - Client-side validation with EmailValidator
   - Server-side format check in database function
   - XSS prevention via HTML escaping

2. **Duplicate Prevention**
   - Unique constraint at database level
   - User-friendly error messages
   - Option to update existing record

3. **Access Control**
   - RLS policies verify event ownership
   - Cannot modify other users' attendees
   - Audit trail via created_by/modified_by

---

## 📝 Notes

- Builds on existing email validation feature
- Enables self-service attendee management
- Foundation for registration forms (v2.0)
- Consider attendee import from external systems in future

---

**Ready for /plan?** Yes - Complete implementation guide provided.
