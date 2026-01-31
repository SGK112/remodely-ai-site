// Remodely AI - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {

  // =====================================================
  // SCROLL PROGRESS INDICATOR
  // =====================================================
  const scrollProgress = document.createElement('div');
  scrollProgress.className = 'scroll-progress';
  scrollProgress.style.transformOrigin = 'left';
  scrollProgress.style.transform = 'scaleX(0)';
  document.body.prepend(scrollProgress);

  // =====================================================
  // NAVBAR REFERENCE
  // =====================================================
  const navbar = document.querySelector('.navbar');

  // =====================================================
  // PERFORMANCE-OPTIMIZED SCROLL HANDLING
  // =====================================================
  let ticking = false;
  let lastScrollY = 0;
  let lastNavScroll = 0;

  function handleScroll(scrollY) {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Update scroll progress
    if (scrollProgress && docHeight > 0) {
      const progress = scrollY / docHeight;
      scrollProgress.style.transform = `scaleX(${progress})`;
    }

    // Navbar effects
    if (navbar) {
      navbar.classList.toggle('scrolled', scrollY > 50);

      // Hide/show on scroll direction
      if (scrollY > 400) {
        navbar.classList.toggle('hidden', scrollY > lastNavScroll);
      } else {
        navbar.classList.remove('hidden');
      }
      lastNavScroll = scrollY;
    }
  }

  window.addEventListener('scroll', () => {
    lastScrollY = window.pageYOffset;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll(lastScrollY);
        ticking = false;
      });
      ticking = true;
    }

    // Add scrolling class for performance
    document.body.classList.add('is-scrolling');
    clearTimeout(window.scrollEndTimer);
    window.scrollEndTimer = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 150);
  }, { passive: true });

  // =====================================================
  // TECH STACK TABS
  // =====================================================
  const techTabs = document.querySelectorAll('.tech-tab');
  const techPanels = document.querySelectorAll('.tech-panel');

  techTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetPanel = this.getAttribute('data-tab');

      // Update active states on tabs
      techTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');

      // Update active states on panels
      techPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.getAttribute('data-panel') === targetPanel) {
          panel.classList.add('active');
        }
      });
    });

    // Keyboard navigation for accessibility
    tab.addEventListener('keydown', function(e) {
      const tabs = Array.from(techTabs);
      const currentIndex = tabs.indexOf(this);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        tabs[prevIndex].focus();
        tabs[prevIndex].click();
      }
    });
  });

  // =====================================================
  // ENHANCED SCROLL ANIMATIONS
  // =====================================================
  const scrollAnimationObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        scrollAnimationObserver.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
  });

  // Observe all scroll-animated elements
  document.querySelectorAll('.scroll-fade-in, .scroll-slide-left, .scroll-slide-right, .card-scale-in').forEach(el => {
    scrollAnimationObserver.observe(el);
  });

  // =====================================================
  // BUTTON RIPPLE EFFECT
  // =====================================================
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.className = 'ripple';

      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  });

  // Mobile Navigation Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (mobileToggle) {
    mobileToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      this.classList.toggle('active');
    });
  }

  // Close mobile menu when clicking a link
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      if (mobileToggle) mobileToggle.classList.remove('active');
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const headerOffset = 100;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // =====================================================
  // UNIFIED SCROLL REVEAL SYSTEM
  // =====================================================
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1
  });

  // Apply scroll-reveal to elements below the fold
  const revealElements = document.querySelectorAll(
    '.section, .section-slide, .service-minimal, .value-item, .process-step, .industry-card, .testimonial-card'
  );

  revealElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.8) {
      el.classList.add('scroll-reveal');
      revealObserver.observe(el);
    }
  });

  // Stagger grids
  document.querySelectorAll('.services-grid-minimal, .value-grid').forEach(grid => {
    const rect = grid.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.8) {
      grid.classList.add('stagger-children');
      revealObserver.observe(grid);
    }
  });

  // Counter animation for stats
  function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);

    const updateCounter = () => {
      start += increment;
      if (start < target) {
        element.textContent = Math.floor(start) + '+';
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target + '+';
      }
    };

    updateCounter();
  }

  // Observe stats section
  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.hero-stat-number').forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            if (target) {
              animateCounter(stat, target);
            }
          });
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statsObserver.observe(statsSection);
  }

  // Form validation and submission
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      // Get form data
      const formData = new FormData(this);
      const data = Object.fromEntries(formData);

      // Basic validation
      let isValid = true;
      const requiredFields = ['name', 'email', 'company', 'message'];

      requiredFields.forEach(field => {
        const input = this.querySelector(`[name="${field}"]`);
        if (!input.value.trim()) {
          input.style.borderColor = '#f43f5e';
          isValid = false;
        } else {
          input.style.borderColor = '#e4e4e7';
        }
      });

      // Email validation
      const emailInput = this.querySelector('[name="email"]');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailInput && !emailRegex.test(emailInput.value)) {
        emailInput.style.borderColor = '#f43f5e';
        isValid = false;
      }

      if (isValid) {
        // Show success message
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        // Simulate form submission (replace with actual API call)
        setTimeout(() => {
          submitBtn.textContent = 'Message Sent!';
          submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';

          // Reset form
          this.reset();

          setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
        }, 1500);
      }
    });
  }

  // Typing effect for hero
  const heroTitle = document.querySelector('.hero-title-animated');
  if (heroTitle) {
    const words = ['Contractors', 'Fabricators', 'Remodelers', 'Builders'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function type() {
      const currentWord = words[wordIndex];

      if (isDeleting) {
        heroTitle.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
        typeSpeed = 50;
      } else {
        heroTitle.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
        typeSpeed = 100;
      }

      if (!isDeleting && charIndex === currentWord.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        typeSpeed = 500;
      }

      setTimeout(type, typeSpeed);
    }

    type();
  }

  // Parallax effect for hero (desktop only for performance)
  const heroContent = document.querySelector('.hero-content');
  const isDesktop = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;

  if (heroContent && isDesktop) {
    let heroTicking = false;

    window.addEventListener('scroll', () => {
      if (!heroTicking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          if (scrolled < window.innerHeight) {
            heroContent.style.transform = `translateY(${scrolled * 0.15}px)`;
            heroContent.style.opacity = 1 - (scrolled / (window.innerHeight * 1.5));
          }
          heroTicking = false;
        });
        heroTicking = true;
      }
    }, { passive: true });
  }

  // =====================================================
  // BACK TO TOP BUTTON
  // =====================================================
  const backToTop = document.querySelector('.back-to-top');

  if (backToTop) {
    window.addEventListener('scroll', throttle(() => {
      if (window.pageYOffset > 500) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, 100));

    backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // =====================================================
  // ENHANCED COUNT-UP ANIMATION
  // =====================================================
  function animateCountUp(element, target, duration = 2000, suffix = '') {
    const startTime = performance.now();
    const startValue = 0;

    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const currentValue = Math.floor(startValue + (target - startValue) * easedProgress);

      element.textContent = currentValue.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.classList.add('animated');
      }
    }

    requestAnimationFrame(update);
  }

  // Observe about stats for count-up
  const aboutStats = document.querySelectorAll('.about-stat-number');
  if (aboutStats.length > 0) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const text = element.textContent.trim();
          const match = text.match(/(\d+)/);

          if (match) {
            const target = parseInt(match[1]);
            const suffix = text.replace(/[\d,]/g, '');
            element.classList.add('count-up');
            animateCountUp(element, target, 2000, suffix);
          }

          statsObserver.unobserve(element);
        }
      });
    }, { threshold: 0.5 });

    aboutStats.forEach(stat => statsObserver.observe(stat));
  }

  // =====================================================
  // ENHANCED FORM VALIDATION
  // =====================================================
  const formInputs = document.querySelectorAll('.form-group input, .form-group textarea');

  formInputs.forEach(input => {
    input.addEventListener('blur', function() {
      validateInput(this);
    });

    input.addEventListener('input', function() {
      // Remove invalid class on input
      this.classList.remove('invalid');
    });
  });

  function validateInput(input) {
    const value = input.value.trim();
    const isRequired = input.hasAttribute('required');
    const type = input.type;

    input.classList.remove('valid', 'invalid');

    if (isRequired && !value) {
      input.classList.add('invalid');
      return false;
    }

    if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        input.classList.add('invalid');
        return false;
      }
    }

    if (value) {
      input.classList.add('valid');
    }

    return true;
  }

  // =====================================================
  // LAZY LOAD IMAGES
  // =====================================================
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.classList.add('lazy-image');

          img.addEventListener('load', () => {
            img.classList.add('loaded');
          });

          imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: '50px' });

    lazyImages.forEach(img => imageObserver.observe(img));
  }

  // =====================================================
  // SMOOTH REVEAL FOR SECTIONS
  // =====================================================
  const sections = document.querySelectorAll('.section');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-visible');
      }
    });
  }, { threshold: 0.1 });

  sections.forEach(section => sectionObserver.observe(section));

  // =====================================================
  // TOAST NOTIFICATION SYSTEM
  // =====================================================
  window.showToast = function(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span>${message}</span>
      <button class="toast-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      removeToast(toast);
    });

    // Auto remove
    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }

    return toast;
  };

  function removeToast(toast) {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }

  // =====================================================
  // CURSOR GLOW EFFECT (Desktop)
  // =====================================================
  const cursorGlow = document.getElementById('cursor-glow');

  if (cursorGlow && window.matchMedia('(pointer: fine)').matches) {
    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function updateCursorGlow() {
      const speed = 0.15;
      glowX += (mouseX - glowX) * speed;
      glowY += (mouseY - glowY) * speed;

      cursorGlow.style.left = `${glowX}px`;
      cursorGlow.style.top = `${glowY}px`;

      requestAnimationFrame(updateCursorGlow);
    }

    updateCursorGlow();
  }

  // =====================================================
  // ENHANCED FORM SUBMISSION
  // =====================================================
  const contactFormEnhanced = document.querySelector('#contact-form');

  if (contactFormEnhanced) {
    contactFormEnhanced.addEventListener('submit', function(e) {
      e.preventDefault();

      const submitBtn = this.querySelector('button[type="submit"]');
      const originalContent = submitBtn.innerHTML;

      // Validate all inputs
      let isValid = true;
      this.querySelectorAll('input[required], textarea[required]').forEach(input => {
        if (!validateInput(input)) {
          isValid = false;
        }
      });

      if (!isValid) {
        showToast('Please fill in all required fields correctly.', 'error');
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        Sending...
      `;

      // Get form data
      const formData = new FormData(this);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company'),
        message: formData.get('message'),
        formType: 'contact'
      };

      const form = this;

      // Submit to Firebase
      if (typeof window.captureLeadToFirebase === 'function') {
        window.captureLeadToFirebase(data).then(success => {
          if (success) {
            submitBtn.classList.add('btn-success');
            submitBtn.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Message Sent!
            `;
            showToast('Thank you! We\'ll be in touch soon.', 'success');
            form.reset();
            form.querySelectorAll('input, textarea').forEach(el => {
              el.classList.remove('valid', 'invalid');
            });
          } else {
            submitBtn.innerHTML = 'Error - Try Again';
            showToast('Error sending message. Please try again.', 'error');
          }

          // Reset button after delay
          setTimeout(() => {
            submitBtn.classList.remove('btn-success');
            submitBtn.innerHTML = originalContent;
            submitBtn.disabled = false;
          }, 3000);
        });
      } else {
        // Fallback
        setTimeout(() => {
          submitBtn.innerHTML = originalContent;
          submitBtn.disabled = false;
          showToast('Error submitting form. Please try again.', 'error');
        }, 1000);
      }
    });
  }

  // =====================================================
  // HORIZONTAL SLIDESHOW / CAROUSEL
  // =====================================================
  const slideshows = document.querySelectorAll('.slideshow');

  slideshows.forEach(slideshow => {
    const container = slideshow.querySelector('.slideshow-container');
    const slides = slideshow.querySelectorAll('.slideshow-slide');
    const prevBtn = slideshow.querySelector('.slideshow-nav.prev');
    const nextBtn = slideshow.querySelector('.slideshow-nav.next');
    const dots = slideshow.querySelectorAll('.slideshow-dot');

    if (!container || slides.length === 0) return;

    let currentSlide = 0;
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let autoPlayInterval = null;
    const totalSlides = slides.length;

    // Go to specific slide
    function goToSlide(index, animate = true) {
      // Wrap around
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;

      currentSlide = index;

      // Apply transform
      container.style.transition = animate ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
      container.style.transform = `translateX(-${currentSlide * 100}%)`;

      // Update dots
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
      });
    }

    // Navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        goToSlide(currentSlide - 1);
        resetAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        goToSlide(currentSlide + 1);
        resetAutoPlay();
      });
    }

    // Dot navigation
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        goToSlide(index);
        resetAutoPlay();
      });
    });

    // Touch/swipe support
    container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
      container.style.transition = 'none';
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      const percent = (diff / slideshow.offsetWidth) * 100;
      container.style.transform = `translateX(calc(-${currentSlide * 100}% + ${percent}%))`;
    }, { passive: true });

    container.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;

      const diff = currentX - startX;
      const threshold = slideshow.offsetWidth * 0.2; // 20% threshold

      if (diff > threshold) {
        goToSlide(currentSlide - 1);
      } else if (diff < -threshold) {
        goToSlide(currentSlide + 1);
      } else {
        goToSlide(currentSlide);
      }

      resetAutoPlay();
    });

    // Mouse drag support for desktop
    let mouseStartX = 0;
    let isMouseDragging = false;

    container.addEventListener('mousedown', (e) => {
      mouseStartX = e.clientX;
      isMouseDragging = true;
      container.style.transition = 'none';
      container.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isMouseDragging) return;
      const diff = e.clientX - mouseStartX;
      const percent = (diff / slideshow.offsetWidth) * 100;
      container.style.transform = `translateX(calc(-${currentSlide * 100}% + ${percent}%))`;
    });

    document.addEventListener('mouseup', (e) => {
      if (!isMouseDragging) return;
      isMouseDragging = false;
      container.style.cursor = 'grab';

      const diff = e.clientX - mouseStartX;
      const threshold = slideshow.offsetWidth * 0.15;

      if (diff > threshold) {
        goToSlide(currentSlide - 1);
      } else if (diff < -threshold) {
        goToSlide(currentSlide + 1);
      } else {
        goToSlide(currentSlide);
      }

      resetAutoPlay();
    });

    // Keyboard navigation
    slideshow.setAttribute('tabindex', '0');
    slideshow.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        goToSlide(currentSlide - 1);
        resetAutoPlay();
      } else if (e.key === 'ArrowRight') {
        goToSlide(currentSlide + 1);
        resetAutoPlay();
      }
    });

    // Auto-play functionality
    function startAutoPlay() {
      autoPlayInterval = setInterval(() => {
        goToSlide(currentSlide + 1);
      }, 5000); // 5 second intervals
    }

    function resetAutoPlay() {
      clearInterval(autoPlayInterval);
      startAutoPlay();
    }

    // Pause on hover
    slideshow.addEventListener('mouseenter', () => {
      clearInterval(autoPlayInterval);
    });

    slideshow.addEventListener('mouseleave', () => {
      startAutoPlay();
    });

    // Initial setup
    container.style.cursor = 'grab';
    goToSlide(0, false);
    startAutoPlay();

    // Pause when not visible (Intersection Observer)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startAutoPlay();
        } else {
          clearInterval(autoPlayInterval);
        }
      });
    }, { threshold: 0.5 });

    observer.observe(slideshow);
  });

  console.log('Remodely AI site initialized with enhancements');
});

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// =====================================================
// ANIMATED NUMBER COUNTERS
// =====================================================
function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();
  const suffix = element.dataset.suffix || '';
  const prefix = element.dataset.prefix || '';

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * easeOut);

    element.textContent = prefix + current.toLocaleString() + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// Initialize counters when visible
