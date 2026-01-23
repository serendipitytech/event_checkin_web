/**
 * Supabase Authentication Module
 * Provides secure admin authentication using Supabase Auth
 *
 * Features:
 * - Secure password hashing (handled by Supabase)
 * - Session management with automatic token refresh
 * - No plain-text password storage or transmission
 * - Built-in rate limiting and security features
 *
 * @module SupabaseAuth
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    // Admin email configuration
    const ADMIN_EMAIL_KEY = 'event_checkin_admin_email';
    const DEFAULT_ADMIN_EMAIL = 'admin@eventcheckin.local';

    /**
     * Supabase Authentication Manager
     */
    const SupabaseAuth = {
        supabase: null,
        initialized: false,

        /**
         * Initialize Supabase Auth
         * Loads Supabase configuration and creates client
         *
         * @returns {boolean} True if initialized successfully
         */
        async init() {
            if (this.initialized) {
                return true;
            }

            try {
                // Get Supabase configuration
                const config = window.EventCheckinConfig?.dataSource?.settings?.supabase;

                if (!config || !config.url || !config.anonKey) {
                    console.warn('⚠️ Supabase not configured. Please set URL and anon key in admin settings.');
                    return false;
                }

                // Create Supabase client
                this.supabase = window.supabase.createClient(config.url, config.anonKey);

                // Set up auth state change listener
                this.supabase.auth.onAuthStateChange((event, session) => {
                    console.log('Auth state changed:', event);
                    this.handleAuthStateChange(event, session);
                });

                this.initialized = true;
                console.log('✅ Supabase Auth initialized');
                return true;

            } catch (error) {
                console.error('❌ Failed to initialize Supabase Auth:', error);
                return false;
            }
        },

        /**
         * Handle authentication state changes
         * @private
         */
        handleAuthStateChange(event, session) {
            if (event === 'SIGNED_IN') {
                console.log('✅ User signed in');
            } else if (event === 'SIGNED_OUT') {
                console.log('👋 User signed out');
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('🔄 Session token refreshed');
            }
        },

        /**
         * Sign up a new admin user
         * Only used for initial setup
         *
         * @param {string} email - Admin email
         * @param {string} password - Admin password
         * @returns {Promise<{success: boolean, error?: string}>}
         */
        async signUp(email, password) {
            if (!this.initialized) {
                await this.init();
            }

            if (!this.supabase) {
                return {
                    success: false,
                    error: 'Supabase not configured. Please configure in admin settings.'
                };
            }

            try {
                // Validate password strength
                if (password.length < 8) {
                    return {
                        success: false,
                        error: 'Password must be at least 8 characters long'
                    };
                }

                const { data, error } = await this.supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            role: 'admin',
                            created_at: new Date().toISOString()
                        }
                    }
                });

                if (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }

                // Store admin email for future logins
                localStorage.setItem(ADMIN_EMAIL_KEY, email);

                return {
                    success: true,
                    data: data
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message || 'Sign up failed'
                };
            }
        },

        /**
         * Sign in admin user
         *
         * @param {string} email - Admin email
         * @param {string} password - Admin password
         * @returns {Promise<{success: boolean, session?: object, error?: string}>}
         */
        async signIn(email, password) {
            if (!this.initialized) {
                await this.init();
            }

            if (!this.supabase) {
                return {
                    success: false,
                    error: 'Supabase not configured. Please configure in admin settings.'
                };
            }

            try {
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }

                // Store admin email for future logins
                localStorage.setItem(ADMIN_EMAIL_KEY, email);

                return {
                    success: true,
                    session: data.session,
                    user: data.user
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message || 'Sign in failed'
                };
            }
        },

        /**
         * Sign out current user
         *
         * @returns {Promise<{success: boolean, error?: string}>}
         */
        async signOut() {
            if (!this.supabase) {
                return { success: false, error: 'Not initialized' };
            }

            try {
                const { error } = await this.supabase.auth.signOut();

                if (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }

                return { success: true };

            } catch (error) {
                return {
                    success: false,
                    error: error.message || 'Sign out failed'
                };
            }
        },

        /**
         * Get current session
         *
         * @returns {Promise<{session: object|null, user: object|null}>}
         */
        async getSession() {
            if (!this.supabase) {
                return { session: null, user: null };
            }

            try {
                const { data, error } = await this.supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    return { session: null, user: null };
                }

                return {
                    session: data.session,
                    user: data.session?.user || null
                };

            } catch (error) {
                console.error('Error getting session:', error);
                return { session: null, user: null };
            }
        },

        /**
         * Check if user is authenticated
         *
         * @returns {Promise<boolean>}
         */
        async isAuthenticated() {
            const { session } = await this.getSession();
            return session !== null;
        },

        /**
         * Change password for current user
         *
         * @param {string} newPassword - New password
         * @returns {Promise<{success: boolean, error?: string}>}
         */
        async changePassword(newPassword) {
            if (!this.supabase) {
                return { success: false, error: 'Not initialized' };
            }

            try {
                // Validate password strength
                if (newPassword.length < 8) {
                    return {
                        success: false,
                        error: 'Password must be at least 8 characters long'
                    };
                }

                const { error } = await this.supabase.auth.updateUser({
                    password: newPassword
                });

                if (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }

                return { success: true };

            } catch (error) {
                return {
                    success: false,
                    error: error.message || 'Password change failed'
                };
            }
        },

        /**
         * Request password reset email
         *
         * @param {string} email - Admin email
         * @returns {Promise<{success: boolean, error?: string}>}
         */
        async resetPassword(email) {
            if (!this.supabase) {
                return { success: false, error: 'Not initialized' };
            }

            try {
                const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/admin.html'
                });

                if (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }

                return { success: true };

            } catch (error) {
                return {
                    success: false,
                    error: error.message || 'Password reset failed'
                };
            }
        },

        /**
         * Get stored admin email
         *
         * @returns {string} Admin email or default
         */
        getStoredEmail() {
            return localStorage.getItem(ADMIN_EMAIL_KEY) || DEFAULT_ADMIN_EMAIL;
        },

        /**
         * Check if admin account exists
         * This is a helper to determine if we need to show signup vs login
         *
         * @returns {Promise<{exists: boolean, email?: string}>}
         */
        async checkAdminExists() {
            const storedEmail = this.getStoredEmail();

            // Check if there's a current session
            const { session } = await this.getSession();

            if (session) {
                return {
                    exists: true,
                    email: session.user.email
                };
            }

            // Check if admin email is stored (indicates setup was done)
            const hasStoredEmail = localStorage.getItem(ADMIN_EMAIL_KEY) !== null;

            return {
                exists: hasStoredEmail,
                email: hasStoredEmail ? storedEmail : null
            };
        },

        /**
         * Get Supabase configuration status
         *
         * @returns {{configured: boolean, url: string, hasAnonKey: boolean}}
         */
        getConfigStatus() {
            const config = window.EventCheckinConfig?.dataSource?.settings?.supabase;

            return {
                configured: !!(config && config.url && config.anonKey),
                url: config?.url || '',
                hasAnonKey: !!(config?.anonKey)
            };
        }
    };

    // Expose to window
    window.SupabaseAuth = SupabaseAuth;

})(window);
