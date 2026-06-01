-- =============================================================
-- Seed: pedidos de prueba para HOY (2026-05-11)
-- Cubre todos los estados del flujo para probar el sistema completo
-- Ejecutar desde Supabase SQL Editor o MCP
-- =============================================================

DO $$
DECLARE
  -- Productos por SKU
  p_limon_grande    uuid;
  p_limon_mini      uuid;
  p_lotus_grande    uuid;
  p_lotus_mediana   uuid;
  p_lotus_mini      uuid;
  p_milo_grande     uuid;
  p_milo_mediana    uuid;
  p_nutella_grande  uuid;
  p_nutella_mini    uuid;
  p_original_grande uuid;
  p_pistacho_grande uuid;
  p_vainilla_med    uuid;
  p_vainilla_mini   uuid;

  -- B2B cliente (Entrecote Interplaza)
  c_entrecote       uuid := '6e716534-4263-4ae5-a6b2-8f214aa6b373';

  hoy date := '2026-05-11';

  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid;
  o6 uuid; o7 uuid; o8 uuid; o9 uuid; o10 uuid;
BEGIN

-- Resolver IDs de productos por SKU
SELECT id INTO p_limon_grande    FROM products WHERE sku = 'PT19';
SELECT id INTO p_limon_mini      FROM products WHERE sku = 'PT21';
SELECT id INTO p_lotus_grande    FROM products WHERE sku = 'PT13';
SELECT id INTO p_lotus_mediana   FROM products WHERE sku = 'PT14';
SELECT id INTO p_lotus_mini      FROM products WHERE sku = 'PT15';
SELECT id INTO p_milo_grande     FROM products WHERE sku = 'PT16';
SELECT id INTO p_milo_mediana    FROM products WHERE sku = 'PT17';
SELECT id INTO p_nutella_grande  FROM products WHERE sku = 'PT7';
SELECT id INTO p_nutella_mini    FROM products WHERE sku = 'PT9';
SELECT id INTO p_original_grande FROM products WHERE sku = 'PT1';
SELECT id INTO p_pistacho_grande FROM products WHERE sku = 'PT4';
SELECT id INTO p_vainilla_med    FROM products WHERE sku = 'PT11';
SELECT id INTO p_vainilla_mini   FROM products WHERE sku = 'PT12';

-- ─── 1. PENDIENTE · WhatsApp · Domicilio ───────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type, delivery_address,
  customer_name, customer_phone, subtotal, delivery_fee, discount, total,
  payment_status, payment_method, notes)
VALUES ('whatsapp', 'pending', hoy, 'delivery', 'Calle 10 # 43-12, El Poblado',
  'Valentina Restrepo', '3204456789', 154000, 8000, 0, 162000,
  'pending', 'transfer', 'Sin flores por favor')
RETURNING id INTO o1;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (o1, p_limon_grande, 1, 154000, 154000);

-- ─── 2. PENDIENTE · Instagram · Pickup ─────────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type,
  customer_name, customer_phone, subtotal, delivery_fee, discount, total,
  payment_status, payment_method, packaging_notes)
VALUES ('instagram', 'pending', hoy, 'pickup',
  'Mariana Ospina', '3115567890', 110000, 0, 0, 110000,
  'pending', NULL, 'Llevar velita de cumpleaños')
RETURNING id INTO o2;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (o2, p_lotus_mini, 2, 55000, 110000);

-- ─── 3. CONFIRMADO · WhatsApp · Domicilio ──────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type, delivery_address,
  customer_name, customer_phone, subtotal, delivery_fee, discount, total,
  payment_status, payment_method)
VALUES ('whatsapp', 'confirmed', hoy, 'delivery', 'Carrera 37 # 8-50, Laureles',
  'Juliana Gómez', '3187734521', 313000, 8000, 0, 321000,
  'paid', 'transfer')
RETURNING id INTO o3;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
  (o3, p_milo_grande,  1, 160000, 160000),
  (o3, p_nutella_mini, 2, 55000,  110000),
  (o3, p_vainilla_mini,1, 55000,   55000);

