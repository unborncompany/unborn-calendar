/* ============ life.js — Life Tab & Item Use ============ */

function renderLifeStats() {
  const stats = ["health", "energy", "hunger", "thirst"];
  const labels = { health: t("life_health"), energy: t("life_energy"), hunger: t("life_hunger"), thirst: t("life_thirst") };

  stats.forEach(stat => {
    const val = Math.round(lifeStats[stat]);
    const labelEl = document.getElementById(`lifeStat${stat.charAt(0).toUpperCase() + stat.slice(1)}Label`);
    const valueEl = document.getElementById(`lifeStat${stat.charAt(0).toUpperCase() + stat.slice(1)}Value`);
    const fillEl = document.getElementById(`lifeStat${stat.charAt(0).toUpperCase() + stat.slice(1)}Fill`);
    if (labelEl) labelEl.textContent = labels[stat];
    if (valueEl) valueEl.textContent = val;
    if (fillEl) {
      fillEl.style.width = val + "%";
      // Add warning animation for low stats
      if (val <= 20) {
        fillEl.classList.add("bar-warning");
      } else {
        fillEl.classList.remove("bar-warning");
      }
    }
  });

  // Level
  lifeStats.level = calcLevel();
  const levelLabel = document.getElementById("lifeLevelLabel");
  const levelFill = document.getElementById("lifeLevelFill");
  const levelPts = document.getElementById("lifeLevelPts");
  if (levelLabel) levelLabel.textContent = `${t("life_level")} ${lifeStats.level}`;
  const totalPts = calcTotalPoints();
  const ptsIntoLevel = ((totalPts % POINTS_PER_LEVEL) + POINTS_PER_LEVEL) % POINTS_PER_LEVEL;
  const levelProgress = (ptsIntoLevel / POINTS_PER_LEVEL) * 100;
  if (levelFill) levelFill.style.width = levelProgress + "%";
  if (levelPts) levelPts.textContent = `${ptsIntoLevel}/${POINTS_PER_LEVEL} pts`;
}

function renderLife() {
  renderLifeStats();
  const grid = document.getElementById("lifeGrid");
  grid.innerHTML = "";

  document.getElementById("lifeTotalItems").textContent = redeemed.length;

  if (redeemed.length === 0) {
    grid.innerHTML = `<div class="empty-state life-empty"><span>${t("dash_empty")}</span>${t("life_empty")}</div>`;
  } else {
    // Group by item
    const grouped = {};
    redeemed.forEach(r => {
      if (!grouped[r.itemId]) {
        grouped[r.itemId] = { ...r, qty: 0, lastRedeemed: r.redeemedAt };
      }
      grouped[r.itemId].qty++;
      if (r.redeemedAt > grouped[r.itemId].lastRedeemed) {
        grouped[r.itemId].lastRedeemed = r.redeemedAt;
      }
    });

    // Filter chips
    const filtersEl = document.getElementById("lifeFilters");
    filtersEl.innerHTML = "";
    const categories = [...new Set(Object.values(grouped).map(i => i.category))];
    const allChip = document.createElement("button");
    allChip.className = "chip-filter" + (activeLifeFilter === "all" ? " active" : "");
    allChip.dataset.filter = "all";
    allChip.textContent = t("inv_all");
    allChip.addEventListener("click", () => { activeLifeFilter = "all"; renderLife(); });
    filtersEl.appendChild(allChip);
    categories.forEach(cat => {
      const chip = document.createElement("button");
      chip.className = "chip-filter" + (activeLifeFilter === cat ? " active" : "");
      chip.dataset.filter = cat;
      chip.textContent = cat;
      chip.addEventListener("click", () => { activeLifeFilter = cat; renderLife(); });
      filtersEl.appendChild(chip);
    });

    let items = Object.values(grouped);
    if (activeLifeFilter !== "all") {
      items = items.filter(item => item.category === activeLifeFilter);
    }

    items.forEach(item => {
      const invItem = inventory.find(i => i.id === item.itemId);
      const isConsumable = invItem && invItem.consumable && invItem.statEffects && invItem.statEffects.length > 0;
      const itemDeleted = !invItem;

      const card = document.createElement("div");
      card.className = "life-card" + (isConsumable ? " consumable" : "") + (itemDeleted ? " item-deleted" : "");

      // Consumable badge
      if (isConsumable) {
        const badge = document.createElement("div");
        badge.className = "life-card-badge";
        badge.textContent = t("invModal_consumable");
        card.appendChild(badge);
      }

      // Deleted from store badge
      if (itemDeleted) {
        const badge = document.createElement("div");
        badge.className = "life-card-badge";
        badge.style.background = "var(--danger)";
        badge.textContent = t("life_itemDeleted");
        card.appendChild(badge);
      }

      if (item.image) {
        const img = document.createElement("img");
        img.className = "life-card-img";
        img.src = item.image;
        img.alt = item.name;
        card.appendChild(img);
      } else {
        const noImg = document.createElement("div");
        noImg.className = "life-card-noimg";
        noImg.textContent = isConsumable ? "\u2728" : "\u2728";
        card.appendChild(noImg);
      }

      const body = document.createElement("div");
      body.className = "life-card-body";

      const name = document.createElement("div");
      name.className = "life-card-name";
      name.textContent = item.name;
      body.appendChild(name);

      const price = document.createElement("div");
      price.className = "life-card-price";
      price.textContent = (item.totalPts || item.price) + " pts";
      body.appendChild(price);

      if (item.selectedAccessories && item.selectedAccessories.length > 0) {
        const accInfo = document.createElement("div");
        accInfo.className = "life-card-qty";
        accInfo.textContent = `${item.selectedAccessories.length} accessory`;
        body.appendChild(accInfo);
      }

      const qty = document.createElement("div");
      qty.className = "life-card-qty";
      qty.textContent = `${t("life_acquired")}: ${item.qty}`;
      body.appendChild(qty);

      const date = document.createElement("div");
      date.className = "life-card-date";
      const d = new Date(item.lastRedeemed);
      date.textContent = t("life_date")(d.toLocaleDateString());
      body.appendChild(date);

      // Stat effects preview for consumables
      if (isConsumable) {
        const effectsDiv = document.createElement("div");
        effectsDiv.className = "life-card-effects";
        const statLabels = { health: t("life_health"), energy: t("life_energy"), hunger: t("life_hunger"), thirst: t("life_thirst") };
        invItem.statEffects.forEach(eff => {
          const tag = document.createElement("span");
          tag.className = "life-card-effect-tag " + (eff.amount >= 0 ? "positive" : "negative");
          tag.textContent = `${eff.amount > 0 ? "+" : ""}${eff.amount} ${statLabels[eff.stat] || eff.stat}`;
          effectsDiv.appendChild(tag);
        });
        body.appendChild(effectsDiv);
      }

      // Use button for consumable items
      if (isConsumable && item.qty > 0) {
        const useArea = document.createElement("div");
        useArea.className = "life-card-use";
        const useBtn = document.createElement("button");
        useBtn.className = "btn btn-primary btn-small";
        useBtn.textContent = t("life_use");
        useBtn.addEventListener("click", () => useItem(item, card));
        useArea.appendChild(useBtn);
        body.appendChild(useArea);
      }

      card.appendChild(body);
      grid.appendChild(card);
    });
  }
}

