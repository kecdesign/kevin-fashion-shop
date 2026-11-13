
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('./db');
const { auth, admin } = require('./middleware');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// HEALTH
app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'Kevin Fashion Shop API' });
});

// AUTH - REGISTER
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, phone, password } = req.body || {};

  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({
      message: 'Uzuza amazina, email na password (inyuguti 6 nibura).'
    });
  }

  const hash = await bcrypt.hash(password, 12);

  try {
    const [result] = await db.execute(
      `INSERT INTO users(name,email,phone,password_hash)
       VALUES(?,?,?,?)`,
      [name, email, phone || null, hash]
    );

    const user = {
      id: result.insertId,
      name,
      email,
      role: 'customer'
    };

    const token = jwt.sign(user, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Iyi email isanzwe ikoreshwa.'
      });
    }
    throw error;
  }
}));

// AUTH - LOGIN
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body || {};

  const [rows] = await db.execute(
    'SELECT * FROM users WHERE email=?',
    [email || '']
  );

  const userRow = rows[0];

  if (
    !userRow ||
    !await bcrypt.compare(password || '', userRow.password_hash)
  ) {
    return res.status(401).json({
      message: 'Email cyangwa password si byo.'
    });
  }

  const user = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role
  };

  const token = jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  res.json({ token, user });
}));

