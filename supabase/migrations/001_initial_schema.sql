-- WingBoard Database Schema
-- Created for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('queen', 'crew', 'match')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUEENS TABLE
-- ============================================
CREATE TABLE queens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT DEFAULT '',
  crew_formed BOOLEAN DEFAULT FALSE,
  mute_crew BOOLEAN DEFAULT FALSE,
  blur_mode BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREWS TABLE
-- ============================================
CREATE TABLE crews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queen_id UUID UNIQUE NOT NULL REFERENCES queens(user_id) ON DELETE CASCADE,
  crew_member_1_id UUID REFERENCES users(id) ON DELETE SET NULL,
  crew_member_2_id UUID REFERENCES users(id) ON DELETE SET NULL,
  crew_member_3_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREW MEMBERS TABLE (Additional crew metadata)
-- ============================================
CREATE TABLE crew_members (
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('member_1', 'member_2', 'member_3')),
  voice_mode TEXT DEFAULT 'funny' CHECK (voice_mode IN ('funny', 'serious')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (crew_id, user_id)
);

-- ============================================
-- PROFILES TABLE (For swiping)
-- ============================================
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  photos TEXT[] DEFAULT '{}',
  age INTEGER CHECK (age >= 18 AND age <= 100),
  location TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MATCHES TABLE
-- ============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queen_id UUID NOT NULL REFERENCES queens(user_id) ON DELETE CASCADE,
  match_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  UNIQUE(queen_id, match_user_id)
);

-- ============================================
-- CHATS TABLE
-- ============================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID UNIQUE NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  queen_id UUID NOT NULL REFERENCES queens(user_id) ON DELETE CASCADE,
  match_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('queen', 'crew_member', 'match')),
  crew_member_name TEXT,
  voice_mode TEXT CHECK (voice_mode IN ('funny', 'serious')),
  content TEXT NOT NULL,
  emoji_reactions JSONB DEFAULT '{}',
  is_crew_takeover BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SWIPE DECISIONS TABLE
