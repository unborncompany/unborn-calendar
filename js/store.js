/* ============ store.js — Store & Redeem ============ */

let activeStoreSort = "default";

function renderStore() {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  renderPointsSummary();

  const total = calcTotalPoints();
  const available = total - storeSpent;

  // Filter chips
  const filtersEl = document.getElementById("storeFilters");
  filtersEl.innerHTML = "";
  const categories = [...new Set(inventory.filter(i => i.quantity > 0).map(i => i.category))];
  const allChip = document.createElement("button");
  allChip.className = "chip-filter" + (activeStoreFilter === "all" ? " active" : "");
  allChip.dataset.filter = "all";
  allChip.textContent = t("inv_all");
  allChip.addEventListener("click", () => { activeStoreFilter = "all"; renderStore(); });
  filtersEl.appendChild(allChip);
  categories.forEach(cat => {
    const chip = document.createElement("button");
    chip.className = "chip-filter" + (activeStoreFilter === cat ? " active" : "");
    chip.dataset.filter = cat;
    chip.textContent = cat;
    chip.addEventListener("click", () => { activeStoreFilter = cat; renderStore(); });
    filtersEl.appendChild(chip);
  });

  // Sort controls
  const sortEl = document.createElement("div");
  sortEl.className = "store-sort-controls";
  const sortLabel = document.createElement("span");
  sortLabel.className = "store-sort-label";
  sortLabel.textContent = t("store_sortByPrice") + ":";
  sortEl.appendChild(sortLabel);

  const sortOptions = [
    { key: "default", label: t("store_sortAz") },
    { key: "priceAsc", label: t("store_sortPriceAsc") },
    { key: "priceDesc", label: t("store_sortPriceDesc") },
  ];
  sortOptions.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "chip-filter" + (activeStoreSort === opt.key ? " active" : "");
    btn.textContent = opt.label;
    btn.addEventListener("click", () => { activeStoreSort = opt.key; renderStore(); });
    sortEl.appendChild(btn);
  });
  filtersEl.appendChild(sortEl);

  let storeItems = inventory.filter(item => item.quantity > 0);
  if (activeStoreFilter !== "all") {
    storeItems = storeItems.filter(item => item.category === activeStoreFilter);
  }

  if (activeStoreSort === "priceAsc") {
    storeItems.sort((a, b) => a.price - b.price);
  } else if (activeStoreSort === "priceDesc") {
    storeItems.sort((a, b) => b.price - a.price);
  } else {
    storeItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (storeItems.length === 0) {
    grid.innerHTML = `<div class="empty-state store-empty"><span>${t("dash_empty")}</span>${t("store_addFirst")}</div>`;
    return;
  }

  storeItems.forEach(item => {
    const canAfford = available >= item.price;
    const card = document.createElement("div");
    card.className = "store-card" + (!canAfford ? " cant-afford" : "");

    const imgArea = document.createElement("div");
    imgArea.className = "store-card-img-area";
    if (item.image) {
      const img = document.createElement("img");
      img.className = "store-card-img";
      img.src = item.image;
      img.alt = item.name;
      imgArea.appendChild(img);
    } else {
      const noImg = document.createElement("div");
      noImg.className = "store-card-noimg";
      noImg.textContent = "\u{1F4E6}";
      imgArea.appendChild(noImg);
    }
    if (item.quantity > 1) {
      const badge = document.createElement("span");
      badge.className = "store-card-qty-badge";
      badge.textContent = "x" + item.quantity;
      imgArea.appendChild(badge);
    }
    card.appendChild(imgArea);

    const body = document.createElement("div");
    body.className = "store-card-body";

    const catBadge = document.createElement("span");
    catBadge.className = "store-card-cat";
    catBadge.textContent = item.category;
    body.appendChild(catBadge);

    const name = document.createElement("div");
    name.className = "store-card-name";
    name.textContent = item.name;
    body.appendChild(name);

    if (item.description) {
      const desc = document.createElement("div");
      desc.className = "store-card-desc";
      desc.textContent = item.description;
      body.appendChild(desc);
    }

    const price = document.createElement("div");
    price.className = "store-card-price";
    price.textContent = item.price + " pts";
    body.appendChild(price);

    if (!canAfford) {
      const notEnough = document.createElement("div");
      notEnough.className = "store-card-not-enough";
      notEnough.textContent = t("store_notEnoughCard");
      body.appendChild(notEnough);
    }

    const redeemArea = document.createElement("div");
    redeemArea.className = "store-card-redeem";
    const redeemBtn = document.createElement("button");
    redeemBtn.className = "btn btn-primary btn-small";
    redeemBtn.style.width = "100%";
    redeemBtn.textContent = t("store_redeem");
    redeemBtn.addEventListener("click", () => openRedeemModal(item));
    redeemArea.appendChild(redeemBtn);
    body.appendChild(redeemArea);

    card.appendChild(body);
    grid.appendChild(card);
  });
}

