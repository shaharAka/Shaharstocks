-- PostgreSQL Row-Level Security (RLS) Policies
-- This migration enables RLS on all user-scoped tables for multi-tenant isolation
-- Run this migration after your schema is created

-- Enable RLS on all user-scoped tables
-- Note: Adjust table names to match your actual schema

-- Helper function to get current user ID from JWT or session
-- This assumes you're using a session-based approach where user_id is stored in a session variable
-- For JWT-based auth, you would extract it from JWT claims instead

-- Function to get current user ID from session
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
BEGIN
  -- Try to get user_id from session variable (set by application)
  -- This is set via: SET LOCAL app.current_user_id = 'user-id';
  RETURN current_setting('app.current_user_id', TRUE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STOCKS TABLE
-- ============================================================================
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own stocks
CREATE POLICY stocks_user_isolation ON stocks
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- USER_STOCK_STATUSES TABLE
-- ============================================================================
ALTER TABLE user_stock_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_stock_statuses_user_isolation ON user_stock_statuses
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- FOLLOWED_STOCKS TABLE
-- ============================================================================
ALTER TABLE followed_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY followed_stocks_user_isolation ON followed_stocks
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- PORTFOLIO_HOLDINGS TABLE
-- ============================================================================
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY portfolio_holdings_user_isolation ON portfolio_holdings
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- TRADES TABLE
-- ============================================================================
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY trades_user_isolation ON trades
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- TRADING_RULES TABLE
-- ============================================================================
ALTER TABLE trading_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY trading_rules_user_isolation ON trading_rules
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- COMPOUND_RULES TABLE
-- ============================================================================
ALTER TABLE compound_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY compound_rules_user_isolation ON compound_rules
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- RULE_EXECUTIONS TABLE
-- ============================================================================
ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY rule_executions_user_isolation ON rule_executions
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- BACKTESTS TABLE
-- ============================================================================
ALTER TABLE backtests ENABLE ROW LEVEL SECURITY;

CREATE POLICY backtests_user_isolation ON backtests
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- BACKTEST_JOBS TABLE
-- ============================================================================
ALTER TABLE backtest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY backtest_jobs_user_isolation ON backtest_jobs
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_user_isolation ON payments
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_user_isolation ON notifications
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- ADMIN_NOTIFICATIONS TABLE (Global - no RLS, but restrict to admin users)
-- ============================================================================
-- Admin notifications are global, but we can add a check policy
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only allow reading if user is admin (check via users table)
-- This requires a join, so we use a subquery
CREATE POLICY admin_notifications_read ON admin_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = current_user_id()::text 
      AND (users.is_admin = true OR users.is_super_admin = true)
    )
  );

-- ============================================================================
-- FEATURE_SUGGESTIONS TABLE
-- ============================================================================
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can see all feature suggestions (global), but only edit their own
CREATE POLICY feature_suggestions_select ON feature_suggestions
  FOR SELECT
  USING (true); -- Everyone can read

CREATE POLICY feature_suggestions_user_isolation ON feature_suggestions
  FOR INSERT, UPDATE, DELETE
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- STOCK_COMMENTS TABLE (Global comments, but users can only edit their own)
-- ============================================================================
ALTER TABLE stock_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read comments
CREATE POLICY stock_comments_select ON stock_comments
  FOR SELECT
  USING (true);

-- Users can only insert/update/delete their own comments
CREATE POLICY stock_comments_user_isolation ON stock_comments
  FOR INSERT, UPDATE, DELETE
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- STOCK_VIEWS TABLE
-- ============================================================================
ALTER TABLE stock_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_views_user_isolation ON stock_views
  FOR ALL
  USING (user_id = current_user_id()::text)
  WITH CHECK (user_id = current_user_id()::text);

-- ============================================================================
-- USERS TABLE (Special handling)
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own record
CREATE POLICY users_own_record ON users
  FOR SELECT
  USING (id = current_user_id()::text);

-- Users can update their own record (but not create/delete)
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = current_user_id()::text)
  WITH CHECK (id = current_user_id()::text);

-- Allow registration (INSERT) without user_id check
-- This is typically handled by application-level code, but we allow it here
CREATE POLICY users_insert_registration ON users
  FOR INSERT
  WITH CHECK (true); -- Registration allowed, user_id set by application

-- ============================================================================
-- GLOBAL TABLES (No RLS - accessible to all)
-- ============================================================================
-- These tables are global and don't need RLS:
-- - system_settings
-- - telegram_config
-- - ibkr_config
-- - openinsider_config
-- - stock_analyses (global analysis data)
-- - ai_analysis_jobs (global job queue)
-- - stock_candlesticks (global market data)
-- - macro_analyses (global macro data)
-- - opportunities (global opportunities)
-- - opportunity_batches (global batches)
-- - daily_briefs (per-user but typically queried differently)
-- - tutorials (global)
-- - announcements (global)
-- - user_tutorials (per-user but global access pattern)
-- - password_resets (per-user but accessed differently)
-- - manual_overrides (per-user)

-- ============================================================================
-- ADDITIONAL TABLES THAT MAY NEED RLS
-- ============================================================================

-- DAILY_BRIEFS (if user-scoped)
-- ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY daily_briefs_user_isolation ON daily_briefs
--   FOR ALL
--   USING (user_id = current_user_id()::text)
--   WITH CHECK (user_id = current_user_id()::text);

-- USER_TUTORIALS
-- ALTER TABLE user_tutorials ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY user_tutorials_user_isolation ON user_tutorials
--   FOR ALL
--   USING (user_id = current_user_id()::text)
--   WITH CHECK (user_id = current_user_id()::text);

-- PASSWORD_RESETS (typically accessed via token, but add for safety)
-- ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY password_resets_user_isolation ON password_resets
--   FOR ALL
--   USING (user_id = current_user_id()::text);

-- MANUAL_OVERRIDES
-- ALTER TABLE manual_overrides ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY manual_overrides_user_isolation ON manual_overrides
--   FOR ALL
--   USING (user_id = current_user_id()::text)
--   WITH CHECK (user_id = current_user_id()::text);

