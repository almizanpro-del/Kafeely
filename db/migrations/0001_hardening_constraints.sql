-- Hardening pass: value constraints the application relies on, an expiry for
-- waitlist double opt-in tokens, and a database-level guarantee that the
-- audit trail stays append-only.

ALTER TABLE "waitlist_entries" ADD COLUMN "verification_expires_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('super_admin', 'staff'));
--> statement-breakpoint

ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("status" IN ('pending', 'active', 'suspended', 'deleted'));
--> statement-breakpoint

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_role_check" CHECK ("role" IN ('owner', 'tenant', 'partner', 'investor'));
--> statement-breakpoint

CREATE INDEX "waitlist_verification_token_idx" ON "waitlist_entries" USING btree ("verification_token_hash");
--> statement-breakpoint

CREATE INDEX "waitlist_verification_expires_idx" ON "waitlist_entries" USING btree ("verification_expires_at");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "audit_logs_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER "audit_logs_no_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_append_only"();
