// AuraPrice - Pricing Settings JavaScript

// ===== Price Rounding Functions =====

/**
 * Round price based on selected rounding type
 * @param {number} price - Original price
 * @param {string} type - Rounding type (none, ceiling, floor, nearest, nearest5, nearest10)
 * @returns {number} - Rounded price
 */
function roundPrice(price, type) {
    switch (type) {
        case 'none':
            return price;
        case 'ceiling':
            return Math.ceil(price);
        case 'floor':
            return Math.floor(price);
        case 'nearest':
            return Math.round(price);
        case 'nearest5':
            return Math.ceil(price / 5) * 5;
        case 'nearest10':
            return Math.ceil(price / 10) * 10;
        default:
            return price;
    }
}

// ===== Custom Rules Storage =====
let customRules = [
    { id: 1, type: 'exact', enabled: true, exactPrice: 236, newPrice: 239 },
    { id: 2, type: 'range', enabled: true, rangeFrom: 100, rangeTo: 199, action: 'add', value: 5 },
    { id: 3, type: 'ending', enabled: false, digits: [1, 2, 3, 4], newDigit: 5, direction: 'up' }
];

let editingRuleId = null;

// ===== Apply Custom Rules =====

/**
 * Apply custom pricing rules to a price
 * @param {number} price - Original price
 * @returns {object} - Object with new price and applied rules
 */
function applyCustomRules(price) {
    let currentPrice = price;
    let appliedRules = [];

    // Sort rules by priority: exact > range > ending
    const sortedRules = [...customRules].sort((a, b) => {
        const priority = { exact: 1, range: 2, ending: 3 };
        return priority[a.type] - priority[b.type];
    });

    for (const rule of sortedRules) {
        if (!rule.enabled) continue;

        switch (rule.type) {
            case 'exact':
                if (Math.floor(currentPrice) === rule.exactPrice || Math.ceil(currentPrice) === rule.exactPrice) {
                    appliedRules.push(`قاعدة محددة: ${rule.exactPrice} → ${rule.newPrice}`);
                    currentPrice = rule.newPrice;
                }
                break;

            case 'range':
                if (currentPrice >= rule.rangeFrom && currentPrice <= rule.rangeTo) {
                    let newPrice = currentPrice;
                    switch (rule.action) {
                        case 'add':
                            newPrice = currentPrice + rule.value;
                            appliedRules.push(`نطاق سعري: إضافة ${rule.value} ريال`);
                            break;
                        case 'subtract':
                            newPrice = currentPrice - rule.value;
                            appliedRules.push(`نطاق سعري: خصم ${rule.value} ريال`);
                            break;
                        case 'percentage':
                            newPrice = currentPrice * (1 + rule.value / 100);
                            appliedRules.push(`نطاق سعري: إضافة ${rule.value}%`);
                            break;
                        case 'set':
                            newPrice = rule.value;
                            appliedRules.push(`نطاق سعري: تحديد سعر ${rule.value} ريال`);
                            break;
                    }
                    currentPrice = newPrice;
                }
                break;

            case 'ending':
                const lastDigit = Math.floor(currentPrice) % 10;
                if (rule.digits.includes(lastDigit)) {
                    const basePrice = Math.floor(currentPrice / 10) * 10;
                    let newPrice;

                    if (rule.direction === 'up') {
                        if (lastDigit < rule.newDigit) {
                            newPrice = basePrice + rule.newDigit;
                        } else {
                            newPrice = basePrice + 10 + rule.newDigit;
                        }
                    } else if (rule.direction === 'down') {
                        if (lastDigit > rule.newDigit) {
                            newPrice = basePrice + rule.newDigit;
                        } else {
                            newPrice = basePrice - 10 + rule.newDigit;
                        }
                    } else {
                        // nearest
                        const upPrice = lastDigit < rule.newDigit ? basePrice + rule.newDigit : basePrice + 10 + rule.newDigit;
                        const downPrice = lastDigit > rule.newDigit ? basePrice + rule.newDigit : basePrice - 10 + rule.newDigit;
                        newPrice = Math.abs(currentPrice - upPrice) <= Math.abs(currentPrice - downPrice) ? upPrice : downPrice;
                    }

                    appliedRules.push(`أرقام النهاية: تحويل ${lastDigit} → ${rule.newDigit}`);
                    currentPrice = newPrice;
                }
                break;
        }
    }

    return { price: currentPrice, appliedRules };
}

