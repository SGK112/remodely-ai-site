/**
 * Remodely AI — full-body UX effects layer
 * Parallax stardust, scroll-reveal, mouse-tilt iso, scroll progress.
 *
 * All effects respect prefers-reduced-motion. Each effect feature-detects
 * and is fully optional — if any module fails, the others keep running.
 */
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ---------------------------------------------------------------
     1. SCROLL PROGRESS BAR (top of viewport, orange, 2px)
     --------------------------------------------------------------- */
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'rmd-scroll-progress';
    document.body.appendChild(bar);

    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      bar.style.transform = `scaleX(${pct / 100})`;
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------------
     2. PARALLAX STARFIELD (3 layers — deep / mid / near)
     Three independent star layers drift at different rates so
     scrolling reveals real depth. Deep barely moves (far away),
     mid medium, near fastest (foreground).
     --------------------------------------------------------------- */
  function initParallaxStars() {
    if (prefersReducedMotion) return;
    // Mobile: skip parallax entirely. iOS Safari repaints fixed-position
    // background-image layers poorly, and updating bg-position on every
    // scroll frame for two full-viewport divs causes scroll jank on
    // phones. The starfield divs are also display:none on <=768px via
    // CSS, so this is just belt-and-suspenders.
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const layerMid  = document.querySelector('.starfield-mid');
    const layerNear = document.querySelector('.starfield-near');

    // Drive the deep layer (body::before) via a CSS variable so we
    // don't have to manipulate the pseudo-element directly.
    const deepStyle = document.createElement('style');
    deepStyle.textContent = 'body::before{background-position:0 var(--deep-y,0px)!important;}';
    document.head.appendChild(deepStyle);

    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      document.body.style.setProperty('--deep-y', `${(-y * 0.10).toFixed(1)}px`);
      if (layerMid)  layerMid.style.backgroundPositionY  = `${(-y * 0.30).toFixed(1)}px`;
      if (layerNear) layerNear.style.backgroundPositionY = `${(-y * 0.55).toFixed(1)}px`;
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    update();
  }

  /* ---------------------------------------------------------------
     3. SCROLL-REVEAL — fade-up sections / cards as they enter view
     --------------------------------------------------------------- */
  function initScrollReveal() {
    if (prefersReducedMotion) return;
    if (!('IntersectionObserver' in window)) return;

    // Tall content blocks (.pillar, .terminal-block) need an extra-low
     // threshold or they never fire on long pages — leaving them
     // permanently invisible. Use a tiny threshold and a fallback timer.
    const targets = document.querySelectorAll(
      '.paths__card, .journey__step, .dev-card, ' +
      '.case-study-stat, .case-study-body, ' +
      '.section-header, .why-card, .live-tool, .aria-stat'
    );

    targets.forEach((el) => el.classList.add('rmd-reveal'));

    // Failsafe: after 3 seconds, force-reveal anything still hidden so
    // a missed observer call can never leave content invisible.
    setTimeout(() => {
      document.querySelectorAll('.rmd-reveal:not(.rmd-reveal--visible)').forEach((el) => {
        el.classList.add('rmd-reveal--visible');
      });
    }, 3000);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // Stagger by a small delay among siblings entering together
            const sib = Array.from(entry.target.parentElement?.children || []).indexOf(
              entry.target
            );
            entry.target.style.transitionDelay = `${Math.min(sib, 6) * 60}ms`;
            entry.target.classList.add('rmd-reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------------
     4. MOUSE-TILT on the hero iso illustration
     --------------------------------------------------------------- */
  function initHeroTilt() {
    if (prefersReducedMotion) return;
    const iso = document.querySelector('.hero-iso');
    if (!iso) return;

    const img = iso.querySelector('img');
    if (!img) return;

    const heroSection = document.querySelector('.hero');
    if (!heroSection) return;

    let raf = null;
    let targetX = 0,
      targetY = 0,
      currentX = 0,
      currentY = 0;

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      img.style.transform = `perspective(1200px) rotateY(${currentX}deg) rotateX(${currentY}deg)`;

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    };

    heroSection.addEventListener('mousemove', (e) => {
      const r = heroSection.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      targetX = (x - 0.5) * 6; // up to ±3deg
      targetY = (0.5 - y) * 5;
      if (!raf) raf = requestAnimationFrame(animate);
    });

    heroSection.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
      if (!raf) raf = requestAnimationFrame(animate);
    });
  }

  /* ---------------------------------------------------------------
     5. DOM ready boot
     --------------------------------------------------------------- */
  const boot = () => {
    try { initScrollProgress(); } catch (e) { console.warn('[fx] progress', e); }
    try { initParallaxStars(); } catch (e) { console.warn('[fx] parallax', e); }
    try { initScrollReveal(); } catch (e) { console.warn('[fx] reveal', e); }
    try { initHeroTilt(); } catch (e) { console.warn('[fx] tilt', e); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ===================================================================
 * EXTENDED EFFECTS LAYER (2026-04-29 wave 2)
 * Cursor glow, count-up stats, magnetic CTAs, layered iso parallax.
 * Each module is independent — failures don't cascade.
 * =================================================================== */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fineCursor = window.matchMedia('(pointer: fine)').matches;

  /* -----------------------------------------------------------------
     6. CURSOR GLOW — soft orange spotlight follows the mouse on dark
     sections only. Auto-hides on touch devices. Throttled with rAF.
     ----------------------------------------------------------------- */
  function initCursorGlow() {
    if (reduced || !fineCursor) return;

    const glow = document.createElement('div');
    glow.id = 'rmd-cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    let tx = -200, ty = -200, cx = -200, cy = -200, raf = null, hidden = true;

    const animate = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    };

    document.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (hidden) {
        hidden = false;
        glow.classList.add('rmd-cursor-glow--visible');
      }
      if (!raf) raf = requestAnimationFrame(animate);
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      hidden = true;
      glow.classList.remove('rmd-cursor-glow--visible');
    });
  }

  /* -----------------------------------------------------------------
     7. COUNT-UP — animates numeric stats as they enter viewport
     Targets: any element with [data-count-to] OR matching common
     stat number selectors. Stops at the actual final value parsed
     from the textContent so prefix/suffix is preserved.
     ----------------------------------------------------------------- */
  function initCountUp() {
    if (reduced) return;
    if (!('IntersectionObserver' in window)) return;

    // Find numeric tokens in case-study stats and why-section
    const candidates = document.querySelectorAll(
      '.case-study-stat__num, .why-number, .product-stat-number'
    );

    const animate = (el) => {
      const original = el.textContent.trim();
      // Extract first number-like token (handles "$48k+", "400+", "10+")
      const match = original.match(/(\d+(?:[\.,]\d+)?)/);
      if (!match) return;
      const finalNum = parseFloat(match[1].replace(/,/g, ''));
      if (!isFinite(finalNum) || finalNum === 0) return;

      const prefix = original.slice(0, match.index);
      const suffix = original.slice(match.index + match[0].length);
      const duration = 1100;
      const start = performance.now();

      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = finalNum * eased;
        // Format like the original (preserve decimals if present)
        const decimals = (match[1].split('.')[1] || '').length;
        const formatted = decimals
          ? v.toFixed(decimals)
          : Math.round(v).toLocaleString();
        el.textContent = `${prefix}${formatted}${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = original;
      };

      el.textContent = `${prefix}0${suffix}`;
      requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animate(e.target);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });

    candidates.forEach((el) => obs.observe(el));
  }

  /* -----------------------------------------------------------------
     8. MAGNETIC CTAs — buttons subtly attract the cursor when near.
     Adds a "this site feels alive" touch without being gimmicky.
     ----------------------------------------------------------------- */
  function initMagnetic() {
    if (reduced || !fineCursor) return;

    const buttons = document.querySelectorAll(
      '.hero-grader-inline__row button, .paths__cta, .lead-form-submit, .aria-cta, .case-study-cta, .aria-hero-btn'
    );

    buttons.forEach((btn) => {
      const radius = 80;
      btn.style.transition = 'transform 0.3s cubic-bezier(0.2, 1, 0.3, 1)';

      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < radius) {
          const power = 1 - dist / radius;
          btn.style.transform = `translate(${dx * 0.18 * power}px, ${dy * 0.18 * power}px)`;
        }
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* -----------------------------------------------------------------
     9. ISO LAYER PARALLAX — the floating cards inside the hero iso
     SVG each get their own subtle parallax offset on mousemove.
     The SVG <g> groups have transforms applied; we wrap the image
     so we can layer adjustments on top via CSS variables.
     ----------------------------------------------------------------- */
  function initIsoParallax() {
    if (reduced || !fineCursor) return;
    const heroSection = document.querySelector('.hero');
    const iso = document.querySelector('.hero-iso');
    if (!heroSection || !iso) return;

    heroSection.addEventListener('mousemove', (e) => {
      const r = heroSection.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      // Set CSS variables; the iso container already has perspective
      iso.style.setProperty('--iso-x', x.toFixed(3));
      iso.style.setProperty('--iso-y', y.toFixed(3));
    });

    heroSection.addEventListener('mouseleave', () => {
      iso.style.setProperty('--iso-x', 0);
      iso.style.setProperty('--iso-y', 0);
    });
  }

  const boot2 = () => {
    try { initCursorGlow();   } catch (e) { console.warn('[fx2] cursor', e); }
    try { initCountUp();      } catch (e) { console.warn('[fx2] count', e); }
    try { initMagnetic();     } catch (e) { console.warn('[fx2] magnetic', e); }
    try { initIsoParallax();  } catch (e) { console.warn('[fx2] iso-parallax', e); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot2);
  } else {
    boot2();
  }
})();

/* ===================================================================
 * STICKY CTA — auto-hide when footer is in view (2026-04-29)
 * The user-prompted "we know you've reached the bottom, get out of
 * the way" UX. IntersectionObserver on the <footer>; when it enters
 * the viewport, add .sticky-cta--at-footer; remove on exit.
 * =================================================================== */
(() => {
  if (!('IntersectionObserver' in window)) return;
  const start = () => {
    const bar = document.getElementById('stickyCta');
    const footer = document.querySelector('footer.footer');
    if (!bar || !footer) return;
    const obs = new IntersectionObserver((entries) => {
      const inView = entries[0].isIntersecting;
      bar.classList.toggle('sticky-cta--at-footer', inView);
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
    obs.observe(footer);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
