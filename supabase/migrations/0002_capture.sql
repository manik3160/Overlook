-- Signed live capture (Ghost Camera). Run once in the Supabase SQL Editor.
-- capture_proof: { payload, signature, publicKey, deviceId, verifiedAt, verified: true }, written only by /api/capture
-- after the server checked the signature, the nonce and the stored file's SHA-256.
alter table assets add column if not exists capture_proof jsonb;

-- A nonce can be used once: a replayed capture request cannot create a second asset.
create unique index if not exists assets_capture_nonce_uniq on assets ((capture_proof -> 'payload' ->> 'nonce')) where capture_proof is not null;

-- Ghost retakes are looked up by the "before" photo they were lined up against.
create index if not exists assets_capture_ghost_idx on assets ((capture_proof -> 'payload' ->> 'ghostAssetId')) where capture_proof is not null;
