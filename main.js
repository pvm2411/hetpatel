const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SAMPLE_PRODUCTS = [
  {
    id: '101',
    name: 'Electric Drill',
    description: 'Compact cordless drill with variable speed controls and safety clutch.',
    image_url: 'https://via.placeholder.com/400x300?text=Electric+Drill',
    hourly_rate: 120,
    daily_rate: 450,
    is_company_owned: true,
    is_available: true
  },
  {
    id: '102',
    name: 'Camping Tent',
    description: 'Spacious 4-person tent for weekend trips and overnight stays.',
    image_url: 'https://via.placeholder.com/400x300?text=Camping+Tent',
    hourly_rate: 180,
    daily_rate: 650,
    is_company_owned: false,
    is_available: true
  },
  {
    id: '103',
    name: 'Action Camera',
    description: 'Waterproof action camera with 4K recording and wide-angle lens.',
    image_url: 'https://via.placeholder.com/400x300?text=Action+Camera',
    hourly_rate: 210,
    daily_rate: 799,
    is_company_owned: false,
    is_available: true
  }
];

window.rentalApp = {
  supabase,
  currentUser: null,
  products: [],
  cart: [],
  cartKey: 'rentalMarketplaceCart'
};

function getEl(id) {
  return document.getElementById(id);
}

function updateNavState() {
  const userLabel = getEl('nav-user');
  const signOutButton = getEl('sign-out-nav');
  const user = window.rentalApp.currentUser;
  if (userLabel) {
    userLabel.textContent = user ? `${user.email || user.phone}` : 'Not signed in';
  }
  if (signOutButton) {
    signOutButton.classList.toggle('hidden', !user);
  }
}

async function signOut() {
  await supabase.auth.signOut();
  setUser(null);
  if (!window.location.pathname.endsWith('auth.html')) {
    window.location.href = 'auth.html';
  }
}

if (getEl('sign-out-nav')) {
  getEl('sign-out-nav').addEventListener('click', signOut);
}

function setUser(user) {
  window.rentalApp.currentUser = user;
  updateNavState();
}

