// AuraPrice - Products Management
const API_URL = "https://aura-backend-vdqi.onrender.com";
const PRODUCTS_PER_PAGE = 60;

// حالة التطبيق
let products = [];
let filteredProducts = [];
let currentPage = 1;
let isLoading = false;
let currentGoldPrice = 0; // سعر الذهب الحالي

// عناصر الصفحة
const productsTableBody = document.querySelector('.products-table tbody');
const syncButton = document.querySelector('.btn-sync');
const productsCountElement = document.querySelector('.products-count');
const statsComplete = document.querySelector('.products-stat-card.complete .stat-number');
const statsIncomplete = document.querySelector('.products-stat-card.incomplete .stat-number');
const statsTotal = document.querySelector('.products-stat-card.total .stat-number');

// ===== جلب سعر الذهب =====
async function fetchGoldPrice() {
    try {
        // جلب سعر الذهب عبر الباك اند (لتجاوز CORS)
        const response = await fetch(`${API_URL}/api/gold-price`);
        const data = await response.json();
        if (data.price_gram_24k) {
            currentGoldPrice = data.price_gram_24k;
            console.log('سعر الذهب عيار 24:', currentGoldPrice.toFixed(2), 'ر.س/جرام');
            localStorage.setItem('aura_gold_price', currentGoldPrice);
            localStorage.setItem('aura_gold_price_time', new Date().toISOString());
            return currentGoldPrice;
        } else if (data.price) {
            currentGoldPrice = data.price / 31.1035;
            console.log('سعر الذهب عيار 24:', currentGoldPrice.toFixed(2), 'ر.س/جرام');
            localStorage.setItem('aura_gold_price', currentGoldPrice);
            localStorage.setItem('aura_gold_price_time', new Date().toISOString());
            return currentGoldPrice;
        }
    } catch (error) {
        console.error('خطأ في جلب سعر الذهب:', error);
        const savedPrice = localStorage.getItem('aura_gold_price');
        if (savedPrice) {
            currentGoldPrice = parseFloat(savedPrice);
        } else {
            currentGoldPrice = 338.87;
        }
    }
    return currentGoldPrice;
}

// ===== تحميل المنتجات من localStorage =====
function loadProductsFromStorage() {
    const savedProducts = localStorage.getItem('aura_products');
    const savedTime = localStorage.getItem('aura_products_time');

    if (savedProducts) {
        products = JSON.parse(savedProducts);
        filteredProducts = [...products];
        renderProducts();
        updateStats();

        if (savedTime) {
            const time = new Date(savedTime);
            console.log('تم تحميل المنتجات المحفوظة من:', time.toLocaleString('ar-SA'));
        }
        return true;
    }
    return false;
}

// ===== حفظ المنتجات في localStorage =====
function saveProductsToStorage() {
    localStorage.setItem('aura_products', JSON.stringify(products));
    localStorage.setItem('aura_products_time', new Date().toISOString());
}

