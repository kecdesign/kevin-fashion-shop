CREATE DATABASE IF NOT EXISTS kevin_fashion_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kevin_fashion_shop;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_rw VARCHAR(180) NOT NULL,
  name_en VARCHAR(180) NOT NULL,
  description_rw TEXT,
  description_en TEXT,
  category VARCHAR(80) NOT NULL,
  price_rwf INT NOT NULL,
  image_url TEXT,
  stock INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  district VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  payment_method ENUM('cash','momo') NOT NULL,
  payment_reference VARCHAR(120),
  total_rwf INT NOT NULL,
  status ENUM('received','confirmed','preparing','shipped','delivered','cancelled') NOT NULL DEFAULT 'received',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(180) NOT NULL,
  quantity INT NOT NULL,
  unit_price_rwf INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO products (name_rw,name_en,description_rw,description_en,category,price_rwf,image_url,stock) VALUES
('Ishati y’abagabo','Men’s shirt','Ishati nziza yo kwambara buri munsi.','Smart everyday men’s shirt.','Abagabo',18000,'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=900',20),
('Umwenda w’abagore','Women’s dress','Umwenda mwiza kandi ugezweho.','Elegant modern women’s dress.','Abagore',32000,'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900',12),
('Inkweto za siporo','Sneakers','Inkweto zoroshye kandi zikomeye.','Comfortable casual sneakers.','Inkweto',45000,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900',9),
('T-shirt','Classic T-shirt','T-shirt yoroshye yo kwambara buri munsi.','A comfortable everyday T-shirt.','Unisex',12000,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900',30);
