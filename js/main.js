// Remodely AI - Optimized Main JavaScript
// Mobile-first, performance-optimized

document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  // =====================================================
  // UTILITIES
  // =====================================================
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

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const isMobile = window.innerWidth <= 768;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =====================================================
  // SCROLL PROGRESS BAR
  // =====================================================
  const scrollProgress = document.createElement('div');
  scrollProgress.className = 'scroll-progress';
  scrollProgress.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#3b82f6,#8b5cf6);z-index:9999;transform-origin:left;transform:scaleX(0);';
  document.body.prepend(scrollProgress);

  // =====================================================
  // NAVBAR & SCROLL HANDLING (Single optimized handler)
  // =====================================================
  const navbar = document.querySelector('.navbar');
  let lastScrollY = 0;
  let ticking = false;

  function handleScroll() {
    const scrollY = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Update scroll progress
    if (docHeight > 0) {
      scrollProgress.style.transform = `scaleX(${scrollY / docHeight})`;
    }

    // Navbar effects
    if (navbar) {
      navbar.classList.toggle('scrolled', scrollY > 50);

      // Hide on scroll down, show on scroll up (only after 400px)
      if (scrollY > 400) {
        navbar.classList.toggle('hidden', scrollY > lastScrollY);
      } else {
        navbar.classList.remove('hidden');
      }
    }

    lastScrollY = scrollY;
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }, { passive: true });

  // =====================================================
  // MOBILE NAVIGATION
  // =====================================================
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', function() {
      const isOpen = navLinks.classList.toggle('active');
      this.classList.toggle('active');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileToggle.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
      if (navLinks.classList.contains('active') &&
          !navLinks.contains(e.target) &&
          !mobileToggle.contains(e.target)) {
        navLinks.classList.remove('active');
        mobileToggle.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

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
        const navHeight = navbar ? navbar.offsetHeight : 80;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // =====================================================
  // SINGLE INTERSECTION OBSERVER FOR ALL ANIMATIONS
  // =====================================================
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // Observe all animatable elements
  document.querySelectorAll('.section, .section-header, .service-card, .portfolio-card, .result-card, .process-step, .industry-card, .testimonial-card, .scroll-fade-in, .scroll-slide-left, .scroll-slide-right').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.8) {
      el.classList.add('scroll-reveal');
      revealObserver.observe(el);
    }
  });

  // =====================================================
  // COUNTER ANIMATION (Single observer)
  // =====================================================
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = 'true';
        const target = parseInt(entry.target.dataset.counter || entry.target.dataset.target || entry.target.textContent.replace(/\D/g, ''));
        if (target) {
          animateCounter(entry.target, target);
        }
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  function animateCounter(element, target, duration = 2000) {
    const startTime = performance.now();
    const suffix = element.dataset.suffix || (element.textContent.includes('+') ? '+' : '');
    const prefix = element.dataset.prefix || '';

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(target * easeOut);

      element.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  // Observe counters
  document.querySelectorAll('[data-counter], [data-target], .hero-stat-number, .about-stat-number, .result-number').forEach(el => {
    counterObserver.observe(el);
  });

  // =====================================================
  // TECH STACK TABS
  // =====================================================
  const techTabs = document.querySelectorAll('.tech-tab');
  const techPanels = document.querySelectorAll('.tech-panel');

  techTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetPanel = this.getAttribute('data-tab');

      techTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');

      techPanels.forEach(panel => {
        panel.classList.toggle('active', panel.getAttribute('data-panel') === targetPanel);
      });
    });
  });

  // =====================================================
  // TYPING EFFECT
  // =====================================================
  const heroTitle = document.querySelector('.hero-title-animated');
  if (heroTitle && !prefersReducedMotion) {
    const words = ['Contractors', 'Fabricators', 'Remodelers', 'Builders'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
      const currentWord = words[wordIndex];

      if (isDeleting) {
        heroTitle.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
      } else {
        heroTitle.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
      }

      let typeSpeed = isDeleting ? 50 : 100;

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

  // =====================================================
  // TOAST NOTIFICATION SYSTEM
  // =====================================================
  window.showToast = function(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = 'background:#1e293b;color:#fff;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;gap:10px;transform:translateX(100%);transition:transform 0.3s ease;';

    if (type === 'success') toast.style.borderLeft = '4px solid #22c55e';
    if (type === 'error') toast.style.borderLeft = '4px solid #ef4444';

    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });

    if (duration > 0) {
      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  };

  // =====================================================
  // FORM VALIDATION
  // =====================================================
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

    if (value) input.classList.add('valid');
    return true;
  }

  document.querySelectorAll('.form-group input, .form-group textarea').forEach(input => {
    input.addEventListener('blur', function() {
      validateInput(this);
    });
    input.addEventListener('input', function() {
      this.classList.remove('invalid');
    });
  });

  // =====================================================
  // CONTACT FORM SUBMISSION
  // =====================================================
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const submitBtn = this.querySelector('button[type="submit"]');
      const originalContent = submitBtn.innerHTML;

      let isValid = true;
      this.querySelectorAll('input[required], textarea[required]').forEach(input => {
        if (!validateInput(input)) isValid = false;
      });

      if (!isValid) {
        showToast('Please fill in all required fields correctly.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending...';

      const formData = new FormData(this);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company'),
        message: formData.get('message'),
        formType: 'contact'
      };

      const form = this;

      if (typeof window.captureLeadToFirebase === 'function') {
        window.captureLeadToFirebase(data).then(success => {
          if (success) {
            submitBtn.innerHTML = 'Message Sent!';
            submitBtn.style.background = '#22c55e';
            showToast('Thank you! We\'ll be in touch soon.', 'success');
            form.reset();
          } else {
            submitBtn.innerHTML = 'Error - Try Again';
            showToast('Error sending message. Please try again.', 'error');
          }

          setTimeout(() => {
            submitBtn.innerHTML = originalContent;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
        });
      } else {
        setTimeout(() => {
          submitBtn.innerHTML = originalContent;
          submitBtn.disabled = false;
        }, 1000);
      }
    });
  }

  // =====================================================
  // HERO LEAD FORM
  // =====================================================
  const heroLeadForm = document.getElementById('hero-lead-form');
  if (heroLeadForm) {
    heroLeadForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const submitBtn = this.querySelector('.lead-form-submit');
      const originalText = submitBtn.innerHTML;

      submitBtn.innerHTML = 'Submitting...';
      submitBtn.disabled = true;

      const formData = new FormData(this);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        business: formData.get('business'),
        formType: 'hero-lead'
      };

      const form = this;

      if (typeof window.captureLeadToFirebase === 'function') {
        window.captureLeadToFirebase(data).then(success => {
          if (success) {
            submitBtn.innerHTML = 'Request Sent!';
            submitBtn.style.background = '#059669';
            form.reset();
            showToast('Thanks! We\'ll be in touch within 24 hours.', 'success');
          } else {
            submitBtn.innerHTML = 'Error - Try Again';
            submitBtn.style.background = '#dc2626';
          }

          setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
        });
      }
    });
  }

  // =====================================================
  // BACK TO TOP BUTTON
  // =====================================================
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', throttle(() => {
      backToTop.classList.toggle('visible', window.pageYOffset > 500);
    }, 100), { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // =====================================================
  // GRADER FORM REDIRECT
  // =====================================================
  function normalizeUrl(url) {
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }

  const heroGraderForm = document.getElementById('hero-grader-form');
  if (heroGraderForm) {
    heroGraderForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const urlInput = document.getElementById('hero-url');
      if (urlInput && urlInput.value) {
        window.location.href = '/grader.html?url=' + encodeURIComponent(normalizeUrl(urlInput.value));
      }
    });
  }

  const mobileGraderForm = document.getElementById('mobileGraderForm');
  if (mobileGraderForm) {
    mobileGraderForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const urlInput = document.getElementById('mobile-url');
      if (urlInput && urlInput.value) {
        window.location.href = '/grader.html?url=' + encodeURIComponent(normalizeUrl(urlInput.value));
      }
    });
  }

  // =====================================================
  // SLIDESHOW / CAROUSEL
  // =====================================================
  document.querySelectorAll('.slideshow').forEach(slideshow => {
    const container = slideshow.querySelector('.slideshow-container');
    const slides = slideshow.querySelectorAll('.slideshow-slide');
    const prevBtn = slideshow.querySelector('.slideshow-nav.prev');
    const nextBtn = slideshow.querySelector('.slideshow-nav.next');
    const dots = slideshow.querySelectorAll('.slideshow-dot');

    if (!container || slides.length === 0) return;

    let currentSlide = 0;
    let autoPlayInterval = null;

    function goToSlide(index, animate = true) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;

      currentSlide = index;
      container.style.transition = animate ? 'transform 0.5s ease' : 'none';
      container.style.transform = `translateX(-${currentSlide * 100}%)`;

      dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goToSlide(i)));

    // Touch support
    let touchStartX = 0;
    container.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    container.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) {
        goToSlide(diff > 0 ? currentSlide - 1 : currentSlide + 1);
      }
    }, { passive: true });

    // Auto-play
    function startAutoPlay() {
      autoPlayInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
    }

    slideshow.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
    slideshow.addEventListener('mouseleave', startAutoPlay);

    goToSlide(0, false);
    startAutoPlay();
  });

  // =====================================================
  // STARFIELD (Optimized - Desktop only, 150 stars, 30fps)
  // =====================================================
  const starfieldCanvas = document.getElementById('starfield');
  if (starfieldCanvas && !isMobile && !prefersReducedMotion) {
    const ctx = starfieldCanvas.getContext('2d');
    let width, height;
    let stars = [];
    let animationId;
    let lastFrame = 0;
    const FPS = 30;
    const frameInterval = 1000 / FPS;
    const STAR_COUNT = 150;

    function resize() {
      width = starfieldCanvas.width = window.innerWidth;
      height = starfieldCanvas.height = window.innerHeight;
    }

    function createStar() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2
      };
    }

    function initStars() {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push(createStar());
      }
    }

    let time = 0;

    function animate(timestamp) {
      if (timestamp - lastFrame < frameInterval) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      lastFrame = timestamp;
      time++;

      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        const alpha = star.alpha + Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    initStars();
    animate(0);

    window.addEventListener('resize', debounce(() => {
      resize();
      initStars();
    }, 250), { passive: true });

    // Pause when hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        animate(0);
      }
    });
  }

  // =====================================================
  // KEYBOARD ACCESSIBILITY
  // =====================================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close mobile menu
      if (navLinks && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileToggle.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  });

  // =====================================================
  // DYNAMIC YEAR
  // =====================================================
  const yearSpan = document.querySelector('.current-year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  console.log('Remodely AI - Optimized JS loaded');
});
