-- =============================================================================
-- REMODELY AI LAUNCH PLAYBOOK - SUPABASE DATABASE SCHEMA
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor to set up the database tables
-- for cloud sync, due dates, goals tracking, and email digests.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USER PROFILES TABLE
-- Stores user preferences and notification settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  timezone TEXT DEFAULT 'America/Phoenix',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- TASKS TABLE
-- Stores task completion status and due dates
-- =============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  due_time TIME,
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per user per task
  UNIQUE(user_id, task_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE completed = FALSE;

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- GOALS TABLE
-- Stores goal targets and actuals (customers, MRR, demos, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per user per goal
  UNIQUE(user_id, goal_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Users can only access their own goals
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- EMAIL DIGEST LOG TABLE
-- Tracks when daily digest emails are sent
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_digest_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  tasks_due_count INTEGER DEFAULT 0,
  overdue_count INTEGER DEFAULT 0,
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  email_status TEXT DEFAULT 'sent',
  error_message TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_digest_log_user_id ON email_digest_log(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_log_sent_at ON email_digest_log(sent_at);

-- Enable Row Level Security
ALTER TABLE email_digest_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own digest logs
CREATE POLICY "Users can view own digest logs" ON email_digest_log
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- Enable real-time for tasks table (for cross-device sync)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View for tasks due today (useful for email digest)
CREATE OR REPLACE VIEW tasks_due_today AS
SELECT
  t.*,
  p.email,
  p.full_name,
  p.timezone
FROM tasks t
JOIN profiles p ON t.user_id = p.id
WHERE t.completed = FALSE
  AND t.due_date = CURRENT_DATE;

-- View for overdue tasks
CREATE OR REPLACE VIEW overdue_tasks AS
SELECT
  t.*,
  p.email,
  p.full_name,
  p.timezone
FROM tasks t
JOIN profiles p ON t.user_id = p.id
WHERE t.completed = FALSE
  AND t.due_date < CURRENT_DATE;

-- =============================================================================
-- DAILY EMAIL DIGEST CRON JOB (using pg_cron if available)
-- Note: Requires pg_cron extension to be enabled in your Supabase project
-- =============================================================================

-- Uncomment and modify if you have pg_cron enabled:
-- SELECT cron.schedule(
--   'daily-email-digest',
--   '0 9 * * *',  -- Run at 9 AM UTC daily
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-digest',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================================

-- Uncomment to insert sample goals for testing:
-- INSERT INTO goals (user_id, goal_key, value) VALUES
--   ('YOUR_USER_ID', 'customers-target', '10'),
--   ('YOUR_USER_ID', 'customers-actual', '3'),
--   ('YOUR_USER_ID', 'mrr-target', '3000'),
--   ('YOUR_USER_ID', 'mrr-actual', '450');