const counterElements = document.querySelectorAll('[data-counter]');
if (counterElements.length > 0) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        const target = parseInt(entry.target.dataset.counter, 10);
        animateCounter(entry.target, target);
        entry.target.dataset.counted = 'true';
      }
    });
  }, { threshold: 0.5 });

  counterElements.forEach(el => counterObserver.observe(el));
}

// =====================================================
// IMAGE LIGHTBOX / MODAL
// =====================================================
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.innerHTML = `
  <button class="lightbox-close" aria-label="Close">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
  <button class="lightbox-nav lightbox-prev" aria-label="Previous">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  </button>
  <button class="lightbox-nav lightbox-next" aria-label="Next">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  </button>
  <div class="lightbox-content">
    <img src="" alt="">
    <div class="lightbox-caption"></div>
  </div>
`;
document.body.appendChild(lightbox);

let lightboxImages = [];
let currentLightboxIndex = 0;

// Gather lightbox-enabled images
document.querySelectorAll('.portfolio-image img, .gallery-item img, .showcase-slide img').forEach((img, index) => {
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => {
    openLightbox(img.src, img.alt, index);
  });
  lightboxImages.push({ src: img.src, alt: img.alt });
});

function openLightbox(src, alt, index) {
  currentLightboxIndex = index;
  const img = lightbox.querySelector('img');
  const caption = lightbox.querySelector('.lightbox-caption');
  img.src = src;
  img.alt = alt;
  caption.textContent = alt;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function navigateLightbox(direction) {
  currentLightboxIndex += direction;
  if (currentLightboxIndex < 0) currentLightboxIndex = lightboxImages.length - 1;
  if (currentLightboxIndex >= lightboxImages.length) currentLightboxIndex = 0;

  const { src, alt } = lightboxImages[currentLightboxIndex];
  const img = lightbox.querySelector('img');
  const caption = lightbox.querySelector('.lightbox-caption');

  img.style.opacity = '0';
  setTimeout(() => {
    img.src = src;
    img.alt = alt;
    caption.textContent = alt;
    img.style.opacity = '1';
  }, 150);
}

lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
lightbox.querySelector('.lightbox-prev').addEventListener('click', () => navigateLightbox(-1));
lightbox.querySelector('.lightbox-next').addEventListener('click', () => navigateLightbox(1));
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

// =====================================================
// PARTICLE EFFECT FOR HERO
// =====================================================
const heroSection = document.querySelector('.hero');
if (heroSection) {
  const particleContainer = document.createElement('div');
  particleContainer.className = 'particle-container';
  heroSection.appendChild(particleContainer);

  function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Random properties
    const size = Math.random() * 4 + 2;
    const startX = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 5;

    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${startX}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;

    particleContainer.appendChild(particle);

    // Remove particle after animation
    setTimeout(() => {
      particle.remove();
    }, (duration + delay) * 1000);
  }

  // Create initial particles
  for (let i = 0; i < 30; i++) {
    setTimeout(() => createParticle(), i * 200);
  }

  // Continuously create new particles
  setInterval(createParticle, 800);
}

