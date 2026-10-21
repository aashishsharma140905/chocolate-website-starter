(() => {
  const cfg = window.CHOCOLATE_CONFIG;
  const $ = selector => document.querySelector(selector);
  const grid = $("#product-grid"), filters = $("#category-filters"), message = $("#store-message");
  const productDialog = $("#product-dialog"), cartOverlay = $("#cart-overlay"), cartItems = $("#cart-items"), toast = $("#store-toast");
  const cartStorageKey = "maheshwari-cart-v1";
  const defaults = {
    brand_name: cfg.brandName,
    announcement: "Homemade chocolate · Made with love · Custom orders",
    hero_title: "Small bites. Big happiness.",
    hero_description: "Homemade chocolates made with love for birthdays, anniversaries, return gifts and the moments worth celebrating.",
    story_text: "Celebrate birthdays and anniversaries, share return gifts, or ask about a custom order. Send us a message to discuss your occasion.",
    instagram_url: cfg.instagramUrl || "",
    whatsapp_number: cfg.whatsappNumber || "",
    delivery_note: "Delivery charges and final availability are confirmed on WhatsApp."
  };
  let settings = {...defaults};
  let brandName = cfg.brandName;
  let whatsappNumber = cfg.whatsappNumber || "";
  let deliveryNote = defaults.delivery_note;
  let cartNote = "";
  let allProducts = [];
  let selectedCategory = "All";
  let searchTerm = "";
  let sortMode = "featured";
  let availableOnly = false;
  let priceMin = null;
  let priceMax = null;
  let activeProduct = null;
  let activeImageIndex = 0;
  let selectedVariant = null;
  let detailQuantity = 1;
  let returnFocus = null;
  let toastTimer;
  let legacyProductSchema = false;

  const money = value => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: cfg.currency, maximumFractionDigits: 2
  }).format(Number(value));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const normalizeBrandName = value => {
    const name = String(value ?? "").trim();
    return /^maheshwari\s+chocollates?\s+house$/i.test(name) ? "Maheshwari Chocollates" : name || cfg.brandName;
  };
  const hasWhatsApp = () => /^\d{10,15}$/.test(whatsappNumber);
  const waLink = text => hasWhatsApp() ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}` : "#";
  const variantsFor = product => Array.isArray(product.variants) ? product.variants.filter(v => v && v.name && Number.isFinite(Number(v.price))) : [];
  const effectivePrice = (product, variant = null) => Number(variant ? variant.price : product.price);
  const effectiveWeight = (product, variant = null) => (variant && variant.weight) || product.weight || "";
  const cartKey = (product, variant = null) => variant ? `${product.id}::${variant.name}` : String(product.id);
  const imageUrlsFor = product => [...new Set([product?.image_url, ...(Array.isArray(product?.image_urls) ? product.image_urls : [])].filter(url => typeof url === "string" && url.trim()).map(url => url.trim()))].slice(0, 5);
  const pricesFor = product => variantsFor(product).length ? variantsFor(product).map(v => Number(v.price)) : [Number(product.price)];

  function readCart() {
    try {
      const entries = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
      return new Map(entries.filter(entry => Array.isArray(entry) && entry[0] && Number.isInteger(entry[1]) && entry[1] > 0));
    } catch { return new Map(); }
  }
  let cart = readCart();
  function persistCart() {
    try { localStorage.setItem(cartStorageKey, JSON.stringify([...cart.entries()])); }
    catch { showToast("Your cart is available until you close this browser."); }
  }
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
  }
  function applySettings(next) {
    settings = {...defaults, ...(next || {})};
    brandName = normalizeBrandName(settings.brand_name || defaults.brand_name);
    whatsappNumber = settings.whatsapp_number || "";
    deliveryNote = settings.delivery_note || defaults.delivery_note;
    $("#brand-name").textContent = brandName.toUpperCase();
    $("#footer-brand").textContent = brandName.toUpperCase();
    $("#announcement-text").textContent = settings.announcement || defaults.announcement;
    $("#hero-title").textContent = settings.hero_title || defaults.hero_title;
    $("#hero-description").textContent = settings.hero_description || defaults.hero_description;
    $("#story-copy").textContent = settings.story_text || defaults.story_text;
    document.title = `${brandName} | Homemade with love`;
    const instagram = $("#instagram-link");
    const instagramUrl = settings.instagram_url || defaults.instagram_url;
    if (instagramUrl && /^https:\/\//i.test(instagramUrl)) {
      instagram.href = instagramUrl;
      instagram.hidden = false;
    } else instagram.hidden = true;
    configureWhatsAppLink();
    $("#cart-note").textContent = deliveryNote;
    renderCart();
  }
  function configureWhatsAppLink() {
    const link = $("#story-whatsapp");
    link.href = waLink(`Hello ${brandName}, I'd like to ask about a custom chocolate order.`);
    if (!hasWhatsApp()) {
      link.setAttribute("aria-disabled", "true");
      link.title = "Add the business WhatsApp number in the owner settings to enable ordering.";
      link.onclick = event => { event.preventDefault(); showToast("WhatsApp ordering is not configured yet."); };
    } else {
      link.removeAttribute("aria-disabled");
      link.removeAttribute("title");
      link.onclick = null;
    }
  }
  function productImage(product, className = "") {
    const imageUrl = imageUrlsFor(product)[0];
    if (imageUrl) return `<img class="${className}" src="${esc(imageUrl)}" alt="${esc(product.name)}" loading="lazy">`;
    return `<div class="product-placeholder ${className}" aria-label="${esc(product.name)}"><span>MAHESHWARI</span><b>${esc(product.name.slice(0, 1).toUpperCase())}</b></div>`;
  }
  function renderFilters() {
    const categories = ["All", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    filters.innerHTML = categories.map(cat =>
      `<button type="button" class="filter-chip ${cat === selectedCategory ? "active" : ""}" data-category="${esc(cat)}">${esc(cat)}</button>`
    ).join("");
  }
  function productCard(p) {
    const variants = variantsFor(p);
    const starting = variants.length ? Math.min(...variants.map(v => Number(v.price))) : Number(p.price);
    const soldOut = p.stock_status === "sold_out";
    const availability = soldOut ? "Sold out" : p.stock_status === "seasonal" ? "Seasonal" : "";
    return `<article class="product-card ${p.is_featured ? "is-featured" : ""}">
      <button class="product-visual" type="button" data-view-product="${esc(p.id)}" aria-label="View ${esc(p.name)} details">
        <div class="product-image ${soldOut ? "image-sold-out" : ""}">${productImage(p)}${p.category ? `<span class="product-tag">${esc(p.category)}</span>` : ""}${availability ? `<span class="availability-tag ${soldOut ? "sold-out" : "seasonal"}">${availability}</span>` : ""}${p.is_featured ? '<span class="featured-tag">House favourite</span>' : ""}<span class="quick-view">Quick view</span></div>
      </button>
      <div class="product-info">
        <button class="product-title-button" type="button" data-view-product="${esc(p.id)}"><h3>${esc(p.name)}</h3></button>
        <p class="product-description">${esc(p.description || "Homemade chocolate, made with love.")}</p>
        <div class="product-bottom"><div><strong>${variants.length ? `From ${money(starting)}` : money(p.price)}</strong>${p.weight && !variants.length ? `<small>${esc(p.weight)}</small>` : variants.length ? `<small>${variants.length} options</small>` : ""}</div>
        <button class="add-card-button" type="button" data-add-product="${esc(p.id)}" ${soldOut ? "disabled" : ""}>${soldOut ? "Sold out" : variants.length ? "Choose options" : "Add to cart"}${soldOut ? "" : " <span>+</span>"}</button></div>
      </div>
    </article>`;
  }
  function renderFeaturedProducts() {
    const section = $("#featured-selection");
    const featured = allProducts.filter(p => p.is_featured && p.is_active !== false)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).slice(0, 4);
    section.hidden = featured.length === 0;
    $("#featured-grid").innerHTML = featured.map(productCard).join("");
  }
  function renderProducts() {
    const invalidPriceRange = priceMin !== null && priceMax !== null && priceMin > priceMax;
    if (invalidPriceRange) {
      grid.innerHTML = '<div class="catalog-empty"><p class="muted">The minimum price must be less than the maximum price.</p></div>';
      $("#catalog-results").textContent = "Check your price range";
      updateClearFilters();
      return;
    }
    const products = allProducts.filter(p => {
      const categoryMatches = selectedCategory === "All" || p.category === selectedCategory;
      const haystack = `${p.name} ${p.description || ""} ${p.category || ""}`.toLocaleLowerCase();
      const searchMatches = haystack.includes(searchTerm.toLocaleLowerCase());
      const availabilityMatches = !availableOnly || p.stock_status !== "sold_out";
      const priceMatches = pricesFor(p).some(price => (priceMin === null || price >= priceMin) && (priceMax === null || price <= priceMax));
      return categoryMatches && searchMatches && availabilityMatches && priceMatches;
    });
    products.sort((a, b) => {
      const priceOf = p => variantsFor(p).length ? Math.min(...variantsFor(p).map(v => Number(v.price))) : Number(p.price);
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "price-low") return priceOf(a) - priceOf(b);
      if (sortMode === "price-high") return priceOf(b) - priceOf(a);
      return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });
    const results = $("#catalog-results");
    if (!products.length) {
      grid.innerHTML = allProducts.length
        ? '<div class="catalog-empty"><p class="muted">No products match these filters.</p><button class="text-button" type="button" data-clear-filters>Clear filters</button></div>'
        : '<p class="muted">Our collection is being prepared. Please check back soon.</p>';
      results.textContent = "";
      updateClearFilters();
      return;
    }
    results.textContent = `${products.length} ${products.length === 1 ? "product" : "products"}`;
    updateClearFilters();
    grid.innerHTML = products.map(productCard).join("");
  }
  function updateClearFilters() {
    const clear = $("#clear-filters");
    clear.hidden = !(selectedCategory !== "All" || searchTerm || sortMode !== "featured" || availableOnly || priceMin !== null || priceMax !== null);
  }
  function clearFilters() {
    selectedCategory = "All";
    searchTerm = "";
    sortMode = "featured";
    availableOnly = false;
    priceMin = priceMax = null;
    $("#product-search").value = "";
    $("#product-sort").value = "featured";
    $("#available-only").checked = false;
    $("#price-min").value = "";
    $("#price-max").value = "";
    renderFilters();
    renderProducts();
  }
  function updateDetailPrice() {
    if (!activeProduct) return;
    $("#dialog-price").textContent = money(effectivePrice(activeProduct, selectedVariant));
    const weight = effectiveWeight(activeProduct, selectedVariant);
    $("#dialog-weight").textContent = weight || "Made fresh for your order";
  }
  function openProduct(product) {
    if (!product) return;
    activeProduct = product;
    detailQuantity = 1;
    returnFocus = document.activeElement;
    activeImageIndex = 0;
    renderProductPhoto(product);
    $("#dialog-category").textContent = product.category || "MAHESHWARI FAVOURITE";
    $("#dialog-name").textContent = product.name;
    $("#dialog-description").textContent = product.description || "Homemade chocolate, made with love.";
    const variants = variantsFor(product);
    const variantWrap = $("#variant-select-wrap");
    const variantSelect = $("#dialog-variant");
    variantWrap.hidden = variants.length === 0;
    variantSelect.innerHTML = variants.map((v, index) => `<option value="${index}">${esc(v.name)} — ${money(v.price)}${v.weight ? ` (${esc(v.weight)})` : ""}</option>`).join("");
    selectedVariant = variants[0] || null;
    variantSelect.value = "0";
    updateDetailPrice();
    const soldOut = product.stock_status === "sold_out";
    $("#detail-add").disabled = soldOut;
    $("#detail-add").textContent = soldOut ? "Currently sold out" : "Add to cart";
    $("#dialog-stock-status").textContent = product.stock_status === "seasonal" ? "Seasonal availability" : soldOut ? "Currently sold out" : "";
    $("#detail-quantity").textContent = detailQuantity;
    productDialog.hidden = false;
    document.body.classList.add("overlay-open");
    window.dispatchEvent(new CustomEvent("chocolate:product-open", {detail:{imageUrl:imageUrlsFor(product)[activeImageIndex] || ""}}));
    productDialog.querySelector(".product-dialog-panel").focus();
  }
  function renderProductPhoto(product) {
    const urls = imageUrlsFor(product);
    const url = urls[activeImageIndex] || urls[0] || "";
    const imageProduct = url ? {...product, image_url:url, image_urls:[url]} : product;
    $("#dialog-image").innerHTML = `${productImage(imageProduct)}${url ? `<canvas class="product-display-canvas" role="img" aria-label="Interactive three-dimensional view of ${esc(product.name)}"></canvas><span class="product-viewer-hint" aria-hidden="true">Move or drag to explore</span>` : ""}`;
    $("#dialog-gallery-thumbs").innerHTML = urls.length > 1 ? urls.map((src, index) => `<button class="gallery-thumb ${index === activeImageIndex ? "active" : ""}" type="button" data-gallery-index="${index}" aria-label="Show photo ${index + 1} of ${urls.length}" aria-pressed="${index === activeImageIndex}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join("") : "";
    $("#dialog-gallery-thumbs").hidden = urls.length < 2;
  }
  function closeProduct() {
    if (productDialog.hidden) return;
    productDialog.hidden = true;
    window.dispatchEvent(new CustomEvent("chocolate:product-close"));
    if (cartOverlay.hidden) document.body.classList.remove("overlay-open");
    if (returnFocus && returnFocus.focus) returnFocus.focus();
  }
  function openCart() {
    returnFocus = document.activeElement;
    cartOverlay.hidden = false;
    document.body.classList.add("overlay-open");
    renderCart();
    cartOverlay.querySelector(".cart-panel").focus();
  }
  function closeCart() {
    if (cartOverlay.hidden) return;
    cartOverlay.hidden = true;
    if (productDialog.hidden) document.body.classList.remove("overlay-open");
    if (returnFocus && returnFocus.focus) returnFocus.focus();
  }
  function cartProducts() {
    return [...cart.entries()].map(([key, qty]) => {
      const split = key.indexOf("::");
      const id = split < 0 ? key : key.slice(0, split);
      const variantName = split < 0 ? null : key.slice(split + 2);
      const product = allProducts.find(p => String(p.id) === String(id));
      const variant = product && variantName ? variantsFor(product).find(v => v.name === variantName) : null;
      return {product, variant, qty, key};
    }).filter(item => item.product && (!item.key.includes("::") || item.variant));
  }
  function buildOrderMessage(items, total) {
    const lines = items.map(({product, variant, qty}) => {
      const size = effectiveWeight(product, variant);
      return `• ${product.name}${variant ? ` — ${variant.name}` : ""} × ${qty} — ${money(effectivePrice(product, variant) * qty)}${size ? ` (${size})` : ""}`;
    });
    const customer = $("#order-customer-name").value.trim();
    const date = $("#order-date").value;
    const fulfilment = $("#order-fulfilment").value;
    return `Hello ${brandName}, I would like to place an order:\n\nCustomer: ${customer}\nOrder type: ${fulfilment}${date ? `\nPreferred date: ${date}` : ""}\n\n${lines.join("\n")}\n\nEstimated item total: ${money(total)}${cartNote.trim() ? `\n\nOrder note: ${cartNote.trim()}` : ""}\n\n${deliveryNote}`;
  }
  function renderCart() {
    const items = cartProducts();
    const count = items.reduce((sum, item) => sum + item.qty, 0);
    $("#cart-count").textContent = count;
    $("#cart-open").setAttribute("aria-label", `Open shopping cart, ${count} ${count === 1 ? "item" : "items"}`);
    cartItems.innerHTML = !items.length
      ? '<div class="cart-empty"><span class="cart-empty-icon">♡</span><h3>Your cart is waiting</h3><p>Explore the collection and add a few favourites.</p></div>'
      : items.map(({product:p, variant, qty, key}) => {
        const price = effectivePrice(p, variant), weight = effectiveWeight(p, variant);
        return `<article class="cart-item">
          <div class="cart-item-image">${productImage(p)}</div>
          <div class="cart-item-copy"><h3>${esc(p.name)}</h3>${variant ? `<span class="cart-variant">${esc(variant.name)}</span>` : ""}<span>${money(price)}${weight ? ` · ${esc(weight)}` : ""}</span>
            <div class="cart-item-controls"><div class="quantity-control compact"><button type="button" data-cart-qty="minus" data-key="${esc(key)}" aria-label="Decrease ${esc(p.name)} quantity">−</button><output>${qty}</output><button type="button" data-cart-qty="plus" data-key="${esc(key)}" aria-label="Increase ${esc(p.name)} quantity">+</button></div><button class="remove-item" type="button" data-remove-item="${esc(key)}">Remove</button></div>
          </div><strong class="cart-line-total">${money(price * qty)}</strong>
        </article>`;
      }).join("");
    const total = items.reduce((sum, item) => sum + effectivePrice(item.product, item.variant) * item.qty, 0);
    const customerName = $("#order-customer-name").value.trim();
    const fulfillment = $("#order-fulfilment").value;
    const preferredDate = $("#order-date").value;
    $("#summary-customer").textContent = customerName || "Your order";
    $("#summary-order-meta").textContent = `${count} ${count === 1 ? "item" : "items"} · ${fulfillment}${preferredDate ? ` · ${preferredDate}` : ""}${cartNote.trim() ? " · Note included" : ""}`;
    $("#summary-total").textContent = money(total);
    const mobileCartBar = $("#mobile-cart-bar");
    if (mobileCartBar) {
      $("#mobile-cart-count").textContent = `${count} ${count === 1 ? "item" : "items"}`;
      $("#mobile-cart-total").textContent = money(total);
      mobileCartBar.hidden = count === 0;
    }
    $("#cart-total").textContent = money(total);
    $("#cart-note").textContent = deliveryNote;
    const checkout = $("#checkout-whatsapp");
    const customerReady = Boolean($("#order-customer-name").value.trim());
    const canCheckout = hasWhatsApp() && items.length && customerReady;
    checkout.href = canCheckout ? waLink(buildOrderMessage(items, total)) : "#";
    checkout.classList.toggle("is-disabled", !canCheckout);
    checkout.setAttribute("aria-disabled", String(!canCheckout));
    checkout.textContent = hasWhatsApp() ? "Review & send order on WhatsApp" : "WhatsApp number needed";
    $("#checkout-hint").textContent = !hasWhatsApp() ? "The owner needs to add a WhatsApp number in store settings." : !items.length ? "Add products to your cart to continue." : !customerReady ? "Add your name to prepare the order message." : "Your order details open in WhatsApp. Review the message and tap Send.";
  }
  function addToCart(product, qty = 1, variant = null) {
    if (!product) return;
    const key = cartKey(product, variant);
    cart.set(key, Math.min(99, (cart.get(key) || 0) + qty));
    persistCart();
    renderCart();
    showToast(`${product.name}${variant ? ` · ${variant.name}` : ""} added to your cart`);
  }
  function changeCartQuantity(key, change) {
    const qty = (cart.get(String(key)) || 0) + change;
    if (qty <= 0) cart.delete(String(key));
    else cart.set(String(key), Math.min(99, qty));
    persistCart();
    renderCart();
  }
  function applySettingsFormDefaults() {
    configureWhatsAppLink();
    $("#cart-note").textContent = deliveryNote;
  }

  document.querySelectorAll("#brand-name, #footer-brand").forEach(el => el.textContent = cfg.brandName.toUpperCase());
  document.title = `${cfg.brandName} | Homemade with love`;
  $("#story-whatsapp").href = waLink(`Hello ${cfg.brandName}, I'd like to ask about a custom chocolate order.`);
  $("#dialog-variant").addEventListener("change", event => {
    const variants = variantsFor(activeProduct || {});
    selectedVariant = variants[Number(event.target.value)] || null;
    updateDetailPrice();
  });
  $("#order-note").addEventListener("input", event => { cartNote = event.target.value; renderCart(); });
  $("#order-customer-name").addEventListener("input", renderCart);
  $("#order-date").addEventListener("change", renderCart);
  $("#order-fulfilment").addEventListener("change", renderCart);
  const today = new Date();
  $("#order-date").min = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  $("#product-search").addEventListener("input", event => { searchTerm = event.target.value.trim(); renderProducts(); });
  $("#product-sort").addEventListener("change", event => { sortMode = event.target.value; renderProducts(); });
  $("#available-only").addEventListener("change", event => { availableOnly = event.target.checked; renderProducts(); });
  const updatePriceFilters = () => {
    const min = $("#price-min").value.trim(), max = $("#price-max").value.trim();
    priceMin = min === "" ? null : Math.max(0, Number(min));
    priceMax = max === "" ? null : Math.max(0, Number(max));
    renderProducts();
  };
  $("#price-min").addEventListener("input", updatePriceFilters);
  $("#price-max").addEventListener("input", updatePriceFilters);
  $("#clear-filters").addEventListener("click", clearFilters);
  filters.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    selectedCategory = button.dataset.category;
    renderFilters(); renderProducts();
  });
  const handleProductCardClick = event => {
    if (event.target.closest("[data-clear-filters]")) { clearFilters(); return; }
    const viewButton = event.target.closest("[data-view-product]");
    if (viewButton) { openProduct(allProducts.find(p => String(p.id) === viewButton.dataset.viewProduct)); return; }
    const addButton = event.target.closest("[data-add-product]");
    if (addButton) {
      const product = allProducts.find(p => String(p.id) === addButton.dataset.addProduct);
      if (variantsFor(product || {}).length) openProduct(product);
      else addToCart(product);
    }
  };
  grid.addEventListener("click", handleProductCardClick);
  $("#featured-grid").addEventListener("click", handleProductCardClick);
  $("#detail-add").addEventListener("click", () => {
    addToCart(activeProduct, detailQuantity, selectedVariant);
    closeProduct();
    openCart();
  });
  productDialog.addEventListener("click", event => {
    if (event.target.closest("[data-close-product]")) closeProduct();
    const photoButton = event.target.closest("[data-gallery-index]");
    if (photoButton && activeProduct) {
      activeImageIndex = Number(photoButton.dataset.galleryIndex) || 0;
      renderProductPhoto(activeProduct);
      window.dispatchEvent(new CustomEvent("chocolate:product-open", {detail:{imageUrl:imageUrlsFor(activeProduct)[activeImageIndex] || ""}}));
      return;
    }
    const qtyButton = event.target.closest("[data-detail-qty]");
    if (qtyButton) {
      detailQuantity = Math.max(1, Math.min(99, detailQuantity + (qtyButton.dataset.detailQty === "plus" ? 1 : -1)));
      $("#detail-quantity").textContent = detailQuantity;
    }
  });
  $("#cart-open").addEventListener("click", openCart);
  $("#mobile-cart-bar")?.addEventListener("click", openCart);
  $("#continue-shopping").addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", event => {
    if (event.target.closest("[data-close-cart]")) { closeCart(); return; }
    const qtyButton = event.target.closest("[data-cart-qty]");
    if (qtyButton) changeCartQuantity(qtyButton.dataset.key, qtyButton.dataset.cartQty === "plus" ? 1 : -1);
    const removeButton = event.target.closest("[data-remove-item]");
    if (removeButton) changeCartQuantity(removeButton.dataset.removeItem, -(cart.get(String(removeButton.dataset.removeItem)) || 0));
  });
  $("#checkout-whatsapp").addEventListener("click", event => {
    if (!hasWhatsApp() || !cartProducts().length) {
      event.preventDefault();
      showToast(hasWhatsApp() ? "Add an item to your cart first." : "Add the business WhatsApp number in the owner settings first.");
    } else if (!$("#order-customer-name").value.trim()) {
      event.preventDefault();
      $("#order-customer-name").focus();
      showToast("Please enter your name to continue.");
    }
  });
  $("#product-search").addEventListener("keydown", event => { if (event.key === "Escape") { event.currentTarget.value = ""; searchTerm = ""; renderProducts(); } });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      event.preventDefault(); $("#product-search").focus();
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") { closeProduct(); closeCart(); }
    if (event.key === "Tab") {
      const panel = !productDialog.hidden ? productDialog.querySelector(".product-dialog-panel") : !cartOverlay.hidden ? cartOverlay.querySelector(".cart-panel") : null;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll('a[href]:not([aria-disabled="true"]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  if (!window.supabase || cfg.supabaseUrl.includes("YOUR-PROJECT")) {
    grid.innerHTML = '<p class="muted">Setup needed: add your Supabase project URL and public key in <code>js/config.js</code>. Products will appear here after setup.</p>';
    renderCart();
    return;
  }
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  async function loadSettings() {
    const {data, error} = await client.from("store_settings").select("*").eq("singleton", true).maybeSingle();
    if (error) { console.warn("Store settings unavailable; using configured defaults.", error.message); applySettings(defaults); return; }
    applySettings(data || defaults);
  }
  async function loadProducts() {
    grid.innerHTML = '<p class="muted">Loading the collection…</p>';
    let {data, error} = await client.from("products")
      .select("id,name,description,price,image_url,image_urls,category,weight,sort_order,is_featured,variants,stock_status,is_active,created_at")
      .eq("is_active", true).order("is_featured", {ascending:false}).order("sort_order", {ascending:true}).order("created_at", {ascending:false});
    if (error) {
      legacyProductSchema = true;
      const fallback = await client.from("products")
        .select("id,name,description,price,image_url,category,weight,sort_order,is_active,created_at")
        .eq("is_active", true).order("sort_order", {ascending:true}).order("created_at", {ascending:false});
      data = fallback.data; error = fallback.error;
    }
    if (error) {
      grid.innerHTML = '<p class="muted">We could not load the collection. Please try again shortly.</p>';
      console.error("Product load failed:", error.message);
      renderCart();
      return;
    }
    allProducts = (data || []).map(p => ({...p, image_urls:Array.isArray(p.image_urls) ? p.image_urls : [], variants:Array.isArray(p.variants) ? p.variants : [], is_featured:Boolean(p.is_featured), stock_status:p.stock_status || "available"}));
    const validKeys = new Set(allProducts.flatMap(p => p.stock_status === "sold_out" ? [] : [String(p.id), ...variantsFor(p).map(v => cartKey(p, v))]));
    cart = new Map([...cart.entries()].filter(([key]) => validKeys.has(key)));
    persistCart();
    renderFilters();
    renderFeaturedProducts();
    renderProducts();
    renderCart();
    if (legacyProductSchema) message.textContent = "Owner: run supabase/storefront-upgrades.sql and supabase/product-gallery.sql in Supabase to enable all product settings and photo galleries.";
    else if (!allProducts.length) message.textContent = "Products and prices will appear here once the owner adds them.";
  }
  applySettingsFormDefaults();
  loadSettings();
  loadProducts();
})();
