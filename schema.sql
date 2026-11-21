-- FF Marketplace security baseline. Run in Supabase SQL Editor on a fresh project.
-- Never put the service_role key in the browser. Publishable/anon key is intended for the client.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default 'Player',
  role text not null default 'user',
  avatar text,
  bio text default '',
  phone text,
  verified boolean not null default false,
  banned boolean not null default false,
  rating numeric not null default 0,
  sales integer not null default 0,
  balance numeric not null default 0,
  joined date not null default current_date,
  created_at timestamptz not null default now()
);

-- A single standard account can both buy and submit listings. Only admin is a privileged role.
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'user' where role in ('buyer','seller') or role is null;
alter table public.profiles alter column role set default 'user';
alter table public.profiles add constraint profiles_role_check check (role in ('user','admin'));

create or replace function public.is_market_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.banned = false
  );
$$;
revoke all on function public.is_market_admin() from public;
grant execute on function public.is_market_admin() to anon, authenticated;

create or replace function public.create_market_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id,email,name,role,avatar,bio)
  values (
    new.id,
    coalesce(new.email,''),
    left(coalesce(new.raw_user_meta_data->>'name','Player'),80),
    'user',
    upper(left(coalesce(new.raw_user_meta_data->>'name','P'),1)),
    ''
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_market_profile on auth.users;
create trigger on_auth_user_created_market_profile
after insert on auth.users for each row execute procedure public.create_market_profile();

-- Prevent users from promoting themselves, self-verifying, unbanning themselves or editing balances.
create or replace function public.protect_market_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_market_admin() then
    new.role := old.role;
    new.verified := old.verified;
    new.banned := old.banned;
    new.balance := old.balance;
    new.sales := old.sales;
    new.rating := old.rating;
  end if;
  new.email := old.email;
  new.id := old.id;
  return new;
end;
$$;
drop trigger if exists protect_market_profile_role on public.profiles;
create trigger protect_market_profile_role before update on public.profiles
for each row execute procedure public.protect_market_profile();

create table if not exists public.app_records (
  id uuid primary key default gen_random_uuid(),
  collection text not null check (collection in ('listings','chats','orders','wishlist','cart','users')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  value jsonb not null,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists app_records_collection_created_idx on public.app_records(collection, created_at desc);
create index if not exists app_records_owner_idx on public.app_records(owner_id);

-- Service-role-only idempotency ledger prevents repeated Telegram spam for one order.
create table if not exists public.utr_notification_log (
  order_record_id uuid primary key references public.app_records(id) on delete cascade,
  notified_at timestamptz not null default now()
);
alter table public.utr_notification_log enable row level security;
revoke all on public.utr_notification_log from anon, authenticated;

-- A UTR is a one-time reference. Normalize whitespace/case before enforcing uniqueness.
create unique index if not exists app_records_unique_utr_idx
on public.app_records (upper(regexp_replace(value->>'transactionId', '\s+', '', 'g')))
where collection = 'orders' and nullif(trim(value->>'transactionId'),'') is not null;

-- Enforce trusted state transitions in the database, not only in React.
create or replace function public.guard_market_record()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_role text;
  v_banned boolean := false;
  old_status text;
  new_status text;
  old_messages jsonb;
  new_messages jsonb;
begin
  select role, banned into v_role, v_banned from public.profiles where id = auth.uid();
  if v_banned then raise exception 'This account is suspended'; end if;

  if tg_op = 'INSERT' then
    if new.owner_id <> auth.uid() then raise exception 'Record owner must be the signed-in user'; end if;
    if new.collection = 'users' then raise exception 'Direct user records are disabled'; end if;
    if new.collection = 'listings' then
      if v_role <> 'user' or lower(coalesce(new.value->>'sellerEmail','')) <> v_email then raise exception 'Only the signed-in account can publish its own listing'; end if;
      new.value := jsonb_set(jsonb_set(new.value, '{approved}', 'false'::jsonb, true), '{verified}', 'false'::jsonb, true);
    elsif new.collection = 'orders' then
      if lower(coalesce(new.value->>'buyerEmail','')) <> v_email then raise exception 'Order buyer must match signed-in account'; end if;
      if coalesce(new.value->>'status','') <> 'pending_verification' then raise exception 'New orders must await payment verification'; end if;
      if length(trim(coalesce(new.value->>'transactionId',''))) < 6 or length(trim(coalesce(new.value->>'transactionId',''))) > 80 then raise exception 'UTR must be between 6 and 80 characters'; end if;
      if not exists (
        select 1 from public.app_records l
        where l.collection = 'listings' and l.value->>'id' = new.value->>'listingId'
          and coalesce((l.value->>'approved')::boolean,false) = true
          and lower(coalesce(l.value->>'sellerEmail','')) = lower(coalesce(new.value->>'sellerEmail',''))
          and (l.value->>'price')::numeric = (new.value->>'price')::numeric
      ) then raise exception 'Listing is not approved or order details do not match'; end if;
    elsif new.collection = 'chats' then
      if lower(coalesce(new.value->>'buyerEmail','')) <> v_email then raise exception 'Only the buyer can start a chat'; end if;
      if lower(coalesce(new.value->>'sellerEmail','')) = v_email then raise exception 'Cannot chat with yourself'; end if;
      if not exists (
        select 1 from public.app_records l
        where l.collection = 'listings' and l.value->>'id' = new.value->>'listingId'
          and coalesce((l.value->>'approved')::boolean,false) = true
          and lower(coalesce(l.value->>'sellerEmail','')) = lower(coalesce(new.value->>'sellerEmail',''))
      ) then raise exception 'Chat must reference an approved listing and its seller'; end if;
    elsif new.collection in ('wishlist','cart') then
      if lower(coalesce(new.value->>'userEmail','')) <> v_email then raise exception 'Record must belong to signed-in account'; end if;
    end if;
    return new;
  end if;

  if new.collection <> old.collection or new.owner_id <> old.owner_id then
    raise exception 'Record identity cannot be changed';
  end if;

  if public.is_market_admin() then
    if old.collection = 'orders' then
      if (old.value - 'status') <> (new.value - 'status') then raise exception 'Order details and UTR are immutable'; end if;
      old_status := old.value->>'status';
      new_status := new.value->>'status';
      if new_status = 'escrow' and old_status = 'pending_verification' then return new; end if;
      if new_status = 'completed' and old_status = 'confirmed' then return new; end if;
      if new_status = 'disputed' and old_status in ('pending_verification','escrow','delivered','confirmed') then return new; end if;
      raise exception 'Administrator cannot skip payment verification or buyer confirmation';
    end if;
    return new;
  end if;

  if old.collection = 'listings' then
    if old.owner_id <> auth.uid() or coalesce((old.value->>'approved')::boolean,false) then
      raise exception 'Approved listings can only be changed by an administrator';
    end if;
    if old.value->>'id' <> new.value->>'id' or lower(coalesce(old.value->>'sellerEmail','')) <> lower(coalesce(new.value->>'sellerEmail','')) then
      raise exception 'Listing identity and seller cannot be changed';
    end if;
    new.value := jsonb_set(jsonb_set(new.value, '{approved}', 'false'::jsonb, true), '{verified}', 'false'::jsonb, true);
  elsif old.collection = 'orders' then
    if v_email not in (lower(coalesce(old.value->>'buyerEmail','')), lower(coalesce(old.value->>'sellerEmail',''))) then
      raise exception 'Only order participants can update this order';
    end if;
    if (old.value - 'status') <> (new.value - 'status') then raise exception 'Order details and UTR are immutable'; end if;
    old_status := old.value->>'status';
    new_status := new.value->>'status';
    if new_status = 'disputed' and old_status in ('pending_verification','escrow','delivered','confirmed') then
      null;
    elsif new_status = 'delivered' and old_status = 'escrow' and v_email = lower(old.value->>'sellerEmail') then
      null;
    elsif new_status = 'confirmed' and old_status = 'delivered' and v_email = lower(old.value->>'buyerEmail') then
      null;
    else
      raise exception 'This order status transition is not permitted';
    end if;
  elsif old.collection = 'chats' then
    if v_email not in (lower(coalesce(old.value->>'buyerEmail','')), lower(coalesce(old.value->>'sellerEmail',''))) then
      raise exception 'Only chat participants can update this conversation';
    end if;
    if (old.value - 'messages' - 'unread') <> (new.value - 'messages' - 'unread') then
      raise exception 'Chat participants and listing reference are immutable';
    end if;
    old_messages := coalesce(old.value->'messages','[]'::jsonb);
    new_messages := coalesce(new.value->'messages','[]'::jsonb);
    if jsonb_array_length(new_messages) < jsonb_array_length(old_messages)
       or (select coalesce(jsonb_agg(x order by n),'[]'::jsonb) from jsonb_array_elements(new_messages) with ordinality t(x,n) where n <= jsonb_array_length(old_messages)) <> old_messages then
      raise exception 'Chat history cannot be deleted or edited';
    end if;
    if jsonb_array_length(new_messages) > jsonb_array_length(old_messages) then
      if jsonb_array_length(new_messages) <> jsonb_array_length(old_messages) + 1 then raise exception 'Send one message at a time'; end if;
      if lower(coalesce(new_messages->(jsonb_array_length(new_messages)-1)->>'from','')) <> v_email then
        raise exception 'Message sender must match signed-in account';
      end if;
      if length(coalesce(new_messages->(jsonb_array_length(new_messages)-1)->>'text','')) > 2000 then
        raise exception 'Message text exceeds 2000 characters';
      end if;
    end if;
  elsif old.collection in ('wishlist','cart') then
    if old.owner_id <> auth.uid() or lower(coalesce(old.value->>'userEmail','')) <> v_email then
      raise exception 'Only the owner can update this record';
    end if;
  else
    raise exception 'This record cannot be updated';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_market_record_trigger on public.app_records;
create trigger guard_market_record_trigger before insert or update on public.app_records
for each row execute procedure public.guard_market_record();

alter table public.profiles enable row level security;
alter table public.app_records enable row level security;

-- Profiles are private by default. Admin access is explicit.
drop policy if exists "profile read self or admin" on public.profiles;
create policy "profile read self or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_market_admin());
drop policy if exists "profile update self or admin" on public.profiles;
create policy "profile update self or admin" on public.profiles for update to authenticated
using (id = auth.uid() or public.is_market_admin())
with check (id = auth.uid() or public.is_market_admin());

-- Listings: public can only see approved listings; sellers see their own pending listings.
drop policy if exists "market records read" on public.app_records;
create policy "market records read" on public.app_records for select to anon, authenticated
using (
  (collection = 'listings' and coalesce((value->>'approved')::boolean,false) = true)
  or (auth.uid() is not null and (
    public.is_market_admin()
    or (collection = 'listings' and owner_id = auth.uid())
    or (collection = 'chats' and lower(coalesce(value->>'buyerEmail','')) = lower(auth.jwt()->>'email'))
    or (collection = 'chats' and lower(coalesce(value->>'sellerEmail','')) = lower(auth.jwt()->>'email'))
    or (collection = 'orders' and lower(coalesce(value->>'buyerEmail','')) = lower(auth.jwt()->>'email'))
    or (collection = 'orders' and lower(coalesce(value->>'sellerEmail','')) = lower(auth.jwt()->>'email'))
    or (collection in ('wishlist','cart') and owner_id = auth.uid())
  ))
);

drop policy if exists "market records insert own" on public.app_records;
create policy "market records insert own" on public.app_records for insert to authenticated
with check (owner_id = auth.uid() and collection <> 'users');

drop policy if exists "market records update own or admin" on public.app_records;
create policy "market records update own or admin" on public.app_records for update to authenticated
using (
  public.is_market_admin()
  or (collection in ('listings','wishlist','cart') and owner_id = auth.uid())
  or (collection = 'chats' and (lower(coalesce(value->>'buyerEmail','')) = lower(auth.jwt()->>'email') or lower(coalesce(value->>'sellerEmail','')) = lower(auth.jwt()->>'email')))
  or (collection = 'orders' and (lower(coalesce(value->>'buyerEmail','')) = lower(auth.jwt()->>'email') or lower(coalesce(value->>'sellerEmail','')) = lower(auth.jwt()->>'email')))
)
with check (
  public.is_market_admin()
  or (collection in ('listings','wishlist','cart') and owner_id = auth.uid())
  or (collection = 'chats' and (lower(coalesce(value->>'buyerEmail','')) = lower(auth.jwt()->>'email') or lower(coalesce(value->>'sellerEmail','')) = lower(auth.jwt()->>'email')))
  or (collection = 'orders' and (lower(coalesce(value->>'buyerEmail','')) = lower(auth.jwt()->>'email') or lower(coalesce(value->>'sellerEmail','')) = lower(auth.jwt()->>'email')))
);

drop policy if exists "market records delete own or admin" on public.app_records;
create policy "market records delete own or admin" on public.app_records for delete to authenticated
using (
  public.is_market_admin()
  or (collection in ('wishlist','cart') and owner_id = auth.uid())
  or (collection = 'listings' and owner_id = auth.uid() and coalesce((value->>'approved')::boolean,false) = false)
);

grant select on public.app_records to anon, authenticated;
grant insert, update, delete on public.app_records to authenticated;
grant select, update on public.profiles to authenticated;

-- Listing media can be read publicly only because the listing itself is approved in the app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', false, 52428800, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = excluded.allowed_mime_types;

-- Chat media is private and participant-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 26214400, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false, file_size_limit = 26214400, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "listing media public read" on storage.objects;
drop policy if exists "approved listing media read" on storage.objects;
create policy "approved listing media read" on storage.objects for select to anon, authenticated
using (bucket_id = 'listing-media' and exists (
  select 1 from public.app_records r
  where r.collection = 'listings'
    and (coalesce((r.value->>'approved')::boolean,false) = true or r.owner_id = auth.uid() or public.is_market_admin())
    and coalesce(r.value->'mediaUrls','[]'::jsonb) ? storage.objects.name
));
drop policy if exists "listing media owner upload" on storage.objects;
create policy "listing media owner upload" on storage.objects for insert to authenticated
with check (bucket_id = 'listing-media' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'user' and p.banned = false));
drop policy if exists "listing media owner delete" on storage.objects;
create policy "listing media owner delete" on storage.objects for delete to authenticated
using (bucket_id = 'listing-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat media participant read" on storage.objects;
create policy "chat media participant read" on storage.objects for select to authenticated
using (bucket_id = 'chat-media' and exists (
  select 1 from public.app_records r
  where r.collection = 'chats' and r.value->>'id' = (storage.foldername(name))[1]
    and (lower(coalesce(r.value->>'buyerEmail','')) = lower(auth.jwt()->>'email')
      or lower(coalesce(r.value->>'sellerEmail','')) = lower(auth.jwt()->>'email') or public.is_market_admin())
));
drop policy if exists "chat media participant upload" on storage.objects;
create policy "chat media participant upload" on storage.objects for insert to authenticated
with check (bucket_id = 'chat-media' and (storage.foldername(name))[2] = auth.uid()::text and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.banned = false
) and exists (
  select 1 from public.app_records r
  where r.collection = 'chats' and r.value->>'id' = (storage.foldername(name))[1]
    and (lower(coalesce(r.value->>'buyerEmail','')) = lower(auth.jwt()->>'email')
      or lower(coalesce(r.value->>'sellerEmail','')) = lower(auth.jwt()->>'email') or public.is_market_admin())
));

-- ADMIN SETUP (run manually after creating your own account):
-- update public.profiles set role = 'admin' where email = 'YOUR_LOGIN_EMAIL';
-- Do not create a default/shared admin password in frontend code.


-- Private voucher inventory. Codes are never exposed through public marketplace queries.
create table if not exists public.voucher_inventory (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (length(trim(provider)) between 2 and 100),
  title text not null check (length(trim(title)) between 2 and 100),
  balance numeric(12,2) not null check (balance > 0),
  price numeric(12,2) not null check (price > 0),
  voucher_code text not null unique check (length(trim(voucher_code)) between 4 and 300),
  status text not null default 'available' check (status in ('available','sold','disabled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
-- Block the two requested gift-card brands while their published terms prohibit resale for value.
-- This is enforced in the database as well as the UI; do not remove without written issuer authorization and a terms review.
alter table public.voucher_inventory drop constraint if exists voucher_inventory_provider_resale_check;
alter table public.voucher_inventory add constraint voucher_inventory_provider_resale_check
check (lower(trim(provider)) not in ('amazon gift card','amazon pay gift card','amazon','google play gift card','google play'));

alter table public.voucher_inventory enable row level security;
drop policy if exists "voucher inventory admin only" on public.voucher_inventory;
create policy "voucher inventory admin only" on public.voucher_inventory
for all to authenticated
using (public.is_market_admin())
with check (public.is_market_admin());
revoke all on public.voucher_inventory from anon, public;
grant select, insert, update, delete on public.voucher_inventory to authenticated;


-- Safe customer-facing voucher catalogue: metadata only, never the redeem code.
create or replace function public.get_available_vouchers()
returns table (
  id uuid,
  provider text,
  title text,
  balance numeric,
  price numeric,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select v.id, v.provider, v.title, v.balance, v.price, v.created_at
  from public.voucher_inventory v
  where v.status = 'available'
  order by v.created_at desc;
$$;
revoke all on function public.get_available_vouchers() from public;
grant execute on function public.get_available_vouchers() to anon, authenticated;


-- =====================================================================
-- APK STORE (added): admin uploads APK files, users buy with UPI + UTR,
-- phone company is collected at purchase, download unlocks after admin approval.
-- =====================================================================
create table if not exists public.apk_products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 100),
  version text not null default '1.0' check (length(version) <= 30),
  description text not null default '' check (length(description) <= 1000),
  price numeric(12,2) not null check (price > 0),
  file_path text not null,
  file_size bigint,
  status text not null default 'available' check (status in ('available','disabled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.apk_products enable row level security;
drop policy if exists "apk products admin only" on public.apk_products;
create policy "apk products admin only" on public.apk_products for all to authenticated
  using (public.is_market_admin()) with check (public.is_market_admin());
revoke all on public.apk_products from anon, public;
grant select, insert, update, delete on public.apk_products to authenticated;

create table if not exists public.apk_orders (
  id uuid primary key default gen_random_uuid(),
  apk_id uuid not null references public.apk_products(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) default auth.uid(),
  phone_company text not null check (length(trim(phone_company)) between 2 and 60),
  phone_model text check (phone_model is null or length(phone_model) <= 80),
  utr text not null check (length(trim(utr)) between 6 and 80),
  price numeric(12,2) not null default 0,
  status text not null default 'pending_verification' check (status in ('pending_verification','approved','rejected')),
  created_at timestamptz not null default now()
);
create unique index if not exists apk_orders_utr_unique on public.apk_orders (upper(trim(utr)));
alter table public.apk_orders enable row level security;

create or replace function public.apk_order_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare p numeric;
begin
  select price into p from public.apk_products where id = new.apk_id and status = 'available';
  if p is null then raise exception 'This APK is not available'; end if;
  new.price := p; new.status := 'pending_verification';
  new.buyer_id := auth.uid(); new.utr := upper(trim(new.utr));
  return new;
end $$;
drop trigger if exists apk_order_guard_trigger on public.apk_orders;
create trigger apk_order_guard_trigger before insert on public.apk_orders
  for each row execute function public.apk_order_guard();

drop policy if exists "apk orders read own or admin" on public.apk_orders;
create policy "apk orders read own or admin" on public.apk_orders for select to authenticated
  using (buyer_id = auth.uid() or public.is_market_admin());
drop policy if exists "apk orders insert own" on public.apk_orders;
create policy "apk orders insert own" on public.apk_orders for insert to authenticated
  with check (buyer_id = auth.uid());
drop policy if exists "apk orders admin update" on public.apk_orders;
create policy "apk orders admin update" on public.apk_orders for update to authenticated
  using (public.is_market_admin()) with check (public.is_market_admin());
revoke all on public.apk_orders from anon, public;
grant select, insert, update on public.apk_orders to authenticated;

-- Public catalogue: metadata only, never the file path.
create or replace function public.get_available_apks()
returns table (id uuid, title text, version text, description text, price numeric, file_size bigint, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select a.id, a.title, a.version, a.description, a.price, a.file_size, a.created_at
  from public.apk_products a where a.status = 'available' order by a.created_at desc;
$$;
revoke all on function public.get_available_apks() from public;
grant execute on function public.get_available_apks() to anon, authenticated;

create or replace function public.can_download_apk(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_market_admin() or exists (
    select 1 from public.apk_orders o join public.apk_products p on p.id = o.apk_id
    where o.buyer_id = auth.uid() and o.status = 'approved' and p.file_path = p_path);
$$;
revoke all on function public.can_download_apk(text) from public;
grant execute on function public.can_download_apk(text) to authenticated;

-- Private bucket (Supabase free plan allows max 50 MB per file; raise on a paid plan).
insert into storage.buckets (id, name, public, file_size_limit)
values ('apk-files', 'apk-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;
drop policy if exists "apk files admin upload" on storage.objects;
create policy "apk files admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'apk-files' and public.is_market_admin());
drop policy if exists "apk files admin delete" on storage.objects;
create policy "apk files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'apk-files' and public.is_market_admin());
drop policy if exists "apk files approved read" on storage.objects;
create policy "apk files approved read" on storage.objects for select to authenticated
  using (bucket_id = 'apk-files' and public.can_download_apk(name));


-- =====================================================================
-- PANEL STORE: MediaFire link delivery (replaces Storage upload)
-- Buyers never see the MediaFire URL in the database; the `panel-link`
-- Edge Function issues a 2-minute private link after admin approval.
-- =====================================================================
alter table public.apk_products alter column file_path drop not null;
alter table public.apk_products add column if not exists download_url text;
alter table public.apk_products drop constraint if exists apk_products_download_url_check;
alter table public.apk_products add constraint apk_products_download_url_check
  check (download_url is null or download_url ~* '^https://(www\.)?mediafire\.com/');
alter table public.apk_orders add column if not exists product_title text;

create or replace function public.apk_order_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare p numeric; t text;
begin
  select price, title into p, t from public.apk_products where id = new.apk_id and status = 'available';
  if p is null then raise exception 'This Panel is not available'; end if;
  new.price := p; new.product_title := t; new.status := 'pending_verification';
  new.buyer_id := auth.uid(); new.utr := upper(trim(new.utr));
  return new;
end $$;

create table if not exists public.apk_download_tokens (
  token text primary key,
  order_id uuid not null references public.apk_orders(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.apk_download_tokens enable row level security;
revoke all on public.apk_download_tokens from anon, authenticated, public;


-- =====================================================================
-- ADMIN LOCK: only ONE admin account can ever exist (the one you promote).
-- Nobody can create a second admin from the website, even by mistake.
-- Roles can only be changed from the Supabase SQL Editor (auth.uid() is null there).
-- =====================================================================
create unique index if not exists only_one_admin on public.profiles ((role)) where role = 'admin';

create or replace function public.block_admin_grant_from_app() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'admin' and auth.uid() is not null and (tg_op = 'INSERT' or old.role is distinct from 'admin') then
    raise exception 'Admin role can only be granted from the Supabase SQL Editor';
  end if;
  return new;
end $$;
drop trigger if exists block_admin_grant_trigger on public.profiles;
create trigger block_admin_grant_trigger before insert or update on public.profiles
  for each row execute function public.block_admin_grant_from_app();
