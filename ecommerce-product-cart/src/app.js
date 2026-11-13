// Storefront: Fake Store API with built-in fallback catalogue, cart, promo engine, recently viewed.
const API = "https://fakestoreapi.com/products";
const FALLBACK = [
  { id: 1, title: "Fjallraven Backpack", price: 109.95, category: "men's clothing", rating: { rate: 3.9, count: 120 }, image: "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg", description: "Everyday backpack with a padded laptop sleeve." },
  { id: 2, title: "Mens Casual T-Shirt", price: 22.30, category: "men's clothing", rating: { rate: 4.1, count: 259 }, image: "https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg", description: "Soft cotton tee, regular fit." },
  { id: 3, title: "Mens Cotton Jacket", price: 55.99, category: "men's clothing", rating: { rate: 4.7, count: 500 }, image: "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_.jpg", description: "Lightweight cotton jacket for spring." },
  { id: 4, title: "WD 2TB External Drive", price: 64.00, category: "electronics", rating: { rate: 3.3, count: 203 }, image: "https://fakestoreapi.com/img/61IBBVJvSDL._AC_SY879_.jpg", description: "USB 3.0 portable drive, 2TB." },
  { id: 5, title: "SanDisk 1TB SSD", price: 109.00, category: "electronics", rating: { rate: 2.9, count: 470 }, image: "https://fakestoreapi.com/img/61U7T1koQqL._AC_SX679_.jpg", description: "Fast portable SSD with USB-C." },
  { id: 6, title: "Acer 21.5in Monitor", price: 599.00, category: "electronics", rating: { rate: 2.9, count: 250 }, image: "https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_.jpg", description: "Full HD IPS display, 75Hz." },
  { id: 7, title: "Gold Plated Earrings", price: 695.00, category: "jewelery", rating: { rate: 4.6, count: 400 }, image: "https://fakestoreapi.com/img/71YAIFU48IL._AC_UL640_QL65_ML3_.jpg", description: "Classic gold-plated stud earrings." },
  { id: 8, title: "Silver Ring Set", price: 9.99, category: "jewelery", rating: { rate: 3.0, count: 70 }, image: "https://fakestoreapi.com/img/51UDEzMJVpL._AC_UL640_QL65_ML3_.jpg", description: "Everyday silver-tone ring set." },
];
const PROMOS = { WELCOME10: { type: "percent", value: 10, label: "10% off" }, FLAT50: { type: "flat", value: 50, label: "$50 off" }, FREESHIP: { type: "ship", value: 0, label: "Free shipping" } };
let products = [], cart = JSON.parse(localStorage.getItem("store-cart") || "[]"),
    recent = JSON.parse(localStorage.getItem("store-recent") || "[]"), promo = null;
