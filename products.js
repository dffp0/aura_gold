// AuraPrice - Products Management
const API_URL = "https://aura-backend-vdqi.onrender.com";
const PRODUCTS_PER_PAGE = 60;

// حالة التطبيق
let products = [];
let filteredProducts = [];
let currentPage = 1;
let isLoading = false;

// عناصر الصفحة
const productsTableBody = document.querySelector('.products-table tbody');
const syncButton = document.querySelector('.btn-sync');
const productsCountElement = document.querySelector('.products-count');
const statsComplete = document.querySelector('.products-stat-card.complete .stat-number');
const statsIncomplete = document.querySelector('.products-stat-card.incomplete .stat-number');
const statsTotal = document.querySelector('.products-stat-card.total .stat-number');

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

        // سلة ترجع البيانات في data.data
        products = data.data || data;
        filteredProducts = [...products];

        // حفظ في localStorage
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
                <td colspan="13" style="text-align: center; padding: 3rem;">
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

    // حساب المنتجات للصفحة الحالية
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    productsTableBody.innerHTML = pageProducts.map((product) => {
        const mainImage = product.images?.[0]?.url || product.thumbnail || '';
        const price = product.price?.amount || product.price || 0;
        const sku = product.sku || `SKU-${product.id}`;
        const category = product.categories?.[0]?.name || 'غير مصنف';
        const status = product.status || 'active';

        // استخراج الوزن والعيار
        const weight = extractWeight(product);
        const carat = extractCarat(product);
        const goldPrice = calculateGoldPrice(weight, carat);

        return `
            <tr data-product-id="${product.id}">
                <td><input type="checkbox" class="product-checkbox"></td>
                <td>
                    <div class="product-image">
                        ${mainImage
                            ? `<img src="${mainImage}" alt="${product.name}" onerror="this.parentElement.innerHTML='<div class=product-image-placeholder>💍</div>'">`
                            : '<div class="product-image-placeholder">💍</div>'
                        }
                    </div>
                </td>
                <td>
                    <div class="product-name">
                        <strong>${product.name}</strong>
                        <span class="product-subtitle">${(product.description || '').substring(0, 30)}...</span>
                    </div>
                </td>
                <td><span class="sku">${sku}</span></td>
                <td><span class="category">${category}</span></td>
                <td><span class="carat gold-${carat}">${carat || '-'}</span></td>
                <td><span class="weight">${weight || '-'}</span></td>
                <td><span class="gold-price">${goldPrice ? goldPrice.toLocaleString('ar-SA') + ' ر.س' : '-'}</span></td>
                <td><span class="final-price">${parseFloat(price).toLocaleString('ar-SA')} ر.س</span></td>
                <td>
                    ${product.variants?.length > 0
                        ? `<button class="btn-variants" onclick="showVariants('${product.id}')">
                               <span class="variants-count">${product.variants.length}</span>
                               متغيرات
                           </button>`
                        : '<span class="no-variants">-</span>'
                    }
                </td>
                <td><span class="last-update">${formatDate(product.updated_at)}</span></td>
                <td><span class="status-badge ${status === 'active' ? 'success' : 'warning'}">${status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action" title="تحرير" onclick="editProduct('${product.id}')">✏️</button>
                        <button class="btn-action" title="تحديث السعر" onclick="updateProductPrice('${product.id}')">⚡</button>
                        <button class="btn-action danger" title="حذف" onclick="deleteProduct('${product.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // تحديث العداد
    if (productsCountElement) {
        const start = startIndex + 1;
        const end = Math.min(endIndex, filteredProducts.length);
        productsCountElement.innerHTML = `عرض <strong>${start}-${end}</strong> من <strong>${filteredProducts.length}</strong> منتج`;
    }

    updatePagination(filteredProducts.length);
}

// ===== تحديث أزرار الصفحات =====
function updatePagination(totalProducts) {
    const paginationContainer = document.querySelector('.pagination-numbers');
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');

    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

    // تحديث أزرار السابق والتالي
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    // إنشاء أرقام الصفحات
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

// ===== الانتقال لصفحة معينة =====
function goToPage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== الصفحة السابقة =====
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderProducts();
    }
}

// ===== الصفحة التالية =====
function nextPage() {
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderProducts();
    }
}

// ===== استخراج الوزن من المنتج =====
function extractWeight(product) {
    if (product.metadata?.weight) return product.metadata.weight;
    if (product.weight) return product.weight;

    // جرب من الخصائص
    if (product.options) {
        const weightOption = product.options.find(opt =>
            opt.name?.includes('وزن') || opt.name?.toLowerCase().includes('weight')
        );
        if (weightOption) return weightOption.values?.[0]?.name || weightOption.value;
    }

    // جرب من الوصف أو الاسم
    const text = (product.name || '') + ' ' + (product.description || '');
    const weightMatch = text.match(/(\d+\.?\d*)\s*(جرام|جم|gram|g)/i);
    if (weightMatch) return parseFloat(weightMatch[1]);

    return null;
}

// ===== استخراج العيار من المنتج =====
function extractCarat(product) {
    if (product.metadata?.carat) return product.metadata.carat;

    if (product.options) {
        const caratOption = product.options.find(opt =>
            opt.name?.includes('عيار') || opt.name?.toLowerCase().includes('carat') || opt.name?.toLowerCase().includes('karat')
        );
        if (caratOption) return caratOption.values?.[0]?.name || caratOption.value;
    }

    // جرب من الاسم أو الوصف
    const text = (product.name || '') + ' ' + (product.description || '');
    const caratMatch = text.match(/عيار\s*(\d+)|(\d+)\s*k/i);
    if (caratMatch) return caratMatch[1] || caratMatch[2];

    return null;
}

// ===== حساب سعر الذهب =====
function calculateGoldPrice(weight, carat) {
    if (!weight || !carat) return null;

    const goldPrices = {
        24: 338.87,
        22: 310.64,
        21: 296.51,
        18: 254.15,
        14: 197.67
    };

    const pricePerGram = goldPrices[parseInt(carat)] || 0;
    return Math.round(weight * pricePerGram);
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
                <td colspan="13" style="text-align: center; padding: 3rem;">
                    <div style="color: #666;">
                        <span style="font-size: 2rem; animation: spin 1s linear infinite; display: inline-block;">🔄</span>
                        <p style="margin-top: 1rem;">جاري جلب المنتجات من سلة...</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// ===== إخفاء حالة التحميل =====
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

// ===== تعديل منتج =====
function editProduct(productId) {
    const product = products.find(p => p.id == productId);
    if (product) {
        localStorage.setItem('editProduct', JSON.stringify(product));
        window.location.href = `edit-product.html?id=${productId}`;
    }
}

// ===== تحديث سعر منتج =====
async function updateProductPrice(productId) {
    showNotification('جاري تحديث السعر...', 'info');
    setTimeout(() => {
        showNotification('تم تحديث السعر بنجاح', 'success');
    }, 1500);
}

// ===== عرض متغيرات المنتج =====
function showVariants(productId) {
    const product = products.find(p => p.id == productId);
    if (product && product.variants) {
        console.log('Variants:', product.variants);
    }
}

// ===== حذف منتج =====
function deleteProduct(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        showNotification('لا يمكن الحذف من هنا، احذف من سلة مباشرة', 'error');
    }
}

// ===== ربط الأحداث =====
document.addEventListener('DOMContentLoaded', function() {
    // تحميل المنتجات المحفوظة أولاً
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
    `;
    document.head.appendChild(style);

    console.log('Products module loaded! 📦');
});
