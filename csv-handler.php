<?php
/**
 * CSV Handler for Event Check-in App
 * Handles secure file upload and JSON data polling
 */

// Enable CORS for cross-origin requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$DATA_DIR = __DIR__ . '/data/';
$ALLOWED_EXTENSIONS = ['csv', 'xlsx'];
$MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure data directory exists
if (!file_exists($DATA_DIR)) {
    mkdir($DATA_DIR, 0755, true);
}

// Get action from query parameter
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'upload':
            handleUpload();
            break;
        case 'get':
            handleGetData();
            break;
        case 'status':
            handleStatus();
            break;
        case 'checkin':
            handleCheckin();
            break;
        case 'getcheckins':
            handleGetCheckins();
            break;
        case 'clearcheckins':
            handleClearCheckins();
            break;
        case 'getconfig':
            handleGetConfig();
            break;
        case 'saveconfig':
            handleSaveConfig();
            break;
        case 'getadminpassword':
            handleGetAdminPassword();
            break;
        case 'setadminpassword':
            handleSetAdminPassword();
            break;
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Handle file upload
 */
function handleUpload() {
    global $DATA_DIR, $ALLOWED_EXTENSIONS, $MAX_FILE_SIZE;
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed for uploads');
    }
    
    if (!isset($_FILES['csvFile'])) {
        throw new Exception('No file uploaded');
    }
    
    $file = $_FILES['csvFile'];
    
    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error: ' . $file['error']);
    }
    
    if ($file['size'] > $MAX_FILE_SIZE) {
        throw new Exception('File too large. Maximum size: 10MB');
    }
    
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($fileExtension, $ALLOWED_EXTENSIONS)) {
        throw new Exception('Invalid file type. Allowed: ' . implode(', ', $ALLOWED_EXTENSIONS));
    }
    
    // Process the file
    $attendeeData = processUploadedFile($file['tmp_name'], $fileExtension);
    
    // Save as JSON
    $jsonFile = $DATA_DIR . 'attendees.json';
    $result = file_put_contents($jsonFile, json_encode($attendeeData, JSON_PRETTY_PRINT));
    
    if ($result === false) {
        throw new Exception('Failed to save data');
    }
    
    // Save metadata
    $metadata = [
        'uploaded_at' => date('Y-m-d H:i:s'),
        'file_name' => $file['name'],
        'file_size' => $file['size'],
        'attendee_count' => count($attendeeData),
        'file_type' => $fileExtension
    ];
    
    file_put_contents($DATA_DIR . 'metadata.json', json_encode($metadata, JSON_PRETTY_PRINT));
    
    echo json_encode([
        'success' => true,
        'message' => 'File uploaded successfully',
        'attendee_count' => count($attendeeData),
        'metadata' => $metadata
    ]);
}

/**
 * Handle data retrieval
 */
function handleGetData() {
    global $DATA_DIR;
    
    $jsonFile = $DATA_DIR . 'attendees.json';
    
    if (!file_exists($jsonFile)) {
        echo json_encode([]);
        return;
    }
    
    $data = file_get_contents($jsonFile);
    if ($data === false) {
        throw new Exception('Failed to read data file');
    }
    
    $attendees = json_decode($data, true);
    if ($attendees === null) {
        throw new Exception('Invalid JSON data');
    }
    
    echo json_encode($attendees);
}

/**
 * Handle status check
 */
function handleStatus() {
    global $DATA_DIR;
    
    $jsonFile = $DATA_DIR . 'attendees.json';
    $metadataFile = $DATA_DIR . 'metadata.json';
    
    $status = [
        'has_data' => file_exists($jsonFile),
        'metadata' => null
    ];
    
    if (file_exists($metadataFile)) {
        $metadata = json_decode(file_get_contents($metadataFile), true);
        $status['metadata'] = $metadata;
    }
    
    echo json_encode($status);
}

/**
 * Process uploaded file and extract attendee data
 */
function processUploadedFile($filePath, $extension) {
    $attendees = [];
    
    if ($extension === 'csv') {
        $attendees = processCsvFile($filePath);
    } elseif ($extension === 'xlsx') {
        $attendees = processXlsxFile($filePath);
    }
    
    return $attendees;
}

/**
 * Process CSV file
 */
