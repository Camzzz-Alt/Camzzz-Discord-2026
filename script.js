// ============================================================
// FIREBASE INIT
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyAT_AOEJ5heuNkiBnbJsW2SYwGNDSmUfjE",
  authDomain: "camzzzchatroom.firebaseapp.com",
  databaseURL: "https://camzzzchatroom-default-rtdb.firebaseio.com",
  projectId: "camzzzchatroom",
  storageBucket: "camzzzchatroom.appspot.com",
  messagingSenderId: "591050447597",
  appId: "1:591050447597:web:76e045e32ed0e4e6e0cae4"
};
try { firebase.initializeApp(firebaseConfig); } catch(e) {}
const auth = firebase.auth();
const db   = firebase.database();

// ============================================================
// CONSTANTS
// ============================================================
const WEEK_MS   = 7 * 24 * 60 * 60 * 1000;
const IMGBB_KEY = "7ae7b64cb4da961ab6a7d18d920099a8";

// Built-in tags
const BUILTIN_TAG_STYLES = {
  "Mod":                   { color: "#ff4444", bg: "rgba(255,68,68,0.15)",   border: "rgba(255,68,68,0.35)"   },
  "Admin":                 { color: "#ff9900", bg: "rgba(255,153,0,0.15)",   border: "rgba(255,153,0,0.35)"   },
  "SN":                    { color: "#5b8aff", bg: "rgba(91,138,255,0.15)",  border: "rgba(91,138,255,0.35)"  },
  "VIP":                   { color: "#ffd700", bg: "rgba(255,215,0,0.15)",   border: "rgba(255,215,0,0.35)"   },
  "Friend":                { color: "#57f287", bg: "rgba(87,242,135,0.15)",  border: "rgba(87,242,135,0.35)"  },
  "Tester":                { color: "#00ffff", bg: "rgba(0,255,255,0.15)",   border: "rgba(0,255,255,0.35)"   },
  "Owner":                 { color: "#ffffff", bg: "rgba(255,255,255,0.1)",  border: "rgba(255,255,255,0.25)" },
  "Dev":                   { color: "#888888", bg: "rgba(136,136,136,0.15)", border: "rgba(136,136,136,0.3)"  },
  "Jobless":               { color: "#a0522d", bg: "rgba(160,82,45,0.15)",   border: "rgba(160,82,45,0.35)"   },
  "Asked for Tag":         { color: "#808080", bg: "rgba(128,128,128,0.12)", border: "rgba(128,128,128,0.28)" },
  "Gay":                   { color: null,      bg: "rgba(255,100,100,0.1)",  border: "rgba(255,100,100,0.2)", rainbow: true },
  "67":                    { color: "#ff69b4", bg: "rgba(255,105,180,0.15)", border: "rgba(255,105,180,0.35)" },
  "Private Channel Access":{ color: "#a78bfa", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)" },
};

let TAG_STYLES = { ...BUILTIN_TAG_STYLES };
let availableTags = Object.keys(BUILTIN_TAG_STYLES);

const PRIVATE_CHANNEL_TAG = "Private Channel Access";
const MOD_TAGS = ["Mod", "Admin", "Owner"];
// Tags mods cannot add or remove (only admins/owners can touch these)
const MOD_PROTECTED_TAGS = ["Mod", "Admin", "Owner", "Dev", "VIP"];

// ============================================================
// STATE
// ============================================================
let currentUser     = null;
let currentUserId   = null;
let currentUsername = "Guest";
let myColor         = "#5865f2";
let myAvatar        = null;
let myTags          = [];
let currentServer   = "server1";
let dbListeners     = {};
let displayedMessages = {};
let allUsersCache   = {};

let replyingTo      = null;
let typingTimer     = null;
let isTyping        = false;
let adminSelectedMs = null;
let modSelectedMs   = null;
let adminSelectedTag = null;
let modSelectedTag   = null;
let unreadServers   = new Set();
let userScrolledUp  = false;
let sendingInProgress = false;
let lastSentTime    = 0;

// ============================================================
// DOM HELPERS
// ============================================================
const $  = id => document.getElementById(id);
const showError  = (el, msg) => { el.textContent = msg; el.classList.add("show"); };
const clearError = el => { el.textContent = ""; el.classList.remove("show"); };

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function stripHtml(html) {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent || d.innerText || "";
}
function encodeEmoji(e) {
  return [...e].map(c => c.codePointAt(0).toString(16)).join("_");
}
function friendlyAuthError(code) {
  return ({
    "auth/user-not-found":       "No account with that email.",
    "auth/wrong-password":       "Incorrect password.",
    "auth/invalid-email":        "Invalid email address.",
    "auth/too-many-requests":    "Too many attempts — try again later.",
    "auth/email-already-in-use": "That email is already in use.",
    "auth/invalid-credential":   "Incorrect email or password.",
  })[code] || "Something went wrong. Try again.";
}

// ============================================================
// TAG HELPERS
// ============================================================
function getTagStyle(tag) {
  return TAG_STYLES[tag] || { color: "#aaaaaa", bg: "rgba(170,170,170,0.12)", border: "rgba(170,170,170,0.25)" };
}

function applyTagStyleToEl(el, tag) {
  const s = getTagStyle(tag);
  if (s.rainbow) {
    el.style.background = "linear-gradient(to right,rgba(255,68,68,0.15),rgba(255,153,0,0.15),rgba(87,242,135,0.15),rgba(91,138,255,0.15))";
    el.style.borderColor = "rgba(255,100,100,0.3)";
  } else {
    if (s.color)  el.style.color = s.color;
    if (s.bg)     el.style.background = s.bg;
    if (s.border) el.style.borderColor = s.border;
  }
}

// Render a tag as an inline span with glow — matches old style
function renderTagSpan(tag) {
  const s = getTagStyle(tag);
  if (s.rainbow) {
    return `<span class="tag-inline tag-gay">[${escapeHtml(tag)}]</span>`;
  }
  const color = s.color || "#aaa";
  const slugClass = "tag-" + tag.toLowerCase().replace(/\s+/g, "-");
  return `<span class="tag-inline ${slugClass}" style="color:${color};text-shadow:0 0 8px ${color}88;">[${escapeHtml(tag)}]</span>`;
}

function loadCustomTags(cb) {
  db.ref("adminData/customTags").on("value", snap => {
    const custom = snap.val() || {};
    TAG_STYLES = { ...BUILTIN_TAG_STYLES };
    availableTags = [...Object.keys(BUILTIN_TAG_STYLES)];
    Object.entries(custom).forEach(([name, data]) => {
      const c = data.color || "#aaaaaa";
      TAG_STYLES[name] = {
        color: c,
        bg: hexToRgba(c, 0.15),
        border: hexToRgba(c, 0.35),
      };
      if (!availableTags.includes(name)) availableTags.push(name);
    });
    if (cb) cb();
    refreshTagPalettes();
    refreshCustomTagsList();
  });
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
function modConfirm(icon, title, message) {
  return new Promise(resolve => {
    const dialog = $("modConfirmDialog");
    $("confirmIcon").textContent    = icon;
    $("confirmTitle").textContent   = title;
    $("confirmMessage").textContent = message;
    dialog.style.display = "flex";
    const ok  = $("confirmOkBtn");
    const can = $("confirmCancelBtn");
    const newOk  = ok.cloneNode(true);
    const newCan = can.cloneNode(true);
    ok.parentNode.replaceChild(newOk, ok);
    can.parentNode.replaceChild(newCan, can);
    const done = r => { dialog.style.display = "none"; resolve(r); };
    newOk.addEventListener("click",  () => done(true));
    newCan.addEventListener("click", () => done(false));
  });
}

// ============================================================
// CLIPBOARD
// ============================================================
function copyToClipboard(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = el.innerHTML;
    el.classList.add("copied");
    el.innerHTML = "✓ Copied!";
    setTimeout(() => { el.innerHTML = orig; el.classList.remove("copied"); }, 1500);
  });
}

// ============================================================
// MOD ACTION LOG
// ============================================================
function logModAction(action) {
  db.ref("adminData/modLogs").push({ ...action, ts: Date.now() });
}

// ============================================================
// AUTH NAVIGATION
// ============================================================
function showCard(which) {
  ["loginCard","signupCard","verifyCard","googleUsernameCard"].forEach(id => {
    $(id).style.display = "none";
  });
  $({login:"loginCard", signup:"signupCard", verify:"verifyCard", googleUsername:"googleUsernameCard"}[which]).style.display = "";
  clearError($("loginError"));
  clearError($("signupError"));
  if ($("googleUsernameError")) clearError($("googleUsernameError"));
}

$("showSignupBtn").addEventListener("click",  e => { e.preventDefault(); showCard("signup"); });
$("showLoginBtn").addEventListener("click",   e => { e.preventDefault(); showCard("login"); });
$("backToLoginBtn").addEventListener("click", e => { e.preventDefault(); showCard("login"); });

