const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authEmail = document.getElementById('auth-email');
const authPhone = document.getElementById('auth-phone');
const emailSigninButton = document.getElementById('email-signin');
const phoneSigninButton = document.getElementById('phone-signin');
const googleSigninButton = document.getElementById('google-signin');
const signOutButton = document.getElementById('sign-out');
const userWelcome = document.getElementById('user-welcome');
const authCard = document.getElementById('auth-card');
const vendorForm = document.getElementById('vendor-form');
const vendorMessage = document.getElementById('vendor-message');
const productList = document.getElementById('product-list');
const productCount = document.getElementById('product-count');
const cartItems = document.getElementById('cart-items');
const cartEmpty = document.getElementById('cart-empty');
const cartSummary = document.getElementById('cart-summary');
const cartCount = document.getElementById('cart-count');
const cartSubtotal = document.getElementById('cart-subtotal');
const checkoutButton = document.getElementById('checkout-button');
const checkoutMessage = document.getElementById('checkout-message');
const damagePolicy = document.getElementById('damage-policy');
const paymentMethod = document.getElementById('payment-method');
const dashboardOrders = document.getElementById('dashboard-orders');
const dashboardRevenue = document.getElementById('dashboard-revenue');
const dashboardCommission = document.getElementById('dashboard-commission');
const dashboardPayout = document.getElementById('dashboard-payout');

let currentUser = null;
let products = [];
let cart = [];

async function handleAuthAction(result, error) {
  if (error) {
    alert(error.message);
  } else {
    alert('Check your email or phone to complete sign in.');
  }
}

emailSigninButton.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) return alert('Enter an email address.');
  const { error } = await supabase.auth.signInWithOtp({ email });
  handleAuthAction(null, error);
});

phoneSigninButton.addEventListener('click', async () => {
  const phone = authPhone.value.trim();
  if (!phone) return alert('Enter a phone number with country code.');
  const { error } = await supabase.auth.signInWithOtp({ phone });
  handleAuthAction(null, error);
});

googleSigninButton.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) alert(error.message);
});

signOutButton.addEventListener('click', async () => {
  await supabase.auth.signOut();
  setUser(null);
});

vendorForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return alert('Sign in first to add inventory.');

  const name = document.getElementById('product-name').value.trim();
  const imageUrl = document.getElementById('product-image').value.trim();
  const description = document.getElementById('product-description').value.trim();
  const hourlyRate = Number(document.getElementById('product-hourly').value);
  const dailyRate = Number(document.getElementById('product-daily').value);
  const isCompanyOwned = document.getElementById('product-company').checked;

  if (!name || !imageUrl || !description || !hourlyRate || !dailyRate) {
    vendorMessage.textContent = 'Please complete every field before submitting.';
    vendorMessage.style.color = 'var(--red)';
    return;
  }

  const { error } = await supabase.from('products').insert([{
    name,
    description,
    image_url: imageUrl,
    hourly_rate: hourlyRate,
    daily_rate: dailyRate,
    is_company_owned: isCompanyOwned,
    is_available: true,
    owner_id: isCompanyOwned ? null : currentUser.id
  }]);

  if (error) {
    vendorMessage.textContent = error.message;
    vendorMessage.style.color = 'var(--red)';
    return;
  }

  vendorMessage.textContent = 'Inventory item added successfully.';
  vendorMessage.style.color = 'var(--green)';
  vendorForm.reset();
  await refreshProducts();
});

function setUser(user) {
  currentUser = user;
  if (user) {
    userWelcome.textContent = `Signed in as ${user.email || user.phone}`;
    signOutButton.classList.remove('hidden');
    authCard.classList.add('hidden');
  } else {
    userWelcome.textContent = 'Not signed in';
    signOutButton.classList.add('hidden');
    authCard.classList.remove('hidden');
  }
}

function renderProducts(list) {
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

  document.querySelectorAll('.rent-button').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.productId));
  });
}

function findProduct(id) {
  return products.find((product) => product.id === id);
}

