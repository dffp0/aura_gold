// Products Modal JavaScript

// Open edit modal
function openEditModal(hasVariants = false) {
    const modal = document.getElementById('editProductModal');
    const variantsSection = document.getElementById('variantsSection');

    // Show/hide variants section based on product
    if (hasVariants) {
        variantsSection.style.display = 'block';
    } else {
        variantsSection.style.display = 'none';
    }

    // Show modal
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
    }
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editProductModal');

    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore body scroll
    }
}

// Save product
function saveProduct() {
    // Get form values
    const productType = document.getElementById('modalProductType').value;
    const carat = document.getElementById('modalCarat').value;
    const craftsmanship = document.getElementById('modalCraftsmanship').value;
    const weight = document.getElementById('modalWeight').value;
    const additionalPrice = document.getElementById('modalAdditionalPrice').value;
    const profitMargin = document.getElementById('modalProfitMargin').value;

    // Show success notification
    showNotification('تم حفظ التعديلات بنجاح', 'success');

    // Close modal
    setTimeout(() => {
        closeEditModal();
    }, 1000);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('editProductModal');
    if (event.target === modal) {
        closeEditModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeEditModal();
    }
});

// Calculate price in modal
function calculateModalPrice() {
    const goldPrices = {
        24: 375.20,
        22: 343.93,
        21: 328.30,
        18: 281.40,
        14: 218.87,
        silver: 3.85
    };

    const productType = document.getElementById('modalProductType')?.value;
    const carat = parseInt(document.getElementById('modalCarat')?.value) || 21;
    const craftsmanship = parseFloat(document.getElementById('modalCraftsmanship')?.value) || 0;
    const weight = parseFloat(document.getElementById('modalWeight')?.value) || 0;
    const additionalPrice = parseFloat(document.getElementById('modalAdditionalPrice')?.value) || 0;
    const profitMargin = parseFloat(document.getElementById('modalProfitMargin')?.value) || 0;

    const pricePerGram = productType === 'silver' ? goldPrices.silver : goldPrices[carat];
    const baseMetalPrice = pricePerGram * weight;
    const totalBeforeProfit = baseMetalPrice + craftsmanship + additionalPrice;
    const profitAmount = totalBeforeProfit * (profitMargin / 100);
    const finalPrice = totalBeforeProfit + profitAmount;

    // Update display
    const priceRows = document.querySelectorAll('.modal-price-row');
    if (priceRows[0]) {
        priceRows[0].querySelector('.modal-price-value').textContent = `${pricePerGram.toFixed(2)} ر.س/جم`;
    }
    if (priceRows[1]) {
        priceRows[1].querySelector('.modal-price-value').textContent = `${weight.toFixed(2)} جم`;
    }
    if (priceRows[2]) {
        priceRows[2].querySelector('.modal-price-value').textContent = `${baseMetalPrice.toFixed(2)} ر.س`;
    }
    if (priceRows[3]) {
        priceRows[3].querySelector('.modal-price-value').textContent = `${craftsmanship.toFixed(2)} ر.س`;
    }
    if (priceRows[4]) {
        priceRows[4].querySelector('.modal-price-value').textContent = `${additionalPrice.toFixed(2)} ر.س`;
    }
    if (priceRows[5]) {
        priceRows[5].querySelector('.modal-price-value').textContent = `+${profitAmount.toFixed(2)} ر.س`;
    }
    if (priceRows[6]) {
        priceRows[6].querySelector('.modal-price-value').textContent = `${finalPrice.toFixed(2)} ر.س`;
    }
}

// Add event listeners for inputs
document.addEventListener('DOMContentLoaded', function() {
    const inputs = ['modalProductType', 'modalCarat', 'modalCraftsmanship', 'modalWeight', 'modalAdditionalPrice', 'modalProfitMargin'];

    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', calculateModalPrice);
            element.addEventListener('change', calculateModalPrice);
        }
    });
});

console.log('Products modal initialized! ✨');
