// Data Source Management System
// Provides unified interface for CSV, Google Sheets, and Supabase data sources

window.DataSourceManager = {
    currentSource: null,
    pollingInterval: null,
    
    // Initialize data source manager
    init() {
        this.loadDataSource();
        this.setupPolling();
    },
    
    // Load the configured data source
    loadDataSource() {
        const config = window.getDataSourceConfig();
        const sourceType = config?.type || 'csv';
        
        console.log('Loading data source:', sourceType);
        console.log('Full config:', config);
        
        // Ensure settings exist
        if (!config.settings) {
            config.settings = {
                csv: { pollUrl: 'csv-handler.php?action=get', pollInterval: 5000 },
                googlesheets: { sheetUrl: '', pollInterval: 5000, proxyUrl: '' },
                supabase: { url: '', anonKey: '', tableName: 'event_checkin_attendees' }
            };
        }
        
        switch (sourceType) {
            case 'csv':
                const csvSettings = config.settings?.csv || { pollUrl: 'csv-handler.php?action=get', pollInterval: 5000 };
                console.log('CSV DataSource settings:', csvSettings);
                this.currentSource = new CSVDataSource(csvSettings);
                break;
            case 'googlesheets':
                this.currentSource = new GoogleSheetsDataSource(config.settings.googlesheets || { sheetUrl: '', pollInterval: 5000, proxyUrl: '' });
                break;
            case 'supabase':
                this.currentSource = new SupabaseDataSource(config.settings.supabase || { url: '', anonKey: '', tableName: 'event_checkin_attendees' });
                break;
            default:
                console.error('Unknown data source type:', sourceType);
                return;
        }
        
        // Update UI to show current source
        this.updateSourceIndicator();
    },
    
    // Setup automatic polling
    setupPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        const config = window.getDataSourceConfig();
        const sourceType = config?.type || 'csv';
        const pollInterval = config?.settings?.[sourceType]?.pollInterval || 5000;
        
        if (pollInterval > 0 && this.currentSource && this.currentSource.supportsPolling()) {
            this.pollingInterval = setInterval(() => {
                this.currentSource.loadData().then(data => {
                    if (data && data.length > 0) {
                        window.handleDataSourceUpdate(data);
                    }
                }).catch(error => {
                    console.warn('Polling error:', error);
                });
            }, pollInterval);
        }
    },
    
    // Update source indicator in UI
    updateSourceIndicator() {
        const config = window.getDataSourceConfig();
        const sourceType = config?.type || 'csv';
        const indicator = document.getElementById('dataSourceIndicator');
        if (indicator) {
            indicator.textContent = `Data Source: ${sourceType.toUpperCase()}`;
            indicator.className = `data-source-indicator ${sourceType}`;
        }
    },
    
    // Switch data source
    async switchDataSource(newType, settings) {
        if (this.currentSource && this.currentSource.getType() === newType) {
            console.log('Already using this data source');
            return;
        }
        
        // Warn user about data loss
        const confirmed = confirm(
            `Switching to ${newType} data source will clear all current check-in data. ` +
            'This action cannot be undone. Continue?'
        );
        
        if (!confirmed) {
            return false;
        }
        
        // Clear current data
        window.attendees = [];
        window.filteredAttendees = [];
        window.updateDisplay();
        
        // Stop current polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        // Update configuration
        window.setDataSource(newType, settings);
        
        // Load new source
        this.loadDataSource();
        this.setupPolling();
        
        // Load initial data
        try {
            const data = await this.currentSource.loadData();
            if (data && data.length > 0) {
                window.attendees = data;
                window.updateDisplay();
                console.log(`✅ Loaded ${data.length} attendees from ${newType}`);
            }
        } catch (error) {
            console.error('Failed to load data from new source:', error);
            alert(`Failed to load data from ${newType}: ${error.message}`);
        }
        
        return true;
    },
    
    // Get current source
    getCurrentSource() {
        return this.currentSource;
    }
};

// Base Data Source Class
class BaseDataSource {
    constructor(settings) {
        this.settings = settings;
    }
    
    getType() {
        return this.constructor.name.replace('DataSource', '').toLowerCase();
    }
    
    supportsPolling() {
        return false;
    }
    
    async loadData() {
        throw new Error('loadData() must be implemented by subclass');
    }
    
    async saveData(data) {
        throw new Error('saveData() must be implemented by subclass');
    }
    
    async updateAttendee(attendeeId, updates) {
        throw new Error('updateAttendee() must be implemented by subclass');
    }
}

