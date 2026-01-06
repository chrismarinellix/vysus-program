-- Vysus Program - Supabase Schema with Row Level Security
-- Run this in your Supabase SQL Editor (SQL Editor > New Query)

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Team profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'team_member', -- 'admin', 'team_member', 'viewer'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stakeholder data (client CRM info)
CREATE TABLE IF NOT EXISTS stakeholders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_code TEXT UNIQUE NOT NULL, -- e.g., 'AEMO', 'AGL'
    data JSONB NOT NULL DEFAULT '{}', -- priority, meetingStatus, contacts, purpose, etc.
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stakeholder meetings calendar
CREATE TABLE IF NOT EXISTS stakeholder_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    confirmed BOOLEAN DEFAULT FALSE,
    contact_name TEXT,
    purpose TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drill/learning progress (per user)
CREATE TABLE IF NOT EXISTS drill_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER DEFAULT 0,
    mastered_contacts TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Resource allocations (per week)
CREATE TABLE IF NOT EXISTS resource_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week TEXT NOT NULL, -- e.g., '2025-W01'
    allocations JSONB NOT NULL DEFAULT '{}',
    project_notes JSONB DEFAULT '{}',
    project_status JSONB DEFAULT '{}',
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(week)
);

-- Client communications (emails sent/received)
CREATE TABLE IF NOT EXISTS communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comm_type TEXT NOT NULL, -- 'sent' or 'received'
    comm_date TIMESTAMPTZ NOT NULL,
    client TEXT NOT NULL, -- e.g., 'OX2', 'Alinta'
    subject TEXT NOT NULL,
    contact_name TEXT, -- 'To' for sent, 'From' for received
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up tasks
CREATE TABLE IF NOT EXISTS followups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    due_date DATE NOT NULL,
    client TEXT NOT NULL,
    task TEXT NOT NULL,
    priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
    contact_name TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for security tracking
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login'
    table_name TEXT,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE RLS POLICIES
-- ============================================

-- PROFILES: Users can read all team profiles, but only update their own
CREATE POLICY "Team members can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- STAKEHOLDERS: All authenticated users can read/write (team collaboration)
CREATE POLICY "Team can view stakeholders"
    ON stakeholders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team can insert stakeholders"
    ON stakeholders FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Team can update stakeholders"
    ON stakeholders FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Team can delete stakeholders"
    ON stakeholders FOR DELETE
    TO authenticated
    USING (true);

-- STAKEHOLDER_MEETINGS: All authenticated users can manage
CREATE POLICY "Team can view meetings"
    ON stakeholder_meetings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team can insert meetings"
    ON stakeholder_meetings FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Team can update meetings"
    ON stakeholder_meetings FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Team can delete meetings"
    ON stakeholder_meetings FOR DELETE
    TO authenticated
    USING (true);

-- DRILL_PROGRESS: Users can only see/modify their own progress
CREATE POLICY "Users can view own drill progress"
    ON drill_progress FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drill progress"
    ON drill_progress FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drill progress"
    ON drill_progress FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- RESOURCE_ALLOCATIONS: All authenticated users can manage
CREATE POLICY "Team can view allocations"
    ON resource_allocations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team can insert allocations"
    ON resource_allocations FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Team can update allocations"
    ON resource_allocations FOR UPDATE
    TO authenticated
    USING (true);

-- AUDIT_LOG: Users can view, system inserts
CREATE POLICY "Team can view audit log"
    ON audit_log FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "System can insert audit log"
    ON audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- COMMUNICATIONS: All authenticated users can manage
CREATE POLICY "Team can view communications"
    ON communications FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team can insert communications"
    ON communications FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Team can delete communications"
    ON communications FOR DELETE
    TO authenticated
    USING (true);

-- FOLLOWUPS: All authenticated users can manage
CREATE POLICY "Team can view followups"
    ON followups FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team can insert followups"
    ON followups FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Team can update followups"
    ON followups FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Team can delete followups"
    ON followups FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 4. CREATE FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stakeholders_updated_at
    BEFORE UPDATE ON stakeholders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON stakeholder_meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_allocations_updated_at
    BEFORE UPDATE ON resource_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_stakeholders_client_code ON stakeholders(client_code);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON stakeholder_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_client ON stakeholder_meetings(client_code);
CREATE INDEX IF NOT EXISTS idx_allocations_week ON resource_allocations(week);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_date ON communications(comm_date DESC);
CREATE INDEX IF NOT EXISTS idx_comms_client ON communications(client);
CREATE INDEX IF NOT EXISTS idx_comms_type ON communications(comm_type);
CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(due_date);
CREATE INDEX IF NOT EXISTS idx_followups_client ON followups(client);
CREATE INDEX IF NOT EXISTS idx_followups_priority ON followups(priority);

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Vysus Program database setup complete!' AS status;