function addToCart(productId) {
  if (!currentUser) return alert('Please sign in to rent items.');
  const product = findProduct(productId);
  if (!product || !product.is_available) return alert('Product is not available.');
  if (cart.some((item) => item.id === productId)) {
    alert('Item already in cart.');
    return;
  }

  cart.push({
    id: product.id,
    name: product.name,
    hourly_rate: product.hourly_rate,
    daily_rate: product.daily_rate,
    duration_type: 'hour',
    duration_value: 1,
    total_price: product.hourly_rate
  });
  renderCart();
}

function updateCartItem(itemId, field, value) {
  const item = cart.find((entry) => entry.id === itemId);
  if (!item) return;
  item[field] = value;
  item.total_price = item.duration_type === 'hour'
    ? item.hourly_rate * item.duration_value
    : item.daily_rate * item.duration_value;
  renderCart();
}

function removeCartItem(itemId) {
  cart = cart.filter((entry) => entry.id !== itemId);
  renderCart();
}

function renderCart() {
  cartItems.innerHTML = '';
  if (!cart.length) {
    cartEmpty.classList.remove('hidden');
    cartSummary.classList.add('hidden');
    return;
  }

  cartEmpty.classList.add('hidden');
  cartSummary.classList.remove('hidden');

  cart.forEach((item) => {
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

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  cartCount.textContent = cart.length;
  cartSubtotal.textContent = `₹${subtotal}`;
}

async function refreshProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Product fetch error', error.message);
    return;
  }
  products = data || [];
  renderProducts(products);
  await renderVendorDashboard();
}

async function renderVendorDashboard() {
  const { data: orders } = await supabase.from('orders').select('*');
  if (!orders) return;

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
  const commission = totalRevenue * 0.3;
  const payout = totalRevenue * 0.7;
  dashboardOrders.textContent = `${orders.length}`;
  dashboardRevenue.textContent = `₹${totalRevenue.toFixed(2)}`;
  dashboardCommission.textContent = `₹${commission.toFixed(2)}`;
  dashboardPayout.textContent = `₹${payout.toFixed(2)}`;
}

async function checkout() {
  if (!currentUser) return alert('You must be signed in to checkout.');
  if (!cart.length) return alert('Your cart is empty.');
  if (!damagePolicy.checked) return alert('Please accept the damage policy before checkout.');

  const paymentOption = document.querySelector('input[name="payment-type"]:checked')?.value;
  const paymentMethodValue = paymentMethod.value;
  const orderInserts = [];
  const updateIds = [];

  for (const item of cart) {
    const selectedProduct = findProduct(item.id);
    if (!selectedProduct?.is_available) {
      return alert(`The item ${item.name} is no longer available.`);
    }
    orderInserts.push({
      user_id: currentUser.id,
      product_id: item.id,
      duration_type: item.duration_type,
      duration_value: item.duration_value,
      total_price: item.total_price,
      payment_type: paymentOption,
      payment_method: paymentMethodValue,
      damage_policy_accepted: true,
      status: 'confirmed'
    });
    updateIds.push(item.id);
  }

  const { error: orderError } = await supabase.from('orders').insert(orderInserts);
  if (orderError) {
    checkoutMessage.textContent = orderError.message;
    checkoutMessage.style.color = 'var(--red)';
    return;
  }

  const { error: updateError } = await supabase.from('products').update({ is_available: false }).in('id', updateIds);
  if (updateError) {
    checkoutMessage.textContent = updateError.message;
    checkoutMessage.style.color = 'var(--red)';
    return;
  }

  checkoutMessage.textContent = 'Rental completed. Availability updated and order saved.';
  checkoutMessage.style.color = 'var(--green)';
  cart = [];
  renderCart();
  await refreshProducts();
}

checkoutButton.addEventListener('click', checkout);

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
  if (user) {
    await syncUserProfile(user);
  }
  setUser(user);
  await refreshProducts();
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  const user = session?.user || null;
  if (user) {
    await syncUserProfile(user);
  }
  setUser(user);
  await refreshProducts();
});

loadAuthState();
