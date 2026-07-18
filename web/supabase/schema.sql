-- Supabase schema backing the notifications feature (web/src/pages/UserSettings.jsx,
-- web/src/components/AppTable.jsx, web/src/lib/supabase.js).
--
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  app_name text NOT NULL,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.sent_notifications (
  user_id uuid NOT NULL,
  app_name text NOT NULL,
  version text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sent_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT sent_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