/**
 * Calculate final price with all rules and rounding
 * @param {number} originalPrice - Original price
 * @returns {object} - Object with all price stages
 */
function calculateFinalPrice(originalPrice) {
    const applyRulesFirst = document.getElementById('applyRulesBeforeRounding')?.checked ?? true;
    const roundingType = document.querySelector('input[name="roundingType"]:checked')?.value || 'ceiling';

    let afterRules = originalPrice;
    let appliedRules = [];
    let finalPrice;

    if (applyRulesFirst) {
        const rulesResult = applyCustomRules(originalPrice);
        afterRules = rulesResult.price;
        appliedRules = rulesResult.appliedRules;
        finalPrice = roundPrice(afterRules, roundingType);
        if (roundingType !== 'none') {
            appliedRules.push(`التقريب: ${roundingType === 'ceiling' ? 'لأعلى' : roundingType === 'floor' ? 'لأسفل' : roundingType === 'nearest' ? 'لأقرب رقم' : roundingType === 'nearest5' ? 'لأقرب 5' : 'لأقرب 10'}`);
        }
    } else {
        const roundedPrice = roundPrice(originalPrice, roundingType);
        if (roundingType !== 'none') {
            appliedRules.push(`التقريب: ${roundingType === 'ceiling' ? 'لأعلى' : roundingType === 'floor' ? 'لأسفل' : roundingType === 'nearest' ? 'لأقرب رقم' : roundingType === 'nearest5' ? 'لأقرب 5' : 'لأقرب 10'}`);
        }
        const rulesResult = applyCustomRules(roundedPrice);
        afterRules = roundedPrice;
        finalPrice = rulesResult.price;
        appliedRules = appliedRules.concat(rulesResult.appliedRules);
    }

    return {
        original: originalPrice,
        afterRules: afterRules,
        final: finalPrice,
        appliedRules: appliedRules
    };
}

// ===== UI Event Handlers =====