// ===== جلب المنتجات من سلة =====
async function fetchProducts() {
    if (isLoading) return;

    isLoading = true;
    showLoading();

    try {
        const response = await fetch(`${API_URL}/api/salla/products`);
        const data = await response.json();

        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }

        products = data.data || data;
        filteredProducts = [...products];

        saveProductsToStorage();

        currentPage = 1;
        renderProducts();
        updateStats();
        showNotification(`تم جلب ${products.length} منتج بنجاح`, 'success');

    } catch (error) {
        console.error('خطأ في جلب المنتجات:', error);
        showNotification('فشل الاتصال بالسيرفر', 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// ===== عرض المنتجات في الجدول =====
function renderProducts() {
    if (!productsTableBody) return;

    if (!filteredProducts || filteredProducts.length === 0) {
        productsTableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 3rem;">
                    <div style="color: #666;">
                        <span style="font-size: 3rem;">📦</span>
                        <p style="margin-top: 1rem;">لا توجد منتجات</p>
                        <p style="font-size: 0.9rem;">اضغط على "مزامنة مع سلة" لجلب منتجاتك</p>
                    </div>
                </td>
            </tr>
        `;
        updatePagination(0);
        return;
    }

    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    productsTableBody.innerHTML = pageProducts.map((product) => {
        const mainImage = product.images?.[0]?.url || product.thumbnail || '';
        const price = product.price?.amount || product.price || 0;
        const sku = product.sku || '-';
        const category = product.categories?.[0]?.name || 'غير مصنف';
        const status = product.status || 'active';

        // استخراج الوزن من المنتج
        const weight = extractWeight(product);

        // العيار يبقى "غير محدد" حتى يحدده المستخدم
        const savedCarat = localStorage.getItem(`product_carat_${product.id}`);
        const carat = savedCarat || 'غير محدد';

        // حساب سعر الذهب
        const goldPrice = calculateGoldPrice(weight, carat);

        return `
            <tr data-product-id="${product.id}">
                <td><input type="checkbox" class="product-checkbox"></td>
                <td>
                    <div class="product-image" onclick="showImageModal('${mainImage}', '${product.name}')" style="cursor: pointer;">
                        ${mainImage
                            ? `<img src="${mainImage}" alt="${product.name}" onerror="this.parentElement.innerHTML='<div class=product-image-placeholder>💍</div>'">`
                            : '<div class="product-image-placeholder">💍</div>'
                        }
                    </div>
                </td>
                <td>
                    <div class="product-name">
                        <strong>${product.name}</strong>
                        <span class="product-subtitle sku-text">${sku}</span>
                    </div>
                </td>
                <td><span class="category">${category}</span></td>
                <td><span class="carat ${carat !== 'غير محدد' ? 'gold-' + carat : ''}">${carat}</span></td>
                <td><span class="weight">${weight || '-'}</span></td>
                <td><span class="gold-price">${goldPrice ? goldPrice.toLocaleString('ar-SA') + ' ر.س' : '-'}</span></td>
                <td><span class="final-price">${parseFloat(price).toLocaleString('ar-SA')} ر.س</span></td>
                <td>
                    ${product.skus?.length > 0
                        ? `<button class="btn-variants" onclick="showVariants('${product.id}')">
                               <span class="variants-count">${product.skus.length}</span>
                               متغيرات
                           </button>`
                        : '<span class="no-variants">-</span>'
                    }
                </td>
                <td><span class="last-update">${formatDate(product.updated_at)}</span></td>
                <td><span class="status-badge ${status === 'active' ? 'success' : 'warning'}">${status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action" title="تعديل التسعير" onclick="openEditModal('${product.id}')">✏️</button>
                        <button class="btn-action" title="تحديث السعر" onclick="updateProductPrice('${product.id}')">⚡</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (productsCountElement) {
        const start = startIndex + 1;
        const end = Math.min(endIndex, filteredProducts.length);
        productsCountElement.innerHTML = `عرض <strong>${start}-${end}</strong> من <strong>${filteredProducts.length}</strong> منتج`;
    }

    updatePagination(filteredProducts.length);
}

// ===== عرض الصورة المكبرة =====
function showImageModal(imageUrl, productName) {
    if (!imageUrl) return;

    // إنشاء Modal للصورة
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <button class="image-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            <img src="${imageUrl}" alt="${productName}">
            <p>${productName}</p>
        </div>
    `;
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    document.body.appendChild(modal);
}

// ===== فتح Modal التعديل =====
function openEditModal(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const savedCarat = localStorage.getItem(`product_carat_${product.id}`) || '';
    const savedCraftsmanship = localStorage.getItem(`product_craftsmanship_${product.id}`) || '0';
    const savedAdditionalPrice = localStorage.getItem(`product_additional_${product.id}`) || '0';
    const savedProfitMargin = localStorage.getItem(`product_profit_${product.id}`) || '0';
    const weight = extractWeight(product) || 0;

    const modal = document.getElementById('editProductModal');
    if (!modal) return;

    // تحديث عنوان Modal
    modal.querySelector('.modal-header h2').textContent = `تعديل التسعير: ${product.name}`;

    // عرض الوزن (للقراءة فقط)
    const weightDisplay = document.getElementById('modalWeightDisplay');
    if (weightDisplay) {
        weightDisplay.textContent = weight || '-';
    }

    // حفظ الوزن في حقل مخفي
    const weightInput = document.getElementById('modalWeight');
    if (weightInput) {
        weightInput.value = weight;
    }

    // العيار (قابل للتعديل)
    const caratSelect = document.getElementById('modalCarat');
    if (caratSelect) {
        caratSelect.value = savedCarat || '';
    }

    // المصنعية
    const craftsmanshipInput = document.getElementById('modalCraftsmanship');
    if (craftsmanshipInput) {
        craftsmanshipInput.value = savedCraftsmanship;
    }

    // السعر الإضافي
    const additionalInput = document.getElementById('modalAdditionalPrice');
    if (additionalInput) {
        additionalInput.value = savedAdditionalPrice;
    }

    // هامش الربح
    const profitInput = document.getElementById('modalProfitMargin');
    if (profitInput) {
        profitInput.value = savedProfitMargin;
    }

    // حفظ ID المنتج الحالي
    modal.dataset.productId = productId;

    // عرض المتغيرات (SKUs) إن وجدت
    const variantsSection = document.getElementById('variantsSection');
    const variantsList = document.getElementById('modalVariantsList');
    if (product.skus && product.skus.length > 0 && variantsSection && variantsList) {
        variantsSection.style.display = 'block';

        // بناء خريطة قيم الخيارات لربط الأسماء بالـ SKUs
        const optionValuesMap = {};
        if (product.options) {
            product.options.forEach(option => {
                if (option.values) {
                    option.values.forEach(val => {
                        optionValuesMap[val.id] = { name: val.name, optionName: option.name };
                    });
                }
            });
        }

        // زر إعادة حساب أسعار جميع المتغيرات
        let variantsHTML = `
            <button onclick="recalcAllVariantPrices('${product.id}')" style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem; background: linear-gradient(135deg, #D4AF37, #F5D060); color: #0F3460; border: none; border-radius: 8px; font-family: 'Cairo', sans-serif; font-weight: 700; cursor: pointer;">
                🧮 إعادة حساب أسعار جميع المتغيرات
            </button>
        `;

        variantsHTML += product.skus.map((sku, index) => {
            const skuPrice = sku.price?.amount || 0;
            const skuSku = sku.sku || '-';
            const skuWeight = sku.weight || '-';
            const skuWeightLabel = sku.weight_label || (skuWeight !== '-' ? skuWeight + ' جم' : '-');
            const skuStock = sku.stock_quantity ?? '-';

            // استخراج اسم المتغير من الخيارات المرتبطة
            let skuName = '';
            if (sku.related_option_values && sku.related_option_values.length > 0) {
                skuName = sku.related_option_values.map(valId => {
                    const optVal = optionValuesMap[valId];
                    return optVal ? `${optVal.optionName}: ${optVal.name}` : '';
                }).filter(Boolean).join(' / ');
            }
            if (!skuName) skuName = `متغير ${index + 1}`;

            return `
                <div class="variant-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: rgba(212, 175, 55, 0.05); border: 1px solid rgba(212, 175, 55, 0.15); border-radius: 8px; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="flex: 1; min-width: 150px;">
                        <strong style="color: #D4AF37;">${skuName}</strong>
                        <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">
                            SKU: ${skuSku} | الوزن: ${skuWeightLabel} | المخزون: ${skuStock}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="number" id="sku-price-${sku.id}" value="${skuPrice}" step="1" min="0"
                            data-sku-id="${sku.id}" data-weight="${sku.weight || 0}"
                            style="width: 120px; padding: 0.4rem 0.6rem; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 6px; text-align: center; font-family: 'Cairo', sans-serif; font-weight: 700; color: #0F3460; background: white;">
                        <span style="color: #888; font-size: 0.85rem;">ر.س</span>
                    </div>
                </div>
            `;
        }).join('');

        variantsList.innerHTML = variantsHTML;
    } else if (variantsSection) {
        variantsSection.style.display = 'none';
    }

    // حساب السعر
    updatePriceCalculation();

    // إظهار Modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== إغلاق Modal =====
function closeEditModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ===== حفظ بيانات المنتج =====
function saveProduct() {
    const modal = document.getElementById('editProductModal');
    const productId = modal?.dataset.productId;
    if (!productId) return;

    const product = products.find(p => p.id == productId);
    const carat = document.getElementById('modalCarat')?.value || '';
    const craftsmanship = document.getElementById('modalCraftsmanship')?.value || '0';
    const additionalPrice = document.getElementById('modalAdditionalPrice')?.value || '0';
    const profitMargin = document.getElementById('modalProfitMargin')?.value || '0';

    // حفظ في localStorage
    if (carat) localStorage.setItem(`product_carat_${productId}`, carat);
    localStorage.setItem(`product_craftsmanship_${productId}`, craftsmanship);
    localStorage.setItem(`product_additional_${productId}`, additionalPrice);
    localStorage.setItem(`product_profit_${productId}`, profitMargin);

    // حساب وتحديث السعر النهائي محلياً
    if (product && carat) {
        const basePrice = currentGoldPrice || 338.87;
        const caratMultipliers = { '24': 1, '22': 0.9167, '21': 0.875, '18': 0.75, '14': 0.583 };
        const multiplier = caratMultipliers[carat] || 1;
        const weight = extractWeight(product) || 0;
        const goldTotal = weight * basePrice * multiplier;
        const subtotal = goldTotal + parseFloat(craftsmanship) + parseFloat(additionalPrice);
        const profit = subtotal * (parseFloat(profitMargin) / 100);
        const finalPrice = Math.round(subtotal + profit);

        // تحديث السعر في الكائن
        if (product.price && typeof product.price === 'object') {
            product.price.amount = finalPrice;
        } else {
            product.price = { amount: finalPrice, currency: 'SAR' };
        }

        // تحديث أسعار المتغيرات من الحقول المعدلة يدوياً
        if (product.skus && product.skus.length > 0) {
            product.skus.forEach(sku => {
                const skuInput = document.getElementById(`sku-price-${sku.id}`);
                if (skuInput) {
                    const skuPrice = parseFloat(skuInput.value) || 0;
                    if (skuPrice > 0) {
                        sku.price = { amount: skuPrice, currency: 'SAR' };
                    }
                }
            });
        }

        saveProductsToStorage();
    }

    showNotification('تم حفظ التعديلات بنجاح', 'success');
    closeEditModal();
    renderProducts();
}

// ===== تحديث حساب السعر في Modal =====
function updatePriceCalculation() {
    const weight = parseFloat(document.getElementById('modalWeight')?.value) || 0;
    const carat = document.getElementById('modalCarat')?.value || '';
    const craftsmanship = parseFloat(document.getElementById('modalCraftsmanship')?.value) || 0;
    const additionalPrice = parseFloat(document.getElementById('modalAdditionalPrice')?.value) || 0;
    const profitMargin = parseFloat(document.getElementById('modalProfitMargin')?.value) || 0;

    // أسعار العيارات
    const caratPrices = {
        '24': currentGoldPrice || 338.87,
        '22': (currentGoldPrice || 338.87) * 0.9167,
        '21': (currentGoldPrice || 338.87) * 0.875,
        '18': (currentGoldPrice || 338.87) * 0.75,
        '14': (currentGoldPrice || 338.87) * 0.583
    };

    const pricePerGram = caratPrices[carat] || 0;
    const goldTotal = weight * pricePerGram;
    const subtotal = goldTotal + craftsmanship + additionalPrice;
    const profit = subtotal * (profitMargin / 100);
    const finalPrice = subtotal + profit;

    // تحديث العرض
    const priceBox = document.querySelector('.modal-price-box');
    if (priceBox) {
        priceBox.innerHTML = `
            <div class="modal-price-row">
                <span>سعر الذهب (عيار ${carat || '-'}):</span>
                <span class="modal-price-value">${pricePerGram.toFixed(2)} ر.س/جم</span>
            </div>
            <div class="modal-price-row">
                <span>الوزن:</span>
                <span class="modal-price-value">${weight} جم</span>
            </div>
            <div class="modal-price-row">
                <span>سعر الذهب الإجمالي:</span>
                <span class="modal-price-value">${goldTotal.toFixed(2)} ر.س</span>
            </div>
            <div class="modal-price-row">
                <span>المصنعية:</span>
                <span class="modal-price-value">${craftsmanship} ر.س</span>
            </div>
            <div class="modal-price-row">
                <span>السعر الإضافي:</span>
                <span class="modal-price-value">${additionalPrice} ر.س</span>
            </div>
            <div class="modal-price-row highlight">
                <span>الربح (${profitMargin}%):</span>
                <span class="modal-price-value profit">+${profit.toFixed(2)} ر.س</span>
            </div>
            <div class="modal-price-row total">
                <span>السعر النهائي:</span>
                <span class="modal-price-value">${finalPrice.toFixed(2)} ر.س</span>
            </div>
        `;
    }
}

// ===== إعادة حساب أسعار جميع المتغيرات =====
function recalcAllVariantPrices(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || !product.skus) return;

    const carat = document.getElementById('modalCarat')?.value || '';
    const craftsmanship = parseFloat(document.getElementById('modalCraftsmanship')?.value) || 0;
    const additionalPrice = parseFloat(document.getElementById('modalAdditionalPrice')?.value) || 0;
    const profitMargin = parseFloat(document.getElementById('modalProfitMargin')?.value) || 0;

    if (!carat) {
        showNotification('حدد العيار أولاً', 'error');
        return;
    }

    const basePrice = currentGoldPrice || 338.87;
    const caratMultipliers = { '24': 1, '22': 0.9167, '21': 0.875, '18': 0.75, '14': 0.583 };
    const multiplier = caratMultipliers[carat] || 1;

    product.skus.forEach(sku => {
        const weight = sku.weight || extractWeight(product) || 0;
        const goldTotal = weight * basePrice * multiplier;
        const subtotal = goldTotal + craftsmanship + additionalPrice;
        const profit = subtotal * (profitMargin / 100);
        const finalPrice = Math.round(subtotal + profit);

        const input = document.getElementById(`sku-price-${sku.id}`);
        if (input) input.value = finalPrice;
    });

    showNotification('تم إعادة حساب أسعار المتغيرات', 'success');
}

// ===== تسجيل العيار التلقائي =====
function autoDetectCarats() {
    let updated = 0;
    products.forEach(product => {
        const detected = extractCarat(product);
        if (detected) {
            localStorage.setItem(`product_carat_${product.id}`, detected);
            updated++;
        }
    });
    showNotification(`تم تحديد العيار لـ ${updated} منتج`, 'success');
    renderProducts();
}

// ===== تحديث أزرار الصفحات =====
function updatePagination(totalProducts) {
    const paginationContainer = document.querySelector('.pagination-numbers');
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');

    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    let pagesHTML = '';
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        pagesHTML += `<button class="pagination-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (totalPages > 5) {
        pagesHTML += '<span class="pagination-dots">...</span>';
        pagesHTML += `<button class="pagination-number ${totalPages === currentPage ? 'active' : ''}" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    paginationContainer.innerHTML = pagesHTML;
}

function goToPage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderProducts();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderProducts();
    }
}

// ===== استخراج الوزن من المنتج =====
function extractWeight(product) {
    if (product.weight) return product.weight;
    if (product.metadata?.weight) return product.metadata.weight;

    // من الخصائص
    if (product.options) {
        const weightOption = product.options.find(opt =>
            opt.name?.includes('وزن') || opt.name?.toLowerCase().includes('weight')
        );
        if (weightOption) {
            const val = weightOption.values?.[0]?.name || weightOption.value;
            const num = parseFloat(val);
            if (!isNaN(num)) return num;
        }
    }

    // من الاسم أو الوصف
    const text = (product.name || '') + ' ' + (product.description || '');
    const weightMatch = text.match(/(\d+\.?\d*)\s*(جرام|جم|gram|g)/i);
    if (weightMatch) return parseFloat(weightMatch[1]);

    return null;
}

// ===== استخراج العيار من المنتج (للتسجيل التلقائي) =====
function extractCarat(product) {
    if (product.metadata?.carat) return product.metadata.carat;

    if (product.options) {
        const caratOption = product.options.find(opt =>
            opt.name?.includes('عيار') || opt.name?.toLowerCase().includes('carat') || opt.name?.toLowerCase().includes('karat')
        );
        if (caratOption) {
            const val = caratOption.values?.[0]?.name || caratOption.value;
            const num = parseInt(val);
            if ([14, 18, 21, 22, 24].includes(num)) return num.toString();
        }
    }

    // من الاسم أو الوصف
    const text = (product.name || '') + ' ' + (product.description || '');
    const caratMatch = text.match(/عيار\s*(\d+)|(\d+)\s*k/i);
    if (caratMatch) {
        const num = parseInt(caratMatch[1] || caratMatch[2]);
        if ([14, 18, 21, 22, 24].includes(num)) return num.toString();
    }

    return null;
}

// ===== حساب سعر الذهب =====
function calculateGoldPrice(weight, carat) {
    if (!weight || !carat || carat === 'غير محدد') return null;

    const basePrice = currentGoldPrice || 338.87;
    const caratMultipliers = {
        '24': 1,
        '22': 0.9167,
        '21': 0.875,
        '18': 0.75,
        '14': 0.583
    };

    const multiplier = caratMultipliers[carat] || 0;
    return Math.round(weight * basePrice * multiplier);
}

// ===== تنسيق التاريخ =====
function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString('ar-SA');
}

// ===== تحديث الإحصائيات =====
function updateStats() {
    const total = products.length;
    const active = products.filter(p => p.status === 'active').length;
    const inactive = total - active;

    if (statsComplete) statsComplete.textContent = active.toLocaleString('ar-SA');
    if (statsIncomplete) statsIncomplete.textContent = inactive.toLocaleString('ar-SA');
    if (statsTotal) statsTotal.textContent = total.toLocaleString('ar-SA');
}

// ===== البحث في المنتجات =====
function searchProducts(query) {
    if (!query) {
        filteredProducts = [...products];
    } else {
        query = query.toLowerCase();
        filteredProducts = products.filter(p =>
            p.name?.toLowerCase().includes(query) ||
            p.sku?.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query)
        );
    }
    currentPage = 1;
    renderProducts();
}

// ===== إظهار حالة التحميل =====
function showLoading() {
    if (syncButton) {
        syncButton.innerHTML = '<span class="spinner">⏳</span> جاري الجلب...';
        syncButton.disabled = true;
    }

    if (productsTableBody) {
        productsTableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 3rem;">
                    <div style="color: #666;">
                        <span style="font-size: 2rem; animation: spin 1s linear infinite; display: inline-block;">🔄</span>
                        <p style="margin-top: 1rem;">جاري جلب المنتجات من سلة...</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

function hideLoading() {
    if (syncButton) {
        syncButton.innerHTML = '<span>🔄</span> مزامنة مع سلة';
        syncButton.disabled = false;
    }
}

// ===== نظام الإشعارات =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#0F3460'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-family: 'Cairo', sans-serif;
        font-weight: 600;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== تعديل منتج (للتوافق مع الكود القديم) =====
function editProduct(productId) {
    openEditModal(productId);
}

// ===== تحديث سعر منتج =====
async function updateProductPrice(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const savedCarat = localStorage.getItem(`product_carat_${productId}`);
    const savedCraftsmanship = parseFloat(localStorage.getItem(`product_craftsmanship_${productId}`)) || 0;
    const savedAdditionalPrice = parseFloat(localStorage.getItem(`product_additional_${productId}`)) || 0;
    const savedProfitMargin = parseFloat(localStorage.getItem(`product_profit_${productId}`)) || 0;

    if (!savedCarat) {
        showNotification('حدد العيار أولاً من تعديل التسعير', 'error');
        return;
    }

    showNotification('جاري تحديث السعر في سلة...', 'info');

    try {
        const basePrice = currentGoldPrice || 338.87;
        const caratMultipliers = { '24': 1, '22': 0.9167, '21': 0.875, '18': 0.75, '14': 0.583 };
        const multiplier = caratMultipliers[savedCarat] || 1;

        if (product.skus && product.skus.length > 0) {
            // منتج بمتغيرات: نحدث كل SKU
            let updatedCount = 0;
            let errors = [];

            for (const sku of product.skus) {
                // نأخذ السعر من حقل الإدخال إن كان مفتوح، وإلا نحسبه
                const skuInput = document.getElementById(`sku-price-${sku.id}`);
                let finalPrice;

                if (skuInput && parseFloat(skuInput.value) > 0) {
                    finalPrice = Math.round(parseFloat(skuInput.value));
                } else {
                    const weight = sku.weight || extractWeight(product) || 0;
                    const goldTotal = weight * basePrice * multiplier;
                    const subtotal = goldTotal + savedCraftsmanship + savedAdditionalPrice;
                    const profit = subtotal * (savedProfitMargin / 100);
                    finalPrice = Math.round(subtotal + profit);
                }

                console.log(`تحديث SKU ${sku.id} بسعر ${finalPrice}...`);

                try {
                    const response = await fetch(`${API_URL}/api/salla/products/${productId}/skus/${sku.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ price: finalPrice })
                    });

                    const result = await response.json();
                    console.log(`رد سلة SKU ${sku.id}:`, result);

                    if (response.ok || result.status === 200 || result.success) {
                        updatedCount++;
                        sku.price = { amount: finalPrice, currency: 'SAR' };
                    } else {
                        errors.push(`SKU ${sku.id}: ${result.error?.message || JSON.stringify(result)}`);
                    }
                } catch (skuError) {
                    errors.push(`SKU ${sku.id}: ${skuError.message}`);
                }
            }

            // تحديث سعر المنتج الأساسي
            const mainPrice = product.skus[0].price?.amount || 0;
            console.log(`تحديث سعر المنتج الأساسي إلى ${mainPrice}...`);

            try {
                const mainRes = await fetch(`${API_URL}/api/salla/products/${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ price: mainPrice })
                });
                const mainResult = await mainRes.json();
                console.log('رد سلة المنتج الأساسي:', mainResult);
            } catch (mainErr) {
                console.error('خطأ في تحديث السعر الأساسي:', mainErr);
            }

            product.price = { amount: mainPrice, currency: 'SAR' };
            saveProductsToStorage();
            renderProducts();

            if (errors.length > 0) {
                console.error('أخطاء التحديث:', errors);
                showNotification(`تم تحديث ${updatedCount}/${product.skus.length} متغير (${errors.length} خطأ)`, updatedCount > 0 ? 'success' : 'error');
            } else {
                showNotification(`تم تحديث ${updatedCount} متغير بنجاح في سلة`, 'success');
            }
        } else {
            // منتج بدون متغيرات
            const weight = extractWeight(product) || 0;
            const goldTotal = weight * basePrice * multiplier;
            const subtotal = goldTotal + savedCraftsmanship + savedAdditionalPrice;
            const profit = subtotal * (savedProfitMargin / 100);
            const finalPrice = Math.round(subtotal + profit);

            console.log(`تحديث المنتج ${productId} بسعر ${finalPrice}...`);

            const response = await fetch(`${API_URL}/api/salla/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: finalPrice })
            });

            const result = await response.json();
            console.log('رد سلة:', result);

            if (response.ok || result.status === 200 || result.success) {
                product.price = { amount: finalPrice, currency: 'SAR' };
                saveProductsToStorage();
                renderProducts();
                showNotification(`تم تحديث السعر إلى ${finalPrice.toLocaleString('ar-SA')} ر.س`, 'success');
            } else {
                console.error('فشل التحديث:', result);
                showNotification(`فشل تحديث السعر: ${result.error?.message || 'خطأ غير معروف'}`, 'error');
            }
        }

        // حفظ في سجل التحديثات
        const syncHistory = JSON.parse(localStorage.getItem('aura_sync_history') || '[]');
        syncHistory.unshift({
            action: 'تحديث سعر',
            message: `تم تحديث سعر "${product.name}"`,
            status: 'success',
            time: new Date().toISOString()
        });
        if (syncHistory.length > 20) syncHistory.pop();
        localStorage.setItem('aura_sync_history', JSON.stringify(syncHistory));

    } catch (error) {
        console.error('خطأ في تحديث السعر:', error);
        showNotification('فشل الاتصال بالسيرفر', 'error');
    }
}