// ============================================================
// USERNAME AVAILABILITY
// ============================================================
function checkUsernameAvailable(name, excludeUid, cb) {
  db.ref("adminData/allUsers").once("value", snap => {
    const users = snap.val() || {};
    const lower = name.toLowerCase();
    let taken = false;
    for (const id in users) {
      if (id === excludeUid) continue;
      if ((users[id].username || "").toLowerCase() === lower) { taken = true; break; }
    }
    cb(!taken);
  });
}

let usernameCheckTimer = null;
function setupLiveUsernameCheck(inputEl, hintEl, excludeUid = null) {
  inputEl.addEventListener("input", () => {
    clearTimeout(usernameCheckTimer);
    const val = inputEl.value.trim();
    if (!val) { hintEl.textContent = ""; hintEl.className = "field-hint"; return; }
    hintEl.textContent = "Checking..."; hintEl.className = "field-hint";
    usernameCheckTimer = setTimeout(() => {
      checkUsernameAvailable(val, excludeUid, ok => {
        hintEl.textContent = ok ? "✓ Available" : "✗ Already taken";
        hintEl.className   = "field-hint " + (ok ? "ok" : "taken");
      });
    }, 400);
  });
}
setupLiveUsernameCheck($("signupUsername"), $("usernameCheck"));
setupLiveUsernameCheck($("googleUsername"), $("googleUsernameCheck"));

// ============================================================
// GOOGLE AUTH
// ============================================================
let pendingGoogleUser = null;
async function handleGoogleAuth() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user   = result.user;
    const snap   = await db.ref(`adminData/allUsers/${user.uid}`).once("value");
    if (!snap.exists()) {
      pendingGoogleUser = user;
      $("googleUsername").value = "";
      $("googleUsernameCheck").textContent = "";
      showCard("googleUsername");
      $("googleUsername").focus();
    }
  } catch(err) { showError($("loginError"), err.message); }
}
$("googleSignInBtn").addEventListener("click", handleGoogleAuth);
$("googleSignUpBtn").addEventListener("click", handleGoogleAuth);

$("googleUsernameConfirmBtn").addEventListener("click", async () => {
  clearError($("googleUsernameError"));
  const name = $("googleUsername").value.trim();
  if (!name || name.length < 2) return showError($("googleUsernameError"), "Username must be at least 2 characters.");
  checkUsernameAvailable(name, pendingGoogleUser?.uid, async available => {
    if (!available) return showError($("googleUsernameError"), "That username is already taken.");
    if (!pendingGoogleUser) return showError($("googleUsernameError"), "Something went wrong.");
    await db.ref(`adminData/allUsers/${pendingGoogleUser.uid}`).set({
      username: name, usernameColor: "#5865f2", lastUsernameChange: 0, email: pendingGoogleUser.email || ""
    });
    pendingGoogleUser = null;
  });
});

// ============================================================
// EMAIL SIGNUP / LOGIN
// ============================================================
$("signupBtn").addEventListener("click", async () => {
  clearError($("signupError"));
  const name  = $("signupUsername").value.trim();
  const email = $("signupEmail").value.trim();
  const pass  = $("signupPassword").value;
  if (!name || name.length < 2) return showError($("signupError"), "Username must be at least 2 characters.");
  if (!email) return showError($("signupError"), "Please enter your email.");
  if (!pass || pass.length < 6) return showError($("signupError"), "Password must be at least 6 characters.");
  checkUsernameAvailable(name, null, async available => {
    if (!available) return showError($("signupError"), "That username is already taken.");
    try {
      const result = await auth.createUserWithEmailAndPassword(email, pass);
      await result.user.sendEmailVerification();
      await db.ref(`adminData/allUsers/${result.user.uid}`).set({
        username: name, usernameColor: "#5865f2", lastUsernameChange: 0, email
      });
      $("verifyEmailAddr").textContent = email;
      showCard("verify");
    } catch(err) { showError($("signupError"), friendlyAuthError(err.code)); }
  });
});

$("loginBtn").addEventListener("click", async () => {
  clearError($("loginError"));
  $("verifyNotice").style.display = "none";
  const email = $("loginEmail").value.trim();
  const pass  = $("loginPassword").value;
  if (!email || !pass) return showError($("loginError"), "Please fill in all fields.");
  try {
    const result = await auth.signInWithEmailAndPassword(email, pass);
    if (!result.user.emailVerified) {
      await auth.signOut();
      $("verifyNotice").style.display = "block";
      showError($("loginError"), "Please verify your email before signing in.");
    }
  } catch(err) { showError($("loginError"), friendlyAuthError(err.code)); }
});

$("loginEmail").addEventListener("keydown",    e => { if (e.key === "Enter") $("loginBtn").click(); });
$("loginPassword").addEventListener("keydown", e => { if (e.key === "Enter") $("loginBtn").click(); });

$("resendVerifyBtn").addEventListener("click", async e => {
  e.preventDefault();
  try {
    const r = await auth.signInWithEmailAndPassword($("loginEmail").value.trim(), $("loginPassword").value);
    await r.user.sendEmailVerification();
    await auth.signOut();
    $("verifyNotice").textContent = "✓ Verification email sent!";
  } catch(err) { showError($("loginError"), err.message); }
});

$("resendVerifyBtn2").addEventListener("click", async () => {
  const u = auth.currentUser;
  if (u) {
    await u.sendEmailVerification();
    $("resendVerifyBtn2").textContent = "✓ Sent!";
    setTimeout(() => { $("resendVerifyBtn2").textContent = "Resend Email"; }, 3000);
  }
});

// ============================================================
// AUTH STATE
// ============================================================
auth.onAuthStateChanged(async user => {
  if (!user) {
    $("authScreen").style.display   = "flex";
    $("appContainer").style.display = "none";
    $("loadingScreen").style.display = "none";
    showCard("login");
    return;
  }
  const isGoogle = user.providerData[0]?.providerId === "google.com";
  if (!isGoogle && !user.emailVerified) { await auth.signOut(); return; }
  const snap = await db.ref(`adminData/allUsers/${user.uid}`).once("value");
  if (!snap.exists()) return;
  currentUser   = user;
  currentUserId = user.uid;
  $("authScreen").style.display = "none";
  startApp();
});

// ============================================================
// LOGOUT
// ============================================================
$("logoutBtn").addEventListener("click", () => {
  cleanupPresence();
  setTyping(false);
  Object.values(dbListeners).forEach(({ ref: r, listener: l }) => r && r.off && r.off("child_added", l));
  dbListeners = {};
  auth.signOut();
});

// ============================================================
// START APP
// ============================================================
function startApp() {
  $("loadingScreen").style.display = "flex";
  $("appContainer").style.display  = "none";
  loadCustomTags(() => {
    db.ref(`adminData/allUsers/${currentUserId}`).once("value", snap => {
      const data      = snap.val() || {};
      currentUsername = data.username || currentUser.displayName || "Guest";
      myColor         = data.usernameColor || "#5865f2";
      myAvatar        = data.avatarUrl || null;
      buildSidebar();
      loadMyTags(() => {
        runLoadingCountdown();
      });
    });
  });
}

function loadMyTags(cb) {
  db.ref(`adminData/userTags/${currentUserId}`).on("value", snap => {
    myTags = snap.val() || [];
    updateUserPanel();
    buildSpecialChannelButtons();
    if (cb) { cb(); cb = null; }
  });
}

function runLoadingCountdown() {
  const bar  = $("countdownBar");
  const text = $("countdownText");
  let t = 3;
  text.textContent = "3s";
  const iv = setInterval(() => {
    t -= 0.1;
    bar.style.width = ((3 - t) / 3 * 100) + "%";
    text.textContent = Math.ceil(t) + "s";
    if (t <= 0) {
      clearInterval(iv);
      $("loadingScreen").style.display = "none";
      $("appContainer").style.display  = "flex";
      switchServer("server1");
      setupMenuTriggers();
      setupPresence();
    }
  }, 100);
}

// ============================================================
// SIDEBAR BUILD
// ============================================================
function buildSidebar() {
  buildColorPicker();
  buildThemeColorPicker();
  buildTextSizePicker();
  setupAvatarUpload();
}

function buildSpecialChannelButtons() {
  const privBtn = $("privateChannelBtn");
  privBtn.innerHTML = "";
  if (myTags.includes(PRIVATE_CHANNEL_TAG) || myTags.includes("Owner") || myTags.includes("Admin")) {
    const btn = document.createElement("button");
    btn.className = "serverBtn";
    btn.setAttribute("data-server", "private");
    btn.innerHTML = `<span class="channel-hash">#</span><span class="channel-label">private</span><span class="unread-dot" id="unread-private" style="display:none;"></span>`;
    btn.addEventListener("click", () => switchServer("private"));
    privBtn.appendChild(btn);
  }

  const modBtn = $("modChatBtn");
  modBtn.innerHTML = "";
  const hasMod = myTags.some(t => MOD_TAGS.includes(t));
  if (hasMod) {
    const btn = document.createElement("button");
    btn.className = "serverBtn";
    btn.setAttribute("data-server", "modchat");
    btn.innerHTML = `<span class="channel-hash">#</span><span class="channel-label">mod-chat</span><span class="unread-dot" id="unread-modchat" style="display:none;"></span>`;
    btn.addEventListener("click", () => switchServer("modchat"));
    modBtn.appendChild(btn);
  }
}

