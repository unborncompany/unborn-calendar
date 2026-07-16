/* ============ pet.js — Virtual Pet Logic ============ */

let petBgMode = localStorage.getItem("pet_bg_mode") || "animated";
let petSpeechTimer = null;

// Messages list based on mood and language
const PET_MESSAGES = {
  en: {
    normal: [
      "Hello! Let's work together to complete our goals today! 😊",
      "I'm feeling great! Keep up the good work! 🌟",
      "Have you done your habits today? Let's check them off!"
    ],
    happy: [
      "Oh wow! Your stats are amazing! I feel so energetic! ❤️",
      "Bouncing around with joy! You're a productivity champion! ✨",
      "I love seeing you succeed! Let's level up more! 🏆"
    ],
    sleepy: [
      "Yaaawn... so sleepy... Did you complete your bedtime routines? 💤",
      "Let's rest a bit... and log our energy! 🛌",
      "A cozy nap sounds perfect right now..."
    ],
    sad: [
      "Oh dear, our hunger or health is a bit low... Let's drink some water! 💧",
      "I'm feeling a bit weak... Let's complete tasks to earn points for food! 🍎",
      "Remember to take care of yourself first, okay? Hugs!"
    ]
  },
  es: {
    normal: [
      "¡Hola! ¡Trabajemos juntos para completar nuestras metas hoy! 😊",
      "¡Me siento genial! ¡Sigue con el buen trabajo! 🌟",
      "¿Ya hiciste tus hábitos hoy? ¡Vamos a marcarlos!"
    ],
    happy: [
      "¡Oh, vaya! ¡Tus estadísticas son increíbles! ¡Me siento tan enérgico! ❤️",
      "¡Saltando de alegría! ¡Eres un campeón de la productividad! ✨",
      "¡Me encanta verte triunfar! ¡Sigamos subiendo de nivel! 🏆"
    ],
    sleepy: [
      "Aaaah... qué sueño... ¿Completaste tus rutinas de dormir? 💤",
      "Descansemos un poco... ¡y registremos nuestra energía! 🛌",
      "Una siesta acogedora suena perfecta justo ahora..."
    ],
    sad: [
      "Vaya, nuestra hambre o salud está algo baja... ¡Bebamos agua! 💧",
      "Me siento un poco débil... ¡Completemos tareas para ganar puntos para comida! 🍎",
      "Recuerda cuidar de ti mismo primero, ¿de acuerdo? ¡Abrazos!"
    ]
  }
};

const MOOD_LABELS = {
  en: { happy: "Happy", sleepy: "Sleepy", sad: "Sad", normal: "Normal" },
  es: { happy: "Feliz", sleepy: "Somnoliento", sad: "Triste", normal: "Normal" }
};

function getPetMood() {
  const healthVal = Math.round(lifeStats.health || 100);
  const energyVal = Math.round(lifeStats.energy || 100);
  const hungerVal = Math.round(lifeStats.hunger || 100);
  const thirstVal = Math.round(lifeStats.thirst || 100);

  if (healthVal < 30 || hungerVal < 30 || thirstVal < 30) {
    return "sad";
  } else if (energyVal < 30) {
    return "sleepy";
  } else if (healthVal > 80 && energyVal > 80 && hungerVal > 80 && thirstVal > 80) {
    return "happy";
  } else {
    return "normal";
  }
}

function showPetSpeech(text) {
  const bubble = document.getElementById("petBubble");
  if (!bubble) return;

  bubble.textContent = text;
  bubble.style.display = "block";
  bubble.style.opacity = "1";

  clearTimeout(petSpeechTimer);
  petSpeechTimer = setTimeout(() => {
    bubble.style.transition = "opacity 0.5s ease";
    bubble.style.opacity = "0";
    setTimeout(() => {
      bubble.style.display = "none";
      bubble.style.transition = "";
    }, 500);
  }, 4500);
}

let isAnimatingClick = false;

