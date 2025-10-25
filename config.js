// Event Check-in App Configuration System
// Handles environment-based configuration, localStorage persistence, and dynamic theming

window.EventCheckinConfig = {
    // App Information
    appName: "Event Check-in System",
    version: "2.0.0",
    
    // Event Configuration (can be changed in admin panel)
    eventTitle: "David Jolly Forum",
    eventSubtitle: "Event Check-in",
    eventDate: "",
    eventTime: "",
    eventLocation: "",
    
    // Color Scheme (can be changed in admin panel)
    primaryColor: "#5ac1ee",
    primaryColorHover: "#4ab3d9",
    primaryColorLight: "rgba(90, 193, 238, 0.1)",
    primaryColorDark: "#3a9bc4",
    
    // Data Source Configuration
    dataSource: {
        type: "csv", // "csv", "googlesheets", "supabase"
        settings: {
            // CSV settings
            csv: {
                uploadUrl: "csv-handler.php",
                pollUrl: "csv-handler.php?action=get",
                pollInterval: 5000
            },
            // Google Sheets settings
            googlesheets: {
                sheetUrl: "",
                pollInterval: 5000,
                proxyUrl: "",
                fallbackMethods: ["direct", "proxy", "manual"]
            },
            // Supabase settings
            supabase: {
                url: "",
                anonKey: "",
                tableName: "html_attendees"
            }
        }
    },
    
    // Database Configuration (legacy support)
    database: {
        url: "",
        anonKey: "",
        tableName: "html_attendees"
    },
    
    // UI Configuration
    ui: {
        showStats: true,
        showSearch: true,
        showSorting: true,
        displayOptions: {
            attendeeName: true,
            tableNumber: true,
            group: true,
            ticketType: true
        },
        enableBulkActions: true,
        enableExport: true,
        enableRealTime: true
    },
    
    // Feature Flags
    features: {
        bulkCheckIn: true,
        exportReports: true,
        realTimeSync: true,
        adminPanel: true,
        googleSheetsSync: true,
        fileUpload: true,
        csvUpload: true
    },
    
    // Google Sheets Configuration
    googleSheets: {
        fallbackMethods: ["direct", "proxy", "manual"],
        proxyUrl: ""
    },
    
    // Default Settings
    defaults: {
        autoRefresh: 5000, // 5 seconds
        pageSize: 50,
        sortBy: "attendeeName",
        sortDirection: "asc",
        consoleLogging: false // Console logging toggle
    }
};

// Console logging helper (respects consoleLogging setting)
window.debugLog = function(...args) {
    const consoleLogging = window.EventCheckinConfig?.defaults?.consoleLogging || false;
    if (consoleLogging) {
        console.log(...args);
    }
};

window.debugWarn = function(...args) {
    const consoleLogging = window.EventCheckinConfig?.defaults?.consoleLogging || false;
    if (consoleLogging) {
        console.warn(...args);
    }
};

window.debugError = function(...args) {
    const consoleLogging = window.EventCheckinConfig?.defaults?.consoleLogging || false;
    if (consoleLogging) {
        console.error(...args);
    }
};

// Configuration loader
window.loadConfig = function() {
    // Try to load from localStorage first (admin settings)
    const savedConfig = localStorage.getItem('eventCheckinConfig');
    if (savedConfig) {
        try {
            const parsed = JSON.parse(savedConfig);
            Object.assign(window.EventCheckinConfig, parsed);
        } catch (e) {
            console.warn('Failed to load saved config:', e);
        }
    }
    
    // Load environment-specific settings
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Development settings
        window.EventCheckinConfig.dataSource.settings.supabase.url = 'https://efcgzxjwystresjbcezc.supabase.co';
        window.EventCheckinConfig.dataSource.settings.supabase.anonKey = 'YOUR_DEV_API_KEY_HERE';
        const devProxyUrl = 'http://localhost:8080/gsheet';
        window.EventCheckinConfig.dataSource.settings.googlesheets.proxyUrl = devProxyUrl;
        window.EventCheckinConfig.googleSheets.proxyUrl = devProxyUrl;
    } else {
        // Production settings - these should be set by the hosting environment
        window.EventCheckinConfig.dataSource.settings.supabase.url = window.ENV_SUPABASE_URL || '';
        window.EventCheckinConfig.dataSource.settings.supabase.anonKey = window.ENV_SUPABASE_ANON_KEY || '';
        const prodProxyUrl = window.ENV_PROXY_URL || '';
        window.EventCheckinConfig.dataSource.settings.googlesheets.proxyUrl = prodProxyUrl;
        window.EventCheckinConfig.googleSheets.proxyUrl = prodProxyUrl;
    }
    
    // Apply loaded configuration
    applyConfiguration();
};

