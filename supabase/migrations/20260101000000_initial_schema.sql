-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('player', 'commissioner');
CREATE TYPE week_status AS ENUM ('pending', 'open', 'sunday_complete', 'tiebreaker', 'results_posted', 'closed');
CREATE TYPE game_day AS ENUM ('thursday', 'friday', 'saturday', 'sunday', 'monday');
CREATE TYPE game_result AS ENUM ('pending', 'home_win', 'away_win', 'push');
CREATE TYPE pick_result AS ENUM ('pending', 'win', 'loss', 'push', 'void');
CREATE TYPE announcement_type AS ENUM ('slate', 'pre_snf_update', 'tiebreaker', 'results', 'general');

-- users
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'player',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- invites
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  token uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  invited_by uuid REFERENCES users(id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- league (single row for V1)
CREATE TABLE league (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  season_year int NOT NULL,
  weekly_prize_display text,
  season_prize_display text,
  pick_count int NOT NULL DEFAULT 6,
  tiebreaker_threshold int NOT NULL DEFAULT 1,
  posting_window_hours int NOT NULL DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- weeks
CREATE TABLE weeks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number int NOT NULL,
  season_year int NOT NULL,
  status week_status NOT NULL DEFAULT 'pending',
  thursday_kickoff timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_number, season_year)
);

-- games
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  home_team text NOT NULL,
  away_team text NOT NULL,
  spread decimal(4,1) NOT NULL,
  spread_favorite text NOT NULL,
  kickoff_time timestamptz NOT NULL,
  day game_day NOT NULL,
  is_tiebreaker boolean NOT NULL DEFAULT false,
  result game_result NOT NULL DEFAULT 'pending',
  result_confirmed boolean NOT NULL DEFAULT false,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- picks
CREATE TABLE picks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  picked_team text NOT NULL CHECK (picked_team IN ('home', 'away')),
  result pick_result NOT NULL DEFAULT 'pending',
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);

-- announcements
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id uuid REFERENCES weeks(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type announcement_type NOT NULL DEFAULT 'general',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- comments
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- reactions
CREATE TABLE reactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  UNIQUE (user_id, announcement_id, emoji)
);

-- push_subscriptions
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_picks_user_week ON picks(user_id, week_id);
CREATE INDEX idx_picks_game ON picks(game_id);
CREATE INDEX idx_games_week ON games(week_id);
CREATE INDEX idx_announcements_week ON announcements(week_id);
CREATE INDEX idx_comments_announcement ON comments(announcement_id);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER picks_updated_at BEFORE UPDATE ON picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Result cascade trigger: when a game result is confirmed, auto-score picks
CREATE OR REPLACE FUNCTION cascade_pick_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when result_confirmed changes to true
  IF NEW.result_confirmed = true AND OLD.result_confirmed = false THEN
    UPDATE picks
    SET result = CASE
      WHEN NEW.result = 'push' THEN 'push'::pick_result
      WHEN NEW.result = 'home_win' AND picked_team = 'home' THEN 'win'::pick_result
      WHEN NEW.result = 'home_win' AND picked_team = 'away' THEN 'loss'::pick_result
      WHEN NEW.result = 'away_win' AND picked_team = 'away' THEN 'win'::pick_result
      WHEN NEW.result = 'away_win' AND picked_team = 'home' THEN 'loss'::pick_result
      ELSE result
    END
    WHERE game_id = NEW.id
      AND result = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_result_cascade
  AFTER UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION cascade_pick_results();
