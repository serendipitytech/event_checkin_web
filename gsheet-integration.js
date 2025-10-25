// Enhanced Google Sheets Integration
// Handles multiple methods for reliable Google Sheets access

window.GoogleSheetsIntegration = {
    
    // Main sync function with multiple fallback methods
    async syncFromGoogleSheet(sheetUrl) {
        const methods = window.EventCheckinConfig.googleSheets.fallbackMethods;
        
        for (const method of methods) {
            try {
                console.log(`Trying Google Sheets sync method: ${method}`);
                const data = await this[`syncMethod_${method}`](sheetUrl);
                if (data && data.length > 0) {
                    console.log(`✅ Successfully synced ${data.length} attendees using ${method} method`);
                    return data;
                }
            } catch (error) {
                console.warn(`Method ${method} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All Google Sheets sync methods failed. Please try manual upload instead.');
    },
    
    // Method 1: Direct access (works for published sheets)
    async syncMethod_direct(sheetUrl) {
        const csvUrl = this.buildGoogleSheetCsvUrl(sheetUrl);
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        return this.parseCsvData(csvText);
    },
    
    // Method 2: Proxy server (handles CORS issues)
    async syncMethod_proxy(sheetUrl) {
        const csvUrl = this.buildGoogleSheetCsvUrl(sheetUrl);
        const proxyUrl = `${window.EventCheckinConfig.googleSheets.proxyUrl}?url=${encodeURIComponent(csvUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Proxy error: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        return this.parseCsvData(csvText);
    },
    
    // Method 3: Manual upload fallback
    async syncMethod_manual() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.xlsx';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }
                
                try {
                    const data = await this.parseFile(file);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            input.click();
        });
    },
    
    // Build Google Sheet CSV URL
    buildGoogleSheetCsvUrl(input) {
        const trimmed = (input || '').trim();
        if (!trimmed) return '';
        
        try {
            const url = new URL(trimmed);
            
            // Handle different Google Sheets URL formats
            if (url.host.includes('docs.google.com')) {
                // Standard Google Sheets URL
                if (url.pathname.includes('/pub') || url.searchParams.get('output') === 'csv') {
                    return trimmed; // Already a CSV URL
                }
                
                // Extract sheet ID and convert to CSV
                const pathSegments = url.pathname.split('/').filter(Boolean);
                const spreadsheetIndex = pathSegments.indexOf('spreadsheets');
                
                if (spreadsheetIndex !== -1 && pathSegments[spreadsheetIndex + 1] === 'd') {
                    const sheetId = pathSegments[spreadsheetIndex + 2];
                    let gid = url.searchParams.get('gid');
                    
                    if (!gid && url.hash.includes('gid=')) {
                        const hashParams = new URLSearchParams(url.hash.replace('#', ''));
                        gid = hashParams.get('gid');
                    }
                    
                    const gidQuery = gid ? `&gid=${gid}` : '';
                    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidQuery}`;
                }
            }
            
            return trimmed; // Return as-is if not a Google Sheets URL
            
        } catch (error) {
            console.warn('URL parsing failed:', error);
            return trimmed;
        }
    },
    
    // Parse CSV data
    parseCsvData(csvText) {
        try {
            // Try using XLSX library first (handles various formats)
            const workbook = XLSX.read(csvText, { type: 'string' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false });
            return this.parseSheetRows(rows);
        } catch (error) {
            console.warn('XLSX parsing failed, trying manual CSV parsing:', error);
            
            // Fallback to manual CSV parsing
            const lines = csvText.split('\n');
            const dataRows = lines.slice(1).filter(line => line.trim());
            
            return dataRows.map((line, index) => {
                const values = line.split(',').map(value => 
                    value.trim().replace(/^"|"$/g, '') // Remove quotes
                );
                return this.normalizeAttendee(values, index + 2);
            }).filter(Boolean);
        }
    },
    
    // Parse uploaded file
    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    let data;
                    
                    if (file.name.endsWith('.csv')) {
                        data = this.parseCsvData(e.target.result);
                    } else {
                        // Handle Excel files
                        const workbook = XLSX.read(e.target.result, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        data = this.parseSheetRows(jsonData);
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    },
    
    // Parse sheet rows
    parseSheetRows(rows) {
        return rows
            .slice(1) // Skip header row
            .filter(row => row && (row[0] || row[1] || row[2])) // Keep rows with data
            .map((row, index) => this.normalizeAttendee(row, index + 2))
            .filter(Boolean);
    },
    
    // Normalize attendee data
    normalizeAttendee(values, rowIndex) {
        const attendee = {
            tableNumber: (values[0] || '').toString().trim(),
            groupName: (values[1] || '').toString().trim(),
            attendeeName: (values[2] || '').toString().trim(),
            ticketType: (values[3] || '').toString().trim(),
            status: 'pending',
            rowIndex
        };
        
        // Handle David Jolly Forum format: prioritize attendee name, use ticket type as group if no group
        if (!attendee.groupName && attendee.ticketType) {
            attendee.groupName = attendee.ticketType;
        }
        if (!attendee.tableNumber) {
            attendee.tableNumber = 'General';
        }
        
        return (attendee.tableNumber || attendee.groupName || attendee.attendeeName) ? attendee : null;
    },
    
    // Test Google Sheets connection
    async testConnection(sheetUrl) {
        try {
            const csvUrl = this.buildGoogleSheetCsvUrl(sheetUrl);
            const response = await fetch(csvUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
};
