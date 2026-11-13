
import React, { useEffect, useState } from 'react';
import './App.css';

const API = 'http://localhost:5000/api';
const USD_RATE = 1450;

const SHOP = {
  owner: 'Kevin',
  email: 'tuyizerekevin03@gmail.com',
  phone: '+250 791 303 205',
  momo: '+250 795 886 136',
  airtel: '+250 723 884 687',
  location: 'Kigali, Rwanda'
};

const money = (n) =>
  new Intl.NumberFormat('en-US').format(Number(n || 0)) + ' RWF';

const moneyUSD = (n) =>
  '$' + (Number(n || 0) / USD_RATE).toFixed(2);

const heroSlides = [
  {
    image: '/images/Modern Fashion Brand Social Media Design _ Clothing Advertisement Creative.jfif',
    eyebrow: 'NEW COLLECTION • 2026',
    title: 'Dress Your Style.',
    second: 'Define Your Look.',
    description: 'Discover modern fashion for every style.'
  },
  {
    image: '/images/Артикул куртки ВБ_ 460568493.jfif',
    eyebrow: 'LATEST TRENDS',
    title: 'Look Different.',
    second: 'Feel Confident.',
    description: 'Find your perfect look at Kevin Fashion Shop.'
  },
  {
    image: '/images/download (1).jfif',
    eyebrow: 'FASHION FOR EVERYONE',
    title: 'Your Style.',
    second: 'Your Identity.',
    description: 'Quality fashion at affordable prices.'
  },
  {
    image: '/images/Custom Hoodie Manufacturer.jfif',
    eyebrow: 'EXPRESS YOURSELF',
    title: 'Wear Confidence.',
    second: 'Every Day.',
    description: 'Explore our latest fashion collection.'
  }
];

const categories = [
  {
    kinyarwanda: 'Abagabo',
    english: 'Men',
    image: '/images/download (2).jfif'
  },
  {
    kinyarwanda: 'Abagore',
    english: 'Women',
    image: '/images/download (3).jfif'
  },
  {
    kinyarwanda: 'Inkweto',
    english: 'Shoes',
    image: '/images/download (4).jfif'
  },
  {
    kinyarwanda: 'Unisex',
    english: 'Unisex',
    image: '/images/download.jfif'
  }
];

const emptyProduct = {
  name_rw: '',
  name_en: '',
  category: '',
  price_rwf: '',
  stock: '',
  image_url: '',
  description_rw: '',
  description_en: ''
};

const orderStatuses = [
  'received',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled'
];