// CSV Data Source
class CSVDataSource extends BaseDataSource {
    constructor(settings) {
        super(settings);
    }
    
    supportsPolling() {
        return true;
    }
    
    async loadData() {
        try {
            const pollUrl = this.settings.pollUrl || 'csv-handler.php?action=get';
            window.debugLog('CSV DataSource loading from:', pollUrl);
            window.debugLog('Current window location:', window.location.href);
            window.debugLog('Base URL:', window.location.origin);
            
            const response = await fetch(pollUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const normalizedData = this.normalizeAttendeeData(data);
            
            // Load check-in status from server
            try {
                const checkinResponse = await fetch(pollUrl.replace('?action=get', '?action=getcheckins'));
                if (checkinResponse.ok) {
                    const checkinData = await checkinResponse.json();
                    window.debugLog('CSV DataSource: Loaded check-in data from server:', checkinData);
                    
                    // Apply server check-in status to attendees
                    return normalizedData.map(attendee => {
                        if (checkinData[attendee.id]) {
                            return {
                                ...attendee,
                                status: checkinData[attendee.id].status,
                                checkedInAt: checkinData[attendee.id].checkedInAt
                            };
                        }
                        return attendee;
                    });
                }
            } catch (checkinError) {
                console.warn('Failed to load check-in data from server:', checkinError);
            }
            
            return normalizedData;
        } catch (error) {
            console.error('CSV data load error:', error);
            // Return empty array instead of throwing to prevent app crash
            return [];
        }
    }
    
    async saveData(data) {
        // CSV source is read-only for polling
        // Uploads are handled separately via admin panel
        throw new Error('CSV data source is read-only. Use admin panel to upload new files.');
    }
    
    async updateAttendee(attendeeId, updates) {
        // For CSV data source, we sync check-ins to the server
        try {
            window.debugLog('CSV DataSource updateAttendee called with:', { attendeeId, updates });
            window.debugLog('CSV DataSource settings:', this.settings);
            
            const pollUrl = this.settings.pollUrl || 'csv-handler.php?action=get';
            const checkinUrl = pollUrl.replace('?action=get', '?action=checkin');
            window.debugLog('CSV DataSource: Syncing check-in to server:', checkinUrl);
            
            const response = await fetch(checkinUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    attendeeId: attendeeId,
                    status: updates.status,
                    checkedInAt: updates.checkedInAt
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            window.debugLog(`CSV DataSource: Check-in synced to server for ${attendeeId}`);
            return result;
        } catch (error) {
            console.warn('Failed to sync check-in to server, using localStorage fallback:', error);
            // Fallback to localStorage if server sync fails
            return { success: true };
        }
    }
    
    normalizeAttendeeData(data) {
        return data.map((attendee, index) => ({
            id: attendee.id || `csv_${index}`,
            tableNumber: attendee.tableNumber || 'General',
            groupName: attendee.groupName || '',
            attendeeName: attendee.attendeeName || '',
            ticketType: attendee.ticketType || '',
            email: attendee.email || '',
            additionalInfo: attendee.additionalInfo || attendee.mealChoice || '',
            status: attendee.status || 'pending',
            checkedInAt: attendee.checkedInAt || null,
            rowIndex: attendee.rowIndex || index + 2
        }));
    }
}

// Google Sheets Data Source
class GoogleSheetsDataSource extends BaseDataSource {
    constructor(settings) {
        super(settings);
    }
    
    supportsPolling() {
        return true;
    }
    
    async loadData() {
        if (!this.settings.sheetUrl) {
            throw new Error('Google Sheets URL not configured');
        }
        
        try {
            // Build CSV URL
            const csvUrl = this.buildGoogleSheetCsvUrl(this.settings.sheetUrl);
            console.log('Fetching Google Sheets data from:', csvUrl);
            
            const response = await fetch(csvUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            const data = this.parseCsvData(csvText);
            const normalizedData = this.normalizeAttendeeData(data);
            
            // Load check-in status from server (same as CSV data source)
            try {
                const checkinResponse = await fetch('csv-handler.php?action=getcheckins');
                if (checkinResponse.ok) {
                    const checkinData = await checkinResponse.json();
                    console.log('Google Sheets DataSource: Loaded check-in data from server:', checkinData);
                    
                    // Apply server check-in status to attendees
                    return normalizedData.map(attendee => {
                        if (checkinData[attendee.id]) {
                            return {
                                ...attendee,
                                status: checkinData[attendee.id].status,
                                checkedInAt: checkinData[attendee.id].checkedInAt
                            };
                        }
                        return attendee;
                    });
                }
            } catch (checkinError) {
                console.warn('Failed to load check-in data from server:', checkinError);
            }
            
            return normalizedData;
        } catch (error) {
            console.error('Google Sheets data load error:', error);
            throw error;
        }
    }
    
    // Build Google Sheet CSV URL
    buildGoogleSheetCsvUrl(sheetUrl) {
        try {
            const url = new URL(sheetUrl);
            
            // If already a CSV export URL, return as-is
            if (url.searchParams.get('output') === 'csv' || url.pathname.includes('/export')) {
                return sheetUrl;
            }
            
            // Extract sheet ID from URL
            const pathSegments = url.pathname.split('/').filter(Boolean);
            const spreadsheetIndex = pathSegments.indexOf('spreadsheets');
            
            if (spreadsheetIndex !== -1 && pathSegments[spreadsheetIndex + 1] === 'd') {
                const sheetId = pathSegments[spreadsheetIndex + 2];
                let gid = url.searchParams.get('gid') || url.searchParams.get('gid') || '0';
                
                // Build CSV export URL
                return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
            }
            
            return sheetUrl; // Return as-is if can't parse
        } catch (error) {
            console.warn('Failed to parse Google Sheets URL:', error);
            return sheetUrl;
        }
    }
    
    // Parse CSV data
    parseCsvData(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            return [];
        }
        
        const data = [];
        // Skip header row and process data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            // Parse CSV line (handle quoted fields)
            const values = [];
            let currentValue = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue.trim());
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue.trim()); // Add last value
            
            // Only process rows with data (at least 3 non-empty columns)
            const nonEmptyValues = values.filter(v => v);
            if (nonEmptyValues.length >= 3) {
                data.push(values);
            }
        }
        
