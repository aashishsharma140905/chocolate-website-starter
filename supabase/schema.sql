-- Run this in Supabase SQL Editor.
-- 1) Creates products and a private owner-ID table.
-- 2) Public visitors can SELECT active products only.
-- 3) Only the single UUID configured in site_owner can write products.
-- 4) Create the Storage bucket separately (instructions in README).

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  description text check (description is null or char_length(description) <= 1000),
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  image_urls jsonb not null default '[]'::jsonb constraint products_image_urls_array_check check (jsonb_typeof(image_urls) = 'array'),
  category text check (category is null or char_length(category) <= 60),
  weight text check (weight is null or char_length(weight) <= 50),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_public_order_idx
  on public.products (is_active, sort_order, created_at desc);

-- This table must never be readable or writable by browser roles.
create table if not exists public.site_owner (
  singleton boolean primary key default true check (singleton),
  owner_id uuid not null
);

alter table public.site_owner enable row level security;
revoke all on public.site_owner from anon, authenticated;

create or replace function public.is_site_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.site_owner
    where owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_site_owner() from public;
grant execute on function public.is_site_owner() to authenticated;

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Anyone can read published products" on public.products;
create policy "Anyone can read published products"
  on public.products for select
  to anon, authenticated
  using (is_active = true or public.is_site_owner());

drop policy if exists "Owner can insert products" on public.products;
create policy "Owner can insert products"
  on public.products for insert
  to authenticated
  with check (public.is_site_owner());

drop policy if exists "Owner can update products" on public.products;
create policy "Owner can update products"
  on public.products for update
  to authenticated
  using (public.is_site_owner())
  with check (public.is_site_owner());

drop policy if exists "Owner can delete products" on public.products;
create policy "Owner can delete products"
  on public.products for delete
  to authenticated
  using (public.is_site_owner());

-- Storage policies for the public product-images bucket.
-- Create a PUBLIC bucket named product-images in Storage first.
-- Public image URLs are intentionally readable; only the owner can upload/update/delete.
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Owner can upload product images" on storage.objects;
create policy "Owner can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_site_owner());

drop policy if exists "Owner can update product images" on storage.objects;
create policy "Owner can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_site_owner())
  with check (bucket_id = 'product-images' and public.is_site_owner());

drop policy if exists "Owner can delete product images" on storage.objects;
create policy "Owner can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_site_owner());

-- IMPORTANT OWNER SETUP:
-- After creating the owner's account in Supabase Authentication, copy that user's UUID.
-- Then run this once, replacing the example UUID:
-- insert into public.site_owner (singleton, owner_id)
-- values (true, '00000000-0000-0000-0000-000000000000')
-- on conflict (singleton) do update set owner_id = excluded.owner_id;
--
-- Do NOT enable public sign-ups for this single-owner site.