function openRedeemModal(item) {
  currentRedeemItem = item;
  const total = calcTotalPoints();
  const available = total - storeSpent;
  const content = document.getElementById("redeemContent");

  const canAfford = available >= item.price;
  const inStock = item.quantity > 0;
  const hasAccessories = item.accessories && item.accessories.length > 0;
  const maxQty = Math.min(item.quantity, Math.floor(available / item.price)) || 1;

  let accHtml = "";
  if (hasAccessories) {
    accHtml = `<div style="margin-top:14px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--ink)">${t("inv_accessories")}</div>`;
    item.accessories.forEach(acc => {
      const accPts = acc.pts || 0;
      accHtml += `
        <label class="dash-todo-item" style="padding:6px 8px;font-size:12px;gap:8px">
          <input type="checkbox" class="redeem-acc-check" data-acc-id="${acc.id}" data-acc-pts="${accPts}" checked>
          <span>${escapeHTML(acc.name)}${accPts > 0 ? ` (+${accPts} pts)` : ""}</span>
        </label>`;
    });
    accHtml += `</div>`;
  }

  const totalPts = hasAccessories
    ? item.price + item.accessories.reduce((s, a) => s + (a.pts || 0), 0)
    : item.price;

  const qtyHtml = `
    <div class="redeem-qty-row">
      <span class="redeem-qty-label">${t("invModal_qty")}</span>
      <div class="redeem-qty-controls">
        <button type="button" class="redeem-qty-btn" id="redeemQtyMinus">-</button>
        <span class="redeem-qty-value" id="redeemQtyValue">1</span>
        <button type="button" class="redeem-qty-btn" id="redeemQtyPlus">+</button>
      </div>
    </div>
    <div class="redeem-qty-total">
      <span class="redeem-qty-total-label">Total cost</span>
      <span class="redeem-qty-total-pts" id="redeemQtyTotalPts">${totalPts} pts</span>
    </div>
  `;

  content.innerHTML = `
    <p style="margin:0 0 8px;font-size:14px">${t("store_redeemMsg")(escapeHTML(item.name), totalPts)}</p>
    <p style="margin:0 0 4px;font-size:13px;color:var(--ink-soft)">${t("store_availPts")}: <strong>${available}</strong></p>
    <p style="margin:0;font-size:12px;color:var(--ink-soft)">${item.price} pts base${hasAccessories ? " + " + item.accessories.reduce((s, a) => s + (a.pts || 0), 0) + " accessories" : ""}</p>
    ${!canAfford ? `<p style="margin:8px 0 0;font-size:13px;color:var(--danger)">${t("store_notEnough")}</p>` : ""}
    ${!inStock ? `<p style="margin:8px 0 0;font-size:13px;color:var(--danger)">${t("store_outOfStock")}</p>` : ""}
    ${qtyHtml}
    ${accHtml}
  `;

  // Quantity logic
  let selectedQty = 1;
  const qtyValue = document.getElementById("redeemQtyValue");
  const qtyMinus = document.getElementById("redeemQtyMinus");
  const qtyPlus = document.getElementById("redeemQtyPlus");
  const qtyTotalPts = document.getElementById("redeemQtyTotalPts");
  const confirmBtn = document.getElementById("redeemConfirmBtn");

  function updateQtyTotal() {
    const accTotal = hasAccessories
      ? Array.from(content.querySelectorAll(".redeem-acc-check"))
          .filter(c => c.checked)
          .reduce((s, c) => s + (parseInt(c.dataset.accPts) || 0), 0)
      : 0;
    const unitCost = item.price + accTotal;
    const grandTotal = unitCost * selectedQty;
    qtyValue.textContent = selectedQty;
    qtyTotalPts.textContent = grandTotal + " pts";
    const canNow = available >= grandTotal && selectedQty <= item.quantity;
    qtyTotalPts.className = "redeem-qty-total-pts" + (canNow ? "" : " too-expensive");
    confirmBtn.disabled = !canNow;
    confirmBtn.style.opacity = canNow ? "1" : "0.5";
  }

  qtyMinus.addEventListener("click", () => {
    if (selectedQty > 1) {
      selectedQty--;
      updateQtyTotal();
    }
  });

  qtyPlus.addEventListener("click", () => {
    const maxAffordable = Math.floor(available / (item.price + (hasAccessories ? item.accessories.reduce((s, a) => s + (a.pts || 0), 0) : 0)));
    const maxAvailable = item.quantity;
    const maxAllowed = Math.min(maxAffordable, maxAvailable);
    if (selectedQty < maxAllowed) {
      selectedQty++;
      updateQtyTotal();
    }
  });

  // Update total when accessory checkboxes change
  if (hasAccessories) {
    content.querySelectorAll(".redeem-acc-check").forEach(cb => {
      cb.addEventListener("change", () => {
        updateQtyTotal();
      });
    });
  }

  confirmBtn.disabled = !canAfford || !inStock;
  confirmBtn.style.opacity = (!canAfford || !inStock) ? "0.5" : "1";

  // Store qty on the button for the confirm handler
  confirmBtn.dataset.qty = 1;
  confirmBtn.onclick = () => {
    confirmBtn.dataset.qty = selectedQty;
    redeemConfirmWithQty();
  };

  document.getElementById("redeemModalOverlay").classList.add("open");
}

