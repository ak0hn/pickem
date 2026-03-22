-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE league ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper: check if the current user is commissioner
CREATE OR REPLACE FUNCTION is_commissioner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'commissioner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- users
CREATE POLICY "Users can read all profiles" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- invites
CREATE POLICY "Commissioner can manage invites" ON invites
  FOR ALL TO authenticated USING (is_commissioner()) WITH CHECK (is_commissioner());

-- league
CREATE POLICY "All authenticated users can read league" ON league
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Commissioner can update league" ON league
  FOR UPDATE TO authenticated USING (is_commissioner()) WITH CHECK (is_commissioner());

-- weeks
CREATE POLICY "All authenticated users can read weeks" ON weeks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Commissioner can manage weeks" ON weeks
  FOR ALL TO authenticated USING (is_commissioner()) WITH CHECK (is_commissioner());

-- games
CREATE POLICY "All authenticated users can read games" ON games
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Commissioner can manage games" ON games
  FOR ALL TO authenticated USING (is_commissioner()) WITH CHECK (is_commissioner());

-- picks: own picks always visible; others' picks hidden until week closed
CREATE POLICY "Players can read own picks" ON picks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Commissioner can read all picks" ON picks
  FOR SELECT TO authenticated
  USING (is_commissioner());

CREATE POLICY "Players can read others picks when week closed" ON picks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weeks w WHERE w.id = week_id AND w.status = 'closed'
    )
  );

CREATE POLICY "Players can insert own picks" ON picks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM games g
      JOIN weeks w ON w.id = g.week_id
      WHERE g.id = game_id
        AND g.kickoff_time > now()
        AND w.status = 'open'
    )
  );

CREATE POLICY "Players can update own unlocked picks" ON picks
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND locked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM games g WHERE g.id = game_id AND g.kickoff_time > now()
    )
  )
  WITH CHECK (user_id = auth.uid());

-- announcements
CREATE POLICY "All authenticated users can read announcements" ON announcements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Commissioner can manage announcements" ON announcements
  FOR ALL TO authenticated USING (is_commissioner()) WITH CHECK (is_commissioner());

-- comments
CREATE POLICY "All authenticated users can read comments" ON comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- reactions
CREATE POLICY "All authenticated users can read reactions" ON reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage own reactions" ON reactions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- push_subscriptions
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Commissioner can read all push subscriptions" ON push_subscriptions
  FOR SELECT TO authenticated USING (is_commissioner());