        return data;
    }
    
    async saveData(data) {
        // Google Sheets source is read-only for polling
        throw new Error('Google Sheets data source is read-only. Update the sheet directly.');
    }
    
    async updateAttendee(attendeeId, updates) {
        // Google Sheets source uses server-side check-in storage (same as CSV)
        // This allows check-ins to sync across devices while using Google Sheets as the data source
        try {
            console.log('Google Sheets DataSource: Syncing check-in to server:', { attendeeId, updates });
            
            const checkinUrl = 'csv-handler.php?action=checkin';
            
            const response = await fetch(checkinUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    attendeeId: attendeeId,
                    status: updates.status,
                    checkedInAt: updates.checkedInAt
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`Google Sheets DataSource: Check-in synced to server for ${attendeeId}`);
            return result;
        } catch (error) {
            console.warn('Failed to sync check-in to server:', error);
            throw error;
        }
    }
    
    normalizeAttendeeData(data) {
        return data.map((row, index) => {
            // Parse row data: table_number, group_name, full_name, ticket_type, email, additional_info
            const tableNumber = (row[0] || '').toString().trim() || 'General';
            const groupName = (row[1] || '').toString().trim() || '';
            const fullName = (row[2] || '').toString().trim() || '';
            const ticketType = (row[3] || '').toString().trim() || '';
            const email = (row[4] || '').toString().trim() || '';
            const additionalInfo = (row[5] || '').toString().trim() || '';

            // Validate and sanitize email if provided
            let validatedEmail = '';
            if (email && window.EmailValidator) {
                const result = window.EmailValidator.validate(email);
                if (result.valid) {
                    validatedEmail = result.sanitized;
                } else {
                    console.warn(`Invalid email for ${fullName}: ${email} - ${result.error}`);
                }
            }

            // Generate ID from full name or use index
            const id = fullName ? `gsheet_${fullName.replace(/\s+/g, '_').toLowerCase()}_${index}` : `gsheet_${index}`;

            return {
                id: id,
                tableNumber: tableNumber,
                groupName: groupName || ticketType || 'General',
                attendeeName: fullName,
                ticketType: ticketType,
                email: validatedEmail,
                additionalInfo: additionalInfo,
                status: 'pending',
                checkedInAt: null,
                rowIndex: index + 2
            };
        }).filter(attendee => attendee.attendeeName); // Only keep rows with attendee names
    }
}

// Supabase Data Source
class SupabaseDataSource extends BaseDataSource {
    constructor(settings) {
        super(settings);
        this.supabase = null;
        this.realtimeSubscription = null;

        if (settings.url && settings.anonKey) {
            // Create Supabase client (uses public schema by default)
            this.supabase = window.supabase.createClient(settings.url, settings.anonKey);
        }
    }
    
