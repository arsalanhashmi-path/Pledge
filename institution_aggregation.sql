-- 1. Create the Aggregation Table
CREATE TABLE IF NOT EXISTS institution_relationships (
    from_institution TEXT NOT NULL,
    to_institution TEXT NOT NULL,
    exchange_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (from_institution, to_institution)
);

-- 2. Enable RLS (Public Read)
ALTER TABLE institution_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view access" ON institution_relationships FOR SELECT USING (true);

-- 3. Initial Population Query
INSERT INTO institution_relationships (from_institution, to_institution, exchange_count)
SELECT 
    sender.institution as from_institution,
    receiver.institution as to_institution,
    COUNT(*) as exchange_count
FROM receipts r
JOIN public_profiles sender ON r.from_user_id = sender.user_id
JOIN public_profiles receiver ON r.to_user_id = receiver.user_id
WHERE r.status = 'ACCEPTED'
  AND sender.institution IS NOT NULL 
  AND receiver.institution IS NOT NULL
  AND sender.institution != ''
  AND receiver.institution != ''
GROUP BY sender.institution, receiver.institution
ON CONFLICT (from_institution, to_institution) 
DO UPDATE SET exchange_count = EXCLUDED.exchange_count, last_updated = NOW();

-- 4. Trigger Function for Real-time Updates
CREATE OR REPLACE FUNCTION update_institution_stats()
RETURNS TRIGGER AS $$
DECLARE
    sender_inst TEXT;
    receiver_inst TEXT;
BEGIN
    -- Handle INSERT or UPDATE (New Acceptance)
    IF (TG_OP = 'INSERT' AND NEW.status = 'ACCEPTED') OR 
       (TG_OP = 'UPDATE' AND OLD.status != 'ACCEPTED' AND NEW.status = 'ACCEPTED') THEN
       
       -- Fetch institutions
       SELECT institution INTO sender_inst FROM public_profiles WHERE user_id = NEW.from_user_id;
       SELECT institution INTO receiver_inst FROM public_profiles WHERE user_id = NEW.to_user_id;

       IF sender_inst IS NOT NULL AND receiver_inst IS NOT NULL AND sender_inst != '' AND receiver_inst != '' THEN
           INSERT INTO institution_relationships (from_institution, to_institution, exchange_count)
           VALUES (sender_inst, receiver_inst, 1)
           ON CONFLICT (from_institution, to_institution)
           DO UPDATE SET exchange_count = institution_relationships.exchange_count + 1, last_updated = NOW();
       END IF;

    -- Handle DELETE or Revocation (Un-accept)
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'ACCEPTED') OR 
          (TG_OP = 'UPDATE' AND OLD.status = 'ACCEPTED' AND NEW.status != 'ACCEPTED') THEN
          
       -- Fetch institutions (from OLD record)
       SELECT institution INTO sender_inst FROM public_profiles WHERE user_id = OLD.from_user_id;
       SELECT institution INTO receiver_inst FROM public_profiles WHERE user_id = OLD.to_user_id;

       IF sender_inst IS NOT NULL AND receiver_inst IS NOT NULL THEN
           UPDATE institution_relationships
           SET exchange_count = exchange_count - 1, last_updated = NOW()
           WHERE from_institution = sender_inst AND to_institution = receiver_inst;
       END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger to Receipts
DROP TRIGGER IF EXISTS trg_update_institution_stats ON receipts;
CREATE TRIGGER trg_update_institution_stats
AFTER INSERT OR UPDATE OR DELETE ON receipts
FOR EACH ROW
EXECUTE FUNCTION update_institution_stats();