// =====================================================
// SMOOTH REVEAL ANIMATIONS
// =====================================================
const revealElements = document.querySelectorAll('.reveal-on-scroll');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

// =====================================================
// TILT EFFECT ON CARDS
// =====================================================
const tiltCards = document.querySelectorAll('.service-card, .portfolio-card');
tiltCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
  });
});

// =====================================================
// MAGNETIC BUTTONS
// =====================================================
const magneticButtons = document.querySelectorAll('.btn-primary, .nav-cta');
magneticButtons.forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translate(0, 0)';
  });
});

// =====================================================
// TYPING EFFECT FOR HERO
// =====================================================
const typingElement = document.querySelector('.typing-text');
if (typingElement) {
  const texts = ['AI Technology', 'Voice Agents', 'Automation', 'Smart CRMs'];
  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeEffect() {
    const currentText = texts[textIndex];

    if (isDeleting) {
      typingElement.textContent = currentText.substring(0, charIndex - 1);
      charIndex--;
    } else {
      typingElement.textContent = currentText.substring(0, charIndex + 1);
      charIndex++;
    }

    let typeSpeed = isDeleting ? 50 : 100;

    if (!isDeleting && charIndex === currentText.length) {
      typeSpeed = 2000; // Pause at end
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      typeSpeed = 500; // Pause before next word
    }

    setTimeout(typeEffect, typeSpeed);
  }

  typeEffect();
}

