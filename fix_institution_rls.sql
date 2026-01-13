-- Fix RLS violation by making the trigger function bypass RLS
-- We use SECURITY DEFINER so the function runs with admin privileges
-- instead of the user's restricted privileges.

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
