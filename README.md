# Maheshwari Chocollates Website

Static product storefront + single-owner admin panel. HTML/CSS/JavaScript + Supabase + Cloudflare Pages.

## Included
- `index.html`: public catalog and WhatsApp enquiry links
- `admin.html`: owner sign-in and product management
- `assets/styles.css`: responsive premium dark-chocolate/gold design
- `js/hero-3d.js`: Three.js hero scene and interactive 3D product-photo display
- `js/config.js`: brand name, Supabase config and WhatsApp number
- `js/store.js`: public catalog, filters, photo gallery, cart, and WhatsApp order summary
- Product quick view with up to five owner-managed photos, descriptions, and add-to-cart controls
- Persistent multi-item cart with quantity editing and one WhatsApp message for the full order
- Owner-editable store profile, homepage copy, delivery note, product options, featured products, and availability status
- Search, category, availability, and price filters with a one-tap clear option
- An order summary showing item count, order type, preferred date, note, and estimated item total before WhatsApp opens
- Three.js chocolate hero scene and interactive product photo display with static photo fallback
- `js/admin.js`: sign-in, CRUD, and product gallery upload/management
- `supabase/schema.sql`: product table, RLS policies, owner gate and storage policies
- `supabase/storefront-upgrades.sql`: safe migration for owner-editable settings, product options, availability, and galleries
- `supabase/product-gallery.sql`: safe gallery migration for an existing Supabase project

The storefront copy reflects the public Instagram profile: homemade chocolates made with love, birthday and anniversary gifts, return gifts, and custom orders. Instagram posts visibly feature items including Biscuit Coconut Rolls, Paan, chocolate drinks, and other chocolate treats. Add confirmed products, descriptions, photos, prices, weights, and categories through the owner panel; the website does not assume these items are currently available.

## 1. Create Supabase project
1. Create a project in Supabase.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Run `supabase/storefront-upgrades.sql` to add owner-editable store settings, featured products, product options, and availability status. This migration is safe for your existing catalog.
4. If you already ran an earlier version of the storefront upgrades, run `supabase/product-gallery.sql` once to add multi-photo galleries without changing current cover photos.
5. For a preview catalog, run `supabase/demo-products.sql`; it adds three clearly labeled demo listings with illustrative prices. The owner can edit or delete these in the admin panel. Confirm real prices and availability before accepting orders.
6. In Authentication settings, disable public sign-ups. Create the owner's user yourself.
7. In Authentication > Users, copy the owner's UUID.
8. In SQL Editor, run the owner registration query at the bottom of `schema.sql`, replacing the sample UUID. Only one owner row should exist.
9. In Storage, create a bucket named `product-images` and set it to **Public** because product photos must be viewable on the storefront. Do not make uploads public; the SQL policies restrict upload/update/delete to the owner.
10. Set the bucket's file size limit to 5 MB and allowed MIME types to `image/jpeg`, `image/png`, and `image/webp` if these controls are available.
11. In Project Settings > API, copy the project URL and publishable/anon key.

## 2. Configure the site
Edit `js/config.js`:
- `supabaseUrl`: your project URL
- `supabaseAnonKey`: publishable/anon key only
- `brandName`: Maheshwari Chocollates
- `whatsappNumber`: business WhatsApp country code + number, digits only (India starts with 91); ordering links stay disabled until a valid number is entered
- `storageBucket`: `product-images`

Never put a Supabase service-role/secret key in any frontend file or Git repository.

## 3. Test locally
Because browser modules and auth work best over HTTP, run a local static server from this directory:
- Python: `python -m http.server 8000`
- Open `http://localhost:8000`
You can use VS Code Live Server as an alternative.

## 4. Deploy to Cloudflare Pages
1. Put this project in a GitHub repository.
2. In Cloudflare dashboard, create a Pages project and connect that repository.
3. For a plain static site, use no build command and set the output directory to `/` (the repository root).
4. Deploy and open the generated `*.pages.dev` URL.
5. In Supabase Authentication URL Configuration, set the Site URL to your deployed URL and add the local and deployed URLs to Redirect URLs if required by your project settings.
6. Test product browsing and owner login on both desktop and mobile.

## 5. Security checklist before launch
- Verify an anonymous visitor can only read `is_active = true` products.
- Verify anonymous insert/update/delete requests fail.
- Verify a different authenticated account cannot manage products.
- Verify the configured owner can create/edit/hide/delete products.
- Ensure public sign-ups are disabled.
- Keep the Supabase secret/service-role key out of the browser and repository.
- Keep product uploads limited to image types and reasonable file sizes.
- Use strong unique owner password and enable MFA if practical.
- Do not commit real customer or account secrets.

## Notes / limitations in this starter
- Public product image bucket means anyone with an image URL can view those images; never upload private images there.
- Replacing a product image uploads a new object; this starter does not automatically remove the old object, so occasionally clean up unused images in Storage.
- The owner login is protected by database RLS, not by hiding the admin page.
- WhatsApp is manual order enquiry, not an order management system. The owner must confirm stock, delivery, and final price.
- Cart checkout opens WhatsApp with all selected products, variants, quantities, an optional occasion note, and an estimated item total. Orders are not saved in a website order database and payment is arranged separately with the owner.
- Existing Supabase projects should run `supabase/product-gallery.sql` before using the multi-photo editor. New projects can use the updated `schema.sql` and `storefront-upgrades.sql`.
- Run `supabase/storefront-upgrades.sql` once in Supabase SQL Editor to enable store settings, featured items, product options, availability status, and galleries. The migration preserves existing products.
- Free Supabase projects can pause after inactivity and have quotas. This is suitable for a low-cost prototype; review current plan terms for a business launch.







