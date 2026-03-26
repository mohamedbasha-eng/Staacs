// Hello Eng Mohamed Basha
// Simple Cart Logic (localStorage)
import { db, ref, push, update, onValue, runTransaction, get } from './firebase-config.js';

let cart = JSON.parse(localStorage.getItem('staccs-cart')) || [];

// Store data in memory for real-time updates
let productQuantities = {};
let dynamicShippingRates = {};

// ==================== INVENTORY MANAGEMENT ====================
// Load and monitor product quantities from Firebase
function loadProductQuantities() {
  const productsRef = ref(db, 'products');
  onValue(productsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const [key, product] of Object.entries(data)) {
        productQuantities[key] = product.quantity || 0;
      }
      console.log('Product quantities loaded:', productQuantities);
      // Update UI if needed
      if (typeof updateProductDisplay === 'function') {
        updateProductDisplay();
      }
    }
  });
}
window.loadProductQuantities = loadProductQuantities;

// Check if product is in stock and get available quantity
function getProductQuantity(productId) {
  return productQuantities[productId] || 0;
}
window.getProductQuantity = getProductQuantity;

// Check if product can be added to cart (stock available)
function canAddToCart(productId, quantity = 1) {
  const availableQty = getProductQuantity(productId);
  return availableQty >= quantity;
}

// Validate entire cart against current stock
function validateCartStock() {
  for (const item of cart) {
    const available = getProductQuantity(item.id);
    if (available < item.quantity) {
      return false;
    }
  }
  return true;
}

// Update product quantities in Firebase using an ATOMIC transaction
async function updateProductQuantitiesAfterOrder(items) {
  const productsRef = ref(db, 'products');
  
  try {
    const result = await runTransaction(productsRef, (currentProducts) => {
      if (currentProducts === null) return currentProducts;
      
      // Clone to avoid side effects on intermediate attempts
      const updatedProducts = JSON.parse(JSON.stringify(currentProducts));
      
      for (const item of items) {
        if (!updatedProducts[item.id]) {
          console.warn(`Product ${item.id} not found.`);
          continue;
        }
        
        const currentQty = updatedProducts[item.id].quantity || 0;
        if (currentQty < item.quantity) {
          // NOT ENOUGH STOCK! Abort transaction.
          console.warn(`Insufficient stock for ${updatedProducts[item.id].name}: ${currentQty} < ${item.quantity}`);
          return; 
        }
        
        // Deduct quantity
        updatedProducts[item.id].quantity = currentQty - item.quantity;
      }
      
      return updatedProducts;
    });

    if (result.committed) {
      console.log('Stock atomically updated for all items');
      // Update local productQuantities for immediate UI response if needed
      // (Though onValue listener will eventually update it)
      items.forEach(item => {
        if (productQuantities[item.id]) {
          productQuantities[item.id] -= item.quantity;
        }
      });
      return true;
    } else {
      console.error('Stock transaction aborted: Insufficient stock for one or more items.');
      throw new Error('Some items in your cart are no longer available in the requested quantity. Please refresh and try again.');
    }
  } catch (error) {
    console.error('Error during stock transaction:', error);
    throw error;
  }
}

function addToCart(productId, quantity = 1, engraving = '') {
  // Check if product has sufficient stock
  const availableQty = getProductQuantity(productId);
  
  if (availableQty === 0) {
    alert('This product is out of stock.');
    return;
  }
  
  if (quantity > availableQty) {
    alert(`Only ${availableQty} units available. Adding maximum available quantity.`);
    quantity = availableQty;
  }
  
  const existing = cart.find(item => item.id === productId && (item.engraving || '') === engraving);
  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > availableQty) {
      alert(`Only ${availableQty} units available. Current cart has ${existing.quantity}.`);
      existing.quantity = availableQty;
    } else {
      existing.quantity = newQty;
    }
  } else {
    // Fetch product from global or pass product
    cart.push({id: productId, quantity, engraving});
  }
  localStorage.setItem('staccs-cart', JSON.stringify(cart));
  updateCartUI();
}

// Expose globally to be compatible with type="module"
window.addToCart = addToCart;

function getSavedProducts() {
  // Use allProducts from script.js if available, otherwise load from localStorage
  if (typeof allProducts !== 'undefined' && allProducts.length > 0) {
    return allProducts;
  }
  
  // Fallback to localStorage
  const raw = localStorage.getItem('STACCS_DATA');
  return raw ? JSON.parse(raw) : [];
}

