/* ==========================================================
   LANUVA — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : แสดงการ์ดสินค้า + กรอง mood
   - order.html   : เติมฟอร์มจาก URL และส่งออเดอร์
   - admin.html   : แสดงออเดอร์จาก Google Sheet (CSV)
   ========================================================== */

const ORDER_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbztCdQbz9w5APo-YdXf3iVFyFp4eTyGvKMcy1w0lG02Zb9uR8zr98cPLbCG0xH92uYwrw/exec';

const ORDERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTm3byyUHh4D0NuRQ8tiVuSKdokhDJq-juzZEg7EsBuem1tN_X-Ywfl6wAMUyVjlneVYmqGpLWJMKlX/pub?gid=0&single=true&output=csv';

const MOOD_FILTERS = [
  { value: 'all',      label: 'ทั้งหมด' },
  { value: 'rose',     label: 'Rose' },
  { value: 'lavender', label: 'Lavender' }
];

/* ---------- ตัวช่วยทั่วไป ---------- */

function formatPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('th-TH') : String(value);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ==========================================================
   1) product.html
   ========================================================== */

function initProductPage() {
  const filterBar = document.getElementById('filter-bar');
  const listEl = document.getElementById('product-list');
  if (!filterBar || !listEl) return;

  let products = [];
  const validMoods = MOOD_FILTERS.map(f => f.value);

  const params = new URLSearchParams(window.location.search);
  const moodParam = (params.get('mood') || 'all').toLowerCase();
  let activeMood = validMoods.includes(moodParam) ? moodParam : 'all';

  function renderFilters() {
    filterBar.innerHTML = '';
    MOOD_FILTERS.forEach(f => {
      const btn = el('button', 'btn' + (f.value === activeMood ? ' btn--solid' : ''), f.label);
      btn.type = 'button';
      btn.dataset.mood = f.value === 'all' ? '' : f.value;
      btn.setAttribute('aria-pressed', f.value === activeMood ? 'true' : 'false');
      btn.addEventListener('click', () => {
        activeMood = f.value;
        renderFilters();
        renderProducts();
      });
      filterBar.appendChild(btn);
    });
  }

  function buildCard(p) {
    const card = el('article', 'product-card');
    card.dataset.mood = p.mood;

    const media = el('div', 'product-card__media');
    const img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    media.appendChild(img);

    const body = el('div', 'product-card__body');

    const title = el('h3', 'product-card__title', p.name);
    const rule = el('span', 'mood-rule');
    rule.setAttribute('aria-hidden', 'true');

    const meta = el('div', 'product-card__meta');
    meta.appendChild(el('span', 'mood-dot'));
    meta.appendChild(el('span', '', p.size));

    const desc = el('p', 'product-card__desc', p.description || '');

    const footer = el('div', 'product-card__footer');
    const price = el('span', 'price', formatPrice(p.price));
    price.appendChild(el('small', '', 'บาท'));

    const orderUrl =
      'order.html?item=' + encodeURIComponent(p.name) +
      '&price=' + encodeURIComponent(p.price);
    const order = el('a', 'btn btn--gold', 'สั่งซื้อ');
    order.href = orderUrl;

    footer.append(price, order);
    body.append(title, rule, meta, desc, footer);
    card.append(media, body);
    return card;
  }

  function renderProducts() {
    listEl.innerHTML = '';
    const shown = activeMood === 'all'
      ? products
      : products.filter(p => p.mood === activeMood);

    if (!shown.length) {
      listEl.appendChild(el('p', 'muted', 'ไม่พบสินค้าในหมวดนี้'));
      return;
    }
    shown.forEach(p => listEl.appendChild(buildCard(p)));
  }

  renderFilters();

  fetch('products.json')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      products = data;
      renderProducts();
    })
    .catch(err => {
      console.error(err);
      listEl.innerHTML = '';
      listEl.appendChild(el('p', 'muted', 'ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง'));
    });
}

/* ==========================================================
   2) order.html
   ========================================================== */

function initOrderPage() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // เติมชื่อสินค้าและราคาจาก URL ทันทีที่โหลดหน้า
  const params = new URLSearchParams(window.location.search);
  const item = params.get('item');
  const price = params.get('price');

  if (item && itemsInput) itemsInput.value = item;
  if (price && totalInput) totalInput.value = price;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(ORDER_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      if (submitBtn) submitBtn.disabled = false;
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ==========================================================
   3) admin.html
   ========================================================== */

/**
 * Parse CSV เอง รองรับ: ข้อความในเครื่องหมายคำพูด, comma ในช่อง,
 * "" แทน " และการขึ้นบรรทัดใหม่ในช่อง
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // ตัด BOM

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่าง
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  const COLS = 6;

  function showMessage(msg) {
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = el('td', 'muted', msg);
    td.colSpan = COLS;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage('กำลังโหลดข้อมูล...');

  const url = ORDERS_CSV_URL + '&_=' + Date.now(); // กัน cache

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(text => {
      const rows = parseCSV(text);
      rows.shift(); // ข้ามแถวหัวตาราง

      if (!rows.length) {
        showMessage('ยังไม่มีรายการสั่งซื้อ');
        return;
      }

      // แถวใหม่ถูกต่อท้ายชีตเสมอ → กลับลำดับให้ล่าสุดขึ้นก่อน
      rows.reverse();

      tbody.innerHTML = '';
      rows.forEach(r => {
        // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
        const tr = document.createElement('tr');
        for (let i = 0; i < COLS; i++) {
          let value = (r[i] || '').trim();
          if (i === 4 && value !== '' && Number.isFinite(Number(value))) {
            value = formatPrice(value);
          }
          tr.appendChild(el('td', '', value));
        }
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error(err);
      showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    });
}

/* ---------- เริ่มทำงาน: ตรวจว่าหน้านั้นมี element อะไร ---------- */

document.addEventListener('DOMContentLoaded', function () {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
