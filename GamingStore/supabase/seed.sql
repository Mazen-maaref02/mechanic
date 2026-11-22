-- ============================================================================
-- GamingStore — seed data (LOCAL DEVELOPMENT ONLY)
-- Runs automatically on `supabase db reset`.
-- NOTE: admin promotion here is for dev convenience; in production, admins
-- are promoted via trusted server-side SQL only.
-- ============================================================================

-- ── Categories ───────────────────────────────────────────────────────────────
insert into public.categories (name, slug, description, sort_order, is_active) values
  ('Gift Cards',            'gift-cards',  'Steam, PlayStation, Xbox and other wallet gift cards.', 1, true),
  ('Game Keys',             'game-keys',   'Activation keys for Steam, Epic Games and more.',      2, true),
  ('Top-Up Services',       'top-up',      'RedotPay, Binance and Rizon charging services.',        3, true)
on conflict (slug) do nothing;

-- ── Products ─────────────────────────────────────────────────────────────────
insert into public.products (category_id, name, slug, description, platform, region, delivery_type, status, is_featured) values
  ((select id from public.categories where slug='gift-cards'),
   'Steam Wallet Gift Card', 'steam-wallet-gift-card',
   'Steam Wallet gift cards to top up your Steam balance instantly. Perfect for buying games, DLC and in-game items.',
   'Steam', 'Global', 'automatic', 'active', true),

  ((select id from public.categories where slug='gift-cards'),
   'PlayStation Store Gift Card', 'playstation-store-gift-card',
   'PlayStation Store gift cards. Redeemable on the PS Store for games, add-ons and subscriptions.',
   'PlayStation', 'United States', 'automatic', 'active', true),

  ((select id from public.categories where slug='gift-cards'),
   'Xbox Gift Card', 'xbox-gift-card',
   'Xbox gift cards for the Microsoft Store. Games, Game Pass and more on Xbox consoles and PC.',
   'Xbox', 'United States', 'automatic', 'active', false),

  ((select id from public.categories where slug='game-keys'),
   'Red Dead Redemption 2 — Steam Key', 'red-dead-redemption-2-steam-key',
   'Red Dead Redemption 2 on Steam. Includes the full base game as an official digital activation key.',
   'Steam', 'Global', 'automatic', 'active', true),

  ((select id from public.categories where slug='game-keys'),
   'It Takes Two — Steam Key', 'it-takes-two-steam-key',
   'It Takes Two on Steam — the award-winning co-op adventure from Hazelight Studios.',
   'Steam', 'Global', 'automatic', 'active', false),

  ((select id from public.categories where slug='game-keys'),
   'Fortnite — V-Bucks Pack (Epic)', 'fortnite-v-bucks-pack-epic',
   'Fortnite V-Bucks delivered via Epic Games. Includes your chosen pack credited to your Epic account.',
   'Epic Games', 'Global', 'manual', 'active', false),

  ((select id from public.categories where slug='top-up'),
   'RedotPay Charging Service', 'redotpay-charging-service',
   'Top up your RedotPay account balance. Provide your RedotPay account ID and the amount to charge. Processing within business hours.',
   'RedotPay', 'Global', 'manual', 'active', true),

  ((select id from public.categories where slug='top-up'),
   'Rizon Charging Service', 'rizon-charging-service',
   'Top up your Rizon account balance. Provide your account ID and desired amount. Processing within business hours.',
   'Rizon', 'Global', 'manual', 'active', false),

  ((select id from public.categories where slug='top-up'),
   'Binance USDT Purchase Service', 'binance-usdt-purchase-service',
   'Purchase USDT credited to your Binance Spot wallet. Provide only your Binance Pay ID. Never share passwords, keys or seed phrases.',
   'Binance', 'Global', 'manual', 'active', true)
on conflict (slug) do nothing;

