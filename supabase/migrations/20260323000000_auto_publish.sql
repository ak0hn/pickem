-- Add auto_publish toggle to league settings
ALTER TABLE league ADD COLUMN auto_publish boolean NOT NULL DEFAULT false;
