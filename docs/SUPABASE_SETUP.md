# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose an organization and name your project
4. Set a database password (save it somewhere safe)
5. Choose a region close to your users
6. Click "Create new project"

## 2. Create the Models Table

Go to the SQL Editor in your Supabase dashboard and run:

```sql
-- Create models table
CREATE TABLE models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (anonymous access)
CREATE POLICY "Allow anonymous access" ON models
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX models_updated_at_idx ON models(updated_at DESC);

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE models;
```

## 2b. Add Version History (Optional but Recommended)

Run this to enable rollback functionality:

```sql
-- Create model_versions table for rollback support
CREATE TABLE model_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  saved_by TEXT DEFAULT 'anonymous'
);

-- Enable Row Level Security
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (anonymous access)
CREATE POLICY "Allow anonymous access" ON model_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX model_versions_model_id_idx ON model_versions(model_id, created_at DESC);

-- Keep only last 50 versions per model (optional cleanup function)
CREATE OR REPLACE FUNCTION cleanup_old_versions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM model_versions
  WHERE model_id = NEW.model_id
  AND id NOT IN (
    SELECT id FROM model_versions
    WHERE model_id = NEW.model_id
    ORDER BY created_at DESC
    LIMIT 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_versions_trigger
AFTER INSERT ON model_versions
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_versions();
```

## 3. Get Your API Keys

1. Go to Project Settings → API
2. Copy the "Project URL" (e.g., `https://xxxxx.supabase.co`)
3. Copy the "anon public" key

## 4. Configure the App

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For GitHub Pages deployment, you'll need to build with the environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
npm run build:standalone
```

## 5. Verify Setup

1. Run `npm run dev`
2. You should see a "Models" dropdown in the header
3. Create a diagram and click Save
4. Refresh the page - your model should appear in the dropdown
