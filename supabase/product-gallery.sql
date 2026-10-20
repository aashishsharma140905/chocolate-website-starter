-- Run once in Supabase SQL Editor to enable multiple product photos.
-- Safe to re-run; preserves the existing cover image and catalog.

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