// =====================================================
// SCROLL-TRIGGERED PROGRESS BARS
// =====================================================
const progressBars = document.querySelectorAll('.progress-bar');
const progressObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const bar = entry.target;
      const target = bar.dataset.progress || 100;
      bar.style.width = target + '%';
    }
  });
}, { threshold: 0.5 });

progressBars.forEach(bar => progressObserver.observe(bar));

// =====================================================
// PARALLAX SCROLLING FOR IMAGES
// =====================================================
const parallaxImages = document.querySelectorAll('.parallax-img');
window.addEventListener('scroll', throttle(() => {
  parallaxImages.forEach(img => {
    const rect = img.getBoundingClientRect();
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.3;

    if (rect.top < window.innerHeight && rect.bottom > 0) {
      img.style.transform = `translateY(${rate}px)`;
    }
  });
}, 16));


// =====================================================
// VIDEO PLAYER INTERACTION
// =====================================================
const videoPlaceholder = document.getElementById('video-placeholder');
if (videoPlaceholder) {
  const playButton = videoPlaceholder.querySelector('.play-button');
  if (playButton) {
    playButton.addEventListener('click', () => {
      // Create video modal
      const videoModal = document.createElement('div');
      videoModal.className = 'video-modal active';
      videoModal.innerHTML = `
        <div class="video-modal-content">
          <button class="video-modal-close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="video-modal-player">
            <iframe 
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
              allow="autoplay; encrypted-media" 
              allowfullscreen>
            </iframe>
          </div>
        </div>
      `;
      document.body.appendChild(videoModal);
      document.body.style.overflow = 'hidden';

      // Close handlers
      videoModal.querySelector('.video-modal-close').addEventListener('click', () => {
        videoModal.remove();
        document.body.style.overflow = '';
      });
      videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
          videoModal.remove();
          document.body.style.overflow = '';
        }
      });
    });
  }
}

