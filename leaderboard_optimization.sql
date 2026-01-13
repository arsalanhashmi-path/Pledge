-- 1. Create Aggregated Stats Table
create table if not exists leaderboard_stats (
    user_id uuid primary key references auth.users(id),
    given_count integer default 0,
    received_count integer default 0,
    last_updated timestamptz default now()
);

-- 2. Initial Population (Run once)
insert into leaderboard_stats (user_id, given_count, received_count)
select 
    coalesce(from_user_id, to_user_id) as user_id,
    count(*) filter (where from_user_id = coalesce(from_user_id, to_user_id) and status = 'ACCEPTED') as given_count,
    count(*) filter (where to_user_id = coalesce(from_user_id, to_user_id) and status = 'ACCEPTED') as received_count
from receipts
where status = 'ACCEPTED'
group by coalesce(from_user_id, to_user_id)
on conflict (user_id) do update set
    given_count = EXCLUDED.given_count,
    received_count = EXCLUDED.received_count,
    last_updated = now();

-- 3. Enable RLS (Public Read)
alter table leaderboard_stats enable row level security;
create policy "Leaderboard viewable by everyone" on leaderboard_stats for select using (true);

-- 4. Create Trigger Function to Auto-Update
create or replace function update_leaderboard_stats()
returns trigger as $$
begin
    -- Handle Senders (Givers)
    if (TG_OP = 'INSERT' and NEW.status = 'ACCEPTED') or
       (TG_OP = 'UPDATE' and NEW.status = 'ACCEPTED' and OLD.status <> 'ACCEPTED') then
       
        insert into leaderboard_stats (user_id, given_count, received_count)
        values (NEW.from_user_id, 1, 0)
        on conflict (user_id) do update set given_count = leaderboard_stats.given_count + 1, last_updated = now();
        
    elsif (TG_OP = 'DELETE' and OLD.status = 'ACCEPTED') or
          (TG_OP = 'UPDATE' and NEW.status <> 'ACCEPTED' and OLD.status = 'ACCEPTED') then
          
        update leaderboard_stats set given_count = given_count - 1 where user_id = OLD.from_user_id;
    end if;

    -- Handle Receivers
    if (TG_OP = 'INSERT' and NEW.status = 'ACCEPTED' and NEW.to_user_id is not null) or
       (TG_OP = 'UPDATE' and NEW.status = 'ACCEPTED' and OLD.status <> 'ACCEPTED' and NEW.to_user_id is not null) then
       
        insert into leaderboard_stats (user_id, given_count, received_count)
        values (NEW.to_user_id, 0, 1)
        on conflict (user_id) do update set received_count = leaderboard_stats.received_count + 1, last_updated = now();
        
    elsif (TG_OP = 'DELETE' and OLD.status = 'ACCEPTED' and OLD.to_user_id is not null) or
          (TG_OP = 'UPDATE' and NEW.status <> 'ACCEPTED' and OLD.status = 'ACCEPTED' and OLD.to_user_id is not null) then
          
        update leaderboard_stats set received_count = received_count - 1 where user_id = OLD.to_user_id;
    end if;
    
    return null;
end;
$$ language plpgsql security definer;

-- 5. Attach Triggers
drop trigger if exists on_receipt_change_leaderboard on receipts;
create trigger on_receipt_change_leaderboard
after insert or update or delete on receipts
for each row execute function update_leaderboard_stats();
