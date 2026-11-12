CREATE TABLE users (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id        text UNIQUE,
    email            text NOT NULL UNIQUE,
    name             text,
    avatar_url       text,
    primary_provider text CHECK (primary_provider IN ('GOOGLE')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    last_login_at    timestamptz
);
