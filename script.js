/* ==========================================================
   ORA — script.js (shared by all pages)
   The script checks which elements exist on the page and runs
   only the matching feature:
   - #product-list            -> product.html
   - #orderForm               -> order.html
   - #ordersTable tbody       -> admin.html
   ========================================================== */

const PRODUCTS_JSON = 'products.json';
const ORDERS_KEY = 'bodyScentOrders';

const MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.querySelector('#ordersTable tbody')) initAdminPage();
});

/* ==========================================================
   1) product.html
   ========================================================== */
function initProductPage() {
  const filterBar = document.getElementById('filter-bar');
  const list = document.getElementById('product-list');
  let products = [];

  const params = new URLSearchParams(window.location.search);
  let currentMood = (params.get('mood') || 'all').toLowerCase();
  if (!MOODS.some(function (m) { return m.key === currentMood; })) {
    currentMood = 'all';
  }

  function renderFilters() {
    if (!filterBar) return;
    filterBar.innerHTML = '';
    MOODS.forEach(function (m) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn' + (m.key === currentMood ? ' is-active' : '');
      btn.dataset.mood = m.key;
      btn.textContent = m.label;
      btn.addEventListener('click', function () {
        currentMood = m.key;
        updateUrl();
        renderFilters();
        renderProducts();
      });
      filterBar.appendChild(btn);
    });
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    if (currentMood === 'all') {
      url.searchParams.delete('mood');
    } else {
      url.searchParams.set('mood', currentMood);
    }
    window.history.replaceState(null, '', url.toString());
  }

  function renderProducts() {
    const items = products.filter(function (p) {
      return currentMood === 'all' || p.mood === currentMood;
    });

    list.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-center';
      empty.textContent = 'ไม่พบสินค้าในหมวดนี้';
      list.appendChild(empty);
      return;
    }

    items.forEach(function (p) {
      list.appendChild(buildProductCard(p));
    });
  }

  fetch(PRODUCTS_JSON)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      renderFilters();
      renderProducts();
    })
    .catch(function (error) {
      console.error(error);
      list.innerHTML = '';
      const msg = document.createElement('p');
      msg.className = 'notice notice--error';
      msg.textContent = 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง';
      list.appendChild(msg);
    });
}

function buildProductCard(p) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.mood = p.mood;

  /* image */
  const media = document.createElement('div');
  media.className = 'product-card__media';
  const img = document.createElement('img');
  img.src = p.image;
  img.alt = p.name;
  img.loading = 'lazy';
  img.addEventListener('error', function () {
    img.style.visibility = 'hidden';
  });
  media.appendChild(img);

  /* body */
  const body = document.createElement('div');
  body.className = 'product-card__body';

  const moodLabel = document.createElement('span');
  moodLabel.className = 'mood-label';
  const dot = document.createElement('span');
  dot.className = 'mood-dot';
  moodLabel.appendChild(dot);
  moodLabel.appendChild(document.createTextNode(capitalize(p.mood)));

  const name = document.createElement('h3');
  name.className = 'product-card__name';
  name.textContent = p.name;

  const size = document.createElement('span');
  size.className = 'badge';
  size.textContent = p.size;

  body.appendChild(moodLabel);
  body.appendChild(name);
  body.appendChild(size);

  /* foot: price + order button */
  const foot = document.createElement('div');
  foot.className = 'product-card__foot';

  const price = document.createElement('span');
  price.className = 'price';
  price.textContent = formatPrice(p.price) + ' ';
  const unit = document.createElement('small');
  unit.textContent = 'บาท';
  price.appendChild(unit);

  const order = document.createElement('a');
  order.className = 'btn btn--accent';
  order.textContent = 'สั่งซื้อ';
  order.href =
    'order.html?item=' + encodeURIComponent(p.name) +
    '&price=' + encodeURIComponent(p.price);

  foot.appendChild(price);
  foot.appendChild(order);

  card.appendChild(media);
  card.appendChild(body);
  card.appendChild(foot);
  return card;
}

/* ==========================================================
   2) order.html
   ========================================================== */
function initOrderPage() {
  const form = document.getElementById('orderForm');
  const params = new URLSearchParams(window.location.search);

  /* prefill both #items and #total from the URL */
  const itemField = document.getElementById('items');
  const totalField = document.getElementById('total');
  const item = params.get('item');
  const price = params.get('price');

  if (itemField && item) itemField.value = item;
  if (totalField && price) totalField.value = price;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const payload = {
      customerName: getValue('customerName'),
      contact: getValue('contact'),
      items: getValue('items'),
      total: getValue('total'),
      note: getValue('note'),
      timestamp: new Date().toISOString()
    };

    try {
      let orders = [];
      const raw = localStorage.getItem(ORDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) orders = parsed;
      }
      orders.push(payload);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error(error);
      alert('ไม่สามารถบันทึกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    window.location.href = 'thankyou.html';
  });
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ==========================================================
   3) admin.html
   ========================================================== */
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');

  function showMessage(text) {
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = text;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let orders = [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) orders = parsed;
    }
  } catch (error) {
    console.error(error);
  }

  if (orders.length === 0) {
    showMessage('ยังไม่มีคำสั่งซื้อ');
    return;
  }

  /* newest first */
  orders.sort(function (a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  tbody.innerHTML = '';
  orders.forEach(function (o) {
    const tr = document.createElement('tr');
    const cells = [
      formatDate(o.timestamp),
      o.customerName,
      o.contact,
      o.items,
      o.total,
      o.note
    ];
    cells.forEach(function (value) {
      const td = document.createElement('td');
      td.textContent = value !== undefined && value !== null ? value : '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function formatDate(ts) {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('th-TH');
}

/* ---------- helpers ---------- */
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function formatPrice(n) {
  return Number(n).toLocaleString('th-TH');
}
