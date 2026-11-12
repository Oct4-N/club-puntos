CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  phone TEXT,
  birth_date TEXT,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  earn_points INTEGER NOT NULL CHECK (earn_points > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE rewards (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('product','discount')),
  cost_points INTEGER NOT NULL CHECK (cost_points > 0),
  product_id INTEGER REFERENCES products(id),
  discount_percent INTEGER CHECK (discount_percent IS NULL OR discount_percent BETWEEN 1 AND 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  CHECK (type <> 'product' OR (product_id IS NOT NULL AND discount_percent IS NULL)),
  CHECK (type <> 'discount' OR discount_percent IS NOT NULL)
);

CREATE TABLE movements (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id INTEGER REFERENCES products(id),
  reward_id INTEGER REFERENCES rewards(id),
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn','redeem_product','redeem_discount','void')),
  points INTEGER NOT NULL CHECK (points <> 0),
  discount_percent INTEGER CHECK (discount_percent IS NULL OR discount_percent BETWEEN 1 AND 100),
  voids_id INTEGER UNIQUE REFERENCES movements(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  CHECK ((type = 'void') = (voids_id IS NOT NULL))
);
CREATE INDEX idx_movements_customer ON movements(customer_id, created_at DESC);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

INSERT INTO products (name, earn_points, sort_order) VALUES
  ('Cucurucho', 5, 0),
  ('Barquillo', 5, 1),
  ('1/4 kg', 10, 2),
  ('1/2 kg', 20, 3),
  ('1 kg', 40, 4);

INSERT INTO rewards (name, type, cost_points, product_id, discount_percent, sort_order)
SELECT 'Cucurucho gratis', 'product', 50, id, NULL, 0 FROM products WHERE name = 'Cucurucho';
INSERT INTO rewards (name, type, cost_points, product_id, discount_percent, sort_order)
SELECT 'Barquillo gratis', 'product', 50, id, NULL, 1 FROM products WHERE name = 'Barquillo';
INSERT INTO rewards (name, type, cost_points, product_id, discount_percent, sort_order)
SELECT '50% en 1 kg', 'discount', 250, id, 50, 2 FROM products WHERE name = '1 kg';

INSERT INTO settings (key, value) VALUES
  ('backup_dir', ''),
  ('last_backup_at', ''),
  ('last_backup_error', '');
