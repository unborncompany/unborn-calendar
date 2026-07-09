/* ============ Game of Life — Daily Planner ============
   Simple local task/calendar organizer.
   Data is stored in localStorage — everything stays on this machine.
   Cloud sync via Firebase (optional) — sign in to sync across devices.
   =================================================== */

const STORAGE_KEY = "ledger.entries.v1";
const USER_PROFILE_KEY = "ledger.userProfile.v1";
const LANG_KEY = "ledger.lang.v1";
const THEME_KEY = "ledger.theme.v1";
const CAL_VIEW_KEY = "ledger.calView.v1";
const ADMIN_USER_KEY = "ledger.adminUser.v1";
const ADMIN_PASS_KEY = "ledger.adminPass.v1";
const STORE_SPENT_KEY = "ledger.storeSpent.v1";
const REDEEMED_KEY = "ledger.redeemed.v1";
const EDIT_PENALTY_KEY = "ledger.editPenalties.v1";
const DELETE_PENALTY_KEY = "ledger.deletePenalties.v1";
const PET_STATS_KEY = "ledger.petStats.v1";

/* ---------- Translations ---------- */
const I18N = {
  en: {
    // Tabs
    tab_dashboard: "Dashboard",
    tab_calendar: "Calendar",
    tab_inventory: "Inventory",
    tab_scoreboard: "Scoreboard",
    tab_settings: "Settings",
    // Header
    btn_newEntry: "+ New entry",
    btn_quickSave: "\u{1F4BE} Quick save",
    // Dashboard
    dash_nothingToday: "Nothing today.",
    dash_nothingTomorrow: "Nothing tomorrow.",
    dash_tasksToday: (n) => `${n} task${n !== 1 ? "s" : ""} today`,
    dash_tasksTomorrow: (n) => `${n} task${n !== 1 ? "s" : ""} tomorrow`,
    dash_thingsTodo: "You have some things to do today\u2026",
    dash_allClear: "All clear \u2014 nothing scheduled.",
    dash_ptsAvailable: (n) => `${n} point${n !== 1 ? "s" : ""} available today & tomorrow`,
    dash_ptsEarned: (n) => `Total points: ${n}`,
    dash_ptsToday: (n) => `${n} point${n !== 1 ? "s" : ""} available`,
    dash_ptsTomorrow: (n) => `${n} point${n !== 1 ? "s" : ""} available`,
    dash_secondary: "Secondary Tasks",
    dash_secNoTasks: "No tasks yet.",
    dash_secAdd: "+ Add",
    dash_secToday: "Today",
    dash_secTomorrow: "Tomorrow",
    dash_secPlaceholder: "e.g. Water plants",
    dash_secSave: "Save",
    dash_secCancel: "Cancel",
    dash_secAdded: "Task added.",
    dash_secDeleted: "Task deleted (-1 pt).",
    // Greetings
    greet_morning: "Good morning",
    greet_afternoon: "Good afternoon",
    greet_evening: "Good evening",
    greet_night: "Good night",
    // Calendar
    cal_today: "Today",
    cal_weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    cal_months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    // Inventory
    inv_title: "Inventory",
    inv_noItems: "No items tracked yet.",
    inv_addItem: "+ Add item",
    inv_all: "All",
    inv_colItem: "Item",
    inv_colPrice: "Price",
    inv_colQty: "Qty",
    inv_colCat: "Category",
    inv_categories: ["Electronics", "Food & Drinks", "Clothing", "Office Supplies", "Tools", "Furniture", "Other"],
    // Entry modal
    entry_newTitle: "New entry",
    entry_editTitle: "Edit entry",
    entry_nameLabel: "Name",
    entry_namePlaceholder: "e.g. Submit report",
    entry_descLabel: "Description",
    entry_descOptional: "(optional)",
    entry_descPlaceholder: "Any extra detail...",
    entry_dateLabel: "Date",
    entry_timeLabel: "Time",
    entry_todosLabel: "To-do items",
    entry_todoPlaceholder: "To-do item...",
    entry_addTodo: "+ Add item",
    entry_alarmsLabel: "Alarms",
    entry_addAlarm: "+ Add alarm",
    entry_cancel: "Cancel",
    entry_save: "Save entry",
    // Inventory modal
    invModal_add: "Add item",
    invModal_edit: "Edit item",
    invModal_itemName: "Item name",
    invModal_itemPlaceholder: "e.g. Screws box",
    invModal_desc: "Description",
    invModal_descOptional: "(optional)",
    invModal_price: "Price ($)",
    invModal_qty: "Quantity",
    invModal_cat: "Category",
    invModal_acc: "Accessories",
    invModal_addAcc: "+ Add accessory",
    invModal_delete: "Delete",
    invModal_cancel: "Cancel",
    invModal_save: "Save item",
    // Detail modal
    detail_active: "Active",
    detail_completed: "Completed",
    detail_pastDue: "Past due",
    detail_delete: "Delete",
    detail_edit: "Edit",
    detail_close: "Close",
    // Scoreboard
    score_title: "Scoreboard",
    score_summary: "Points are earned by completing tasks.",
    score_total: "Total Points",
    score_beforeDeadline: "before deadline",
    score_afterDeadline: "after deadline",
    score_late1wk: "1+ week late",
    score_secBefore: "sec: before day end",
    score_secAfter: "sec: after day end",
    score_secMissed: "sec: missed",
    score_secDeleted: "sec: deleted",
    score_penaltyEdit: "penalty: edit (-1)",
    score_penaltyDelete: "penalty: delete (-2)",
    score_legendBefore: "Completed before deadline: +5",
    score_legendAfter: "Completed after deadline: +2",
    score_legendLate: "Deadline passed 1+ week: -4",
    score_noScoresHint: "Complete tasks to earn points.",
    score_summaryText: (tasks, sec, del, pts) =>
      (tasks === 0 && sec === 0 && del === 0)
        ? "Complete tasks to earn points."
        : `${tasks} task${tasks !== 1 ? "s" : ""} + ${sec} sec + ${del} deleted \u00b7 ${pts} pts`,
    alarm_5min: "5 min before",
    alarm_15min: "15 min before",
    alarm_30min: "30 min before",
    alarm_1hour: "1 hour before",
    alarm_2hours: "2 hours before",
    alarm_1day: "1 day before",
    alarm_custom: "Custom time",
    alarm_fallback: (n) => `${n} min before`,
    alarm_at: "At",
    // Settings
    settings_title: "Settings",
    settings_subtitle: "Configure notifications and preferences.",
    settings_profile: "User Profile",
    settings_profileHint: "Your personal info used for greetings in the dashboard.",
    settings_name: "Name",
    settings_namePlaceholder: "e.g. Martin",
    settings_nickname: "Nickname",
    settings_nicknamePlaceholder: "e.g. Marty",
    settings_phone: "Phone Number",
    settings_phonePlaceholder: "e.g. 555-1234",
    settings_saveProfile: "Save",
    settings_profileSaved: "Profile saved.",
    settings_notifSound: "Notification Sound",
    settings_notifHint: "Upload an audio file to use as the alarm notification sound. Leave empty for the browser default.",
    settings_chooseFile: "Choose file",
    settings_noFile: "No file chosen",
    settings_test: "Test",
    settings_remove: "Remove",
    settings_saveData: "Save Data",
    settings_saveHint: "Export all app data to a file, or import from a previous backup.",
    settings_export: "Export save file",
    settings_import: "Import save file",
    settings_chooseFolder: "Choose save folder",
    settings_noFolder: "No folder chosen",
    settings_language: "Language",
    settings_langHint: "Choose the display language for the interface.",
    settings_quickSaveTitle: "Quick save to chosen folder",
    settings_theme: "Theme",
    settings_themeHint: "Choose between light and dark appearance.",
    settings_themeLight: "Light",
    settings_themeDark: "Dark",
    settings_calView: "Calendar View",
    settings_calViewHint: "Choose how the calendar is displayed.",
    settings_calViewGrid: "Grid",
    settings_calViewList: "Vertical List",
    settings_reset: "Reset All Data",
    settings_resetHint: "Permanently delete all entries, inventory, tasks, and settings. This cannot be undone.",
    settings_resetBtn: "Reset everything",
    settings_resetConfirm: "Delete ALL data? This cannot be undone.",
    settings_supply: "Supply Store",
    settings_cloud: "Cloud Sync",
    settings_cloudHint: "Sign in with Google to sync your data across devices. When not signed in, all data stays local.",
    pet_statsTitle: "Pet Stats",
    pet_statsHint: "Use items to keep your pet healthy",
    pet_use: "Use",
    pet_cooldown: "Cooldown",
    pet_consumable: "Consumable",
    settings_supplyHint: "Manage inventory items available in the store. Requires admin access.",
    settings_supplyBtn: "Open inventory",
    // Store
    store_title: "Store",
    store_summary: "Redeem your points for items.",
    store_availPts: "Available points",
    store_spentTotal: "Total spent:",
    store_ptsUsed: "pts used",
    store_empty: "No items available.",
    store_addFirst: "Add items in the Supply Store first.",
    store_qtyLeft: (n) => `${n} left`,
    store_redeem: "Redeem",
    store_redeemTitle: "Redeem Item",
    store_redeemConfirm: "Confirm",
    store_redeemMsg: (name, pts) => `Redeem "${name}" for ${pts} points?`,
    store_redeemed: "Item redeemed!",
    store_notEnough: "Not enough points.",
    store_outOfStock: "Out of stock.",
    // Life
    life_title: "Life",
    life_summary: "Your acquired items from the store.",
    life_totalLabel: "Total items redeemed",
    life_empty: "No items redeemed yet.",
    life_acquired: "Acquired",
    life_date: (d) => `Redeemed ${d}`,
    // Admin
    admin_title: "Admin Access",
    admin_user: "Username",
    admin_pass: "Password",
    admin_error: "Invalid credentials.",
    admin_cancel: "Cancel",
    admin_login: "Login",
    admin_userPlaceholder: "admin",
    admin_passPlaceholder: "\u2022\u2022\u2022\u2022\u2022\u2022",
    // Inventory image
    invLabelImage: "Image",
    invImageChoose: "Choose image",
    invImageNoFile: "No image",
    invImageRemove: "Remove",
    // Toasts
    toast_saved: "Saved.",
    toast_exported: "Save file exported.",
    toast_imported: "Save file imported.",
    toast_folderChosen: "Save folder set.",
    toast_quickSaved: "Quick saved.",
    toast_quickSaveFail: "Quick save failed \u2014 check permissions.",
    toast_noFolder: "Choose a save folder first in Settings.",
    toast_noSound: "No custom sound set.",
    toast_deleted: "Entry deleted.",
    toast_invDeleted: "Item deleted.",
    toast_soundSaved: "Notification sound saved.",
    toast_soundRemoved: "Sound removed.",
    toast_invalidFile: "Invalid save file.",
    toast_folderNotSupported: "Folder picker not supported in this browser.",
    toast_entryUpdated: "Entry updated.",
    toast_entryAdded: "Entry added.",
    toast_itemUpdated: "Item updated.",
    toast_itemAdded: "Item added.",
    toast_addTodo: "Add at least one to-do item.",
    toast_cantSave: "Couldn\u2019t save \u2014 storage may be full.",
    toast_cantSaveSound: "Couldn\u2019t save sound \u2014 storage may be full.",
    toast_reminder: "Reminder:",
    notif_title: "Game of Life Reminder",
    confirm_deleteEntry: "Delete this entry? This can\u2019t be undone.",
    confirm_deleteItem: "Delete this item? This can\u2019t be undone.",
    dash_done: "done",
    dash_pending: "pending",
    dash_free: "Free",
    dash_clear: "Clear",
    dash_empty: "Empty",
    dash_more: "more",
    cal_addEntry: "Add entry",
    inv_summary: (n, q) => `${n} item${n !== 1 ? "s" : ""} \u00b7 ${q} total units`,
    inv_visibleTotal: "Visible total:",
    inv_allCategories: "All categories:",
    inv_accShown: "Accessories shown:",
    inv_noCategory: "No items in this category.",
    inv_addFirst: "Add your first inventory item.",
    inv_accessories: "Accessories",
    inv_edit: "Edit",
    inv_accPlaceholder: "Accessory...",
    inv_accPricePlaceholder: "$",
    inv_remove: "Remove",
    score_noScores: "No scores yet",
  },
  es: {
    tab_dashboard: "Panel",
    tab_calendar: "Calendario",
    tab_inventory: "Inventario",
    tab_scoreboard: "Marcador",
    tab_settings: "Ajustes",
    btn_newEntry: "+ Nueva entrada",
    btn_quickSave: "\u{1F4BE} Guardar r\u00e1pido",
    dash_nothingToday: "Nada hoy.",
    dash_nothingTomorrow: "Nada ma\u00f1ana.",
    dash_tasksToday: (n) => `${n} tarea${n !== 1 ? "s" : ""} hoy`,
    dash_tasksTomorrow: (n) => `${n} tarea${n !== 1 ? "s" : ""} ma\u00f1ana`,
    dash_thingsTodo: "Tienes cosas que hacer hoy\u2026",
    dash_allClear: "Todo libre \u2014 nada programado.",
    dash_ptsAvailable: (n) => `${n} punto${n !== 1 ? "s" : ""} disponible${n !== 1 ? "s" : ""} hoy y ma\u00f1ana`,
    dash_ptsEarned: (n) => `Puntos totales: ${n}`,
    dash_ptsToday: (n) => `${n} punto${n !== 1 ? "s" : ""} disponible${n !== 1 ? "s" : ""}`,
    dash_ptsTomorrow: (n) => `${n} punto${n !== 1 ? "s" : ""} disponible${n !== 1 ? "s" : ""}`,
    dash_secondary: "Tareas Secundarias",
    dash_secNoTasks: "Sin tareas a\u00fan.",
    dash_secAdd: "+ Agregar",
    dash_secToday: "Hoy",
    dash_secTomorrow: "Ma\u00f1ana",
    dash_secPlaceholder: "ej. Regar plantas",
    dash_secSave: "Guardar",
    dash_secCancel: "Cancelar",
    dash_secAdded: "Tarea agregada.",
    dash_secDeleted: "Tarea eliminada (-1 pt).",
    greet_morning: "Buenos d\u00edas",
    greet_afternoon: "Buenas tardes",
    greet_evening: "Buenas noches",
    greet_night: "Buenas noches",
    cal_today: "Hoy",
    cal_weekdays: ["Dom", "Lun", "Mar", "Mi\u00e9", "Jue", "Vie", "S\u00e1b"],
    cal_months: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    inv_title: "Inventario",
    inv_noItems: "Sin art\u00edculos registrados.",
    inv_addItem: "+ Agregar art\u00edculo",
    inv_all: "Todos",
    inv_colItem: "Art\u00edculo",
    inv_colPrice: "Precio",
    inv_colQty: "Cant",
    inv_colCat: "Categor\u00eda",
    inv_categories: ["Electr\u00f3nica", "Comida y Bebidas", "Ropa", "Suministros", "Herramientas", "Muebles", "Otro"],
    entry_newTitle: "Nueva entrada",
    entry_editTitle: "Editar entrada",
    entry_nameLabel: "Nombre",
    entry_namePlaceholder: "ej. Entregar reporte",
    entry_descLabel: "Descripci\u00f3n",
    entry_descOptional: "(opcional)",
    entry_descPlaceholder: "Alg\u00fan detalle extra...",
    entry_dateLabel: "Fecha",
    entry_timeLabel: "Hora",
    entry_todosLabel: "Tareas pendientes",
    entry_todoPlaceholder: "Tarea...",
    entry_addTodo: "+ Agregar tarea",
    entry_alarmsLabel: "Alarmas",
    entry_addAlarm: "+ Agregar alarma",
    entry_cancel: "Cancelar",
    entry_save: "Guardar entrada",
    invModal_add: "Agregar art\u00edculo",
    invModal_edit: "Editar art\u00edculo",
    invModal_itemName: "Nombre del art\u00edculo",
    invModal_itemPlaceholder: "ej. Caja de tornillos",
    invModal_desc: "Descripci\u00f3n",
    invModal_descOptional: "(opcional)",
    invModal_price: "Precio ($)",
    invModal_qty: "Cantidad",
    invModal_cat: "Categor\u00eda",
    invModal_acc: "Accesorios",
    invModal_addAcc: "+ Agregar accesorio",
    invModal_delete: "Eliminar",
    invModal_cancel: "Cancelar",
    invModal_save: "Guardar art\u00edculo",
    detail_active: "Activo",
    detail_completed: "Completado",
    detail_pastDue: "Vencido",
    detail_delete: "Eliminar",
    detail_edit: "Editar",
    detail_close: "Cerrar",
    score_title: "Marcador",
    score_summary: "Los puntos se ganan completando tareas.",
    score_total: "Puntos Totales",
    score_beforeDeadline: "antes de la fecha",
    score_afterDeadline: "despu\u00e9s de la fecha",
    score_late1wk: "1+ semana tarde",
    score_secBefore: "sec: antes del d\u00eda",
    score_secAfter: "sec: despu\u00e9s del d\u00eda",
    score_secMissed: "sec: perdida",
    score_secDeleted: "sec: eliminada",
    score_penaltyEdit: "penalización: editar (-1)",
    score_penaltyDelete: "penalización: eliminar (-2)",
    score_legendBefore: "Completado antes de fecha l\u00edmite: +5",
    score_legendAfter: "Completado despu\u00e9s de fecha l\u00edmite: +2",
    score_legendLate: "Fecha l\u00edmite pasada 1+ semana: -4",
    score_noScoresHint: "Completa tareas para ganar puntos.",
    score_summaryText: (tasks, sec, del, pts) =>
      (tasks === 0 && sec === 0 && del === 0)
        ? "Completa tareas para ganar puntos."
        : `${tasks} tarea${tasks !== 1 ? "s" : ""} + ${sec} sec + ${del} eliminadas \u00b7 ${pts} pts`,
    alarm_5min: "5 min antes",
    alarm_15min: "15 min antes",
    alarm_30min: "30 min antes",
    alarm_1hour: "1 hora antes",
    alarm_2hours: "2 horas antes",
    alarm_1day: "1 d\u00eda antes",
    alarm_custom: "Hora personalizada",
    alarm_fallback: (n) => `${n} min antes`,
    alarm_at: "A las",
    settings_title: "Ajustes",
    settings_subtitle: "Configura notificaciones y preferencias.",
    settings_profile: "Perfil de Usuario",
    settings_profileHint: "Tu informaci\u00f3n personal para saludos en el panel.",
    settings_name: "Nombre",
    settings_namePlaceholder: "ej. Mart\u00edn",
    settings_nickname: "Apodo",
    settings_nicknamePlaceholder: "ej. Marti",
    settings_phone: "N\u00famero de Tel\u00e9fono",
    settings_phonePlaceholder: "ej. 555-1234",
    settings_saveProfile: "Guardar",
    settings_profileSaved: "Perfil guardado.",
    settings_notifSound: "Sonido de Notificaci\u00f3n",
    settings_notifHint: "Sube un archivo de audio como sonido de alarma. Vac\u00edo para el predeterminado.",
    settings_chooseFile: "Elegir archivo",
    settings_noFile: "Sin archivo",
    settings_test: "Probar",
    settings_remove: "Eliminar",
    settings_saveData: "Guardar Datos",
    settings_saveHint: "Exporta todos los datos a un archivo o importa desde un respaldo.",
    settings_export: "Exportar archivo",
    settings_import: "Importar archivo",
    settings_chooseFolder: "Elegir carpeta",
    settings_noFolder: "Sin carpeta",
    settings_language: "Idioma",
    settings_langHint: "Elige el idioma de la interfaz.",
    settings_quickSaveTitle: "Guardado r\u00e1pido en la carpeta elegida",
    settings_theme: "Tema",
    settings_themeHint: "Elige entre apariencia clara y oscura.",
    settings_themeLight: "Claro",
    settings_themeDark: "Oscuro",
    settings_calView: "Vista del Calendario",
    settings_calViewHint: "Elige c\u00f3mo se muestra el calendario.",
    settings_calViewGrid: "Cuadr\u00edcula",
    settings_calViewList: "Lista Vertical",
    settings_reset: "Borrar Todos los Datos",
    settings_resetHint: "Eliminar permanentemente todas las entradas, inventario, tareas y ajustes. No se puede deshacer.",
    settings_resetBtn: "Borrar todo",
    settings_resetConfirm: "\u00bfBorrar TODOS los datos? No se puede deshacer.",
    settings_supply: "Tienda de Suministros",
    settings_cloud: "Sincronización en la Nube",
    settings_cloudHint: "Inicia sesión con Google para sincronizar tus datos entre dispositivos. Si no inicias sesión, los datos permanecen locales.",
    pet_statsTitle: "Estadísticas de Mascota",
    pet_statsHint: "Usa artículos para mantener a tu mascota sana",
    pet_use: "Usar",
    pet_cooldown: "Enfriamiento",
    pet_consumable: "Consumible",
    settings_supplyHint: "Gestiona los art\u00edculos disponibles en la tienda. Requiere acceso de administrador.",
    settings_supplyBtn: "Abrir inventario",
    store_title: "Tienda",
    store_summary: "Canjea tus puntos por art\u00edculos.",
    store_availPts: "Puntos disponibles",
    store_spentTotal: "Total gastado:",
    store_ptsUsed: "pts usados",
    store_empty: "Sin art\u00edculos disponibles.",
    store_addFirst: "Agrega art\u00edculos en la Tienda de Suministros primero.",
    store_qtyLeft: (n) => `${n} restantes`,
    store_redeem: "Canjear",
    store_redeemTitle: "Canjear Art\u00edculo",
    store_redeemConfirm: "Confirmar",
    store_redeemMsg: (name, pts) => `\u00bfCanjear "${name}" por ${pts} puntos?`,
    store_redeemed: "\u00a1Art\u00edculo canjeado!",
    store_notEnough: "Puntos insuficientes.",
    store_outOfStock: "Sin stock.",
    life_title: "Vida",
    life_summary: "Tus art\u00edculos adquiridos de la tienda.",
    life_totalLabel: "Total de art\u00edculos canjeados",
    life_empty: "Sin art\u00edculos canjeados a\u00fan.",
    life_acquired: "Adquirido",
    life_date: (d) => `Canjeado ${d}`,
    admin_title: "Acceso de Administrador",
    admin_user: "Usuario",
    admin_pass: "Contrase\u00f1a",
    admin_error: "Credenciales inv\u00e1lidas.",
    admin_cancel: "Cancelar",
    admin_login: "Ingresar",
    admin_userPlaceholder: "admin",
    admin_passPlaceholder: "\u2022\u2022\u2022\u2022\u2022\u2022",
    invLabelImage: "Imagen",
    invImageChoose: "Elegir imagen",
    invImageNoFile: "Sin imagen",
    invImageRemove: "Eliminar",
    toast_saved: "Guardado.",
    toast_exported: "Archivo exportado.",
    toast_imported: "Archivo importado.",
    toast_folderChosen: "Carpeta configurada.",
    toast_quickSaved: "Guardado r\u00e1pido.",
    toast_quickSaveFail: "Error al guardar \u2014 revisa permisos.",
    toast_noFolder: "Elige una carpeta en Ajustes primero.",
    toast_noSound: "Sin sonido personalizado.",
    toast_deleted: "Entrada eliminada.",
    toast_invDeleted: "Art\u00edculo eliminado.",
    toast_soundSaved: "Sonido guardado.",
    toast_soundRemoved: "Sonido eliminado.",
    toast_invalidFile: "Archivo de guardado inv\u00e1lido.",
    toast_folderNotSupported: "Selector de carpeta no soportado.",
    toast_entryUpdated: "Entrada actualizada.",
    toast_entryAdded: "Entrada agregada.",
    toast_itemUpdated: "Art\u00edculo actualizado.",
    toast_itemAdded: "Art\u00edculo agregado.",
    toast_addTodo: "Agrega al menos una tarea.",
    toast_cantSave: "No se pudo guardar \u2014 almacenamiento lleno.",
    toast_cantSaveSound: "No se pudo guardar sonido \u2014 almacenamiento lleno.",
    toast_reminder: "Recordatorio:",
    notif_title: "Recordatorio de Game of Life",
    confirm_deleteEntry: "\u00bfEliminar esta entrada? No se puede deshacer.",
    confirm_deleteItem: "\u00bfEliminar este art\u00edculo? No se puede deshacer.",
    dash_done: "hecho",
    dash_pending: "pendiente",
    dash_free: "Libre",
    dash_clear: "Listo",
    dash_empty: "Vac\u00edo",
    dash_more: "m\u00e1s",
    cal_addEntry: "Agregar entrada",
    inv_summary: (n, q) => `${n} art\u00edculo${n !== 1 ? "s" : ""} \u00b7 ${q} unidades totales`,
    inv_visibleTotal: "Total visible:",
    inv_allCategories: "Todas las categor\u00edas:",
    inv_accShown: "Accesorios mostrados:",
    inv_noCategory: "Sin art\u00edculos en esta categor\u00eda.",
    inv_addFirst: "Agrega tu primer art\u00edculo.",
    inv_accessories: "Accesorios",
    inv_edit: "Editar",
    inv_accPlaceholder: "Accesorio...",
    inv_accPricePlaceholder: "$",
    inv_remove: "Eliminar",
    score_noScores: "Sin puntos a\u00fan",
  },
};

