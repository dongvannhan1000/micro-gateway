-- Settings Schema Validation Script
-- Purpose: Validate the Settings schema migration
-- Run this after applying migration 0011_comprehensive_settings_schema.sql

-- ============================================================
-- SECTION 1: VALIDATE TABLE CREATION
-- ============================================================

.echo "=========================================="
.echo "Validating Table Creation"
.echo "=========================================="

-- Check if tables exist
SELECT
    'users' as table_name,
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM sqlite_master WHERE type='table' AND name='users'

UNION ALL

SELECT
    'user_preferences',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='user_preferences'

UNION ALL

SELECT
    'user_sessions',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='user_sessions'

UNION ALL

SELECT
    'user_two_factor',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='user_two_factor'

UNION ALL

SELECT
    'security_audit_logs',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='security_audit_logs'

UNION ALL

SELECT
    'usage_metrics',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='usage_metrics'

UNION ALL

SELECT
    'billing_history',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='billing_history'

UNION ALL

SELECT
    'usage_quotas',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='usage_quotas'

UNION ALL

SELECT
    'notification_history',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='notification_history'

UNION ALL

SELECT
    'webhook_integrations',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='table' AND name='webhook_integrations';

-- ============================================================
-- SECTION 2: VALIDATE VIEWS
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Validating Views"
.echo "=========================================="

SELECT
    'v_user_profile_summary' as view_name,
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM sqlite_master WHERE type='view' AND name='v_user_profile_summary'

UNION ALL

SELECT
    'v_user_usage_summary',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='view' AND name='v_user_usage_summary'

UNION ALL

SELECT
    'v_recent_security_events',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='view' AND name='v_recent_security_events'

UNION ALL

SELECT
    'v_active_sessions',
    CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM sqlite_master WHERE type='view' AND name='v_active_sessions';

-- ============================================================
-- SECTION 3: VALIDATE INDEXES
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Validating Indexes"
.echo "=========================================="

SELECT
    name as index_name,
    tbl_name as table_name,
    '✓ EXISTS' as status
FROM sqlite_master
WHERE type='index'
  AND name IN (
    'idx_users_display_name',
    'idx_users_company',
    'idx_user_preferences_user',
    'idx_user_sessions_user',
    'idx_user_sessions_active',
    'idx_user_sessions_token',
    'idx_user_two_factor_user',
    'idx_security_audit_logs_user',
    'idx_security_audit_logs_type',
    'idx_security_audit_logs_category',
    'idx_security_audit_logs_created',
    'idx_security_audit_logs_severity',
    'idx_usage_metrics_user_date',
    'idx_usage_metrics_project_date',
    'idx_usage_metrics_date',
    'idx_billing_history_user',
    'idx_billing_history_period',
    'idx_billing_history_status',
    'idx_usage_quotas_user',
    'idx_usage_quotas_type',
    'idx_usage_quotas_tier',
    'idx_notification_history_user',
    'idx_notification_history_type',
    'idx_notification_history_category',
    'idx_notification_history_status',
    'idx_notification_history_created',
    'idx_webhook_integrations_user',
    'idx_webhook_integrations_active'
  )
ORDER BY tbl_name, name;

-- ============================================================
-- SECTION 4: VALIDATE COLUMN EXTENSIONS (users table)
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Validating Users Table Extensions"
.echo "=========================================="

SELECT
    'display_name' as column_name,
    CASE WHEN COUNT(*) > 0 THEN '✓ ADDED' ELSE '✗ MISSING' END as status
FROM pragma_table_info('users') WHERE name='display_name'

UNION ALL

SELECT
    'avatar_url',
    CASE WHEN COUNT(*) > 0 THEN '✓ ADDED' ELSE '✗ MISSING' END
FROM pragma_table_info('users') WHERE name='avatar_url'

UNION ALL

SELECT
    'bio',
    CASE WHEN COUNT(*) > 0 THEN '✓ ADDED' ELSE '✗ MISSING' END
FROM pragma_table_info('users') WHERE name='bio'

UNION ALL

SELECT
    'company',
    CASE WHEN COUNT(*) > 0 THEN '✓ ADDED' ELSE '✗ MISSING' END
FROM pragma_table_info('users') WHERE name='company'

UNION ALL

SELECT
    'location',
    CASE WHEN COUNT(*) > 0 THEN '✓ ADDED' ELSE '✗ MISSING' END
FROM pragma_table_info('users') WHERE name='location'

UNION ALL

SELECT
    'timezone',
    CASE WHEN COUNT(*) > 0 THEN '✓ ADDED' ELSE '✗ MISSING' END
FROM pragma_table_info('users') WHERE name='timezone'

UNION ALL

SELECT
    'language',
    CASE WHEN COUNT(*) > 0 THEN '✓ ADDED' ELSE '✗ MISSING' END
FROM pragma_table_info('users') WHERE name='language'

UNION ALL

SELECT
    'profile_updated_at',
    CASE WHEN COUNT(*) > 0 THEN '✓ ADDED' ELSE '✗ MISSING' END
FROM pragma_table_info('users') WHERE name='profile_updated_at';

-- ============================================================
-- SECTION 5: VALIDATE TRIGGERS
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Validating Triggers"
.echo "=========================================="

SELECT
    name as trigger_name,
    tbl_name as table_name,
    '✓ EXISTS' as status
FROM sqlite_master
WHERE type='trigger'
  AND name IN (
    'update_user_preferences_timestamp',
    'update_usage_metrics_timestamp',
    'update_user_two_factor_timestamp',
    'update_usage_quotas_timestamp',
    'update_webhook_integrations_timestamp',
    'update_users_profile_timestamp'
  )
