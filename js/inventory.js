/* ============ inventory.js — Inventory Management ============ */

const INV_STORAGE_KEY = "ledger.inventory.v2.5";
const INV_CATEGORIES = ["Electronics", "Food & Drinks", "Clothing", "Office Supplies", "Tools", "Furniture", "Other"];
let inventory = [];
let activeInvFilter = "all";
let expandedInvId = null;

// Load latest default inventory (network first)
async function loadDefaultInventory() {
  console.log("Loading latest default inventory...");
  const defaultUrl = "default-inventory.json";

  try {
    const res = await fetch(defaultUrl, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Loaded ${data.length} items from latest default-inventory.json`);
        return data;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch latest default inventory", e);
  }

  // Fallback to cache
  if ("caches" in window) {
    try {
      const cache = await caches.open("gol-cache-v2.5");
      const cached = await cache.match(defaultUrl);
      if (cached) {
        const data = await cached.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`Loaded ${data.length} items from cache`);
          return data;
        }
      }
    } catch (e) {}
  }

  console.warn("Could not load default inventory");
  return [];
}

// Merge latest defaults while preserving user quantity
function mergeWithLatestDefaults(latest) {
  const latestMap = new Map(latest.map(item => [item.id, item]));

  inventory = inventory.map(existing => {
    const latestItem = latestMap.get(existing.id);
    if (latestItem) {
      return { ...latestItem, quantity: existing.quantity }; // preserve user qty
    }
    return existing;
  });

  // Add any new items from defaults
  latest.forEach(latestItem => {
    if (!inventory.some(i => i.id === latestItem.id)) {
      inventory.push(latestItem);
    }
  });

  // Remove items that no longer exist in defaults
  inventory = inventory.filter(item => latestMap.has(item.id));
}

// Load inventory
async function loadInventory() {
  try {
    const raw = localStorage.getItem(INV_STORAGE_KEY);
    if (raw) {
      inventory = JSON.parse(raw);
      console.log(`Loaded ${inventory.length} items from localStorage`);
    }
  } catch (e) {
    console.error("Failed to load inventory from storage", e);
  }

  if (inventory.length === 0) {
    inventory = await loadDefaultInventory();
  } else {
    // Try to update with latest defaults
    const latest = await loadDefaultInventory();
    if (latest.length > 0) mergeWithLatestDefaults(latest);
  }

  saveInventory();
  return inventory;
}

// Sync with latest default inventory when online
async function syncWithLatestInventory() {
  if (!navigator.onLine) return;
  
  console.log("Syncing with latest default inventory...");
  try {
    const res = await fetch("default-inventory.json", { cache: "no-store" });
    if (!res.ok) return;

    const latestData = await res.json();
    if (!Array.isArray(latestData) || latestData.length === 0) return;

    const latestIds = new Set(latestData.map(item => item.id));

    // Remove items that no longer exist in latest version
    inventory = inventory.filter(item => latestIds.has(item.id));

    // Add / update items
    latestData.forEach(latestItem => {
      const existing = inventory.findIndex(i => i.id === latestItem.id);
      if (existing === -1) {
        inventory.push(latestItem);
      } else {
        // Preserve user quantity but update other fields
        const currentQty = inventory[existing].quantity;
        inventory[existing] = { ...latestItem, quantity: currentQty };
      }
    });

    saveInventory();
    console.log("Default inventory synced successfully");
  } catch (err) {
    console.error("Failed to sync default inventory:", err);
  }
}

function loadInventory() {
  try {
    const raw = localStorage.getItem(INV_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inventory = parsed;
        console.log(`Loaded ${inventory.length} items from localStorage`);
        return Promise.resolve();
      }
    }
  } catch (e) {
    console.error("Could not read inventory from storage:", e);
  }

  return loadDefaultInventory();
}


// Initialize
loadInventory().then(() => {
  console.log("Inventory initialization complete, total items:", inventory.length);
  if (document.getElementById("panel-store").classList.contains("active")) {
    renderStore();
  }
  if (document.getElementById("panel-inventory").classList.contains("active")) {
    renderInventory();
  }
});

// Periodic sync when online
setInterval(() => {
  if (navigator.onLine) syncWithLatestInventory();
}, 5 * 60 * 1000); // every 5 minutes

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && navigator.onLine) {
    syncWithLatestInventory();
  }
});

function saveInventory() {
  try {
    localStorage.setItem(INV_STORAGE_KEY, JSON.stringify(inventory));
  } catch (e) {
    console.error("Failed to save inventory", e);
  }
  scheduleCloudSave();
}

// Called from cloud sync (in settings.js or firebase.js)
window.refreshDefaultInventory = async function() {
  console.log("Cloud sync: Refreshing default inventory...");
  const latest = await loadDefaultInventory();
  if (latest.length > 0) {
    mergeWithLatestDefaults(latest);
    saveInventory();
    renderInventory();
    if (document.getElementById("panel-store").classList.contains("active")) renderStore();
    console.log("Default inventory updated from cloud sync");
  }
};

// Populate category select
(function initInvCategories() {
  const sel = document.getElementById("invItemCat");
  INV_CATEGORIES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
})();

renderChipFilters(document.getElementById("invFilters"), INV_CATEGORIES, activeInvFilter, (val) => { activeInvFilter = val; renderInventory(); });

function formatPrice(n) {
  return "$" + Number(n).toFixed(2);
}

function renderInventory() {
  const list = document.getElementById("invList");
  list.innerHTML = "";

  let filtered = inventory;
  if (activeInvFilter !== "all") {
    filtered = filtered.filter(item => item.category === activeInvFilter);
  }

  filtered.sort((a, b) => a.name.localeCompare(b.name));

  // Summary
  const totalItems = inventory.length;
  const totalQty = inventory.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("invSummary").textContent = inventory.length === 0
    ? t("inv_noItems")
    : t("inv_summary")(totalItems, totalQty);

  // Value bar
  const valueBar = document.getElementById("invValueBar");
  const visibleValue = filtered.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const accCount = filtered.reduce((sum, item) => sum + (item.accessories ? item.accessories.length : 0), 0);
  valueBar.innerHTML = `
    <span>${t("inv_visibleTotal")} <strong>${formatPrice(visibleValue)}</strong></span>
    <span>${t("inv_allCategories")} <strong>${formatPrice(totalValue)}</strong></span>
    <span>${t("inv_accShown")} <strong>${accCount}</strong></span>
  `;

  if (filtered.length === 0) {
    list.innerHTML = renderEmptyState(t("dash_empty"), activeInvFilter !== "all" ? t("inv_noCategory") : t("inv_addFirst"));
    return;
  }

  filtered.forEach(item => {
    const wrap = document.createElement("div");
    wrap.className = "inv-row-wrap" + (expandedInvId === item.id ? " expanded" : "");

    const row = document.createElement("div");
    row.className = "inv-row";
    row.innerHTML = `
      <span class="inv-row-name">${escapeHTML(item.name)}</span>
      <span class="inv-row-price">${formatPrice(item.price)}</span>
      <span class="inv-row-qty">${item.quantity}</span>
      <span class="inv-row-cat"><span class="inv-cat-badge">${escapeHTML(item.category)}</span></span>
    `;
    row.addEventListener("click", () => {
      expandedInvId = expandedInvId === item.id ? null : item.id;
      renderInventory();
    });
    wrap.appendChild(row);

    // Expanded content
    if (expandedInvId === item.id) {
      if (item.description) {
        const desc = document.createElement("div");
        desc.className = "inv-desc";
        desc.textContent = item.description;
        wrap.appendChild(desc);
      }

      if (item.accessories && item.accessories.length > 0) {
        const sec = document.createElement("div");
        sec.className = "inv-acc-section";
        sec.innerHTML = `<div class="inv-acc-label">${t("inv_accessories")}</div>`;
        const accList = document.createElement("div");
        accList.className = "inv-acc-list";
        item.accessories.forEach(acc => {
          const accItem = document.createElement("div");
          accItem.className = "inv-acc-item";
          accItem.innerHTML = `
            <span class="inv-acc-item-name">${escapeHTML(acc.name)}</span>
            <span class="inv-acc-item-qty">x${acc.quantity}</span>
            <span class="inv-acc-item-price">${formatPrice(acc.price)}</span>
          `;
          accList.appendChild(accItem);
        });
        sec.appendChild(accList);
        wrap.appendChild(sec);
      }

      // Consumable & stat effects display
      if (item.consumable) {
        const consSec = document.createElement("div");
        consSec.className = "inv-acc-section";
        const consLabel = document.createElement("div");
        consLabel.className = "inv-acc-label";
        consLabel.textContent = t("invModal_consumable");
        consSec.appendChild(consLabel);
        if (item.statEffects && item.statEffects.length > 0) {
          const effList = document.createElement("div");
          effList.className = "inv-acc-list";
          const statLabels = { health: t("life_health"), energy: t("life_energy"), hunger: t("life_hunger"), thirst: t("life_thirst") };
          item.statEffects.forEach(eff => {
            const effItem = document.createElement("div");
            effItem.className = "inv-acc-item";
            effItem.innerHTML = `
              <span class="inv-acc-item-name">${statLabels[eff.stat] || eff.stat}</span>
              <span class="inv-acc-item-price" style="color:${eff.amount > 0 ? "var(--sage)" : "var(--danger)"}">${eff.amount > 0 ? "+" : ""}${eff.amount}</span>
            `;
            effList.appendChild(effItem);
          });
          consSec.appendChild(effList);
        }
        wrap.appendChild(consSec);
      }

      // Edit button in expanded view
      const editRow = document.createElement("div");
      editRow.style.cssText = "padding:8px 16px 12px;display:flex;gap:8px;";
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-ghost btn-small";
      editBtn.textContent = t("inv_edit");
      editBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openInvModal(item.id);
      });
      editRow.appendChild(editBtn);
      wrap.appendChild(editRow);
    }

    list.appendChild(wrap);
  });
}

// Accessories row helper
function addAccRow(name, qty, price, pts) {
  const list = document.getElementById("invAccList");
  const row = document.createElement("div");
  row.className = "todo-input-row";
  row.innerHTML = `
    <input type="text" class="acc-name-input" placeholder="${t("inv_accPlaceholder")}" value="${escapeHTML(name || "")}" style="flex:2">
    <input type="number" class="acc-qty-input" min="1" value="${qty || 1}" style="width:60px">
    <input type="number" class="acc-price-input" min="0" step="0.01" value="${price || 0}" style="width:80px" placeholder="${t("inv_accPricePlaceholder")}">
    <input type="number" class="acc-pts-input" min="0" value="${pts || 0}" style="width:60px" placeholder="pts">
    <button type="button" class="todo-remove-btn" title="${t("inv_remove")}">&times;</button>
  `;
  row.querySelector(".todo-remove-btn").addEventListener("click", () => {
    if (list.children.length > 1) row.remove();
    else {
      row.querySelector(".acc-name-input").value = "";
      row.querySelector(".acc-qty-input").value = 1;
      row.querySelector(".acc-price-input").value = 0;
      row.querySelector(".acc-pts-input").value = 0;
    }
  });
  list.appendChild(row);
}

// Stat effect row helper
function addStatEffectRow(stat, amount) {
  const list = document.getElementById("invStatEffectsList");
  const row = document.createElement("div");
  row.className = "todo-input-row stat-effect-row";
  const statLabels = { health: t("life_health"), energy: t("life_energy"), hunger: t("life_hunger"), thirst: t("life_thirst") };
  row.innerHTML = `
    <select class="stat-effect-stat-input">
      <option value="health"${stat === "health" ? " selected" : ""}>${statLabels.health}</option>
      <option value="energy"${stat === "energy" ? " selected" : ""}>${statLabels.energy}</option>
      <option value="hunger"${stat === "hunger" ? " selected" : ""}>${statLabels.hunger}</option>
      <option value="thirst"${stat === "thirst" ? " selected" : ""}>${statLabels.thirst}</option>
    </select>
    <input type="number" class="stat-effect-amount-input" value="${amount || 10}" placeholder="${t("invModal_amount")}">
    <button type="button" class="todo-remove-btn" title="${t("inv_remove")}">&times;</button>
  `;
  row.querySelector(".todo-remove-btn").addEventListener("click", () => {
    if (list.children.length > 1) row.remove();
    else {
      row.querySelector(".stat-effect-stat-input").value = "health";
      row.querySelector(".stat-effect-amount-input").value = 10;
    }
  });
  list.appendChild(row);
}

// Inventory modal
const invModalOverlay = document.getElementById("invModalOverlay");
const invForm = document.getElementById("invForm");

function openInvModal(itemId) {
  invForm.reset();
  document.getElementById("invAccList").innerHTML = "";
  document.getElementById("invStatEffectsList").innerHTML = "";
  const deleteBtn = document.getElementById("invDeleteBtn");
  invImageData = null;
  document.getElementById("invImagePreview").style.display = "none";
  document.getElementById("invImageRemove").style.display = "none";
  document.getElementById("invImageName").textContent = t("invImageNoFile");
  document.getElementById("invItemConsumable").checked = false;

  if (itemId) {
    const item = inventory.find(i => i.id === itemId);
    document.getElementById("invModalTitle").textContent = t("invModal_edit");
    document.getElementById("invItemId").value = item.id;
    document.getElementById("invItemName").value = item.name;
    document.getElementById("invItemDesc").value = item.description || "";
    document.getElementById("invItemPrice").value = item.price || 0;
    document.getElementById("invItemQty").value = item.quantity;
    document.getElementById("invItemCat").value = item.category;
    deleteBtn.style.display = "inline-block";
    if (item.image) {
      invImageData = item.image;
      document.getElementById("invImageName").textContent = "image";
      document.getElementById("invImagePreview").style.display = "block";
      document.getElementById("invImagePreviewImg").src = item.image;
      document.getElementById("invImageRemove").style.display = "inline-block";
    }
    if (item.accessories) {
      item.accessories.forEach(acc => addAccRow(acc.name, acc.quantity, acc.price, acc.pts));
    }
    // Consumable and stat effects
    document.getElementById("invItemConsumable").checked = !!item.consumable;
    if (item.statEffects && item.statEffects.length > 0) {
      item.statEffects.forEach(e => addStatEffectRow(e.stat, e.amount));
    } else {
      addStatEffectRow("health", 10);
    }
  } else {
    document.getElementById("invModalTitle").textContent = t("invModal_add");
    document.getElementById("invItemId").value = "";
    document.getElementById("invItemQty").value = 1;
    document.getElementById("invItemPrice").value = 0;
    document.getElementById("invItemCat").value = INV_CATEGORIES[0];
    deleteBtn.style.display = "none";
    addAccRow("");
    addStatEffectRow("health", 10);
  }

  invModalOverlay.classList.add("open");
  document.getElementById("invItemName").focus();
}

function closeInvModal() {
  invModalOverlay.classList.remove("open");
}

document.getElementById("invAddBtn").addEventListener("click", () => openInvModal(null));
document.getElementById("invModalClose").addEventListener("click", closeInvModal);
document.getElementById("invCancelBtn").addEventListener("click", closeInvModal);
invModalOverlay.addEventListener("click", (e) => { if (e.target === invModalOverlay) closeInvModal(); });

document.getElementById("invAddAccRow").addEventListener("click", () => addAccRow(""));
document.getElementById("invAddStatEffectRow").addEventListener("click", () => addStatEffectRow("health", 10));

document.getElementById("invDeleteBtn").addEventListener("click", () => {
  const id = document.getElementById("invItemId").value;
  if (!id) return;
  if (!confirm(t("confirm_deleteItem"))) return;
  inventory = inventory.filter(i => i.id !== id);
  expandedInvId = null;
  saveInventory();
  closeInvModal();
  refreshAll();
  showToast(t("toast_invDeleted"));
});

invForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = document.getElementById("invItemId").value;
  const name = document.getElementById("invItemName").value.trim();
  const description = document.getElementById("invItemDesc").value.trim();
  const price = parseFloat(document.getElementById("invItemPrice").value) || 0;
  const quantity = parseInt(document.getElementById("invItemQty").value, 10);
  const category = document.getElementById("invItemCat").value;

  if (!name || isNaN(quantity)) return;

  const accRows = document.querySelectorAll("#invAccList .todo-input-row");
  const accessories = [];
  accRows.forEach(row => {
    const accName = row.querySelector(".acc-name-input").value.trim();
    const accQty = parseInt(row.querySelector(".acc-qty-input").value, 10) || 1;
    const accPrice = parseFloat(row.querySelector(".acc-price-input").value) || 0;
    const accPts = parseInt(row.querySelector(".acc-pts-input").value, 10) || 0;
    if (accName) accessories.push({ id: uid(), name: accName, quantity: accQty, price: accPrice, pts: accPts });
  });

  // Consumable and stat effects
  const consumable = document.getElementById("invItemConsumable").checked;
  const statEffectRows = document.querySelectorAll("#invStatEffectsList .stat-effect-row");
  const statEffects = [];
  statEffectRows.forEach(row => {
    const stat = row.querySelector(".stat-effect-stat-input").value;
    const amount = parseInt(row.querySelector(".stat-effect-amount-input").value, 10) || 0;
    if (stat && amount !== 0) statEffects.push({ stat, amount });
  });

  if (id) {
    const item = inventory.find(i => i.id === id);
    item.name = name;
    item.description = description;
    item.price = price;
    item.quantity = quantity;
    item.category = category;
    item.accessories = accessories;
    item.image = invImageData || null;
    item.consumable = consumable;
    item.statEffects = statEffects;
    showToast(t("toast_itemUpdated"));
  } else {
    inventory.push({ id: uid(), name, description, price, quantity, category, accessories, image: invImageData || null, consumable, statEffects });
    showToast(t("toast_itemAdded"));
  }

  saveInventory();
  closeInvModal();
  refreshAll();
});

/* ============ Inventory Image Handling ============ */
let invImageData = null;

document.getElementById("invItemImage").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    invImageData = reader.result;
    document.getElementById("invImageName").textContent = file.name;
    document.getElementById("invImagePreview").style.display = "block";
    document.getElementById("invImagePreviewImg").src = invImageData;
    document.getElementById("invImageRemove").style.display = "inline-block";
  };
  reader.readAsDataURL(file);
});

document.getElementById("invImageRemove").addEventListener("click", () => {
  invImageData = null;
  document.getElementById("invItemImage").value = "";
  document.getElementById("invImageName").textContent = t("invImageNoFile");
  document.getElementById("invImagePreview").style.display = "none";
  document.getElementById("invImageRemove").style.display = "none";
});

/* ============ Inventory Export / Import ============ */
document.getElementById("invExportBtn").addEventListener("click", () => {
  const data = {
    version: 1,
    type: "inventory-backup",
    exportedAt: new Date().toISOString(),
    inventory: inventory,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory-backup.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast(t("toast_exported"));
});

document.getElementById("invImportInput").addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  let importedCount = 0;
  let pending = files.length;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const items = data.inventory || (Array.isArray(data) ? data : []);
        items.forEach(newItem => {
          // Avoid duplicates by id
          if (!inventory.find(i => i.id === newItem.id)) {
            inventory.push(newItem);
          }
        });
        importedCount++;
      } catch (err) {
        // skip invalid files
      }
      pending--;
      if (pending === 0) {
        saveInventory();
        renderInventory();
        showToast(`${importedCount} backup${importedCount !== 1 ? "s" : ""} imported.`);
      }
    };
    reader.readAsText(file);
  });

  e.target.value = "";
});