function buildColorPicker() {
  const wrap = $("colorPickerBtn");
  wrap.innerHTML = "";
  const picker = document.createElement("input");
  picker.type = "color";
  picker.value = myColor;
  picker.style.cssText = "position:absolute;opacity:0;pointer-events:none;width:0;height:0;";
  const dot = document.createElement("span");
  dot.style.cssText = `display:inline-block;width:11px;height:11px;border-radius:50%;background:${myColor};flex-shrink:0;transition:transform 0.2s;`;
  const btn = document.createElement("button");
  btn.className = "sidebar-ctrl-btn";
  btn.appendChild(dot);
  btn.appendChild(Object.assign(document.createElement("span"), { textContent: " Username Color" }));
  btn.addEventListener("click", () => picker.click());
  btn.addEventListener("mouseenter", () => dot.style.transform = "scale(1.3)");
  btn.addEventListener("mouseleave", () => dot.style.transform = "scale(1)");
  picker.addEventListener("input", e => {
    myColor = e.target.value;
    dot.style.background = myColor;
    db.ref(`adminData/allUsers/${currentUserId}`).update({ usernameColor: myColor });
    updateUserPanel();
  });
  wrap.appendChild(btn);
  wrap.appendChild(picker);
}

function buildThemeColorPicker() {
  const section = $("themeColorSection");
  section.innerHTML = "";
  const picker = document.createElement("input");
  picker.type = "color";
  picker.value = localStorage.getItem("themeColor") || "#26282d";
  picker.style.cssText = "position:absolute;opacity:0;pointer-events:none;width:0;height:0;";
  const btn = document.createElement("button");
  btn.className = "sidebar-ctrl-btn";
  btn.textContent = "🎨 Chat Background";
  btn.addEventListener("click", () => picker.click());
  picker.addEventListener("input", e => {
    localStorage.setItem("themeColor", e.target.value);
    $("chatbox").style.backgroundColor = e.target.value;
  });
  const saved = localStorage.getItem("themeColor");
  if (saved) $("chatbox").style.backgroundColor = saved;
  section.appendChild(btn);
  section.appendChild(picker);
}

function buildTextSizePicker() {
  const section = $("textSizeSection");
  section.innerHTML = `<div class="sidebar-section-label sub">TEXT SIZE</div>`;
  const row = document.createElement("div");
  row.className = "text-size-row";
  const savedSize = localStorage.getItem("textSize") || "14px";
  applyTextSize(savedSize);
  ["12px","14px","16px","18px"].forEach(size => {
    const btn = document.createElement("button");
    btn.className = "size-btn" + (savedSize === size ? " active" : "");
    btn.textContent = size;
    btn.addEventListener("click", () => {
      applyTextSize(size);
      localStorage.setItem("textSize", size);
      row.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
    row.appendChild(btn);
  });
  section.appendChild(row);
}

function applyTextSize(size) {
  $("chatbox").style.fontSize = size;
}

function updateUserPanel() {
  $("sidebarUsername").textContent = currentUsername;
  $("sidebarUsername").style.color = myColor;
  updateSidebarAvatar();

  // Tags in their own sidebar section (under text size)
  const tagsSection = $("sidebarTagsSection");
  tagsSection.innerHTML = "";
  if (myTags.length > 0) {
    const label = document.createElement("div");
    label.className = "sidebar-section-label sub";
    label.textContent = "YOUR TAGS";
    tagsSection.appendChild(label);
    const pillsWrap = document.createElement("div");
    pillsWrap.className = "sidebar-tags-wrap";
    myTags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "sidebar-tag-pill";
      applyTagStyleToEl(span, tag);
      span.textContent = tag;
      const s = getTagStyle(tag);
      if (s.rainbow) {
        span.style.background = "linear-gradient(to right,rgba(255,68,68,0.15),rgba(255,153,0,0.15),rgba(87,242,135,0.15),rgba(91,138,255,0.15))";
        span.style.borderColor = "rgba(255,100,100,0.3)";
        span.style.color = "#fff";
      }
      pillsWrap.appendChild(span);
    });
    tagsSection.appendChild(pillsWrap);
  }
}

function updateSidebarAvatar() {
  const av = $("sidebarAvatar");
  av.innerHTML = "";
  av.style.background = "";
  if (myAvatar) {
    const img = document.createElement("img");
    img.src = myAvatar;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;";
    img.onerror = () => { av.innerHTML = ""; av.textContent = currentUsername.charAt(0).toUpperCase(); av.style.background = `linear-gradient(135deg,${myColor}cc,${myColor}66)`; };
    av.appendChild(img);
  } else {
    av.textContent = currentUsername.charAt(0).toUpperCase();
    av.style.background = `linear-gradient(135deg,${myColor}cc,${myColor}66)`;
  }
}

// ============================================================
// AVATAR UPLOAD
// ============================================================
function setupAvatarUpload() {
  const wrap = $("sidebarAvatarWrap");
  wrap.style.cursor = "pointer";
  wrap.addEventListener("click", () => $("avatarFileInput").click());
  $("avatarFileInput").addEventListener("change", async () => {
    const file = $("avatarFileInput").files[0];
    if (!file) return;
    $("avatarFileInput").value = "";
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB."); return; }
    wrap.classList.add("uploading");
    const url = await uploadToImgBB(file);
    wrap.classList.remove("uploading");
    if (!url) return;
    myAvatar = url;
    await db.ref(`adminData/allUsers/${currentUserId}`).update({ avatarUrl: url });
    updateSidebarAvatar();
  });
}

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: formData });
    const json = await res.json();
    return json.success ? json.data.url : null;
  } catch(e) { alert("Upload failed: " + e.message); return null; }
}

// ============================================================
// USERNAME CHANGE
// ============================================================
$("changeUsernameBtn").addEventListener("click", async () => {
  const snap = await db.ref(`adminData/allUsers/${currentUserId}/lastUsernameChange`).once("value");
  const last = snap.val() || 0;
  const diff = Date.now() - last;
  if (diff < WEEK_MS) {
    const rem  = WEEK_MS - diff;
    const days = Math.floor(rem / (24*60*60*1000));
    const hrs  = Math.floor((rem % (24*60*60*1000)) / (60*60*1000));
    $("usernameChangeCooldown").textContent = `⏳ Next change in ${days}d ${hrs}h`;
    $("usernameChangeInput").disabled  = true;
    $("usernameChangeSaveBtn").disabled = true;
  } else {
    $("usernameChangeCooldown").textContent = "✓ Change available";
    $("usernameChangeInput").disabled  = false;
    $("usernameChangeSaveBtn").disabled = false;
  }
  $("usernameChangeInput").value = currentUsername;
  $("usernameChangeBar").style.display = "block";
  if (!$("usernameChangeInput").disabled) $("usernameChangeInput").focus();
});
$("usernameChangeCancelBtn").addEventListener("click", () => { $("usernameChangeBar").style.display = "none"; });
$("usernameChangeSaveBtn").addEventListener("click", async () => {
  const newName = $("usernameChangeInput").value.trim();
  if (!newName || newName.length < 2) return alert("Username must be at least 2 characters.");
  if (newName === currentUsername) { $("usernameChangeBar").style.display = "none"; return; }
  const snap = await db.ref(`adminData/allUsers/${currentUserId}/lastUsernameChange`).once("value");
  if (Date.now() - (snap.val() || 0) < WEEK_MS) return alert("You can only change your username once per week.");
  checkUsernameAvailable(newName, currentUserId, async available => {
    if (!available) return alert("That username is already taken.");
    currentUsername = newName;
    await db.ref(`adminData/allUsers/${currentUserId}`).update({ username: newName, lastUsernameChange: Date.now() });
    updateUserPanel();
    $("usernameChangeBar").style.display = "none";
  });
});

// ============================================================
// BETA WARNING
// ============================================================
const betaWarn = $("betaWarning");
if (betaWarn) {
  betaWarn.addEventListener("click", () => {
    betaWarn.style.opacity = "0";
    betaWarn.style.transform = "scale(0.9)";
    setTimeout(() => betaWarn.style.display = "none", 300);
  });
}

// ============================================================
// ONLINE PRESENCE
// ============================================================
function setupPresence() {
  const presenceRef  = db.ref(`presence/${currentUserId}`);
  const connectedRef = db.ref(".info/connected");
  connectedRef.on("value", snap => {
    if (!snap.val()) return;
    presenceRef.onDisconnect().remove();
    presenceRef.set({ username: currentUsername, color: myColor, online: true });
  });
  db.ref("presence").on("value", snap => {
    $("onlineCountNum").textContent = snap.numChildren();
  });
}
function cleanupPresence() {
  if (currentUserId) db.ref(`presence/${currentUserId}`).remove();
  db.ref("presence").off();
  db.ref(".info/connected").off();
}

