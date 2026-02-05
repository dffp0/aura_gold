// AuraPrice - JavaScript Interactions

// ===== Login Form =====
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Animation effect
            const button = this.querySelector('.btn-primary');
            button.textContent = 'جاري تسجيل الدخول...';
            button.style.opacity = '0.7';

            // Simulate login
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        });
    }
});
// فحص الاتصال بالسيرفر (بدون إشعار)
fetch("https://aura-backend-vdqi.onrender.com/api/health")
  .then(res => res.json())
  .then(data => {
    console.log("Backend connected:", data);
  })
  .catch(err => {
    console.error("Backend connection error:", err);
  });

// ===== Select All Checkbox =====
const selectAllCheckbox = document.getElementById('selectAll');
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.products-table tbody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });
}

// ===== Toggle Password Visibility =====
const showTokenButtons = document.querySelectorAll('.btn-show-token');
showTokenButtons.forEach(button => {
    button.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            this.textContent = '🙈';
        } else {
            input.type = 'password';
            this.textContent = '👁️';
        }
    });
});

// ===== Automation Toggle =====
const automationToggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
automationToggles.forEach(toggle => {
    toggle.addEventListener('change', function() {
        const statusElement = document.querySelector('.toggle-status');
        if (statusElement) {
            if (this.checked) {
                statusElement.classList.add('active');
                statusElement.classList.remove('inactive');
                statusElement.textContent = 'نشط';
            } else {
                statusElement.classList.remove('active');
                statusElement.classList.add('inactive');
                statusElement.textContent = 'متوقف';
            }
        }

        // Show notification
        showNotification(this.checked ? 'تم تفعيل التحديث التلقائي' : 'تم إيقاف التحديث التلقائي');
    });
});

// ===== Chart Tabs =====
const chartTabs = document.querySelectorAll('.chart-tab');
chartTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        chartTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        // Here you would update the chart based on the selected tab
        console.log('Chart updated for:', this.textContent);
    });
});

// ===== Action Buttons with Confirmation =====
const dangerButtons = document.querySelectorAll('.btn-action.danger');
dangerButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        if (!confirm('هل أنت متأكد من الحذف؟')) {
            e.preventDefault();
        }
    });
});

// ===== Sync Action Buttons =====
const syncActionButtons = document.querySelectorAll('.sync-action-btn');
syncActionButtons.forEach(button => {
    button.addEventListener('click', function() {
        const title = this.querySelector('h4').textContent;
        showNotification(`جاري تنفيذ: ${title}...`);

        // Simulate action
        setTimeout(() => {
            showNotification(`تم تنفيذ: ${title} بنجاح`, 'success');
        }, 2000);
    });
});

// ===== Action Buttons (Quick Actions) =====
const actionButtons = document.querySelectorAll('.action-btn');
actionButtons.forEach(button => {
    button.addEventListener('click', function() {
        const title = this.querySelector('h4').textContent;
        showNotification(`جاري تنفيذ: ${title}...`);

        // Add loading state
        this.style.opacity = '0.6';
        this.style.pointerEvents = 'none';

        // Simulate action
        setTimeout(() => {
            showNotification(`تم تنفيذ: ${title} بنجاح`, 'success');
            this.style.opacity = '1';
            this.style.pointerEvents = 'auto';
        }, 2000);
    });
});

// ===== Edit Buttons =====
const editButtons = document.querySelectorAll('.btn-edit');
editButtons.forEach(button => {
    button.addEventListener('click', function() {
        const card = this.closest('.settings-card');
        const inputs = card.querySelectorAll('input:not([type="checkbox"]), select');
        const saveButton = card.querySelector('.btn-save');

        inputs.forEach(input => {
            input.removeAttribute('readonly');
            input.removeAttribute('disabled');
            input.style.background = 'white';
        });

        if (saveButton) {
            saveButton.removeAttribute('disabled');
        }

        this.textContent = 'إلغاء';
        this.style.background = '#EF4444';
        this.style.color = 'white';
        this.style.borderColor = '#EF4444';
    });
});

// ===== Save Buttons =====
const saveButtons = document.querySelectorAll('.btn-save, .btn-save-primary');
saveButtons.forEach(button => {
    button.addEventListener('click', function() {
        if (!this.disabled) {
            const originalText = this.textContent;
            this.textContent = 'جاري الحفظ...';
            this.disabled = true;

            setTimeout(() => {
                showNotification('تم حفظ التغييرات بنجاح', 'success');
                this.textContent = originalText;
                this.disabled = false;

                // Make inputs readonly again
                const card = this.closest('.settings-card, .pricing-formula-card');
                if (card) {
                    const inputs = card.querySelectorAll('input:not([type="checkbox"]), select');
                    inputs.forEach(input => {
                        input.setAttribute('readonly', 'readonly');
                        input.style.background = '#F5F5F5';
                    });
                }
            }, 1500);
        }
    });
});

// ===== Search Bar =====
const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        console.log('Searching for:', searchTerm);
        // Here you would implement actual search functionality
    });
}

// ===== Filter Selects =====
const filterSelects = document.querySelectorAll('.filter-select');
filterSelects.forEach(select => {
    select.addEventListener('change', function() {
        console.log('Filter changed:', this.value);
        // Here you would implement actual filtering
    });
});

// ===== Notification System =====
function showNotification(message, type = 'info') {
    // Create notification element
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

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Update Price Ticker =====
function updatePriceTicker() {
    const priceValue = document.querySelector('.price-value');
    const priceChange = document.querySelector('.price-change');

    if (priceValue) {
        // Simulate price update
        const basePrice = 338.87;
        const randomChange = (Math.random() - 0.5) * 2;
        const newPrice = (basePrice + randomChange).toFixed(2);

        priceValue.textContent = `${newPrice} ر.س`;

        if (priceChange) {
            const changePercent = ((randomChange / basePrice) * 100).toFixed(1);
            priceChange.textContent = `${changePercent >= 0 ? '↑' : '↓'} ${Math.abs(changePercent)}%`;
        }
    }
}

// Update price every 30 seconds
setInterval(updatePriceTicker, 30000);

// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Table Row Hover Effect =====
const tableRows = document.querySelectorAll('.products-table tbody tr');
tableRows.forEach(row => {
    row.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.01)';
        this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
    });

    row.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = 'none';
    });
});

console.log('AuraPrice initialized successfully! 🌟');
