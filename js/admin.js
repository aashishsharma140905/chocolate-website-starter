(() => {
  const cfg = window.CHOCOLATE_CONFIG;
  const $ = selector => document.querySelector(selector);
  const loginPanel = $("#login-panel"), dashboardPanel = $("#dashboard-panel");
  const loginMessage = $("#login-message"), formMessage = $("#form-message"), settingsMessage = $("#settings-message");
  const form = $("#product-form"), settingsForm = $("#settings-form");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = value => new Intl.NumberFormat("en-IN", {style:"currency",currency:cfg.currency,maximumFractionDigits:2}).format(Number(value));
  const defaultSettings = {
    brand_name: cfg.brandName,
    whatsapp_number: cfg.whatsappNumber || "",
    announcement: "Homemade chocolate · Made with love · Custom orders",
    hero_title: "Small bites. Big happiness.",
    hero_description: "Homemade chocolates made with love for birthdays, anniversaries, return gifts and the moments worth celebrating.",
    story_text: "Celebrate birthdays and anniversaries, share return gifts, or ask about a custom order. Send us a message to discuss your occasion.",
    instagram_url: cfg.instagramUrl || "",
    delivery_note: "Delivery charges and final availability are confirmed on WhatsApp."
  };

  if (!window.supabase || cfg.supabaseUrl.includes("YOUR-PROJECT")) {
    loginMessage.textContent = "Setup needed: configure js/config.js with your Supabase project details.";
    $("#login-form").addEventListener("submit", e => e.preventDefault());
    return;
  }
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let products = [];
  let existingImages = [];

  function showMessage(el, text, isError = false) {
    el.textContent = text;
    el.classList.toggle("error", isError);
  }
  function fillSettings(settings = {}) {
    const values = {...defaultSettings, ...(settings || {})};
    $("#setting-brand-name").value = values.brand_name || defaultSettings.brand_name;
    $("#setting-whatsapp").value = values.whatsapp_number || "";
    $("#setting-announcement").value = values.announcement || "";
    $("#setting-hero-title").value = values.hero_title || "";
    $("#setting-hero-description").value = values.hero_description || "";
    $("#setting-story").value = values.story_text || "";
    $("#setting-instagram").value = values.instagram_url || "";
    $("#setting-delivery").value = values.delivery_note || "";
  }
  function parseVariants(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length > 20) return {error:"Add up to 20 options per product."};
    const variants = [];
    const seen = new Set();
    for (const line of lines) {
      const [rawName, rawPrice, rawWeight = ""] = line.split("|").map(part => part.trim());
      const name = rawName || "", price = Number(rawPrice), weight = rawWeight || null;
      if (!name || name.length > 60 || rawPrice === undefined || !Number.isFinite(price) || price < 0 || (weight && weight.length > 50)) {
        return {error:`Check this option: “${line}”. Use Option name | price | size.`};
      }
      if (seen.has(name.toLowerCase())) return {error:`Option names must be unique. “${name}” is listed more than once.`};
      seen.add(name.toLowerCase());
      variants.push({name, price, weight});
    }
    return {variants};
  }
  function formatVariants(variants) {
    return (Array.isArray(variants) ? variants : []).map(v => `${v.name} | ${v.price} | ${v.weight || ""}`).join("\n");
  }
  function productImages(product) {
    return [...new Set([product?.image_url, ...(Array.isArray(product?.image_urls) ? product.image_urls : [])].filter(url => typeof url === "string" && url.trim()).map(url => url.trim()))].slice(0, 5);
  }
  function renderGalleryEditor() {
    const gallery = $("#gallery-editor");
    gallery.innerHTML = existingImages.length ? `<p class="field-hint">Current photos — remove any you no longer want to show.</p><div class="gallery-editor-grid">${existingImages.map((url, index) => `<div class="gallery-editor-item"><img src="${esc(url)}" alt="Current product photo ${index + 1}">${index === 0 ? '<span class="cover-photo-label">Cover</span>' : ""}<button type="button" data-remove-image="${index}" aria-label="Remove photo ${index + 1}">×</button></div>`).join("")}</div>` : '<p class="field-hint">No saved product photos yet.</p>';
    const files = $("#image").files;
    $("#image-selection-note").textContent = files.length ? `${files.length} new ${files.length === 1 ? "photo" : "photos"} selected${files.length + existingImages.length > 5 ? " · Remove a photo to stay within the 5-photo limit." : ""}` : "";
  }
  function resetForm() {
    form.reset();
    existingImages = [];
    $("#product-id").value = "";
    $("#sort-order").value = "100";
    $("#is-active").checked = true;
    $("#is-featured").checked = false;
    $("#stock-status").value = "available";
    $("#variants").value = "";
    renderGalleryEditor();
    $("#form-title").textContent = "Add a product";
    $("#cancel-edit").hidden = true;
    showMessage(formMessage, "");
  }
  function setLoggedIn(isLoggedIn) {
    loginPanel.hidden = isLoggedIn;
    dashboardPanel.hidden = !isLoggedIn;
  }
  async function loadDashboard() {
    await Promise.all([loadProducts(), loadSettings()]);
  }
  async function checkSession() {
    const {data} = await client.auth.getSession();
    setLoggedIn(Boolean(data.session));
    if (data.session) await loadDashboard();
  }
  $("#login-form").addEventListener("submit", async event => {
    event.preventDefault();
    showMessage(loginMessage, "Signing in…");
    const {error} = await client.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
    if (error) { showMessage(loginMessage, "Sign-in failed. Check your details and try again.", true); return; }
    showMessage(loginMessage, "");
    setLoggedIn(true);
    await loadDashboard();
  });
  $("#sign-out").addEventListener("click", async () => {
    await client.auth.signOut();
    setLoggedIn(false);
    resetForm();
  });
  client.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session)));

  async function loadSettings() {
    fillSettings();
    const {data, error} = await client.from("store_settings").select("*").eq("singleton", true).maybeSingle();
    if (error) {
      showMessage(settingsMessage, "Run supabase/storefront-upgrades.sql in Supabase SQL Editor to enable store settings.", true);
      console.error("Store settings load failed:", error.message);
      return;
    }
    fillSettings(data || defaultSettings);
    showMessage(settingsMessage, data ? "Store settings loaded." : "Save your settings to publish them to the storefront.");
  }
  settingsForm.addEventListener("submit", async event => {
    event.preventDefault();
    const whatsapp = $("#setting-whatsapp").value.replace(/\D/g, "");
    const instagram = $("#setting-instagram").value.trim();
    if (whatsapp && !/^\d{10,15}$/.test(whatsapp)) {
      showMessage(settingsMessage, "Enter a WhatsApp number with country code, digits only (10–15 digits).", true); return;
    }
    if (instagram) {
      try { const url = new URL(instagram); if (url.protocol !== "https:") throw new Error(); }
      catch { showMessage(settingsMessage, "Enter a valid Instagram URL beginning with https://.", true); return; }
    }
    const payload = {
      singleton: true,
      brand_name: $("#setting-brand-name").value.trim(),
      whatsapp_number: whatsapp || null,
      announcement: $("#setting-announcement").value.trim(),
      hero_title: $("#setting-hero-title").value.trim(),
      hero_description: $("#setting-hero-description").value.trim(),
      story_text: $("#setting-story").value.trim(),
      instagram_url: instagram || null,
      delivery_note: $("#setting-delivery").value.trim()
    };
    if (!payload.brand_name) { showMessage(settingsMessage, "Business name is required.", true); return; }
    showMessage(settingsMessage, "Saving store settings…");
    const {error} = await client.from("store_settings").upsert(payload, {onConflict:"singleton"});
    if (error) {
      showMessage(settingsMessage, "Could not save. Confirm storefront-upgrades.sql has been run and you are signed in as the owner.", true);
      console.error("Store settings save failed:", error.message); return;
    }
    showMessage(settingsMessage, "Store settings saved. Refresh the storefront to see them.");
  });

  async function loadProducts() {
    const {data,error} = await client.from("products").select("*").order("created_at", {ascending:false});
    if (error) {
      $("#admin-product-list").innerHTML = '<p class="muted">Could not load products. Verify the owner account and database policies.</p>';
      console.error(error.message); return;
    }
    products = data || [];
    renderList();
  }
  function renderList() {
    const list = $("#admin-product-list");
    if (!products.length) { list.innerHTML = '<p class="muted">No products yet. Add your first chocolate using the form.</p>'; return; }
    list.innerHTML = products.map(p => `<article class="admin-product">
      <div class="admin-thumb">${productImages(p)[0] ? `<img src="${esc(productImages(p)[0])}" alt="">` : "C"}</div>
      <div class="admin-product-copy"><strong>${esc(p.name)}</strong><span>${money(p.price)}${p.weight ? ` · ${esc(p.weight)}` : ""}</span><small>${p.is_active ? "Published" : "Hidden"} · ${p.stock_status === "sold_out" ? "Sold out" : p.stock_status === "seasonal" ? "Seasonal" : "Available"}${p.is_featured ? " · Featured" : ""}${p.category ? ` · ${esc(p.category)}` : ""}${Array.isArray(p.variants) && p.variants.length ? ` · ${p.variants.length} options` : ""}</small></div>
      <div class="admin-actions"><button type="button" class="text-button" data-edit="${esc(p.id)}">Edit</button><button type="button" class="text-button danger" data-delete="${esc(p.id)}">Delete</button></div>
    </article>`).join("");
  }
  $("#admin-product-list").addEventListener("click", async event => {
    const editButton = event.target.closest("[data-edit]"), deleteButton = event.target.closest("[data-delete]");
    if (editButton) {
      const p = products.find(item => item.id === editButton.dataset.edit);
      if (!p) return;
      existingImages = productImages(p);
      $("#product-id").value = p.id;
      $("#name").value = p.name || "";
      $("#description").value = p.description || "";
      $("#price").value = p.price;
      $("#weight").value = p.weight || "";
      $("#category").value = p.category || "";
      $("#sort-order").value = p.sort_order ?? 100;
      $("#is-active").checked = Boolean(p.is_active);
      $("#is-featured").checked = Boolean(p.is_featured);
      $("#stock-status").value = p.stock_status || "available";
      $("#variants").value = formatVariants(p.variants);
      $("#image").value = "";
      renderGalleryEditor();
      $("#form-title").textContent = "Edit product";
      $("#cancel-edit").hidden = false;
      window.scrollTo({top:0,behavior:"smooth"});
    }
    if (deleteButton) {
      const p = products.find(item => item.id === deleteButton.dataset.delete);
      if (!p || !window.confirm(`Delete “${p.name}”? This cannot be undone.`)) return;
      const {error} = await client.from("products").delete().eq("id",p.id);
      if (error) { showMessage(formMessage, "Delete failed. Check owner permissions.", true); return; }
      showMessage(formMessage, "Product deleted.");
      await loadProducts();
    }
  });
  $("#gallery-editor").addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-image]");
    if (!remove) return;
    existingImages.splice(Number(remove.dataset.removeImage), 1);
    renderGalleryEditor();
  });
  $("#image").addEventListener("change", renderGalleryEditor);
  $("#refresh-products").addEventListener("click", loadProducts);
  $("#cancel-edit").addEventListener("click", resetForm);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    showMessage(formMessage, "Saving product…");
    const id = $("#product-id").value;
    const name = $("#name").value.trim();
    const price = Number($("#price").value);
    const parsed = parseVariants($("#variants").value);
    if (!name || !Number.isFinite(price) || price < 0) {
      showMessage(formMessage, "Enter a product name and a valid non-negative price.", true); return;
    }
    if (parsed.error) { showMessage(formMessage, parsed.error, true); return; }
    const payload = {
      name, description:$("#description").value.trim() || null, price,
      weight:$("#weight").value.trim() || null, category:$("#category").value.trim() || null,
      sort_order:Math.max(0,Number($("#sort-order").value) || 0),
      is_active:$("#is-active").checked, is_featured:$("#is-featured").checked,
      stock_status:$("#stock-status").value,
      variants:parsed.variants
    };
    const files = [...$("#image").files];
    if (existingImages.length + files.length > 5) { showMessage(formMessage, "Keep up to 5 product photos. Remove a saved photo or select fewer new ones.", true); return; }
    const allowed = ["image/jpeg","image/png","image/webp"];
    if (files.some(image => !allowed.includes(image.type) || image.size > 5 * 1024 * 1024)) {
      showMessage(formMessage, "Each photo must be a JPG, PNG or WebP image smaller than 5 MB.", true); return;
    }
    const uploadedPaths = [], uploadedUrls = [];
    for (const image of files) {
      const ext = ({"image/jpeg":"jpg","image/png":"png","image/webp":"webp"})[image.type];
      const path = `${crypto.randomUUID()}.${ext}`;
      const {error:uploadError} = await client.storage.from(cfg.storageBucket).upload(path,image,{contentType:image.type,upsert:false});
      if (uploadError) {
        if (uploadedPaths.length) await client.storage.from(cfg.storageBucket).remove(uploadedPaths);
        showMessage(formMessage, "Photo upload failed. Check storage policies and try again.", true); return;
      }
      uploadedPaths.push(path);
      uploadedUrls.push(client.storage.from(cfg.storageBucket).getPublicUrl(path).data.publicUrl);
    }
    const galleryUrls = [...existingImages, ...uploadedUrls];
    payload.image_urls = galleryUrls;
    payload.image_url = galleryUrls[0] || null;
    const result = id ? await client.from("products").update(payload).eq("id",id) : await client.from("products").insert(payload);
    if (result.error) {
      if (uploadedPaths.length) await client.storage.from(cfg.storageBucket).remove(uploadedPaths);
      showMessage(formMessage, "Save failed. Run supabase/product-gallery.sql for an existing database, then verify the owner account and database policies.", true);
      console.error(result.error.message); return;
    }
    resetForm();
    showMessage(formMessage, "Product saved successfully.");
    await loadProducts();
  });
  fillSettings();
  renderGalleryEditor();
  checkSession();
})();