// ============================================================
// TYPING INDICATOR
// ============================================================
function setTyping(active) {
  if (!currentUserId) return;
  const ref = db.ref(`typing/${currentServer}/${currentUserId}`);
  active ? ref.set({ username: currentUsername, ts: Date.now() }) : ref.remove();
}

function setupTypingListener() {
  db.ref(`typing/${currentServer}`).off();
  db.ref(`typing/${currentServer}`).on("value", snap => {
    const typers = snap.val() || {};
    const names  = Object.entries(typers).filter(([uid]) => uid !== currentUserId).map(([,v]) => v.username);
    if (names.length === 0) {
      $("typingIndicator").style.display = "none";
    } else {
      $("typingIndicator").style.display = "flex";
      $("typingText").textContent = names.length === 1 ? `${names[0]} is typing...`
        : names.length === 2 ? `${names[0]} and ${names[1]} are typing...`
        : `${names.length} people are typing...`;
    }
  });
}

$("msgInput").addEventListener("input", () => {
  if (!isTyping) { isTyping = true; setTyping(true); }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => { isTyping = false; setTyping(false); }, 3000);
});

// ============================================================
// REPLY
// ============================================================
function setReply(messageId, name, text) {
  replyingTo = { messageId, name, text };
  $("replyToName").textContent    = name;
  $("replyToPreview").textContent = stripHtml(text).substring(0, 80);
  $("replyBar").style.display     = "block";
  $("msgInput").focus();
}
function clearReply() {
  replyingTo = null;
  $("replyBar").style.display = "none";
}
$("cancelReplyBtn").addEventListener("click", clearReply);

// ============================================================
// @MENTION AUTOCOMPLETE
// ============================================================
let mentionActive = false;

$("msgInput").addEventListener("keyup", e => {
  if (e.key === "Escape") { $("mentionDropdown").style.display = "none"; mentionActive = false; return; }
  const val    = $("msgInput").value;
  const cursor = $("msgInput").selectionStart;
  const before = val.substring(0, cursor);
  const match  = before.match(/@(\w*)$/);
  if (match) {
    mentionActive = true;
    showMentionDropdown(match[1].toLowerCase());
  } else {
    mentionActive = false;
    $("mentionDropdown").style.display = "none";
  }
});

function showMentionDropdown(query) {
  const users = Object.values(allUsersCache).filter(u => u.username && u.username.toLowerCase().startsWith(query)).slice(0, 6);
  if (!users.length) { $("mentionDropdown").style.display = "none"; return; }
  $("mentionDropdown").innerHTML = "";
  users.forEach(u => {
    const item = document.createElement("div");
    item.className = "mention-item";
    const av = buildAvatarEl(u.avatarUrl || null, u.username, u.usernameColor || "#5865f2", 24);
    const name = document.createElement("span");
    name.textContent = u.username;
    name.style.color = u.usernameColor || "#fff";
    name.style.fontWeight = "700";
    item.appendChild(av);
    item.appendChild(name);
    item.addEventListener("click", () => {
      const val    = $("msgInput").value;
      const cursor = $("msgInput").selectionStart;
      const before = val.substring(0, cursor).replace(/@\w*$/, `@${u.username} `);
      $("msgInput").value = before + val.substring(cursor);
      $("msgInput").focus();
      $("mentionDropdown").style.display = "none";
      mentionActive = false;
    });
    $("mentionDropdown").appendChild(item);
  });
  $("mentionDropdown").style.display = "block";
}
document.addEventListener("click", e => {
  if (!$("mentionDropdown").contains(e.target) && e.target !== $("msgInput")) {
    $("mentionDropdown").style.display = "none";
  }
});