function processCsvFile($filePath) {
    $attendees = [];
    $handle = fopen($filePath, 'r');
    
    if ($handle === false) {
        throw new Exception('Failed to open CSV file');
    }
    
    $rowIndex = 1; // Start from 1 (header is row 0)
    
    while (($data = fgetcsv($handle)) !== false) {
        $rowIndex++;
        
        // Skip empty rows
        if (empty(array_filter($data))) {
            continue;
        }
        
        // Normalize attendee data
        $attendee = [
            'id' => 'csv_' . $rowIndex,
            'tableNumber' => trim($data[0] ?? ''),
            'groupName' => trim($data[1] ?? ''),
            'attendeeName' => trim($data[2] ?? ''),
            'ticketType' => trim($data[3] ?? ''),
            'status' => 'pending',
            'checkedInAt' => null,
            'rowIndex' => $rowIndex
        ];
        
        // Handle David Jolly Forum format: prioritize attendee name, use ticket type as group if no group
        if (!empty($attendee['ticketType']) && empty($attendee['groupName'])) {
            $attendee['groupName'] = $attendee['ticketType'];
        }
        if (empty($attendee['tableNumber'])) {
            $attendee['tableNumber'] = 'General';
        }
        
        // Only include if we have at least one key identifier
        if (!empty($attendee['attendeeName']) || !empty($attendee['groupName']) || !empty($attendee['tableNumber'])) {
            $attendees[] = $attendee;
        }
    }
    
    fclose($handle);
    
    return $attendees;
}

/**
 * Process XLSX file (requires PHPExcel or similar library)
 * For now, we'll use a simple approach with basic CSV-like processing
 */
function processXlsxFile($filePath) {
    // This is a simplified XLSX processor
    // In a production environment, you might want to use a proper library like PhpSpreadsheet
    
    // For now, we'll treat it as CSV and let the client handle XLSX processing
    // The client-side JavaScript can handle XLSX files better
    
    throw new Exception('XLSX files should be processed client-side. Please use CSV format or process XLSX in the browser.');
}

/**
 * Security helper: sanitize filename
 */
function sanitizeFilename($filename) {
    $filename = basename($filename);
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
    return $filename;
}

/**
 * Security helper: validate file content
 */
function validateFileContent($filePath) {
    $content = file_get_contents($filePath, false, null, 0, 1024); // Read first 1KB
    
    // Check for suspicious content
    $suspiciousPatterns = [
        '/<script/i',
        '/javascript:/i',
        '/vbscript:/i',
        '/onload=/i',
        '/onerror=/i'
    ];
    
    foreach ($suspiciousPatterns as $pattern) {
        if (preg_match($pattern, $content)) {
            throw new Exception('File contains potentially malicious content');
        }
    }
    
    return true;
}

/**
 * Handle check-in status updates
 */
function handleCheckin() {
    global $DATA_DIR;
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed for check-ins');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['attendeeId']) || !isset($input['status'])) {
        throw new Exception('Missing required fields: attendeeId, status');
    }
    
    $checkinFile = $DATA_DIR . 'checkins.json';
    $checkins = [];
    
    // Load existing check-ins
    if (file_exists($checkinFile)) {
        $data = file_get_contents($checkinFile);
        if ($data !== false) {
            $checkins = json_decode($data, true) ?: [];
        }
    }
    
    // Update check-in status
    $checkins[$input['attendeeId']] = [
        'status' => $input['status'],
        'checkedInAt' => $input['checkedInAt'] ?? null,
        'timestamp' => date('Y-m-d H:i:s'),
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
    ];
    
    // Save check-ins
    $result = file_put_contents($checkinFile, json_encode($checkins, JSON_PRETTY_PRINT));
    
    if ($result === false) {
        throw new Exception('Failed to save check-in data');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Check-in status updated',
        'attendeeId' => $input['attendeeId'],
        'status' => $input['status']
    ]);
}

/**
 * Handle check-in status retrieval
 */
function handleGetCheckins() {
    global $DATA_DIR;
    
    $checkinFile = $DATA_DIR . 'checkins.json';
    
    if (!file_exists($checkinFile)) {
        echo json_encode([]);
        return;
    }
    
    $data = file_get_contents($checkinFile);
    if ($data === false) {
        throw new Exception('Failed to read check-in data');
    }
    
    $checkins = json_decode($data, true);
    if ($checkins === null) {
        throw new Exception('Invalid check-in data');
    }
    
    echo json_encode($checkins);
}

/**
 * Handle clearing all check-in status
 */
