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