-- ============================================
CREATE TABLE swipe_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queen_id UUID NOT NULL REFERENCES queens(user_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('like', 'pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(queen_id, profile_id, crew_member_id)
);

-- ============================================
-- BIO PROPOSALS TABLE
-- ============================================
CREATE TABLE bio_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queen_id UUID NOT NULL REFERENCES queens(user_id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_bio TEXT NOT NULL,
  votes JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DATE PROPOSALS TABLE
-- ============================================
CREATE TABLE date_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_time TIMESTAMPTZ NOT NULL,
  proposed_location TEXT NOT NULL,
  votes JSONB DEFAULT '{}',
  queen_status TEXT DEFAULT 'pending' CHECK (queen_status IN ('pending', 'accepted', 'rejected')),
  match_status TEXT DEFAULT 'pending' CHECK (match_status IN ('pending', 'accepted', 'rejected')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'locked', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREW INVITES TABLE
-- ============================================
CREATE TABLE crew_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queen_id UUID NOT NULL REFERENCES queens(user_id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_queens_user_id ON queens(user_id);
CREATE INDEX idx_crews_queen_id ON crews(queen_id);
CREATE INDEX idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX idx_crew_members_user_id ON crew_members(user_id);
CREATE INDEX idx_matches_queen_id ON matches(queen_id);
CREATE INDEX idx_matches_match_user_id ON matches(match_user_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_chats_match_id ON chats(match_id);
CREATE INDEX idx_chats_queen_id ON chats(queen_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_swipe_decisions_queen_profile ON swipe_decisions(queen_id, profile_id);
CREATE INDEX idx_bio_proposals_queen_id ON bio_proposals(queen_id);
CREATE INDEX idx_bio_proposals_status ON bio_proposals(status);
CREATE INDEX idx_date_proposals_match_id ON date_proposals(match_id);
CREATE INDEX idx_date_proposals_status ON date_proposals(status);
CREATE INDEX idx_crew_invites_token ON crew_invites(invite_token);
CREATE INDEX idx_crew_invites_queen_id ON crew_invites(queen_id);

-- ============================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queens_updated_at BEFORE UPDATE ON queens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE queens ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bio_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_invites ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
$$ LANGUAGE sql STABLE;

-- Users: Can read own profile, can update own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Queens: Can view/update own queen record
CREATE POLICY "Queens can view own data" ON queens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Queens can update own data" ON queens
  FOR UPDATE USING (auth.uid() = user_id);

-- Crews: Queen can view/update own crew, crew members can view
CREATE POLICY "Queens can view own crew" ON crews
  FOR SELECT USING (auth.uid() = queen_id);

CREATE POLICY "Crew members can view crew" ON crews
  FOR SELECT USING (
    auth.uid() = crew_member_1_id OR
    auth.uid() = crew_member_2_id OR
    auth.uid() = crew_member_3_id
  );

CREATE POLICY "Queens can update own crew" ON crews
  FOR UPDATE USING (auth.uid() = queen_id);

-- Crew Members: Crew members can view their crew membership
CREATE POLICY "Crew members can view membership" ON crew_members
  FOR SELECT USING (auth.uid() = user_id);

-- Matches: Queen can view own matches, match user can view
CREATE POLICY "Queens can view own matches" ON matches
  FOR SELECT USING (auth.uid() = queen_id);

CREATE POLICY "Match users can view matches" ON matches
  FOR SELECT USING (auth.uid() = match_user_id);

-- Chats: Participants can view
CREATE POLICY "Chat participants can view" ON chats
  FOR SELECT USING (auth.uid() = queen_id OR auth.uid() = match_user_id);

-- Messages: Chat participants can view and insert
CREATE POLICY "Chat participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.queen_id = auth.uid() OR chats.match_user_id = auth.uid())
    )
  );

CREATE POLICY "Chat participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.queen_id = auth.uid() OR chats.match_user_id = auth.uid())
    )
  );

-- Swipe Decisions: Crew members can view and insert for their crew's queen
CREATE POLICY "Crew can view swipe decisions" ON swipe_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crews
      WHERE crews.queen_id = swipe_decisions.queen_id
      AND (
        crews.crew_member_1_id = auth.uid() OR
        crews.crew_member_2_id = auth.uid() OR
        crews.crew_member_3_id = auth.uid()
      )
    )
  );

CREATE POLICY "Crew can make swipe decisions" ON swipe_decisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM crews
      WHERE crews.queen_id = swipe_decisions.queen_id
      AND (
        crews.crew_member_1_id = auth.uid() OR
        crews.crew_member_2_id = auth.uid() OR
        crews.crew_member_3_id = auth.uid()
      )
    )
    AND auth.uid() = swipe_decisions.crew_member_id
  );

-- Bio Proposals: Crew can view and create for their crew's queen
CREATE POLICY "Crew can view bio proposals" ON bio_proposals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crews
      WHERE crews.queen_id = bio_proposals.queen_id
      AND (
        crews.crew_member_1_id = auth.uid() OR
        crews.crew_member_2_id = auth.uid() OR
        crews.crew_member_3_id = auth.uid()
      )
    )
  );

CREATE POLICY "Crew can create bio proposals" ON bio_proposals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM crews
      WHERE crews.queen_id = bio_proposals.queen_id
      AND (
        crews.crew_member_1_id = auth.uid() OR
        crews.crew_member_2_id = auth.uid() OR
        crews.crew_member_3_id = auth.uid()
      )
    )
    AND auth.uid() = bio_proposals.proposed_by
  );

-- Date Proposals: Crew can view and create, participants can view
CREATE POLICY "Crew can view date proposals" ON date_proposals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      JOIN crews ON crews.queen_id = matches.queen_id
      WHERE matches.id = date_proposals.match_id
      AND (
        crews.crew_member_1_id = auth.uid() OR
        crews.crew_member_2_id = auth.uid() OR
        crews.crew_member_3_id = auth.uid()
      )
    )
  );

