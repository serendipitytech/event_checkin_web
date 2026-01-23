/**
 * Email Validation Test Suite
 * Following TDD approach - tests written before implementation
 */

// Test runner (simple implementation for browser compatibility)
const TestRunner = {
    results: [],

    test(description, fn) {
        try {
            fn();
            this.results.push({ description, status: 'PASS', error: null });
            console.log(`✓ ${description}`);
        } catch (error) {
            this.results.push({ description, status: 'FAIL', error: error.message });
            console.error(`✗ ${description}`);
            console.error(`  ${error.message}`);
        }
    },

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    },

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    },

    printSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = total - passed;

        console.log('\n' + '='.repeat(50));
        console.log(`Test Results: ${passed}/${total} passed, ${failed} failed`);
        console.log('='.repeat(50));

        return { total, passed, failed };
    }
};

// Email Validation Tests
function runEmailValidationTests() {
    console.log('Running Email Validation Tests...\n');

    // Valid email tests
    TestRunner.test('Valid email: simple@example.com', () => {
        TestRunner.assert(
            window.EmailValidator.isValid('simple@example.com'),
            'Should accept valid email'
        );
    });

    TestRunner.test('Valid email: user.name@example.com', () => {
        TestRunner.assert(
            window.EmailValidator.isValid('user.name@example.com'),
            'Should accept email with dot in local part'
        );
    });

    TestRunner.test('Valid email: user+tag@example.co.uk', () => {
        TestRunner.assert(
            window.EmailValidator.isValid('user+tag@example.co.uk'),
            'Should accept email with plus sign and multiple TLDs'
        );
    });

    TestRunner.test('Valid email: user_name@example-domain.com', () => {
        TestRunner.assert(
            window.EmailValidator.isValid('user_name@example-domain.com'),
            'Should accept email with underscore and hyphen'
        );
    });

    // Invalid email tests
    TestRunner.test('Invalid email: missing @ symbol', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid('userexample.com'),
            'Should reject email without @ symbol'
        );
    });

    TestRunner.test('Invalid email: missing domain', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid('user@'),
            'Should reject email without domain'
        );
    });

    TestRunner.test('Invalid email: missing local part', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid('@example.com'),
            'Should reject email without local part'
        );
    });

    TestRunner.test('Invalid email: spaces', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid('user name@example.com'),
            'Should reject email with spaces'
        );
    });

    TestRunner.test('Invalid email: multiple @ symbols', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid('user@@example.com'),
            'Should reject email with multiple @ symbols'
        );
    });

    TestRunner.test('Invalid email: missing TLD', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid('user@example'),
            'Should reject email without TLD'
        );
    });

    // Edge cases
    TestRunner.test('Empty string should be invalid', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid(''),
            'Should reject empty string'
        );
    });

    TestRunner.test('Null should be invalid', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid(null),
            'Should reject null'
        );
    });

    TestRunner.test('Undefined should be invalid', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid(undefined),
            'Should reject undefined'
        );
    });

    TestRunner.test('Whitespace-only should be invalid', () => {
        TestRunner.assert(
            !window.EmailValidator.isValid('   '),
            'Should reject whitespace-only string'
        );
    });

    // Security tests - XSS prevention
    TestRunner.test('XSS attempt: script tag in email', () => {
        const xssEmail = '<script>alert("xss")</script>@example.com';
        TestRunner.assert(
            !window.EmailValidator.isValid(xssEmail),
            'Should reject email with script tags'
        );
    });

    TestRunner.test('XSS attempt: HTML in email', () => {
        const xssEmail = 'user<img src=x onerror=alert(1)>@example.com';
        TestRunner.assert(
            !window.EmailValidator.isValid(xssEmail),
            'Should reject email with HTML'
        );
    });

    TestRunner.test('SQL injection attempt in email', () => {
        const sqlEmail = "admin'--@example.com";
        TestRunner.assert(
            !window.EmailValidator.isValid(sqlEmail),
            'Should reject email with SQL injection attempt'
        );
    });

    // Sanitization tests
    TestRunner.test('Sanitize valid email returns same email', () => {
        const email = 'user@example.com';
        TestRunner.assertEqual(
            window.EmailValidator.sanitize(email),
            email,
            'Should return same email when valid'
        );
    });

    TestRunner.test('Sanitize trims whitespace', () => {
        TestRunner.assertEqual(
            window.EmailValidator.sanitize('  user@example.com  '),
            'user@example.com',
            'Should trim whitespace'
        );
    });

    TestRunner.test('Sanitize converts to lowercase', () => {
        TestRunner.assertEqual(
            window.EmailValidator.sanitize('USER@EXAMPLE.COM'),
            'user@example.com',
            'Should convert to lowercase'
        );
    });

    TestRunner.test('Sanitize escapes HTML entities', () => {
        const malicious = 'user<script>@example.com';
        const sanitized = window.EmailValidator.sanitize(malicious);
        TestRunner.assert(
            !sanitized.includes('<script>'),
            'Should escape HTML entities'
        );
    });

    // Validation with error messages
    TestRunner.test('Validate returns detailed error for invalid email', () => {
        const result = window.EmailValidator.validate('invalid-email');
        TestRunner.assert(
            !result.valid && result.error,
            'Should return error message for invalid email'
        );
    });

    TestRunner.test('Validate returns success for valid email', () => {
        const result = window.EmailValidator.validate('user@example.com');
        TestRunner.assert(
            result.valid && !result.error,
            'Should return valid result for good email'
        );
    });

    // Display formatting tests
    TestRunner.test('Format email for display escapes HTML', () => {
        const formatted = window.EmailValidator.formatForDisplay('user<b>@example.com');
        TestRunner.assert(
            !formatted.includes('<b>'),
            'Should escape HTML in display format'
        );
    });

    return TestRunner.printSummary();
}

// Export for use in HTML test page
if (typeof window !== 'undefined') {
    window.runEmailValidationTests = runEmailValidationTests;
}
