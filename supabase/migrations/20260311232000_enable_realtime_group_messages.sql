-- Enable realtime for farmer_group_messages table
begin;

-- Check if publication exists, if not create it (Supabase usually has it by default)
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- Add the table to the publication
alter publication supabase_realtime add table public.farmer_group_messages;

commit;
