-- Create admin users for Tartelle
-- Run this in: Supabase Dashboard → SQL Editor
-- Initial password for both: Tartelle2026!

DO $$
DECLARE
  uid1 uuid := gen_random_uuid();
  uid2 uuid := gen_random_uuid();
BEGIN
  -- ── mclara@mclaramartinez.com ──────────────────────────────────────────────
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uid1, 'authenticated', 'authenticated',
    'mclara@mclaramartinez.com',
    crypt('Tartelle2026!', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'mclara@mclaramartinez.com',
    uid1,
    jsonb_build_object('sub', uid1::text, 'email', 'mclara@mclaramartinez.com'),
    'email', now(), now(), now()
  );

  -- ── tartellebakery@gmail.com ───────────────────────────────────────────────
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uid2, 'authenticated', 'authenticated',
    'tartellebakery@gmail.com',
    crypt('Tartelle2026!', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'tartellebakery@gmail.com',
    uid2,
    jsonb_build_object('sub', uid2::text, 'email', 'tartellebakery@gmail.com'),
    'email', now(), now(), now()
  );
END $$;