const grid = document.getElementById("grid");
const money = n => "$" + n.toFixed(2);
function stockFor(p) { return p.id % 5 === 0 ? 0 : (p.id % 3 === 0 ? 2 : 14); }
async function loadProducts() {
  try {
    const r = await fetch(API);
    if (!r.ok) throw new Error("bad status");
    products = await r.json();
    document.getElementById("apiNote").textContent = "Live catalogue from Fake Store API.";
  } catch (e) {
    products = FALLBACK;
    document.getElementById("apiNote").textContent = "Offline mode — showing the built-in sample catalogue.";
  }
  const cats = [...new Set(products.map(p => p.category))];
  cats.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; document.getElementById("category").appendChild(o); });
  renderGrid(); renderRecent();
}
function filtered() {
  const q = document.getElementById("search").value.toLowerCase(), cat = document.getElementById("category").value, sort = document.getElementById("sort").value;
  let list = products.filter(p => (!cat || p.category === cat) && (p.title + " " + p.description).toLowerCase().includes(q));
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
  return list;
}
function renderGrid() {
  grid.innerHTML = "";
  filtered().forEach(p => {
    const s = stockFor(p), el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `<img src="${p.image}" alt="${p.title}" loading="lazy"><h3>${p.title}</h3>
      <span class="rating">★ ${p.rating?.rate ?? "—"} (${p.rating?.count ?? 0} reviews)</span>
      <span class="price">${money(p.price)}</span>
      <span class="stock${s === 0 ? " out" : s <= 2 ? " low" : ""}">${s === 0 ? "Out of stock" : s <= 2 ? "Only " + s + " left" : "In stock"}</span>
      <button class="btn" ${s === 0 ? "disabled" : ""}>View details</button>
      <button class="btn primary" ${s === 0 ? "disabled" : ""}>Add to cart</button>`;
    const [viewBtn, addBtn] = el.querySelectorAll("button");
    viewBtn.onclick = () => openDetail(p);
    addBtn.onclick = () => addToCart(p.id, 1);
    grid.appendChild(el);
  });
  if (!grid.children.length) grid.innerHTML = "<p>No products match your filters.</p>";
}
function openDetail(p) {
  recent = [p.id, ...recent.filter(id => id !== p.id)].slice(0, 8);
  localStorage.setItem("store-recent", JSON.stringify(recent)); renderRecent();
  const s = stockFor(p), variants = ["Standard", "Premium", "Deluxe"];
  const d = document.getElementById("detail"), card = document.getElementById("detailCard");
  card.innerHTML = `<img src="${p.image}" alt="${p.title}"><h2>${p.title}</h2><p>${p.description}</p>
    <span class="rating">★ ${p.rating?.rate} — ${p.category}</span><span class="price">${money(p.price)}</span>
    <span class="stock${s === 0 ? " out" : ""}">${s === 0 ? "Out of stock" : s + " in stock"}</span>
    <div class="variants">${variants.map((v, i) => `<button class="variant${i === 0 ? " sel" : ""}">${v}</button>`).join("")}</div>
    <label>Quantity <input id="qty" type="number" min="1" max="${Math.max(s, 1)}" value="1"></label>
    <div class="modal-actions"><button id="addDetail" class="btn primary" ${s === 0 ? "disabled" : ""}>Add to cart</button><button id="closeDetail" class="btn">Close</button></div>`;
  card.querySelectorAll(".variant").forEach(b => b.onclick = () => { card.querySelectorAll(".variant").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); });
  card.querySelector("#closeDetail").onclick = () => d.classList.add("hidden");
  card.querySelector("#addDetail").onclick = () => { addToCart(p.id, parseInt(card.querySelector("#qty").value) || 1); d.classList.add("hidden"); };
  d.classList.remove("hidden");
}
function addToCart(id, qty) {
  const line = cart.find(l => l.id === id);
  if (line) line.qty += qty; else cart.push({ id, qty });
  localStorage.setItem("store-cart", JSON.stringify(cart)); renderCart();
}
function cartLines() { return cart.map(l => ({ ...products.find(p => p.id === l.id), qty: l.qty })).filter(l => l.title); }
function totals() {
  const sub = cartLines().reduce((a, l) => a + l.price * l.qty, 0);
  let disc = 0, ship = sub > 0 ? 9.99 : 0;
  if (promo === "WELCOME10") disc = sub * 0.10;
  if (promo === "FLAT50") disc = Math.min(50, sub);
  if (promo === "FREESHIP") ship = 0;
  return { sub, disc, ship, total: Math.max(0, sub - disc + ship) };
}
function renderCart() {
  document.getElementById("cartCount").textContent = cart.reduce((a, l) => a + l.qty, 0);
  const box = document.getElementById("cartItems"); box.innerHTML = "";
  cartLines().forEach(l => {
    const row = document.createElement("div"); row.className = "cart-row";
    row.innerHTML = `<img src="${l.image}" alt=""><div><strong>${l.title}</strong><br>${money(l.price)} each</div>
      <div class="qty"><button data-a="-">−</button><span>${l.qty}</span><button data-a="+">+</button></div><strong>${money(l.price * l.qty)}</strong>`;
    row.querySelector('[data-a="-"]').onclick = () => changeQty(l.id, -1);
    row.querySelector('[data-a="+"]').onclick = () => changeQty(l.id, 1);
    box.appendChild(row);
  });
  if (!cart.length) box.innerHTML = "<p>Your cart is empty.</p>";
  const t = totals();
  document.getElementById("totals").innerHTML = `Subtotal: ${money(t.sub)}<br>Discount${promo ? " (" + promo + ")" : ""}: −${money(t.disc)}<br>Shipping: ${money(t.ship)}<br><strong>Total: ${money(t.total)}</strong>`;
}
function changeQty(id, d) { const l = cart.find(x => x.id === id); if (!l) return; l.qty += d; if (l.qty <= 0) cart = cart.filter(x => x.id !== id); localStorage.setItem("store-cart", JSON.stringify(cart)); renderCart(); }
function renderRecent() {
  const rail = document.getElementById("recentRail"); rail.innerHTML = "";
  recent.forEach(id => { const p = products.find(x => x.id === id); if (!p) return;
    const el = document.createElement("div"); el.className = "mini";
    el.innerHTML = `<img src="${p.image}" alt=""><div>${p.title}</div><strong>${money(p.price)}</strong>`;
    el.onclick = () => openDetail(p); rail.appendChild(el); });
  if (!recent.length) rail.innerHTML = "<p>Products you view will appear here.</p>";
}
document.getElementById("cartBtn").onclick = () => { renderCart(); document.getElementById("cartDrawer").classList.remove("hidden"); };
document.getElementById("closeCart").onclick = () => document.getElementById("cartDrawer").classList.add("hidden");
document.getElementById("applyPromo").onclick = () => {
  const code = document.getElementById("promoCode").value.trim().toUpperCase();
  const msg = document.getElementById("promoMsg");
  if (PROMOS[code]) { promo = code; msg.textContent = "Applied: " + PROMOS[code].label + "."; }
  else { promo = null; msg.textContent = "Unknown code. Try WELCOME10, FLAT50 or FREESHIP."; }
  renderCart();
};
document.getElementById("checkoutBtn").onclick = () => {
  if (!cart.length) { alert("Your cart is empty."); return; }
  const t = totals();
  document.getElementById("checkoutSummary").innerHTML = cartLines().map(l => `${l.qty} × ${l.title} — ${money(l.price * l.qty)}`).join("<br>") + `<br><strong>Total: ${money(t.total)}</strong>`;
  document.getElementById("checkout").classList.remove("hidden");
};
document.getElementById("cancelCheckout").onclick = () => document.getElementById("checkout").classList.add("hidden");
document.getElementById("checkoutForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.get("email"))) { document.getElementById("formError").textContent = "Enter a valid email address."; return; }
  alert("Order placed! Thank you, " + f.get("name") + ". (Demo checkout — no payment was taken.)");
  cart = []; promo = null; localStorage.removeItem("store-cart");
  renderCart(); document.getElementById("checkout").classList.add("hidden"); document.getElementById("cartDrawer").classList.add("hidden");
});
["search", "category", "sort"].forEach(id => document.getElementById(id).addEventListener("input", renderGrid));
loadProducts(); renderCart();
