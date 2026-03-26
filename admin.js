import { db, ref, set, push, onValue, remove, auth, update } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// --- SECURITY GUARD & PROTECTION ---
// Prevent offline/unauthorized access to Dashboard page
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Kicks unauthorized users immediately out of this page
    window.location.replace('login.html');
  } else {
    // Once authenticated by Firebase, reveal UI if it was initially hidden by classes
    const dash = document.getElementById('admin-dashboard');
    if (dash) dash.classList.add('logged-in');
  }
});

let products = [];

async function loadProducts() {
  const productsRef = ref(db, 'products');
  onValue(productsRef, (snapshot) => {
    products = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const [key, p] of Object.entries(data)) {
        products.push({ ...p, firebaseKey: key });
      }
      console.log('Products loaded from Firebase');
    } else {
      console.log('No products found in Firebase');
    }
    renderProducts();
    // Update dashboard stats when products change
    updateDashboardStats();
  });
}
window.loadProducts = loadProducts;

async function saveProducts() {
  // Save products handled via push/set individually now
}
window.saveProducts = saveProducts;

function renderProducts() {
  const list = document.getElementById('product-list');
  if (!list) return;
  
  if (products.length === 0) {
    list.innerHTML = '<div style="padding: 1rem; text-align: center;">No products found. Start adding some!</div>';
    return;
  }

  list.innerHTML = products.map(p => {
    const quantity = p.quantity || 0;
    const isOutOfStock = quantity === 0;
    const isLowStock = quantity < 3 && !isOutOfStock;
    
    let containerStyle = '';
    let stockBadge = '';
    
    if (isOutOfStock) {
      containerStyle = `background: linear-gradient(135deg, rgba(31, 41, 55, 0.4), rgba(17, 24, 39, 0.6)); border: 2px solid #374151; opacity: 0.8;`;
      stockBadge = `<span style="background: #374151; color: #f3f4f6; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">🚫 Out of Stock</span>`;
    } else if (isLowStock) {
      containerStyle = `background: linear-gradient(135deg, rgba(254, 226, 226, 0.1), rgba(254, 202, 202, 0.15)); border: 2px solid #ef4444; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.15);`;
      stockBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">⚠️ Low Stock</span>`;
    } else {
      containerStyle = `background: var(--bg-secondary); border: 2px solid var(--border);`;
      stockBadge = `<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">In Stock: ${quantity}</span>`;
    }

    return `
    <div class="product-item" style="${containerStyle} border-radius: 12px; transition: all 0.3s ease; position: relative; overflow: hidden;">
      ${isLowStock || isOutOfStock ? `<div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${isOutOfStock ? '#374151' : '#ef4444'};"></div>` : ''}
      <div style="display: flex; gap: 1.2rem; align-items: center; flex: 1; padding: 1rem;">
        ${(p.images && p.images[0]) || p.image ? 
          `<div style="position: relative; width: 70px; height: 70px; flex-shrink: 0;">
            <img src="${(p.images && p.images[0]) || p.image}" onerror="this.onerror=null; this.src='https://placehold.co/80x80?text=404';" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px; border: 2px solid var(--border); box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            ${p.images && p.images.length > 1 ? `<span style="position: absolute; bottom: -8px; right: -8px; background: var(--accent); color: #000; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 50px; border: 2px solid var(--bg-primary); box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 2;">${p.images.length}</span>` : ''}
          </div>` : 
          '<div style="width: 70px; height: 70px; background: var(--bg-tertiary); border-radius: 10px; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 1.5rem; flex-shrink: 0;">📷</div>'
        }
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
            <strong style="font-size: 1.1rem; color: var(--text-primary);">${p.name}</strong>
            <span style="font-weight: 700; color: var(--accent); font-size: 1rem;">EGP ${p.price}</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.8rem; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${p.description || 'No description available'}</p>
          <div style="display: flex; gap: 0.8rem; align-items: center;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-tertiary); padding: 0.2rem 0.6rem; border-radius: 4px;">${p.category}</span>
            ${stockBadge}
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; padding: 1rem; border-top: 1px solid var(--border); background: rgba(0,0,0,0.05);">
        <button style="flex: 1; padding: 0.6rem; border-radius: 8px;" onclick="editProduct('${p.firebaseKey}')">Edit</button>
        <button class="delete" style="flex: 1; padding: 0.6rem; border-radius: 8px;" onclick="deleteProduct('${p.firebaseKey}')">Delete</button>
      </div>
    </div>
  `
  }).join('');
}

let currentOrders = [];

// Real-time Order Management with Firebase RTDB
async function loadOrders() {
  const ordersRef = ref(db, 'orders');
  
  onValue(ordersRef, (snapshot) => {
    const previousOrderKeys = new Set(seenOrderKeys);
    const newOrders = [];

    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const [key, order] of Object.entries(data)) {
        newOrders.push({ ...order, firebaseKey: key });

        // Detect NEW orders (arrived after initial load)
        if (isInitialLoadComplete && !previousOrderKeys.has(key) && order.status === 'new') {
          // This is a newly arrived order - trigger notification
          const customerName = order.customer?.name || 'Customer';
          const orderTotal = order.total || 0;
          
          // Play sound and show toast
          if (window.notificationSoundUrl) {
            playNotificationSound(window.notificationSoundUrl);
          }
          showOrderNotification(customerName, orderTotal);
          
          console.log('New order notification triggered:', { customerName, orderTotal });
        }

        // Mark this order as seen
        seenOrderKeys.add(key);
      }
      
      currentOrders = newOrders;

      // Feature: Sort Newest to Oldest (by placed_at / createdAt)
      currentOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      // Mark initial load as complete after first data load
      if (!isInitialLoadComplete) {
        isInitialLoadComplete = true;
        console.log('Initial order load complete. Future notifications will show for new orders.');
      }

      console.log('Orders synced in real-time from Firebase');
    } else {
      console.log('No orders found in Firebase');
    }
    
    // Apply current UI filters/search if any or just render all
    renderOrders(currentOrders);
    updateStatusCounters(currentOrders);
    // Update dashboard stats in real-time
    updateDashboardStats();
  });
}
window.loadOrders = loadOrders;

// ==================== STATS DASHBOARD FUNCTIONS ====================
// Calculate and update all dashboard stats in real-time
function updateDashboardStats() {
  // Calculate Total Revenue (sum of totals for completed orders)
  let totalRevenue = 0;
  currentOrders.forEach(order => {
    if (order.status === 'completed') {
      totalRevenue += (order.total || 0);
    }
  });

  // Count New Orders
  let newOrdersCount = 0;
  currentOrders.forEach(order => {
    if (order.status === 'new') {
      newOrdersCount += 1;
    }
  });

  // Count Total Products
  let totalProducts = 0;
  if (products && products.length > 0) {
    totalProducts = products.length;
  }

  // Calculate Success Rate (completed / (completed + cancelled))
  let completedCount = 0;
  let cancelledCount = 0;
  currentOrders.forEach(order => {
    if (order.status === 'completed') {
      completedCount += 1;
    } else if (order.status === 'cancelled') {
      cancelledCount += 1;
    }
  });
  
  const totalCompletedAndCancelled = completedCount + cancelledCount;
  const successRate = totalCompletedAndCancelled > 0 
    ? Math.round((completedCount / totalCompletedAndCancelled) * 100) 
    : 0;

  // Update DOM elements
  const revenueElem = document.getElementById('stat-revenue');
  const newOrdersElem = document.getElementById('stat-new-orders');
  const productsElem = document.getElementById('stat-products');
  const successRateElem = document.getElementById('stat-success-rate');

  if (revenueElem) revenueElem.textContent = `EGP ${totalRevenue.toFixed(2)}`;
  if (newOrdersElem) newOrdersElem.textContent = newOrdersCount;
  if (productsElem) productsElem.textContent = totalProducts;
  if (successRateElem) successRateElem.textContent = `${successRate}%`;

  console.log('Dashboard stats updated:', { totalRevenue, newOrdersCount, totalProducts, successRate });
}

// Call updateDashboardStats when stats are needed
window.updateDashboardStats = updateDashboardStats;

// ==================== NEW ORDER NOTIFICATION SYSTEM ====================
// Track which orders we've already seen to avoid notifying on initial load
let seenOrderKeys = new Set();
let isInitialLoadComplete = false;

// Show toast notification in the corner
function showOrderNotification(customerName, orderTotal) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon">🎉</div>
    <div class="toast-content">
      <div class="toast-title">New Order from ${customerName}</div>
      <div class="toast-message">Order Total: EGP ${orderTotal.toFixed(2)}</div>
    </div>
  `;

  container.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Play notification sound
function playNotificationSound(audioUrl) {
  try {
    const audioElement = document.getElementById('notification-sound');
    if (audioElement) {
      audioElement.src = audioUrl;
      audioElement.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

// Set the notification sound URL (user will provide this)
window.setNotificationSound = function(audioUrl) {
  window.notificationSoundUrl = audioUrl;
};

// Default notification sound URL (empty, user can set via setNotificationSound)
window.notificationSoundUrl = '';

// Feature: Search functionality (Search by phone or order number)
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderOrders(currentOrders);
      return;
    }
    
    const filtered = currentOrders.filter(o => {
      const phone = (o.customer?.phone || '').toLowerCase();
      const id = (o.id || '').toString().toLowerCase();
      const name = (o.customer?.name || '').toLowerCase();
      return phone.includes(term) || id.includes(term) || name.includes(term);
    });
    renderOrders(filtered);
  });
}

function renderOrders(ordersToRender) {
  const container = document.getElementById('orders-list');
  if (!container) return;

  if (!ordersToRender || ordersToRender.length === 0) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center; background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border);">No matching orders found.</div>';
    return;
  }

  container.innerHTML = ordersToRender.map(order => {
    const items = order.items.map(i => `
      <li style="margin-bottom: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
        <strong>${i.name}</strong> × ${i.quantity} (EGP ${i.price})
        ${i.engraving ? `<br><span style="color: var(--accent); font-size: 0.85em;">Engraving: "${i.engraving}"</span>` : ''}
      </li>
    `).join('');

    return `
      <div class="order-card" style="border-left: 5px solid ${getStatusColor(order.status)};">
        <div class="order-card-header">
          <div>
            <div class="order-id">Order ID: #${order.id}</div>
            <small style="color: var(--text-secondary);">${new Date(order.createdAt).toLocaleString()}</small>
          </div>
          
          <!-- Feature: Select Menu for Status Change with Display-friendly Labels -->
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <select onchange="updateOrderStatus('${order.firebaseKey}', this.value)" style="padding: 0.5rem; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); cursor: pointer; font-weight: 500;">
              <option value="new" ${order.status === 'new' ? 'selected' : ''}>New</option>
              <option value="preparation" ${order.status === 'preparation' ? 'selected' : ''}>In Preparation</option>
              <option value="delivery" ${order.status === 'delivery' ? 'selected' : ''}>Out for Delivery</option>
              <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <div class="order-status-badge status-${order.status || 'new'}" style="white-space: nowrap;">${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ') : 'New'}</div>
          </div>
        </div>

        <div class="order-details">
          <div>
            <p><strong>👤 ${order.customer?.name || 'N/A'}</strong></p>
            <p>📞 ${order.customer?.phone || 'N/A'}</p>
            <p>📍 ${order.customer?.governorate || 'N/A'}, ${order.customer?.address || 'N/A'}</p>
          </div>
          <div style="text-align: right;">
            <p>Subtotal: EGP ${order.subtotal}</p>
            <p>Shipping: EGP ${order.shipping}</p>
            <p style="font-size: 1.2rem; font-weight: 700; color: var(--accent); margin-top: 5px;">Total: EGP ${order.total}</p>
          </div>
        </div>

        <div class="order-items">
          <details>
            <summary style="cursor: pointer; padding: 5px; color: var(--accent);">📦 View Items (${order.items.length})</summary>
            <ul style="list-style: none; padding: 10px; margin: 0;">${items}</ul>
          </details>
        </div>

        <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end;">
          <!-- Feature: Print Receipt Button -->
          <button onclick="printOrderReceipt('${order.firebaseKey}')" style="background: #4b5563; color: white; padding: 0.6rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(75, 85, 99, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">🖨️ Print Receipt</button>
          
          <!-- Feature: Delete Button with Trash Icon -->
          <button onclick="deleteOrder('${order.firebaseKey}')" style="background: #dc2626; color: white; padding: 0.6rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(220, 38, 38, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function getStatusColor(status) {
  switch (status) {
    case 'new': return '#3b82f6';
    case 'preparation': return '#f59e0b';
    case 'delivery': return '#10b981';
    case 'completed': return '#059669';
    case 'cancelled': return '#ef4444';
    default: return '#555';
  }
}

// Feature: Update Order Status in Firebase using update() for efficiency
window.updateOrderStatus = async (key, newStatus) => {
  try {
    await update(ref(db, `orders/${key}`), { status: newStatus });
    console.log(`Order ${key} status updated to ${newStatus}`);
  } catch (e) {
    alert('Failed to update status: ' + e.message);
  }
};

// Feature: Delete Order from Database with Confirmation
window.deleteOrder = async (key) => {
  const order = currentOrders.find(o => o.firebaseKey === key);
  const orderInfo = order ? `Order #${order.id}` : 'This order';
  
  if (confirm(`Are you sure you want to permanently delete ${orderInfo}? This action cannot be undone.`)) {
    try {
      await remove(ref(db, `orders/${key}`));
      console.log(`Order ${key} deleted successfully.`);
    } catch (e) {
      alert('Failed to delete order: ' + e.message);
    }
  }
};

// Feature: Print Formatted Receipt
window.printOrderReceipt = (key) => {
  const order = currentOrders.find(o => o.firebaseKey === key);
  if (!order) return;

  const printWindow = window.open('', '_blank');
  const itemsHtml = order.items.map(i => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${i.name} ${i.engraving ? `<br><small>Engraving: ${i.engraving}</small>` : ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${i.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">EGP ${i.price}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt - Order #${order.id}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
          .receipt-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .details { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f3f4f6; padding: 10px; text-align: left; }
          .total-section { text-align: right; font-size: 1.2rem; }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <h1>STACCS STORE</h1>
          <p>Order Receipt - #${order.id}</p>
          <p>${new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div class="details">
          <div>
            <h3>Customer Info</h3>
            <p><strong>Name:</strong> ${order.customer.name}</p>
            <p><strong>Phone:</strong> ${order.customer.phone}</p>
            <p><strong>Address:</strong> ${order.customer.governorate}, ${order.customer.address}</p>
          </div>
          <div style="text-align: right;">
            <h3>Order Stats</h3>
            <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="total-section">
          <p>Subtotal: EGP ${order.subtotal}</p>
          <p>Shipping: EGP ${order.shipping}</p>
          <p><strong>TOTAL: EGP ${order.total}</strong></p>
        </div>
        <div style="margin-top: 50px; text-align: center; color: #777;">
          <p>Thank you for shopping with Staccs!</p>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

function updateStatusCounters(orders) {
  // Count orders by status
  const statuses = { new: 0, preparation: 0, delivery: 0, completed: 0, cancelled: 0 };
  orders.forEach(o => { 
    const status = o.status || 'new';
    statuses[status] = (statuses[status] || 0) + 1; 
  });

  // Update the counters in the UI
  const cards = document.querySelectorAll('.status-card');
  if (cards.length >= 6) {
    cards[0].querySelector('.status-count').textContent = orders.length; // All
    cards[1].querySelector('.status-count').textContent = statuses.new || 0; // New
    cards[2].querySelector('.status-count').textContent = statuses.preparation || 0; // In Preparation
    cards[3].querySelector('.status-count').textContent = statuses.delivery || 0; // Out for Delivery
    cards[4].querySelector('.status-count').textContent = statuses.completed || 0; // Completed
    cards[5].querySelector('.status-count').textContent = statuses.cancelled || 0; // Cancelled
  }
}

window.filterByStatus = (status) => {
  const cards = document.querySelectorAll('.status-card');
  cards.forEach(card => card.classList.remove('active'));

  // Find and highlight the clicked card
  if (status === 'all') {
    cards[0].classList.add('active');
  } else {
    // Find the card that corresponds to this status
    cards.forEach((card, index) => {
      const statusLabels = {
        'new': 1,
        'preparation': 2,
        'delivery': 3,
        'completed': 4,
        'cancelled': 5
      };
      if (statusLabels[status] === index) {
        card.classList.add('active');
      }
    });
  }

  // Filter and render orders
  let filtered;
  if (status === 'all') {
    filtered = currentOrders;
  } else {
    filtered = currentOrders.filter(o => (o.status || 'new') === status);
  }
  
  renderOrders(filtered);
};

// Keep old function but now final logic supports dynamic orders.
window.filterByTime = (period) => {
  const buttons = document.querySelectorAll('.time-filter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  const e = window.event;
  if (e && e.target) {
    e.target.classList.add('active');
  }
  alert(`Filtering reports by time period: ${period.charAt(0).toUpperCase() + period.slice(1)}`);
};

/* --- HIGH-COMPRESSION BASE64 SYSTEM --- */
async function compressImageToBase64(file, maxWidth = 600, quality = 0.5) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Output compressed Base64 string directly
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

async function processImages(files) {
  const status = document.getElementById('upload-status');
  const text = document.getElementById('upload-text');
  if (status) {
    status.style.display = 'flex';
    status.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  const results = [];
  try {
    for (let i = 0; i < files.length; i++) {
      if (text) text.innerText = `Optimizing ${i + 1}/${files.length}...`;
      const b64 = await compressImageToBase64(files[i]);
      results.push(b64);
    }
    return results;
  } catch (error) {
    console.error('Compression Failure:', error);
    alert('Failed to optimize photos.');
    return [];
  } finally {
    if (status) status.style.display = 'none';
  }
}

function renderImagePreviews(sources) {
  const container = document.getElementById('image-previews-container');
  if (!container) return;
  container.innerHTML = '';
  
  sources.forEach(src => {
    const previewDiv = document.createElement('div');
    previewDiv.style.cssText = 'width: 70px; height: 70px; border-radius: 10px; border: 2px solid var(--border); overflow: hidden; position: relative;';
    
    const img = document.createElement('img');
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    
    previewDiv.appendChild(img);
    container.appendChild(previewDiv);
  });
}

function addOrUpdateProduct(firebaseKey = null, data) {
  if (!auth.currentUser) return alert('Cannot perform operation: Unauthorized.');
  
  const targetRef = firebaseKey ? ref(db, `products/${firebaseKey}`) : push(ref(db, 'products'));
  
  set(targetRef, data)
    .then(() => {
      alert(firebaseKey ? 'Product Optimized & Updated!' : 'New Product Added Successfully!');
      resetProductForm();
    })
    .catch(e => alert('Database Error: ' + e.message));
}

function resetProductForm() {
  const form = document.getElementById('product-form');
  if (form) form.reset();
  
  document.getElementById('product-id').value = '';
  document.getElementById('image-previews-container').innerHTML = '';
}

const productForm = document.getElementById('product-form');
if (productForm) {
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firebaseKey = document.getElementById('product-id').value || null;
    const fileInput = document.getElementById('image');
    
    let finalUrls = [];
    
    // If new files selected, process them to highly compressed Base64
    if (fileInput.files.length > 0) {
      finalUrls = await processImages(fileInput.files);
    } else if (firebaseKey) {
      // Re-use current images if no new ones chosen during edit
      const p = products.find(p => p.firebaseKey === firebaseKey);
      finalUrls = p ? (p.images || [p.image].filter(Boolean)) : [];
    }

    if (finalUrls.length === 0) {
      return alert('Error: Product must have at least one image.');
    }

    const data = {
      category: document.getElementById('category').value,
      name: document.getElementById('name').value,
      price: parseFloat(document.getElementById('price').value),
      quantity: parseInt(document.getElementById('quantity').value) || 0,
      images: finalUrls, // Storage array
      description: document.getElementById('description').value,
      lastUpdated: new Date().toISOString()
    };
    
    addOrUpdateProduct(firebaseKey, data);
  });
  
  // Live Preview functionality
  document.getElementById('image')?.addEventListener('change', (e) => {
    renderImagePreviews(Array.from(e.target.files));
  });
}

window.editProduct = (firebaseKey) => {
  const p = products.find(p => p.firebaseKey === firebaseKey);
  if (!p) return;

  document.getElementById('product-id').value = p.firebaseKey;
  document.getElementById('category').value = p.category;
  document.getElementById('name').value = p.name;
  document.getElementById('price').value = p.price;
  document.getElementById('quantity').value = p.quantity || 0;
  document.getElementById('description').value = p.description || '';
  
  // Show existing images
  renderImagePreviews(p.images || [p.image].filter(Boolean));
  
  // Scroll to form for immediate editing
  if (typeof scrollToForm === 'function') scrollToForm();
};

window.deleteProduct = async (firebaseKey) => {
  if (confirm('Delete this product?')) {
    await remove(ref(db, `products/${firebaseKey}`));
  }
};

// Global Logout Button Listener
document.querySelectorAll('.logout-btn').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await signOut(auth);
      // Let onAuthStateChanged handle the actual boot out via snapshot change
    } catch (e) {
      console.error('Logout failed:', e);
    }
  });
});

// Initialize when page loads
window.addEventListener('load', () => {
  // Initialize Firebase database if needed
  if (typeof window.initializeDatabase === 'function') {
    window.initializeDatabase();
  }
  window.loadProducts();
});

// --- SHIPPING MANAGEMENT ---
let shippingRates = {};

async function loadShippingRates() {
  const ratesRef = ref(db, 'shipping_rates');
  onValue(ratesRef, (snapshot) => {
    if (snapshot.exists()) {
      shippingRates = snapshot.val();
    } else {
      // Default initial rates for Egypt
      shippingRates = {
        'Cairo': 50,
        'Giza': 50,
        'Alexandria': 45,
        'Ismailia': 35,
        'Port Said': 40,
        'Suez': 40,
        'Delta': 55,
        'Fayoum': 60,
        'Upper Egypt': 75
      };
      // Initialize Firebase with defaults if empty
      set(ratesRef, shippingRates);
    }
    renderShippingRatesTable();
  });
}

function renderShippingRatesTable() {
  const tbody = document.getElementById('shipping-rates-table-body');
  if (!tbody) return;

  tbody.innerHTML = Object.entries(shippingRates)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([gov, price]) => `
    <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;">
      <td style="padding: 1rem; color: var(--text-primary); font-weight: 600;">${gov}</td>
      <td style="padding: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: var(--text-secondary); font-size: 0.8rem;">EGP</span>
          <input type="number" value="${price}" class="shipping-rate-input" data-gov="${gov}" 
                 onchange="updateLocalGovPrice('${gov}', this.value)"
                 style="width: 100px; padding: 0.6rem; border-radius: 8px; background: var(--bg-primary); color: var(--accent); border: 1px solid var(--border); font-weight: 700;">
        </div>
      </td>
      <td style="padding: 1rem; text-align: center;">
        <button onclick="deleteGovFromTable('${gov}')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; filter: grayscale(1); transition: filter 0.2s;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='grayscale(1)'" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

window.updateLocalGovPrice = (gov, price) => {
  shippingRates[gov] = parseFloat(price) || 0;
};

window.addNewGovToTable = () => {
  const nameInput = document.getElementById('new-gov-name');
  const priceInput = document.getElementById('new-gov-price');
  
  if (!nameInput || !priceInput) return;
  
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value) || 0;

  if (!name) {
    alert('Please enter a governorate name.');
    return;
  }

  // Update existing or add new
  shippingRates[name] = price;
  
  // Clear inputs
  nameInput.value = '';
  priceInput.value = '';
  
  // Sync the table inputs currently visible before re-rendering
  document.querySelectorAll('.shipping-rate-input').forEach(input => {
    const gov = input.getAttribute('data-gov');
    shippingRates[gov] = parseFloat(input.value) || 0;
  });
  
  renderShippingRatesTable();
};

window.deleteGovFromTable = (gov) => {
  if (confirm(`Remove ${gov} from the shipping system?`)) {
    delete shippingRates[gov];
    renderShippingRatesTable();
  }
};

window.openDeliveryModal = () => {
  const modal = document.getElementById('delivery-modal');
  if (modal) {
    modal.classList.add('active');
    loadShippingRates(); // Force refresh data
  }
};

window.saveShippingRates = async () => {
  const inputs = document.querySelectorAll('.shipping-rate-input');
  const updatedRates = {};
  
  inputs.forEach(input => {
    const gov = input.getAttribute('data-gov');
    const price = parseFloat(input.value) || 0;
    updatedRates[gov] = price;
  });

  try {
    await set(ref(db, 'shipping_rates'), updatedRates);
    // Visual feedback
    const btn = document.getElementById('save-shipping-rates-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Updated!';
    btn.style.background = '#10b981';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = 'var(--accent)';
      document.getElementById('delivery-modal')?.classList.remove('active');
    }, 1500);
    
  } catch (error) {
    alert('Failed to save rates: ' + error.message);
  }
};

// Initialize listeners for shipping modal
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('close-delivery-btn')?.addEventListener('click', () => {
    document.getElementById('delivery-modal')?.classList.remove('active');
  });
  
  document.getElementById('save-shipping-rates-btn')?.addEventListener('click', window.saveShippingRates);
});

// --- CONTACT LINKS MANAGEMENT ---
let contactLinks = [];

async function loadContactLinks() {
  const linksRef = ref(db, 'contact_links');
  onValue(linksRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Handle potential object/array format from Firebase
      contactLinks = Array.isArray(data) ? data : Object.values(data);
    } else {
      // Default initial links
      contactLinks = [
        { name: 'WhatsApp', link: 'https://wa.me/201030879711' },
        { name: 'Instagram', link: 'https://instagram.com/staccs.eg' },
        { name: 'Facebook', link: 'https://facebook.com/staccs.eg' }
      ];
      set(linksRef, contactLinks);
    }
    renderContactLinksTable();
  });
}

function renderContactLinksTable() {
  const tbody = document.getElementById('contact-links-table-body');
  if (!tbody) return;

  tbody.innerHTML = contactLinks.map((item, index) => `
    <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;">
      <td style="padding: 1rem; color: var(--text-primary); font-weight: 600;">${item.name}</td>
      <td style="padding: 1rem;">
        <input type="url" value="${item.link}" onchange="updateLocalContactLink(${index}, this.value)" 
               style="width: 100%; padding: 0.6rem; border-radius: 8px; background: var(--bg-primary); color: var(--accent); border: 1px solid var(--border); font-size: 0.85rem; font-family: monospace;">
      </td>
      <td style="padding: 1rem; text-align: center;">
        <button onclick="deleteContactFromTable(${index})" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; filter: grayscale(1); transition: filter 0.2s;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='grayscale(1)'" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

window.updateLocalContactLink = (index, newLink) => {
  if (contactLinks[index]) {
    contactLinks[index].link = newLink;
  }
};

window.addNewContactToTable = () => {
  const nameInput = document.getElementById('new-contact-name');
  const linkInput = document.getElementById('new-contact-link');
  if (!nameInput || !linkInput) return;

  const name = nameInput.value.trim();
  const link = linkInput.value.trim();

  if (!name || !link) {
    alert('Please enter both a platform name and a valid URL.');
    return;
  }

  contactLinks.push({ name, link });
  nameInput.value = '';
  linkInput.value = '';
  renderContactLinksTable();
};

window.deleteContactFromTable = (index) => {
  if (confirm('Remove this contact link?')) {
    contactLinks.splice(index, 1);
    renderContactLinksTable();
  }
};

window.openContactModal = () => {
  const modal = document.getElementById('contact-modal');
  if (modal) {
    modal.classList.add('active');
    loadContactLinks(); // Fetch latest data
  }
};

window.saveContactLinks = async () => {
  try {
    await set(ref(db, 'contact_links'), contactLinks);
    // UI Feedback
    const btn = document.getElementById('save-contact-links-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Updated!';
    btn.style.background = '#10b981';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = 'var(--accent)';
      document.getElementById('contact-modal')?.classList.remove('active');
    }, 1500);
  } catch (error) {
    alert('Failed to save contact links: ' + error.message);
  }
};

// Initialize listeners for contact modal
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('close-contact-btn')?.addEventListener('click', () => {
    document.getElementById('contact-modal')?.classList.remove('active');
  });
  
  document.getElementById('save-contact-links-btn')?.addEventListener('click', window.saveContactLinks);
});

// Final check to make sure globally available
window.openContactModal = openContactModal;
window.saveContactLinks = saveContactLinks;
window.addNewContactToTable = addNewContactToTable;
window.deleteContactFromTable = deleteContactFromTable;
window.updateLocalContactLink = updateLocalContactLink;