CREATE POLICY "Match participants can view date proposals" ON date_proposals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = date_proposals.match_id
      AND (matches.queen_id = auth.uid() OR matches.match_user_id = auth.uid())
    )
  );

CREATE POLICY "Crew can create date proposals" ON date_proposals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      JOIN crews ON crews.queen_id = matches.queen_id
      WHERE matches.id = date_proposals.match_id
      AND (
        crews.crew_member_1_id = auth.uid() OR
        crews.crew_member_2_id = auth.uid() OR
        crews.crew_member_3_id = auth.uid()
      )
    )
    AND auth.uid() = date_proposals.proposed_by
  );

-- Crew Invites: Queen can view and create
CREATE POLICY "Queens can view own invites" ON crew_invites
  FOR SELECT USING (auth.uid() = queen_id);

CREATE POLICY "Queens can create invites" ON crew_invites
  FOR INSERT WITH CHECK (auth.uid() = queen_id);

-- Profiles: Can view profiles for swiping (limited to non-crew members)
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (true); -- Will be filtered in application logic

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================

-- Function to check swipe majority and create match
CREATE OR REPLACE FUNCTION check_swipe_majority(p_queen_id UUID, p_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_likes INTEGER;
  v_passes INTEGER;
  v_total INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE decision = 'like'),
    COUNT(*) FILTER (WHERE decision = 'pass'),
    COUNT(*)
  INTO v_likes, v_passes, v_total
  FROM swipe_decisions
  WHERE queen_id = p_queen_id AND profile_id = p_profile_id;

  -- Need at least 2 votes and majority likes
  IF v_total >= 2 AND v_likes > v_passes THEN
    -- Create match if doesn't exist
    INSERT INTO matches (queen_id, match_user_id, status)
    VALUES (p_queen_id, p_profile_id, 'pending_approval')
    ON CONFLICT (queen_id, match_user_id) DO NOTHING;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check swipe majority after insert
CREATE OR REPLACE FUNCTION trigger_check_swipe_majority()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_swipe_majority(NEW.queen_id, NEW.profile_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_swipe_decision_insert
  AFTER INSERT ON swipe_decisions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_swipe_majority();

-- Function to check bio proposal majority
CREATE OR REPLACE FUNCTION check_bio_proposal_majority(p_proposal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_approves INTEGER;
  v_rejects INTEGER;
  v_queen_id UUID;
BEGIN
  SELECT 
    queen_id,
    (votes->>'🔥')::INTEGER,
    (votes->>'🚮')::INTEGER
  INTO v_queen_id, v_approves, v_rejects
  FROM bio_proposals
  WHERE id = p_proposal_id;

  -- Need majority approves (at least 2 votes)
  IF COALESCE(v_approves, 0) > COALESCE(v_rejects, 0) AND 
     (COALESCE(v_approves, 0) + COALESCE(v_rejects, 0)) >= 2 THEN
    -- Update proposal status
    UPDATE bio_proposals
    SET status = 'approved'
    WHERE id = p_proposal_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to check date proposal majority
CREATE OR REPLACE FUNCTION check_date_proposal_majority(p_proposal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_approves INTEGER;
  v_rejects INTEGER;
BEGIN
  SELECT 
    (votes->>'👍')::INTEGER,
    (votes->>'👎')::INTEGER
  INTO v_approves, v_rejects
  FROM date_proposals
  WHERE id = p_proposal_id;

  -- Need majority approves
  IF COALESCE(v_approves, 0) > COALESCE(v_rejects, 0) AND 
     (COALESCE(v_approves, 0) + COALESCE(v_rejects, 0)) >= 2 THEN
    -- Update proposal status to pending (waiting for Queen + Match approval)
    UPDATE date_proposals
    SET status = 'pending'
    WHERE id = p_proposal_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ENABLE REALTIME (Supabase specific)
-- ============================================
-- Note: Enable Realtime in Supabase Dashboard for:
-- - messages
-- - swipe_decisions
-- - bio_proposals
-- - date_proposals
-- - matches