function loadCartFromStorage() {
  const raw = localStorage.getItem(window.rentalApp.cartKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCartToStorage() {
  localStorage.setItem(window.rentalApp.cartKey, JSON.stringify(window.rentalApp.cart));
}

function findProduct(id) {
  return window.rentalApp.products.find((product) => product.id === id);
}

function renderProducts(list) {
  const productList = getEl('product-list');
  const productCount = getEl('product-count');
  if (!productList || !productCount) return;

  productList.innerHTML = '';
  productCount.textContent = `${list.length} items`;
  if (!list.length) {
    productList.innerHTML = '<p class="help-text">No rentals available yet.</p>';
    return;
  }

  list.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image_url}" alt="${product.name}" />
      <div class="card-body">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="price-row">
          <span class="price-pill">₹${product.hourly_rate}/hr</span>
          <span class="price-pill">₹${product.daily_rate}/day</span>
        </div>
        <div class="cart-row"><span>Owner:</span><strong>${product.is_company_owned ? 'Company' : 'User'}</strong></div>
        ${product.is_available ? `<button data-product-id="${product.id}" class="primary wide rent-button">Rent Now</button>` : `<div class="out-of-stock">Out of Stock</div>`}
      </div>
    `;
    productList.appendChild(card);
  });

  productList.querySelectorAll('.rent-button').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.productId));
  });
}

function addToCart(productId) {
  if (!window.rentalApp.currentUser) {
    alert('Please sign in to rent items.');
    window.location.href = 'auth.html';
    return;
  }

  const product = findProduct(productId);
  if (!product || !product.is_available) {
    alert('Product is not available.');
    return;
  }

  if (window.rentalApp.cart.some((item) => item.id === productId)) {
    alert('Item already in cart.');
    return;
  }

  window.rentalApp.cart.push({
    id: product.id,
    name: product.name,
    hourly_rate: Number(product.hourly_rate),
    daily_rate: Number(product.daily_rate),
    duration_type: 'hour',
    duration_value: 1,
    total_price: Number(product.hourly_rate)
  });
  saveCartToStorage();
  alert(`${product.name} was added to your cart.`);
}

function updateCartItem(itemId, field, value) {
  const item = window.rentalApp.cart.find((entry) => entry.id === itemId);
  if (!item) return;
  item[field] = value;
  item.total_price = item.duration_type === 'hour'
    ? item.hourly_rate * item.duration_value
    : item.daily_rate * item.duration_value;
  saveCartToStorage();
  renderCartPage();
}

function removeCartItem(itemId) {
  window.rentalApp.cart = window.rentalApp.cart.filter((entry) => entry.id !== itemId);
  saveCartToStorage();
  renderCartPage();
}

function renderCartPage() {
  const cartItems = getEl('cart-items');
  const cartEmpty = getEl('cart-empty');
  const cartSummary = getEl('cart-summary');
  const cartCount = getEl('cart-count');
  const cartSubtotal = getEl('cart-subtotal');

  if (!cartItems || !cartEmpty || !cartSummary || !cartCount || !cartSubtotal) return;

  cartItems.innerHTML = '';
  if (!window.rentalApp.cart.length) {
    cartEmpty.classList.remove('hidden');
    cartSummary.classList.add('hidden');
    return;
  }

  cartEmpty.classList.add('hidden');
  cartSummary.classList.remove('hidden');

  window.rentalApp.cart.forEach((item) => {
    const entry = document.createElement('div');
    entry.className = 'cart-item';
    entry.innerHTML = `
      <div class="cart-item-header">
        <strong>${item.name}</strong>
        <button class="secondary small remove-button" data-id="${item.id}">Remove</button>
      </div>
      <label>Duration type
        <select data-field="duration_type" data-id="${item.id}">
          <option value="hour" ${item.duration_type === 'hour' ? 'selected' : ''}>Hour</option>
          <option value="day" ${item.duration_type === 'day' ? 'selected' : ''}>Day</option>
        </select>
      </label>
      <label>Duration value
        <input type="number" min="1" value="${item.duration_value}" data-field="duration_value" data-id="${item.id}" />
      </label>
      <div class="cart-row"><span>Item total:</span><strong>₹${item.total_price}</strong></div>
    `;
    cartItems.appendChild(entry);
  });

  cartItems.querySelectorAll('select, input[type="number"]').forEach((control) => {
    control.addEventListener('change', (event) => {
      const itemId = event.target.dataset.id;
      const field = event.target.dataset.field;
      const value = field === 'duration_value' ? Math.max(1, Number(event.target.value)) : event.target.value;
      updateCartItem(itemId, field, value);
    });
  });

  cartItems.querySelectorAll('.remove-button').forEach((button) => {
    button.addEventListener('click', () => removeCartItem(button.dataset.id));
  });

  const subtotal = window.rentalApp.cart.reduce((sum, item) => sum + item.total_price, 0);
  cartCount.textContent = window.rentalApp.cart.length;
  cartSubtotal.textContent = `₹${subtotal}`;
}

async function refreshProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Product fetch error', error.message);
    window.rentalApp.products = SAMPLE_PRODUCTS;
    renderProducts(SAMPLE_PRODUCTS);
    return;
  }

  const products = Array.isArray(data) ? data : [];
  if (products.length === 0) {
    window.rentalApp.products = SAMPLE_PRODUCTS;
    renderProducts(SAMPLE_PRODUCTS);
    return;
  }

  window.rentalApp.products = products;
  renderProducts(products);
}

async function renderDashboard() {
  const dashboardOrders = getEl('dashboard-orders');
  const dashboardRevenue = getEl('dashboard-revenue');
  const dashboardCommission = getEl('dashboard-commission');
  const dashboardPayout = getEl('dashboard-payout');
  if (!dashboardOrders || !dashboardRevenue || !dashboardCommission || !dashboardPayout) return;

  const { data: orders, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error('Dashboard load error', error.message);
    return;
  }

  const totalRevenue = (orders || []).reduce((sum, order) => sum + Number(order.total_price || 0), 0);
  const commission = totalRevenue * 0.3;
  const payout = totalRevenue * 0.7;

  dashboardOrders.textContent = `${(orders || []).length}`;
  dashboardRevenue.textContent = `₹${totalRevenue.toFixed(2)}`;
  dashboardCommission.textContent = `₹${commission.toFixed(2)}`;
  dashboardPayout.textContent = `₹${payout.toFixed(2)}`;
}

async function checkout() {
  const damageCheckbox = getEl('damage-policy');
  const checkoutMessage = getEl('checkout-message');
  if (!window.rentalApp.currentUser) return alert('You must be signed in to checkout.');
  if (!window.rentalApp.cart.length) return alert('Your cart is empty.');
  if (!damageCheckbox?.checked) return alert('Please accept the damage policy before checkout.');

  const paymentOption = document.querySelector('input[name="payment-type"]:checked')?.value;
  const paymentMethod = getEl('payment-method')?.value || 'upi';

  const orderInserts = [];
  const updateIds = [];

  for (const item of window.rentalApp.cart) {
    const selectedProduct = findProduct(item.id);
    if (!selectedProduct?.is_available) {
      return alert(`The item ${item.name} is no longer available.`);
    }
    orderInserts.push({
      user_id: window.rentalApp.currentUser.id,
      product_id: item.id,
      duration_type: item.duration_type,
      duration_value: item.duration_value,
      total_price: item.total_price,
      payment_type: paymentOption,
      payment_method: paymentMethod,
      damage_policy_accepted: true,
      status: 'confirmed'
    });
    updateIds.push(item.id);
  }

  const { error: orderError } = await supabase.from('orders').insert(orderInserts);
  if (orderError) {
    if (checkoutMessage) {
      checkoutMessage.textContent = orderError.message;
      checkoutMessage.style.color = 'var(--red)';
    }
    return;
  }

  const { error: updateError } = await supabase.from('products').update({ is_available: false }).in('id', updateIds);
  if (updateError) {
    if (checkoutMessage) {
      checkoutMessage.textContent = updateError.message;
      checkoutMessage.style.color = 'var(--red)';
    }
    return;
  }

  window.rentalApp.cart = [];
  saveCartToStorage();
  renderCartPage();
  if (checkoutMessage) {
    checkoutMessage.textContent = 'Rental completed. Availability updated and order saved.';
    checkoutMessage.style.color = 'var(--green)';
  }
  await refreshProducts();
}

async function syncUserProfile(user) {
  if (!user) return;
  const googleIdentity = user.identities?.find((identity) => identity.provider === 'google');
  const googleId = googleIdentity?.identity_data?.sub || null;
  const profile = {
    id: user.id,
    email: user.email,
    mobile_number: user.phone,
    google_id: googleId,
    created_at: new Date().toISOString()
  };
  await supabase.from('users').upsert(profile, { onConflict: 'id' });
}

async function loadAuthState() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();
  if (error) {
    console.error(error.message);
  }

  const user = session?.user || null;
  if (user) await syncUserProfile(user);
  setUser(user);
  window.rentalApp.cart = loadCartFromStorage();
  await initPage();
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  const user = session?.user || null;
  if (user) await syncUserProfile(user);
  setUser(user);
  await initPage();
});

async function initPage() {
  const page = document.body.dataset.page;
  updateNavState();
  if (page === 'index') {
    await refreshProducts();
  }
  if (page === 'cart') {
    window.rentalApp.cart = loadCartFromStorage();
    renderCartPage();
    const checkoutButton = getEl('checkout-button');
    if (checkoutButton) {
      checkoutButton.addEventListener('click', checkout);
    }
  }
  if (page === 'dashboard') {
    await renderDashboard();
  }
}

window.addToCart = addToCart;
window.loadCartFromStorage = loadCartFromStorage;
window.saveCartToStorage = saveCartToStorage;
window.handleAuthAction = function (_result, error) {
  if (error) alert(error.message);
  else alert('Check your email or phone to complete sign in.');
};
window.signOutApp = signOut;

loadAuthState();
