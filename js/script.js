import { db, ref, onValue } from '../firebase-config.js';

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') {
  body.setAttribute('data-theme', 'light');
} else {
  body.removeAttribute('data-theme'); // Default dark
}

themeToggle.addEventListener('click', () => {
  if (body.hasAttribute('data-theme')) {
    body.removeAttribute('data-theme');
    localStorage.setItem('theme', 'dark');
  } else {
    body.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }
});

// E-commerce Logic
let allProducts = [];

async function loadProducts() {
  const productsRef = ref(db, 'products');
  
  onValue(productsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      allProducts = [];
      for (const [key, p] of Object.entries(data)) {
        allProducts.push({ ...p, id: key }); // Assign realtime DB key as the 'id'
      }
      window.allProducts = allProducts;
      renderProducts('all');
    } else {
      allProducts = [];
      renderProducts('all');
    }
  }, (error) => {
    console.error('Firebase fallback error:', error);
    loadProductsFromLocalStorage();
  });
}

function loadProductsFromLocalStorage() {
  // Try loading from localStorage
  const stored = localStorage.getItem('STACCS_DATA');
  if (stored) {
    if (stored.includes('via.placeholder.com')) {
      // Discard stale cached data containing broken URLs
      console.warn('Stale placeholder data found in local storage. Clearing cache...');
      localStorage.removeItem('STACCS_DATA');
      loadProductsFromJSON();
      return;
    }
    try {
      allProducts = JSON.parse(stored);
      window.allProducts = allProducts;
      renderProducts('all');
      // console.log('Products loaded from localStorage');
    } catch (e) {
      console.error('Error parsing localStorage:', e);
      loadProductsFromJSON();
    }
  } else {
    // Fallback to JSON file
    loadProductsFromJSON();
  }
}

function loadProductsFromJSON() {
  // Final fallback to JSON file
  fetch('products.json')
    .then(response => response.json())
    .then(data => {
      allProducts = data;
      window.allProducts = allProducts;
      // Save to localStorage for next time
      localStorage.setItem('STACCS_DATA', JSON.stringify(data));
      renderProducts('all');
      console.log('Products loaded from products.json');
    })
    .catch(e => {
      console.error('Failed to load products:', e);
    });
}


/* --- IMAGE SLIDER / CAROUSEL LOGIC --- */
window.moveSlider = (productId, direction) => {
  const track = document.getElementById(`track-${productId}`);
  const dots = document.querySelectorAll(`#dots-${productId} .slider-dot`);
  if (!track) return;
  
  const slides = track.querySelectorAll('.slider-img');
  const slideCount = slides.length;
  let currentIndex = parseInt(track.dataset.index || '0');
  
  currentIndex += direction;
  if (currentIndex < 0) currentIndex = slideCount - 1;
  if (currentIndex >= slideCount) currentIndex = 0;
  
  track.style.transform = `translateX(-${currentIndex * 100}%)`;
  track.dataset.index = currentIndex;
  
  // Update dots
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentIndex);
  });
};

window.setSliderIndex = (productId, index) => {
  const track = document.getElementById(`track-${productId}`);
  const dots = document.querySelectorAll(`#dots-${productId} .slider-dot`);
  if (!track) return;
  
  track.style.transform = `translateX(-${index * 100}%)`;
  track.dataset.index = index;
  
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === index);
  });
};

