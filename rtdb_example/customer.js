import { db, ref, onValue } from './firebase-config.js';

// Get DOM container for products
const productsGrid = document.getElementById('productsGrid');
const loading = document.getElementById('loading');

/* ==========================================================
   FETCH AUTOMATICALLY & DISPLAY CARDS (Read Real-time)
   ========================================================== */
// Create reference to 'products' path in Firebase Realtime DB
const productsRef = ref(db, 'products');

// 'onValue' creates a listener. Any changes/deletions in real-time will trigger this function
onValue(productsRef, (snapshot) => {
    // Hide loading spinner
    loading.style.display = 'none';
    
    // Clear out previous cards so we don't duplicate on each real-time change
    productsGrid.innerHTML = '';
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Loop through the data to create cards automatically
        for (const [key, product] of Object.entries(data)) {
            // Create pure Vanilla JS generic element card wrapper
            const card = document.createElement('div');
            card.classList.add('product-card');
            
            // Build the card's inner HTML
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}" onerror="this.src='https://placehold.co/400x300?text=Image+Not+Found'">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.description}</p>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <button class="btn btn-primary" style="width: 100%;">Add to Cart</button>
                </div>
            `;
            
            // Inject card to container
            productsGrid.appendChild(card);
        }
    } else {
        // If there are no products at all in the database
        productsGrid.innerHTML = `
            <div class="glass-container" style="text-align:center; grid-column: span 100%;">
                <h2>No Products Available</h2>
                <p>Wait for the admin to add new items!</p>
            </div>
        `;
    }
}, (error) => {
    // Handle permissions error or bad config
    console.error("Firebase read error: ", error);
    loading.style.display = 'none';
    productsGrid.innerHTML = `
        <div class="glass-container" style="text-align:center; grid-column: span 100%; color: var(--danger-color);">
            <h2>Connection Error</h2>
            <p>Could not connect to database. Make sure you configured YOUR_API_KEY inside firebase-config.js</p>
        </div>
    `;
});
