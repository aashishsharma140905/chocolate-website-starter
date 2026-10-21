-- Run once in Supabase SQL Editor after schema.sql.
-- Safe to re-run. Adds owner-customizable storefront settings, featured products,
-- product options, availability, and product photo galleries without deleting existing catalog data.

alter table public.products
  add column if not exists is_featured boolean not null default false;

alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_image_urls_array_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_image_urls_array_check
      check (jsonb_typeof(image_urls) = 'array');
  end if;
end;
$$;

create table if not exists public.store_settings (
  singleton boolean primary key default true check (singleton),
  brand_name text not null default 'Maheshwari Chocollates' check (char_length(brand_name) between 1 and 100),
  announcement text not null default 'Homemade chocolate · Made with love · Custom orders' check (char_length(announcement) <= 140),
  hero_title text not null default 'Small bites. Big happiness.' check (char_length(hero_title) <= 100),
  hero_description text not null default 'Homemade chocolates made with love for birthdays, anniversaries, return gifts and the moments worth celebrating.' check (char_length(hero_description) <= 300),
  story_text text not null default 'Celebrate birthdays and anniversaries, share return gifts, or ask about a custom order. Send us a message to discuss your occasion.' check (char_length(story_text) <= 600),
  instagram_url text check (instagram_url is null or char_length(instagram_url) <= 250),
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^[0-9]{10,15}$'),
  delivery_note text not null default 'Delivery charges and final availability are confirmed on WhatsApp.' check (char_length(delivery_note) <= 180),
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
revoke all on public.store_settings from anon, authenticated;
grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;

drop policy if exists "Public can read storefront settings" on public.store_settings;
create policy "Public can read storefront settings"
  on public.store_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Owner can insert storefront settings" on public.store_settings;
create policy "Owner can insert storefront settings"
  on public.store_settings for insert
  to authenticated
  with check (public.is_site_owner());

drop policy if exists "Owner can update storefront settings" on public.store_settings;
create policy "Owner can update storefront settings"
  on public.store_settings for update
  to authenticated
  using (public.is_site_owner())
  with check (public.is_site_owner());

alter table public.products
  add column if not exists stock_status text not null default 'available';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_stock_status_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_stock_status_check
      check (stock_status in ('available', 'seasonal', 'sold_out'));
  end if;
end;
$$;