// ============================================================
// AVATAR ELEMENT BUILDER
// ============================================================
function buildAvatarEl(avatarUrl, username, color, size = 36) {
  if (avatarUrl) {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:block;`;
    img.onerror = () => img.replaceWith(makeInitialAvatar(username, color, size));
    return img;
  }
  return makeInitialAvatar(username, color, size);
}
function makeInitialAvatar(username, color, size = 36) {
  const div = document.createElement("div");
  div.textContent = (username || "?").charAt(0).toUpperCase();
  div.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${color}cc,${color}66);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.floor(size*0.4)}px;flex-shrink:0;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);user-select:none;`;
  return div;
}

// ============================================================
// SERVER SWITCHING — FIXED
// ============================================================
function switchServer(serverName) {
  // Detach old listener
  if (dbListeners[currentServer]) {
    const { ref: r, listener: l } = dbListeners[currentServer];
    if (r && l) r.off("child_added", l);
    delete dbListeners[currentServer];
  }

  setTyping(false);
  isTyping = false;
  clearTimeout(typingTimer);
  db.ref(`typing/${currentServer}`).off();

  currentServer = serverName;
  if (!displayedMessages[serverName]) displayedMessages[serverName] = new Set();

  // Clear chatbox
  $("chatbox").innerHTML = "";
  clearReply();
  userScrolledUp = false;

  // Sidebar active state
  document.querySelectorAll(".serverBtn").forEach(btn => {
    btn.classList.toggle("selected", btn.getAttribute("data-server") === serverName);
  });

  // Clear unread
  unreadServers.delete(serverName);
  const dot = $(`unread-${serverName}`);
  if (dot) dot.style.display = "none";

  // Channel name
  const names = { server1:"general", server2:"general-2", private:"private", modchat:"mod-chat" };
  const label = names[serverName] || serverName;
  $("channelName").textContent   = label;
  $("msgInput").placeholder      = `Message #${label}`;

  setupTypingListener();

  const ref = db.ref(`messages/${serverName}`);

  // Pre-fetch messages AND all user tags in parallel — no async inside render loop
  Promise.all([
    ref.orderByChild("timestamp").once("value"),
    db.ref("adminData/userTags").once("value")
  ]).then(([msgSnap, tagsSnap]) => {
    if (currentServer !== serverName) return; // user switched away

    const allTags = tagsSnap.val() || {};
    const msgs = [];
    msgSnap.forEach(child => msgs.push({ key: child.key, ...child.val() }));

    // Re-reset dedup set right before rendering (guards against double-calls)
    displayedMessages[serverName] = new Set();

    msgs.forEach(data => {
      if (displayedMessages[serverName].has(data.key)) return;
      displayedMessages[serverName].add(data.key);
      renderMessage(data, serverName, false, allTags[data.userId] || []);
    });

    scrollToBottom();

    // Live listener for new messages — simple child_added, dedup Set handles duplicates
    const listener = ref.on("child_added", snapshot => {
      if (currentServer !== serverName) return;
      const key  = snapshot.key;
      const data = snapshot.val();
      if (displayedMessages[serverName].has(key)) return; // already rendered on initial load
      displayedMessages[serverName].add(key);
      db.ref(`adminData/userTags/${data.userId}`).once("value", tSnap => {
        if (currentServer !== serverName) return;
        renderMessage({ key, ...data }, serverName, true, tSnap.val() || []);
      });
    });

    dbListeners[serverName] = { ref, listener };
    setupUnreadListeners();
  });
}

// ============================================================
// UNREAD DOTS
// ============================================================
const ALL_SERVERS = ["server1", "server2"];
let unreadTimestamps = {};

function setupUnreadListeners() {
  ALL_SERVERS.forEach(server => {
    if (server === currentServer) return;
    db.ref(`messages/${server}`).off("child_added");
    const since = unreadTimestamps[server] || Date.now();
    db.ref(`messages/${server}`).orderByChild("timestamp").startAt(since).on("child_added", snap => {
      if (currentServer !== server) {
        unreadServers.add(server);
        const dot = $(`unread-${server}`);
        if (dot) dot.style.display = "inline-block";
        unreadTimestamps[server] = Date.now();
      }
    });
  });
}

// ============================================================
// SCROLL TRACKING
// ============================================================
$("chatbox").addEventListener("scroll", () => {
  const cb = $("chatbox");
  const distFromBottom = cb.scrollHeight - cb.scrollTop - cb.clientHeight;
  userScrolledUp = distFromBottom > 120;
  if (!userScrolledUp) $("scrollToBottomBtn").style.display = "none";
});

$("scrollToBottomBtn").addEventListener("click", () => {
  scrollToBottom();
  $("scrollToBottomBtn").style.display = "none";
  userScrolledUp = false;
});

function scrollToBottom() {
  const cb = $("chatbox");
  cb.scrollTop = cb.scrollHeight;
}

// ============================================================
// RENDER MESSAGE
// tags param is pre-fetched — NO async DB calls inside this function
// ============================================================
function renderMessage(data, serverName, isNew, tags) {
  const { key: messageId, name, message, time, userId: senderId, color, timestamp = 0, replyTo, avatarUrl } = data;

  if (serverName === "private" && !myTags.includes(PRIVATE_CHANNEL_TAG) && !myTags.includes("Owner") && !myTags.includes("Admin")) return;
  if (serverName === "modchat"  && !myTags.some(t => MOD_TAGS.includes(t))) return;

  const isMine = senderId === currentUserId;
  const nameColor = color || "#ffffff";

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", isMine ? "mine" : "other");
    msgDiv.setAttribute("data-message-id", messageId);

    // Reply quote
    let replyHTML = "";
    if (replyTo) {
      replyHTML = `<div class="reply-quote"><span class="reply-quote-name">${escapeHtml(replyTo.name)}</span><span class="reply-quote-text">${escapeHtml(stripHtml(replyTo.text).substring(0,80))}</span></div>`;
    }

    // Mentions
    const mentionedMe = message.includes(`@${currentUsername}`);
    if (mentionedMe) msgDiv.classList.add("mentioned");

    const parsedMsg = message.replace(/@(\w+)/g, (match, uname) => {
      const isMe = uname === currentUsername;
      return `<span class="mention${isMe?" mention-me":""}">${escapeHtml(match)}</span>`;
    });

    // Tags row — using old-style glow spans
    const tagHTML = tags.length
      ? `<div class="msg-tags"><span class="tag-glow">${tags.map(t => renderTagSpan(t)).join(" ")}</span></div>`
      : "";

    const savedSize = localStorage.getItem("textSize") || "14px";

    msgDiv.innerHTML = `
      ${replyHTML}
      ${tagHTML}
      <div class="msg-header">
        <span class="username" style="color:${nameColor};font-size:${savedSize};">${escapeHtml(name)}</span>
        <span class="time">${time}</span>
      </div>
      <span class="text">${parsedMsg}</span>
      <div class="reactions"></div>
    `;

    // Avatar
    const avatarEl = buildAvatarEl(avatarUrl || null, name, nameColor, 34);
    avatarEl.className = "msg-avatar";

    // Wrapper — data-timestamp lives HERE so sorting works correctly
    const wrapper = document.createElement("div");
    wrapper.classList.add("msg-wrapper", isMine ? "mine" : "other");
    wrapper.setAttribute("data-timestamp", timestamp);  // <-- KEY FIX: on wrapper not inner div
    wrapper.appendChild(avatarEl);
    wrapper.appendChild(msgDiv);

    // Emoji picker
    const emojis = ["👍","😂","❤️","🔥","😮","😢","🎉","💀","👀","✅","❌","💯"];
    const picker  = document.createElement("div");
    picker.className = "emoji-picker";
    picker.style.display = "none";
    emojis.forEach(emoji => {
      const eBtn = document.createElement("span");
      eBtn.className   = "emoji-btn";
      eBtn.textContent = emoji;
      eBtn.addEventListener("click", () => {
        const ref = db.ref(`messages/${serverName}/${messageId}/reactions/${encodeEmoji(emoji)}/${currentUserId}`);
        ref.once("value", s => { s.exists() ? ref.remove() : ref.set(true); picker.style.display = "none"; });
      });
      picker.appendChild(eBtn);
    });
    msgDiv.appendChild(picker);

    // Click → context menu
    msgDiv.addEventListener("click", async e => {
      if (e.target.closest(".reaction") || e.target.classList.contains("emoji-btn")) return;
      document.querySelectorAll(".emoji-picker").forEach(p => { if (p !== picker) p.style.display = "none"; });
      document.querySelectorAll(".msg-context-menu").forEach(m => m.remove());

      const menu = document.createElement("div");
      menu.className = "msg-context-menu";

      const replyBtn = document.createElement("button");
      replyBtn.textContent = "↩ Reply";
      replyBtn.addEventListener("click", () => { setReply(messageId, name, message); menu.remove(); });
      menu.appendChild(replyBtn);

      const reactBtn = document.createElement("button");
      reactBtn.textContent = "😀 React";
      reactBtn.addEventListener("click", () => { picker.style.display = picker.style.display === "none" ? "flex" : "none"; menu.remove(); });
      menu.appendChild(reactBtn);

      const canDelete = myTags.includes("Owner") || senderId === currentUserId || myTags.includes("Mod") || myTags.includes("Admin");
      if (canDelete) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑️ Delete";
        delBtn.className   = "danger";
        delBtn.addEventListener("click", async () => {
          menu.remove();
          const ok = await modConfirm("🗑️","Delete Message?","This message will be permanently deleted.");
          if (ok) {
            db.ref(`messages/${serverName}/${messageId}`).remove();
            wrapper.remove();
            if (myTags.includes("Mod")) {
              logModAction({ type:"delete_message", modName: currentUsername, modId: currentUserId, targetName: name, targetId: senderId || "", detail: `Deleted message: "${stripHtml(message).substring(0,50)}"` });
            }
          }
        });
        menu.appendChild(delBtn);
      }

      if ((myTags.includes("Mod") || myTags.includes("Admin") || myTags.includes("Owner")) && senderId && senderId !== currentUserId) {
        const rmPfpBtn = document.createElement("button");
        rmPfpBtn.textContent = "🖼️ Remove PFP";
        rmPfpBtn.className   = "danger";
        rmPfpBtn.addEventListener("click", async () => {
          menu.remove();
          const ok = await modConfirm("🖼️","Remove Profile Picture?",`Remove profile picture for "${name}"?`);
          if (ok) {
            db.ref(`adminData/allUsers/${senderId}`).update({ avatarUrl: null });
            logModAction({ type:"remove_pfp", modName: currentUsername, modId: currentUserId, targetName: name, targetId: senderId, detail:"Removed profile picture." });
          }
        });
        menu.appendChild(rmPfpBtn);
      }

      msgDiv.appendChild(menu);
      setTimeout(() => {
        document.addEventListener("click", function close(ev) {
          if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener("click", close); }
        });
      }, 10);
    });

    // Live reactions
    db.ref(`messages/${serverName}/${messageId}/reactions`).on("value", snap => {
      const reactions   = snap.val() || {};
      const reactionDiv = msgDiv.querySelector(".reactions");
      if (!reactionDiv) return;
      reactionDiv.innerHTML = "";
      emojis.forEach(emoji => {
        const key     = encodeEmoji(emoji);
        if (!reactions[key]) return;
        const count   = Object.keys(reactions[key]).length;
        const reacted = reactions[key][currentUserId] ? "reacted" : "";
        const span    = document.createElement("span");
        span.className   = `reaction ${reacted}`;
        span.textContent = `${emoji} ${count}`;
        span.addEventListener("click", () => {
          const ref = db.ref(`messages/${serverName}/${messageId}/reactions/${key}/${currentUserId}`);
          ref.once("value", s => s.exists() ? ref.remove() : ref.set(true));
        });
        reactionDiv.appendChild(span);
      });
    });

    // Insert in timestamp order — reads data-timestamp from WRAPPER now
    const allWrappers = Array.from($("chatbox").children);
    let inserted = false;
    for (let i = allWrappers.length - 1; i >= 0; i--) {
      const existingTime = parseInt(allWrappers[i].getAttribute("data-timestamp") || "0");
      if (existingTime <= timestamp) {
        $("chatbox").insertBefore(wrapper, allWrappers[i].nextSibling);
        inserted = true;
        break;
      }
    }
    if (!inserted) $("chatbox").insertBefore(wrapper, $("chatbox").firstChild);

    if (isNew === true) {
      if (!userScrolledUp) {
        scrollToBottom();
      } else {
        $("scrollToBottomBtn").style.display = "flex";
      }
    }
}

