-- ============================================================================
-- GaragePro — DEMO / SEED DATA (clearly marked)
--
-- ONLY load this into a test / demo environment. NEVER load into production
-- with real customer data. All phone numbers, names and vehicles are fictional.
-- ============================================================================

-- Demo customers
insert into customers (full_name, phone, email, address, created_by) values
  ('Ahmed Ben Ali', '+21622112233', 'ahmed.benali@example.tn', '10 Rue de Carthage, Tunis 1005'),
  ('Fatima Trabelsi', '+21655443322', 'fatima.trabelsi@example.tn', '5 Avenue de la République, Sousse 4000'),
  ('Khaled Nasser', '+21698765432', NULL, '22 Habib Bourguiba, Sfax 3000'),
  ('Nour Zbidi', '+21625364758', 'nour.zbidi@example.tn', '8 Rue de Grèce, Tunis 1002'),
  ('Samir Gharbi', '+21653123456', 'samir.gharbi@example.tn', '15 Rue d''Alger, Bizerte 7000')
on conflict do nothing;

-- Get customer ids (demo) — in real usage the app resolves these via joins.
-- Demo vehicles
insert into vehicles (customer_id, brand, model, color, license_plate, model_year, mileage_km, fuel_type, vin)
select c.id, 'Renault', 'Clio', 'Blanc', '123 TUN 45', 2018, 86000, 'essence', 'VF1ABC12345678901'
from customers c where c.full_name = 'Ahmed Ben Ali'
on conflict do nothing;

insert into vehicles (customer_id, brand, model, color, license_plate, model_year, mileage_km, fuel_type, vin)
select c.id, 'Volkswagen', 'Golf', 'Noir', '444 ABC 78', 2020, 54000, 'diesel', 'WVWZZZ1KZ9W000002'
from customers c where c.full_name = 'Fatima Trabelsi'
on conflict do nothing;

insert into vehicles (customer_id, brand, model, color, license_plate, model_year, mileage_km, fuel_type, vin)
select c.id, 'Peugeot', '208', 'Rouge', '777 XYZ 12', 2019, 62000, 'essence', 'VF3ABC12345678903'
from customers c where c.full_name = 'Khaled Nasser'
on conflict do nothing;

insert into vehicles (customer_id, brand, model, color, license_plate, model_year, mileage_km, fuel_type, vin)
select c.id, 'Toyota', 'Yaris', 'Gris', '111 DEF 34', 2021, 31000, 'hybride', 'JTDBT92345678904'
from customers c where c.full_name = 'Nour Zbidi'
on conflict do nothing;

insert into vehicles (customer_id, brand, model, color, license_plate, model_year, mileage_km, fuel_type, vin)
select c.id, 'Dacia', 'Duster', 'Bleu', '555 GHI 67', 2017, 112000, 'diesel', 'VF0ABC12345678905'
from customers c where c.full_name = 'Samir Gharbi'
on conflict do nothing;

-- Demo spare parts
insert into spare_parts (name, reference, quantity, purchase_price, selling_price, min_stock) values
  ('Filtre à huile', 'FIL-HUI-001', 12, 4.500, 9.000, 5),
  ('Plaquettes de frein avant', 'PLA-FRE-010', 4, 28.000, 55.000, 3),
  ('Ampoule phare H7', 'AMP-H7-002', 20, 3.200, 7.500, 8),
  ('Batterie 60Ah', 'BAT-60-005', 2, 75.000, 135.000, 2),
  ('Courroie de distribution', 'COU-DIS-020', 1, 42.000, 89.000, 2),
  ('Filtre à air', 'FIL-AIR-003', 8, 6.000, 14.000, 5)
on conflict do nothing;

-- Note: repair_jobs, tasks, parts, payments, invoices are created through the
-- application UI. Seed data is intentionally limited to customers, vehicles and
-- inventory so the demo reflects a realistic starting garage state.