export default function App() {
  const [lang, setLang] = useState('rw');
  const [products, setProducts] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [adminStats, setAdminStats] = useState({});
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState([]);

  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('kfs_user') || 'null')
  );

  const [token, setToken] = useState(
    localStorage.getItem('kfs_token') || ''
  );

  const [modal, setModal] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [orders, setOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [form, setForm] = useState({});
  const [page, setPage] = useState('shop');
  const [adminTab, setAdminTab] = useState('overview');
  const [editingProduct, setEditingProduct] = useState(null);
  const [slide, setSlide] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const tr = (rw, en) => lang === 'rw' ? rw : en;

  const headers = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {})
  });

  const title = (p) =>
    lang === 'rw'
      ? (p.name_rw || p.name_en)
      : (p.name_en || p.name_rw);

  const desc = (p) =>
    lang === 'rw'
      ? (p.description_rw || p.description_en || '')
      : (p.description_en || p.description_rw || '');

  const count = cart.reduce((a, x) => a + x.quantity, 0);

  const total = cart.reduce(
    (a, x) => a + Number(x.price_rwf) * x.quantity,
    0
  );

  const filtered = products.filter((p) =>
    (cat === 'All' || p.category === cat) &&
    `${p.name_rw || ''} ${p.name_en || ''} ${p.category || ''}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  const update = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function request(path, options = {}) {
    const r = await fetch(API + path, {
      ...options,
      headers: {
        ...headers(),
        ...(options.headers || {})
      }
    });

    const d = await r.json().catch(() => ({}));

    if (!r.ok) {
      throw Error(d.message || 'Request failed');
    }

    return d;
  }

  async function load() {
    try {
      const d = await request('/products');
      setProducts(Array.isArray(d) ? d : d.products || []);
    } catch (e) {
      setMsg('Backend ntiyabonetse. Tangiza server ya backend.');
    }
  }

  async function loadAdmin() {
    if (!token || user?.role !== 'admin') return;

    try {
      const [statsData, productData, customerData, orderData] =
        await Promise.all([
          request('/admin/stats'),
          request('/admin/products'),
          request('/admin/customers'),
          request('/admin/orders')
        ]);

      setAdminStats(statsData.stats || statsData);
      setAdminProducts(
        Array.isArray(productData)
          ? productData
          : productData.products || []
      );
      setCustomers(
        Array.isArray(customerData)
          ? customerData
          : customerData.customers || []
      );
      setAdminOrders(
        Array.isArray(orderData)
          ? orderData
          : orderData.orders || []
      );
    } catch (e) {
      setMsg(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (page === 'admin' && user?.role === 'admin') {
      loadAdmin();
    }
  }, [page, adminTab, token, user]);

  async function submitAuth(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');

    try {
      const d = await request('/auth/' + modal, {
        method: 'POST',
        body: JSON.stringify(form)
      });

      setToken(d.token);
      setUser(d.user);

      localStorage.setItem('kfs_token', d.token);
      localStorage.setItem('kfs_user', JSON.stringify(d.user));

      setModal('');
      setForm({});
      setMsg(tr('Winjiye neza!', 'Login successful!'));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  function add(p) {
    if (Number(p.stock) <= 0) {
      setMsg(tr(
        'Iki gicuruzwa ntikiboneka.',
        'Product is out of stock.'
      ));
      return;
    }

    setCart((c) => {
      const existing = c.find((i) => i.id === p.id);

      if (existing) {
        if (existing.quantity >= Number(p.stock)) return c;

        return c.map((i) =>
          i.id === p.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [...c, { ...p, quantity: 1 }];
    });

    setMsg(tr(
      'Igicuruzwa cyongewe mu gatebo.',
      'Added to cart.'
    ));
  }

  async function checkout(e) {
    e.preventDefault();

    if (!user) {
      setModal('login');
      return;
    }

    setBusy(true);

    try {
      const d = await request('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          items: cart.map((i) => ({
            product_id: i.id,
            quantity: i.quantity
          }))
        })
      });

      setMsg(
        `${d.message}. #${d.order_id} — ${money(d.total_rwf)}`
      );

      setCart([]);
      setModal('');
      setForm({});
      setPage('orders');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function getOrders() {
    try {
      const isAdmin = user?.role === 'admin';

      const d = await request(
        isAdmin ? '/admin/orders' : '/orders/mine'
      );

      if (isAdmin) {
        setAdminOrders(
          Array.isArray(d) ? d : d.orders || []
        );
      } else {
        setOrders(
          Array.isArray(d) ? d : d.orders || []
        );
      }
    } catch (e) {
      setMsg(e.message);
    }
  }

  useEffect(() => {
    if (token && page === 'orders') {
      getOrders();
    }
  }, [token, page]);

  async function changeStatus(id, status) {
    try {
      await request('/admin/orders/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      setMsg('Order status updated.');
      getOrders();
    } catch (e) {
      setMsg(e.message);
    }
  }


async function changePayment(id, payment_status) {
  try {
    await request('/admin/orders/' + id + '/payment', {
      method: 'PATCH',
      body: JSON.stringify({ payment_status })
    });

    setMsg(
      payment_status === 'paid'
        ? 'Payment confirmed successfully.'
        : 'Payment rejected.'
    );

    getOrders();
  } catch (e) {
    setMsg(e.message);
  }
}


  function logout() {
    localStorage.removeItem('kfs_token');
    localStorage.removeItem('kfs_user');

    setToken('');
    setUser(null);
    setPage('shop');
    setAdminOrders([]);
    setAdminProducts([]);
    setCustomers([]);
    setAdminStats({});

    setMsg(tr(
      'Wasohotse neza.',
      'Logged out successfully.'
    ));
  }

  function goTo(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth'
    });
  }

  function chooseCategory(category) {
    const matching = products.find(
      (p) =>
        p.category?.toLowerCase() ===
          category.kinyarwanda.toLowerCase() ||
        p.category?.toLowerCase() ===
          category.english.toLowerCase()
    );

    setCat(matching ? matching.category : 'All');
    setPage('shop');

    setTimeout(() => goTo('collection'), 100);
  }

  function subscribe(e) {
    e.preventDefault();

    if (!newsletterEmail.trim()) return;

    setMsg(tr(
      'Murakoze! Email yanyu yakiriwe kuri newsletter.',
      'Thank you! Your email has been received.'
    ));

    setNewsletterEmail('');
  }

  function openAdmin(tab = 'overview') {
    if (user?.role !== 'admin') {
      setMsg('Admin access only.');
      return;
    }

    setAdminTab(tab);
    setPage('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEditProduct(p) {
    setEditingProduct(p.id);
    setForm({
      name_rw: p.name_rw || '',
      name_en: p.name_en || '',
      category: p.category || '',
      price_rwf: p.price_rwf ?? '',
      stock: p.stock ?? '',
      image_url: p.image_url || '',
      description_rw: p.description_rw || '',
      description_en: p.description_en || ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveProduct(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const isEditing = Boolean(editingProduct);

      await request(
        isEditing
          ? '/admin/products/' + editingProduct
          : '/admin/products',
        {
          method: isEditing ? 'PATCH' : 'POST',
          body: JSON.stringify({
            ...form,
            price_rwf: Number(form.price_rwf),
            stock: Number(form.stock)
          })
        }
      );

      setMsg(
        isEditing
          ? 'Product updated successfully.'
          : 'Product added successfully.'
      );

      setForm({});
      setEditingProduct(null);

      await load();
      await loadAdmin();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function hideProduct(id) {
    if (!window.confirm('Hide this product from the shop?')) return;

    try {
      await request('/admin/products/' + id, {
        method: 'DELETE'
      });

      setMsg('Product hidden successfully.');
      await load();
      await loadAdmin();
    } catch (e) {
      setMsg(e.message);
    }
  }

  const currentOrders = user?.role === 'admin'
    ? adminOrders
    : orders;

  const statValue = (key, fallback = 0) =>
    adminStats[key] ?? fallback;

  return (
    <div className="app">

      {/* ANNOUNCEMENT BAR */}
      <div className="announcement">
        <span>✦ {tr(
          'Kugemura mu Rwanda hose',
          'Free delivery across Rwanda'
        )}</span>
        <span>↺ {tr('Serivisi yizewe', 'Easy customer support')}</span>
        <span>♧ {tr('Gura mu mutekano', 'Secure checkout')}</span>
      </div>

      {/* HEADER */}
      <header className="main-header">
        <a
          className="brand"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setPage('shop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="brandmark">KF</span>
          <span className="brand-name">
            KEVIN <b>FASHION</b>
            <small>SHOP • RWANDA</small>
          </span>
        </a>

        <nav className="main-nav">
          <button
            className={page === 'shop' ? 'active' : ''}
            onClick={() => {
              setPage('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {tr('Ahabanza', 'Home')}
          </button>

          <button onClick={() => {
            setPage('shop');
            setTimeout(() => goTo('collection'), 100);
          }}>
            {tr('Imyenda', 'Shop')}
          </button>

          <button onClick={() => {
            setPage('shop');
            setTimeout(() => goTo('categories'), 100);
          }}>
            {tr('Ibyiciro', 'Categories')}
          </button>

          {user && (
            <button onClick={() => setPage('orders')}>
              {tr('Amategeko yanjye', 'My Orders')}
            </button>
          )}

          {user?.role === 'admin' && (
            <button onClick={() => openAdmin()}>
              Admin Dashboard
            </button>
          )}
        </nav>

        <div className="header-actions">
          <button
            className="lang"
            onClick={() => setLang(lang === 'rw' ? 'en' : 'rw')}
          >
            {lang === 'rw' ? 'EN' : 'RW'}⌄
          </button>

          <button className="cartbtn" onClick={() => setModal('cart')}>
            <span>Bag</span>
            <span className="cart-count">{count}</span>
          </button>

          {user ? (
            <button className="loginbtn" onClick={logout}>
              {user.name?.split(' ')[0] || 'Account'} · {tr('Sohoka', 'Logout')}
            </button>
          ) : (
            <button
              className="loginbtn"
              onClick={() => {
                setForm({});
                setModal('login');
              }}
            >
              {tr('Injira', 'Login')}
            </button>
          )}
        </div>
      </header>

      {msg && (
        <div className="notice" onClick={() => setMsg('')}>
          {msg} <b>×</b>
        </div>
      )}

      {/* SHOP PAGE */}
      {page === 'shop' && (
        <>
          <section id="home" className="hero-section">
            <div className="hero-slide" key={slide}>
              <div className="hero-content">
                <span className="eyebrow">
                  {heroSlides[slide].eyebrow}
                </span>

                <h1>
                  {heroSlides[slide].title}
                  <br />
                  <em>{heroSlides[slide].second}</em>
                </h1>

                <p>
                  {tr(
                    'Hitamo imyenda igezweho, inoze kandi iguhesha icyizere. Tugemura mu Rwanda.',
                    heroSlides[slide].description
                  )}
                </p>

                <button
                  className="primary-btn"
                  onClick={() => goTo('collection')}
                >
                  {tr('REBA IMYENDA', 'SHOP COLLECTION')}
                  <span>↗</span>
                </button>

                <div className="hero-stats">
                  <span><b>100%</b> {tr('Ubwiza', 'Quality')}</span>
                  <span><b>RW</b> {tr('Isoko ry’u Rwanda', 'Rwanda based')}</span>
                </div>
              </div>

              <div className="hero-image-wrap">
                <img
                  src={heroSlides[slide].image}
                  alt="Kevin Fashion Shop collection"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200';
                  }}
                />

                <div className="hero-image-label">
                  <small>THE NEW</small>
                  <b>LOOK</b>
                  <span>Find your style.</span>
                </div>
              </div>
            </div>

            <div className="slider-bottom">
              <div className="hero-controls">
                <button onClick={() =>
                  setSlide((slide - 1 + heroSlides.length) % heroSlides.length)
                }>‹</button>

                <span>0{slide + 1} / 0{heroSlides.length}</span>

                <button onClick={() =>
                  setSlide((slide + 1) % heroSlides.length)
                }>›</button>
              </div>

              <div className="hero-dots">
                {heroSlides.map((s, i) => (
                  <button
                    key={s.image}
                    className={slide === i ? 'active' : ''}
                    onClick={() => setSlide(i)}
                    aria-label={`Show slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="benefits">
            <div className="benefit">
              <span className="benefit-icon">✦</span>
              <div>
                <b>{tr('Ubwiza bwizewe', 'Quality Products')}</b>
                <small>{tr('Imyenda yatoranyijwe neza', 'Carefully selected fashion')}</small>
              </div>
            </div>

            <div className="benefit">
              <span className="benefit-icon">↗</span>
              <div>
                <b>{tr('Kugemura', 'Fast Delivery')}</b>
                <small>{tr('Kigali n’ahandi mu Rwanda', 'Kigali and nationwide')}</small>
              </div>
            </div>

            <div className="benefit">
              <span className="benefit-icon">♡</span>
              <div>
                <b>{tr('Ubufasha', 'Customer Support')}</b>
                <small>{tr('Turahari ngo tugufashe', 'We are here to help')}</small>
              </div>
            </div>

            <div className="benefit">
              <span className="benefit-icon">⌑</span>
              <div>
                <b>{tr('Kugura mu mutekano', 'Secure Checkout')}</b>
                <small>{tr('Amakuru yawe ararinzwe', 'Your information matters')}</small>
              </div>
            </div>
          </section>

          <section id="categories" className="categories-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">FIND YOUR STYLE</span>
                <h2>{tr('Gura ukurikije icyiciro', 'Shop by Category')}<em>.</em></h2>
                <p>{tr('Hitamo icyiciro ukunda.', 'Explore fashion for every style.')}</p>
              </div>
              <span className="section-number">01 / 04</span>
            </div>

            <div className="category-grid">
              {categories.map((c) => (
                <button
                  className="category-card"
                  key={c.english}
                  onClick={() => chooseCategory(c)}
                >
                  <img
                    src={c.image}
                    alt={c.english}
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700';
                    }}
                  />

                  <span className="category-caption">
                    <span>
                      <small>EXPLORE</small>
                      <b>{tr(c.kinyarwanda, c.english)}</b>
                    </span>
                    <i>↗</i>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section id="collection" className="collection-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">CURATED FOR YOU</span>
                <h2>{tr('Icyegeranyo cyacu', 'Featured Products')}<em>.</em></h2>
                <p>{tr('Reba imyenda n’ibikoresho bihari.', 'Discover our latest fashion collection.')}</p>
              </div>
              <span className="product-count">
                {filtered.length} {tr('ibicuruzwa', 'products')}
              </span>
            </div>

            <div className="filters">
              <input
                placeholder={tr('Shakisha imyenda...', 'Search products...')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <div className="filter-buttons">
                {[
                  'All',
                  ...new Set(products.map((p) => p.category).filter(Boolean))
                ].map((c) => (
                  <button
                    className={cat === c ? 'selected' : ''}
                    onClick={() => setCat(c)}
                    key={c}
                  >
                    {c === 'All' ? tr('Byose', 'All') : c}
                  </button>
                ))}
              </div>
            </div>

            <div className="products-grid">
              {filtered.map((p) => (
                <article className="product-card" key={p.id}>
                  <div className="product-image">
                    <img
                      src={p.image_url || '/images/download.jfif'}
                      alt={title(p)}
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800';
                      }}
                    />

                    <span className="product-category">{p.category}</span>

                    <button
                      className="quick-add"
                      disabled={Number(p.stock) <= 0}
                      onClick={() => add(p)}
                      aria-label="Add to cart"
                    >+</button>
                  </div>

                  <div className="product-details">
                    <div className="product-name-row">
                      <h3>{title(p)}</h3>
                      {p.rating != null && (
                        <span className="rating">★ {Number(p.rating).toFixed(1)}</span>
                      )}
                    </div>

                    <p>{desc(p)}</p>

                    <div className="product-price">
                      <b>{money(p.price_rwf)}</b>
                      <span>{moneyUSD(p.price_rwf)}</span>
                    </div>

                    <div className="stock-status">
                      {Number(p.stock) > 0
                        ? tr('Birahari', 'In stock')
                        : tr('Byarangiye', 'Out of stock')}
                    </div>

                    <button
                      className="add-cart"
                      disabled={Number(p.stock) <= 0}
                      onClick={() => add(p)}
                    >
                      {tr('ONGERA MU GATEBO', 'ADD TO CART')} +
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {!filtered.length && (
              <p className="empty">{tr('Nta bicuruzwa bihari.', 'No products found.')}</p>
            )}
          </section>

          <section className="newsletter-section">
            <div>
              <span className="eyebrow">STAY IN STYLE</span>
              <h2>{tr('Menya amakuru mashya y’imideli.', 'Get the latest fashion updates.')}</h2>
              <p>{tr(
                'Iyandikishe kugira ngo ujye umenya imyenda mishya n’amakuru y’iduka.',
                'Subscribe for updates about new arrivals and shop news.'
              )}</p>
            </div>

            <form className="newsletter-form" onSubmit={subscribe}>
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button type="submit">{tr('IYANDIKISHE', 'SUBSCRIBE')} ↗</button>
            </form>
          </section>
        </>
      )}

      {/* CUSTOMER AND ADMIN ORDERS */}
      {page === 'orders' && (
        <section className="panel">
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h2>{tr('Amategeko yanjye', 'My Orders')}</h2>

          {currentOrders.map((o) => (
            <div className="orderrow" key={o.id}>
              <b>#{o.id}</b>
              <span>{money(o.total_rwf)}</span>
              <span>{o.status}</span>
              <span>{o.created_at?.slice(0, 10)}</span>
              {user?.role === 'admin' &&
  ['momo', 'airtel'].includes(o.payment_method) &&
  o.payment_status === 'pending' && (
    <div className="payment-actions">
      <button
        className="primary-btn"
        onClick={() => changePayment(o.id, 'paid')}
      >
        Confirm Payment
      </button>

      <button
        className="secondary-btn"
        onClick={() => changePayment(o.id, 'rejected')}
      >
        Reject Payment
      </button>
    </div>
  )}

              {user?.role === 'admin' && (
                <select
                  value={o.status}
                  onChange={(e) => changeStatus(o.id, e.target.value)}
                >
                  {orderStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          {!currentOrders.length && (
            <p>{tr('Nta commande uragira.', 'No orders yet.')}</p>
          )}

          <button className="primary-btn" onClick={() => setPage('shop')}>
            {tr('SUBIRA KU IDUKA', 'BACK TO SHOP')}
          </button>
        </section>
      )}

      
      {/* NEW ADMIN DASHBOARD */}
      {page === 'admin' && user?.role === 'admin' && (
        <section className="kfs-admin">
          <aside className="kfs-admin-sidebar">
            <div className="kfs-admin-brand">
              <span>KF</span>
              <div>
                <strong>KEVIN FASHION</strong>
                <small>ADMIN PANEL</small>
              </div>
            </div>

            <p className="kfs-admin-label">MAIN MENU</p>

            {[
              ['overview', '▦', 'Overview'],
              ['products', '◇', 'Products'],
              ['orders', '▤', 'Orders'],
              ['customers', '♙', 'Customers']
            ].map(([key, icon, label]) => (
              <button
                key={key}
                className={adminTab === key ? 'kfs-admin-active' : ''}
                onClick={() => setAdminTab(key)}
              >
                <span>{icon}</span>{label}
              </button>
            ))}

            <div className="kfs-admin-sidebar-bottom">
              <div className="kfs-admin-profile">
                <span className="kfs-admin-avatar">
                  {(user.name || 'A').charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>{user.name}</strong>
                  <small>Administrator</small>
                </div>
              </div>

              <button onClick={() => {
                setPage('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}>
                ↩ Back to Shop
              </button>
            </div>
          </aside>

          <div className="kfs-admin-main">
            <header className="kfs-admin-topbar">
              <div>
                <span className="kfs-admin-label">KEVIN FASHION SHOP / CONTROL PANEL</span>
                <h2>
                  {({
                    overview: 'Dashboard Overview',
                    products: 'Product Management',
                    orders: 'Order Management',
                    customers: 'Customer Management'
                  })[adminTab]}
                </h2>
                <p>Welcome back, {user.name || 'Administrator'}.</p>
              </div>

              <button
                onClick={loadAdmin}
                disabled={busy}
                className="kfs-admin-refresh"
              >
                ↻ Refresh
              </button>
            </header>

            {adminTab === 'overview' && (
              <>
                <div className="kfs-admin-section-title">
                  <div>
                    <h3>Store Overview</h3>
                    <p>Here is what's happening in your shop.</p>
                  </div>
                  <span className="kfs-admin-live">● LIVE DATA</span>
                </div>

                <div className="kfs-admin-stats">
                  {[
                    ['Products', statValue('products', adminProducts.length), '◇'],
                    ['Stock Items', statValue('stock', 0), '▣'],
                    ['Out of Stock', statValue('out_of_stock', 0), '△'],
                    ['Customers', statValue('customers', customers.length), '♙'],
                    ['Total Orders', statValue('orders', adminOrders.length), '▤'],
                    ['Pending Orders', statValue('pending_orders', 0), '◷']
                  ].map(([label, value, icon]) => (
                    <div className="kfs-admin-stat" key={label}>
                      <span className="kfs-admin-stat-icon">{icon}</span>
                      <p>{label}</p>
                      <strong>{Number(value || 0).toLocaleString()}</strong>
                    </div>
                  ))}
                </div>

                <div className="kfs-admin-sales">
                  <div>
                    <span>TOTAL SALES</span>
                    <h2>{money(statValue('sales', statValue('total_sales', 0)))}</h2>
                    <small>Sales recorded in your store</small>
                  </div>
                  <span className="kfs-admin-sales-icon">↗</span>
                </div>

                <div className="kfs-admin-section-title">
                  <div>
                    <h3>Recent Orders</h3>
                    <p>Latest customer orders.</p>
                  </div>
                  <button onClick={() => setAdminTab('orders')}>
                    View All →
                  </button>
                </div>

                {adminOrders.slice(0, 5).map((o) => (
                  <div className="kfs-admin-row" key={o.id}>
                    <strong>Order #{o.id}</strong>
                    <span>{o.customer_name}</span>
                    <b>{money(o.total_rwf)}</b>
                    <span className="kfs-admin-status">{o.status}</span>
                  </div>
                ))}

                {!adminOrders.length && (
                  <p className="kfs-admin-empty">No orders have been received yet.</p>
                )}
              </>
            )}

            {adminTab === 'products' && (
              <>
                <div className="kfs-admin-section-title">
                  <div>
                    <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                    <p>Create and manage your fashion collection.</p>
                  </div>
                </div>

                <form className="kfs-admin-form" onSubmit={saveProduct}>
                  <input required placeholder="Product name (Kinyarwanda)"
                    value={form.name_rw || ''}
                    onChange={(e) => update('name_rw', e.target.value)} />

                  <input required placeholder="Product name (English)"
                    value={form.name_en || ''}
                    onChange={(e) => update('name_en', e.target.value)} />

                  <input required placeholder="Category"
                    value={form.category || ''}
                    onChange={(e) => update('category', e.target.value)} />

                  <input required type="number" min="1" placeholder="Price (RWF)"
                    value={form.price_rwf ?? ''}
                    onChange={(e) => update('price_rwf', e.target.value)} />

                  <input required type="number" min="0" placeholder="Stock"
                    value={form.stock ?? ''}
                    onChange={(e) => update('stock', e.target.value)} />

                  <input placeholder="Image URL"
                    value={form.image_url || ''}
                    onChange={(e) => update('image_url', e.target.value)} />

                  <textarea placeholder="Description in Kinyarwanda"
                    value={form.description_rw || ''}
                    onChange={(e) => update('description_rw', e.target.value)} />

                  <textarea placeholder="Description in English"
                    value={form.description_en || ''}
                    onChange={(e) => update('description_en', e.target.value)} />

                  <div className="kfs-admin-form-actions">
                    <button className="kfs-admin-primary" disabled={busy}>
                      {busy ? 'PLEASE WAIT...' : editingProduct ? 'SAVE CHANGES' : '+ ADD PRODUCT'}
                    </button>
                    {editingProduct && (
                      <button type="button" onClick={() => {
                        setEditingProduct(null);
                        setForm({});
                      }}>Cancel</button>
                    )}
                  </div>
                </form>

                <h3 className="kfs-admin-list-title">All Products ({adminProducts.length})</h3>

                {adminProducts.map((p) => (
                  <div className="kfs-admin-row" key={p.id}>
                    <strong>{p.name_en || p.name_rw}</strong>
                    <span>{money(p.price_rwf)}</span>
                    <span>Stock: {p.stock}</span>
                    <span>{Number(p.active) === 0 ? 'Hidden' : 'Active'}</span>
                    <button onClick={() => startEditProduct(p)}>Edit</button>
                    {Number(p.active) !== 0 && (
                      <button onClick={() => hideProduct(p.id)}>Hide</button>
                    )}
                  </div>
                ))}
              </>
            )}

            {adminTab === 'orders' && (
              <>
                <div className="kfs-admin-section-title">
                  <div>
                    <h3>Customer Orders</h3>
                    <p>Review and update customer orders.</p>
                  </div>
                </div>

                {adminOrders.map((o) => (
                  <div className="kfs-admin-row" key={o.id}>
                    <strong>Order #{o.id}</strong>
                    <span>{o.customer_name}</span>
                    <b>{money(o.total_rwf)}</b>
                    <span>{o.created_at?.slice(0, 10)}</span>
                    <select value={o.status}
                      onChange={(e) => changeStatus(o.id, e.target.value)}>
                      {orderStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {!adminOrders.length && (
                  <p className="kfs-admin-empty">No orders have been received yet.</p>
                )}
              </>
            )}

            {adminTab === 'customers' && (
              <>
                <div className="kfs-admin-section-title">
                  <div>
                    <h3>Registered Customers</h3>
                    <p>Customer accounts and purchase history.</p>
                  </div>
                </div>

                {customers.map((c) => (
                  <div className="kfs-admin-row" key={c.id}>
                    <strong>{c.name}</strong>
                    <span>{c.email}</span>
                    <span>{c.phone || 'No phone'}</span>
                    <span>Orders: {c.order_count ?? 0}</span>
                    <b>{money(c.total_spent || 0)}</b>
                  </div>
                ))}

                {!customers.length && (
                  <p className="kfs-admin-empty">No customers registered yet.</p>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="brand">
              <span className="brandmark">KF</span>
              <span className="brand-name">
                KEVIN <b>FASHION</b>
                <small>SHOP • RWANDA</small>
              </span>
            </div>

            <p>{tr(
              'Imyambarire ni uburyo bwo kwigaragaza. Hitamo style yawe.',
              'Fashion is a way to express yourself. Find your style with us.'
            )}</p>

            <p><b>Owner:</b> {SHOP.owner}</p>
          </div>

          <div className="footer-column">
            <h4>{tr('Ibyerekeye', 'About Us')}</h4>
            <a href="#home">{tr('Abo turi bo', 'Our Story')}</a>
            <a href="#categories">{tr('Ibyiciro', 'Categories')}</a>
            <a href="#collection">{tr('Icyegeranyo', 'Our Collection')}</a>
          </div>

          <div className="footer-column">
            <h4>{tr('Gura', 'Shop')}</h4>
            <a href="#collection">{tr('Imyenda yose', 'All Products')}</a>
            <a href="#categories">Men</a>
            <a href="#categories">Women</a>
            <a href="#categories">Shoes</a>
          </div>

          <div className="footer-column">
            <h4>{tr('Ubufasha', 'Customer Care')}</h4>
            <a href={`tel:${SHOP.phone.replaceAll(' ', '')}`}>☎ {SHOP.phone}</a>
            <a href={`mailto:${SHOP.email}`}>✉ {SHOP.email}</a>
            <span>{tr('Ubufasha ku bakiriya', 'Customer Support')}</span>
          </div>

          <div className="footer-column">
            <h4>{tr('Kwishyura', 'Payment Methods')}</h4>
            <span>🟡 MTN MoMo</span>
            <a href={`tel:${SHOP.momo.replaceAll(' ', '')}`}>{SHOP.momo}</a>
            <span>🔴 Airtel Money</span>
            <a href={`tel:${SHOP.airtel.replaceAll(' ', '')}`}>{SHOP.airtel}</a>
          </div>

          <div className="footer-column">
            <h4>{tr('Aho duherereye', 'Our Location')}</h4>
            <span>📍 {SHOP.location}</span>
            <span>KEVIN FASHION SHOP</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Kevin Fashion Shop. All rights reserved.</span>
          <span>{SHOP.location}</span>
        </div>
      </footer>

      {/* MODALS */}
      {modal && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal('');
          }}
        >
          <div className="modal">
            <button className="close" onClick={() => setModal('')}>×</button>

            {/* LOGIN / REGISTER */}
            {['login', 'register'].includes(modal) && (
              <>
                <span className="eyebrow">KEVIN FASHION SHOP</span>

                <h2>
                  {modal === 'login'
                    ? tr('Murakaza neza', 'Welcome back')
                    : tr('Fungura konti', 'Create account')}
                </h2>

                <p>{tr(
                  'Injira kugira ngo ugure kandi ukurikirane ibyo watumije.',
                  'Sign in to shop and track your orders.'
                )}</p>

                <form onSubmit={submitAuth}>
                  {modal === 'register' && (
                    <>
                      <input
                        required
                        placeholder={tr('Amazina yawe', 'Full name')}
                        value={form.name || ''}
                        onChange={(e) => update('name', e.target.value)}
                      />

                      <input
                        placeholder={tr('Telefoni', 'Phone number')}
                        value={form.phone || ''}
                        onChange={(e) => update('phone', e.target.value)}
                      />
                    </>
                  )}

                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email || ''}
                    onChange={(e) => update('email', e.target.value)}
                  />

                  <input
                    required
                    type="password"
                    minLength="6"
                    placeholder={tr('Ijambo ry’ibanga', 'Password')}
                    value={form.password || ''}
                    onChange={(e) => update('password', e.target.value)}
                  />

                  <button className="primary-btn" disabled={busy}>
                    {busy ? '...' : modal === 'login'
                      ? tr('INJIRA', 'SIGN IN')
                      : tr('FUNGURA KONTE', 'CREATE ACCOUNT')}
                  </button>
                </form>

                <small>
                  {modal === 'login'
                    ? tr('Nta konti ufite?', 'New here?')
                    : tr('Usanzwe ufite konti?', 'Already have an account?')}
                  {' '}
                  <a onClick={() => {
                    setModal(modal === 'login' ? 'register' : 'login');
                    setForm({});
                  }}>
                    {modal === 'login'
                      ? tr('Iyandikishe', 'Register')
                      : tr('Injira', 'Login')}
                  </a>
                </small>
              </>
            )}

            {/* CART */}
            {modal === 'cart' && (
              <>
                <h2>{tr('Agatebo kawe', 'Your Bag')}</h2>

                {cart.map((i) => (
                  <div className="cartline" key={i.id}>
                    <img
                      src={i.image_url || '/images/download.jfif'}
                      alt={title(i)}
                    />

                    <div className="cartline-info">
                      <b>{title(i)}</b>
                      <small>{money(i.price_rwf)}</small>

                      <div className="qty">
                        <button onClick={() => setCart((c) =>
                          c.map((x) => x.id === i.id
                            ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                            : x
                          )
                        )}>−</button>

                        {i.quantity}

                        <button onClick={() => setCart((c) =>
                          c.map((x) => x.id === i.id
                            ? { ...x, quantity: Math.min(Number(x.stock), x.quantity + 1) }
                            : x
                          )
                        )}>＋</button>

                        <a onClick={() =>
                          setCart((c) => c.filter((x) => x.id !== i.id))
                        }>Remove</a>
                      </div>
                    </div>
                  </div>
                ))}

                {!cart.length && (
                  <p>{tr('Agatebo karimo ubusa.', 'Your bag is empty.')}</p>
                )}

                <div className="total">
                  <span>Total</span>
                  <b>{money(total)}</b>
                </div>

                <button
                  disabled={!cart.length}
                  className="primary-btn"
                  onClick={() => {
                    if (!user) setModal('login');
                    else setModal('checkout');
                  }}
                >
                  {tr('Komeza kuri checkout', 'PROCEED TO CHECKOUT')} →
                </button>
              </>
            )}

            {/* CHECKOUT */}
            {modal === 'checkout' && (
              <>
                <h2>{tr('Tanga commande', 'Place Your Order')}</h2>
                <p>{tr('Uzuza aho bakugezaho.', 'Enter your delivery details.')}</p>

                <form onSubmit={checkout}>
                  <input
                    required
                    placeholder={tr('Amazina', 'Full name')}
                    value={form.customer_name || user?.name || ''}
                    onChange={(e) => update('customer_name', e.target.value)}
                  />

                  <input
                    required
                    placeholder={tr('Telefoni', 'Phone number')}
                    value={form.phone || ''}
                    onChange={(e) => update('phone', e.target.value)}
                  />

                  <input
                    required
                    placeholder={tr('Akarere', 'District')}
                    value={form.district || ''}
                    onChange={(e) => update('district', e.target.value)}
                  />

                  <textarea
                    required
                    placeholder={tr(
                      'Aho batugeza (umurenge, akagari...)',
                      'Delivery address (sector, cell...)'
                    )}
                    value={form.address || ''}
                    onChange={(e) => update('address', e.target.value)}
                  />

                 
<label>{tr('Uburyo bwo kwishyura', 'Payment method')}</label>

<select
  value={form.payment_method || 'cash'}
  onChange={(e) => {
    update('payment_method', e.target.value);
    update('payment_reference', '');
  }}
>
  <option value="cash">
    {tr('Kwishyura wakiriye', 'Cash on delivery')}
  </option>
  <option value="momo">MTN MoMo</option>
  <option value="airtel">Airtel Money</option>
</select>

{['momo', 'airtel'].includes(form.payment_method) && (
  <div className="payment-info">
    <h3>{tr('Uburyo bwo kwishyura', 'Payment Instructions')}</h3>

    {form.payment_method === 'momo' ? (
      <>
        <p>🟡 MTN MoMo</p>
        <strong>{SHOP.momo}</strong>
      </>
    ) : (
      <>
        <p>🔴 Airtel Money</p>
        <strong>{SHOP.airtel}</strong>
      </>
    )}

    <p>
      {tr(
        'Ohereza amafaranga kuri iyi nimero, hanyuma wandike Transaction ID wahawe.',
        'Send the payment to this number, then enter the Transaction ID you receive.'
      )}
    </p>
  </div>
)}

{['momo', 'airtel'].includes(form.payment_method) && (
  <input
    required
    placeholder="Transaction ID"
    value={form.payment_reference || ''}
    onChange={(e) => update('payment_reference', e.target.value)}
  />
)}

<p className="hint">
  {tr(
    'Ntuzigere utanga PIN ya MoMo. Ubwishyu bugomba kubanza kugenzurwa n’ubuyobozi bw’iduka.',
    'Never share your Mobile Money PIN. Payments must be verified by the shop.'
  )}
</p>


                  <div className="total">
                    <span>Total</span>
                    <b>{money(total)}</b>
                  </div>

                  <button className="primary-btn" disabled={busy}>
                    {busy ? '...' : tr('OHEREZA COMMANDE', 'PLACE ORDER')}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