/* ---------- State ---------- */
let entries = loadEntries();
let currentCalDate = new Date();
currentCalDate.setDate(1);
let editingTodoRows = [];
let firedAlarms = {};  // { entryId_alarmIdx: true }
let userProfile = loadUserProfile();
let lang = localStorage.getItem(LANG_KEY) || "en";
let theme = localStorage.getItem(THEME_KEY) || "light";
let calView = localStorage.getItem(CAL_VIEW_KEY) || "grid";
let storeSpent = parseInt(localStorage.getItem(STORE_SPENT_KEY) || "0", 10);
let adminUser = localStorage.getItem(ADMIN_USER_KEY) || "admin";
let adminPass = localStorage.getItem(ADMIN_PASS_KEY) || "admin123";
let currentRedeemItem = null;
let activeStoreFilter = "all";
let activeLifeFilter = "all";

function loadEditPenalties() {
  try {
    const raw = localStorage.getItem(EDIT_PENALTY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveEditPenalties() {
  try { localStorage.setItem(EDIT_PENALTY_KEY, JSON.stringify(editPenalties)); } catch (e) {}
  scheduleCloudSave();
}
let editPenalties = loadEditPenalties();

function loadDeletePenalties() {
  try {
    const raw = localStorage.getItem(DELETE_PENALTY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveDeletePenalties() {
  try { localStorage.setItem(DELETE_PENALTY_KEY, JSON.stringify(deletePenalties)); } catch (e) {}
  scheduleCloudSave();
}
let deletePenalties = loadDeletePenalties();

/* ---------- Pet Stats ---------- */
const DEFAULT_PET_STATS = {
  energy: 80,
  hunger: 70,
  thirst: 70,
  health: 100,
  lastDecay: Date.now(),
  lowSince: null, // timestamp when hunger+thirst both went <10
  lastUsed: {},    // { redeemedId: { count, firstUse } } for non-consumable cooldown
};

function loadPetStats() {
  try {
    const raw = localStorage.getItem(PET_STATS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Merge with defaults in case new fields were added
      return { ...DEFAULT_PET_STATS, ...saved, lastUsed: saved.lastUsed || {} };
    }
  } catch (e) {}
  return { ...DEFAULT_PET_STATS };
}
function savePetStats() {
  try { localStorage.setItem(PET_STATS_KEY, JSON.stringify(petStats)); } catch (e) {}
  scheduleCloudSave();
}
let petStats = loadPetStats();

/* ---------- Pet Stats Decay ---------- */
// Decay rates: points lost per hour
const DECAY_RATES = {
  energy: 1.5,   // ~36/day
  hunger: 1.2,   // ~28.8/day
  thirst: 1.8,   // ~43.2/day
};
const HEALTH_DECAY_THRESHOLD = 10;  // health decays when hunger AND thirst < this %
const HEALTH_DECAY_DAYS = 3;        // must be low for this many days
const HEALTH_DECAY_RATE = 0.8;      // health points lost per day when conditions met
const STAT_MIN = 0;
const STAT_MAX = 100;

function clampStat(v) { return Math.max(STAT_MIN, Math.min(STAT_MAX, v)); }

function processPetDecay() {
  const now = Date.now();
  const elapsed = now - petStats.lastDecay;
  if (elapsed <= 0) return;

  const hoursElapsed = elapsed / (1000 * 60 * 60);

  // Continuous decay for energy, hunger, thirst
  petStats.energy = clampStat(petStats.energy - DECAY_RATES.energy * hoursElapsed);
  petStats.hunger = clampStat(petStats.hunger - DECAY_RATES.hunger * hoursElapsed);
  petStats.thirst = clampStat(petStats.thirst - DECAY_RATES.thirst * hoursElapsed);

  // Health decay: only when hunger AND thirst both < threshold for 3+ days
  if (petStats.hunger < HEALTH_DECAY_THRESHOLD && petStats.thirst < HEALTH_DECAY_THRESHOLD) {
    if (!petStats.lowSince) {
      petStats.lowSince = now;
    } else {
      const daysLow = (now - petStats.lowSince) / (1000 * 60 * 60 * 24);
      if (daysLow >= HEALTH_DECAY_DAYS) {
        const healthDecay = HEALTH_DECAY_RATE * (hoursElapsed / 24);
        petStats.health = clampStat(petStats.health - healthDecay);
      }
    }
  } else {
    // Reset low timer when either stat goes above threshold
    petStats.lowSince = null;
  }

  // Clean up expired cooldowns for non-consumable items (>24h old)
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  for (const rid in petStats.lastUsed) {
    if (now - petStats.lastUsed[rid].firstUse > COOLDOWN_MS) {
      delete petStats.lastUsed[rid];
    }
  }

  petStats.lastDecay = now;
  savePetStats();
}

// Process decay on load and every 60 seconds
processPetDecay();
setInterval(() => { processPetDecay(); renderPetStats(); }, 60000);

/* ---------- Firebase / Cloud Sync ---------- */
let firebaseReady = false;
let fb = null; // will hold Firebase modules once ready
let currentUser = null;
let isSyncing = false;
let unsubUserDoc = null; // Firestore real-time listener unsubscribe

function onFirebaseReady() {
  fb = window.__firebase;
  if (!fb) return;
  firebaseReady = true;

  fb.onAuthStateChanged(fb.auth, async (user) => {
    currentUser = user;
    updateAuthUI();
    if (user) {
      await loadFromCloud();
      subscribeToCloud();
    } else {
      unsubscribeCloud();
    }
  });
}

// Wait for Firebase SDK to load
window.addEventListener("firebase-ready", onFirebaseReady);
// Also check if it already loaded
if (window.__firebase) onFirebaseReady();

function updateAuthUI() {
  const signInBtn = document.getElementById("googleSignInBtn");
  const signOutBtn = document.getElementById("googleSignOutBtn");
  const authUser = document.getElementById("authUser");
  const authAvatar = document.getElementById("authAvatar");
  const authName = document.getElementById("authName");
  const syncStatus = document.getElementById("syncStatus");
  const cloudStatusDot = document.getElementById("cloudStatusDot");
  const cloudStatusText = document.getElementById("cloudStatusText");
  const settingsGoogleBtn = document.getElementById("settingsGoogleBtn");

  if (currentUser) {
    signInBtn.style.display = "none";
    authUser.style.display = "flex";
    authAvatar.src = currentUser.photoURL || "";
    authAvatar.style.display = currentUser.photoURL ? "" : "none";
    authName.textContent = currentUser.displayName || currentUser.email;
    syncStatus.style.display = "flex";
    syncStatus.classList.add("synced");
    cloudStatusDot.className = "cloud-status-dot online";
    cloudStatusText.textContent = "Signed in as " + (currentUser.displayName || currentUser.email);
    settingsGoogleBtn.textContent = "Sign out";
  } else {
    signInBtn.style.display = "";
    authUser.style.display = "none";
    syncStatus.style.display = "none";
    syncStatus.classList.remove("synced");
    cloudStatusDot.className = "cloud-status-dot offline";
    cloudStatusText.textContent = "Not signed in";
    settingsGoogleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Sign in with Google';
  }
}

async function signInWithGoogle() {
  if (!firebaseReady) { showToast("Cloud sync not available"); return; }
  try {
    await fb.signInWithPopup(fb.auth, fb.provider);
  } catch (err) {
    console.error("Google sign-in error:", err);
    if (err.code !== "auth/popup-closed-by-user") {
      showToast("Sign-in failed: " + err.message);
    }
  }
}

async function signOutGoogle() {
  if (!firebaseReady) return;
  try {
    await fb.signOut(fb.auth);
  } catch (err) {
    console.error("Sign-out error:", err);
  }
}

function getCloudData() {
  return {
    version: 1,
    entries: entries,
    inventory: inventory,
    secTasks: secTasks,
    deletedSecTasks: deletedSecTasks,
    userProfile: userProfile,
    lang: lang,
    theme: theme,
    calView: calView,
    storeSpent: storeSpent,
    redeemed: redeemed,
    editPenalties: editPenalties,
    deletePenalties: deletePenalties,
    petStats: petStats,
    firedAlarms: firedAlarms,
    notifSound: notifSoundData,
    adminUser: adminUser,
    adminPass: adminPass,
    updatedAt: new Date().toISOString(),
  };
}

async function saveToCloud() {
  if (!firebaseReady || !currentUser || isSyncing) return;
  try {
    isSyncing = true;
    showSyncStatus("saving");
    const data = getCloudData();
    const userDocRef = fb.doc(fb.db, "users", currentUser.uid);
    await fb.setDoc(userDocRef, data);
    showSyncStatus("synced");
  } catch (err) {
    console.error("Cloud save error:", err);
    showSyncStatus("error");
  } finally {
    isSyncing = false;
  }
}

async function loadFromCloud() {
  if (!firebaseReady || !currentUser) return;
  try {
    isSyncing = true;
    showSyncStatus("loading");
    const userDocRef = fb.doc(fb.db, "users", currentUser.uid);
    const snap = await fb.getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      // Apply cloud data to local state
      if (data.entries) entries = data.entries;
      if (data.inventory) inventory = data.inventory;
      if (data.secTasks) secTasks = data.secTasks;
      if (data.deletedSecTasks) deletedSecTasks = data.deletedSecTasks;
      if (data.userProfile) userProfile = data.userProfile;
      if (data.lang) { lang = data.lang; document.getElementById("langSelect").value = lang; }
      if (data.theme) { theme = data.theme; document.getElementById("themeSelect").value = theme; applyTheme(); }
      if (data.calView) { calView = data.calView; document.getElementById("calViewSelect").value = calView; }
      if (data.storeSpent !== undefined) storeSpent = data.storeSpent;
      if (data.redeemed) redeemed = data.redeemed;
      if (data.editPenalties) editPenalties = data.editPenalties;
      if (data.deletePenalties) deletePenalties = data.deletePenalties;
      if (data.petStats) { petStats = { ...DEFAULT_PET_STATS, ...data.petStats, lastUsed: (data.petStats.lastUsed || {}) }; }
      if (data.firedAlarms) firedAlarms = data.firedAlarms;
      if (data.notifSound) notifSoundData = data.notifSound;
      if (data.adminUser) adminUser = data.adminUser;
      if (data.adminPass) adminPass = data.adminPass;
      // Save everything to localStorage as cache
      saveEntries();
      saveInventory();
      saveSecTasks();
      saveDeletedSecTasks();
      saveUserProfile();
      saveRedeemed();
      saveEditPenalties();
      saveDeletePenalties();
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
      try { localStorage.setItem(CAL_VIEW_KEY, calView); } catch (e) {}
      try { localStorage.setItem(STORE_SPENT_KEY, storeSpent.toString()); } catch (e) {}
      try { localStorage.setItem("ledger.firedAlarms.v1", JSON.stringify(firedAlarms)); } catch (e) {}
      if (notifSoundData) {
        try { localStorage.setItem(NOTIF_SOUND_KEY, notifSoundData); } catch (e) {}
      }
      loadNotifSound();
      refreshAll();
      showSyncStatus("synced");
    } else {
      // First time — push local data to cloud
      await saveToCloud();
    }
  } catch (err) {
    console.error("Cloud load error:", err);
    showSyncStatus("error");
  } finally {
    isSyncing = false;
  }
}

function subscribeToCloud() {
  if (!firebaseReady || !currentUser) return;
  unsubscribeCloud();
  const userDocRef = fb.doc(fb.db, "users", currentUser.uid);
  unsubUserDoc = fb.onSnapshot(userDocRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    // Only apply if not currently syncing (avoid loops)
    if (isSyncing) return;
    isSyncing = true;
    if (data.entries) entries = data.entries;
    if (data.inventory) inventory = data.inventory;
    if (data.secTasks) secTasks = data.secTasks;
    if (data.deletedSecTasks) deletedSecTasks = data.deletedSecTasks;
    if (data.userProfile) userProfile = data.userProfile;
    if (data.lang) lang = data.lang;
    if (data.theme) { theme = data.theme; applyTheme(); }
    if (data.calView) calView = data.calView;
    if (data.storeSpent !== undefined) storeSpent = data.storeSpent;
    if (data.redeemed) redeemed = data.redeemed;
    if (data.editPenalties) editPenalties = data.editPenalties;
    if (data.deletePenalties) deletePenalties = data.deletePenalties;
    if (data.petStats) { petStats = { ...DEFAULT_PET_STATS, ...data.petStats, lastUsed: (data.petStats.lastUsed || {}) }; }
    if (data.firedAlarms) firedAlarms = data.firedAlarms;
    if (data.notifSound) notifSoundData = data.notifSound;
    // Update localStorage cache
    saveEntries();
    saveInventory();
    saveSecTasks();
    saveDeletedSecTasks();
    saveUserProfile();
    saveRedeemed();
    saveEditPenalties();
    saveDeletePenalties();
    refreshAll();
    isSyncing = false;
    showSyncStatus("synced");
  }, (err) => {
    console.error("Cloud listener error:", err);
    showSyncStatus("error");
  });
}

function unsubscribeCloud() {
  if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
}

function showSyncStatus(status) {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  const dot = el.querySelector(".sync-dot");
  const label = el.querySelector(".sync-label");
  el.style.display = "flex";
  el.className = "sync-status " + status;
  if (status === "synced") { label.textContent = "Synced"; }
  else if (status === "saving") { label.textContent = "Saving..."; }
  else if (status === "loading") { label.textContent = "Loading..."; }
  else if (status === "error") { label.textContent = "Sync error"; }
}

// Auth button handlers
document.getElementById("googleSignInBtn").addEventListener("click", signInWithGoogle);
document.getElementById("googleSignOutBtn").addEventListener("click", signOutGoogle);
document.getElementById("settingsGoogleBtn").addEventListener("click", () => {
  if (currentUser) { signOutGoogle(); } else { signInWithGoogle(); }
});

function loadRedeemed() {
  try {
    const raw = localStorage.getItem(REDEEMED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveRedeemed() {
  try { localStorage.setItem(REDEEMED_KEY, JSON.stringify(redeemed)); } catch (e) {}
  scheduleCloudSave();
}
let redeemed = loadRedeemed();

function t(key) {
  const val = I18N[lang] ? I18N[lang][key] : I18N.en[key];
  return typeof val === "function" ? val : val;
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", theme);
}

function applyCalView() {
  const grid = document.getElementById("calGrid");
  const list = document.getElementById("calList");
  const weekdays = document.querySelector(".cal-weekdays");
  if (calView === "list") {
    grid.style.display = "none";
    list.style.display = "flex";
    if (weekdays) weekdays.style.display = "none";
    renderCalList();
  } else {
    grid.style.display = "";
    list.style.display = "none";
    if (weekdays) weekdays.style.display = "";
    renderCalendar();
  }
}

/* ---------- Persistence ---------- */
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Could not read saved entries:", e);
    return [];
  }
}

/* ---------- Cloud sync helper (debounced) ---------- */
let _cloudSaveTimer = null;
function scheduleCloudSave() {
  if (!firebaseReady || !currentUser) return;
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(() => saveToCloud(), 600);
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Could not save entries:", e);
    showToast(t("toast_cantSave"));
  }
  scheduleCloudSave();
}

function loadUserProfile() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : { name: "", nickname: "", phone: "" };
  } catch (e) { return { name: "", nickname: "", phone: "" }; }
}

function saveUserProfile() {
  try { localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile)); } catch (e) {}
  scheduleCloudSave();
}

