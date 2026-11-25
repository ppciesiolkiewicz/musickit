-- The terms a person agreed to are a version number now (TERMS_VERSIONS in src/features/account/terms.ts), not the
-- date on /terms. Every date saved so far is the beta terms' "24 November 2026", which is version 1.
ALTER TABLE "users" ALTER COLUMN "terms_version" SET DATA TYPE integer USING (CASE WHEN "terms_version" IS NULL THEN NULL ELSE 1 END);
