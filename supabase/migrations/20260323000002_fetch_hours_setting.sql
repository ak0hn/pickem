-- Replace auto_fetch toggle with a configurable hours-before-kickoff setting
ALTER TABLE league DROP COLUMN IF EXISTS auto_fetch;
ALTER TABLE league ADD COLUMN fetch_hours_before_kickoff int NOT NULL DEFAULT 12;