/* ---------- Helpers ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todoId() {
  return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) { return n.toString().padStart(2, "0"); }

function deadlineOf(entry) {
  if (entry.time) {
    return new Date(`${entry.date}T${entry.time}:00`);
  }
  return new Date(`${entry.date}T23:59:59`);
}

function getStatus(entry) {
  const allDone = entry.todos.length > 0 && entry.todos.every(t => t.done);
  if (allDone) return "completed";
  const now = new Date();
  return now > deadlineOf(entry) ? "pending" : "active";
}

function formatDatePretty(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTimePretty(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ampm}`;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ============ Tabs ============ */
// Tab click handlers registered in Scoreboard section below

/* ============ Dashboard — Secondary Tasks ============ */
const SEC_STORAGE_KEY = "ledger.secTasks.v1";
const SEC_DELETED_KEY = "ledger.secDeleted.v1";
let secTasks = loadSecTasks();
let deletedSecTasks = loadDeletedSecTasks();

function loadSecTasks() {
  try {
    const raw = localStorage.getItem(SEC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveSecTasks() {
  try { localStorage.setItem(SEC_STORAGE_KEY, JSON.stringify(secTasks)); } catch (e) {}
  scheduleCloudSave();
}

function loadDeletedSecTasks() {
  try {
    const raw = localStorage.getItem(SEC_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveDeletedSecTasks() {
  try { localStorage.setItem(SEC_DELETED_KEY, JSON.stringify(deletedSecTasks)); } catch (e) {}
  scheduleCloudSave();
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getSecTaskPoints(task) {
  if (task.done) {
    // Completed — check if before or after the target day's end
    const dayEnd = new Date(`${task.targetDate}T23:59:59`);
    const doneAt = new Date(task.doneAt || Date.now());
    if (doneAt <= dayEnd) return 3;
    return 1;
  }
  // Not completed — check if 3+ days past target
  const now = new Date();
  const targetEnd = new Date(`${task.targetDate}T23:59:59`);
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (now - targetEnd > threeDays) return -2;
  return 0;
}

function renderSecTasks() {
  const list = document.getElementById("secTaskList");
  list.innerHTML = "";

  const tomorrow = tomorrowISO();
  const today = todayISO();
  const tomorrowTasks = secTasks.filter(t => t.targetDate === tomorrow);
  const todayTasks = secTasks.filter(t => t.targetDate === today);

  const totalPoints = secTasks.reduce((s, t) => s + getSecTaskPoints(t), 0);
  const tomorrowDone = tomorrowTasks.filter(t => t.done).length;
  const todayDone = todayTasks.filter(t => t.done).length;
  document.getElementById("secSummary").textContent =
    (tomorrowTasks.length === 0 && todayTasks.length === 0)
      ? t("dash_secNoTasks")
      : `${tomorrowDone + todayDone}/${tomorrowTasks.length + todayTasks.length} ${t("dash_done")} \u00b7 ${totalPoints} pts`;

  // Section labels
  document.getElementById("secTodaySection").querySelector(".dash-sec-label").textContent = t("dash_secToday");
  document.querySelector(".dash-sec-tomorrow .dash-sec-label").textContent = t("dash_secTomorrow");
  document.getElementById("secAddBtn").textContent = t("dash_secAdd");
  document.getElementById("secSaveBtn").textContent = t("dash_secSave");
  document.getElementById("secCancelBtn").textContent = t("dash_secCancel");
  document.getElementById("secTaskInput").placeholder = t("dash_secPlaceholder");

  // Today's secondary tasks (read-only display)
  const todaySection = document.getElementById("secTodaySection");
  const todayList = document.getElementById("secTodayList");
  todayList.innerHTML = "";
  if (todayTasks.length > 0) {
    todaySection.style.display = "block";
    todayTasks.forEach(task => {
      const pts = getSecTaskPoints(task);
      const item = document.createElement("div");
      item.className = "sec-task-item" + (task.done ? " done" : "") + (pts < 0 ? " missed" : "");

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "sec-task-check";
      check.checked = task.done;
      check.addEventListener("change", () => {
        task.done = check.checked;
        task.doneAt = check.checked ? new Date().toISOString() : null;
        saveSecTasks();
        renderSecTasks();
        renderScoreboard();
      });

      const text = document.createElement("span");
      text.className = "sec-task-text";
      text.textContent = task.name;

      const status = document.createElement("span");
      status.className = "sec-task-status " + (pts > 0 ? "pos" : pts < 0 ? "neg" : "neutral");
      status.textContent = pts > 0 ? `+${pts}` : pts < 0 ? `${pts}` : t("dash_pending");

      item.appendChild(check);
      item.appendChild(text);
      item.appendChild(status);
      todayList.appendChild(item);
    });
  } else {
    todaySection.style.display = "none";
  }

  // Tomorrow's secondary tasks (with add/remove)
  if (tomorrowTasks.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:12px"><span>${t("dash_clear")}</span>${t("dash_secNoTasks")}</div>`;
    return;
  }

  tomorrowTasks.forEach(task => {
    const pts = getSecTaskPoints(task);
    const item = document.createElement("div");
    item.className = "sec-task-item" + (task.done ? " done" : "") + (pts < 0 ? " missed" : "");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "sec-task-check";
    check.checked = task.done;
    check.addEventListener("change", () => {
      task.done = check.checked;
      task.doneAt = check.checked ? new Date().toISOString() : null;
      saveSecTasks();
      renderSecTasks();
      renderScoreboard();
    });

    const text = document.createElement("span");
    text.className = "sec-task-text";
    text.textContent = task.name;

    const status = document.createElement("span");
    status.className = "sec-task-status " + (pts > 0 ? "pos" : pts < 0 ? "neg" : "neutral");
    status.textContent = pts > 0 ? `+${pts}` : pts < 0 ? `${pts}` : t("dash_pending");

    const remove = document.createElement("button");
    remove.className = "sec-task-remove";
    remove.textContent = "\u00d7";
    remove.addEventListener("click", () => {
      deletedSecTasks.push({
        id: task.id,
        name: task.name,
        targetDate: task.targetDate,
        deletedAt: new Date().toISOString(),
      });
      saveDeletedSecTasks();
      secTasks = secTasks.filter(t => t.id !== task.id);
      saveSecTasks();
      renderSecTasks();
      renderScoreboard();
      showToast(t("dash_secDeleted"));
    });

    item.appendChild(check);
    item.appendChild(text);
    item.appendChild(status);
    item.appendChild(remove);
    list.appendChild(item);
  });
}

// Add secondary task
document.getElementById("secAddBtn").addEventListener("click", () => {
  document.getElementById("secInputArea").style.display = "flex";
  document.getElementById("secTaskInput").value = "";
  document.getElementById("secTaskInput").focus();
});

document.getElementById("secCancelBtn").addEventListener("click", () => {
  document.getElementById("secInputArea").style.display = "none";
});

document.getElementById("secSaveBtn").addEventListener("click", () => {
  const name = document.getElementById("secTaskInput").value.trim();
  if (!name) return;
  const hour = new Date().getHours();
  const target = hour < 5 ? todayISO() : tomorrowISO();
  secTasks.push({
    id: uid(),
    name,
    targetDate: target,
    done: false,
    doneAt: null,
  });
  saveSecTasks();
  document.getElementById("secInputArea").style.display = "none";
  renderSecTasks();
  showToast(t("dash_secAdded"));
});

document.getElementById("secTaskInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("secSaveBtn").click();
  if (e.key === "Escape") document.getElementById("secCancelBtn").click();
});

/* ============ Dashboard — Main ============ */
function renderDayEntries(container, dayISO, emptyMsg) {
  container.innerHTML = "";

  const dayEntries = entries
    .filter(e => e.date === dayISO)
    .map(e => ({ ...e, _status: getStatus(e) }))
    .sort((a, b) => deadlineOf(a) - deadlineOf(b));

  if (dayEntries.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:16px"><span>${t("dash_free")}</span>${emptyMsg || t("dash_nothingToday")}</div>`;
    return;
  }

  dayEntries.forEach(entry => {
    const wrap = document.createElement("div");
    wrap.className = `dash-entry-wrap status-${entry._status}`;

    const header = document.createElement("div");
    header.className = "dash-entry-header";
    const doneCount = entry.todos.filter(t => t.done).length;
    const entryPts = entry._status === "completed" ? calcEntryPoints(entry) : calcMaxPoints(entry);
    header.innerHTML = `
      <span class="dash-entry-time">${entry.time ? formatTimePretty(entry.time) : "\u2014"}</span>
      <div class="dash-entry-info">
        <div class="dash-entry-name">${escapeHTML(entry.name)}</div>
        <div class="dash-entry-progress">${doneCount}/${entry.todos.length} ${t("dash_done")}</div>
      </div>
      <span class="dash-entry-pts ${entryPts >= 0 ? "pos" : "neg"}">${entryPts >= 0 ? "+" : ""}${entryPts}</span>
      <span class="dash-entry-chevron">&#9654;</span>
    `;
    header.addEventListener("click", () => {
      wrap.classList.toggle("expanded");
    });
    wrap.appendChild(header);

    // Todos section
    const todosDiv = document.createElement("div");
    todosDiv.className = "dash-entry-todos";
    entry.todos.forEach(todo => {
      const item = document.createElement("label");
      item.className = "dash-todo-item" + (todo.done ? " done" : "");
      item.innerHTML = `<input type="checkbox" class="dash-todo-check" ${todo.done ? "checked" : ""}> <span>${escapeHTML(todo.text)}</span>`;
      item.querySelector("input").addEventListener("change", (e) => {
        todo.done = e.target.checked;
        saveEntries();
        item.classList.toggle("done", todo.done);
        // Update progress display
        const newDone = entry.todos.filter(t => t.done).length;
        header.querySelector(".dash-entry-progress").textContent = `${newDone}/${entry.todos.length} ${t("dash_done")}`;
        // Update status if needed
        const newStatus = getStatus(entry);
        wrap.className = `dash-entry-wrap status-${newStatus}` + (wrap.classList.contains("expanded") ? " expanded" : "");
        renderScoreboard();
      });
      todosDiv.appendChild(item);
    });
    wrap.appendChild(todosDiv);

    container.appendChild(wrap);
  });
}

function renderDashboard() {
  const today = todayISO();
  const tomorrow = tomorrowISO();

  // Greeting based on time of day
  const hour = new Date().getHours();
  let greeting;
  if (hour >= 5 && hour < 12) greeting = t("greet_morning");
  else if (hour >= 12 && hour < 18) greeting = t("greet_afternoon");
  else if (hour >= 18 && hour < 21) greeting = t("greet_evening");
  else greeting = t("greet_night");

  const displayName = userProfile.nickname || userProfile.name || "";
  const greetingEl = document.getElementById("dashGreeting");
  greetingEl.textContent = displayName ? `${greeting}, ${displayName}` : greeting;

  // Task message
  const todayCount = entries.filter(e => e.date === today).length;
  const tomorrowCount = entries.filter(e => e.date === tomorrow).length;
  const totalTasks = todayCount + tomorrowCount;
  const taskMsgEl = document.getElementById("dashTaskMsg");
  taskMsgEl.textContent = totalTasks > 0 ? t("dash_thingsTodo") : t("dash_allClear");

  // Expected points
  const todayPts = entries.filter(e => e.date === today).reduce((s, e) => s + calcMaxPoints(e), 0);
  const tomorrowPts = entries.filter(e => e.date === tomorrow).reduce((s, e) => s + calcMaxPoints(e), 0);
  const expectedPts = todayPts + tomorrowPts;
  const ptsEl = document.getElementById("dashExpectedPts");
  ptsEl.textContent = expectedPts > 0 ? t("dash_ptsAvailable")(expectedPts) : "";

  // Scoreboard total
  const scoreTotal = calcTotalPoints();
  const scoreEl = document.getElementById("dashScoreTotal");
  scoreEl.textContent = t("dash_ptsEarned")(scoreTotal);
  scoreEl.className = "subtle" + (scoreTotal < 0 ? " pts-negative" : "");

  // Mini week calendar
  const weekCal = document.getElementById("dashWeekCal");
  weekCal.innerHTML = "";
  const weekdays = t("cal_weekdays");
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const dayDiv = document.createElement("div");
    dayDiv.className = "wc-day" + (dISO === today ? " today" : "");
    const hasEntry = entries.some(e => e.date === dISO);
    if (hasEntry) dayDiv.classList.add("has-entry");
    dayDiv.innerHTML = `<span class="wc-weekday">${weekdays[i]}</span><span class="wc-num">${d.getDate()}</span>`;
    weekCal.appendChild(dayDiv);
  }

  // Day sections
  document.getElementById("dashTitleToday").textContent = t("dash_secToday") + " \u00b7 " + formatDatePretty(today);
  document.getElementById("dashTitleTomorrow").textContent = t("dash_secTomorrow") + " \u00b7 " + formatDatePretty(tomorrow);
  document.getElementById("dashSummaryToday").textContent =
    todayCount === 0 ? t("dash_nothingToday") : t("dash_tasksToday")(todayCount) + " \u00b7 " + (todayPts > 0 ? t("dash_ptsToday")(todayPts) : "0 pts");
  document.getElementById("dashSummaryTomorrow").textContent =
    tomorrowCount === 0 ? t("dash_nothingTomorrow") : t("dash_tasksTomorrow")(tomorrowCount) + " \u00b7 " + (tomorrowPts > 0 ? t("dash_ptsTomorrow")(tomorrowPts) : "0 pts");

  renderDayEntries(document.getElementById("dashTodayList"), today, t("dash_nothingToday"));
  renderDayEntries(document.getElementById("dashTomorrowList"), tomorrow, t("dash_nothingTomorrow"));

  renderSecTasks();
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ============ Calendar ============ */
document.getElementById("prevMonth").addEventListener("click", () => {
  currentCalDate.setMonth(currentCalDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  currentCalDate.setMonth(currentCalDate.getMonth() + 1);
  renderCalendar();
});
document.getElementById("todayBtn").addEventListener("click", () => {
  currentCalDate = new Date();
  currentCalDate.setDate(1);
  renderCalendar();
});

function renderCalendar() {
  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  const monthNames = t("cal_months");
  document.getElementById("monthLabel").textContent = `${monthNames[month]} ${year}`;

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayStr = todayISO();

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    let dayNum, cellMonth, cellYear, otherMonth = false;

    if (i < startOffset) {
      dayNum = daysInPrevMonth - startOffset + i + 1;
      cellMonth = month - 1; cellYear = year;
      otherMonth = true;
    } else if (i >= startOffset + daysInMonth) {
      dayNum = i - startOffset - daysInMonth + 1;
      cellMonth = month + 1; cellYear = year;
      otherMonth = true;
    } else {
      dayNum = i - startOffset + 1;
      cellMonth = month; cellYear = year;
    }

    const normDate = new Date(cellYear, cellMonth, dayNum);
    const dateStr = `${normDate.getFullYear()}-${pad(normDate.getMonth() + 1)}-${pad(normDate.getDate())}`;

    const cell = document.createElement("div");
    cell.className = "cal-cell" + (otherMonth ? " other-month" : "") + (dateStr === todayStr ? " is-today" : "");

    const dayEntries = entries.filter(e => e.date === dateStr)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

    const maxShow = 3;
    const chipsHTML = dayEntries.slice(0, maxShow).map(e => {
      const status = getStatus(e);
      return `<div class="cal-chip status-${status}" data-id="${e.id}">${escapeHTML(e.name)}</div>`;
    }).join("");
    const moreHTML = dayEntries.length > maxShow
      ? `<div class="cal-more">+${dayEntries.length - maxShow} ${t("dash_more")}</div>` : "";

    cell.innerHTML = `
      <div class="cal-cell-head">
        <span class="cal-date-num">${dayNum}</span>
        <button class="cal-add-btn" title="${t("cal_addEntry")}">+</button>
      </div>
      <div class="cal-entries">${chipsHTML}${moreHTML}</div>
    `;

    const addBtn = cell.querySelector(".cal-add-btn");
    addBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openEntryModal(null, dateStr);
    });

    cell.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".cal-chip");
      if (chip) {
        ev.stopPropagation();
        openDetailModal(chip.dataset.id);
        return;
      }
      openEntryModal(null, dateStr);
    });

    grid.appendChild(cell);
  }
}

function renderCalList() {
  const list = document.getElementById("calList");
  list.innerHTML = "";

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  const monthNames = t("cal_months");
  document.getElementById("monthLabel").textContent = `${monthNames[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayISO();
  const weekdays = t("cal_weekdays");

  for (let d = 1; d <= daysInMonth; d++) {
    const normDate = new Date(year, month, d);
    const dateStr = `${normDate.getFullYear()}-${pad(normDate.getMonth() + 1)}-${pad(normDate.getDate())}`;
    const dayOfWeek = normDate.getDay();

    const dayEntries = entries
      .filter(e => e.date === dateStr)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

    const dayDiv = document.createElement("div");
    dayDiv.className = "cal-list-day" + (dateStr === todayStr ? " cal-list-today" : "");

    const head = document.createElement("div");
    head.className = "cal-list-head";
    head.innerHTML = `
      <span class="cal-list-weekday">${weekdays[dayOfWeek]}</span>
      <span class="cal-list-date">${d}</span>
      <span class="cal-list-count">${dayEntries.length} ${dayEntries.length !== 1 ? t("dash_more") : "entry"}</span>
      <button class="cal-list-add-btn" title="${t("cal_addEntry")}">+</button>
      <span class="cal-list-chevron">&#9654;</span>
    `;

    head.querySelector(".cal-list-add-btn").addEventListener("click", (ev) => {
      ev.stopPropagation();
      openEntryModal(null, dateStr);
    });

    head.addEventListener("click", () => {
      dayDiv.classList.toggle("expanded");
    });

    dayDiv.appendChild(head);

    const entriesDiv = document.createElement("div");
    entriesDiv.className = "cal-list-entries";

    if (dayEntries.length === 0) {
      entriesDiv.innerHTML = `<div class="cal-list-empty">${t("dash_free")} — ${t("dash_nothingToday")}</div>`;
    } else {
      dayEntries.forEach(entry => {
        const status = getStatus(entry);
        const maxPts = calcMaxPoints(entry);
        const entryPts = status === "completed" ? calcEntryPoints(entry) : maxPts;
        const row = document.createElement("div");
        row.className = "cal-list-entry";
        row.innerHTML = `
          <span class="cal-list-entry-time">${entry.time ? formatTimePretty(entry.time) : "\u2014"}</span>
          <span class="cal-list-entry-name">${escapeHTML(entry.name)}</span>
          <span class="cal-list-entry-pts ${entryPts >= 0 ? "pos" : "neg"}">${entryPts >= 0 ? "+" : ""}${entryPts}</span>
        `;
        row.addEventListener("click", () => openDetailModal(entry.id));
        entriesDiv.appendChild(row);
      });
    }

    dayDiv.appendChild(entriesDiv);
    list.appendChild(dayDiv);
  }
}

/* ============ Entry Add/Edit Modal ============ */
const entryModalOverlay = document.getElementById("entryModalOverlay");
const entryForm = document.getElementById("entryForm");

function getAlarmPresets() {
  return [
    { label: t("alarm_5min"), minutes: 5 },
    { label: t("alarm_15min"), minutes: 15 },
    { label: t("alarm_30min"), minutes: 30 },
    { label: t("alarm_1hour"), minutes: 60 },
    { label: t("alarm_2hours"), minutes: 120 },
    { label: t("alarm_1day"), minutes: 1440 },
    { label: t("alarm_custom"), minutes: -1 },
  ];
}

function alarmLabel(alarm) {
  if (alarm.minutes >= 0) {
    return getAlarmPresets().find(p => p.minutes === alarm.minutes)?.label || t("alarm_fallback")(alarm.minutes);
  }
  return `${t("alarm_at")} ${formatDatePretty(alarm.date)} ${formatTimePretty(alarm.time)}`;
}

function addAlarmRow(alarm) {
  const list = document.getElementById("alarmInputList");
  const row = document.createElement("div");
  row.className = "todo-input-row alarm-row";

  const isCustom = alarm && alarm.minutes === -1;
  const mins = isCustom ? -1 : (alarm?.minutes ?? 15);
  const customDate = alarm?.date || todayISO();
  const customTime = alarm?.time || "09:00";

  row.innerHTML = `
    <select class="alarm-type-input">
      ${getAlarmPresets().map(p => `<option value="${p.minutes}" ${p.minutes === mins ? "selected" : ""}>${p.label}</option>`).join("")}
    </select>
    <div class="alarm-custom-time" style="${isCustom ? "" : "display:none"}">
      <input type="date" class="alarm-custom-date" value="${customDate}">
      <input type="time" class="alarm-custom-time-input" value="${customTime}">
    </div>
    <button type="button" class="todo-remove-btn" title="${t("inv_remove")}">&times;</button>
  `;

  const typeSelect = row.querySelector(".alarm-type-input");
  const customWrap = row.querySelector(".alarm-custom-time");

  typeSelect.addEventListener("change", () => {
    customWrap.style.display = typeSelect.value === "-1" ? "" : "none";
  });

  row.querySelector(".todo-remove-btn").addEventListener("click", () => {
    if (list.children.length > 1) row.remove();
    else {
      typeSelect.value = "15";
      customWrap.style.display = "none";
    }
  });

  list.appendChild(row);
}

function openEntryModal(entryId, presetDate) {
  entryForm.reset();
  editingTodoRows = [];
  document.getElementById("todoInputList").innerHTML = "";
  document.getElementById("alarmInputList").innerHTML = "";

  if (entryId) {
    const entry = entries.find(e => e.id === entryId);
    document.getElementById("entryModalTitle").textContent = t("entry_editTitle");
    document.getElementById("entryId").value = entry.id;
    document.getElementById("entryName").value = entry.name;
    document.getElementById("entryDescription").value = entry.description || "";
    document.getElementById("entryDate").value = entry.date;
    document.getElementById("entryTime").value = entry.time || "";
    entry.todos.forEach(t => addTodoRow(t.text, t.id));
    if (entry.alarms && entry.alarms.length > 0) {
      entry.alarms.forEach(a => addAlarmRow(a));
    } else {
      addAlarmRow({ minutes: 15 });
    }
  } else {
    document.getElementById("entryModalTitle").textContent = t("entry_newTitle");
    document.getElementById("entryId").value = "";
    document.getElementById("entryDate").value = presetDate || todayISO();
    addTodoRow("");
    addAlarmRow({ minutes: 15 });
  }

  entryModalOverlay.classList.add("open");
  document.getElementById("entryName").focus();
}

function closeEntryModal() {
  entryModalOverlay.classList.remove("open");
}

document.getElementById("quickAddBtn").addEventListener("click", () => openEntryModal(null, todayISO()));
document.getElementById("entryModalClose").addEventListener("click", closeEntryModal);
document.getElementById("entryCancelBtn").addEventListener("click", closeEntryModal);
entryModalOverlay.addEventListener("click", (e) => { if (e.target === entryModalOverlay) closeEntryModal(); });

function addTodoRow(text, existingId) {
  const list = document.getElementById("todoInputList");
  const row = document.createElement("div");
  row.className = "todo-input-row";
  const tid = existingId || todoId();
  row.dataset.todoId = tid;
  row.innerHTML = `
    <input type="text" class="todo-text-input" placeholder="${t("entry_todoPlaceholder")}" value="${escapeHTML(text || "")}">
    <button type="button" class="todo-remove-btn" title="${t("inv_remove")}">&times;</button>
  `;
  row.querySelector(".todo-remove-btn").addEventListener("click", () => {
    if (list.children.length > 1) row.remove();
    else row.querySelector("input").value = "";
  });
  list.appendChild(row);
}

document.getElementById("addTodoRow").addEventListener("click", () => addTodoRow(""));
document.getElementById("addAlarmRow").addEventListener("click", () => addAlarmRow({ minutes: 15 }));

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = document.getElementById("entryId").value;
  const name = document.getElementById("entryName").value.trim();
  const description = document.getElementById("entryDescription").value.trim();
  const date = document.getElementById("entryDate").value;
  const time = document.getElementById("entryTime").value;

  const todoRows = document.querySelectorAll("#todoInputList .todo-input-row");
  const todoTexts = [];
  todoRows.forEach(row => {
    const text = row.querySelector(".todo-text-input").value.trim();
    if (text) todoTexts.push({ text, id: row.dataset.todoId });
  });

  const alarmRows = document.querySelectorAll("#alarmInputList .alarm-row");
  const alarms = [];
  alarmRows.forEach(row => {
    const typeVal = parseInt(row.querySelector(".alarm-type-input").value, 10);
    if (typeVal >= 0) {
      alarms.push({ minutes: typeVal });
    } else {
      const d = row.querySelector(".alarm-custom-date").value;
      const t = row.querySelector(".alarm-custom-time-input").value;
      if (d && t) alarms.push({ minutes: -1, date: d, time: t });
    }
  });

  if (!name || !date) return;
  if (todoTexts.length === 0) {
    showToast(t("toast_addTodo"));
    return;
  }

  if (id) {
    const entry = entries.find(en => en.id === id);
    const oldTodos = entry.todos;
    entry.name = name;
    entry.description = description;
    entry.date = date;
    entry.time = time;
    entry.alarms = alarms;
    entry.todos = todoTexts.map(({ text, id: todoRowId }) => {
      const existing = oldTodos.find(t => t.id === todoRowId);
      return {
        id: todoRowId,
        text,
        done: existing ? existing.done : false,
      };
    });
    editPenalties.push({ entryId: entry.id, name: entry.name, editedAt: new Date().toISOString() });
    saveEditPenalties();
    showToast(t("toast_entryUpdated"));
  } else {
    entries.push({
      id: uid(),
      name, description, date, time, alarms,
      todos: todoTexts.map(({ text, id: todoRowId }) => ({
        id: todoRowId,
        text,
        done: false,
      })),
    });
    showToast(t("toast_entryAdded"));
  }

  saveEntries();
  closeEntryModal();
  refreshAll();
});

/* ============ Detail Modal ============ */
const detailModalOverlay = document.getElementById("detailModalOverlay");
let currentDetailId = null;

function openDetailModal(entryId) {
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;
  currentDetailId = entryId;

  const status = getStatus(entry);
  const statusText = status === "completed" ? t("detail_completed") : status === "past-due" ? t("detail_pastDue") : t("detail_active");
  document.getElementById("detailName").textContent = entry.name;
  document.getElementById("detailStatus").textContent = statusText;
  document.getElementById("detailStatus").className = `status-badge status-${status}`;
  document.getElementById("detailDateTime").textContent =
    formatDatePretty(entry.date) + (entry.time ? ` \u00b7 ${formatTimePretty(entry.time)}` : "");
  document.getElementById("detailDescription").textContent = entry.description || "";
  document.getElementById("detailDescription").style.display = entry.description ? "block" : "none";

  const todosWrap = document.getElementById("detailTodos");
  todosWrap.innerHTML = "";
  entry.todos.forEach((todo) => {
    const item = document.createElement("label");
    item.className = "detail-todo-item" + (todo.done ? " done" : "");
    item.innerHTML = `<input type="checkbox" ${todo.done ? "checked" : ""}> <span>${escapeHTML(todo.text)}</span>`;
    item.querySelector("input").addEventListener("change", (e) => {
      todo.done = e.target.checked;
      saveEntries();
      openDetailModal(entryId);
      refreshAll();
    });
    todosWrap.appendChild(item);
  });

  // Alarms — editable
  const alarmSection = document.getElementById("detailAlarms");
  alarmSection.innerHTML = "";
  if (entry.alarms && entry.alarms.length > 0) {
    const label = document.createElement("div");
    label.className = "detail-alarms-label";
    label.textContent = t("entry_alarmsLabel");
    alarmSection.appendChild(label);

    const chipList = document.createElement("div");
    chipList.className = "detail-alarm-list";
    entry.alarms.forEach((a, idx) => {
      const chip = document.createElement("span");
      chip.className = "detail-alarm-chip";
      chip.innerHTML = `${escapeHTML(alarmLabel(a))} <button class="detail-alarm-remove" title="${t("inv_remove")}">&times;</button>`;
      chip.querySelector(".detail-alarm-remove").addEventListener("click", (ev) => {
        ev.stopPropagation();
        entry.alarms.splice(idx, 1);
        if (entry.alarms.length === 0) delete entry.alarms;
        saveEntries();
        openDetailModal(entryId);
        refreshAll();
      });
      chipList.appendChild(chip);
    });
    alarmSection.appendChild(chipList);
  }

  // Add alarm button in detail view
  const addAlarmBtn = document.createElement("button");
  addAlarmBtn.className = "btn btn-ghost btn-small";
  addAlarmBtn.style.marginTop = "8px";
  addAlarmBtn.textContent = t("entry_addAlarm");
  addAlarmBtn.addEventListener("click", () => {
    if (!entry.alarms) entry.alarms = [];
    entry.alarms.push({ minutes: 15 });
    saveEntries();
    openDetailModal(entryId);
    refreshAll();
  });
  alarmSection.appendChild(addAlarmBtn);

  detailModalOverlay.classList.add("open");
}

function closeDetailModal() {
  detailModalOverlay.classList.remove("open");
  currentDetailId = null;
}

document.getElementById("detailModalClose").addEventListener("click", closeDetailModal);
document.getElementById("detailCloseBtn").addEventListener("click", closeDetailModal);
detailModalOverlay.addEventListener("click", (e) => { if (e.target === detailModalOverlay) closeDetailModal(); });

document.getElementById("detailEditBtn").addEventListener("click", () => {
  const id = currentDetailId;
  closeDetailModal();
  openEntryModal(id);
});

document.getElementById("detailDeleteBtn").addEventListener("click", () => {
  if (!currentDetailId) return;
  if (!confirm(t("confirm_deleteEntry"))) return;
  const deletedEntry = entries.find(e => e.id === currentDetailId);
  deletePenalties.push({ entryId: currentDetailId, name: deletedEntry ? deletedEntry.name : "unknown", deletedAt: new Date().toISOString() });
  saveDeletePenalties();
  entries = entries.filter(e => e.id !== currentDetailId);
  saveEntries();
  closeDetailModal();
  refreshAll();
    showToast(t("toast_deleted"));
});

/* ============ Notifications / Alarms ============ */
function initNotifications() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function checkAlarms() {
  const now = new Date();
  entries.forEach(entry => {
    if (!entry.alarms || entry.alarms.length === 0) return;
    if (getStatus(entry) === "completed") return;

    const deadline = deadlineOf(entry);
    entry.alarms.forEach((alarm, idx) => {
      let alarmTime;
      if (alarm.minutes >= 0) {
        alarmTime = new Date(deadline.getTime() - alarm.minutes * 60000);
      } else {
        alarmTime = new Date(`${alarm.date}T${alarm.time}:00`);
      }

      const key = `${entry.id}_${idx}`;

      if (now >= alarmTime && !firedAlarms[key]) {
        firedAlarms[key] = true;

        // Browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(t("notif_title"), {
            body: `${entry.name} — ${alarmLabel(alarm)}`,
          });
        }

        // Play custom or default sound
        playNotifSound();

        // In-app toast
        showToast(`${t("toast_reminder")} ${entry.name} (${alarmLabel(alarm)})`);
      }
    });
  });
}

// Load fired alarms from localStorage so they don't re-fire
try {
  const saved = localStorage.getItem("ledger.firedAlarms.v1");
  if (saved) firedAlarms = JSON.parse(saved);
} catch (e) {}

function saveFiredAlarms() {
  try { localStorage.setItem("ledger.firedAlarms.v1", JSON.stringify(firedAlarms)); } catch (e) {}
  scheduleCloudSave();
}

/* ============ Settings — Notification Sound ============ */
const NOTIF_SOUND_KEY = "ledger.notifSound.v1";
let notifSoundData = null; // base64 data URI

function loadNotifSound() {
  try {
    notifSoundData = localStorage.getItem(NOTIF_SOUND_KEY) || null;
  } catch (e) {}
}

function saveNotifSound(dataUri) {
  try {
    notifSoundData = dataUri;
    localStorage.setItem(NOTIF_SOUND_KEY, dataUri);
  } catch (e) {
    showToast(t("toast_cantSaveSound"));
  }
  scheduleCloudSave();
}

function removeNotifSound() {
  notifSoundData = null;
  try { localStorage.removeItem(NOTIF_SOUND_KEY); } catch (e) {}
  updateSoundUI();
  scheduleCloudSave();
}

function playNotifSound() {
  if (!notifSoundData) return;
  try {
    const audio = new Audio(notifSoundData);
    audio.play();
  } catch (e) {}
}

function updateSoundUI() {
  const nameEl = document.getElementById("notifSoundName");
  const removeBtn = document.getElementById("notifSoundRemove");
  if (notifSoundData) {
    nameEl.textContent = t("settings_notifSound");
    removeBtn.style.display = "inline-block";
  } else {
    nameEl.textContent = t("settings_noFile");
    removeBtn.style.display = "none";
  }
}

/* --- Profile save --- */
document.getElementById("saveProfileBtn").addEventListener("click", () => {
  userProfile.name = document.getElementById("userName").value.trim();
  userProfile.nickname = document.getElementById("userNickname").value.trim();
  userProfile.phone = document.getElementById("userPhone").value.trim();
  saveUserProfile();
  showToast(t("settings_profileSaved"));
  renderDashboard();
});

function loadProfileUI() {
  document.getElementById("userName").value = userProfile.name || "";
  document.getElementById("userNickname").value = userProfile.nickname || "";
  document.getElementById("userPhone").value = userProfile.phone || "";
  document.getElementById("langSelect").value = lang;
  document.getElementById("themeSelect").value = theme;
  document.getElementById("calViewSelect").value = calView;
}

document.getElementById("notifSoundInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    saveNotifSound(reader.result);
    updateSoundUI();
    showToast(t("toast_soundSaved"));
  };
  reader.readAsDataURL(file);
});

document.getElementById("notifSoundTest").addEventListener("click", () => {
  playNotifSound();
  if (!notifSoundData) showToast(t("toast_noSound"));
});

document.getElementById("notifSoundRemove").addEventListener("click", () => {
  removeNotifSound();
  showToast(t("toast_soundRemoved"));
});

loadNotifSound();

/* ============ Settings — Save Data ============ */
const SAVE_FILE_NAME = "ledger-save.json";
let saveDirHandle = null; // File System Access API handle

function gatherSaveData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entries,
    inventory: inventory,
    secTasks: secTasks,
    deletedSecTasks: deletedSecTasks,
    userProfile: userProfile,
    lang: lang,
    theme: theme,
    calView: calView,
    storeSpent: storeSpent,
    redeemed: redeemed,
    editPenalties: editPenalties,
    deletePenalties: deletePenalties,
    notifSound: notifSoundData,
    firedAlarms: firedAlarms,
  };
}

function applySaveData(data) {
  if (data.entries) entries = data.entries;
  if (data.inventory) inventory = data.inventory;
  if (data.secTasks) secTasks = data.secTasks;
  if (data.deletedSecTasks) deletedSecTasks = data.deletedSecTasks;
  if (data.userProfile) userProfile = data.userProfile;
  if (data.lang) { lang = data.lang; localStorage.setItem(LANG_KEY, lang); document.getElementById("langSelect").value = lang; }
  if (data.theme) { theme = data.theme; localStorage.setItem(THEME_KEY, theme); document.getElementById("themeSelect").value = theme; applyTheme(); }
  if (data.calView) { calView = data.calView; localStorage.setItem(CAL_VIEW_KEY, calView); document.getElementById("calViewSelect").value = calView; }
  if (data.storeSpent !== undefined) { storeSpent = data.storeSpent; localStorage.setItem(STORE_SPENT_KEY, storeSpent.toString()); }
  if (data.redeemed) { redeemed = data.redeemed; saveRedeemed(); }
  if (data.editPenalties) { editPenalties = data.editPenalties; saveEditPenalties(); }
  if (data.deletePenalties) { deletePenalties = data.deletePenalties; saveDeletePenalties(); }
  if (data.petStats) { petStats = { ...DEFAULT_PET_STATS, ...data.petStats, lastUsed: (data.petStats.lastUsed || {}) }; savePetStats(); }
  if (data.notifSound) notifSoundData = data.notifSound;
  if (data.firedAlarms) firedAlarms = data.firedAlarms;
  saveEntries();
  saveInventory();
  saveSecTasks();
  saveDeletedSecTasks();
  saveUserProfile();
  if (notifSoundData) {
    try { localStorage.setItem(NOTIF_SOUND_KEY, notifSoundData); } catch (e) {}
  }
  try { localStorage.setItem("ledger.firedAlarms.v1", JSON.stringify(firedAlarms)); } catch (e) {}
  loadNotifSound();
  refreshAll();
  // If user is signed in, push imported data to cloud so it syncs across devices
  if (firebaseReady && currentUser) {
    saveToCloud();
  }
}

// Export — download JSON
document.getElementById("exportBtn").addEventListener("click", () => {
  const data = gatherSaveData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = SAVE_FILE_NAME;
  a.click();
  URL.revokeObjectURL(url);
  showToast(t("toast_exported"));
});

// Import — file picker
document.getElementById("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      applySaveData(data);
      showToast(t("toast_imported"));
    } catch (err) {
      showToast(t("toast_invalidFile"));
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// Folder picker — File System Access API
document.getElementById("chooseFolderBtn").addEventListener("click", async () => {
  if (!("showDirectoryPicker" in window)) {
    showToast(t("toast_folderNotSupported"));
    return;
  }
  try {
    saveDirHandle = await window.showDirectoryPicker();
    document.getElementById("saveFolderPath").textContent = saveDirHandle.name;
    showToast(t("toast_folderChosen"));
  } catch (e) {
    // user cancelled
  }
});

// Quick save — write to chosen folder
async function quickSave() {
  if (!saveDirHandle) {
    showToast(t("toast_noFolder"));
    return;
  }
  try {
    const fileHandle = await saveDirHandle.getFileHandle(SAVE_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    const data = gatherSaveData();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    showToast(t("toast_quickSaved"));
  } catch (e) {
    showToast(t("toast_quickSaveFail"));
  }
}

document.getElementById("quickSaveBtn").addEventListener("click", quickSave);

/* ============ Scoreboard ============ */
function calcMaxPoints(entry) {
  if (getStatus(entry) === "completed") return 0;
  return 5; // max possible if completed before deadline
}

function calcEntryPoints(entry) {
  const status = getStatus(entry);
  if (status !== "completed") return 0;

  const deadline = deadlineOf(entry);
  const now = new Date();

  // Find when all todos were completed — use "now" as approximation
  // since we don't track completion time.
  // If deadline is in the past, completed after deadline.
  if (now <= deadline) {
    return 5; // completed before deadline
  }

  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  if (now - deadline > oneWeek) {
    return -4; // deadline passed by 1+ week
  }

  return 2; // completed after deadline
}

function calcTotalPoints() {
  const entryPts = entries.reduce((sum, e) => sum + calcEntryPoints(e), 0);
  const secPts = secTasks.reduce((sum, t) => sum + getSecTaskPoints(t), 0);
  const deletedPts = deletedSecTasks.length * -1;
  const editPts = editPenalties.length * -1;
  const deletePts = deletePenalties.length * -2;
  return entryPts + secPts + deletedPts + editPts + deletePts;
}

function renderScoreboard() {
  const total = calcTotalPoints();
  const totalEl = document.getElementById("scoreTotal");
  const slider = document.getElementById("scoreSlider");

  totalEl.textContent = total;
  totalEl.className = "score-total" + (total < 0 ? " negative" : "");

  // Slider
  const allPts = [
    ...entries.map(e => calcEntryPoints(e)),
    ...secTasks.map(t => getSecTaskPoints(t)),
    ...deletedSecTasks.map(() => -1),
  ];
  const maxPts = Math.max(100, ...allPts.filter(p => p > 0), total);
  slider.max = maxPts;
  slider.value = Math.max(0, total);

  // Breakdown
  const breakdown = document.getElementById("scoreBreakdown");
  breakdown.innerHTML = "";

  const allScored = [
    ...entries
      .filter(e => getStatus(e) === "completed")
      .map(e => ({ name: e.name, pts: calcEntryPoints(e), type: "task" })),
    ...secTasks
      .map(task => {
        const pts = getSecTaskPoints(task);
        const label = pts === 3 ? t("score_secBefore") : pts === 1 ? t("score_secAfter") : pts === -2 ? t("score_secMissed") : "";
        return { name: task.name, pts, type: "secondary", label };
      })
      .filter(x => x.pts !== 0),
    ...deletedSecTasks
      .map(task => ({ name: task.name, pts: -1, type: "deleted", label: t("score_secDeleted") })),
    ...editPenalties
      .map(p => ({ name: p.name + " (edited)", pts: -1, type: "penalty", label: t("score_penaltyEdit") })),
    ...deletePenalties
      .map(p => ({ name: p.name + " (deleted)", pts: -2, type: "penalty", label: t("score_penaltyDelete") })),
  ].sort((a, b) => b.pts - a.pts);

  if (allScored.length === 0) {
    breakdown.innerHTML = `<div class="empty-state"><span>${t("score_noScores")}</span>${t("score_noScoresHint")}</div>`;
    return;
  }

  allScored.forEach(({ name, pts, type, label }) => {
    const row = document.createElement("div");
    row.className = "score-entry" + (type === "penalty" ? " penalty" : "");
    let statusLabel;
    if (type === "secondary" || type === "deleted" || type === "penalty") {
      statusLabel = label;
    } else {
      statusLabel = pts === 5 ? t("score_beforeDeadline") : pts === 2 ? t("score_afterDeadline") : pts === -4 ? t("score_late1wk") : "";
    }
    row.innerHTML = `
      <span class="score-entry-name">${escapeHTML(name)} <span class="subtle" style="font-weight:400">(${statusLabel})</span></span>
      <span class="score-entry-points ${pts >= 0 ? "pos" : "neg"}">${pts >= 0 ? "+" : ""}${pts}</span>
    `;
    breakdown.appendChild(row);
  });

  // Summary text
  const completedCount = entries.filter(e => getStatus(e) === "completed").length;
  const secDone = secTasks.filter(t => t.done).length;
  const deletedCount = deletedSecTasks.length;
  document.getElementById("scoreSummary").textContent = t("score_summaryText")(completedCount, secDone, deletedCount, total);
}

// Listen to tab changes for scoreboard
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "calendar") applyCalView();
    if (btn.dataset.tab === "inventory") renderInventory();
    if (btn.dataset.tab === "scoreboard") renderScoreboard();
    if (btn.dataset.tab === "store") renderStore();
    if (btn.dataset.tab === "life") renderLife();
    if (btn.dataset.tab === "settings") updateSoundUI();
  });
});

/* ============ Language / Translations ============ */
function applyTranslations() {
  // Page title
  document.title = lang === "es" ? "Game of Life \u2014 Planificador Diario" : "Game of Life \u2014 Daily Planner";
  // Tabs
  document.querySelector('[data-tab="dashboard"]').textContent = t("tab_dashboard");
  document.querySelector('[data-tab="calendar"]').textContent = t("tab_calendar");
  document.querySelector('[data-tab="scoreboard"]').textContent = t("tab_scoreboard");
  document.querySelector('[data-tab="store"]').textContent = t("store_title");
  document.querySelector('[data-tab="life"]').textContent = t("life_title");
  document.querySelector('[data-tab="settings"]').textContent = t("tab_settings");
  // Header
  document.getElementById("quickAddBtn").textContent = t("btn_newEntry");
  document.getElementById("quickSaveBtn").textContent = t("btn_quickSave");
  document.getElementById("quickSaveBtn").title = t("settings_quickSaveTitle");
  // Calendar
  document.getElementById("todayBtn").textContent = t("cal_today");
  const weekdays = document.querySelectorAll(".cal-weekdays span");
  t("cal_weekdays").forEach((w, i) => { if (weekdays[i]) weekdays[i].textContent = w; });
  // Dashboard
  document.querySelector("#panel-dashboard .dash-secondary-head h2").textContent = t("dash_secondary");
  // Inventory
  document.querySelector("#panel-inventory .panel-head h2").textContent = t("inv_title");
  document.getElementById("invAddBtn").textContent = t("inv_addItem");
  document.getElementById("invExportBtn").textContent = t("settings_export");
  document.getElementById("invImportLabel").textContent = t("settings_import");
  document.querySelector(".inv-table-head .inv-col-name").textContent = t("inv_colItem");
  document.querySelector(".inv-table-head .inv-col-price").textContent = t("inv_colPrice");
  document.querySelector(".inv-table-head .inv-col-qty").textContent = t("inv_colQty");
  document.querySelector(".inv-table-head .inv-col-cat").textContent = t("inv_colCat");
  // Scoreboard
  document.querySelector("#panel-scoreboard .panel-head h2").textContent = t("score_title");
  document.getElementById("scoreTotal").textContent = "0";
  document.querySelector(".score-label").textContent = t("score_total");
  document.getElementById("scoreSummary").textContent = t("score_summary");
  const legendDots = ["score-dot-pos", "score-dot-neg", "score-dot-penalty"];
  const legendTexts = [t("score_legendBefore"), t("score_legendAfter"), t("score_legendLate")];
  const legendItems = document.querySelectorAll(".score-legend-item");
  legendItems.forEach((item, i) => {
    if (legendTexts[i]) item.innerHTML = `<span class="score-dot ${legendDots[i]}"></span> ${legendTexts[i]}`;
  });
  // Settings — Language
  document.getElementById("settingsLangTitle").textContent = t("settings_language");
  document.getElementById("settingsLangHint").textContent = t("settings_langHint");
  // Settings — Theme
  document.getElementById("settingsThemeTitle").textContent = t("settings_theme");
  document.getElementById("settingsThemeHint").textContent = t("settings_themeHint");
  const themeOpts = document.getElementById("themeSelect").options;
  themeOpts[0].textContent = t("settings_themeLight");
  themeOpts[1].textContent = t("settings_themeDark");
  // Settings — Calendar View
  document.getElementById("settingsCalendarViewTitle").textContent = t("settings_calView");
  document.getElementById("settingsCalendarViewHint").textContent = t("settings_calViewHint");
  const calOpts = document.getElementById("calViewSelect").options;
  calOpts[0].textContent = t("settings_calViewGrid");
  calOpts[1].textContent = t("settings_calViewList");
  // Settings — Reset
  document.getElementById("settingsResetTitle").textContent = t("settings_reset");
  document.getElementById("settingsResetHint").textContent = t("settings_resetHint");
  document.getElementById("resetAllBtn").textContent = t("settings_resetBtn");
  // Settings — Supply Store
  document.getElementById("settingsSupplyTitle").textContent = t("settings_supply");
  document.getElementById("settingsSupplyHint").textContent = t("settings_supplyHint");
  document.getElementById("supplyStoreBtn").textContent = t("settings_supplyBtn");
  // Settings — Cloud Sync
  document.getElementById("settingsCloudTitle").textContent = t("settings_cloud");
  document.getElementById("settingsCloudHint").textContent = t("settings_cloudHint");
  // Store
  document.getElementById("storeTitle").textContent = t("store_title");
  document.getElementById("storeSummary").textContent = t("store_summary");
  document.getElementById("storeAvailLabel").textContent = t("store_availPts");
  // Life
  document.getElementById("lifeTitle").textContent = t("life_title");
  document.getElementById("lifeSummary").textContent = t("life_summary");
  document.getElementById("lifeTotalLabel").textContent = t("life_totalLabel");
  // Admin modal
  document.getElementById("adminModalTitle").textContent = t("admin_title");
  document.getElementById("adminLabelUser").textContent = t("admin_user");
  document.getElementById("adminUser").placeholder = t("admin_userPlaceholder");
  document.getElementById("adminLabelPass").textContent = t("admin_pass");
  document.getElementById("adminPass").placeholder = t("admin_passPlaceholder");
  document.getElementById("adminCancelBtn").textContent = t("admin_cancel");
  document.getElementById("adminError").textContent = t("admin_error");
  // Redeem modal
  document.getElementById("redeemModalTitle").textContent = t("store_redeemTitle");
  document.getElementById("redeemCancelBtn").textContent = t("admin_cancel");
  document.getElementById("redeemConfirmBtn").textContent = t("store_redeemConfirm");
  // Inventory image
  document.getElementById("invLabelImage").innerHTML = t("invLabelImage") + " <em>" + t("entry_descOptional") + "</em>";
  document.getElementById("invImageLabel").textContent = t("invImageChoose");
  document.getElementById("invImageName").textContent = t("invImageNoFile");
  document.getElementById("invImageRemove").textContent = t("invImageRemove");
  // Settings — Profile
  document.getElementById("settingsProfileTitle").textContent = t("settings_profile");
  document.getElementById("settingsProfileHint").textContent = t("settings_profileHint");
  document.querySelector('label[for="userName"]').textContent = t("settings_name");
  document.getElementById("userName").placeholder = t("settings_namePlaceholder");
  document.querySelector('label[for="userNickname"]').textContent = t("settings_nickname");
  document.getElementById("userNickname").placeholder = t("settings_nicknamePlaceholder");
  document.querySelector('label[for="userPhone"]').textContent = t("settings_phone");
  document.getElementById("userPhone").placeholder = t("settings_phonePlaceholder");
  document.getElementById("saveProfileBtn").textContent = t("settings_saveProfile");
  // Settings — Notification Sound
  document.getElementById("settingsNotifTitle").textContent = t("settings_notifSound");
  document.getElementById("settingsNotifHint").textContent = t("settings_notifHint");
  document.getElementById("notifChooseLabel").textContent = t("settings_chooseFile");
  document.getElementById("notifSoundTest").textContent = t("settings_test");
  document.getElementById("notifSoundRemove").textContent = t("settings_remove");
  updateSoundUI();
  // Settings — Save Data
  document.getElementById("settingsSaveTitle").textContent = t("settings_saveData");
  document.getElementById("settingsSaveHint").textContent = t("settings_saveHint");
  document.getElementById("exportBtn").textContent = t("settings_export");
  document.getElementById("importLabel").textContent = t("settings_import");
  document.getElementById("chooseFolderBtn").textContent = t("settings_chooseFolder");
  if (!saveDirHandle) document.getElementById("saveFolderPath").textContent = t("settings_noFolder");
  // Entry modal
  document.getElementById("entryLabelName").textContent = t("entry_nameLabel");
  document.getElementById("entryName").placeholder = t("entry_namePlaceholder");
  document.getElementById("entryLabelDesc").innerHTML = t("entry_descLabel") + " <em>" + t("entry_descOptional") + "</em>";
  document.getElementById("entryDescription").placeholder = t("entry_descPlaceholder");
  document.getElementById("entryLabelDate").textContent = t("entry_dateLabel");
  document.getElementById("entryLabelTime").innerHTML = t("entry_timeLabel") + " <em>" + t("entry_descOptional") + "</em>";
  document.getElementById("entryLabelTodos").textContent = t("entry_todosLabel");
  document.getElementById("entryLabelAlarms").innerHTML = t("entry_alarmsLabel") + " <em>" + t("entry_descOptional") + "</em>";
  document.getElementById("addTodoRow").textContent = t("entry_addTodo");
  document.getElementById("addAlarmRow").textContent = t("entry_addAlarm");
  document.getElementById("entryCancelBtn").textContent = t("entry_cancel");
  document.querySelector('#entryForm button[type="submit"]').textContent = t("entry_save");
  // Inventory modal
  document.getElementById("invLabelName").textContent = t("invModal_itemName");
  document.getElementById("invItemName").placeholder = t("invModal_itemPlaceholder");
  document.getElementById("invLabelDesc").innerHTML = t("invModal_desc") + " <em>" + t("invModal_descOptional") + "</em>";
  document.getElementById("invLabelPrice").textContent = t("invModal_price");
  document.getElementById("invLabelQty").textContent = t("invModal_qty");
  document.getElementById("invLabelCat").textContent = t("invModal_cat");
  document.getElementById("invLabelAcc").innerHTML = t("invModal_acc") + " <em>" + t("invModal_descOptional") + "</em>";
  document.getElementById("invAddAccRow").textContent = t("invModal_addAcc");
  document.getElementById("invCancelBtn").textContent = t("invModal_cancel");
  document.querySelector('#invForm button[type="submit"]').textContent = t("invModal_save");
  document.getElementById("invDeleteBtn").textContent = t("invModal_delete");
  // Detail modal
  document.getElementById("detailDeleteBtn").textContent = t("detail_delete");
  document.getElementById("detailEditBtn").textContent = t("detail_edit");
  document.getElementById("detailCloseBtn").textContent = t("detail_close");
  // Set html lang attribute
  document.documentElement.lang = lang;
}

document.getElementById("langSelect").addEventListener("change", (e) => {
  lang = e.target.value;
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations();
  refreshAll();
  scheduleCloudSave();
});

document.getElementById("themeSelect").addEventListener("change", (e) => {
  theme = e.target.value;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
  scheduleCloudSave();
});

document.getElementById("calViewSelect").addEventListener("change", (e) => {
  calView = e.target.value;
  localStorage.setItem(CAL_VIEW_KEY, calView);
  syncCalViewButtons();
  applyCalView();
  scheduleCloudSave();
});

document.getElementById("calViewGridBtn").addEventListener("click", () => {
  calView = "grid";
  localStorage.setItem(CAL_VIEW_KEY, calView);
  document.getElementById("calViewSelect").value = calView;
  syncCalViewButtons();
  applyCalView();
});

document.getElementById("calViewListBtn").addEventListener("click", () => {
  calView = "list";
  localStorage.setItem(CAL_VIEW_KEY, calView);
  document.getElementById("calViewSelect").value = calView;
  syncCalViewButtons();
  applyCalView();
});

function syncCalViewButtons() {
  const gridBtn = document.getElementById("calViewGridBtn");
  const listBtn = document.getElementById("calViewListBtn");
  gridBtn.classList.toggle("active", calView === "grid");
  listBtn.classList.toggle("active", calView === "list");
}

document.getElementById("resetAllBtn").addEventListener("click", () => {
  if (!confirm(t("settings_resetConfirm"))) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(INV_STORAGE_KEY);
  localStorage.removeItem(SEC_STORAGE_KEY);
  localStorage.removeItem(SEC_DELETED_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
  localStorage.removeItem(THEME_KEY);
  localStorage.removeItem(CAL_VIEW_KEY);
  localStorage.removeItem(STORE_SPENT_KEY);
  localStorage.removeItem(REDEEMED_KEY);
  localStorage.removeItem(EDIT_PENALTY_KEY);
  localStorage.removeItem(DELETE_PENALTY_KEY);
  localStorage.removeItem(PET_STATS_KEY);
  localStorage.removeItem(NOTIF_SOUND_KEY);
  localStorage.removeItem("ledger.firedAlarms.v1");
  localStorage.removeItem(LANG_KEY);
  entries = [];
  inventory = [];
  secTasks = [];
  deletedSecTasks = [];
  userProfile = { name: "", nickname: "", phone: "" };
  firedAlarms = {};
  notifSoundData = null;
  lang = "en";
  theme = "light";
  calView = "grid";
  storeSpent = 0;
  redeemed = [];
  editPenalties = [];
  deletePenalties = [];
  petStats = { ...DEFAULT_PET_STATS };
  document.getElementById("langSelect").value = lang;
  document.getElementById("themeSelect").value = theme;
  document.getElementById("calViewSelect").value = calView;
  syncCalViewButtons();
  applyTheme();
  applyTranslations();
  refreshAll();
  showToast(t("toast_deleted"));
  scheduleCloudSave();
});

function refreshAll() {
  loadProfileUI();
  applyTranslations();
  applyTheme();
  document.getElementById("themeSelect").value = theme;
  document.getElementById("calViewSelect").value = calView;
  syncCalViewButtons();
  renderDashboard();
  if (document.getElementById("panel-calendar").classList.contains("active")) {
    applyCalView();
  }
  if (document.getElementById("panel-inventory").classList.contains("active")) {
    renderInventory();
  }
  if (document.getElementById("panel-scoreboard").classList.contains("active")) {
    renderScoreboard();
  }
  if (document.getElementById("panel-store").classList.contains("active")) {
    renderStore();
  }
  if (document.getElementById("panel-life").classList.contains("active")) {
    renderLife();
  }
  renderPetStats();
}

/* ============ Inventory ============ */
const INV_STORAGE_KEY = "ledger.inventory.v1";
const INV_CATEGORIES = ["Electronics", "Food & Drinks", "Clothing", "Office Supplies", "Tools", "Furniture", "Other"];
let inventory = loadInventory();
let activeInvFilter = "all";
let expandedInvId = null;

function loadInventory() {
  try {
    const raw = localStorage.getItem(INV_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Could not read inventory:", e);
    return [];
  }
}

function saveInventory() {
  try {
    localStorage.setItem(INV_STORAGE_KEY, JSON.stringify(inventory));
  } catch (e) {
    console.error("Could not save inventory:", e);
    showToast(t("toast_cantSave"));
  }
  scheduleCloudSave();
}

// Populate category select
(function initInvCategories() {
  const sel = document.getElementById("invItemCat");
  INV_CATEGORIES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });

  // Populate filter chips
  const filters = document.getElementById("invFilters");
  filters.innerHTML = "";
  const allChip = document.createElement("button");
  allChip.className = "chip-filter active";
  allChip.dataset.filter = "all";
  allChip.textContent = t("inv_all");
  filters.appendChild(allChip);
  t("inv_categories").forEach((c, i) => {
    const chip = document.createElement("button");
    chip.className = "chip-filter";
    chip.dataset.filter = INV_CATEGORIES[i];
    chip.textContent = c;
    filters.appendChild(chip);
  });
})();

document.getElementById("invFilters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip-filter");
  if (!chip) return;
  document.querySelectorAll("#invFilters .chip-filter").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  activeInvFilter = chip.dataset.filter;
  renderInventory();
});

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
    list.innerHTML = `<div class="empty-state"><span>${t("dash_empty")}</span>${activeInvFilter !== "all" ? t("inv_noCategory") : t("inv_addFirst")}</div>`;
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

// Inventory modal
const invModalOverlay = document.getElementById("invModalOverlay");
const invForm = document.getElementById("invForm");

function openInvModal(itemId) {
  invForm.reset();
  document.getElementById("invAccList").innerHTML = "";
  const deleteBtn = document.getElementById("invDeleteBtn");
  invImageData = null;
  document.getElementById("invImagePreview").style.display = "none";
  document.getElementById("invImageRemove").style.display = "none";
  document.getElementById("invImageName").textContent = t("invImageNoFile");

  if (itemId) {
    const item = inventory.find(i => i.id === itemId);
    document.getElementById("invModalTitle").textContent = t("invModal_edit");
    document.getElementById("invItemId").value = item.id;
    document.getElementById("invItemName").value = item.name;
    document.getElementById("invItemDesc").value = item.description || "";
    document.getElementById("invItemPrice").value = item.price || 0;
    document.getElementById("invItemQty").value = item.quantity;
    document.getElementById("invItemCat").value = item.category;
    document.getElementById("invItemEffectStat").value = item.effectStat || "";
    document.getElementById("invItemEffectAmount").value = item.effectAmount || 0;
    document.getElementById("invItemConsumable").checked = !!item.consumable;
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
  } else {
    document.getElementById("invModalTitle").textContent = t("invModal_add");
    document.getElementById("invItemId").value = "";
    document.getElementById("invItemQty").value = 1;
    document.getElementById("invItemPrice").value = 0;
    document.getElementById("invItemCat").value = INV_CATEGORIES[0];
    deleteBtn.style.display = "none";
    addAccRow("");
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
  const effectStat = document.getElementById("invItemEffectStat").value || "";
  const effectAmount = parseInt(document.getElementById("invItemEffectAmount").value, 10) || 0;
  const consumable = document.getElementById("invItemConsumable").checked;

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

  if (id) {
    const item = inventory.find(i => i.id === id);
    item.name = name;
    item.description = description;
    item.price = price;
    item.quantity = quantity;
    item.category = category;
    item.accessories = accessories;
    item.image = invImageData || null;
    item.effectStat = effectStat;
    item.effectAmount = effectAmount;
    item.consumable = consumable;
    showToast(t("toast_itemUpdated"));
  } else {
    inventory.push({ id: uid(), name, description, price, quantity, category, accessories, image: invImageData || null, effectStat, effectAmount, consumable });
    showToast(t("toast_itemAdded"));
  }

  saveInventory();
  closeInvModal();
  refreshAll();
});

/* ============ Store ============ */
function renderStore() {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  const total = calcTotalPoints();
  document.getElementById("storeAvailPts").textContent = total;
  document.getElementById("storeAvailPts").className = "store-hero-num" + (total < 0 ? " negative" : "");

  // Spent bar
  const spentBar = document.getElementById("storeSpentBar");
  spentBar.innerHTML = `
    <span>${t("store_spentTotal")} <strong>${storeSpent} ${t("store_ptsUsed")}</strong></span>
  `;

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

  let available = inventory.filter(item => item.quantity > 0);
  if (activeStoreFilter !== "all") {
    available = available.filter(item => item.category === activeStoreFilter);
  }

  if (available.length === 0) {
    grid.innerHTML = `<div class="empty-state store-empty"><span>${t("dash_empty")}</span>${t("store_addFirst")}</div>`;
    return;
  }

  available.forEach(item => {
    const card = document.createElement("div");
    card.className = "store-card";

    // Image
    if (item.image) {
      const img = document.createElement("img");
      img.className = "store-card-img";
      img.src = item.image;
      img.alt = item.name;
      card.appendChild(img);
    } else {
      const noImg = document.createElement("div");
      noImg.className = "store-card-noimg";
      noImg.textContent = "\u{1F4E6}";
      card.appendChild(noImg);
    }

    // Body
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

    const qty = document.createElement("div");
    qty.className = "store-card-qty";
    qty.textContent = t("store_qtyLeft")(item.quantity);
    body.appendChild(qty);

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
  const content = document.getElementById("redeemContent");

  const canAfford = total >= item.price;
  const inStock = item.quantity > 0;
  const hasAccessories = item.accessories && item.accessories.length > 0;

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

  content.innerHTML = `
    <p style="margin:0 0 8px;font-size:14px">${t("store_redeemMsg")(item.name, totalPts)}</p>
    <p style="margin:0 0 4px;font-size:13px;color:var(--ink-soft)">${t("store_availPts")}: <strong>${total}</strong></p>
    <p style="margin:0;font-size:12px;color:var(--ink-soft)">${item.price} pts base${hasAccessories ? " + " + item.accessories.reduce((s, a) => s + (a.pts || 0), 0) + " accessories" : ""}</p>
    ${!canAfford ? `<p style="margin:8px 0 0;font-size:13px;color:var(--danger)">${t("store_notEnough")}</p>` : ""}
    ${!inStock ? `<p style="margin:8px 0 0;font-size:13px;color:var(--danger)">${t("store_outOfStock")}</p>` : ""}
    ${accHtml}
  `;

  // Update total when accessory checkboxes change
  if (hasAccessories) {
    content.querySelectorAll(".redeem-acc-check").forEach(cb => {
      cb.addEventListener("change", () => {
        const accTotal = Array.from(content.querySelectorAll(".redeem-acc-check"))
          .filter(c => c.checked)
          .reduce((s, c) => s + (parseInt(c.dataset.accPts) || 0), 0);
        const grandTotal = item.price + accTotal;
        content.querySelector("p:first-child").textContent = t("store_redeemMsg")(item.name, grandTotal);
        const canNow = total >= grandTotal;
        confirmBtn.disabled = !canNow || !inStock;
        confirmBtn.style.opacity = (!canNow || !inStock) ? "0.5" : "1";
      });
    });
  }

  const confirmBtn = document.getElementById("redeemConfirmBtn");
  confirmBtn.disabled = !canAfford || !inStock;
  confirmBtn.style.opacity = (!canAfford || !inStock) ? "0.5" : "1";

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

document.getElementById("redeemConfirmBtn").addEventListener("click", () => {
  if (!currentRedeemItem) return;
  const item = currentRedeemItem;
  const total = calcTotalPoints();

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
  const grandTotal = item.price + selectedAccPts;

  if (total < grandTotal || item.quantity <= 0) return;

  // Deduct points by increasing storeSpent
  storeSpent += grandTotal;
  try { localStorage.setItem(STORE_SPENT_KEY, storeSpent.toString()); } catch (e) {}

  // Record redemption
  redeemed.push({
    itemId: item.id,
    name: item.name,
    image: item.image || null,
    price: item.price,
    category: item.category,
    selectedAccessories: selectedAccIds,
    totalPts: grandTotal,
    redeemedAt: new Date().toISOString(),
  });
  saveRedeemed();

  // Reduce quantity
  item.quantity -= 1;
  saveInventory();

  closeRedeemModal();
  renderStore();
  renderScoreboard();
  showToast(t("store_redeemed"));
});

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

/* ============ Life Tab ============ */
function renderLife() {
  const grid = document.getElementById("lifeGrid");
  grid.innerHTML = "";

  document.getElementById("lifeTotalItems").textContent = redeemed.length;

  if (redeemed.length === 0) {
    grid.innerHTML = `<div class="empty-state life-empty"><span>${t("dash_empty")}</span>${t("life_empty")}</div>`;
    return;
  }

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
    const card = document.createElement("div");
    card.className = "life-card";

    if (item.image) {
      const img = document.createElement("img");
      img.className = "life-card-img";
      img.src = item.image;
      img.alt = item.name;
      card.appendChild(img);
    } else {
      const noImg = document.createElement("div");
      noImg.className = "life-card-noimg";
      noImg.textContent = "\u2728";
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

    // Check if this item has a stat effect
    const invItem = inventory.find(i => i.id === item.itemId);
    if (invItem && invItem.effectStat && invItem.effectAmount > 0) {
      const useBtn = document.createElement("button");
      useBtn.className = "btn btn-primary btn-small life-use-btn";
      const statIcon = { energy: "⚡", hunger: "🍽", thirst: "💧", health: "❤️" }[invItem.effectStat] || "✦";
      useBtn.textContent = `Use ${statIcon} +${invItem.effectAmount} ${invItem.effectStat}`;

      // Check cooldown for non-consumable
      if (!invItem.consumable) {
        const usage = petStats.lastUsed[invItem.id];
        const now = Date.now();
        const COOLDOWN_MS = 24 * 60 * 60 * 1000;
        if (usage && usage.count >= 2 && (now - usage.firstUse) < COOLDOWN_MS) {
          const hoursLeft = Math.ceil((COOLDOWN_MS - (now - usage.firstUse)) / (1000 * 60 * 60));
          useBtn.disabled = true;
          useBtn.textContent = `⏳ Cooldown (${hoursLeft}h)`;
          useBtn.classList.add("cooldown");
        }
      }

      useBtn.addEventListener("click", () => useItemOnPet(item));
      body.appendChild(useBtn);
    }

    // Show consumable badge
    if (invItem && invItem.consumable) {
      const badge = document.createElement("span");
      badge.className = "life-card-badge consumable";
      badge.textContent = "Consumable";
      body.appendChild(badge);
    }

    card.appendChild(body);
    grid.appendChild(card);
  });
}

/* ============ Pet Stats UI ============ */
function renderPetStats() {
  const energyBar = document.getElementById("statEnergyBar");
  const hungerBar = document.getElementById("statHungerBar");
  const thirstBar = document.getElementById("statThirstBar");
  const healthBar = document.getElementById("statHealthBar");
  const energyVal = document.getElementById("statEnergyVal");
  const hungerVal = document.getElementById("statHungerVal");
  const thirstVal = document.getElementById("statThirstVal");
  const healthVal = document.getElementById("statHealthVal");
  const warning = document.getElementById("petWarning");
  const avatar = document.getElementById("petAvatar");
  const levelEl = document.getElementById("petLevel");

  if (!energyBar) return;

  const stats = [
    { el: energyBar, val: energyVal, stat: petStats.energy, color: "#f59e0b" },
    { el: hungerBar, val: hungerVal, stat: petStats.hunger, color: "#ef4444" },
    { el: thirstBar, val: thirstVal, stat: petStats.thirst, color: "#3b82f6" },
    { el: healthBar, val: healthVal, stat: petStats.health, color: "#10b981" },
  ];

  const avg = (petStats.energy + petStats.hunger + petStats.thirst + petStats.health) / 4;

  stats.forEach(({ el, val, stat }) => {
    const v = Math.round(clampStat(stat));
    el.style.width = v + "%";
    val.textContent = v;
    val.style.color = v > 50 ? "inherit" : v > 25 ? "#f59e0b" : "#ef4444";
    // Critical pulse
    if (v <= 20) {
      el.classList.add("critical");
    } else {
      el.classList.remove("critical");
    }
  });

  // Update pet avatar based on average health
  if (avg > 70) {
    avatar.textContent = "🐣";
  } else if (avg > 40) {
    avatar.textContent = "🐥";
  } else if (avg > 20) {
    avatar.textContent = "🐤";
  } else {
    avatar.textContent = "😿";
  }

  // Calculate level based on total points earned (simple: level = floor(avg / 10))
  const level = Math.max(1, Math.floor(avg / 10));
  levelEl.textContent = "Lvl " + level;

  // Show warnings
  if (petStats.health < 20) {
    warning.style.display = "flex";
    warning.textContent = "Your pet is in poor health! Feed and hydrate them.";
    warning.className = "pet-warning danger";
  } else if (petStats.energy < 15 || petStats.hunger < 15 || petStats.thirst < 15) {
    warning.style.display = "flex";
    const low = [];
    if (petStats.energy < 15) low.push("energy");
    if (petStats.hunger < 15) low.push("hunger");
    if (petStats.thirst < 15) low.push("thirst");
    warning.textContent = `Low ${low.join(" and ")}! Use items to restore.`;
    warning.className = "pet-warning warn";
  } else {
    warning.style.display = "none";
  }
}

function useItemOnPet(redeemedEntry) {
  // Find the original inventory item to get effect info
  const invItem = inventory.find(i => i.id === redeemedEntry.itemId);
  if (!invItem || !invItem.effectStat || !invItem.effectAmount) return;

  const stat = invItem.effectStat;
  const amount = invItem.effectAmount;
  const now = Date.now();
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;

  // Check cooldown for non-consumable items (2 uses per day, 24h cooldown)
  if (!invItem.consumable) {
    const usageKey = invItem.id; // use inventory id for non-consumable tracking
    const usage = petStats.lastUsed[usageKey];
    if (usage) {
      if (usage.count >= 2 && (now - usage.firstUse) < COOLDOWN_MS) {
        showToast("Wait 24h before using this item again");
        return;
      }
      // Reset count if cooldown expired
      if ((now - usage.firstUse) >= COOLDOWN_MS) {
        delete petStats.lastUsed[usageKey];
      }
    }
  }

  // Apply effect
  petStats[stat] = clampStat(petStats[stat] + amount);
  petStats.lastDecay = now;

  // Handle consumable: remove one redeemed entry for this item
  if (invItem.consumable) {
    const idx = redeemed.findIndex(r => r.itemId === invItem.id);
    if (idx !== -1) redeemed.splice(idx, 1);
    saveRedeemed();
    showToast(`Used ${invItem.name} — ${stat} +${amount}`);
  } else {
    // Track usage for cooldown (keyed by inventory item id)
    const usageKey = invItem.id;
    if (!petStats.lastUsed[usageKey]) {
      petStats.lastUsed[usageKey] = { count: 1, firstUse: now };
    } else {
      petStats.lastUsed[usageKey].count++;
    }
    const usesLeft = 2 - petStats.lastUsed[usageKey].count;
    showToast(`Used ${invItem.name} — ${stat} +${amount}${usesLeft > 0 ? ` (${usesLeft} uses left)` : ""}`);
  }

  savePetStats();
  renderPetStats();
  renderLife();
}

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

/* ============ Init ============ */
applyTheme();
initNotifications();
refreshAll();
setInterval(refreshAll, 60000);
setInterval(checkAlarms, 15000);
setInterval(saveFiredAlarms, 30000);

// Handle PWA shortcuts (from manifest.json)
(function handleShortcuts() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action");
  if (action === "new-entry") {
    setTimeout(() => document.getElementById("quickAddBtn")?.click(), 300);
  } else if (action === "store" || action === "life") {
    setTimeout(() => {
      const btn = document.querySelector(`[data-tab="${action}"]`);
      if (btn) btn.click();
    }, 300);
  }
  // Clean URL
  if (action) {
    window.history.replaceState({}, "", window.location.pathname);
  }
})();

// Load default inventory if none exists
if (inventory.length === 0) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "default-inventory.json", false);
    xhr.send();
    if (xhr.status === 200 || xhr.status === 0) {
      const data = JSON.parse(xhr.responseText);
      if (Array.isArray(data) && data.length > 0) {
        inventory = data;
        saveInventory();
      }
    }
  } catch (e) {}
  refreshAll();
}

/* ============ PWA — Service Worker Registration ============ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      // Check for updates periodically (every hour)
      setInterval(() => reg.update(), 60 * 60 * 1000);
      // Listen for new service worker activation
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (newSW) {
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              showToast("App updated! Refresh for the latest version.");
            }
          });
        }
      });
    }).catch(() => {});
  });
}

/* ============ PWA — Install Prompt ============ */
let deferredInstallPrompt = null;
const installBanner = document.getElementById("installBanner");
const installBtn = document.getElementById("installBtn");
const installDismiss = document.getElementById("installDismiss");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Show install banner after 3 seconds (only if not already dismissed)
  if (!sessionStorage.getItem("gol-install-dismissed")) {
    setTimeout(() => {
      if (deferredInstallPrompt && installBanner) {
        installBanner.style.display = "block";
      }
    }, 3000);
  }
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (installBanner) installBanner.style.display = "none";
  });
}

if (installDismiss) {
  installDismiss.addEventListener("click", () => {
    if (installBanner) installBanner.style.display = "none";
    deferredInstallPrompt = null;
    sessionStorage.setItem("gol-install-dismissed", "1");
  });
}

window.addEventListener("appinstalled", () => {
  if (installBanner) installBanner.style.display = "none";
  deferredInstallPrompt = null;
});
