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

  // Toast notification
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: ${type === 'error' ? '#f97316' : '#f97316'};
      color: #fff;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      animation: toastIn 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Add toast animation styles
  const toastStyle = document.createElement('style');
  toastStyle.textContent = `
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    @keyframes toastOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(20px); } }
  `;
  document.head.appendChild(toastStyle);

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
    if (type === 'error') toast.style.borderLeft = '4px solid #f97316';

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
            submitBtn.style.background = '#ea580c';
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
  const mobileFormCard = document.getElementById('mobileFormCard');
  const mobileFormLoading = document.getElementById('mobileFormLoading');
  const mobileFormResults = document.getElementById('mobileFormResults');

  if (mobileGraderForm && mobileFormLoading && mobileFormResults) {
    mobileGraderForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const urlInput = document.getElementById('mobile-url');
      if (!urlInput || !urlInput.value) return;

      const url = normalizeUrl(urlInput.value);

      // Show loading, hide form
      mobileGraderForm.style.display = 'none';
      mobileFormLoading.style.display = 'flex';
      if (mobileFormCard) mobileFormCard.classList.add('has-results');

      // Update progress indicator
      if (window.updateGraderProgress) window.updateGraderProgress(2);

      // Animate loading steps
      const loadingBar = document.getElementById('mobileLoadingBar');
      const steps = ['loadStep1', 'loadStep2', 'loadStep3', 'loadStep4'];
      let currentStep = 0;

      function advanceStep() {
        if (currentStep > 0) {
          const prevStep = document.getElementById(steps[currentStep - 1]);
          if (prevStep) {
            prevStep.classList.remove('active');
            prevStep.classList.add('done');
          }
        }
        if (currentStep < steps.length) {
          const step = document.getElementById(steps[currentStep]);
          if (step) step.classList.add('active');
          if (loadingBar) loadingBar.style.width = ((currentStep + 1) / steps.length * 100) + '%';
          currentStep++;
        }
      }

      advanceStep();
      const stepInterval = setInterval(advanceStep, 800);

      try {
        const response = await fetch('https://remodely-backend.onrender.com/api/grader', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        const data = await response.json();
        clearInterval(stepInterval);
        if (!response.ok) throw new Error(data.error || 'Analysis failed');

        // Complete loading animation
        if (loadingBar) loadingBar.style.width = '100%';
        steps.forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.classList.remove('active'); el.classList.add('done'); }
        });

        // Quick transition to results
        await new Promise(r => setTimeout(r, 200));
        mobileFormLoading.style.display = 'none';
        mobileFormResults.style.display = 'block';
        mobileFormResults.classList.add('loading-results');

        // Update progress indicator to step 3 (results)
        if (window.updateGraderProgress) window.updateGraderProgress(3);

        // Get elements
        const scoreValue = document.getElementById('mobileScoreValue');
        const scoreCircle = document.getElementById('mobileScoreCircle');
        const scoreMessage = document.getElementById('mobileScoreMessage');
        const messageBox = document.getElementById('mobileResultsMessage');
        const ariaCtaTitle = document.getElementById('ariaCtaTitle');
        const ariaCtaSubtitle = document.getElementById('ariaCtaSubtitle');
        const breakdown = document.getElementById('mobileResultsBreakdown');
        const ariaCta = document.getElementById('mobileResultsAria');
        const divider = document.querySelector('.mobile-results-divider');
        const unlockBtn = document.getElementById('mobileUnlockBtn');
        const retryBtn = document.getElementById('mobileResultsRetry');
        const leadForm = document.getElementById('mobileLeadForm');
        const leadBack = document.getElementById('mobileLeadBack');
        const leadFields = document.getElementById('mobileLeadFields');

        const score = data.scores?.overall || 0;
        const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f97316';
        const textColor = score >= 70 ? '#047857' : score >= 40 ? '#d97706' : '#ea580c';

        // Hide elements initially for progressive reveal
        if (messageBox) { messageBox.style.opacity = '0'; messageBox.style.transform = 'translateY(10px)'; }
        if (breakdown) breakdown.innerHTML = '';
        if (ariaCta) { ariaCta.style.opacity = '0'; ariaCta.style.transform = 'translateY(10px)'; }
        if (divider) { divider.style.opacity = '0'; }
        if (unlockBtn) { unlockBtn.style.opacity = '0'; unlockBtn.style.transform = 'translateY(10px)'; }
        if (retryBtn) { retryBtn.style.opacity = '0'; }
        if (leadForm) { leadForm.style.display = 'none'; }

        // Store context for Aria
        window.ariaContext = window.ariaContext || {};
        window.ariaContext.websiteUrl = url;
        window.ariaContext.score = score;
        window.ariaContext.categories = data.scores;

        // STEP 1: Animate score counting up with digital effect
        let currentScore = 0;
        const scoreIncrement = score / 50; // 50 steps for smoother animation
        if (scoreValue) scoreValue.classList.add('counting');
        if (scoreCircle) scoreCircle.classList.add('scanning');

        const scoreInterval = setInterval(() => {
          currentScore = Math.min(currentScore + scoreIncrement, score);
          const displayScore = Math.round(currentScore);
          if (scoreValue) {
            scoreValue.textContent = displayScore;
            scoreValue.style.color = textColor;
          }
          if (scoreCircle) {
            const deg = (currentScore / 100) * 360;
            // Add gold accent to the leading edge
            const goldGlow = `rgba(251, 191, 36, 0.8)`;
            scoreCircle.style.background = `conic-gradient(
              ${scoreColor} 0deg,
              ${scoreColor} ${Math.max(0, deg - 8)}deg,
              ${goldGlow} ${Math.max(0, deg - 4)}deg,
              ${goldGlow} ${deg}deg,
              #e2e8f0 ${deg}deg,
              #e2e8f0 360deg
            )`;
            // Add glow effect
            scoreCircle.style.boxShadow = `
              0 4px 20px rgba(0, 0, 0, 0.08),
              inset 0 0 0 3px rgba(251, 191, 36, 0.3),
              0 0 30px rgba(251, 191, 36, ${0.2 + (currentScore / score) * 0.3})
            `;
          }
          if (currentScore >= score) {
            clearInterval(scoreInterval);
            if (scoreValue) scoreValue.classList.remove('counting');
            if (scoreCircle) scoreCircle.classList.remove('scanning');
            // Final state without gold edge
            if (scoreCircle) {
              scoreCircle.style.background = `conic-gradient(${scoreColor} ${(score / 100) * 360}deg, #e2e8f0 ${(score / 100) * 360}deg)`;
              scoreCircle.style.boxShadow = `
                0 4px 20px rgba(0, 0, 0, 0.08),
                inset 0 0 0 3px rgba(251, 191, 36, 0.2),
                0 0 20px ${scoreColor}40
              `;
            }
          }
        }, 20);

        // STEP 2: Show message after score animation (0.5s delay)
        await new Promise(r => setTimeout(r, 500));
        if (messageBox) {
          messageBox.classList.remove('score-low', 'score-high');
          if (score < 40) {
            messageBox.classList.add('score-low');
            if (scoreMessage) scoreMessage.innerHTML = '<strong>Your business is invisible to AI.</strong> Customers asking ChatGPT or Google AI won\'t find you.';
          } else if (score < 70) {
            if (scoreMessage) scoreMessage.innerHTML = '<strong>You\'re losing leads to competitors.</strong> A few fixes could have AI sending you customers weekly.';
          } else {
            messageBox.classList.add('score-high');
            if (scoreMessage) scoreMessage.innerHTML = '<strong>You\'re ahead of most competitors!</strong> Small tweaks could make AI your #1 lead source.';
          }
          messageBox.style.transition = 'all 0.4s ease';
          messageBox.style.opacity = '1';
          messageBox.style.transform = 'translateY(0)';
        }

        // STEP 3: Build and reveal breakdown items one by one
        const scores = data.scores || {};
        const categories = [
          { key: 'ai_visibility', name: 'AI Visibility', score: scores.ai_visibility || 0 },
          { key: 'business', name: 'Business Essentials', score: scores.business_essentials || 0 },
          { key: 'seo', name: 'SEO & Content', score: scores.seo?.meta_tags || 0 },
          { key: 'technical', name: 'Technical', score: Math.round(((scores.technical?.https || 0) + (scores.technical?.speed || 0) + (scores.technical?.mobile || 0)) / 3) }
        ];

        for (let i = 0; i < categories.length; i++) {
          await new Promise(r => setTimeout(r, 150));
          const cat = categories[i];
          const scoreClass = cat.score >= 70 ? 'good' : cat.score >= 40 ? 'ok' : 'bad';
          const icon = cat.score >= 70
            ? '<svg class="mobile-result-item-icon pass" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>'
            : '<svg class="mobile-result-item-icon fail" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>';

          const itemHtml = `<div class="mobile-result-item result-item-reveal" style="opacity:0;transform:translateX(-20px)">
            <span class="mobile-result-item-label">${icon} ${cat.name}</span>
            <span class="mobile-result-item-score ${scoreClass}">${cat.score}/100</span>
          </div>`;

          if (breakdown) {
            breakdown.insertAdjacentHTML('beforeend', itemHtml);
            const newItem = breakdown.lastElementChild;
            // Trigger animation
            requestAnimationFrame(() => {
              newItem.style.transition = 'all 0.3s ease';
              newItem.style.opacity = '1';
              newItem.style.transform = 'translateX(0)';
            });
          }
        }

        // STEP 4: Show Aria CTA with emphasis
        await new Promise(r => setTimeout(r, 200));
        if (ariaCtaTitle) ariaCtaTitle.textContent = score < 40 ? 'Fix This Now - Free Call' : score < 70 ? 'Get Your Action Plan' : 'Maximize Your Leads';
        if (ariaCtaSubtitle) ariaCtaSubtitle.textContent = score < 40 ? 'Aria shows you exactly what to fix' : score < 70 ? '2-min call - prioritized fixes list' : 'Learn how to get even more from AI';
        if (ariaCta) {
          ariaCta.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          ariaCta.style.opacity = '1';
          ariaCta.style.transform = 'translateY(0)';
        }

        // STEP 5: Show secondary options
        await new Promise(r => setTimeout(r, 300));
        if (divider) { divider.style.transition = 'opacity 0.3s ease'; divider.style.opacity = '1'; }
        if (unlockBtn) {
          unlockBtn.style.transition = 'all 0.3s ease';
          unlockBtn.style.opacity = '1';
          unlockBtn.style.transform = 'translateY(0)';
        }
        await new Promise(r => setTimeout(r, 150));
        if (retryBtn) { retryBtn.style.transition = 'opacity 0.3s ease'; retryBtn.style.opacity = '1'; }

        mobileFormResults.classList.remove('loading-results');

        // Unlock button shows lead form
        if (unlockBtn) {
          unlockBtn.onclick = () => {
            mobileFormResults.style.display = 'none';
            if (leadForm) leadForm.style.display = 'block';
          };
        }

        // Back button returns to results
        if (leadBack) {
          leadBack.onclick = () => {
            if (leadForm) leadForm.style.display = 'none';
            mobileFormResults.style.display = 'block';
          };
        }

        // Lead form submission
        if (leadFields) {
          leadFields.onsubmit = async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('leadNameInput');
            const emailInput = document.getElementById('leadEmailInput');
            const phoneInput = document.getElementById('leadPhoneInput');
            const submitBtn = document.getElementById('mobileLeadSubmit');

            const leadData = {
              name: nameInput?.value || '',
              email: emailInput?.value || '',
              phone: phoneInput?.value || '',
              website: url,
              score: score,
              categories: data.scores,
              source: 'mobile-grader',
              timestamp: new Date().toISOString()
            };

            // Show loading
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = '<span>Unlocking...</span>';
            }

            try {
              // Submit to Firebase if available
              if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore().collection('leads').add(leadData);
              }

              // Store in session for Aria context
              window.ariaContext = { ...window.ariaContext, ...leadData };
              sessionStorage.setItem('ariaContext', JSON.stringify(window.ariaContext));

              // Redirect to full report
              window.location.href = '/grader.html?url=' + encodeURIComponent(url);
            } catch (err) {
              console.error('Lead submission error:', err);
              // Still redirect on error
              window.location.href = '/grader.html?url=' + encodeURIComponent(url);
            }
          };
        }

        // Retry button
        if (retryBtn) {
          retryBtn.onclick = () => {
            mobileFormResults.style.display = 'none';
            if (leadForm) leadForm.style.display = 'none';
            mobileGraderForm.style.display = 'flex';
            urlInput.value = '';
            if (mobileFormCard) mobileFormCard.classList.remove('has-results');
            // Reset animations for next time
            if (messageBox) { messageBox.style.opacity = ''; messageBox.style.transform = ''; }
            if (ariaCta) { ariaCta.style.opacity = ''; ariaCta.style.transform = ''; }
            if (divider) divider.style.opacity = '';
            if (unlockBtn) { unlockBtn.style.opacity = ''; unlockBtn.style.transform = ''; }
            if (retryBtn) retryBtn.style.opacity = '';
            // Reset progress indicator
            if (window.updateGraderProgress) window.updateGraderProgress(1);
          };
        }

      } catch (err) {
        console.error('Grader error:', err);
        clearInterval(stepInterval);

        // Reset loading animation
        if (loadingBar) loadingBar.style.width = '0%';
        steps.forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.classList.remove('active', 'done'); }
        });

        mobileFormLoading.style.display = 'none';
        mobileGraderForm.style.display = 'flex';
        if (mobileFormCard) mobileFormCard.classList.remove('has-results');
        showToast('Could not analyze website. Please try again.', 'error');
      }
    });
  }

  // =====================================================
  // ARIA - AI ASSISTANT INTEGRATION
  // =====================================================
  // Store grader data for Aria context
  window.ariaContext = {
    websiteUrl: null,
    score: null,
    categories: null,
    userName: null,
    userEmail: null,
    userPhone: null
  };

  // Aria phone number - SET YOUR OWN NUMBER HERE
  const ARIA_PHONE = null; // Replace with your Aria phone number

  // Function to call Aria with context
  function callAria() {
    if (!ARIA_PHONE) {
      alert('Aria phone number not configured. Contact help.remodely@gmail.com to set up.');
      return;
    }
    window.location.href = `tel:${ARIA_PHONE}`;
  }

  // Aria FAB button
  const ariaFab = document.getElementById('ariaFab');
  if (ariaFab) {
    ariaFab.addEventListener('click', callAria);
  }

  // Talk to Aria button in Aria section
  const talkToAriaBtn = document.getElementById('talkToAriaBtn');
  if (talkToAriaBtn) {
    talkToAriaBtn.addEventListener('click', callAria);
  }

  // Final CTA button - direct call to Aria
  const finalCtaBtn = document.getElementById('finalCtaBtn');
  if (finalCtaBtn) {
    finalCtaBtn.addEventListener('click', callAria);
  }

  // Results Aria button - call with website context
  const mobileResultsAria = document.getElementById('mobileResultsAria');
  if (mobileResultsAria) {
    mobileResultsAria.addEventListener('click', callAria);
  }

  // Update Aria context when grader completes
  const originalMobileGraderHandler = mobileGraderForm?.onsubmit;
  if (mobileGraderForm) {
    const originalSubmit = mobileGraderForm.onsubmit;
    // Context is already updated in the grader submit handler above
  }

  // Note: Lead form in results now handles sessionStorage for grader context

  // Capture contact form data for Aria
  const contactFormEl = document.getElementById('contact-form');
  if (contactFormEl) {
    contactFormEl.addEventListener('input', (e) => {
      if (e.target.name === 'name') window.ariaContext.userName = e.target.value;
      if (e.target.name === 'email') window.ariaContext.userEmail = e.target.value;
      if (e.target.name === 'phone') window.ariaContext.userPhone = e.target.value;
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
  // MOBILE FORM CARD EXPANSION
  // =====================================================
  const expandFormBtn = document.getElementById('expandFormBtn');
  const closeFormBtn = document.getElementById('closeFormBtn');

  if (mobileFormCard && expandFormBtn && closeFormBtn) {
    function expandMobileForm() {
      mobileFormCard.classList.add('expanded');
      document.body.style.overflow = 'hidden';
      // Focus the URL input after animation
      setTimeout(() => {
        const urlInput = document.getElementById('mobile-url');
        if (urlInput) urlInput.focus();
      }, 300);
    }

    function collapseMobileForm() {
      mobileFormCard.classList.remove('expanded');
      document.body.style.overflow = '';
    }

    expandFormBtn.addEventListener('click', expandMobileForm);
    closeFormBtn.addEventListener('click', collapseMobileForm);

    // Also expand when tapping anywhere on the preview
    const preview = mobileFormCard.querySelector('.mobile-form-preview');
    if (preview) {
      preview.addEventListener('click', (e) => {
        if (!mobileFormCard.classList.contains('expanded')) {
          expandMobileForm();
        }
      });
    }
  }


  // =====================================================
  // KEYBOARD ACCESSIBILITY
  // =====================================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close mobile form if expanded
      if (mobileFormCard && mobileFormCard.classList.contains('expanded')) {
        mobileFormCard.classList.remove('expanded');
        document.body.style.overflow = '';
      }
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
