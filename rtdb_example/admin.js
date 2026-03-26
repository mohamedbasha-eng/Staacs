import { db, ref, push, remove, onValue } from './firebase-config.js';

// DOM Elements
const form = document.getElementById('productForm');
const tableBody = document.getElementById('productsTableBody');
const nameInput = document.getElementById('productName');
const priceInput = document.getElementById('productPrice');
const imageInput = document.getElementById('productImage');
const descInput = document.getElementById('productDesc');

/* ==========================================================
   ADD PRODUCT (Create)
   ========================================================== */
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop page from refreshing

    // Gather form data
    const newProduct = {
        name: nameInput.value,
        price: parseFloat(priceInput.value),
        image: imageInput.value,
        description: descInput.value,
        createdAt: Date.now() // Adds a timestamp 
    };

    try {
        // Change button text temporarily
        const saveBtn = document.getElementById('saveButton');
        saveBtn.innerText = 'Saving...';

        // 1. Define the Realtime Database reference route ('products/')
        const productsListRef = ref(db, 'products');

        // 2. Push generated a new unique key and saves the data
        await push(productsListRef, newProduct);

        // Reset the form on success
        form.reset();
        saveBtn.innerText = 'Save Product';
        alert('Product added successfully!');
    } catch (error) {
        console.error("Error adding product: ", error);
        alert('Failed to connect to Firebase. Check console and double-check config keys.');
    }
});

/* ==========================================================
   DISPLAY PRODUCTS (Read + Real-time Listeners)
   ========================================================== */
const productsRef = ref(db, 'products');

// 'onValue' triggers initially and ANY time data changes globally
onValue(productsRef, (snapshot) => {
    // CLear loader/current rows
    tableBody.innerHTML = '';
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Loop through keys in Firebase object
        for (const [key, product] of Object.entries(data)) {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><img src="${product.image}" alt="${product.name}"></td>
                <td><strong>${product.name}</strong></td>
                <td>$${product.price.toFixed(2)}</td>
                <td>
                    <!-- Add the ID to the delete button's dataset -->
                    <button class="btn btn-danger delete-btn" data-id="${key}">
                        Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        }

        /* ==========================================================
           DELETE PRODUCT (Delete)
           ========================================================== */
        // Attach event listeners to newly created delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const idToDelete = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this product?')) {
                    // Create exact reference pointing to: "products/{id}"
                    const productToDeleteRef = ref(db, `products/${idToDelete}`);
                    await remove(productToDeleteRef);
                }
            });
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No products found. Start by adding one!</td></tr>';
    }
});
