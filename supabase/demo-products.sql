-- Demo catalog for Maheshwari Chocollate House.
-- Run in Supabase SQL Editor after supabase/schema.sql has been applied.
-- Product names are based on items visibly featured on the public Instagram profile.
-- Prices below are illustrative demo values, not prices stated by the business.
-- Each description labels the listing as a demo. Replace price/details or delete
-- these rows from the owner dashboard before accepting real orders.

insert into public.products (name, description, price, category, weight, is_active, sort_order)
select d.name, d.description, d.price, d.category, null, true, d.sort_order
from (values
  ('Biscuit Coconut Rolls', 'DEMO LISTING — sample price only. Confirm availability, details and price with the owner before ordering.', 250.00::numeric, 'Chocolate treats', 10),
  ('Premium Paan', 'DEMO LISTING — sample price only. Confirm ingredients, availability and price with the owner before ordering.', 220.00::numeric, 'Chocolate treats', 20),
  ('Chocolate & Cold Coco', 'DEMO LISTING — sample price only. Confirm product options, availability and price with the owner before ordering.', 180.00::numeric, 'Chocolate drinks', 30)
) as d(name, description, price, category, sort_order)
where not exists (
  select 1 from public.products p where lower(p.name) = lower(d.name)
);
