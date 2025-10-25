// Admin Panel for Event Check-in App
// Provides comprehensive configuration interface for administrators

window.AdminPanel = {
    
    // Initialize admin panel
    init() {
        this.createAdminModal();
        this.bindEvents();
        this.loadCurrentSettings();
    },
    
    // Create admin modal HTML
    createAdminModal() {
        const modalHTML = `
            <div id="adminModal" class="admin-modal" style="display: none;">
                <div class="admin-modal-content">
                    <div class="admin-modal-header">
                        <h2>⚙️ Admin Configuration</h2>
                        <button class="admin-close" onclick="AdminPanel.close()">&times;</button>
                    </div>
                    
                    <div class="admin-modal-body">
                        <!-- Event Settings -->
                        <div class="admin-section">
                            <h3>Event Settings</h3>
                            <div class="admin-field">
                                <label for="adminEventTitle">Event Title:</label>
                                <input type="text" id="adminEventTitle" placeholder="Enter event title">
                            </div>
                            <div class="admin-field">
                                <label for="adminEventSubtitle">Event Subtitle:</label>
                                <input type="text" id="adminEventSubtitle" placeholder="Enter event subtitle">
                            </div>
                        </div>
                        
                        <!-- Appearance -->
                        <div class="admin-section">
                            <h3>Appearance</h3>
                            <div class="admin-field">
                                <label for="adminPrimaryColor">Primary Color:</label>
                                <input type="color" id="adminPrimaryColor" value="#5ac1ee">
                            </div>
                            <div class="admin-field">
                                <label>
                                    <input type="checkbox" id="adminShowStats"> Show Statistics
                                </label>
                            </div>
                            <div class="admin-field">
                                <label>
                                    <input type="checkbox" id="adminShowSearch"> Show Search
                                </label>
                            </div>
                        </div>
                        
                        <!-- Data Source Selection -->
                        <div class="admin-section">
                            <h3>Data Source</h3>
                            <div class="admin-field">
                                <label>Select Data Source:</label>
                                <div class="radio-group">
                                    <label class="radio-option">
                                        <input type="radio" name="dataSource" value="csv" id="dataSourceCsv">
                                        <span class="radio-label">CSV File (Server Upload)</span>
                                        <small>Upload CSV file to server for multi-user sync</small>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="dataSource" value="googlesheets" id="dataSourceGoogleSheets">
                                        <span class="radio-label">Google Sheets</span>
                                        <small>Sync from published Google Sheet</small>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="dataSource" value="supabase" id="dataSourceSupabase">
                                        <span class="radio-label">Supabase Database</span>
                                        <small>Direct database connection with real-time sync</small>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- CSV Settings -->
                        <div class="admin-section" id="csvSettings" style="display: none;">
                            <h3>CSV Settings</h3>
                            <div class="admin-field">
                                <label for="csvFileUpload">Upload CSV File:</label>
                                <input type="file" id="csvFileUpload" accept=".csv" onchange="AdminPanel.handleCsvUpload(event)">
                                <button type="button" class="admin-btn admin-btn-secondary" onclick="AdminPanel.uploadCsvFile()">Upload File</button>
                            </div>
                            <div class="admin-field" id="csvStatus">
                                <label>Current File Status:</label>
                                <div id="csvStatusInfo">No file uploaded</div>
                            </div>
                            <div class="admin-field">
                                <label for="csvPollInterval">Poll Interval (seconds):</label>
                                <select id="csvPollInterval">
                                    <option value="1000">1 second</option>
                                    <option value="3000">3 seconds</option>
                                    <option value="5000" selected>5 seconds</option>
                                    <option value="10000">10 seconds</option>
                                    <option value="30000">30 seconds</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Google Sheets Settings -->
                        <div class="admin-section" id="googleSheetsSettings" style="display: none;">
                            <h3>Google Sheets Settings</h3>
                            <div class="admin-field">
                                <label for="googleSheetsUrl">Google Sheet URL:</label>
                                <input type="url" id="googleSheetsUrl" placeholder="https://docs.google.com/spreadsheets/d/...">
                                <button type="button" class="admin-btn admin-btn-secondary" onclick="AdminPanel.testGoogleSheets()">Test Connection</button>
                            </div>
                            <div class="admin-field">
                                <label for="googleSheetsPollInterval">Poll Interval (seconds):</label>
                                <select id="googleSheetsPollInterval">
                                    <option value="1000">1 second</option>
                                    <option value="3000">3 seconds</option>
                                    <option value="5000" selected>5 seconds</option>
                                    <option value="10000">10 seconds</option>
                                    <option value="30000">30 seconds</option>
                                </select>
                            </div>
                            <div class="admin-field">
                                <label for="googleSheetsProxy">Proxy URL (optional):</label>
                                <input type="url" id="googleSheetsProxy" placeholder="https://your-domain.com/gsheet">
                                <small>Use if direct access fails due to CORS</small>
                            </div>
                        </div>
                        
                        <!-- Supabase Settings -->
                        <div class="admin-section" id="supabaseSettings" style="display: none;">
                            <h3>Supabase Settings</h3>
                            <div class="admin-field">
                                <label for="supabaseUrl">Supabase Project URL:</label>
                                <input type="url" id="supabaseUrl" placeholder="https://your-project.supabase.co">
                            </div>
                            <div class="admin-field">
                                <label for="supabaseKey">Supabase API Key:</label>
                                <input type="password" id="supabaseKey" placeholder="Your anon/public key">
                            </div>
                            <div class="admin-field">
                                <label for="supabaseTable">Table Name:</label>
                                <input type="text" id="supabaseTable" placeholder="html_attendees" value="html_attendees">
                            </div>
                            <div class="admin-field">
                                <button type="button" class="admin-btn admin-btn-secondary" onclick="AdminPanel.testSupabase()">Test Connection</button>
                                <button type="button" class="admin-btn admin-btn-secondary" onclick="AdminPanel.showSupabaseSetup()">Show Setup SQL</button>
                            </div>
                        </div>
                        
                        <!-- Features -->
                        <div class="admin-section">
                            <h3>Features</h3>
                            <div class="admin-field">
                                <label>
                                    <input type="checkbox" id="adminBulkActions"> Enable Bulk Actions
                                </label>
                            </div>
                            <div class="admin-field">
                                <label>
                                    <input type="checkbox" id="adminExportReports"> Enable Export Reports
                                </label>
                            </div>
                            <div class="admin-field">
                                <label>
                                    <input type="checkbox" id="adminRealTimeSync"> Enable Real-time Sync
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-modal-footer">
                        <button class="admin-btn admin-btn-secondary" onclick="AdminPanel.resetToDefaults()">Reset to Defaults</button>
                        <button class="admin-btn admin-btn-primary" onclick="AdminPanel.saveSettings()">Save Settings</button>
                    </div>
                </div>
            </div>
            
            <!-- Supabase Setup Modal -->
            <div id="supabaseSetupModal" class="admin-modal" style="display: none;">
                <div class="admin-modal-content">
                    <div class="admin-modal-header">
                        <h2>Supabase Setup SQL</h2>
                        <button class="admin-close" onclick="AdminPanel.closeSupabaseSetup()">&times;</button>
                    </div>
                    <div class="admin-modal-body">
                        <p>Copy and paste this SQL into your Supabase SQL Editor:</p>
                        <textarea id="supabaseSetupSQL" readonly style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;">
-- Create the html_attendees table
CREATE TABLE html_attendees (
    id SERIAL PRIMARY KEY,
    table_number TEXT,
    group_name TEXT,
    attendee_name TEXT,
    ticket_type TEXT,
    status TEXT DEFAULT 'pending',
    checked_in_at TIMESTAMPTZ,
    row_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_html_attendees_name ON html_attendees(attendee_name);
CREATE INDEX idx_html_attendees_status ON html_attendees(status);

-- Enable Row Level Security
ALTER TABLE html_attendees ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations
CREATE POLICY "Allow all operations on html_attendees" ON html_attendees
FOR ALL USING (true);
                        </textarea>
                        <p><strong>Steps:</strong></p>
                        <ol>
                            <li>Go to your Supabase project dashboard</li>
                            <li>Navigate to SQL Editor</li>
                            <li>Copy and paste the SQL above</li>
                            <li>Click "Run" to execute</li>
                            <li>Verify the table was created successfully</li>
                        </ol>
                    </div>
                    <div class="admin-modal-footer">
                        <button class="admin-btn admin-btn-primary" onclick="AdminPanel.closeSupabaseSetup()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    // Bind admin panel events
    bindEvents() {
        // Add admin button to settings menu
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsMenu) {
            const adminButton = document.createElement('button');
            adminButton.type = 'button';
            adminButton.className = 'settings-action';
            adminButton.innerHTML = '🔧 Admin Panel';
            adminButton.onclick = () => this.open();
            settingsMenu.appendChild(adminButton);
        }
        
        // Bind data source radio buttons
        const dataSourceRadios = document.querySelectorAll('input[name="dataSource"]');
        dataSourceRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.showDataSourceSettings(e.target.value);
            });
        });
        
        // Bind color picker change
        const colorPicker = document.getElementById('adminPrimaryColor');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                this.previewColor(e.target.value);
            });
        }
    },
    
    // Show data source specific settings
    showDataSourceSettings(sourceType) {
        // Hide all settings sections
        document.getElementById('csvSettings').style.display = 'none';
        document.getElementById('googleSheetsSettings').style.display = 'none';
        document.getElementById('supabaseSettings').style.display = 'none';
        
        // Show relevant section
        switch (sourceType) {
            case 'csv':
                document.getElementById('csvSettings').style.display = 'block';
                this.checkCsvStatus();
                break;
            case 'googlesheets':
                document.getElementById('googleSheetsSettings').style.display = 'block';
                break;
            case 'supabase':
                document.getElementById('supabaseSettings').style.display = 'block';
                break;
        }
    },
    
    // Open admin panel
    open() {
        this.loadCurrentSettings();
        document.getElementById('adminModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    },
    
    // Close admin panel
    close() {
        document.getElementById('adminModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    },
    
    // Close Supabase setup modal
    closeSupabaseSetup() {
        document.getElementById('supabaseSetupModal').style.display = 'none';
    },
    
    // Show Supabase setup modal
    showSupabaseSetup() {
        document.getElementById('supabaseSetupModal').style.display = 'block';
    },
    
    // Load current settings into form
    loadCurrentSettings() {
        const config = window.EventCheckinConfig;
        
        // Event settings
        document.getElementById('adminEventTitle').value = config.eventTitle || '';
        document.getElementById('adminEventSubtitle').value = config.eventSubtitle || '';
        document.getElementById('adminPrimaryColor').value = config.primaryColor || '#5ac1ee';
        
        // Data source
        const dataSourceRadio = document.getElementById(`dataSource${config.dataSource.type.charAt(0).toUpperCase() + config.dataSource.type.slice(1)}`);
        if (dataSourceRadio) {
            dataSourceRadio.checked = true;
            this.showDataSourceSettings(config.dataSource.type);
        }
        
        // CSV settings
        document.getElementById('csvPollInterval').value = config.dataSource.settings.csv.pollInterval || 5000;
        
        // Google Sheets settings
        document.getElementById('googleSheetsUrl').value = config.dataSource.settings.googlesheets.sheetUrl || '';
        document.getElementById('googleSheetsPollInterval').value = config.dataSource.settings.googlesheets.pollInterval || 5000;
        document.getElementById('googleSheetsProxy').value = config.dataSource.settings.googlesheets.proxyUrl || '';
        
        // Supabase settings
        document.getElementById('supabaseUrl').value = config.dataSource.settings.supabase.url || '';
        document.getElementById('supabaseKey').value = config.dataSource.settings.supabase.anonKey || '';
        document.getElementById('supabaseTable').value = config.dataSource.settings.supabase.tableName || 'html_attendees';
        
        // Checkboxes
        document.getElementById('adminShowStats').checked = config.ui.showStats !== false;
        document.getElementById('adminShowSearch').checked = config.ui.showSearch !== false;
        document.getElementById('adminBulkActions').checked = config.features.bulkCheckIn !== false;
        document.getElementById('adminExportReports').checked = config.features.exportReports !== false;
        document.getElementById('adminRealTimeSync').checked = config.features.realTimeSync !== false;
    },
    
    // Preview color changes
    previewColor(color) {
        window.applyColorScheme(color);
    },
    
    // Handle CSV file selection
    handleCsvUpload(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('CSV file selected:', file.name);
        }
    },
    
    // Upload CSV file
    async uploadCsvFile() {
        const fileInput = document.getElementById('csvFileUpload');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a CSV file first');
            return;
        }
        
        const formData = new FormData();
        formData.append('csvFile', file);
        
        try {
            const response = await fetch('csv-handler.php?action=upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`File uploaded successfully! ${result.attendee_count} attendees loaded.`);
                this.checkCsvStatus();
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            alert('Upload failed: ' + error.message);
        }
    },
    
    // Check CSV status
    async checkCsvStatus() {
        try {
            const response = await fetch('csv-handler.php?action=status');
            const status = await response.json();
            
            const statusInfo = document.getElementById('csvStatusInfo');
            if (status.has_data && status.metadata) {
                statusInfo.innerHTML = `
                    <strong>File:</strong> ${status.metadata.file_name}<br>
                    <strong>Attendees:</strong> ${status.metadata.attendee_count}<br>
                    <strong>Uploaded:</strong> ${status.metadata.uploaded_at}
                `;
            } else {
                statusInfo.textContent = 'No file uploaded';
            }
        } catch (error) {
            document.getElementById('csvStatusInfo').textContent = 'Error checking status';
        }
    },
    
    // Test Google Sheets connection
    async testGoogleSheets() {
        const url = document.getElementById('googleSheetsUrl').value;
        if (!url) {
            alert('Please enter a Google Sheets URL');
            return;
        }
        
        try {
            // Use the Google Sheets integration to test
            const data = await window.GoogleSheetsIntegration.syncFromGoogleSheet(url);
            alert(`Connection successful! Found ${data.length} attendees.`);
        } catch (error) {
            alert('Connection failed: ' + error.message);
        }
    },
    
    // Test Supabase connection
    async testSupabase() {
        const url = document.getElementById('supabaseUrl').value;
        const key = document.getElementById('supabaseKey').value;
        const table = document.getElementById('supabaseTable').value;
        
        if (!url || !key) {
            alert('Please enter both Supabase URL and API key');
            return;
        }
        
        try {
            const supabase = window.supabase.createClient(url, key);
            const { data, error } = await supabase
                .from(table)
                .select('count')
                .limit(1);
            
            if (error) {
                throw error;
            }
            
            alert('Supabase connection successful!');
        } catch (error) {
            alert('Supabase connection failed: ' + error.message);
        }
    },
    
    // Save settings
    async saveSettings() {
        const newConfig = {
            eventTitle: document.getElementById('adminEventTitle').value,
            eventSubtitle: document.getElementById('adminEventSubtitle').value,
            primaryColor: document.getElementById('adminPrimaryColor').value,
            dataSource: {
                type: document.querySelector('input[name="dataSource"]:checked').value,
                settings: {
                    csv: {
                        pollInterval: parseInt(document.getElementById('csvPollInterval').value)
                    },
                    googlesheets: {
                        sheetUrl: document.getElementById('googleSheetsUrl').value,
                        pollInterval: parseInt(document.getElementById('googleSheetsPollInterval').value),
                        proxyUrl: document.getElementById('googleSheetsProxy').value
                    },
                    supabase: {
                        url: document.getElementById('supabaseUrl').value,
                        anonKey: document.getElementById('supabaseKey').value,
                        tableName: document.getElementById('supabaseTable').value
                    }
                }
            },
            ui: {
                showStats: document.getElementById('adminShowStats').checked,
                showSearch: document.getElementById('adminShowSearch').checked
            },
            features: {
                bulkCheckIn: document.getElementById('adminBulkActions').checked,
                exportReports: document.getElementById('adminExportReports').checked,
                realTimeSync: document.getElementById('adminRealTimeSync').checked
            }
        };
        
        // Validate required fields based on data source
        const dataSourceType = newConfig.dataSource.type;
        if (dataSourceType === 'supabase') {
            if (!newConfig.dataSource.settings.supabase.url || !newConfig.dataSource.settings.supabase.anonKey) {
                alert('Please provide both Supabase URL and API Key');
                return;
            }
        } else if (dataSourceType === 'googlesheets') {
            if (!newConfig.dataSource.settings.googlesheets.sheetUrl) {
                alert('Please provide a Google Sheets URL');
                return;
            }
        }
        
        // Save configuration
        window.saveConfig(newConfig);
        
        // Switch data source if needed
        if (window.DataSourceManager) {
            const switched = await window.DataSourceManager.switchDataSource(
                newConfig.dataSource.type,
                newConfig.dataSource.settings[newConfig.dataSource.type]
            );
            
            if (!switched) {
                alert('Failed to switch data source. Please check your settings.');
                return;
            }
        }
        
        // Show success message
        alert('Settings saved successfully! The page will refresh to apply changes.');
        
        // Close modal and refresh
        this.close();
        setTimeout(() => window.location.reload(), 1000);
    },
    
    // Reset to defaults
    resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will clear all customizations.')) {
            localStorage.removeItem('eventCheckinConfig');
            window.location.reload();
        }
    }
};

// Add admin panel styles
const adminStyles = `
<style>
.admin-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.admin-modal-content {
    background: white;
    border-radius: 12px;
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.admin-modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.admin-modal-header h2 {
    margin: 0;
    color: #333;
}

.admin-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
}

.admin-modal-body {
    padding: 20px;
}

.admin-section {
    margin-bottom: 30px;
}

.admin-section h3 {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 16px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
}

.admin-field {
    margin-bottom: 15px;
}

.admin-field label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #555;
}

.admin-field input[type="text"],
.admin-field input[type="url"],
.admin-field input[type="password"] {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
}

.admin-field input[type="color"] {
    width: 50px;
    height: 40px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}

.admin-field input[type="checkbox"] {
    margin-right: 8px;
}

.admin-field select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
}

.radio-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.radio-option {
    display: flex;
    flex-direction: column;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.radio-option:hover {
    background: #f5f5f5;
}

.radio-option input[type="radio"] {
    margin-right: 8px;
}

.radio-label {
    font-weight: 600;
    margin-bottom: 2px;
}

.radio-option small {
    color: #666;
    font-size: 12px;
}

.admin-modal-footer {
    padding: 20px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.admin-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
}

.admin-btn-primary {
    background: var(--primary-color, #5ac1ee);
    color: white;
}

.admin-btn-primary:hover {
    background: var(--primary-color-hover, #4ab3d9);
}

.admin-btn-secondary {
    background: #f5f5f5;
    color: #333;
}

.admin-btn-secondary:hover {
    background: #e5e5e5;
}

.data-source-indicator {
    position: absolute;
    top: 20px;
    left: 20px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.data-source-indicator.csv {
    background: #e3f2fd;
    color: #1976d2;
}

.data-source-indicator.googlesheets {
    background: #e8f5e8;
    color: #2e7d32;
}

.data-source-indicator.supabase {
    background: #fff3e0;
    color: #f57c00;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', adminStyles);