// Apply configuration to the app
function applyConfiguration() {
    // Apply color scheme
    if (window.EventCheckinConfig.primaryColor) {
        applyColorScheme(window.EventCheckinConfig.primaryColor);
    }
    
    // Apply event title
    if (window.EventCheckinConfig.eventTitle) {
        updateEventTitle(window.EventCheckinConfig.eventTitle);
    }
    
    // Apply subtitle
    if (window.EventCheckinConfig.eventSubtitle) {
        const subtitleEl = document.getElementById('eventSubtitle');
        if (subtitleEl) {
            subtitleEl.textContent = window.EventCheckinConfig.eventSubtitle;
        }
    }
}

// Save configuration (for admin panel)
window.saveConfig = function(newConfig) {
    const merged = Object.assign({}, window.EventCheckinConfig, newConfig);
    localStorage.setItem('eventCheckinConfig', JSON.stringify(merged));
    Object.assign(window.EventCheckinConfig, merged);
    
    // Apply visual changes immediately
    if (newConfig.primaryColor) {
        applyColorScheme(newConfig.primaryColor);
    }
    
    if (newConfig.eventTitle) {
        updateEventTitle(newConfig.eventTitle);
    }
    
    if (newConfig.eventSubtitle) {
        const subtitleEl = document.getElementById('eventSubtitle');
        if (subtitleEl) {
            subtitleEl.textContent = newConfig.eventSubtitle;
        }
    }
    
    // Apply event details if they exist
    if (window.updateEventDetails) {
        window.updateEventDetails();
    }
    
    console.log('Configuration saved:', newConfig);
};

// Apply color scheme dynamically
window.applyColorScheme = function(primaryColor) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', primaryColor);
    
    // Calculate hover and light variants
    const hoverColor = adjustColor(primaryColor, -20);
    const lightColor = adjustColor(primaryColor, 80);
    
    root.style.setProperty('--primary-color-hover', hoverColor);
    root.style.setProperty('--primary-color-light', lightColor);
    
    // Update any existing elements that use the old hardcoded colors
    updateExistingColors(primaryColor);
};

// Update existing color references in the DOM
function updateExistingColors(primaryColor) {
    // Update any elements that might have hardcoded colors
    const elements = document.querySelectorAll('[style*="#5ac1ee"], [style*="rgba(90, 193, 238"]');
    elements.forEach(el => {
        const style = el.getAttribute('style');
        if (style) {
            el.setAttribute('style', style.replace(/#5ac1ee/g, primaryColor));
        }
    });
}

// Update event title
window.updateEventTitle = function(title) {
    const titleElements = document.querySelectorAll('.header h1, .header-title-desktop, .header-title-mobile');
    titleElements.forEach(el => {
        if (el.classList.contains('header-title-desktop')) {
            el.innerHTML = title.replace(' ', ' <br />');
        } else {
            el.textContent = title;
        }
    });
};

// Get current data source configuration
window.getDataSourceConfig = function() {
    return window.EventCheckinConfig.dataSource;
};

// Set data source
window.setDataSource = function(type, settings) {
    window.EventCheckinConfig.dataSource.type = type;
    if (settings) {
        Object.assign(window.EventCheckinConfig.dataSource.settings[type], settings);
    }
    
    // Save to localStorage
    localStorage.setItem('eventCheckinConfig', JSON.stringify(window.EventCheckinConfig));
};

// Utility function to adjust color brightness
function adjustColor(color, amount) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// Initialize configuration when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.loadConfig);
} else {
    window.loadConfig();
}