// PUBLIC PRODUCTS
app.get('/api/products', asyncRoute(async (req, res) => {
  const { q, category } = req.query;

  let sql = 'SELECT * FROM products WHERE active=1';
  const params = [];

  if (q) {
    sql += ' AND (name_rw LIKE ? OR name_en LIKE ? OR category LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (category) {
    sql += ' AND category=?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));

app.get('/api/products/:id', asyncRoute(async (req, res) => {
  const [rows] = await db.execute(
    'SELECT * FROM products WHERE id=? AND active=1',
    [req.params.id]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json(rows[0]);
}));


// CUSTOMER - CREATE ORDER
app.post('/api/orders', auth, asyncRoute(async (req, res) => {
  const {
    items,
    customer_name,
    phone,
    district,
    address,
    payment_method,
    payment_reference
  } = req.body || {};

  const allowedPayments = ['cash', 'momo', 'airtel'];

  if (
    !Array.isArray(items) ||
    !items.length ||
    !customer_name ||
    !phone ||
    !district ||
    !address ||
    !allowedPayments.includes(payment_method)
  ) {
    return res.status(400).json({
      message: 'Uzuza amakuru yose y’itegeko.'
    });
  }

  if (
    ['momo', 'airtel'].includes(payment_method) &&
    !String(payment_reference || '').trim()
  ) {
    return res.status(400).json({
      message: 'Andika Transaction ID ya Mobile Money.'
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let total = 0;
    const verifiedItems = [];

    for (const item of items) {
      const [rows] = await connection.execute(
        'SELECT * FROM products WHERE id=? AND active=1 FOR UPDATE',
        [item.product_id]
      );

      const product = rows[0];
      const quantity = Number(item.quantity);

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        product.stock < quantity
      ) {
        throw new Error(
          'Stock idahagije ku bicuruzwa wahisemo.'
        );
      }

      total += product.price_rwf * quantity;

      verifiedItems.push({ product, quantity });
    }

    const paymentStatus =
      payment_method === 'cash' ? 'not_required' : 'pending';

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
       (user_id,customer_name,phone,district,address,
        payment_method,payment_reference,payment_status,total_rwf)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [
        req.user.id,
        customer_name,
        phone,
        district,
        address,
        payment_method,
        payment_reference ? String(payment_reference).trim() : null,
        paymentStatus,
        total
      ]
    );

    for (const item of verifiedItems) {
      await connection.execute(
        `INSERT INTO order_items
         (order_id,product_id,product_name,quantity,unit_price_rwf)
         VALUES(?,?,?,?,?)`,
        [
          orderResult.insertId,
          item.product.id,
          item.product.name_en,
          item.quantity,
          item.product.price_rwf
        ]
      );

      await connection.execute(
        'UPDATE products SET stock=stock-? WHERE id=?',
        [item.quantity, item.product.id]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Itegeko ryakiriwe / Order received',
      order_id: orderResult.insertId,
      total_rwf: total,
      payment_status: paymentStatus
    });
  } catch (error) {
    await connection.rollback();

    res.status(400).json({
      message: error.message
    });
  } finally {
    connection.release();
  }
}));

// CUSTOMER - MY ORDERS
app.get('/api/orders/mine', auth, asyncRoute(async (req, res) => {
  const [orders] = await db.execute(
    'SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC',
    [req.user.id]
  );

  for (const order of orders) {
    const [items] = await db.execute(
      'SELECT * FROM order_items WHERE order_id=?',
      [order.id]
    );

    order.items = items;
  }

  res.json(orders);
}));

// ADMIN - DASHBOARD STATISTICS
app.get('/api/admin/stats', auth, admin, asyncRoute(async (req, res) => {
  const [[productStats]] = await db.execute(`
    SELECT
      COUNT(*) AS total_products,
      COALESCE(SUM(stock),0) AS total_stock,
      SUM(CASE WHEN stock=0 THEN 1 ELSE 0 END) AS out_of_stock
    FROM products
    WHERE active=1
  `);

  const [[customerStats]] = await db.execute(`
    SELECT COUNT(*) AS total_customers
    FROM users
    WHERE role='customer'
  `);

  const [[orderStats]] = await db.execute(`
    SELECT
      COUNT(*) AS total_orders,
      SUM(CASE WHEN status='received' THEN 1 ELSE 0 END) AS pending_orders,
     COALESCE(
  SUM(
    CASE
      WHEN payment_status='paid' THEN total_rwf
      WHEN payment_method='cash' AND status='delivered' THEN total_rwf
      ELSE 0
    END
  ),
  0
) AS total_sales
    FROM orders
  `);

  res.json({
    products: Number(productStats.total_products || 0),
    stock: Number(productStats.total_stock || 0),
    out_of_stock: Number(productStats.out_of_stock || 0),
    customers: Number(customerStats.total_customers || 0),
    orders: Number(orderStats.total_orders || 0),
    pending_orders: Number(orderStats.pending_orders || 0),
    sales: Number(orderStats.total_sales || 0)
  });
}));

// ADMIN - ALL PRODUCTS, INCLUDING HIDDEN
app.get('/api/admin/products', auth, admin, asyncRoute(async (req, res) => {
  const [rows] = await db.execute(
    'SELECT * FROM products ORDER BY created_at DESC'
  );

  res.json(rows);
}));

// ADMIN - ALL CUSTOMERS
app.get('/api/admin/customers', auth, admin, asyncRoute(async (req, res) => {
  const [rows] = await db.execute(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.phone,
      u.created_at,
      COUNT(o.id) AS total_orders,
      COALESCE(SUM(
        CASE WHEN o.status!='cancelled' THEN o.total_rwf ELSE 0 END
      ),0) AS total_spent
    FROM users u
    LEFT JOIN orders o ON o.user_id=u.id
    WHERE u.role='customer'
    GROUP BY u.id,u.name,u.email,u.phone,u.created_at
    ORDER BY u.created_at DESC
  `);

  res.json(rows);
}));

// ADMIN - ALL ORDERS
app.get('/api/admin/orders', auth, admin, asyncRoute(async (req, res) => {
  const [orders] = await db.execute(
    'SELECT * FROM orders ORDER BY created_at DESC'
  );

  for (const order of orders) {
    const [items] = await db.execute(
      'SELECT * FROM order_items WHERE order_id=?',
      [order.id]
    );

    order.items = items;
  }

  res.json(orders);
}));

// ADMIN - UPDATE ORDER STATUS
app.patch('/api/admin/orders/:id', auth, admin, asyncRoute(async (req, res) => {
  const allowedStatuses = [
    'received',
    'confirmed',
    'preparing',
    'shipped',
    'delivered',
    'cancelled'
  ];

  const { status } = req.body || {};

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Invalid order status'
    });
  }

  const [result] = await db.execute(
    'UPDATE orders SET status=? WHERE id=?',
    [status, req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: 'Order not found'
    });
  }

  res.json({ ok: true });
}));


// ADMIN - CONFIRM OR REJECT PAYMENT
app.patch('/api/admin/orders/:id/payment', auth, admin, asyncRoute(async (req, res) => {
  const { payment_status } = req.body || {};

  if (!['paid', 'rejected'].includes(payment_status)) {
    return res.status(400).json({
      message: 'Payment status must be paid or rejected.'
    });
  }

  const [orders] = await db.execute(
    'SELECT id, payment_method, payment_status FROM orders WHERE id=?',
    [req.params.id]
  );

  const order = orders[0];

  if (!order) {
    return res.status(404).json({
      message: 'Order not found.'
    });
  }

  if (!['momo', 'airtel'].includes(order.payment_method)) {
    return res.status(400).json({
      message: 'This order does not use Mobile Money.'
    });
  }

  if (order.payment_status !== 'pending') {
    return res.status(400).json({
      message: 'This payment has already been reviewed.'
    });
  }

  await db.execute(
    'UPDATE orders SET payment_status=? WHERE id=?',
    [payment_status, req.params.id]
  );

  res.json({
    ok: true,
    payment_status
  });
}));


// ADMIN - ADD PRODUCT
app.post('/api/admin/products', auth, admin, asyncRoute(async (req, res) => {
  const p = req.body || {};

  if (
    !p.name_rw ||
    !p.name_en ||
    !p.category ||
    !Number.isFinite(Number(p.price_rwf)) ||
    Number(p.price_rwf) < 1 ||
    !Number.isInteger(Number(p.stock)) ||
    Number(p.stock) < 0
  ) {
    return res.status(400).json({
      message: 'Reba amazina, category, price na stock.'
    });
  }

  const [result] = await db.execute(
    `INSERT INTO products
     (name_rw,name_en,description_rw,description_en,
      category,price_rwf,image_url,stock)
     VALUES(?,?,?,?,?,?,?,?)`,
    [
      p.name_rw,
      p.name_en,
      p.description_rw || '',
      p.description_en || '',
      p.category,
      Number(p.price_rwf),
      p.image_url || '',
      Number(p.stock)
    ]
  );

  res.status(201).json({
    id: result.insertId,
    message: 'Product added successfully'
  });
}));

// ADMIN - EDIT PRODUCT
app.put('/api/admin/products/:id', auth, admin, asyncRoute(async (req, res) => {
  const p = req.body || {};

  if (
    !p.name_rw ||
    !p.name_en ||
    !p.category ||
    !Number.isFinite(Number(p.price_rwf)) ||
    Number(p.price_rwf) < 1 ||
    !Number.isInteger(Number(p.stock)) ||
    Number(p.stock) < 0
  ) {
    return res.status(400).json({
      message: 'Reba amakuru y’igicuruzwa.'
    });
  }

  const [result] = await db.execute(
    `UPDATE products SET
      name_rw=?,
      name_en=?,
      description_rw=?,
      description_en=?,
      category=?,
      price_rwf=?,
      image_url=?,
      stock=?,
      active=?
     WHERE id=?`,
    [
      p.name_rw,
      p.name_en,
      p.description_rw || '',
      p.description_en || '',
      p.category,
      Number(p.price_rwf),
      p.image_url || '',
      Number(p.stock),
      p.active === false || Number(p.active) === 0 ? 0 : 1,
      req.params.id
    ]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  res.json({ ok: true });
}));

// ADMIN - HIDE PRODUCT
app.delete('/api/admin/products/:id', auth, admin, asyncRoute(async (req, res) => {
  const [result] = await db.execute(
    'UPDATE products SET active=0 WHERE id=?',
    [req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  res.json({ ok: true });
}));

// ERROR HANDLER
app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    message: 'Server error. Reba backend terminal.'
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(
    `Kevin Fashion Shop API running on http://localhost:${port}`
  );
});