function getCartProducts() {
  const storeProducts = getSavedProducts();
  return cart.map(item => {
    const prod = storeProducts.find(p => p.id === item.id) || { id: item.id, name: 'Unknown', price: 0, image: '' };
    return { ...prod, quantity: item.quantity, engraving: item.engraving || '' };
  });
}

function calculateSubtotal() {
  return getCartProducts().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function formatEGP(value) {
  return Number(value).toFixed(2);
}

function updateCheckoutTotals() {
  const subtotal = calculateSubtotal();
  const gov = document.getElementById('governorate')?.value || '';

  const shipping = dynamicShippingRates[gov] || 0;
  const discountPercent = (window.appliedVoucher || 0);
  const discount = +(subtotal * (discountPercent / 100)).toFixed(2);
  const total = Math.max(0, subtotal + shipping - discount);

  const subtotalElem = document.getElementById('cart-subtotal');
  const shippingElem = document.getElementById('shipping-cost');
  const discountElem = document.getElementById('discount-value');
  const totalElem = document.getElementById('total-value');

  if (subtotalElem) subtotalElem.textContent = formatEGP(subtotal);
  if (shippingElem) shippingElem.textContent = formatEGP(shipping);
  if (discountElem) discountElem.textContent = formatEGP(discount);
  if (totalElem) totalElem.textContent = formatEGP(total);

  return { subtotal, shipping, discount, total, discountPercent };
}

function renderCartItems() {
  const cartItemsContainer = document.getElementById('cart-items');
  if (!cartItemsContainer) return;

  const items = getCartProducts();

  if (!items.length) {
    cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
  } else {
    cartItemsContainer.innerHTML = items.map(item => {
      const img = (item.images && item.images[0]) || item.image || 'https://placehold.co/50x50?text=No+Img';
      return `
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 1rem; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 12px; border: 1px solid var(--border);">
          <img src="${img}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(201, 169, 94, 0.3);" onerror="this.src='https://placehold.co/100x100?text=404';">
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <strong style="color: var(--text-primary); font-size: 0.95rem;">${item.name}</strong>
              <span style="color: var(--accent); font-weight: 700; font-size: 0.95rem;">EGP ${formatEGP(item.price * item.quantity)}</span>
            </div>
            ${item.engraving ? `<div style="color: var(--accent); font-size: 0.75rem; margin-top: 2px; font-weight: 600;">Custom: "${item.engraving}"</div>` : ''}
            <div style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 4px;">Qty: ${item.quantity}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  const cartCount = document.getElementById('cart-count');
  if (cartCount) cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

  updateCheckoutTotals();
}

function updateCartUI() {
  renderCartItems();
}

function clearCart() {
  cart = [];
  localStorage.removeItem('staccs-cart');
  updateCartUI();
}

// Retrieve orders from Firebase
async function getOrderStore() {
  try {
    // Note: This function retrieves orders from Firebase Realtime Database
    // For display purposes, you would need to implement a separate function
    // that sets up an onValue listener similar to the admin panel
    console.log('Use loadOrders() from admin panel to fetch orders in real-time');
    return [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

async function saveOrder(order) {
  try {
    // Save to Firebase using push() to the 'orders' path (lowercase)
    const ordersRef = ref(db, 'orders');
    await push(ordersRef, order);
    console.log('Order saved to Firebase', order);
    return true;
  } catch (error) {
    console.error('Error saving order to Firebase:', error);
    throw error;
  }
}

function applyVoucher() {
  const code = document.getElementById('voucher-code')?.value.trim().toUpperCase();
  const validVouchers = {
    STACCS10: 10,
    STACCS15: 15,
    STACCS20: 20
  };

  window.appliedVoucher = validVouchers[code] || 0;
  if (window.appliedVoucher > 0) {
    alert(`Voucher applied: ${window.appliedVoucher}% off`);
  } else {
    alert('Voucher not valid. Use STACCS10, STACCS15 or STACCS20.');
  }

  updateCheckoutTotals();
}

function placeOrder() {
  if (!cart.length) {
    alert('Cart is empty.');
    return;
  }

  const name = document.getElementById('customer-name')?.value.trim();
  const address = document.getElementById('customer-address')?.value.trim();
  const phone = document.getElementById('customer-phone')?.value.trim();

  if (!name || !address || !phone) {
    alert('Please fill in name, address, and phone.');
    return;
  }

  // Validate stock before placing order
  if (!validateCartStock()) {
    alert('Some items in your cart are no longer available in the requested quantity. Please update your cart and try again.');
    clearCart();
    updateCartUI();
    return;
  }

  const totals = updateCheckoutTotals();
  const items = getCartProducts();

  const order = {
    id: Date.now(),
    customer: { name, address, phone, governorate: document.getElementById('governorate')?.value || '' },
    items,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    discount: totals.discount,
    voucher: document.getElementById('voucher-code')?.value.trim().toUpperCase() || '',
    total: totals.total,
    status: 'new',
    createdAt: new Date().toISOString()
  };

  // 1. ATTEMPT STOCK DEDUCTION FIRST (ATOMIC)
  // This ensures no over-ordering happens across different clients
  updateProductQuantitiesAfterOrder(items)
    .then(() => {
      // 2. ONLY IF STOCK DEDUCTION SUCCEEDS, SAVE THE ORDER
      return saveOrder(order);
    })
    .then(() => {
      // 3. COMPLETE SUCCESS
      clearCart();
      if (typeof window.updateOrdersCount === 'function') {
        window.updateOrdersCount();
      }
      alert('Order placed successfully! Thank you for your purchase.');
      
      // Close cart modal
      const cartModal = document.getElementById('cart-modal');
      if (cartModal) cartModal.classList.remove('active');
      
      // Clear checkout form fields
      if (document.getElementById('customer-name')) document.getElementById('customer-name').value = '';
      if (document.getElementById('customer-address')) document.getElementById('customer-address').value = '';
      if (document.getElementById('customer-phone')) document.getElementById('customer-phone').value = '';
      if (document.getElementById('voucher-code')) document.getElementById('voucher-code').value = '';
      window.appliedVoucher = 0;
      
      // Refresh product display to show updated stock
      if (typeof renderProducts === 'function') {
        renderProducts('all');
      }
    })
    .catch(error => {
      console.error('Order placement failed:', error);
      alert('Failed to place order: ' + error.message);
      
      // If stock check failed, we might want to refresh products to show current quantities
      if (typeof renderProducts === 'function') {
        renderProducts('all');
      }
    });
}

function checkout() {
  // Checkout path now handled by local cart/checkout form
  updateCartUI();
  alert('Use the fields in cart modal to apply shipping/voucher and place order.');
}

// Events
const govSelect = document.getElementById('governorate');
if (govSelect) govSelect.addEventListener('change', updateCheckoutTotals);
const voucherBtn = document.getElementById('apply-voucher-btn');
if (voucherBtn) voucherBtn.addEventListener('click', applyVoucher);
const placeOrderBtn = document.getElementById('place-order-btn');
if (placeOrderBtn) placeOrderBtn.addEventListener('click', placeOrder);

/* --- Order Tracking Functionality --- */
async function trackLatestOrder() {
  const phone = document.getElementById('track-phone')?.value.trim();
  const trackResult = document.getElementById('track-result');
  
  if (!phone) {
    alert('Please enter your mobile number.');
    return;
  }

  // Visual feedback while loading
  trackResult.innerHTML = '<div style="color: var(--accent); font-weight: 600; text-align: center; padding: 1rem;">Searching for your order...</div>';

  try {
    const ordersRef = ref(db, 'orders');
    
    // Fetch all orders and filter on client side (safe for small to medium shops)
    // Note: phone is nested as customer/phone
    const snapshot = await get(ordersRef);
    
    if (snapshot.exists()) {
      const orders = [];
      const data = snapshot.val();
      
      for (const [key, o] of Object.entries(data)) {
        if (o.customer && o.customer.phone === phone) {
          orders.push({ ...o, firebaseKey: key });
        }
      }

      if (orders.length === 0) {
        trackResult.innerHTML = '<div class="no-order-msg">Sorry, there are no orders registered with this number.</div>';
        return;
      }

      // Find the latest order by date
      const latestOrder = orders.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      })[0];
      
      renderTrackingStepper(latestOrder);
    } else {
      trackResult.innerHTML = '<div class="no-order-msg">Sorry, there are no orders registered with this number.</div>';
    }
  } catch (error) {
    console.error('Tracking error:', error);
    trackResult.innerHTML = '<div style="color: #ef4444; text-align: center;">Error fetching tracking data. Please check your connection.</div>';
  }
}

function renderTrackingStepper(order) {
  const trackResult = document.getElementById('track-result');
  if (!trackResult) return;

  const statusMap = {
    'new': 1,
    'preparation': 2,
    'delivery': 3,
    'completed': 4,
    'cancelled': -1
  };

  const currentStep = statusMap[order.status] || 1;
  
  // Handle cancelled orders separately
  if (order.status === 'cancelled') {
    trackResult.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; padding: 1.5rem; border-radius: 12px; margin-top: 1rem;">
        <h3 style="color: #ef4444; margin-bottom: 0.5rem; font-size: 1.1rem;">Order Cancelled</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">This order (#${order.id}) has been cancelled. Please contact our WhatsApp support for more information.</p>
      </div>
    `;
    return;
  }

  const steps = [
    { label: 'Received', icon: '📥' },
    { label: 'Preparing', icon: '⚒️' },
    { label: 'With Courier', icon: '🚚' },
    { label: 'Delivered', icon: '✅' }
  ];

  const stepperHtml = `
    <div style="margin-top: 1rem;">
      <p style="margin-bottom: 1.5rem; font-weight: 500; font-size: 0.9rem;">Status for Order <strong>#${order.id}</strong></p>
      <div class="stepper">
        ${steps.map((step, index) => {
          const stepNum = index + 1;
          let stepClass = 'step';
          if (stepNum < currentStep) stepClass += ' completed';
          if (stepNum === currentStep) stepClass += ' active';
          
          return `
            <div class="${stepClass}">
              <div class="step-circle">${stepNum < currentStep ? '✓' : stepNum}</div>
              <div class="step-label">${step.label}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  trackResult.innerHTML = stepperHtml;
}

// Global hook for tracking button
const trackBtn = document.getElementById('track-btn');
if (trackBtn) trackBtn.addEventListener('click', trackLatestOrder);

// Allow Enter key to trigger tracking
const trackInput = document.getElementById('track-phone');
if (trackInput) {
  trackInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') trackLatestOrder();
  });
}

/* --- DYNAMIC SHIPPING RATES --- */
async function loadDynamicShippingRates() {
  const ratesRef = ref(db, 'shipping_rates');
  onValue(ratesRef, (snapshot) => {
    if (snapshot.exists()) {
      dynamicShippingRates = snapshot.val();
      populateGovernorateSelect();
      updateCheckoutTotals();
      console.log('Dynamic shipping rates loaded:', dynamicShippingRates);
    } else {
      console.warn('No shipping rates found in Firebase.');
    }
  });
}

function populateGovernorateSelect() {
  const select = document.getElementById('governorate');
  if (!select) return;

  const currentValue = select.value;
  const sortedGovs = Object.keys(dynamicShippingRates).sort((a, b) => a.localeCompare(b));
  
  if (sortedGovs.length > 0) {
    select.innerHTML = '<option value="">Choose Governorate</option>' + 
      sortedGovs.map(gov => `<option value="${gov}" ${gov === currentValue ? 'selected' : ''}>${gov}</option>`)
        .join('');
  }
}

/* --- DYNAMIC CONTACT LINKS --- */
async function loadDynamicContactLinks() {
  const linksRef = ref(db, 'contact_links');
  onValue(linksRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const links = Array.isArray(data) ? data : Object.values(data);
      
      // 1. Populate Main Contact Section Grid
      const container = document.getElementById('contact-links-container');
      if (container) {
        container.innerHTML = links.map(item => `
          <div class="contact-card" style="background: var(--bg-secondary); border: 2px solid var(--border); padding: 2rem; border-radius: 15px; text-align: center; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-5px)'; this.style.borderColor='var(--accent)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border)';">
            <h3 style="color: var(--accent); margin-bottom: 1rem; font-size: 1.25rem;">${item.name}</h3>
            <p style="margin-bottom: 1.5rem; color: var(--text-secondary); font-size: 0.9rem;">Find us on ${item.name}</p>
            <a href="${item.link}" target="_blank" class="cta-btn" style="padding: 0.8rem 1.5rem; text-decoration: none; font-size: 0.9rem; display: inline-block;">
              Visit ${item.name}
            </a>
          </div>
        `).join('');
      }

      // 2. Populate Footer Mini Social Links
      const footerSocial = document.getElementById('footer-social-links');
      if (footerSocial) {
        footerSocial.innerHTML = links.map(item => `
          <a href="${item.link}" target="_blank" class="social-link" title="${item.name}">${item.name}</a>
        `).join('');
      }
    }
  });
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  loadDynamicShippingRates();
  loadProductQuantities();
  loadDynamicContactLinks();
});

