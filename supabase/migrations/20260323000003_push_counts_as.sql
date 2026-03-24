-- Controls whether a push (tie against the spread) counts as a win or a tie (doesn't count)
ALTER TABLE league ADD COLUMN push_counts_as text NOT NULL DEFAULT 'tie' CHECK (push_counts_as IN ('win', 'tie'));
