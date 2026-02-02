// Edit Product - Price Calculator

// Gold prices per gram (updated in real-time in actual implementation)
const goldPrices = {
    24: 375.20,
    22: 343.93,
    21: 328.30,
    18: 281.40,
    14: 218.87,
    silver: 3.85
};

// Get form elements
const productTypeSelect = document.getElementById('productType');
const caratSelect = document.getElementById('carat');
const craftsmanshipInput = document.getElementById('craftsmanship');
const weightInput = document.getElementById('weight');
const additionalPriceInput = document.getElementById('additionalPrice');
const profitMarginInput = document.getElementById('profitMargin');
const increaseTypeSelect = document.getElementById('increaseType');
const includeTaxCheckbox = document.getElementById('includeTax');
const fixedPriceInput = document.getElementById('fixedPrice');

// Calculate price function
function calculatePrice() {
    const productType = productTypeSelect.value;
    const carat = parseInt(caratSelect.value);
    const craftsmanship = parseFloat(craftsmanshipInput.value) || 0;
    const weight = parseFloat(weightInput.value) || 0;
    const additionalPrice = parseFloat(additionalPriceInput.value) || 0;
    const profitMargin = parseFloat(profitMarginInput.value) || 0;
    const increaseType = increaseTypeSelect.value;
    const includeTax = includeTaxCheckbox.checked;

    // Get price per gram
    let pricePerGram = productType === 'silver' ? goldPrices.silver : goldPrices[carat];

    // Calculate base gold/silver price
    const baseMetalPrice = pricePerGram * weight;

    // Calculate total before profit
    const totalBeforeProfit = baseMetalPrice + craftsmanship + additionalPrice;

    // Calculate profit
    let profitAmount = 0;
    if (increaseType === 'percentage') {
        profitAmount = totalBeforeProfit * (profitMargin / 100);
    } else {
        profitAmount = profitMargin;
    }

    // Calculate total after profit
    let finalPrice = totalBeforeProfit + profitAmount;

    // Add VAT if checked
    if (includeTax) {
        finalPrice = finalPrice * 1.15;
    }

    // Update display
    updatePriceDisplay({
        pricePerGram,
        weight,
        baseMetalPrice,
        craftsmanship,
        additionalPrice,
        totalBeforeProfit,
        profitAmount,
        finalPrice,
        carat: productType === 'silver' ? 'فضة' : `عيار ${carat}`
    });
}

function updatePriceDisplay(data) {
    const calculationRows = document.querySelectorAll('.calculation-row');

    // Update each row
    if (calculationRows[0]) {
        calculationRows[0].querySelector('.calc-label').textContent = `سعر ${data.carat}:`;
        calculationRows[0].querySelector('.calc-value').textContent = `${data.pricePerGram.toFixed(2)} ر.س/جم`;
    }

    if (calculationRows[1]) {
        calculationRows[1].querySelector('.calc-value').textContent = `${data.weight.toFixed(2)} جم`;
    }

    if (calculationRows[2]) {
        calculationRows[2].querySelector('.calc-value').textContent = `${data.baseMetalPrice.toFixed(2)} ر.س`;
    }

    if (calculationRows[3]) {
        calculationRows[3].querySelector('.calc-value').textContent = `${data.craftsmanship.toFixed(2)} ر.س`;
    }

    if (calculationRows[4]) {
        calculationRows[4].querySelector('.calc-value').textContent = `${data.additionalPrice.toFixed(2)} ر.س`;
    }

    if (calculationRows[5]) {
        calculationRows[5].querySelector('.calc-value').textContent = `${data.totalBeforeProfit.toFixed(2)} ر.س`;
    }

    if (calculationRows[6]) {
        const profitPercent = ((data.profitAmount / data.totalBeforeProfit) * 100).toFixed(1);
        calculationRows[6].querySelector('.calc-label').textContent = `الزيادة الإضافية (${profitPercent}%):`;
        calculationRows[6].querySelector('.calc-value').textContent = `+${data.profitAmount.toFixed(2)} ر.س`;
    }

    if (calculationRows[7]) {
        calculationRows[7].querySelector('.calc-value').textContent = `${data.profitAmount.toFixed(2)} ر.س`;
    }

    if (calculationRows[8]) {
        calculationRows[8].querySelector('.calc-value').textContent = `${data.finalPrice.toFixed(2)} ر.س`;
    }
}

// Update active price item
function updateActivePriceItem() {
    const productType = productTypeSelect.value;
    const carat = caratSelect.value;

    document.querySelectorAll('.price-item').forEach(item => {
        item.classList.remove('active');
    });

    if (productType === 'silver') {
        document.querySelector('.price-item.silver').classList.add('active');
    } else {
        const priceItems = document.querySelectorAll('.price-item:not(.silver)');
        const caratIndex = {24: 0, 22: 1, 21: 2, 18: 3, 14: 4};
        if (priceItems[caratIndex[carat]]) {
            priceItems[caratIndex[carat]].classList.add('active');
        }
    }
}

