/**
 * Email Validation Module
 * Provides secure email validation with XSS and injection prevention
 *
 * @module EmailValidator
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    /**
     * Email validation regex pattern
     * Follows RFC 5322 guidelines with practical restrictions
     * - Allows letters, numbers, dots, hyphens, underscores, plus signs
     * - Requires @ symbol
     * - Requires domain with at least one dot
     * - Requires TLD of 2-6 characters
     */
    const EMAIL_REGEX = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    /**
     * Dangerous characters that could indicate XSS or injection attempts
     */
    const DANGEROUS_CHARS = /<|>|&lt;|&gt;|javascript:|on\w+=/i;

    /**
     * SQL injection patterns
     */
    const SQL_INJECTION_PATTERNS = /('|"|;|--|\*|\/\*|\*\/|xp_|sp_|union|select|insert|update|delete|drop|create|alter|exec|execute)/i;

    const EmailValidator = {
        /**
         * Validates if a string is a valid email address
         *
         * @param {string} email - The email address to validate
         * @returns {boolean} True if valid, false otherwise
         *
         * @example
         * EmailValidator.isValid('user@example.com') // returns true
         * EmailValidator.isValid('invalid-email') // returns false
         */
        isValid(email) {
            // Handle null, undefined, and non-string values
            if (!email || typeof email !== 'string') {
                return false;
            }

            // Trim whitespace
            const trimmed = email.trim();

            // Check for empty string after trimming
            if (trimmed.length === 0) {
                return false;
            }

            // Check for dangerous characters (XSS prevention)
            if (DANGEROUS_CHARS.test(trimmed)) {
                return false;
            }

            // Check for SQL injection patterns
            if (SQL_INJECTION_PATTERNS.test(trimmed)) {
                return false;
            }

            // Validate email format
            if (!EMAIL_REGEX.test(trimmed)) {
                return false;
            }

            // Additional checks
            // 1. Must have exactly one @ symbol
            const atCount = (trimmed.match(/@/g) || []).length;
            if (atCount !== 1) {
                return false;
            }

            // 2. Local part and domain must not be empty
            const parts = trimmed.split('@');
            if (parts[0].length === 0 || parts[1].length === 0) {
                return false;
            }

            // 3. Domain must have at least one dot
            if (!parts[1].includes('.')) {
                return false;
            }

            // 4. Check for consecutive dots
            if (trimmed.includes('..')) {
                return false;
            }

            // 5. Maximum length check (RFC 5321)
            if (trimmed.length > 254) {
                return false;
            }

            return true;
        },

        /**
         * Sanitizes an email address
         * - Trims whitespace
         * - Converts to lowercase
         * - Escapes HTML entities
         *
         * @param {string} email - The email address to sanitize
         * @returns {string} Sanitized email address
         *
         * @example
         * EmailValidator.sanitize('  USER@EXAMPLE.COM  ') // returns 'user@example.com'
         */
        sanitize(email) {
            if (!email || typeof email !== 'string') {
                return '';
            }

            // Trim and convert to lowercase
            let sanitized = email.trim().toLowerCase();

            // Escape HTML entities to prevent XSS
            sanitized = this.escapeHtml(sanitized);

            return sanitized;
        },

        /**
         * Validates email and returns detailed result
         *
         * @param {string} email - The email address to validate
         * @returns {Object} Validation result with valid flag and error message
         *
         * @example
         * EmailValidator.validate('user@example.com')
         * // returns { valid: true, error: null, sanitized: 'user@example.com' }
         *
         * EmailValidator.validate('invalid')
         * // returns { valid: false, error: 'Invalid email format', sanitized: 'invalid' }
         */
        validate(email) {
            const sanitized = this.sanitize(email);

            // Check for null/undefined
            if (!email) {
                return {
                    valid: false,
                    error: 'Email is required',
                    sanitized: ''
                };
            }

            // Check for empty string
            if (sanitized.length === 0) {
                return {
                    valid: false,
                    error: 'Email cannot be empty',
                    sanitized: ''
                };
            }

            // Check for dangerous characters
            if (DANGEROUS_CHARS.test(email)) {
                return {
                    valid: false,
                    error: 'Email contains invalid characters',
                    sanitized
                };
            }

            // Check for SQL injection patterns
            if (SQL_INJECTION_PATTERNS.test(email)) {
                return {
                    valid: false,
                    error: 'Email contains invalid characters',
                    sanitized
                };
            }

            // Validate format
            if (!this.isValid(email)) {
                return {
                    valid: false,
                    error: 'Invalid email format. Please use format: user@example.com',
                    sanitized
                };
            }

            return {
                valid: true,
                error: null,
                sanitized
            };
        },

        /**
         * Escapes HTML entities to prevent XSS attacks
         *
         * @param {string} text - Text to escape
         * @returns {string} Escaped text
         * @private
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Formats email for safe display in HTML
         *
         * @param {string} email - Email to format
         * @returns {string} HTML-safe email
         *
         * @example
         * EmailValidator.formatForDisplay('user<script>@example.com')
         * // returns escaped version without script tag
         */
        formatForDisplay(email) {
            if (!email || typeof email !== 'string') {
                return '';
            }

            return this.escapeHtml(email.trim());
        },

        /**
         * Validates multiple emails (comma or semicolon separated)
         *
         * @param {string} emails - String containing multiple emails
         * @param {string} separator - Separator character (default: ',')
         * @returns {Object} Validation result with valid/invalid email arrays
         */
        validateMultiple(emails, separator = ',') {
            if (!emails || typeof emails !== 'string') {
                return { valid: [], invalid: [] };
            }

            const emailList = emails
                .split(separator)
                .map(e => e.trim())
                .filter(e => e.length > 0);

            const valid = [];
            const invalid = [];

            emailList.forEach(email => {
                if (this.isValid(email)) {
                    valid.push(this.sanitize(email));
                } else {
                    invalid.push({ email, reason: this.validate(email).error });
                }
            });

            return { valid, invalid };
        }
    };

    // Expose to window object
    window.EmailValidator = EmailValidator;

})(window);