// =====================================================
// SMOOTH NUMBER COUNTING FOR VISIBLE STATS
// =====================================================
const statNumbers = document.querySelectorAll('.result-number, .about-stat-number');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      entry.target.dataset.animated = 'true';
      const text = entry.target.textContent;
      const match = text.match(/(\d+)/);
      if (match) {
        const target = parseInt(match[1], 10);
        const prefix = text.split(match[1])[0] || '';
        const suffix = text.split(match[1])[1] || '';
        animateValue(entry.target, 0, target, 2000, prefix, suffix);
      }
    }
  });
}, { threshold: 0.5 });

function animateValue(element, start, end, duration, prefix, suffix) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * easeOut);

    element.textContent = prefix + current + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

statNumbers.forEach(num => statObserver.observe(num));

// =====================================================
// ENHANCED SCROLL PROGRESS
// =====================================================
const scrollProgress = document.querySelector('.scroll-progress-bar');
if (scrollProgress) {
  window.addEventListener('scroll', throttle(() => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    scrollProgress.style.width = scrollPercent + '%';
  }, 16));
}

// =====================================================
// KEYBOARD ACCESSIBILITY ENHANCEMENTS
// =====================================================
document.querySelectorAll('.service-card, .portfolio-card, .industry-card, .result-card').forEach(card => {
  card.setAttribute('tabindex', '0');
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const link = card.querySelector('a');
      if (link) link.click();
    }
  });
});

// =====================================================
// LAZY LOAD IMAGES WITH BLUR EFFECT
// =====================================================
const lazyImages = document.querySelectorAll('img[loading="lazy"]');
lazyImages.forEach(img => {
  img.style.filter = 'blur(5px)';
  img.style.transition = 'filter 0.5s ease';

  if (img.complete) {
    img.style.filter = 'blur(0)';
  } else {
    img.addEventListener('load', () => {
      img.style.filter = 'blur(0)';
    });
  }
});

console.log('Additional enhancements loaded');

// =====================================================
// CARD SPOTLIGHT EFFECT
// =====================================================
document.querySelectorAll('.service-card, .portfolio-card, .result-card, .testimonial-card').forEach(card => {
  card.classList.add('card-spotlight');

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    card.style.setProperty('--mouse-x', x + '%');
    card.style.setProperty('--mouse-y', y + '%');
  });
});

// =====================================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// =====================================================
const animateOnScrollElements = document.querySelectorAll('.service-card, .portfolio-card, .result-card, .industry-card, .testimonial-card, .video-feature');

const animationObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, index * 100);
      animationObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

animateOnScrollElements.forEach(el => {
  // Only animate elements that are below the viewport on initial load
  const rect = el.getBoundingClientRect();
  const isAboveViewport = rect.top < window.innerHeight;

  if (isAboveViewport) {
    // Element is visible on load - don't hide it
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  } else {
    // Element is below viewport - set up animation
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    animationObserver.observe(el);
  }
});

// =====================================================
// SMOOTH ANCHOR SCROLLING
// =====================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    e.preventDefault();
    const target = document.querySelector(href);
    
    if (target) {
      const navHeight = navbar.offsetHeight;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// =====================================================
// FORM VALIDATION VISUAL FEEDBACK
// =====================================================
document.querySelectorAll('input, textarea').forEach(input => {
  input.addEventListener('blur', function() {
    if (this.value.trim() !== '') {
      this.classList.add('has-value');
    } else {
      this.classList.remove('has-value');
    }
  });
});

// =====================================================
// COPY EMAIL TO CLIPBOARD
// =====================================================
const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
emailLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    const email = this.href.replace('mailto:', '');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(() => {
        showToast('Email copied to clipboard!', 'success');
      });
    }
  });
});

// =====================================================
// DYNAMIC YEAR IN FOOTER
// =====================================================
const yearSpan = document.querySelector('.current-year');
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

console.log('All enhancements fully loaded');

// =====================================================
// ENHANCED IMAGE LAZY LOADING
// =====================================================
document.querySelectorAll('img[loading="lazy"]').forEach(img => {
  if (img.complete) {
    img.classList.add('loaded');
  } else {
    img.addEventListener('load', () => {
      img.classList.add('loaded');
    });
  }
});

