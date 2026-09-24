create extension if not exists vector with schema extensions;

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  activity_type text,
  center_lat double precision,
  center_lng double precision,
  radius_m integer default 500,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  public_id text not null unique,
  asset_id text,
  resource_type text not null,
  secure_url text not null,
  etag text,
  phash text,
  width int,
  height int,
  taken_at timestamptz,
  lat double precision,
  lng double precision,
  has_exif boolean default false,
  parent_asset_id uuid references assets(id),
  frame_second numeric,
  status text default 'pending',
  tags text[] default '{}',
  caption text,
  signals jsonb default '{}',
  embedding vector(768),
  trust_score int,
  trust_flags jsonb default '[]',
  review_status text default 'unreviewed',
  transcript text,
  created_at timestamptz default now()
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id) on delete cascade,
  kind text not null,
  input_hash text not null,
  result jsonb not null,
  created_at timestamptz default now(),
  unique (asset_id, kind, input_hash)
);

create table pairs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  before_asset_id uuid references assets(id),
  after_asset_id uuid references assets(id),
  distance_m double precision,
  days_apart int,
  change_summary text,
  created_at timestamptz default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  kind text not null,
  manifest jsonb not null,
  manifest_sha256 text not null,
  pdf_public_id text,
  created_at timestamptz default now()
);

-- Semantic search: cosine similarity (1 = identical), optional project filter.
create or replace function match_assets(
  query_embedding vector(768),
  match_count int default 20,
  project_filter uuid default null
)
returns table (id uuid, similarity double precision)
language sql stable
set search_path = public, extensions
as $$
  select a.id, 1 - (a.embedding <=> query_embedding) as similarity
  from assets a
  where a.embedding is not null
    and (project_filter is null or a.project_id = project_filter)
  order by a.embedding <=> query_embedding
  limit match_count;
$$;
