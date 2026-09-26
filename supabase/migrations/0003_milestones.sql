-- Pay-on-Proof: payment stages per project, each released only when its verified evidence exists.
-- [{ id, title, releasePct, rule: { tags: string[], minVerified: int, from: date|null, to: date|null, needPair: bool } }]
-- Written only by PUT /api/projects/[id]/milestones (zod-validated). Run once in the Supabase SQL Editor.
alter table projects add column if not exists milestones jsonb not null default '[]';