// Add event listeners
if (productTypeSelect) productTypeSelect.addEventListener('change', () => {
    calculatePrice();
    updateActivePriceItem();
});

if (caratSelect) caratSelect.addEventListener('change', () => {
    calculatePrice();
    updateActivePriceItem();
});

if (craftsmanshipInput) craftsmanshipInput.addEventListener('input', calculatePrice);
if (weightInput) weightInput.addEventListener('input', calculatePrice);
if (additionalPriceInput) additionalPriceInput.addEventListener('input', calculatePrice);
if (profitMarginInput) profitMarginInput.addEventListener('input', calculatePrice);
if (increaseTypeSelect) increaseTypeSelect.addEventListener('change', calculatePrice);
if (includeTaxCheckbox) includeTaxCheckbox.addEventListener('change', calculatePrice);

// Add Variant functionality
const addVariantBtn = document.getElementById('addVariantBtn');
const variantsList = document.getElementById('variantsList');
let variantCount = 2;

if (addVariantBtn) {
    addVariantBtn.addEventListener('click', function() {
        variantCount++;
        const variantHTML = `
            <div class="variant-item">
                <div class="variant-header">
                    <span class="variant-number">متغير #${variantCount}</span>
                    <button class="btn-remove-variant">حذف</button>
                </div>
                <div class="variant-grid">
                    <div class="form-group">
                        <label>الوزن (جرام)</label>
                        <input type="number" value="0" step="0.01" class="variant-weight">
                    </div>
                    <div class="form-group">
                        <label>السعر المحسوب</label>
                        <input type="number" value="0" readonly class="variant-price">
                    </div>
                </div>
            </div>
        `;

        if (variantsList) {
            variantsList.insertAdjacentHTML('beforeend', variantHTML);

            // Add event listener to the new weight input
            const newVariant = variantsList.lastElementChild;
            const weightInput = newVariant.querySelector('.variant-weight');
            const priceInput = newVariant.querySelector('.variant-price');

            weightInput.addEventListener('input', function() {
                const weight = parseFloat(this.value) || 0;
                const calculatedPrice = calculateVariantPrice(weight);
                priceInput.value = calculatedPrice.toFixed(2);
            });

            // Add remove functionality
            const removeBtn = newVariant.querySelector('.btn-remove-variant');
            removeBtn.addEventListener('click', function() {
                newVariant.remove();
            });
        }
    });
}

// Calculate variant price based on weight
function calculateVariantPrice(weight) {
    const productType = productTypeSelect.value;
    const carat = parseInt(caratSelect.value);
    const craftsmanship = parseFloat(craftsmanshipInput.value) || 0;
    const additionalPrice = parseFloat(additionalPriceInput.value) || 0;
    const profitMargin = parseFloat(profitMarginInput.value) || 0;
    const increaseType = increaseTypeSelect.value;
    const includeTax = includeTaxCheckbox.checked;

    let pricePerGram = productType === 'silver' ? goldPrices.silver : goldPrices[carat];
    const baseMetalPrice = pricePerGram * weight;
    const totalBeforeProfit = baseMetalPrice + craftsmanship + additionalPrice;

    let profitAmount = 0;
    if (increaseType === 'percentage') {
        profitAmount = totalBeforeProfit * (profitMargin / 100);
    } else {
        profitAmount = profitMargin;
    }

    let finalPrice = totalBeforeProfit + profitAmount;

    if (includeTax) {
        finalPrice = finalPrice * 1.15;
    }

    return finalPrice;
}

// Add remove functionality to existing variants
document.querySelectorAll('.btn-remove-variant').forEach(btn => {
    btn.addEventListener('click', function() {
        this.closest('.variant-item').remove();
    });
});

// Save product button
const saveProductBtn = document.querySelector('.btn-save-product');
if (saveProductBtn) {
    saveProductBtn.addEventListener('click', function() {
        const fixedPrice = fixedPriceInput.value;

        if (fixedPrice) {
            showNotification('تم حفظ المنتج بسعر ثابت', 'success');
        } else {
            showNotification('تم حفظ المنتج بنجاح مع التسعير التلقائي', 'success');
        }

        // Simulate saving
        this.textContent = 'جاري الحفظ...';
        this.disabled = true;

        setTimeout(() => {
            this.innerHTML = '<span>💾</span> حفظ التعديلات';
            this.disabled = false;

            // Redirect after save
            setTimeout(() => {
                window.location.href = 'products.html';
            }, 1000);
        }, 1500);
    });
}

// Initialize calculation on page load
calculatePrice();
updateActivePriceItem();

console.log('Edit Product page initialized! ✨');