// =====================================================
// MOBILE MENU TOGGLE
// =====================================================
const mobileToggle = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle && navLinks) {
  mobileToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('active');
    mobileToggle.classList.toggle('active');
    document.body.classList.toggle('menu-open', isOpen);
  });

  // Close menu when clicking a link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileToggle.classList.remove('active');
      navLinks.classList.remove('active');
      document.body.classList.remove('menu-open');
    });
  });

  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
      mobileToggle.classList.remove('active');
      navLinks.classList.remove('active');
      document.body.classList.remove('menu-open');
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('active') &&
        !navLinks.contains(e.target) &&
        !mobileToggle.contains(e.target)) {
      mobileToggle.classList.remove('active');
      navLinks.classList.remove('active');
      document.body.classList.remove('menu-open');
    }
  });
}

// =====================================================
// SCROLL-BASED SECTION ANIMATIONS
// =====================================================
const sections = document.querySelectorAll('.section, .section-slide');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('section-visible');
    }
  });
}, { threshold: 0.1 });

sections.forEach(section => sectionObserver.observe(section));

// =====================================================
// PRELOAD CRITICAL IMAGES
// =====================================================
const criticalImages = document.querySelectorAll('.hero img, .slideshow-slide:first-child img');
criticalImages.forEach(img => {
  if (img.dataset.src) {
    img.src = img.dataset.src;
  }
});

// =====================================================
// PERFORMANCE: REDUCE ANIMATIONS ON SCROLL
// =====================================================
let isScrolling = false;

window.addEventListener('scroll', () => {
  if (!isScrolling) {
    document.body.classList.add('is-scrolling');
  }
  isScrolling = true;

  clearTimeout(window.scrollTimeout);
  window.scrollTimeout = setTimeout(() => {
    document.body.classList.remove('is-scrolling');
    isScrolling = false;
  }, 150);
});

// =====================================================
// AUTO-PAUSE VIDEOS WHEN NOT IN VIEW
// =====================================================
const videos = document.querySelectorAll('video');
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.play();
    } else {
      entry.target.pause();
    }
  });
}, { threshold: 0.5 });

videos.forEach(video => videoObserver.observe(video));

// =====================================================
// ESCAPE KEY CLOSES MODALS
// =====================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Close any open modals
    document.querySelectorAll('.lightbox.active, .video-modal.active').forEach(modal => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Close mobile menu
    if (mobileToggle && navLinks) {
      mobileToggle.classList.remove('active');
      navLinks.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});

// =====================================================
// LAZY IMAGE LOADING WITH FADE-IN
// =====================================================
const lazyLoadImages = document.querySelectorAll('img[loading="lazy"]');

lazyLoadImages.forEach(img => {
  if (img.complete) {
    img.classList.add('loaded');
  } else {
    img.addEventListener('load', () => {
      img.classList.add('loaded');
    });
  }
});

// =====================================================
// ENHANCED CURSOR EFFECTS
// =====================================================
const interactiveElements = document.querySelectorAll('a, button, .btn-primary, .btn-secondary, .service-card, .portfolio-card, .tech-item');

interactiveElements.forEach(el => {
  el.addEventListener('mouseenter', () => {
    document.body.style.cursor = 'pointer';
  });

  el.addEventListener('mouseleave', () => {
    document.body.style.cursor = 'default';
  });
});

// =====================================================
// SMOOTH SCROLL REVEAL FOR SECTIONS
// =====================================================
const scrollRevealElements = document.querySelectorAll('.section-header, .service-card, .portfolio-card, .result-card, .process-step');

const scrollRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      scrollRevealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px'
});

scrollRevealElements.forEach(el => {
  scrollRevealObserver.observe(el);
});

// =====================================================
// ANIMATED TEXT TYPING EFFECT
// =====================================================
function typeText(element, text, speed = 50) {
  let i = 0;
  element.textContent = '';

  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }

  type();
}

// =====================================================
// PARALLAX EFFECT FOR HERO ELEMENTS
// =====================================================
const heroElements = document.querySelectorAll('.hero-glow, .floating-card');

if (heroElements.length > 0) {
  window.addEventListener('scroll', throttle(() => {
    const scrollY = window.scrollY;

    heroElements.forEach((el, index) => {
      const speed = 0.1 + (index * 0.05);
      el.style.transform = `translateY(${scrollY * speed}px)`;
    });
  }, 16));
}

// =====================================================
// SMOOTH COUNT-UP FOR VISIBLE NUMBERS
// =====================================================
const numberElements = document.querySelectorAll('[data-counter]');

const numberObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
      entry.target.classList.add('counted');

      const target = parseInt(entry.target.dataset.counter);
      const prefix = entry.target.dataset.prefix || '';
      const suffix = entry.target.dataset.suffix || '';
      const duration = 2000;

      let start = 0;
      const startTime = performance.now();

      function updateCount(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(easeOutQuart * target);

        entry.target.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
        entry.target.setAttribute('data-counting', 'true');

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          entry.target.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
          entry.target.removeAttribute('data-counting');
        }
      }

      requestAnimationFrame(updateCount);
    }
  });
}, { threshold: 0.5 });

numberElements.forEach(el => numberObserver.observe(el));