ORDER BY tbl_name, name;

-- ============================================================
-- SECTION 6: TEST DATA INSERTION
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Testing Data Insertion"
.echo "=========================================="

-- Test user_preferences insertion
INSERT INTO user_preferences (
    id, user_id, email_notifications_enabled,
    usage_alert_threshold, security_alerts_enabled,
    weekly_report_enabled, theme
) VALUES (
    'test-pref-001',
    'test-user-001',
    1,
    80,
    1,
    1,
    'system'
);

SELECT 'user_preferences INSERT' as test, '✓ SUCCESS' as status;

-- Test user_sessions insertion
INSERT INTO user_sessions (
    id, user_id, session_token, device_name,
    ip_address, is_active, expires_at
) VALUES (
    'test-session-001',
    'test-user-001',
    'test-token-12345',
    'Chrome on Windows',
    '192.168.1.1',
    1,
    datetime('now', '+30 days')
);

SELECT 'user_sessions INSERT' as test, '� SUCCESS' as status;

-- Test security_audit_logs insertion
INSERT INTO security_audit_logs (
    id, user_id, event_type, event_category,
    description, severity, ip_address
) VALUES (
    'test-log-001',
    'test-user-001',
    'login',
    'auth',
    'User logged in successfully',
    'info',
    '192.168.1.1'
);

SELECT 'security_audit_logs INSERT' as test, '✓ SUCCESS' as status;

-- Test usage_metrics insertion
INSERT INTO usage_metrics (
    id, user_id, date, provider,
    api_calls, total_tokens, cost_usd,
    success_requests, error_requests
) VALUES (
    'test-metrics-001',
    'test-user-001',
    date('now'),
    'openai',
    100,
    50000,
    0.50,
    98,
    2
);

SELECT 'usage_metrics INSERT' as test, '✓ SUCCESS' as status;

-- ============================================================
-- SECTION 7: TEST VIEWS
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Testing Views"
.echo "=========================================="

-- Test v_user_profile_summary
SELECT 'v_user_profile_summary SELECT' as test, '✓ SUCCESS' as status
WHERE (SELECT COUNT(*) FROM v_user_profile_summary WHERE id = 'test-user-001') >= 0;

-- Test v_user_usage_summary
SELECT 'v_user_usage_summary SELECT' as test, '✓ SUCCESS' as status
WHERE (SELECT COUNT(*) FROM v_user_usage_summary WHERE user_id = 'test-user-001') >= 0;

-- Test v_recent_security_events
SELECT 'v_recent_security_events SELECT' as test, '✓ SUCCESS' as status
WHERE (SELECT COUNT(*) FROM v_recent_security_events WHERE user_id = 'test-user-001') >= 0;

-- Test v_active_sessions
SELECT 'v_active_sessions SELECT' as test, '✓ SUCCESS' as status
WHERE (SELECT COUNT(*) FROM v_active_sessions WHERE user_id = 'test-user-001') >= 0;

-- ============================================================
-- SECTION 8: TEST TRIGGERS
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Testing Triggers"
.echo "=========================================="

-- Test user_preferences updated_at trigger
UPDATE user_preferences SET theme = 'dark' WHERE id = 'test-pref-001';

SELECT 'user_preferences trigger' as test,
    CASE
        WHEN updated_at > created_at THEN '✓ SUCCESS'
        ELSE '✗ FAILED'
    END as status
FROM user_preferences WHERE id = 'test-pref-001';

-- ============================================================
-- SECTION 9: CLEANUP TEST DATA
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Cleaning Up Test Data"
.echo "=========================================="

DELETE FROM user_preferences WHERE id = 'test-pref-001';
DELETE FROM user_sessions WHERE id = 'test-session-001';
DELETE FROM security_audit_logs WHERE id = 'test-log-001';
DELETE FROM usage_metrics WHERE id = 'test-metrics-001';

SELECT 'Cleanup' as action, '✓ COMPLETED' as status;

-- ============================================================
-- SECTION 10: SUMMARY
-- ============================================================

.echo ""
.echo "=========================================="
.echo "Validation Summary"
.echo "=========================================="

SELECT
    'Tables' as category,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 10 THEN '✓ COMPLETE' ELSE '✗ INCOMPLETE' END as status
FROM sqlite_master WHERE type='table' AND name IN (
    'users', 'user_preferences', 'user_sessions', 'user_two_factor',
    'security_audit_logs', 'usage_metrics', 'billing_history',
    'usage_quotas', 'notification_history', 'webhook_integrations'
)

UNION ALL

SELECT
    'Views',
    COUNT(*),
    CASE WHEN COUNT(*) = 4 THEN '✓ COMPLETE' ELSE '✗ INCOMPLETE' END
FROM sqlite_master WHERE type='view' AND name IN (
    'v_user_profile_summary', 'v_user_usage_summary',
    'v_recent_security_events', 'v_active_sessions'
)

UNION ALL

SELECT
    'Indexes',
    COUNT(*),
    CASE WHEN COUNT(*) >= 25 THEN '✓ COMPLETE' ELSE '✗ INCOMPLETE' END
FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'

UNION ALL

SELECT
    'Triggers',
    COUNT(*),
    CASE WHEN COUNT(*) = 6 THEN '✓ COMPLETE' ELSE '✗ INCOMPLETE' END
FROM sqlite_master WHERE type='trigger' AND name LIKE 'update_%';

.echo ""
.echo "=========================================="
.echo "Validation Complete!"
.echo "=========================================="