// ===== عرض متغيرات المنتج =====
function showVariants(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || !product.skus || product.skus.length === 0) return;

    // فتح مودال التعديل مع إظهار المتغيرات
    openEditModal(productId);
}

// ===== ربط الأحداث =====
document.addEventListener('DOMContentLoaded', function() {
    // جلب سعر الذهب
    fetchGoldPrice();

    // تحميل المنتجات المحفوظة
    loadProductsFromStorage();

    // ربط زر المزامنة
    if (syncButton) {
        syncButton.addEventListener('click', fetchProducts);
    }

    // ربط أزرار الصفحات
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');
    if (prevBtn) prevBtn.addEventListener('click', prevPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);

    // ربط البحث
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => searchProducts(e.target.value));
    }

    // ربط حقول Modal للحساب التلقائي
    ['modalCarat', 'modalCraftsmanship', 'modalAdditionalPrice', 'modalProfitMargin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', updatePriceCalculation);
            el.addEventListener('input', updatePriceCalculation);
        }
    });

    // إضافة أنيميشن
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
        .image-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }
        .image-modal-content {
            position: relative;
            max-width: 90%;
            max-height: 90%;
            text-align: center;
        }
        .image-modal-content img {
            max-width: 100%;
            max-height: 80vh;
            border-radius: 12px;
        }
        .image-modal-content p {
            color: white;
            margin-top: 1rem;
            font-size: 1.1rem;
        }
        .image-modal-close {
            position: absolute;
            top: -40px;
            right: 0;
            background: none;
            border: none;
            color: white;
            font-size: 2rem;
            cursor: pointer;
        }
        .sku-text {
            color: #888;
            font-size: 0.75rem;
        }
    `;
    document.head.appendChild(style);

    console.log('Products module loaded! 📦');
});