// ============================================================
// BAD WORDS FILTER
// ============================================================
const badWords = ["nigger","nigga","niga","niger","faggot","chink","coon","gook","kike","spic","wetback","fag","dyke","tranny","porn","xxx","hardcore","incest","bestiality"];
function normalizeText(t) {
  return t.toLowerCase().replace(/[=\s\-_.|]+/g,"").replace(/[1!]/g,"i").replace(/3/g,"e").replace(/0/g,"o").replace(/@/g,"a").replace(/5/g,"s").replace(/7/g,"t");
}
function filterBadWords(msg) {
  let out = msg;
  const norm = normalizeText(msg);
  badWords.forEach(w => {
    const re = new RegExp(`(${w})`, "gi");
    if (norm.includes(w)) out = out.replace(re, "****");
  });
  return out;
}
function parseMarkdown(msg) {
  msg = msg.replace(/#([^#\n]+)#/g, "<strong>$1</strong>");
  msg = msg.replace(/\/([^/\n]+)\//g, "<em>$1</em>");
  msg = msg.replace(/(https?:\/\/[^\s<]+[^\s<.,:;"')\]\}])/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');
  return msg;
}

// ============================================================
// SEND MESSAGE
// ============================================================
function isUserBanned(cb)    { db.ref(`adminData/bannedUsers/${currentUserId}`).once("value", s => cb(s.exists())); }
function isUserTimedOut(cb)  {
  db.ref(`adminData/timeouts/${currentUserId}`).once("value", s => {
    const data = s.val();
    if (!data) return cb(false, 0);
    const remaining = data.until - Date.now();
    cb(remaining > 0, remaining);
  });
}

function sendMessage() {
  const now    = Date.now();
  if (sendingInProgress) return;
  if (now - lastSentTime < 1500) return;
  const rawMsg = $("msgInput").value.trim();
  if (!rawMsg) return;

  isUserBanned(banned => {
    if (banned) { alert("You are banned from sending messages."); $("msgInput").value = ""; return; }
    isUserTimedOut((timedOut, remaining) => {
      if (timedOut) {
        const mins = Math.ceil(remaining / 60000);
        const hrs  = Math.floor(mins / 60);
        alert(hrs > 0 ? `You are timed out for ${hrs}h ${mins%60}m more.` : `You are timed out for ${mins} more minute${mins!==1?"s":""}.`);
        $("msgInput").value = "";
        return;
      }

      sendingInProgress = true;
      const filtered  = filterBadWords(rawMsg);
      const formatted = parseMarkdown(filtered);
      const capturedServer = currentServer;

      const msgData = {
        name:      currentUsername,
        message:   formatted,
        time:      new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
        timestamp: now,
        color:     myColor,
        userId:    currentUserId,
        avatarUrl: myAvatar || null,
      };
      if (replyingTo) {
        msgData.replyTo = { messageId: replyingTo.messageId, name: replyingTo.name, text: replyingTo.text };
      }

      db.ref(`messages/${capturedServer}`).push(msgData).then(() => {
        sendingInProgress = false;
        lastSentTime = now;
      }).catch(() => { sendingInProgress = false; });

      $("msgInput").value = "";
      clearReply();
      clearTimeout(typingTimer);
      isTyping = false;
      setTyping(false);

      db.ref(`adminData/allUsers/${currentUserId}`).update({
        username: currentUsername, usernameColor: myColor, avatarUrl: myAvatar || null
      });
    });
  });
}

$("sendBtn").addEventListener("click", sendMessage);
$("msgInput").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (mentionActive) return;
    const val = $("msgInput").value.trim();
    if (val === "/adminmenu" || val === "/mod") return;
    sendMessage();
  }
  if (e.key === "Escape") { clearReply(); $("mentionDropdown").style.display = "none"; }
});

// ============================================================
// MENU TRIGGERS
// ============================================================
function setupMenuTriggers() {
  $("msgInput").addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const val = $("msgInput").value.trim();

    if (val === "/adminmenu") {
      e.preventDefault();
      $("msgInput").value = "";
      $("adminMenuPasswordGate").style.display = "flex";
      $("adminMenuPasswordInput").value = "";
      $("adminMenuGateMessage").textContent = "";
      $("adminMenuPasswordInput").focus();
    }

    if (val === "/mod") {
      e.preventDefault();
      $("msgInput").value = "";
      if (!myTags.some(t => MOD_TAGS.includes(t))) {
        alert("You don't have permission to open the mod panel.");
        return;
      }
      $("modMenu").style.display = "flex";
      initModMenu();
    }
  });

  $("adminMenuEnterBtn").addEventListener("click", checkAdminPassword);
  $("adminMenuPasswordInput").addEventListener("keydown", e => { if (e.key === "Enter") checkAdminPassword(); });
  $("adminMenuCloseBtn").addEventListener("click", closeAdminMenu);
  $("modMenuCloseBtn").addEventListener("click", () => { $("modMenu").style.display = "none"; });
}

function checkAdminPassword() {
  const entered = $("adminMenuPasswordInput").value;
  if (!entered) { showAdminGateMsg("Please enter the password."); return; }
  db.ref("adminData/mod/password").once("value", snap => {
    if (entered === snap.val()) {
      showAdminGateMsg("Access granted.", true);
      setTimeout(() => {
        $("adminMenuPasswordGate").style.display = "none";
        $("adminMenu").style.display = "flex";
        initAdminMenu();
      }, 300);
    } else {
      showAdminGateMsg("Incorrect password.");
      $("adminMenuPasswordInput").value = "";
      $("adminMenuPasswordInput").focus();
    }
  });
}

function showAdminGateMsg(msg, ok = false) {
  $("adminMenuGateMessage").textContent = msg;
  $("adminMenuGateMessage").style.color = ok ? "#57f287" : "#f87171";
}

function closeAdminMenu() {
  $("adminMenu").style.display = "none";
  $("adminMenuPasswordGate").style.display = "none";
}

// ============================================================
// SHARED MOD/ADMIN HELPERS
// ============================================================
function initMenuTabs(containerSelector) {
  document.querySelectorAll(`${containerSelector} .modTab`).forEach(tab => {
    tab.addEventListener("click", () => {
      const parent = tab.closest(".modMenuContainer");
      parent.querySelectorAll(".modTab").forEach(t => t.classList.remove("active"));
      parent.querySelectorAll(".modTabContent").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const key = tab.getAttribute("data-tab");
      const content = document.getElementById(`tab${key.charAt(0).toUpperCase()+key.slice(1)}`);
      if (content) content.classList.add("active");
    });
  });
}

function buildTagPaletteFor(containerId, inputId, selectedVar, setSelected, isMod = false) {
  const palette = $(containerId);
  if (!palette) return;
  palette.innerHTML = "";
  const tagsToShow = isMod ? availableTags.filter(t => !MOD_PROTECTED_TAGS.includes(t)) : availableTags;
  tagsToShow.forEach(tag => {
    const btn = document.createElement("button");
    btn.className   = "tagPaletteBtn";
    btn.textContent = tag;
    applyTagStyleToEl(btn, tag);
    const s = getTagStyle(tag);
    if (s.rainbow) {
      btn.style.background  = "linear-gradient(to right,rgba(255,68,68,0.15),rgba(255,153,0,0.15),rgba(87,242,135,0.15),rgba(91,138,255,0.15))";
      btn.style.borderColor = "rgba(255,100,100,0.3)";
    }
    btn.addEventListener("click", () => {
      palette.querySelectorAll(".tagPaletteBtn").forEach(b => b.classList.remove("selected"));
      if (setSelected() === tag) {
        setSelected(null);
        if ($(inputId)) $(inputId).value = "";
      } else {
        setSelected(tag);
        btn.classList.add("selected");
        if ($(inputId)) $(inputId).value = tag;
      }
    });
    palette.appendChild(btn);
  });
}

function refreshTagPalettes() {
  buildTagPaletteFor("adminTagPalette", "adminTagNameInput", () => adminSelectedTag, v => { adminSelectedTag = v; return v; }, false);
  buildTagPaletteFor("modTagPalette",   "modTagNameInput",   () => modSelectedTag,   v => { modSelectedTag = v; return v; }, true);
}

function renderUsersList(listId, filter, actionsBuilder) {
  const list = $(listId);
  if (!list) return;
  list.innerHTML = "";
  let count = 0;
  for (const id in allUsersCache) {
    if (id === "placeholder") continue;
    const u     = allUsersCache[id];
    const name  = u.username || "Guest";
    const color = u.usernameColor || "#ffffff";
    if (filter && !name.toLowerCase().includes(filter) && !id.toLowerCase().includes(filter)) continue;
    count++;
    const card = document.createElement("div");
    card.className = "modUserCard";
    const avatarEl = buildAvatarEl(u.avatarUrl || null, name, color, 36);
    avatarEl.style.flexShrink = "0";
    const info    = document.createElement("div");
    info.className = "modUserInfo";
    const nameEl  = document.createElement("div");
    nameEl.className   = "modUserName";
    nameEl.textContent = name;
    nameEl.style.color = color;
    const idEl = document.createElement("div");
    idEl.className = "modUserId";
    idEl.innerHTML = `<span>${id.length > 20 ? id.substring(0,20)+"…" : id}</span><span class="copy-icon">📋</span>`;
    idEl.addEventListener("click", () => copyToClipboard(id, idEl));
    info.appendChild(nameEl);
    info.appendChild(idEl);
    const actions = document.createElement("div");
    actions.className = "modUserActions";
    actionsBuilder(actions, id, name, u);
    card.appendChild(avatarEl);
    card.appendChild(info);
    card.appendChild(actions);
    list.appendChild(card);
  }
  if (count === 0) list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">🔍</div>${filter ? "No users match." : "No users yet."}</div>`;
}