function closeRedeemModal() {
  document.getElementById("redeemModalOverlay").classList.remove("open");
  currentRedeemItem = null;
}

document.getElementById("redeemModalClose").addEventListener("click", closeRedeemModal);
document.getElementById("redeemCancelBtn").addEventListener("click", closeRedeemModal);
document.getElementById("redeemModalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("redeemModalOverlay")) closeRedeemModal();
});

function redeemConfirmWithQty() {
  if (!currentRedeemItem) return;
  const item = currentRedeemItem;
  const total = calcTotalPoints();
  const available = total - storeSpent;
  const confirmBtn = document.getElementById("redeemConfirmBtn");
  const qty = parseInt(confirmBtn.dataset.qty) || 1;

  // Calculate total from selected accessories
  const content = document.getElementById("redeemContent");
  const hasAccessories = item.accessories && item.accessories.length > 0;
  let selectedAccPts = 0;
  let selectedAccIds = [];
  if (hasAccessories) {
    content.querySelectorAll(".redeem-acc-check").forEach(cb => {
      if (cb.checked) {
        selectedAccPts += parseInt(cb.dataset.accPts) || 0;
        selectedAccIds.push(cb.dataset.accId);
      }
    });
  }
  const unitCost = item.price + selectedAccPts;
  const grandTotal = unitCost * qty;

  if (available < grandTotal || item.quantity < qty) return;

  // Deduct points by increasing storeSpent
  storeSpent += grandTotal;
  try { localStorage.setItem(STORE_SPENT_KEY, storeSpent.toString()); } catch (e) {}

  // Record redemption for each quantity
  for (let i = 0; i < qty; i++) {
    redeemed.push({
      itemId: item.id,
      name: item.name,
      image: item.image || null,
      price: item.price,
      category: item.category,
      selectedAccessories: selectedAccIds,
      totalPts: unitCost,
      redeemedAt: new Date().toISOString(),
    });
  }
  saveRedeemed();

  // Reduce quantity
  item.quantity -= qty;
  saveInventory();

  closeRedeemModal();
  renderStore();
  renderPointsSummary();
  showToast(t("store_redeemed") + (qty > 1 ? ` x${qty}` : ""));
}

/* ============ Admin Login ============ */
document.getElementById("supplyStoreBtn").addEventListener("click", () => {
  document.getElementById("adminUser").value = "";
  document.getElementById("adminPass").value = "";
  document.getElementById("adminError").style.display = "none";
  document.getElementById("adminModalOverlay").classList.add("open");
  document.getElementById("adminUser").focus();
});

function closeAdminModal() {
  document.getElementById("adminModalOverlay").classList.remove("open");
}

document.getElementById("adminModalClose").addEventListener("click", closeAdminModal);
document.getElementById("adminCancelBtn").addEventListener("click", closeAdminModal);
document.getElementById("adminModalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("adminModalOverlay")) closeAdminModal();
});

document.getElementById("adminForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value;

  if (user === adminUser && pass === adminPass) {
    closeAdminModal();
    // Show inventory panel directly (not a tab — hidden from nav)
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.getElementById("panel-inventory").classList.add("active");
    renderInventory();
  } else {
    document.getElementById("adminError").style.display = "block";
  }
});