-- ─── 4. CONFIRMADO · Rappi · Pickup ────────────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type,
  customer_name, customer_phone, subtotal, delivery_fee, discount, total,
  payment_status, payment_method)
VALUES ('rappi', 'confirmed', hoy, 'pickup',
  'Cliente Rappi #4821', NULL, 233000, 0, 0, 233000,
  'paid', 'rappi')
RETURNING id INTO o4;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (o4, p_pistacho_grande, 1, 233000, 233000);

-- ─── 5. EN PRODUCCIÓN · WhatsApp · Domicilio ───────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type, delivery_address,
  customer_name, customer_phone, subtotal, delivery_fee, discount, total,
  payment_status, payment_method)
VALUES ('whatsapp', 'in_production', hoy, 'delivery', 'Av. El Poblado # 16-28, apto 502',
  'Camila Herrera', '3209981234', 189000, 8000, 0, 197000,
  'pending', 'cash')
RETURNING id INTO o5;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (o5, p_lotus_grande, 1, 189000, 189000);

-- ─── 6. EN PRODUCCIÓN · B2B · Pickup ───────────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type,
  customer_id, customer_name, subtotal, delivery_fee, discount, total,
  payment_status, payment_method, notes)
VALUES ('b2b', 'in_production', hoy, 'pickup',
  c_entrecote, 'Entrecote by Cata Interplaza', 580000, 0, 58000, 522000,
  'credit', 'transfer', 'Pedido semanal — facturar a mes vencido')
RETURNING id INTO o6;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
  (o6, p_original_grande,  2, 150000, 300000),
  (o6, p_vainilla_med,     1, 119000, 119000),
  (o6, p_limon_mini,       3,  55000, 165000);

-- ─── 7. LISTO · WhatsApp · Pickup ──────────────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type,
  customer_name, customer_phone, subtotal, delivery_fee, discount, total,
  payment_status, payment_method)
VALUES ('whatsapp', 'ready', hoy, 'pickup',
  'Sebastián Duque', '3002219876', 290000, 0, 0, 290000,
  'paid', 'transfer')
RETURNING id INTO o7;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
  (o7, p_nutella_grande, 1, 176000, 176000),
  (o7, p_lotus_mini,     2,  55000, 110000);

-- ─── 8. LISTO · Instagram · Domicilio ──────────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type, delivery_address,
  customer_name, customer_phone, subtotal, delivery_fee, discount, total,
  payment_status, payment_method)
VALUES ('instagram', 'ready', hoy, 'delivery', 'Calle 33 # 70-15, Estadio',
  'Daniela Muñoz', '3118890012', 174000, 8000, 0, 182000,
  'paid', 'nequi')
RETURNING id INTO o8;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (o8, p_lotus_mediana, 1, 145000, 145000),
       (o8, p_limon_mini,    1,  55000,  55000);

-- ─── 9. EN CAMINO · WhatsApp · Domicilio ───────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type, delivery_address,
  customer_name, customer_phone, subtotal, delivery_fee, discount, total,
  payment_status, payment_method, assigned_driver)
VALUES ('whatsapp', 'dispatched', hoy, 'delivery', 'Calle 5 sur # 43A-10, Envigado',
  'Alejandro Cano', '3014478231', 160000, 8000, 0, 168000,
  'paid', 'transfer', 'John')
RETURNING id INTO o9;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (o9, p_milo_grande, 1, 160000, 160000);

-- ─── 10. ENTREGADO · walk-in ────────────────────────────────────────────────
INSERT INTO orders (channel, status, delivery_date, delivery_type,
  customer_name, subtotal, delivery_fee, discount, total,
  payment_status, payment_method, delivered_at)
VALUES ('walk_in', 'delivered', hoy, 'pickup',
  'Cliente mostrador', 115000, 0, 0, 115000,
  'paid', 'cash', now())
RETURNING id INTO o10;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (o10, p_milo_mediana, 1, 124000, 124000);

RAISE NOTICE 'Seed completado: 10 pedidos insertados para 2026-05-11';
RAISE NOTICE 'IDs: % % % % % % % % % %', o1, o2, o3, o4, o5, o6, o7, o8, o9, o10;
END $$;