// Update preview when rounding type changes
document.addEventListener('DOMContentLoaded', function() {
    const roundingInputs = document.querySelectorAll('input[name="roundingType"]');
    const previewInput = document.getElementById('previewOriginalPrice');

    function updatePreview() {
        const originalPrice = parseFloat(previewInput?.value) || 0;
        const roundingType = document.querySelector('input[name="roundingType"]:checked')?.value || 'ceiling';
        const roundedPrice = roundPrice(originalPrice, roundingType);

        const previewResult = document.getElementById('previewRoundedPrice');
        if (previewResult) {
            previewResult.textContent = roundedPrice.toFixed(roundedPrice % 1 === 0 ? 0 : 2);
        }
    }

    roundingInputs.forEach(input => {
        input.addEventListener('change', updatePreview);
    });

    if (previewInput) {
        previewInput.addEventListener('input', updatePreview);
    }

    // Initial preview update
    updatePreview();

    // Rule type selector
    const ruleTypeBtns = document.querySelectorAll('.rule-type-btn');
    ruleTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            ruleTypeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

// ===== Rule Modal Functions =====

function openAddRuleModal() {
    editingRuleId = null;
    document.getElementById('ruleModalTitle').textContent = 'إضافة قاعدة جديدة';
    document.getElementById('modalRuleType').value = 'exact';
    updateRuleForm();
    clearRuleForm();
    document.getElementById('ruleModal').classList.add('active');
}

function closeRuleModal() {
    document.getElementById('ruleModal').classList.remove('active');
    editingRuleId = null;
}

function updateRuleForm() {
    const ruleType = document.getElementById('modalRuleType').value;

    document.getElementById('exactRuleForm').style.display = ruleType === 'exact' ? 'block' : 'none';
    document.getElementById('rangeRuleForm').style.display = ruleType === 'range' ? 'block' : 'none';
    document.getElementById('endingRuleForm').style.display = ruleType === 'ending' ? 'block' : 'none';
}

function clearRuleForm() {
    document.getElementById('exactPrice').value = '';
    document.getElementById('exactNewPrice').value = '';
    document.getElementById('rangeFrom').value = '';
    document.getElementById('rangeTo').value = '';
    document.getElementById('rangeAction').value = 'add';
    document.getElementById('rangeValue').value = '';
    document.querySelectorAll('.ending-digits input').forEach(cb => cb.checked = false);
    document.getElementById('endingNewDigit').value = '5';
    document.getElementById('endingDirection').value = 'up';
}

function editRule(ruleId) {
    const rule = customRules.find(r => r.id === ruleId);
    if (!rule) return;

    editingRuleId = ruleId;
    document.getElementById('ruleModalTitle').textContent = 'تعديل القاعدة';
    document.getElementById('modalRuleType').value = rule.type;
    updateRuleForm();

    switch (rule.type) {
        case 'exact':
            document.getElementById('exactPrice').value = rule.exactPrice;
            document.getElementById('exactNewPrice').value = rule.newPrice;
            break;
        case 'range':
            document.getElementById('rangeFrom').value = rule.rangeFrom;
            document.getElementById('rangeTo').value = rule.rangeTo;
            document.getElementById('rangeAction').value = rule.action;
            document.getElementById('rangeValue').value = rule.value;
            break;
        case 'ending':
            document.querySelectorAll('.ending-digits input').forEach(cb => {
                cb.checked = rule.digits.includes(parseInt(cb.value));
            });
            document.getElementById('endingNewDigit').value = rule.newDigit;
            document.getElementById('endingDirection').value = rule.direction;
            break;
    }

    document.getElementById('ruleModal').classList.add('active');
}

function deleteRule(ruleId) {
    if (confirm('هل أنت متأكد من حذف هذه القاعدة؟')) {
        customRules = customRules.filter(r => r.id !== ruleId);
        renderRulesList();
        showNotification('تم حذف القاعدة بنجاح', 'success');
    }
}

function saveRule() {
    const ruleType = document.getElementById('modalRuleType').value;
    let rule;

    switch (ruleType) {
        case 'exact':
            const exactPrice = parseInt(document.getElementById('exactPrice').value);
            const newPrice = parseInt(document.getElementById('exactNewPrice').value);
            if (!exactPrice || !newPrice) {
                showNotification('الرجاء إدخال جميع القيم', 'error');
                return;
            }
            rule = { type: 'exact', exactPrice, newPrice, enabled: true };
            break;

        case 'range':
            const rangeFrom = parseInt(document.getElementById('rangeFrom').value);
            const rangeTo = parseInt(document.getElementById('rangeTo').value);
            const action = document.getElementById('rangeAction').value;
            const value = parseFloat(document.getElementById('rangeValue').value);
            if (!rangeFrom || !rangeTo || !value) {
                showNotification('الرجاء إدخال جميع القيم', 'error');
                return;
            }
            rule = { type: 'range', rangeFrom, rangeTo, action, value, enabled: true };
            break;

        case 'ending':
            const digits = [];
            document.querySelectorAll('.ending-digits input:checked').forEach(cb => {
                digits.push(parseInt(cb.value));
            });
            if (digits.length === 0) {
                showNotification('الرجاء اختيار رقم واحد على الأقل', 'error');
                return;
            }
            const newDigit = parseInt(document.getElementById('endingNewDigit').value);
            const direction = document.getElementById('endingDirection').value;
            rule = { type: 'ending', digits, newDigit, direction, enabled: true };
            break;
    }

    if (editingRuleId) {
        const index = customRules.findIndex(r => r.id === editingRuleId);
        if (index !== -1) {
            rule.id = editingRuleId;
            customRules[index] = rule;
        }
    } else {
        rule.id = Date.now();
        customRules.push(rule);
    }

    renderRulesList();
    closeRuleModal();
    showNotification('تم حفظ القاعدة بنجاح', 'success');
}

function renderRulesList() {
    const container = document.getElementById('customRulesList');
    if (!container) return;

    container.innerHTML = customRules.map(rule => {
        let typeText, typeBadge, conditionText, actionText;

        switch (rule.type) {
            case 'exact':
                typeText = 'قاعدة محددة';
                typeBadge = 'exact';
                conditionText = `إذا كان السعر = <strong>${rule.exactPrice}</strong>`;
                actionText = `يصبح <strong>${rule.newPrice}</strong>`;
                break;
            case 'range':
                typeText = 'نطاق سعري';
                typeBadge = 'range';
                conditionText = `إذا كان السعر من <strong>${rule.rangeFrom}</strong> إلى <strong>${rule.rangeTo}</strong>`;
                const actionMap = { add: 'أضف', subtract: 'اخصم', percentage: 'أضف', set: 'حدد' };
                const suffix = rule.action === 'percentage' ? '%' : ' ريال';
                actionText = `${actionMap[rule.action]} <strong>${rule.action === 'add' ? '+' : rule.action === 'subtract' ? '-' : ''}${rule.value}${suffix}</strong>`;
                break;
            case 'ending':
                typeText = 'أرقام النهاية';
                typeBadge = 'ending';
                conditionText = `إذا انتهى السعر بـ <strong>${rule.digits.join(', ')}</strong>`;
                actionText = `قرّب ${rule.direction === 'up' ? 'لأعلى' : rule.direction === 'down' ? 'لأسفل' : 'لأقرب'} إلى <strong>${rule.newDigit}</strong>`;
                break;
        }

        return `
            <div class="custom-rule-item" data-rule-id="${rule.id}">
                <div class="rule-content">
                    <div class="rule-type-badge ${typeBadge}">${typeText}</div>
                    <div class="rule-details">
                        <span class="rule-condition">${conditionText}</span>
                        <span class="rule-arrow">→</span>
                        <span class="rule-action">${actionText}</span>
                    </div>
                </div>
                <div class="rule-actions">
                    <label class="toggle-switch mini">
                        <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="toggleRule(${rule.id}, this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn-rule-edit" onclick="editRule(${rule.id})">✏️</button>
                    <button class="btn-rule-delete" onclick="deleteRule(${rule.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleRule(ruleId, enabled) {
    const rule = customRules.find(r => r.id === ruleId);
    if (rule) {
        rule.enabled = enabled;
    }
}

// ===== Test Calculator =====

function calculateTestPrice() {
    const testPrice = parseFloat(document.getElementById('testPrice').value);
    if (isNaN(testPrice)) {
        showNotification('الرجاء إدخال سعر صحيح', 'error');
        return;
    }

    const result = calculateFinalPrice(testPrice);

    document.getElementById('resultOriginal').textContent = testPrice.toFixed(2) + ' ر.س';
    document.getElementById('resultAfterRules').textContent = result.afterRules.toFixed(2) + ' ر.س';
    document.getElementById('resultFinal').textContent = result.final.toFixed(2) + ' ر.س';

    const rulesList = document.getElementById('appliedRulesList');
    if (result.appliedRules.length > 0) {
        rulesList.innerHTML = result.appliedRules.map(rule => `<li>${rule}</li>`).join('');
        document.getElementById('appliedRules').style.display = 'block';
    } else {
        document.getElementById('appliedRules').style.display = 'none';
    }

    document.getElementById('testResults').style.display = 'block';
}

// ===== Save Settings =====

function saveRoundingSettings() {
    const roundingType = document.querySelector('input[name="roundingType"]:checked')?.value;

    // Save to localStorage
    localStorage.setItem('auraPrice_roundingType', roundingType);
    localStorage.setItem('auraPrice_customRules', JSON.stringify(customRules));

    showNotification('تم حفظ إعدادات التقريب بنجاح', 'success');
}

// ===== Load Settings on Page Load =====

document.addEventListener('DOMContentLoaded', function() {
    // Load saved rounding type
    const savedRoundingType = localStorage.getItem('auraPrice_roundingType');
    if (savedRoundingType) {
        const radio = document.querySelector(`input[name="roundingType"][value="${savedRoundingType}"]`);
        if (radio) radio.checked = true;
    }

    // Load saved custom rules
    const savedRules = localStorage.getItem('auraPrice_customRules');
    if (savedRules) {
        try {
            customRules = JSON.parse(savedRules);
        } catch (e) {
            console.error('Error loading custom rules:', e);
        }
    }

    // Render rules list
    renderRulesList();
});

// ===== Notification Function (if not already defined) =====
if (typeof showNotification === 'undefined') {
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
}

// Export functions for use in other files
window.AuraPricing = {
    roundPrice,
    applyCustomRules,
    calculateFinalPrice,
    customRules
};