function handleClearCheckins() {
    global $DATA_DIR;
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed for clearing check-ins');
    }
    
    // Verify admin token
    $adminToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($adminToken !== 'admin123') {
        throw new Exception('Unauthorized: Invalid admin token');
    }
    
    $checkinFile = $DATA_DIR . 'checkins.json';
    
    // Clear the check-in file
    if (file_exists($checkinFile)) {
        $result = file_put_contents($checkinFile, '{}');
        if ($result === false) {
            throw new Exception('Failed to clear check-in data');
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'All check-ins have been cleared',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Handle configuration retrieval
 */
function handleGetConfig() {
    global $DATA_DIR;
    
    $configFile = $DATA_DIR . 'app-config.json';
    
    if (!file_exists($configFile)) {
        // Return default configuration
        $defaultConfig = [
            'eventTitle' => 'Event Check-in',
            'eventSubtitle' => 'Event Check-in System',
            'eventDate' => '',
            'eventTime' => '',
            'eventLocation' => '',
            'primaryColor' => '#5ac1ee',
            'dataSource' => [
                'type' => 'csv',
                'settings' => [
                    'csv' => [
                        'pollUrl' => 'csv-handler.php?action=get',
                        'pollInterval' => 5000
                    ],
                    'googlesheets' => [
                        'sheetUrl' => '',
                        'pollInterval' => 5000,
                        'proxyUrl' => ''
                    ],
                    'supabase' => [
                        'url' => '',
                        'anonKey' => '',
                        'tableName' => 'html_attendees'
                    ]
                ]
            ],
            'ui' => [
                'showStats' => true,
                'showSearch' => true,
                'showSorting' => true
            ],
            'features' => [
                'bulkCheckIn' => true,
                'exportReports' => true,
                'realTimeSync' => true
            ]
        ];
        echo json_encode($defaultConfig);
        return;
    }
    
    $data = file_get_contents($configFile);
    if ($data === false) {
        throw new Exception('Failed to read configuration file');
    }
    
    $config = json_decode($data, true);
    if ($config === null) {
        throw new Exception('Invalid configuration data');
    }
    
    echo json_encode($config);
}

/**
 * Handle configuration saving
 */
function handleSaveConfig() {
    global $DATA_DIR;
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed for saving configuration');
    }
    
    // Verify admin authentication
    $adminToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($adminToken !== 'admin123' && $adminToken !== 'event2024') {
        throw new Exception('Unauthorized: Invalid admin token');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid configuration data');
    }
    
    // Validate required fields
    $requiredFields = ['eventTitle', 'dataSource'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Sanitize and validate data source
    if (!in_array($input['dataSource']['type'], ['csv', 'googlesheets', 'supabase'])) {
        throw new Exception('Invalid data source type');
    }
    
    // Save configuration
    $configFile = $DATA_DIR . 'app-config.json';
    $result = file_put_contents($configFile, json_encode($input, JSON_PRETTY_PRINT));
    
    if ($result === false) {
        throw new Exception('Failed to save configuration');
    }
    
    // Save metadata
    $metadata = [
        'saved_at' => date('Y-m-d H:i:s'),
        'saved_by' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
    ];
    
    file_put_contents($DATA_DIR . 'config-metadata.json', json_encode($metadata, JSON_PRETTY_PRINT));
    
    echo json_encode([
        'success' => true,
        'message' => 'Configuration saved successfully',
        'metadata' => $metadata
    ]);
}

/**
 * Handle getting admin password status
 */
function handleGetAdminPassword() {
    global $DATA_DIR;
    
    $passwordFile = $DATA_DIR . 'admin-password.txt';
    
    if (!file_exists($passwordFile)) {
        echo json_encode([
            'hasPassword' => false,
            'password' => ''
        ]);
        return;
    }
    
    $password = trim(file_get_contents($passwordFile));
    echo json_encode([
        'hasPassword' => !empty($password),
        'password' => $password
    ]);
}

/**
 * Handle setting admin password
 */
function handleSetAdminPassword() {
    global $DATA_DIR;
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed for setting password');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['password'])) {
        throw new Exception('Password is required');
    }
    
    $password = trim($input['password']);
    
    // If empty password, remove the file (disable password protection)
    if (empty($password)) {
        $passwordFile = $DATA_DIR . 'admin-password.txt';
        if (file_exists($passwordFile)) {
            unlink($passwordFile);
        }
        echo json_encode([
            'success' => true,
            'message' => 'Admin password protection disabled'
        ]);
        return;
    }
    
    // Save password to file
    $passwordFile = $DATA_DIR . 'admin-password.txt';
    $result = file_put_contents($passwordFile, $password, LOCK_EX);
    
    if ($result === false) {
        throw new Exception('Failed to save password');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Admin password set successfully'
    ]);
}
?>
