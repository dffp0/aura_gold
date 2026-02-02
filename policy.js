// Policy Page JavaScript

// Smooth scroll for sidebar links
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();

        // Remove active class from all links
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

        // Add active class to clicked link
        this.classList.add('active');

        // Scroll to section
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Update active link on scroll
const sections = document.querySelectorAll('.content-section');
const navLinks = document.querySelectorAll('.sidebar-link');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.scrollY >= sectionTop - 150) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

console.log('Policy page initialized! 📄');
