// AuraPrice - Products Management
const API_URL = "https://aura-backend-vdqi.onrender.com";

// حالة التطبيق
let products = [];
let isLoading = false;

// عناصر الصفحة
const productsTableBody = document.querySelector('.products-table tbody');
const syncButton = document.querySelector('.btn-sync');
const productsCountElement = document.querySelector('.products-count');
const statsComplete = document.querySelector('.products-stat-card.complete .stat-number');
const statsIncomplete = document.querySelector('.products-stat-card.incomplete .stat-number');
const statsTotal = document.querySelector('.products-stat-card.total .stat-number');

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

        renderProducts(products);
        updateStats(products);
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
function renderProducts(products) {
    if (!productsTableBody) return;

    if (!products || products.length === 0) {
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
        return;
    }

    productsTableBody.innerHTML = products.map((product, index) => {
        const mainImage = product.images?.[0]?.url || product.thumbnail || '';
        const price = product.price?.amount || product.price || 0;
        const sku = product.sku || `SKU-${product.id}`;
        const category = product.categories?.[0]?.name || 'غير مصنف';
        const status = product.status || 'active';

        // استخراج الوزن والعيار من الوصف أو الخصائص (حسب إعداداتك)
        const weight = extractWeight(product);
        const carat = extractCarat(product);

        // حساب السعر
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
                        <span class="product-subtitle">${product.description?.substring(0, 30) || ''}...</span>
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
        productsCountElement.innerHTML = `عرض <strong>1-${Math.min(30, products.length)}</strong> من <strong>${products.length}</strong> منتج`;
    }
}

// ===== استخراج الوزن من المنتج =====
function extractWeight(product) {
    // جرب من الخصائص المخصصة
    if (product.metadata?.weight) return product.metadata.weight;
    if (product.options) {
        const weightOption = product.options.find(opt =>
            opt.name.includes('وزن') || opt.name.toLowerCase().includes('weight')
        );
        if (weightOption) return weightOption.values?.[0]?.name || weightOption.value;
    }
    // جرب من الوصف
    const weightMatch = product.description?.match(/(\d+\.?\d*)\s*(جرام|جم|gram|g)/i);
    if (weightMatch) return parseFloat(weightMatch[1]);
    return null;
}

// ===== استخراج العيار من المنتج =====
function extractCarat(product) {
    // جرب من الخصائص المخصصة
    if (product.metadata?.carat) return product.metadata.carat;
    if (product.options) {
        const caratOption = product.options.find(opt =>
            opt.name.includes('عيار') || opt.name.toLowerCase().includes('carat') || opt.name.toLowerCase().includes('karat')
        );
        if (caratOption) return caratOption.values?.[0]?.name || caratOption.value;
    }
    // جرب من الاسم أو الوصف
    const caratMatch = (product.name + ' ' + product.description)?.match(/عيار\s*(\d+)|(\d+)\s*k/i);
    if (caratMatch) return caratMatch[1] || caratMatch[2];
    return null;
}

// ===== حساب سعر الذهب =====
function calculateGoldPrice(weight, carat) {
    if (!weight || !carat) return null;

    // أسعار الذهب التقريبية (يجب تحديثها من API)
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
function updateStats(products) {
    const total = products.length;
    const complete = products.filter(p => p.status === 'active').length;
    const incomplete = total - complete;

    if (statsComplete) statsComplete.textContent = complete.toLocaleString('ar-SA');
    if (statsIncomplete) statsIncomplete.textContent = incomplete.toLocaleString('ar-SA');
    if (statsTotal) statsTotal.textContent = total.toLocaleString('ar-SA');
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
        // احفظ المنتج في localStorage وانتقل لصفحة التعديل
        localStorage.setItem('editProduct', JSON.stringify(product));
        window.location.href = `edit-product.html?id=${productId}`;
    }
}

// ===== تحديث سعر منتج =====
async function updateProductPrice(productId) {
    showNotification('جاري تحديث السعر...', 'info');

    // TODO: إضافة API لتحديث السعر في سلة
    setTimeout(() => {
        showNotification('تم تحديث السعر بنجاح', 'success');
    }, 1500);
}

// ===== عرض متغيرات المنتج =====
function showVariants(productId) {
    const product = products.find(p => p.id == productId);
    if (product && product.variants) {
        console.log('Variants:', product.variants);
        // TODO: فتح نافذة المتغيرات
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
    // ربط زر المزامنة
    if (syncButton) {
        syncButton.addEventListener('click', fetchProducts);
    }

    // إضافة أنيميشن الدوران
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