function renderTaggedUsers(listId) {
  const list = $(listId);
  if (!list) return;
  list.innerHTML = "";
  db.ref("adminData/userTags").on("value", snap => {
    const allTags = snap.val() || {};
    const entries = Object.entries(allTags).filter(([id]) => id !== "placeholder");
    if (!entries.length) { list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">🏷️</div>No tagged users yet.</div>`; return; }
    entries.forEach(([id, tags]) => {
      const user  = allUsersCache[id] || {};
      const name  = user.username || "Unknown";
      const color = user.usernameColor || "#ffffff";
      const card  = document.createElement("div");
      card.className = "taggedUserCard";
      const header = document.createElement("div");
      header.className = "taggedUserHeader";
      const av   = buildAvatarEl(user.avatarUrl||null, name, color, 28);
      const nameEl = document.createElement("div");
      nameEl.className = "taggedUserName"; nameEl.textContent = name; nameEl.style.color = color;
      const idEl   = document.createElement("div");
      idEl.className = "taggedUserId";
      idEl.innerHTML = `<span>${id.length>18?id.substring(0,18)+"…":id}</span> 📋`;
      idEl.addEventListener("click", () => copyToClipboard(id, idEl));
      header.appendChild(av); header.appendChild(nameEl); header.appendChild(idEl);
      const pillsRow = document.createElement("div");
      pillsRow.className = "taggedPills";
      tags.forEach(tag => {
        const pill = document.createElement("span");
        pill.className = "tagPill";
        applyTagStyleToEl(pill, tag);
        const label = document.createElement("span"); label.textContent = tag;
        const del   = document.createElement("button");
        del.className = "tagPillDelete"; del.textContent = "✕";
        del.addEventListener("click", async () => {
          // Mods cannot remove protected tags
          const isMod = myTags.includes("Mod") && !myTags.includes("Admin") && !myTags.includes("Owner");
          if (isMod && MOD_PROTECTED_TAGS.includes(tag)) {
            alert(`Moderators cannot remove the "${tag}" tag.`);
            return;
          }
          const ok = await modConfirm("🏷️",`Remove "${tag}"?`,`Remove ${tag} tag from ${name}?`);
          if (!ok) return;
          db.ref(`adminData/userTags/${id}`).once("value", s => {
            const updated = (s.val()||[]).filter(t=>t!==tag);
            updated.length===0 ? db.ref(`adminData/userTags/${id}`).remove() : db.ref(`adminData/userTags/${id}`).set(updated);
          });
          if (myTags.includes("Mod")) logModAction({ type:"remove_tag", modName:currentUsername, modId:currentUserId, targetName:name, targetId:id, detail:`Removed tag: ${tag}` });
        });
        pill.appendChild(label); pill.appendChild(del);
        pillsRow.appendChild(pill);
      });
      card.appendChild(header); card.appendChild(pillsRow);
      list.appendChild(card);
    });
  });
}

function renderBannedList(listId) {
  const list = $(listId);
  if (!list) return;
  db.ref("adminData/bannedUsers").once("value", snap => {
    list.innerHTML = "";
    const banned = snap.val() || {};
    const entries = Object.keys(banned).filter(k => k !== "placeholder");
    if (!entries.length) { list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">✅</div>No banned users.</div>`; return; }
    entries.forEach(id => {
      const user = allUsersCache[id];
      const displayName = user ? `${user.username} (${id.substring(0,14)}…)` : id;
      const card  = document.createElement("div");
      card.className = "bannedCard";
      const icon  = document.createElement("span"); icon.className="bannedIcon"; icon.textContent="🚫";
      const idEl  = document.createElement("span"); idEl.className="bannedId"; idEl.textContent=displayName;
      idEl.addEventListener("click", () => copyToClipboard(id, idEl));
      const unbanBtn = document.createElement("button");
      unbanBtn.className="unbanBtn"; unbanBtn.textContent="✓ Unban";
      unbanBtn.addEventListener("click", async () => {
        const ok = await modConfirm("✅","Unban User?",`Unban "${user?user.username:id}"?`);
        if (ok) db.ref(`adminData/bannedUsers/${id}`).remove();
      });
      card.appendChild(icon); card.appendChild(idEl); card.appendChild(unbanBtn);
      list.appendChild(card);
    });
  });
}

function renderTimeoutsList(listId) {
  const list = $(listId);
  if (!list) return;
  db.ref("adminData/timeouts").once("value", snap => {
    list.innerHTML = "";
    const timeouts = snap.val() || {};
    const active = Object.entries(timeouts).filter(([id, v]) => v.until > Date.now());
    if (!active.length) { list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">✅</div>No active timeouts.</div>`; return; }
    active.forEach(([id, v]) => {
      const remaining = v.until - Date.now();
      const totalMins = Math.ceil(remaining / 60000);
      const hrs  = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const label = hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`;
      const card  = document.createElement("div"); card.className="timeoutCard";
      const info  = document.createElement("div"); info.className="timeoutInfo";
      const nameEl = document.createElement("div"); nameEl.className="timeoutName"; nameEl.textContent=v.username||id;
      const timeEl = document.createElement("div"); timeEl.className="timeoutRemaining"; timeEl.textContent=`⏱ ${label}`;
      info.appendChild(nameEl); info.appendChild(timeEl);
      const releaseBtn = document.createElement("button");
      releaseBtn.className="unbanBtn"; releaseBtn.textContent="Release";
      releaseBtn.addEventListener("click", async () => {
        const ok = await modConfirm("✅","Release Timeout?",`End timeout for "${v.username||id}" early?`);
        if (ok) db.ref(`adminData/timeouts/${id}`).remove();
      });
      card.appendChild(info); card.appendChild(releaseBtn);
      list.appendChild(card);
    });
  });
}

function setupTimeoutButtons(btnClass, getSelected, setSelected, inputId, applyBtnId, label) {
  document.querySelectorAll(`.${btnClass}`).forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(`.${btnClass}`).forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      setSelected(parseInt(btn.getAttribute("data-ms")));
    });
  });
  $(applyBtnId) && $(applyBtnId).addEventListener("click", async () => {
    const id = $(inputId).value.trim();
    if (!id) return alert("Please enter a User ID.");
    if (!getSelected()) return alert("Please select a duration.");
    const user  = allUsersCache[id];
    const uname = user ? user.username : id;
    const durLabel = document.querySelector(`.${btnClass}[data-ms="${getSelected()}"]`)?.textContent || "";
    const ok = await modConfirm("⏱️","Apply Timeout?",`Timeout "${uname}" for ${durLabel}?`);
    if (!ok) return;
    const until = Date.now() + getSelected();
    await db.ref(`adminData/timeouts/${id}`).set({ until, username: uname });
    $(inputId).value = "";
    document.querySelectorAll(`.${btnClass}`).forEach(b => b.classList.remove("selected"));
    setSelected(null);
    if (myTags.includes("Mod")) logModAction({ type:"timeout", modName:currentUsername, modId:currentUserId, targetName:uname, targetId:id, detail:`Timed out for ${durLabel}` });
    renderTimeoutsList(`${label}ActiveTimeoutsList`);
  });
}

// ============================================================
// ADMIN MENU
// ============================================================
function initAdminMenu() {
  initMenuTabs("#adminMenu .modMenuContainer");

  db.ref("adminData/allUsers").on("value", snap => {
    allUsersCache = snap.val() || {};
    const filter = $("adminSearchInput").value.trim().toLowerCase();
    renderUsersList("adminUsersList", filter, (actions, id, name, u) => {
      const banBtn = document.createElement("button");
      banBtn.className = "mod-action-btn danger sm"; banBtn.textContent = "🚫 Ban";
      banBtn.addEventListener("click", async () => {
        const ok = await modConfirm("🚫","Ban User?",`Ban "${name}"?`);
        if (ok) db.ref(`adminData/bannedUsers/${id}`).set(true);
      });
      const removeBtn = document.createElement("button");
      removeBtn.className = "removeUserBtn"; removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", async () => {
        const ok = await modConfirm("⚠️","Remove User?",`Permanently remove "${name}"?`);
        if (ok) await Promise.all([db.ref(`adminData/allUsers/${id}`).remove(), db.ref(`adminData/userTags/${id}`).remove()]);
      });
      actions.appendChild(banBtn); actions.appendChild(removeBtn);
    });
    $("adminUsersTabBadge").textContent = Object.keys(allUsersCache).filter(k=>k!=="placeholder").length;
  });

  $("adminSearchInput").addEventListener("input", e => {
    renderUsersList("adminUsersList", e.target.value.trim().toLowerCase(), (actions, id, name) => {
      const banBtn = document.createElement("button");
      banBtn.className = "mod-action-btn danger sm"; banBtn.textContent = "🚫 Ban";
      banBtn.addEventListener("click", async () => { const ok = await modConfirm("🚫","Ban?",`Ban "${name}"?`); if(ok) db.ref(`adminData/bannedUsers/${id}`).set(true); });
      actions.appendChild(banBtn);
    });
  });

  buildTagPaletteFor("adminTagPalette", "adminTagNameInput", () => adminSelectedTag, v => { adminSelectedTag = v; return v; });

  $("adminAddTagBtn").addEventListener("click", () => {
    const id  = $("adminTagUserIdInput").value.trim();
    const tag = $("adminTagNameInput").value.trim();
    if (!id || !tag) return alert("Please select a tag and enter a User ID.");
    db.ref(`adminData/userTags/${id}`).once("value", s => {
      const current = s.val() || [];
      if (!current.includes(tag)) {
        current.push(tag);
        db.ref(`adminData/userTags/${id}`).set(current).then(() => {
          renderTaggedUsers("adminTaggedUsersList"); // refresh display
        });
      }
      $("adminTagUserIdInput").value = ""; $("adminTagNameInput").value = ""; adminSelectedTag = null;
      document.querySelectorAll("#adminTagPalette .tagPaletteBtn").forEach(b=>b.classList.remove("selected"));
    });
  });

  $("adminBanUserBtn").addEventListener("click", async () => {
    const id = $("adminBanUserInput").value.trim();
    if (!id) return;
    const ok = await modConfirm("🚫","Ban User?",`Ban user with ID: ${id}?`);
    if (ok) { db.ref(`adminData/bannedUsers/${id}`).set(true); $("adminBanUserInput").value = ""; }
  });

  renderBannedList("adminBannedList");
  renderTaggedUsers("adminTaggedUsersList");
  renderTimeoutsList("adminActiveTimeoutsList");

  setupTimeoutButtons("admin-dur", () => adminSelectedMs, v => { adminSelectedMs = v; }, "adminTimeoutUserIdInput", "adminApplyTimeoutBtn", "admin");

  setupTagCreator();
  loadModLogs();

  db.ref("adminData/bannedUsers").on("value", s => $("adminBansTabBadge").textContent = s.numChildren());
  db.ref("adminData/timeouts").on("value", s => {
    const active = Object.values(s.val()||{}).filter(v => v.until > Date.now()).length;
    $("adminTimeoutsTabBadge").textContent = active;
  });
  db.ref("adminData/modLogs").on("value", s => $("adminLogsTabBadge").textContent = s.numChildren());
}

// ============================================================
// TAG CREATOR
// ============================================================
function setupTagCreator() {
  const nameInput   = $("newTagName");
  const colorInput  = $("newTagColor");
  const previewEl   = $("newTagPreviewLabel");
  const createBtn   = $("createTagBtn");
  const msgEl       = $("createTagMsg");

  function updatePreview() {
    const name  = nameInput.value.trim() || "Preview";
    const color = colorInput.value;
    previewEl.textContent = `[${name}]`;
    previewEl.style.color = color;
    previewEl.style.textShadow = `0 0 8px ${color}88`;
  }

  nameInput.addEventListener("input", updatePreview);
  colorInput.addEventListener("input", updatePreview);
  updatePreview();

  createBtn.addEventListener("click", async () => {
    const name  = nameInput.value.trim();
    const color = colorInput.value;
    if (!name || name.length < 1) { msgEl.textContent = "Please enter a tag name."; msgEl.style.color = "#f87171"; return; }
    if (availableTags.includes(name)) { msgEl.textContent = "A tag with that name already exists."; msgEl.style.color = "#f87171"; return; }
    await db.ref(`adminData/customTags/${name}`).set({ color, createdBy: currentUsername, createdAt: Date.now() });
    msgEl.textContent = `✓ Tag "${name}" created!`;
    msgEl.style.color = "#57f287";
    nameInput.value = "";
    setTimeout(() => { msgEl.textContent = ""; }, 3000);
  });

  refreshCustomTagsList();
}

function refreshCustomTagsList() {
  const list = $("customTagsList");
  if (!list) return;
  db.ref("adminData/customTags").once("value", snap => {
    list.innerHTML = "";
    const custom = snap.val() || {};
    if (!Object.keys(custom).length) { list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">✨</div>No custom tags yet.</div>`; return; }
    Object.entries(custom).forEach(([name, data]) => {
      const color = data.color || "#aaaaaa";
      const row   = document.createElement("div");
      row.className = "custom-tag-row";
      const label = document.createElement("span");
      label.textContent = `[${name}]`;
      label.style.color = color;
      label.style.textShadow = `0 0 8px ${color}88`;
      label.style.fontWeight = "700";
      label.style.fontSize   = "12px";
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className   = "removeUserBtn";
      delBtn.style.fontSize = "11px";
      delBtn.addEventListener("click", async () => {
        const ok = await modConfirm("🗑️",`Delete tag "${name}"?`,"This will remove the tag from the palette.");
        if (ok) await db.ref(`adminData/customTags/${name}`).remove();
      });
      row.appendChild(label); row.appendChild(delBtn);
      list.appendChild(row);
    });
  });
}

// ============================================================
// MOD LOGS
// ============================================================
function loadModLogs() {
  const list = $("modActionLogList");
  if (!list) return;
  db.ref("adminData/modLogs").orderByChild("ts").limitToLast(50).on("value", snap => {
    list.innerHTML = "";
    const logs = [];
    snap.forEach(child => logs.push(child.val()));
    logs.reverse().forEach(log => {
      const row = document.createElement("div");
      row.className = "log-row";
      const ts   = new Date(log.ts).toLocaleString();
      const icon = { delete_message:"🗑️", remove_pfp:"🖼️", timeout:"⏱️", remove_tag:"🏷️" }[log.type] || "📋";
      row.innerHTML = `<span class="log-icon">${icon}</span><div class="log-info"><div class="log-action">${escapeHtml(log.modName)} — ${escapeHtml(log.detail||log.type)}</div><div class="log-target">Target: ${escapeHtml(log.targetName||log.targetId||"?")} &middot; ${ts}</div></div>`;
      list.appendChild(row);
    });
    if (!logs.length) list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">📋</div>No mod actions logged yet.</div>`;
  });
}

// ============================================================
// MOD MENU
// ============================================================
function initModMenu() {
  initMenuTabs("#modMenu .modMenuContainer");

  db.ref("adminData/allUsers").on("value", snap => {
    allUsersCache = snap.val() || {};
    const filter = $("modSearchInput").value.trim().toLowerCase();
    renderUsersList("modUsersList", filter, (actions, id, name) => {
      const timeoutBtn = document.createElement("button");
      timeoutBtn.className = "mod-action-btn sm"; timeoutBtn.textContent = "⏱️ Timeout";
      timeoutBtn.addEventListener("click", () => {
        const timeoutTab = document.querySelector('#modMenu .modTab[data-tab="modTimeouts"]');
        if (timeoutTab) timeoutTab.click();
        $("modTimeoutUserIdInput").value = id;
      });
      const removePfpBtn = document.createElement("button");
      removePfpBtn.className = "removeUserBtn"; removePfpBtn.textContent = "Remove PFP";
      removePfpBtn.addEventListener("click", async () => {
        const ok = await modConfirm("🖼️","Remove PFP?",`Remove profile picture for "${name}"?`);
        if (ok) {
          db.ref(`adminData/allUsers/${id}`).update({ avatarUrl: null });
          logModAction({ type:"remove_pfp", modName:currentUsername, modId:currentUserId, targetName:name, targetId:id, detail:"Removed profile picture." });
        }
      });
      actions.appendChild(timeoutBtn); actions.appendChild(removePfpBtn);
    });
    $("modUsersTabBadge").textContent = Object.keys(allUsersCache).filter(k=>k!=="placeholder").length;
  });

  $("modSearchInput").addEventListener("input", e => {
    renderUsersList("modUsersList", e.target.value.trim().toLowerCase(), (actions, id, name) => {
      const btn = document.createElement("button");
      btn.className = "mod-action-btn sm"; btn.textContent = "⏱️ Timeout";
      btn.addEventListener("click", () => { const t = document.querySelector('#modMenu .modTab[data-tab="modTimeouts"]'); if(t) t.click(); $("modTimeoutUserIdInput").value = id; });
      actions.appendChild(btn);
    });
  });

  buildTagPaletteFor("modTagPalette", "modTagNameInput", () => modSelectedTag, v => { modSelectedTag = v; return v; }, true);

  $("modAddTagBtn").addEventListener("click", () => {
    const id  = $("modTagUserIdInput").value.trim();
    const tag = $("modTagNameInput").value.trim();
    if (!id || !tag) return alert("Please select a tag and enter a User ID.");
    if (MOD_PROTECTED_TAGS.includes(tag)) return alert(`Moderators cannot assign the "${tag}" tag.`);
    db.ref(`adminData/userTags/${id}`).once("value", s => {
      const current = s.val() || [];
      if (!current.includes(tag)) {
        current.push(tag);
        db.ref(`adminData/userTags/${id}`).set(current).then(() => {
          renderTaggedUsers("modTaggedUsersList"); // refresh display
        });
      }
      $("modTagUserIdInput").value = ""; $("modTagNameInput").value = ""; modSelectedTag = null;
      document.querySelectorAll("#modTagPalette .tagPaletteBtn").forEach(b=>b.classList.remove("selected"));
      logModAction({ type:"add_tag", modName:currentUsername, modId:currentUserId, targetName:(allUsersCache[id]||{}).username||id, targetId:id, detail:`Added tag: ${tag}` });
    });
  });

  renderTaggedUsers("modTaggedUsersList");
  renderTimeoutsList("modActiveTimeoutsList");
  setupTimeoutButtons("mod-dur", () => modSelectedMs, v => { modSelectedMs = v; }, "modTimeoutUserIdInput", "modApplyTimeoutBtn", "mod");
}

// ============================================================
// CHANNEL BUTTONS
// ============================================================
document.addEventListener("click", e => {
  const btn = e.target.closest(".serverBtn");
  if (!btn || !btn.getAttribute("data-server")) return;
  switchServer(btn.getAttribute("data-server"));
});
