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
    grid.innerHTML = '<div class="life-items-empty">No items yet</div>';
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
    const categories = [...new Set(Object.values(grouped).map(i => i.category))];
    renderChipFilters(document.getElementById("lifeFilters"), categories, activeLifeFilter, (val) => { activeLifeFilter = val; renderLife(); });

    let items = Object.values(grouped);
    if (activeLifeFilter !== "all") {
      items = items.filter(item => item.category === activeLifeFilter);
    }

    items.forEach(item => {
      const invItem = inventory.find(i => i.id === item.itemId);
      const isConsumable = invItem && invItem.consumable && invItem.statEffects && invItem.statEffects.length > 0;
      const itemDeleted = !invItem;

      const el = document.createElement("div");
      el.className = "life-item" + (isConsumable ? " consumable" : "") + (itemDeleted ? " item-deleted" : "");

      // Main row
      const row = document.createElement("div");
      row.className = "life-item-row";

      const icon = document.createElement("div");
      icon.className = "life-item-icon";
      if (item.image) {
        const img = document.createElement("img");
        img.src = item.image;
        img.alt = item.name;
        icon.appendChild(img);
      } else {
        icon.textContent = isConsumable ? "\u2728" : "\u2728";
      }
      row.appendChild(icon);

      const name = document.createElement("div");
      name.className = "life-item-name";
      name.textContent = item.name;
      row.appendChild(name);

      if (isConsumable) {
        const badge = document.createElement("span");
        badge.className = "life-item-consumable-badge";
        badge.textContent = "Use";
        row.appendChild(badge);
      }

      const qty = document.createElement("span");
      qty.className = "life-item-qty";
      qty.textContent = "x" + item.qty;
      row.appendChild(qty);

      const chevron = document.createElement("span");
      chevron.className = "life-item-chevron";
      chevron.textContent = "\u25b6";
      row.appendChild(chevron);

      row.addEventListener("click", () => {
        // Close other expanded items
        grid.querySelectorAll(".life-item.expanded").forEach(other => {
          if (other !== el) other.classList.remove("expanded");
        });
        el.classList.toggle("expanded");
      });

      el.appendChild(row);

      // Expanded details
      const details = document.createElement("div");
      details.className = "life-item-details";

      const meta = document.createElement("div");
      meta.className = "life-item-meta";

      const ptsRow = document.createElement("div");
      ptsRow.className = "life-item-meta-row";
      ptsRow.innerHTML = `<span>Points:</span> ${(item.totalPts || item.price)} pts`;
      meta.appendChild(ptsRow);

      if (item.selectedAccessories && item.selectedAccessories.length > 0) {
        const accRow = document.createElement("div");
        accRow.className = "life-item-meta-row";
        accRow.innerHTML = `<span>Accessories:</span> ${item.selectedAccessories.length}`;
        meta.appendChild(accRow);
      }

      const dateRow = document.createElement("div");
      dateRow.className = "life-item-meta-row";
      const d = new Date(item.lastRedeemed);
      dateRow.innerHTML = `<span>Acquired:</span> ${d.toLocaleDateString()}`;
      meta.appendChild(dateRow);

      details.appendChild(meta);

      // Stat effects for consumables
      if (isConsumable) {
        const effectsDiv = document.createElement("div");
        effectsDiv.className = "life-item-effects";
        const statLabels = { health: t("life_health"), energy: t("life_energy"), hunger: t("life_hunger"), thirst: t("life_thirst") };
        invItem.statEffects.forEach(eff => {
          const tag = document.createElement("span");
          tag.className = "life-item-effect-tag " + (eff.amount >= 0 ? "positive" : "negative");
          tag.textContent = `${eff.amount > 0 ? "+" : ""}${eff.amount} ${statLabels[eff.stat] || eff.stat}`;
          effectsDiv.appendChild(tag);
        });
        details.appendChild(effectsDiv);

        // Use button
        if (item.qty > 0) {
          const useArea = document.createElement("div");
          useArea.className = "life-item-use";
          const useBtn = document.createElement("button");
          useBtn.className = "btn btn-primary btn-small";
          useBtn.textContent = t("life_use");
          useBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            useItem(item, el);
          });
          useArea.appendChild(useBtn);
          details.appendChild(useArea);
        }
      }

      el.appendChild(details);
      grid.appendChild(el);
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