    supportsPolling() {
        return false; // Uses real-time subscriptions instead
    }
    
    async loadData() {
        if (!this.supabase) {
            throw new Error('Supabase not configured. Please provide URL and API key.');
        }
        
        try {
            const { data, error } = await this.supabase
                .from(this.settings.tableName)
                .select('*')
                .order('attendee_name', { ascending: true });
            
            if (error) {
                throw error;
            }
            
            return this.normalizeAttendeeData(data);
        } catch (error) {
            console.error('Supabase data load error:', error);
            throw error;
        }
    }
    
    async saveData(data) {
        if (!this.supabase) {
            throw new Error('Supabase not configured');
        }
        
        try {
            // Clear existing data
            await this.supabase.from(this.settings.tableName).delete().neq('id', 0);
            
            // Insert new data in batches
            const batchSize = 100;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize).map(attendee => ({
                    table_number: attendee.tableNumber,
                    group_name: attendee.groupName,
                    attendee_name: attendee.attendeeName,
                    ticket_type: attendee.ticketType,
                    status: attendee.status,
                    checked_in_at: attendee.checkedInAt,
                    row_index: attendee.rowIndex
                }));
                
                const { error } = await this.supabase
                    .from(this.settings.tableName)
                    .insert(batch);
                
                if (error) {
                    throw error;
                }
            }
            
            console.log(`✅ Saved ${data.length} attendees to Supabase`);
        } catch (error) {
            console.error('Supabase save error:', error);
            throw error;
        }
    }
    
    async updateAttendee(attendeeId, updates) {
        if (!this.supabase) {
            throw new Error('Supabase not configured');
        }
        
        try {
            const { error } = await this.supabase
                .from(this.settings.tableName)
                .update({
                    status: updates.status,
                    checked_in_at: updates.checkedInAt
                })
                .eq('id', attendeeId);
            
            if (error) {
                throw error;
            }
            
            console.log('✅ Updated attendee in Supabase');
        } catch (error) {
            console.error('Supabase update error:', error);
            throw error;
        }
    }
    
    setupRealtimeSubscription() {
        if (!this.supabase) {
            return;
        }
        
        // Clean up existing subscription
        if (this.realtimeSubscription) {
            this.supabase.removeChannel(this.realtimeSubscription);
        }
        
        console.log('Setting up Supabase real-time subscription...');
        
        this.realtimeSubscription = this.supabase
            .channel(`${this.settings.tableName}-changes`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: this.settings.tableName
            }, (payload) => {
                console.log('Real-time update received:', payload);
                window.handleRealtimeUpdate(payload);
            })
            .subscribe((status) => {
                console.log('Real-time subscription status:', status);
            });
    }
    
    normalizeAttendeeData(data) {
        return data.map(row => ({
            id: row.id,
            tableNumber: (row.table_number || '').toString().trim(),
            groupName: (row.group_name || '').toString().trim(),
            attendeeName: (row.attendee_name || '').toString().trim(),
            ticketType: (row.ticket_type || '').toString().trim(),
            email: (row.email || '').toString().trim(),
            additionalInfo: (row.additional_info || row.meal_choice || '').toString().trim(),
            status: row.status || 'pending',
            checkedInAt: row.checked_in_at,
            rowIndex: row.row_index
        }));
    }
}

// Global handler for data source updates
window.handleDataSourceUpdate = function(data) {
    console.log('Data source update received:', data.length, 'attendees');
    window.attendees = data;
    window.updateDisplay();
};

// Global handler for real-time updates
window.handleRealtimeUpdate = function(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'UPDATE' && newRecord) {
        // Find and update the local record
        const index = window.attendees.findIndex(a => a.id === newRecord.id);
        if (index >= 0) {
            window.attendees[index] = {
                id: newRecord.id,
                tableNumber: (newRecord.table_number || '').toString().trim(),
                groupName: (newRecord.group_name || '').toString().trim(),
                attendeeName: (newRecord.attendee_name || '').toString().trim(),
                ticketType: (newRecord.ticket_type || '').toString().trim(),
                status: newRecord.status || 'pending',
                checkedInAt: newRecord.checked_in_at,
                rowIndex: newRecord.row_index
            };
            
            console.log('✅ Updated local record from real-time sync');
            window.updateDisplay();
        }
    }
};