function useItem(redeemedItem, cardEl) {
  const invItem = inventory.find(i => i.id === redeemedItem.itemId);
  if (!invItem || !invItem.consumable || !invItem.statEffects || invItem.statEffects.length === 0) return;

  // Find how many of this item are in redeemed
  const count = redeemed.filter(r => r.itemId === redeemedItem.itemId).length;
  if (count <= 0) return;

  // Apply stat effects
  const statLabels = { health: t("life_health"), energy: t("life_energy"), hunger: t("life_hunger"), thirst: t("life_thirst") };
  const effects = [];
  invItem.statEffects.forEach(effect => {
    if (effect.stat && typeof effect.amount === "number") {
      lifeStats[effect.stat] = Math.max(0, Math.min(100, lifeStats[effect.stat] + effect.amount));
      effects.push({ stat: effect.stat, label: statLabels[effect.stat] || effect.stat, amount: effect.amount });
    }
  });

  // Remove one redeemed record (the oldest one)
  const idx = redeemed.findIndex(r => r.itemId === redeemedItem.itemId);
  if (idx !== -1) redeemed.splice(idx, 1);
  saveRedeemed();

  saveLifeStats();

  // Play use animation
  playUseAnimation(effects, invItem.name);

  // Short delay then re-render
  setTimeout(() => {
    renderLife();
    renderLifeStats();
    renderPointsSummary();
  }, 1200);
}

function playUseAnimation(effects, itemName) {
  // Flash overlay
  const flash = document.createElement("div");
  flash.className = "life-use-flash";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 800);

  // Popup with effects
  const popup = document.createElement("div");
  popup.className = "life-use-popup";

  const effectHtml = effects.map(e =>
    `<div class="life-use-popup-effect ${e.amount >= 0 ? "positive" : "negative"}">${e.amount > 0 ? "+" : ""}${e.amount} ${e.label}</div>`
  ).join("");

  popup.innerHTML = `
    <div class="life-use-popup-inner">
      <div class="life-use-popup-title">${t("life_used")}</div>
      <div class="life-use-popup-effects">${effectHtml}</div>
    </div>
  `;

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1200);
}
