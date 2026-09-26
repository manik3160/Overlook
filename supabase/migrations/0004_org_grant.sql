-- Light organisations (for the cross-organisation reuse registry) and the grant amount (cost per verified outcome).
-- Run once in the Supabase SQL Editor. Both optional; nothing else changes.
alter table projects add column if not exists organization text;
alter table projects add column if not exists grant_inr numeric check (grant_inr is null or grant_inr >= 0);
