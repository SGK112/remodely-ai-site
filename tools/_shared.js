/* =====================================================
   Shared JS for /tools/<gbp|schema|mobile|a11y|sitemap|https>/
   Each page declares window.TOOL { slug, verdictNoun, loadingLines }
   and `const API = '<endpoint url>'`. This script wires up the form,
   loading status, result rendering, and CTA.
   ===================================================== */
(function () {
  'use strict';

  const form    = document.getElementById('xForm');
  const submit  = document.getElementById('xSubmit');
  const loading = document.getElementById('xLoading');
  const lines   = document.getElementById('loadingLines');
  const result  = document.getElementById('xResult');
  const errorEl = document.getElementById('xError');

  if (!form) return;

  // Sticky CTA reveal
  (function () {
    const bar = document.getElementById('stickyCta');
    if (!bar) return;
    let shown = false;
    function reveal() {
      if (shown) return;
      if (window.scrollY > 220) {
        bar.hidden = false;
        requestAnimationFrame(() => bar.classList.add('sticky-cta--visible'));
        shown = true;
        window.removeEventListener('scroll', reveal);
      }
    }
    window.addEventListener('scroll', reveal, { passive: true });
  })();

  function pushLine(text, ok) {
    const div = document.createElement('div');
    div.className = ok ? 'ok' : '';
    div.style.animationDelay = (lines.children.length * 220) + 'ms';
    div.textContent = (ok ? '✓ ' : '› ') + text;
    lines.appendChild(div);
  }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function scoreClass(score) {
    if (score >= 80) return 'strong';
    if (score >= 50) return 'mid';
    return 'weak';
  }

  function renderResult(data) {
    const checks = data.checks || data.blocks || [];
    const score = data.score || 0;
    const noun = (window.TOOL && window.TOOL.verdictNoun) || 'score';
    const passed = data.passed || (data.summary && data.summary.valid) || 0;
    const total = data.total || (data.summary && data.summary.total_blocks) || checks.length;

    let html = '';

    html += `
      <div class="x-score">
        <div class="x-score__num ${scoreClass(score)}">${score}</div>
        <div>
          <div class="x-score__label">${escape(noun.toUpperCase())} · ${escape(data.domain || data.url || '')}</div>
          <div class="x-score__verdict">${escape(data.verdict || '')}</div>
          <div class="x-score__sub">${passed} of ${total} checks passed</div>
        </div>
      </div>
    `;

    html += `<div class="x-checks">`;

    // The /schema endpoint returns blocks (each with issues/warnings/types),
    // shape it into row checks.
    if (data.blocks && Array.isArray(data.blocks)) {
      data.blocks.forEach((b, i) => {
        const ok = b.valid && b.issues.length === 0;
        const cls = ok ? 'pass' : 'fail';
        const icon = ok ? '✓' : '✕';
        const types = (b.types || []).join(', ') || '(no @type)';
        const issues = (b.issues || []).map(i => '• ' + i).join('\n');
        const warnings = (b.warnings || []).map(w => '⚠ ' + w).join('\n');
        const detail = [
          types ? `Types: ${types}` : '',
          issues,
          warnings,
        ].filter(Boolean).join('\n\n');
        html += `
          <div class="x-check ${cls}">
            <div class="x-check__icon">${icon}</div>
            <div>
              <p class="x-check__label">Block ${i + 1}</p>
              <pre class="x-check__detail" style="white-space:pre-wrap;">${escape(detail || 'Valid, no issues.')}</pre>
            </div>
          </div>
        `;
      });
    } else {
      checks.forEach((c) => {
        let cls = c.pass ? 'pass' : 'fail';
        let icon = c.pass ? '✓' : '✕';
        if (c.neutral || c.pass === null) { cls = 'warn'; icon = '·'; }
        html += `
          <div class="x-check ${cls}">
            <div class="x-check__icon">${icon}</div>
            <div>
              <p class="x-check__label">${escape(c.label || c.key)}</p>
              <p class="x-check__detail">${escape(c.detail || '')}</p>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;

    const slug = (window.TOOL && window.TOOL.slug) || '';
    const tweet = encodeURIComponent(
      `My ${noun} score: ${score}/100. ${data.verdict || ''} Tested with @remodelyai's free tool: ${location.origin}${location.pathname}`
    );
    html += `
      <div class="x-cta">
        <h3>Want every issue and the code to fix them?</h3>
        <p>Run the full grader for the unified report, or jump to the snippet generator.</p>
        <div class="btns">
          <a class="primary" href="/grader.html?url=${encodeURIComponent(data.url || '')}">Run the full grader →</a>
          <a class="ghost" href="/tools/fix-it/?url=${encodeURIComponent(data.url || '')}">Get paste-ready fixes</a>
          <a class="ghost" href="https://twitter.com/intent/tweet?text=${tweet}" target="_blank" rel="noopener">Share</a>
        </div>
      </div>
    `;

    result.innerHTML = html;
    result.style.display = 'block';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    result.style.display = 'none';
    lines.innerHTML = '';
    loading.style.display = 'block';
    submit.disabled = true;

    const url = document.getElementById('xUrl').value.trim();
    const progress = (window.TOOL && window.TOOL.loadingLines) || [];
    progress.forEach(([t, ms]) => setTimeout(() => pushLine(t), ms));

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Request failed');
      pushLine('Done', true);
      loading.style.display = 'none';
      renderResult(data);
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      loading.style.display = 'none';
      errorEl.textContent = err.message || 'Something went wrong. Try again.';
      errorEl.style.display = 'block';
    } finally {
      submit.disabled = false;
    }
  });

  // Auto-submit on ?url= deep link
  (function () {
    const p = new URLSearchParams(location.search);
    const u = p.get('url');
    if (u) {
      const input = document.getElementById('xUrl');
      input.value = u;
      setTimeout(() => form.requestSubmit(), 200);
    }
  })();
})();