// =====================================================
// BUTTON CLICK RIPPLE EFFECT
// =====================================================
document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();

    ripple.style.cssText = `
      position: absolute;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      pointer-events: none;
      transform: scale(0);
      animation: rippleEffect 0.6s ease-out;
    `;

    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  });
});

// Add ripple keyframes to head
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes rippleEffect {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);

// =====================================================
// KEYBOARD NAVIGATION SUPPORT
// =====================================================
document.addEventListener('keydown', (e) => {
  // Tab navigation for cards
  if (e.key === 'Tab') {
    document.body.classList.add('keyboard-nav');
  }
});

document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-nav');
});

// =====================================================
// HERO LEAD FORM HANDLING
// =====================================================
const heroLeadForm = document.getElementById('hero-lead-form');

if (heroLeadForm) {
  heroLeadForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const submitBtn = this.querySelector('.lead-form-submit');
    const originalText = submitBtn.innerHTML;

    // Show loading state
    submitBtn.innerHTML = `
      <span>Submitting...</span>
      <span class="loading-dots">
        <span></span><span></span><span></span>
      </span>
    `;
    submitBtn.disabled = true;

    // Get form data
    const formData = new FormData(this);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      business: formData.get('business'),
      formType: 'hero-lead'
    };

    const form = this;

    // Submit to Firebase
    if (typeof window.captureLeadToFirebase === 'function') {
      window.captureLeadToFirebase(data).then(success => {
        if (success) {
          // Show success
          submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Request Sent!</span>
          `;
          submitBtn.style.background = '#059669';
          form.reset();

          if (typeof showToast === 'function') {
            showToast('Thanks! We\'ll be in touch within 24 hours.', 'success');
          }
        } else {
          submitBtn.innerHTML = '<span>Error - Try Again</span>';
          submitBtn.style.background = '#dc2626';
        }

        // Reset button after delay
        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 3000);
      });
    } else {
      // Fallback if Firebase not loaded
      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        if (typeof showToast === 'function') {
          showToast('Error submitting form. Please try again.', 'error');
        }
      }, 1000);
    }
  });

  // Add input validation styling
  heroLeadForm.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('blur', function() {
      if (this.required && !this.value) {
        this.style.borderColor = '#ef4444';
      } else {
        this.style.borderColor = '';
      }
    });

    input.addEventListener('input', function() {
      this.style.borderColor = '';
    });
  });
}

console.log('Remodely AI - Full site loaded with enhanced interactivity');

// =====================================================
// STARFIELD CANVAS BACKGROUND
// =====================================================
(function() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  // Respect reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ctx = canvas.getContext('2d');
  let width, height;
  let stars = [];
  let shootingStars = [];
  let animationId;

  // Star configuration
  const STAR_COUNT = 400;
  const SHOOTING_STAR_INTERVAL = 6000; // ms between shooting stars

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createStar() {
    const layer = Math.random(); // 0-1, determines depth
    let size, alpha, speed, twinkleSpeed;

    if (layer < 0.6) {
      // Small distant stars (60%)
      size = Math.random() * 1 + 0.3;
      alpha = Math.random() * 0.4 + 0.1;
      speed = Math.random() * 0.02 + 0.005;
      twinkleSpeed = Math.random() * 0.008 + 0.002;
    } else if (layer < 0.9) {
      // Medium stars (30%)
      size = Math.random() * 1.5 + 0.8;
      alpha = Math.random() * 0.5 + 0.2;
      speed = Math.random() * 0.04 + 0.01;
      twinkleSpeed = Math.random() * 0.015 + 0.005;
    } else {
      // Large bright stars (10%)
      size = Math.random() * 2 + 1.2;
      alpha = Math.random() * 0.6 + 0.4;
      speed = Math.random() * 0.06 + 0.02;
      twinkleSpeed = Math.random() * 0.025 + 0.01;
    }

    // Star color: mostly white, some blue-ish, some warm
    const colorRand = Math.random();
    let color;
    if (colorRand < 0.7) {
      color = '255, 255, 255'; // white
    } else if (colorRand < 0.85) {
      color = '180, 200, 255'; // cool blue
    } else if (colorRand < 0.95) {
      color = '200, 180, 255'; // purple-ish
    } else {
      color = '255, 220, 180'; // warm
    }

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: size,
      baseAlpha: alpha,
      alpha: alpha,
      speed: speed,
      twinkleSpeed: twinkleSpeed,
      twinkleOffset: Math.random() * Math.PI * 2,
      color: color,
      driftX: (Math.random() - 0.5) * 0.05,
      driftY: (Math.random() - 0.5) * 0.03
    };
  }

  function createShootingStar() {
    const startX = Math.random() * width * 0.8;
    const startY = Math.random() * height * 0.4;

    return {
      x: startX,
      y: startY,
      length: Math.random() * 80 + 40,
      speed: Math.random() * 8 + 6,
      angle: (Math.random() * 0.4 + 0.2) * Math.PI, // roughly diagonal
      alpha: 1,
      decay: Math.random() * 0.015 + 0.01,
      width: Math.random() * 1.5 + 0.5
    };
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(createStar());
    }
  }

  let time = 0;

  function drawStar(star) {
    // Twinkle effect
    star.alpha = star.baseAlpha + Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * star.baseAlpha * 0.5;

    // Subtle drift
    if (!prefersReducedMotion) {
      star.x += star.driftX;
      star.y += star.driftY;

      // Wrap around
      if (star.x < -10) star.x = width + 10;
      if (star.x > width + 10) star.x = -10;
      if (star.y < -10) star.y = height + 10;
      if (star.y > height + 10) star.y = -10;
    }

    ctx.beginPath();

    if (star.size > 1.5) {
      // Larger stars get a soft glow
      const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
      gradient.addColorStop(0, `rgba(${star.color}, ${star.alpha})`);
      gradient.addColorStop(0.3, `rgba(${star.color}, ${star.alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(${star.color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
    } else {
      ctx.fillStyle = `rgba(${star.color}, ${star.alpha})`;
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    }

    ctx.fill();
  }

  function drawShootingStar(star) {
    const tailX = star.x - Math.cos(star.angle) * star.length;
    const tailY = star.y - Math.sin(star.angle) * star.length;

    const gradient = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
    gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
    gradient.addColorStop(0.6, `rgba(200, 210, 255, ${star.alpha * 0.3})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, ${star.alpha})`);

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(star.x, star.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = star.width;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Bright head
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.width, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    time++;

    // Draw stars
    for (let i = 0; i < stars.length; i++) {
      drawStar(stars[i]);
    }

    // Draw and update shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      drawShootingStar(ss);

      if (!prefersReducedMotion) {
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.alpha -= ss.decay;
      }

      if (ss.alpha <= 0 || ss.x > width + 100 || ss.y > height + 100) {
        shootingStars.splice(i, 1);
      }
    }

    animationId = requestAnimationFrame(animate);
  }

  // Initialize
  resize();
  initStars();

  if (!prefersReducedMotion) {
    animate();

    // Periodic shooting stars
    setInterval(() => {
      if (shootingStars.length < 2) {
        shootingStars.push(createShootingStar());
      }
    }, SHOOTING_STAR_INTERVAL);
  } else {
    // Static render for reduced motion
    for (let i = 0; i < stars.length; i++) {
      drawStar(stars[i]);
    }
  }

  // Handle resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resize();
      initStars();
    }, 250);
  }, { passive: true });

  // Pause animation when tab not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else if (!prefersReducedMotion) {
      animate();
    }
  });
})();

