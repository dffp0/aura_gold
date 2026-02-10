// Products Modal JavaScript - Event Handlers Only
// Note: openEditModal, closeEditModal, saveProduct are defined in products.js

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

console.log('Products modal initialized! ✨');
