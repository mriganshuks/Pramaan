-- ============================================================================
-- PRAMAAN POSTGRESQL SCHEMA MIGRATION FOR SUPABASE
-- Complete relational schema replacing MongoDB / Mongoose
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Core user & candidate profile)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  handle VARCHAR(32) NOT NULL UNIQUE,
  headline VARCHAR(120) DEFAULT '',
  bio VARCHAR(1200) DEFAULT '',
  location VARCHAR(100) DEFAULT '',
  education VARCHAR(160) DEFAULT '',
  available_for_teams BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_supabase_id ON public.profiles(supabase_id);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_available ON public.profiles(available_for_teams);

-- ----------------------------------------------------------------------------
-- 2. USER SKILLS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  normalized_name VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('CLAIMED', 'NOT_VERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED')) DEFAULT 'CLAIMED',
  assessment_score INTEGER CHECK (assessment_score >= 0 AND assessment_score <= 100),
  evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  last_assessment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_profile_skill UNIQUE (profile_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_profile_id ON public.user_skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_normalized_name ON public.user_skills(normalized_name);
CREATE INDEX IF NOT EXISTS idx_user_skills_status ON public.user_skills(status);

-- ----------------------------------------------------------------------------
-- 3. PROJECTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(1200) NOT NULL,
  url VARCHAR(500),
  skills TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_profile_id ON public.projects(profile_id);

-- ----------------------------------------------------------------------------
-- 4. EVIDENCE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source VARCHAR(30) NOT NULL CHECK (source IN ('GITHUB', 'LEETCODE', 'CODECHEF', 'HACKERRANK', 'OTHER')),
  url VARCHAR(500) NOT NULL,
  description VARCHAR(500) NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_profile_id ON public.evidence(profile_id);

-- ----------------------------------------------------------------------------
-- 5. HACKATHONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hackathons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  description VARCHAR(1500) NOT NULL,
  location VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_hackathon_dates CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_hackathons_starts_at ON public.hackathons(starts_at);
CREATE INDEX IF NOT EXISTS idx_hackathons_created_by ON public.hackathons(created_by);

-- ----------------------------------------------------------------------------
-- 6. HACKATHON PARTICIPANTS (Join table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hackathon_participants (
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hackathon_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_participants_profile ON public.hackathon_participants(profile_id);

-- ----------------------------------------------------------------------------
-- 7. TEAMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(800) DEFAULT '',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity >= 2 AND capacity <= 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_hackathon_team_name UNIQUE (hackathon_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id ON public.teams(hackathon_id);

-- ----------------------------------------------------------------------------
-- 8. TEAM MEMBERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(80) NOT NULL DEFAULT 'Member',
  status VARCHAR(20) NOT NULL CHECK (status IN ('OWNER', 'ACCEPTED')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_team_member UNIQUE (team_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile_id ON public.team_members(profile_id);

-- ----------------------------------------------------------------------------
-- 9. INVITATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message VARCHAR(500) DEFAULT '',
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')) DEFAULT 'PENDING',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_team_id ON public.invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_candidate_id ON public.invitations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- ----------------------------------------------------------------------------
-- 10. ASSESSMENT ATTEMPTS TABLE (Server-evaluated skill test attempts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill VARCHAR(80) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  state VARCHAR(20) NOT NULL CHECK (state IN ('IN_PROGRESS', 'EVALUATING', 'COMPLETED', 'TIMED_OUT', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  coding_problem JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by VARCHAR(30) NOT NULL DEFAULT 'openai',
  generation_notice TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  coding_submission TEXT,
  mcq_score INTEGER CHECK (mcq_score >= 0 AND mcq_score <= 100),
  coding_score INTEGER CHECK (coding_score >= 0 AND coding_score <= 100),
  coding_evaluation JSONB,
  integrity_score INTEGER CHECK (integrity_score >= 0 AND integrity_score <= 100),
  final_score INTEGER CHECK (final_score >= 0 AND final_score <= 100),
  risk_level VARCHAR(10) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  verification_status VARCHAR(30) CHECK (verification_status IN ('NOT_VERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED')),
  topic_performance JSONB,
  performance_analysis JSONB,
  verification_receipt JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_profile ON public.assessment_attempts(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_state ON public.assessment_attempts(state);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_skill ON public.assessment_attempts(skill);

-- ----------------------------------------------------------------------------
-- 11. SKILL CHALLENGES TABLE (Recruitment / Team challenges)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill VARCHAR(80) NOT NULL,
  state VARCHAR(20) NOT NULL CHECK (state IN ('SENT', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'ACCEPTED', 'REJECTED')) DEFAULT 'SENT',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by VARCHAR(30) NOT NULL DEFAULT 'openai',
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  integrity_score INTEGER CHECK (integrity_score >= 0 AND integrity_score <= 100),
  risk_level VARCHAR(10) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_challenges_candidate ON public.skill_challenges(candidate_id, state);
CREATE INDEX IF NOT EXISTS idx_skill_challenges_team ON public.skill_challenges(team_id, candidate_id);

-- ----------------------------------------------------------------------------
-- 12. INTEGRITY EVENTS TABLE (Proctoring and audit trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('ASSESSMENT', 'CHALLENGE')),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrity_events_target ON public.integrity_events(target_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_integrity_events_profile ON public.integrity_events(profile_id);

-- ----------------------------------------------------------------------------
-- AUTOMATIC TIMESTAMP UPDATER FUNCTION & TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_user_skills_updated BEFORE UPDATE ON public.user_skills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_evidence_updated BEFORE UPDATE ON public.evidence FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_hackathons_updated BEFORE UPDATE ON public.hackathons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_invitations_updated BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_assessment_attempts_updated BEFORE UPDATE ON public.assessment_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_skill_challenges_updated BEFORE UPDATE ON public.skill_challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read profiles; user can update their own profile
CREATE POLICY "Public profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = supabase_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = supabase_id OR auth.uid() IS NULL);

-- User skills: Publicly readable; editable by profile owner
CREATE POLICY "Skills are readable by everyone"
  ON public.user_skills FOR SELECT
  USING (true);

-- Projects & Evidence: Publicly readable; editable by profile owner
CREATE POLICY "Projects are readable by everyone"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "Evidence is readable by everyone"
  ON public.evidence FOR SELECT
  USING (true);

-- Hackathons: Readable by all authenticated / public users
CREATE POLICY "Hackathons are readable by everyone"
  ON public.hackathons FOR SELECT
  USING (true);

CREATE POLICY "Hackathon participants are readable by everyone"
  ON public.hackathon_participants FOR SELECT
  USING (true);

-- Teams & Team Members: Readable by everyone
CREATE POLICY "Teams are readable by everyone"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Team members are readable by everyone"
  ON public.team_members FOR SELECT
  USING (true);

-- Invitations: Visible to candidate and team owner
CREATE POLICY "Invitations visible to involved parties"
  ON public.invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.supabase_id = auth.uid()
      AND (profiles.id = invitations.candidate_id OR profiles.id = invitations.sent_by)
    )
  );

-- Assessment attempts: Visible only to owner
CREATE POLICY "Assessment attempts visible to profile owner"
  ON public.assessment_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.supabase_id = auth.uid()
      AND profiles.id = assessment_attempts.profile_id
    )
  );

-- Skill challenges: Visible to candidate and creator
CREATE POLICY "Skill challenges visible to candidate and team owner"
  ON public.skill_challenges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.supabase_id = auth.uid()
      AND (profiles.id = skill_challenges.candidate_id OR profiles.id = skill_challenges.created_by)
    )
  );

-- Integrity events: Restricted to internal auditing / owner
CREATE POLICY "Integrity events visible to profile owner"
  ON public.integrity_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.supabase_id = auth.uid()
      AND profiles.id = integrity_events.profile_id
    )
  );
