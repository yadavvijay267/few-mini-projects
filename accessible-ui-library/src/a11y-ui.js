// Accessible UI Library — original vanilla JS.
// Every component: proper ARIA roles, keyboard navigation, focus management.
// Usage: A11yUI.initModal(btn, dialog), A11yUI.initTabs(root), A11yUI.initAccordion(root),
//        A11yUI.initTooltip(el), A11yUI.initToggle(el), A11yUI.toast(message)
(function (global) {
  'use strict';
  function onKey(el, key, fn) { el.addEventListener('keydown', (e) => { if (e.key === key) fn(e); }); }

  // --- Modal: role=dialog, aria-modal, focus trap, Escape to close, focus restore ---
  function initModal(trigger, dialog) {
    const backdrop = dialog.parentElement;
    let lastFocused = null;
    const focusables = () => [...dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null);
    function open() {
      lastFocused = document.activeElement;
      backdrop.hidden = false; dialog.hidden = false;
      const f = focusables(); (dialog.querySelector('[data-autofocus]') || f[0] || dialog).focus();
      document.addEventListener('keydown', onDocKey, true);
    }
    function close() {
      backdrop.hidden = true; dialog.hidden = true;
      document.removeEventListener('keydown', onDocKey, true);
      if (lastFocused) lastFocused.focus();
    }
    function onDocKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    trigger.addEventListener('click', open);
    dialog.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    return { open, close };
  }

  // --- Tabs: role=tablist/tab/tabpanel, arrow-key navigation, Home/End ---
  function initTabs(root) {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelectorAll('[role="tabpanel"]')];
    function select(tab, focus) {
      tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(p => { p.hidden = p.getAttribute('aria-labelledby') !== tab.id; });
      if (focus) tab.focus();
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
    select(tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0], false);
  }

  // --- Accordion: button with aria-expanded + aria-controls, region role ---
  function initAccordion(root) {
    root.querySelectorAll('button[aria-expanded]').forEach(btn => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        if (panel) panel.hidden = open;
      });
    });
  }

  // --- Tooltip: aria-describedby, shows on focus as well as hover, Escape hides ---
  function initTooltip(el) {
    const tip = el.querySelector('[role="tooltip"]');
    if (!tip) return;
    if (!tip.id) tip.id = 'tooltip-' + Math.random().toString(36).slice(2, 8);
    const target = el.querySelector('[aria-describedby]') || el;
    target.setAttribute('aria-describedby', tip.id);
    tip.hidden = true;
    const show = () => { tip.hidden = false; };
    const hide = () => { tip.hidden = true; };
    el.addEventListener('mouseenter', show); el.addEventListener('mouseleave', hide);
    el.addEventListener('focusin', show); el.addEventListener('focusout', hide);
    onKey(el, 'Escape', hide);
  }

  // --- Toggle (switch): role=switch, aria-checked, Space/Enter ---
  function initToggle(el) {
    el.setAttribute('role', 'switch');
    el.tabIndex = 0;
    if (!el.hasAttribute('aria-checked')) el.setAttribute('aria-checked', 'false');
    const flip = () => el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true'));
    el.addEventListener('click', flip);
    onKey(el, ' ', (e) => { e.preventDefault(); flip(); });
    onKey(el, 'Enter', (e) => { e.preventDefault(); flip(); });
  }

  // --- Toast: aria-live polite region, auto-dismiss ---
  function toast(message, ms) {
    let region = document.querySelector('.a11y-toast-region');
    if (!region) { region = document.createElement('div'); region.className = 'a11y-toast-region'; region.setAttribute('aria-live', 'polite'); document.body.appendChild(region); }
    const t = document.createElement('div'); t.className = 'a11y-toast'; t.setAttribute('role', 'status'); t.textContent = message;
    region.appendChild(t);
    setTimeout(() => t.remove(), ms || 4000);
  }

  global.A11yUI = { initModal, initTabs, initAccordion, initTooltip, initToggle, toast };
  if (typeof module !== 'undefined') module.exports = global.A11yUI;
})(typeof window !== 'undefined' ? window : globalThis);