function renderProducts(category) {
  const container = document.getElementById('products-container');
  let filtered = allProducts;
  if (category !== 'all') {
    filtered = allProducts.filter(p => p.category === category);
  }
  container.innerHTML = filtered.map(p => {
    const quantity = p.quantity || 0;
    const isOutOfStock = quantity === 0;
    
    // Support both old "image" string and new "images" array
    const images = p.images || [p.image].filter(Boolean);
    const hasMultiple = images.length > 1;
    
    let mediaHtml = '';
    if (hasMultiple) {
      mediaHtml = `
        <div class="product-slider" id="slider-${p.id}">
          <div class="slider-track" id="track-${p.id}" data-index="0">
            ${images.map(img => `<img src="${img}" class="slider-img" onerror="this.onerror=null; this.src='https://placehold.co/400x400?text=404';" alt="${p.name}">`).join('')}
          </div>
          <button class="slider-nav slider-prev" onclick="moveSlider('${p.id}', -1)">❮</button>
          <button class="slider-nav slider-next" onclick="moveSlider('${p.id}', 1)">❯</button>
          <div class="slider-dots" id="dots-${p.id}">
            ${images.map((_, idx) => `<div class="slider-dot ${idx === 0 ? 'active' : ''}" onclick="setSliderIndex('${p.id}', ${idx})"></div>`).join('')}
          </div>
          ${isOutOfStock ? '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.2rem; backdrop-filter: blur(2px); z-index: 5;">OUT OF STOCK</div>' : ''}
        </div>
      `;
    } else {
       mediaHtml = `
        <div style="position: relative; aspect-ratio: 1/1; overflow: hidden; border-radius: 12px; background: #111;">
          <img src="${images[0] || 'https://placehold.co/400x400?text=No+Image'}" class="product-image" style="width: 100%; height: 100%; object-fit: cover; ${isOutOfStock ? 'filter: grayscale(0.8);' : ''}" onerror="this.onerror=null; this.src='https://placehold.co/400x400?text=404';" alt="${p.name}">
          ${isOutOfStock ? '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.2rem; backdrop-filter: blur(2px);">OUT OF STOCK</div>' : ''}
        </div>
       `;
    }

    return `
    <article class="product-card" data-animate style="${isOutOfStock ? 'filter: grayscale(0.2); opacity: 0.9;' : ''}">
      <div style="position: relative;">
        ${mediaHtml}
        <div id="preview-${p.id}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--accent); font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.5rem; text-shadow: 1px 1px 4px rgba(0,0,0,0.8); pointer-events: none; text-align: center; width: 90%; word-wrap: break-word; z-index: 6;"></div>
      </div>
      <div class="product-info">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h3 style="margin: 0; font-size: 1.15rem;">${p.name}</h3>
          <span style="font-weight: 700; color: var(--accent); white-space: nowrap; margin-left: 10px;">EGP ${p.price}</span>
        </div>
        <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${p.description}</p>
        <div style="margin-bottom: 1.2rem; font-size: 0.85rem; font-weight: 500; color: ${isOutOfStock ? '#ef4444' : 'var(--text-secondary)'}; display: flex; align-items: center; gap: 0.4rem;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: ${isOutOfStock ? '#ef4444' : (quantity < 3 ? '#f59e0b' : '#10b981')}; display: inline-block; box-shadow: 0 0 5px ${isOutOfStock ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'};"></span>
          ${isOutOfStock ? 'Fully Out of Stock' : (quantity < 3 ? `Limited Stock: ${quantity} left` : `In Stock: ${quantity}`)}
        </div>
        <button class="buy-btn" onclick="addToCartWithEngraving('${p.id}')" 
          ${isOutOfStock ? 'disabled' : ''} 
          style="${isOutOfStock ? 'background: #374151; color: #9ca3af; cursor: not-allowed; border: 1px solid #4b5563;' : ''}">
          ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
        <div style="margin-top: 1.2rem; background: var(--bg-primary); padding: 5px; border-radius: 10px;">
          <input type="text" id="engrave-${p.id}" placeholder="Engrave Name (e.g. Sara)" oninput="updateEngravePreview('${p.id}', this.value)" 
            ${isOutOfStock ? 'disabled' : ''}
            style="width: 100%; padding: 0.8rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-tertiary); color: var(--text-primary); font-family: 'Inter', sans-serif; font-size: 0.85rem; transition: all 0.2s; ${isOutOfStock ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
        </div>
      </div>
    </article>
  `
  }).join('');
  
  // Re-observe animations
  container.querySelectorAll('[data-animate]').forEach(el => {
    observer.observe(el);
  });
}

// Category tabs
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('category-tab')) {
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
    e.target.classList.add('active');
    renderProducts(e.target.dataset.category);
  }
});

// Mobile Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');

menuToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

// Cart events
document.getElementById('cart-link').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('cart-modal').classList.add('active');
});

document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('cart-modal').classList.remove('active');
});

// Checkout functionality is now handled by cart.js (placeOrder function)
// document.getElementById('checkout-btn').addEventListener('click', checkout);

// Load products and update orders count on start
window.addEventListener('load', async () => {
  loadProducts();
  // Load product quantities for inventory management
  if (typeof loadProductQuantities === 'function') {
    loadProductQuantities();
  }
  await updateOrdersCount();
});

// Expose globally for cart.js
window.updateOrdersCount = updateOrdersCount;

async function updateOrdersCount() {
  let totalOrders = 0;
  
  try {
    // Try Firebase first
    if (window.firebaseReady && typeof window.getOrdersFromFirestore === 'function') {
      const orders = await window.getOrdersFromFirestore();
      if (orders && orders.length) {
        totalOrders = orders.length;
      }
    }
  } catch (error) {
    console.warn('Firebase orders fetch failed:', error);
  }
  
  // Fallback to localStorage
  try {
    const rawOrders = localStorage.getItem('staccs-orders');
    if (rawOrders) {
      totalOrders = JSON.parse(rawOrders).length;
    }
  } catch (error) {
    console.warn('localStorage orders parse failed:', error);
  }
  
  const ordersCountEl = document.getElementById('orders-count');
  if (ordersCountEl) {
    ordersCountEl.textContent = `(${totalOrders})`;
  }
  
  // console.log(`Orders count updated: ${totalOrders}`);
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return; // Do not apply smooth scroll to # only links like Cart
    
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    // Close mobile menu
    navMenu.classList.remove('active');
  });
});

// Scroll Animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-active');
    }
  });
}, observerOptions);

// Observe all animate elements
document.querySelectorAll('[data-animate]').forEach(el => {
  observer.observe(el);
});

// Header scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  if (window.scrollY > 100) {
    header.style.background = 'rgba(26, 26, 26, 0.95)';
    header.style.backdropFilter = 'blur(20px)';
  } else {
    header.style.background = 'var(--bg-secondary)';
    header.style.backdropFilter = 'blur(10px)';
  }

  // Hide/show header on scroll
  if (window.scrollY > lastScroll && window.scrollY > 100) {
    header.style.transform = 'translateY(-100%)';
  } else {
    header.style.transform = 'translateY(0)';
  }
  lastScroll = window.scrollY;
});

window.updateEngravePreview = (id, text) => {
  const preview = document.getElementById(`preview-${id}`);
  if (preview) {
    preview.textContent = text;
  }
};

window.addToCartWithEngraving = (id) => {
  const engraveInput = document.getElementById(`engrave-${id}`);
  const text = engraveInput ? engraveInput.value.trim() : '';
  if (typeof window.addToCart === 'function') {
    window.addToCart(id, 1, text);
    if (engraveInput) engraveInput.value = '';
    window.updateEngravePreview(id, ''); // clear live preview
  }
};
