-- Add thumbnail_key column to files table
-- This column stores the R2/storage key for generated video thumbnails

ALTER TABLE files ADD COLUMN thumbnail_key TEXT;
ALTER TABLE files ADD COLUMN thumbnail_url TEXT;

-- Create index untuk faster lookups
CREATE INDEX idx_files_thumbnail_key ON files(thumbnail_key) WHERE thumbnail_key IS NOT NULL;