-- ── Variants ─────────────────────────────────────────────────────────────────
insert into public.product_variants (product_id, label, sku, price_tnd, price_usd, stock, is_active, sort_order) values
  ((select id from public.products where slug='steam-wallet-gift-card'),  '100 TND',  'SW-TND-100', 100000, 32300, null, true, 1),
  ((select id from public.products where slug='steam-wallet-gift-card'),  '200 TND',  'SW-TND-200', 200000, 64700, null, true, 2),
  ((select id from public.products where slug='steam-wallet-gift-card'),  '$10 USD',  'SW-USD-10',  32500,  1000,  null, true, 3),
  ((select id from public.products where slug='playstation-store-gift-card'), '$10 USD', 'PSN-USD-10', 33000, 1000, null, true, 1),
  ((select id from public.products where slug='playstation-store-gift-card'), '$25 USD', 'PSN-USD-25', 79000, 2500, null, true, 2),
  ((select id from public.products where slug='playstation-store-gift-card'), '$50 USD', 'PSN-USD-50', 156000, 5000, null, true, 3),
  ((select id from public.products where slug='xbox-gift-card'),          '$10 USD',  'XB-USD-10',  33000, 1000, null, true, 1),
  ((select id from public.products where slug='xbox-gift-card'),          '$25 USD',  'XB-USD-25',  80000, 2500, null, true, 2),
  ((select id from public.products where slug='red-dead-redemption-2-steam-key'), 'Standard Edition', 'RDR2-STEAM-STD', 149000, 48000, null, true, 1),
  ((select id from public.products where slug='it-takes-two-steam-key'),  'Standard Edition', 'ITT-STEAM-STD', 75000,  24000, null, true, 1),
  ((select id from public.products where slug='fortnite-v-bucks-pack-epic'), '1,000 V-Bucks',  'VB-1000',  35000, 11300, 100, true, 1),
  ((select id from public.products where slug='fortnite-v-bucks-pack-epic'), '2,800 V-Bucks',  'VB-2800',  90000, 29000, 100, true, 2),
  ((select id from public.products where slug='redotpay-charging-service'), 'RedotPay Charge', 'RP-CUSTOM', 0, 0, null, true, 1),
  ((select id from public.products where slug='rizon-charging-service'),  'Rizon Charge',  'RZ-CUSTOM', 0, 0, null, true, 1),
  ((select id from public.products where slug='binance-usdt-purchase-service'), 'Binance USDT', 'BN-CUSTOM', 0, 0, null, true, 1);

-- ── Exchange rate snapshot (admin-controlled starting point) ─────────────────
insert into public.exchange_rates (base, quote, rate)
values ('USD', 'TND', 3.100000)
on conflict (base, quote, effective_from) do nothing;

-- ── Store settings (payment instructions etc.) ───────────────────────────────
insert into public.store_settings (key, value) values
  ('payment_methods', $pm${
    "d17_edinar": { "enabled": true, "display_name": "D17 / e-Dinar", "receiver": "RIB: TN59 1000 6035 0001       e-Dinar: 1234 5678 9012 3456", "instructions": "Use the e-Dinar or D17 app to transfer the exact total, then submit the transfer reference below." },
    "flouci": { "enabled": true, "display_name": "Flouci", "receiver": "Flouci ID: 000000000 (placeholder)", "instructions": "Send the exact total via Flouci to our ID, then submit the transaction reference below." },
    "cash": { "enabled": true, "display_name": "Cash", "receiver": "Cash payment — contact us to arrange the handover", "instructions": "Pay in cash by hand or via a cash agent, then enter the receipt number as the reference below." },
    "wafacash": { "enabled": true, "display_name": "WafaCash", "receiver": "WafaCash: 000000000 (placeholder)", "instructions": "Send the exact total via WafaCash, then submit the transfer reference below." }
  }$pm$::jsonb),
  ('store_contact', '{"support_email": "support@gamingstore.example", "support_hours": "9:00-21:00 (GMT+1)"}'::jsonb),
  ('currency_policy', '{"available": ["TND","USD"], "exchange_note": "USD/TND rate is admin-controlled."}'::jsonb),
  ('topup_fee_notes', '{"percent_fees": {"redotpay": 4, "binance": 5, "rizon": 3, "other": 6}, "notes": "Fees are charged on top of the requested amount."}'::jsonb),
  ('service_limits', $sl${
    "redotpay": { "TND": { "min_amount": 30000, "max_amount": 1500000 }, "USD": { "min_amount": 1000, "max_amount": 500000 } },
    "binance":  { "TND": { "min_amount": 60000, "max_amount": 3000000 }, "USD": { "min_amount": 2000, "max_amount": 1000000 } },
    "rizon":    { "TND": { "min_amount": 20000, "max_amount": 1000000 }, "USD": { "min_amount": 700,  "max_amount": 350000 } },
    "other":    { "TND": { "min_amount": 20000, "max_amount": 1000000 }, "USD": { "min_amount": 700,  "max_amount": 350000 } }
  }$sl$::jsonb)
on conflict (key) do nothing;

-- ── Coupons ──────────────────────────────────────────────────────────────────
insert into public.coupons (code, type, value, currency, min_order_amount, is_active) values
  ('WELCOME10', 'percentage', 10, null, null, true),
  ('TND10OFF',  'fixed', 10000, 'TND', 50000, true)
on conflict (code) do nothing;

-- ── Local dev users (auth requires crypt() from pgcrypto) ────────────────────
-- Only version-stable auth.users columns are set explicitly. GoTrue scans the
-- token columns as NOT NULL strings even when unused, so they get ''.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000',
   '10000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated',
   'admin@gamingstore.dev', crypt('Admin123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dev Administrator"}',
   '', '', '', '',
   now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '10000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated',
   'customer@gamingstore.dev', crypt('Customer123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dev Customer"}',
   '', '', '', '',
   now(), now())
on conflict do nothing;

update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000001';