function renderPet() {
  const petBg = document.getElementById("petBg");
  const petSprite = document.getElementById("petSprite");
  const petMoodVal = document.getElementById("petMoodVal");
  const petAgeVal = document.getElementById("petAgeVal");

  if (!petBg || !petSprite) return;

  // Render Background layer
  petBg.className = `pet-bg-layer ${petBgMode}`;
  if (petBgMode === "animated") {
    petBg.style.backgroundImage = "url('/icons/pet_bg_animated.png')";
  } else {
    petBg.style.backgroundImage = "url('/icons/pet_bg_simple.png')";
  }

  // Calculate mood based on player lifeStats
  const mood = getPetMood();

  // Set pet sprite css class to match animation speed/style
  petSprite.className = `pet-sprite ${mood}`;

  // Ensure virtual_pet_sprite.png is always correctly refreshed
  if (!petSprite.classList.contains("clicked")) {
    petSprite.style.backgroundImage = `url('/icons/virtual_pet_sprite.png?t=${Date.now()}')`;
  }

  // Set mood text
  const currentLang = typeof lang === "string" ? lang : "en";
  const localizedMoods = MOOD_LABELS[currentLang] || MOOD_LABELS.en;
  if (petMoodVal) {
    petMoodVal.textContent = localizedMoods[mood] || mood;
  }

  // Calculate age based on tracking days
  const uniqueDates = new Set(entries.map(e => e.date));
  const ageDays = Math.max(1, uniqueDates.size);
  if (petAgeVal) {
    if (currentLang === "es") {
      petAgeVal.textContent = ageDays === 1 ? "1 día" : `${ageDays} días`;
    } else {
      petAgeVal.textContent = ageDays === 1 ? "1 day" : `${ageDays} days`;
    }
  }

  // Set pet default greeting on load
  const messages = (PET_MESSAGES[currentLang] || PET_MESSAGES.en)[mood];
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  showPetSpeech(randomMsg);
}

// Function to handle clicking the pet and spawning particles
function handlePetClick(e) {
  if (e) {
    // Only call preventDefault on touchstart to prevent synthetic click lag/double triggers
    if (e.type === "touchstart") {
      e.preventDefault();
    }
  }

  if (isAnimatingClick) return;
  isAnimatingClick = true;

  const container = document.getElementById("petCharacterContainer");
  const petSprite = document.getElementById("petSprite");
  if (!container || !petSprite) {
    isAnimatingClick = false;
    return;
  }

  // Trigger the click animation state with virtual_pet_idle_click.png
  petSprite.classList.add("clicked");
  petSprite.style.backgroundImage = `url('/icons/virtual_pet_idle_click.png?t=${Date.now()}')`;

  // Create floating emoji particle
  const emojis = ["❤️", "✨", "🫧", "⭐", "🥰"];
  const randEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  const particle = document.createElement("div");
  particle.className = "pet-effect-bubble";
  particle.textContent = randEmoji;

  // Randomize placement slightly
  const offsetLeft = Math.floor(Math.random() * 40) - 20; // -20px to 20px
  particle.style.left = `calc(50% + ${offsetLeft}px)`;

  container.appendChild(particle);

  // Remove particle after animation ends
  setTimeout(() => {
    particle.remove();
  }, 1000);

  // Show a supportive speech bubble
  const mood = getPetMood();
  const currentLang = typeof lang === "string" ? lang : "en";
  const messages = (PET_MESSAGES[currentLang] || PET_MESSAGES.en)[mood];
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  showPetSpeech(randomMsg);

  // After 600ms, restore the normal state and refresh normal sprite
  setTimeout(() => {
    petSprite.classList.remove("clicked");
    petSprite.style.backgroundImage = `url('/icons/virtual_pet_sprite.png?t=${Date.now()}')`;
    isAnimatingClick = false;
  }, 600);
}

// Bind background switcher and interactive pet clicking
document.addEventListener("DOMContentLoaded", () => {
  const petChar = document.getElementById("petCharacterContainer");
  if (petChar) {
    petChar.addEventListener("click", handlePetClick);
    petChar.addEventListener("touchstart", handlePetClick, { passive: false });
  }

  // Initialize pet on load
  if (typeof renderPet === "function") {
    renderPet();
  }
});

// Fallback direct bindings in case DOMContentLoaded has already fired
setTimeout(() => {
  const petChar = document.getElementById("petCharacterContainer");
  if (petChar) {
    petChar.onclick = handlePetClick;
    petChar.ontouchstart = handlePetClick;
  }

  // Fallback initialize
  if (typeof renderPet === "function") {
    renderPet();
  }
}, 500);
