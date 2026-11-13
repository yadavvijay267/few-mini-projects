// Rule-based UI generator (mirrors generator.py). No LLM involved in layout.
window.UIGen = (function () {
  const PAGE_TYPES = {pricing:['pricing','price','plans'], landing:['landing','homepage','home page'],
    portfolio:['portfolio','resume','showcase'], contact:['contact'], dashboard:['dashboard','admin'],
    blog:['blog','news'], signup:['signup','sign up','register','login','auth']};
  const TONES = ['playful','professional','minimal','bold'];
  const COLOURS = {dark:['#0f172a','#38bdf8'], light:['#ffffff','#0b5cad'], blue:['#1e3a5f','#38bdf8'],
    green:['#14532d','#4ade80'], purple:['#4c1d95','#c084fc']};
  function parsePrompt(prompt){
    const p = prompt.toLowerCase(); let page = 'landing';
    for (const [kind, kws] of Object.entries(PAGE_TYPES)) if (kws.some(k=>p.includes(k))) { page = kind; break; }
    const m = p.match(/for (?:a|an|the) ([a-z][a-z ]{1,30})/);
    const business = m ? m[1].trim().replace(/\.$/,'').replace(/\b\w/g, c=>c.toUpperCase()) : 'Your Business';
    const tone = TONES.find(t=>p.includes(t)) || 'professional';
    const colour = Object.keys(COLOURS).find(c=>p.includes(c)) || null;
    const sections = [];
    ['testimonials','gallery','faq','features','form'].forEach(s=>{ if (p.includes(s) || (s==='features' && ['landing','pricing'].includes(page))) sections.push(s); });
    if (page==='pricing' && !sections.includes('features')) sections.push('features');
    return {page_type:page, business, tone, colour, sections, header_dark: p.includes('darker')||p.includes('dark header'), prompt};
  }
  function applyRefinement(spec, prompt){
    const p = prompt.toLowerCase(); const s = JSON.parse(JSON.stringify(spec));
    if (p.includes('darker')||p.includes('dark header')) s.header_dark = true;
    if (p.includes('lighter')) s.header_dark = false;
    ['testimonials','gallery','faq'].forEach(x=>{ if (p.includes(x) && !s.sections.includes(x)) s.sections.push(x); });
    TONES.forEach(t=>{ if (p.includes(t)) s.tone = t; });
    Object.keys(COLOURS).forEach(c=>{ if (p.includes(c)) s.colour = c; });
    return s;
  }
  function generateHtml(spec){
    const [bg, accent] = COLOURS[spec.colour] || ['#0b2a4a','#38bdf8'];
    const headerBg = spec.header_dark ? '#06121f' : bg;
    const headlines = {pricing:`Simple pricing for ${spec.business}`, landing:`Welcome to ${spec.business}`,
      portfolio:`${spec.business} — Portfolio`, contact:`Talk to ${spec.business}`, dashboard:`${spec.business} Dashboard`,
      blog:`The ${spec.business} Blog`, signup:`Join ${spec.business}`};
    const taglines = {playful:'Fun, friendly, and ready when you are.', professional:'Trusted by teams who expect the best.',
      minimal:'Less, but better.', bold:'Big. Bold. Unmissable.'};
    let body = `<header class="hero"><h1>${headlines[spec.page_type]}</h1><p>${taglines[spec.tone]}</p><a class="cta" href="#main">Get started</a></header>`;
    if (spec.sections.includes('features')) body += `<section id="main"><h2>Why ${spec.business}?</h2><div class="grid">${[['Fast',spec.business+' works fast, every time.'],['Reliable','Built to be there when you need it.'],['Simple','No learning curve — just results.']].map(([t,d])=>`<div class="card"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>`;
    if (spec.page_type==='pricing') body += `<section><h2>Pricing for ${spec.business}</h2><div class="grid">${[['Starter','₹0',['1 project','Community support']],['Pro','₹499/mo',['Unlimited projects','Priority support','Analytics']],['Team','₹1,499/mo',['Everything in Pro','SSO','Dedicated manager']]].map(([n,pr,fs])=>`<div class="card"><h3>${n}</h3><p class="amount">${pr}</p><ul>${fs.map(f=>`<li>${f}</li>`).join('')}</ul><a class="cta" href="#">Choose ${n}</a></div>`).join('')}</div></section>`;
    if (spec.sections.includes('testimonials')) body += `<section><h2>What customers say</h2><div class="grid"><blockquote>“Exactly what we needed — set up in a day.”<footer>— Priya, Operations Lead</footer></blockquote><blockquote>“The pricing is honest and the product just works.”<footer>— Arjun, Founder</footer></blockquote></div></section>`;
    if (spec.sections.includes('gallery')) body += `<section><h2>Gallery</h2><div class="grid">${[0,1,2,3].map(i=>`<div class="thumb" style="background:hsl(${i*55},60%,70%)">${spec.business} ${i+1}</div>`).join('')}</div></section>`;
    if (spec.sections.includes('faq')) body += `<section><h2>FAQ</h2><details><summary>How do I get started?</summary><p>Click “Get started” and follow the three-step setup.</p></details><details><summary>Can I cancel anytime?</summary><p>Yes — cancel in one click, no questions asked.</p></details></section>`;
    if (['contact','signup'].includes(spec.page_type) || spec.sections.includes('form')) body += `<section><h2>Contact us</h2><form onsubmit="event.preventDefault();alert('Thanks — this is a generated demo form.')"><label>Name <input required></label><label>Email <input type="email" required></label><label>Message <textarea rows="3"></textarea></label><button class="cta" type="submit">Send</button></form></section>`;
    body += `<footer><p>Generated for ${spec.business} · AI UI Generator (rule-based templates)</p></footer>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${spec.business} — ${spec.page_type}</title><style>body{font-family:system-ui,sans-serif;margin:0;color:#16233a}.hero{background:${headerBg};color:#fff;padding:64px 24px;text-align:center}.hero h1{font-size:2.2rem;margin:0 0 8px}.cta{display:inline-block;background:${accent};color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:12px}section{max-width:900px;margin:0 auto;padding:32px 20px}h2{color:${bg}}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.card{border:1px solid #d7e0ea;border-radius:12px;padding:18px}.amount{font-size:1.6rem;font-weight:700}.thumb{height:120px;border-radius:12px;display:grid;place-items:center;font-weight:600}footer{text-align:center;color:#667;padding:24px}form label{display:block;margin:10px 0}input,textarea{width:100%;padding:8px;border:1px solid #c8d3de;border-radius:8px}blockquote{border-left:4px solid ${accent};margin:0;padding:8px 16px;background:#f7f9fb}</style></head><body>${body}</body></html>`;
  }
  return {parsePrompt, applyRefinement, generateHtml};
})();
