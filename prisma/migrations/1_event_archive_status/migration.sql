-- Past events used to be archived by setting deleted_at, which made them
-- indistinguishable from deleted ones. They are now archived with
-- status = 'completed'. Events whose deleted_at was set after they started
-- were archived automatically: convert them back.
UPDATE "Contact_catalog".events
SET status = 'completed', deleted_at = NULL
WHERE deleted_at IS NOT NULL
  AND deleted_at >= start_at
  AND status = 'scheduled';

-- Remove the duplicate full-text index (identical to idx_contacts_search).
DROP INDEX IF EXISTS "Contact_catalog".idx_contacts_search_gin;