/* =====================================================
   MOBILE PRESENTATION MODE
   No-scroll, high-converting experience for contractors
   ===================================================== */
(function() {
  'use strict';

  // Only activate on mobile
  function isMobile() {
    return window.innerWidth <= 768;
  }

  // Enable/disable presentation mode
  function setPresentationMode(enabled) {
    if (enabled) {
      document.documentElement.classList.add('mobile-presentation');
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.classList.remove('mobile-presentation');
      document.body.style.overflow = '';
    }
  }

  // Initialize on load
  if (isMobile()) {
    setPresentationMode(true);
  }

  // Handle resize
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      setPresentationMode(isMobile());
    }, 250);
  }, { passive: true });

  // Form card elements
  const formCard = document.getElementById('mobileFormCard');
  const expandBtn = document.getElementById('expandFormBtn');
  const closeBtn = document.getElementById('closeFormBtn');
  const successBtn = document.getElementById('successCloseBtn');
  const mobileForm = document.getElementById('mobileLeadForm');
  const serviceOptions = document.querySelectorAll('.mobile-service-option');

  if (!formCard) return;

  // Expand form card
  if (expandBtn) {
    expandBtn.addEventListener('click', function() {
      formCard.classList.add('expanded');
      // Focus first input after animation
      setTimeout(function() {
        const firstInput = formCard.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 400);
    });
  }

  // Close form card
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      formCard.classList.remove('expanded');
    });
  }

  // Success close button
  if (successBtn) {
    successBtn.addEventListener('click', function() {
      formCard.classList.remove('expanded', 'success');
      // Reset form
      if (mobileForm) mobileForm.reset();
      serviceOptions.forEach(function(opt) {
        opt.classList.remove('selected');
      });
    });
  }

  // Service option selection
  serviceOptions.forEach(function(option) {
    option.addEventListener('click', function() {
      // Allow multiple selections or single - using single for now
      serviceOptions.forEach(function(opt) {
        opt.classList.remove('selected');
      });
      this.classList.add('selected');
    });
  });

  // Form submission
  if (mobileForm) {
    mobileForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(mobileForm);
      const selectedService = document.querySelector('.mobile-service-option.selected');

      // Get form values
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        service: selectedService ? selectedService.dataset.value : 'not-selected',
        source: 'mobile-presentation',
        timestamp: new Date().toISOString()
      };

      // Try to submit to Firebase if available
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        firebase.firestore().collection('leads').add(data)
          .then(function() {
            formCard.classList.add('success');
          })
          .catch(function(error) {
            console.error('Error submitting lead:', error);
            // Still show success to user
            formCard.classList.add('success');
          });
      } else {
        // No Firebase, just show success
        formCard.classList.add('success');
      }
    });
  }

  // Handle back gesture / escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && formCard.classList.contains('expanded')) {
      formCard.classList.remove('expanded', 'success');
    }
  });

  // Prevent background scroll when form is expanded
  formCard.addEventListener('touchmove', function(e) {
    if (formCard.classList.contains('expanded')) {
      e.stopPropagation();
    }
  }, { passive: false });

})();
