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

// ============================================================
// DOM REFS — AUTH
// ============================================================
const authScreen           = document.getElementById("authScreen");
const loginCard            = document.getElementById("loginCard");
const signupCard           = document.getElementById("signupCard");
const verifyCard           = document.getElementById("verifyCard");
const googleUsernameCard   = document.getElementById("googleUsernameCard");
const loginEmail           = document.getElementById("loginEmail");
const loginPassword        = document.getElementById("loginPassword");
const loginBtn             = document.getElementById("loginBtn");
const loginError           = document.getElementById("loginError");
const googleSignInBtn      = document.getElementById("googleSignInBtn");
const showSignupBtn        = document.getElementById("showSignupBtn");
const verifyNotice         = document.getElementById("verifyNotice");
const resendVerifyBtn      = document.getElementById("resendVerifyBtn");
const signupUsername       = document.getElementById("signupUsername");
const signupEmail          = document.getElementById("signupEmail");
const signupPassword       = document.getElementById("signupPassword");
const signupBtn            = document.getElementById("signupBtn");
const signupError          = document.getElementById("signupError");
const googleSignUpBtn      = document.getElementById("googleSignUpBtn");
const showLoginBtn         = document.getElementById("showLoginBtn");
const usernameCheck        = document.getElementById("usernameCheck");
const googleUsername       = document.getElementById("googleUsername");
const googleUsernameCheck  = document.getElementById("googleUsernameCheck");
const googleUsernameError  = document.getElementById("googleUsernameError");
const googleUsernameConfirmBtn = document.getElementById("googleUsernameConfirmBtn");
const verifyEmailAddr      = document.getElementById("verifyEmailAddr");
const resendVerifyBtn2     = document.getElementById("resendVerifyBtn2");
const backToLoginBtn       = document.getElementById("backToLoginBtn");

// ============================================================
// DOM REFS — APP
// ============================================================
const appContainer             = document.getElementById("appContainer");
const loadingScreen            = document.getElementById("loadingScreen");
const chatbox                  = document.getElementById("chatbox");
const msgInput                 = document.getElementById("msgInput");
const sendBtn                  = document.getElementById("sendBtn");
const channelName              = document.getElementById("channelName");
const sidebarUsername          = document.getElementById("sidebarUsername");
const sidebarAvatar            = document.getElementById("sidebarAvatar");
const sidebarAvatarWrap        = document.getElementById("sidebarAvatarWrap");
const logoutBtn                = document.getElementById("logoutBtn");
const changeUsernameBtn        = document.getElementById("changeUsernameBtn");
const usernameChangeBar        = document.getElementById("usernameChangeBar");
const usernameChangeInput      = document.getElementById("usernameChangeInput");
const usernameChangeSaveBtn    = document.getElementById("usernameChangeSaveBtn");
const usernameChangeCancelBtn  = document.getElementById("usernameChangeCancelBtn");
const usernameChangeCooldown   = document.getElementById("usernameChangeCooldown");
const avatarFileInput          = document.getElementById("avatarFileInput");
const typingIndicator          = document.getElementById("typingIndicator");
const typingText               = document.getElementById("typingText");
const replyBar                 = document.getElementById("replyBar");
const replyToName              = document.getElementById("replyToName");
const replyToPreview           = document.getElementById("replyToPreview");
const cancelReplyBtn           = document.getElementById("cancelReplyBtn");
const mentionDropdown          = document.getElementById("mentionDropdown");

// ============================================================
// DOM REFS — MOD MENU
// ============================================================
const modMenuPasswordGate  = document.getElementById("modMenuPasswordGate");
const modMenuPasswordInput = document.getElementById("modMenuPasswordInput");
const modMenuEnterBtn      = document.getElementById("modMenuEnterBtn");
const modMenuGateMessage   = document.getElementById("modMenuGateMessage");
const modMenu              = document.getElementById("modMenu");
const modMenuCloseBtn      = document.getElementById("modMenuCloseBtn");
const banUserInput         = document.getElementById("banUserInput");
const banUserBtn           = document.getElementById("banUserBtn");
const tagUserIdInput       = document.getElementById("tagUserIdInput");
const tagNameInput         = document.getElementById("tagNameInput");
const addTagBtn            = document.getElementById("addTagBtn");

// ============================================================
// GLOBAL STATE
// ============================================================
let currentUser     = null;
let currentUserId   = null;
let currentUsername = "Guest";
let myColor         = "#5865f2";
let myAvatar        = null;
let currentServer   = "server1";
let dbRef           = null;
let dbListener      = null;
let displayedMessages = new Set();

// Reply state
let replyingTo = null; // { messageId, name, text }

// Typing state
let typingTimer = null;
let isTyping    = false;

// Timeout duration selection
let selectedTimeoutMs = null;

// ============================================================
// HELPERS
// ============================================================
function showError(el, msg) { el.textContent = msg; el.classList.add("show"); }
function clearError(el)     { el.textContent = ""; el.classList.remove("show"); }
function showModGateMsg(msg, ok = false) {
  modMenuGateMessage.textContent = msg;
  modMenuGateMessage.style.color = ok ? "#57f287" : "#f87171";
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function encodeEmoji(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16)).join("_");
}
function friendlyAuthError(code) {
  const map = {
    "auth/user-not-found":       "No account with that email.",
    "auth/wrong-password":       "Incorrect password.",
    "auth/invalid-email":        "Invalid email address.",
    "auth/too-many-requests":    "Too many attempts — try again later.",
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/invalid-credential":   "Incorrect email or password.",
  };
  return map[code] || "Something went wrong. Try again.";
}
function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// ============================================================
// AVATAR HELPERS
// ============================================================
function buildAvatarEl(avatarUrl, username, color, size = 36) {
  if (avatarUrl) {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.className = "avatar-img";
    img.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
    img.onerror = () => img.replaceWith(makeInitialAvatar(username, color, size));
    return img;
  }
  return makeInitialAvatar(username, color, size);
}

function makeInitialAvatar(username, color, size = 36) {
  const div = document.createElement("div");
  div.className = "avatar-initial";
  div.textContent = (username || "?").charAt(0).toUpperCase();
  div.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${color}cc,${color}66);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.floor(size*0.4)}px;flex-shrink:0;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
  return div;
}

// Update the sidebar avatar display
function updateSidebarAvatar() {
  sidebarAvatar.innerHTML = "";
  if (myAvatar) {
    const img = document.createElement("img");
    img.src = myAvatar;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
    img.onerror = () => { sidebarAvatar.innerHTML = ""; sidebarAvatar.textContent = currentUsername.charAt(0).toUpperCase(); };
    sidebarAvatar.appendChild(img);
    sidebarAvatar.textContent = "";
  } else {
    sidebarAvatar.textContent = currentUsername.charAt(0).toUpperCase();
  }
}

// ============================================================
// IMGBB UPLOAD
// ============================================================
async function uploadToImgBB(file) {
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    alert("Image must be under 5MB.");
    return null;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    sidebarAvatarWrap.classList.add("uploading");
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
      method: "POST",
      body:   formData
    });
    const json = await res.json();
    sidebarAvatarWrap.classList.remove("uploading");

    if (json.success) {
      return json.data.url;
    } else {
      alert("Image upload failed. Please try again.");
      return null;
    }
  } catch(err) {
    sidebarAvatarWrap.classList.remove("uploading");
    alert("Upload error: " + err.message);
    return null;
  }
}

// Avatar click → file picker
sidebarAvatarWrap.addEventListener("click", () => avatarFileInput.click());

avatarFileInput.addEventListener("change", async () => {
  const file = avatarFileInput.files[0];
  if (!file) return;
  avatarFileInput.value = "";

  const url = await uploadToImgBB(file);
  if (!url) return;

  myAvatar = url;
  await db.ref(`adminData/allUsers/${currentUserId}`).update({ avatarUrl: url });
  updateSidebarAvatar();
});

// ============================================================
// ONLINE PRESENCE
// ============================================================
function setupPresence() {
  const presenceRef    = db.ref(`presence/${currentUserId}`);
  const connectedRef   = db.ref(".info/connected");

  connectedRef.on("value", snap => {
    if (!snap.val()) return;
    presenceRef.onDisconnect().remove();
    presenceRef.set({
      username: currentUsername,
      color:    myColor,
      online:   true
    });
  });

  // Watch total online count
  db.ref("presence").on("value", snap => {
    const count = snap.numChildren();
    document.getElementById("onlineCountNum").textContent = count;
  });
}

function cleanupPresence() {
  if (currentUserId) db.ref(`presence/${currentUserId}`).remove();
}

// ============================================================
// TYPING INDICATOR
// ============================================================
function setTyping(active) {
  if (!currentUserId) return;
  const ref = db.ref(`typing/${currentServer}/${currentUserId}`);
  if (active) {
    ref.set({ username: currentUsername, ts: Date.now() });
  } else {
    ref.remove();
  }
}

function setupTypingListener() {
  db.ref(`typing/${currentServer}`).on("value", snap => {
    const typers = snap.val() || {};
    const names  = Object.entries(typers)
      .filter(([uid]) => uid !== currentUserId)
      .map(([, v]) => v.username);

    if (names.length === 0) {
      typingIndicator.style.display = "none";
    } else {
      typingIndicator.style.display = "flex";
      if (names.length === 1) {
        typingText.textContent = `${names[0]} is typing...`;
      } else if (names.length === 2) {
        typingText.textContent = `${names[0]} and ${names[1]} are typing...`;
      } else {
        typingText.textContent = `${names.length} people are typing...`;
      }
    }
  });
}

msgInput.addEventListener("input", () => {
  if (!isTyping) {
    isTyping = true;
    setTyping(true);
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    isTyping = false;
    setTyping(false);
  }, 3000);
});

// ============================================================
// REPLY SYSTEM
// ============================================================
function setReply(messageId, name, text) {
  replyingTo = { messageId, name, text };
  replyToName.textContent    = name;
  replyToPreview.textContent = stripHtml(text).substring(0, 80);
  replyBar.style.display     = "block";
  msgInput.focus();
}

function clearReply() {
  replyingTo = null;
  replyBar.style.display = "none";
}

cancelReplyBtn.addEventListener("click", clearReply);

// ============================================================
// @MENTION AUTOCOMPLETE
// ============================================================
let allUsersCache = {};
let mentionActive = false;
let mentionQuery  = "";

msgInput.addEventListener("keyup", e => {
  const val    = msgInput.value;
  const cursor = msgInput.selectionStart;

  // Find if there's an @ before the cursor with no space after it
  const before = val.substring(0, cursor);
  const match  = before.match(/@(\w*)$/);

  if (match) {
    mentionQuery  = match[1].toLowerCase();
    mentionActive = true;
    showMentionDropdown(mentionQuery);
  } else {
    mentionActive = false;
    mentionDropdown.style.display = "none";
  }
});

function showMentionDropdown(query) {
  const users = Object.values(allUsersCache).filter(u =>
    u.username && u.username.toLowerCase().startsWith(query)
  ).slice(0, 6);

  if (users.length === 0) {
    mentionDropdown.style.display = "none";
    return;
  }

  mentionDropdown.innerHTML = "";
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
    item.addEventListener("click", () => insertMention(u.username));
    mentionDropdown.appendChild(item);
  });

  mentionDropdown.style.display = "block";
}

function insertMention(username) {
  const val    = msgInput.value;
  const cursor = msgInput.selectionStart;
  const before = val.substring(0, cursor);
  const after  = val.substring(cursor);
  const newBefore = before.replace(/@\w*$/, `@${username} `);
  msgInput.value = newBefore + after;
  msgInput.focus();
  mentionDropdown.style.display = "none";
  mentionActive = false;
}

// Close mention dropdown on outside click
document.addEventListener("click", e => {
  if (!mentionDropdown.contains(e.target) && e.target !== msgInput) {
    mentionDropdown.style.display = "none";
  }
});

// ============================================================
// AUTH SCREEN NAVIGATION
// ============================================================
function showCard(which) {
  loginCard.style.display          = which === "login"          ? "" : "none";
  signupCard.style.display         = which === "signup"         ? "" : "none";
  verifyCard.style.display         = which === "verify"         ? "" : "none";
  googleUsernameCard.style.display = which === "googleUsername" ? "" : "none";
  clearError(loginError);
  clearError(signupError);
  clearError(googleUsernameError);
}

showSignupBtn.addEventListener("click",  e => { e.preventDefault(); showCard("signup"); });
showLoginBtn.addEventListener("click",   e => { e.preventDefault(); showCard("login"); });
backToLoginBtn.addEventListener("click", e => { e.preventDefault(); showCard("login"); });

// ============================================================
// USERNAME AVAILABILITY
// ============================================================
function checkUsernameAvailable(name, excludeUid, callback) {
  db.ref("adminData/allUsers").once("value", snap => {
    const users = snap.val() || {};
    const lower = name.toLowerCase();
    let taken   = false;
    for (let id in users) {
      if (id === excludeUid) continue;
      if ((users[id].username || "").toLowerCase() === lower) { taken = true; break; }
    }
    callback(!taken);
  });
}

let usernameCheckTimer = null;
function setupLiveUsernameCheck(inputEl, hintEl, excludeUid = null) {
  inputEl.addEventListener("input", () => {
    clearTimeout(usernameCheckTimer);
    const val = inputEl.value.trim();
    if (!val) { hintEl.textContent = ""; hintEl.className = "field-hint"; return; }
    hintEl.textContent = "Checking...";
    hintEl.className   = "field-hint";
    usernameCheckTimer = setTimeout(() => {
      checkUsernameAvailable(val, excludeUid, ok => {
        hintEl.textContent = ok ? "✓ Available" : "✗ Already taken";
        hintEl.className   = "field-hint " + (ok ? "ok" : "taken");
      });
    }, 400);
  });
}
setupLiveUsernameCheck(signupUsername, usernameCheck);
setupLiveUsernameCheck(googleUsername, googleUsernameCheck);

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
      googleUsername.value = "";
      googleUsernameCheck.textContent = "";
      showCard("googleUsername");
      googleUsername.focus();
    }
  } catch(err) { showError(loginError, err.message); }
}

googleSignInBtn.addEventListener("click", handleGoogleAuth);
googleSignUpBtn.addEventListener("click", handleGoogleAuth);

googleUsernameConfirmBtn.addEventListener("click", async () => {
  clearError(googleUsernameError);
  const name = googleUsername.value.trim();
  if (!name || name.length < 2) return showError(googleUsernameError, "Username must be at least 2 characters.");

  checkUsernameAvailable(name, pendingGoogleUser?.uid, async available => {
    if (!available) return showError(googleUsernameError, "That username is already taken.");
    if (!pendingGoogleUser) return showError(googleUsernameError, "Something went wrong. Please try again.");

    await db.ref(`adminData/allUsers/${pendingGoogleUser.uid}`).set({
      username: name, usernameColor: "#5865f2", lastUsernameChange: 0, email: pendingGoogleUser.email || ""
    });
    currentUser   = pendingGoogleUser;
    currentUserId = pendingGoogleUser.uid;
    pendingGoogleUser = null;
    authScreen.style.display = "none";
    startApp();
  });
});

// ============================================================
// EMAIL SIGNUP
// ============================================================
signupBtn.addEventListener("click", async () => {
  clearError(signupError);
  const name  = signupUsername.value.trim();
  const email = signupEmail.value.trim();
  const pass  = signupPassword.value;
  if (!name  || name.length < 2) return showError(signupError, "Username must be at least 2 characters.");
  if (!email)                     return showError(signupError, "Please enter your email.");
  if (!pass  || pass.length < 6)  return showError(signupError, "Password must be at least 6 characters.");

  checkUsernameAvailable(name, null, async available => {
    if (!available) return showError(signupError, "That username is already taken.");
    try {
      const result = await auth.createUserWithEmailAndPassword(email, pass);
      await result.user.sendEmailVerification();
      await db.ref(`adminData/allUsers/${result.user.uid}`).set({
        username: name, usernameColor: "#5865f2", lastUsernameChange: 0, email
      });
      verifyEmailAddr.textContent = email;
      showCard("verify");
    } catch(err) { showError(signupError, friendlyAuthError(err.code)); }
  });
});

// ============================================================
// EMAIL LOGIN
// ============================================================
loginBtn.addEventListener("click", async () => {
  clearError(loginError);
  verifyNotice.style.display = "none";
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value;
  if (!email || !pass) return showError(loginError, "Please fill in all fields.");
  try {
    const result = await auth.signInWithEmailAndPassword(email, pass);
    if (!result.user.emailVerified) {
      await auth.signOut();
      verifyNotice.style.display = "block";
      showError(loginError, "Please verify your email before signing in.");
    }
  } catch(err) { showError(loginError, friendlyAuthError(err.code)); }
});

loginEmail.addEventListener("keydown",    e => { if (e.key === "Enter") loginBtn.click(); });
loginPassword.addEventListener("keydown", e => { if (e.key === "Enter") loginBtn.click(); });

resendVerifyBtn.addEventListener("click", async e => {
  e.preventDefault();
  try {
    const result = await auth.signInWithEmailAndPassword(loginEmail.value.trim(), loginPassword.value);
    await result.user.sendEmailVerification();
    await auth.signOut();
    verifyNotice.textContent = "✓ Verification email sent!";
  } catch(err) { showError(loginError, err.message); }
});

resendVerifyBtn2.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (user) {
    await user.sendEmailVerification();
    resendVerifyBtn2.textContent = "✓ Sent!";
    setTimeout(() => { resendVerifyBtn2.textContent = "Resend Email"; }, 3000);
  }
});

// ============================================================
// AUTH STATE
// ============================================================
auth.onAuthStateChanged(async user => {
  if (!user) {
    authScreen.style.display   = "flex";
    appContainer.style.display = "none";
    loadingScreen.style.display = "none";
    showCard("login");
    return;
  }
  const isGoogle = user.providerData[0]?.providerId === "google.com";
  if (!isGoogle && !user.emailVerified) { await auth.signOut(); return; }

  const snap = await db.ref(`adminData/allUsers/${user.uid}`).once("value");
  if (!snap.exists()) return;

  currentUser   = user;
  currentUserId = user.uid;
  authScreen.style.display = "none";
  startApp();
});

// ============================================================
// LOGOUT
// ============================================================
logoutBtn.addEventListener("click", () => {
  cleanupPresence();
  setTyping(false);
  if (dbRef && dbListener) dbRef.off("child_added", dbListener);
  auth.signOut();
});

// ============================================================
// START APP
// ============================================================
function startApp() {
  loadingScreen.style.display = "flex";
  appContainer.style.display  = "none";

  db.ref(`adminData/allUsers/${currentUserId}`).once("value", snap => {
    const data      = snap.val() || {};
    currentUsername = data.username || currentUser.displayName || "Guest";
    myColor         = data.usernameColor || "#5865f2";
    myAvatar        = data.avatarUrl || null;
    buildSidebar();
    updateUserPanel();
    runLoadingCountdown();
  });
}

function runLoadingCountdown() {
  const bar  = document.getElementById("countdownBar");
  const text = document.getElementById("countdownText");
  let t = 3;
  text.textContent = "3s";
  const iv = setInterval(() => {
    t -= 0.1;
    bar.style.width = ((3 - t) / 3 * 100) + "%";
    text.textContent = Math.ceil(t) + "s";
    if (t <= 0) {
      clearInterval(iv);
      loadingScreen.style.display = "none";
      appContainer.style.display  = "flex";
      switchServer("server1");
      setupModMenuTrigger();
      setupPresence();
    }
  }, 100);
}

// ============================================================
// SIDEBAR
// ============================================================
function buildSidebar() {
  buildColorPicker();
  buildThemeColorPicker();
  buildTextSizePicker();
}

function buildColorPicker() {
  const wrap = document.getElementById("colorPickerBtn");
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
  btn.appendChild(Object.assign(document.createElement("span"), { textContent: "Username Color" }));
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
  const section = document.getElementById("themeColorSection");
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
    chatbox.style.backgroundColor = e.target.value;
  });

  const saved = localStorage.getItem("themeColor");
  if (saved) chatbox.style.backgroundColor = saved;

  section.appendChild(btn);
  section.appendChild(picker);
}

function buildTextSizePicker() {
  const section = document.getElementById("textSizeSection");
  section.innerHTML = '<div class="sidebar-section-label sub">TEXT SIZE</div>';
  const row = document.createElement("div");
  row.className = "text-size-row";
  const savedSize = localStorage.getItem("textSize") || "14px";
  const chatboxEl = document.getElementById("chatbox");
  if (chatboxEl) chatboxEl.style.fontSize = savedSize;

  ["12px","14px","16px","18px"].forEach(size => {
    const btn = document.createElement("button");
    btn.className = "size-btn" + (savedSize === size ? " active" : "");
    btn.textContent = size;
    btn.addEventListener("click", () => {
      if (chatboxEl) chatboxEl.style.fontSize = size;
      localStorage.setItem("textSize", size);
      row.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
    row.appendChild(btn);
  });
  section.appendChild(row);
}

function updateUserPanel() {
  sidebarUsername.textContent = currentUsername;
  sidebarUsername.style.color = myColor;
  updateSidebarAvatar();
}

function updateSidebarAvatar() {
  sidebarAvatar.innerHTML = "";
  if (myAvatar) {
    const img = document.createElement("img");
    img.src = myAvatar;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
    img.onerror = () => {
      sidebarAvatar.innerHTML = "";
      sidebarAvatar.textContent = currentUsername.charAt(0).toUpperCase();
    };
    sidebarAvatar.appendChild(img);
  } else {
    sidebarAvatar.textContent = currentUsername.charAt(0).toUpperCase();
  }
}

// ============================================================
// USERNAME CHANGE
// ============================================================
changeUsernameBtn.addEventListener("click", async () => {
  const snap = await db.ref(`adminData/allUsers/${currentUserId}/lastUsernameChange`).once("value");
  const last = snap.val() || 0;
  const diff = Date.now() - last;

  if (diff < WEEK_MS) {
    const rem  = WEEK_MS - diff;
    const days = Math.floor(rem / (24*60*60*1000));
    const hrs  = Math.floor((rem % (24*60*60*1000)) / (60*60*1000));
    usernameChangeCooldown.textContent = `⏳ Next change in ${days}d ${hrs}h`;
    usernameChangeInput.disabled = true;
    usernameChangeSaveBtn.disabled = true;
  } else {
    usernameChangeCooldown.textContent = "✓ Change available";
    usernameChangeInput.disabled  = false;
    usernameChangeSaveBtn.disabled = false;
  }

  usernameChangeInput.value   = currentUsername;
  usernameChangeBar.style.display = "block";
  if (!usernameChangeInput.disabled) usernameChangeInput.focus();
});

usernameChangeCancelBtn.addEventListener("click", () => { usernameChangeBar.style.display = "none"; });

usernameChangeSaveBtn.addEventListener("click", async () => {
  const newName = usernameChangeInput.value.trim();
  if (!newName || newName.length < 2) return alert("Username must be at least 2 characters.");
  if (newName === currentUsername) { usernameChangeBar.style.display = "none"; return; }

  const snap = await db.ref(`adminData/allUsers/${currentUserId}/lastUsernameChange`).once("value");
  if (Date.now() - (snap.val() || 0) < WEEK_MS) return alert("You can only change your username once per week.");

  checkUsernameAvailable(newName, currentUserId, async available => {
    if (!available) return alert("That username is already taken.");
    currentUsername = newName;
    await db.ref(`adminData/allUsers/${currentUserId}`).update({ username: newName, lastUsernameChange: Date.now() });
    updateUserPanel();
    usernameChangeBar.style.display = "none";
  });
});

// ============================================================
// BETA WARNING
// ============================================================
const betaWarn = document.getElementById("betaWarning");
if (betaWarn) {
  betaWarn.addEventListener("click", () => {
    betaWarn.style.opacity   = "0";
    betaWarn.style.transform = "scale(0.9)";
    setTimeout(() => betaWarn.style.display = "none", 300);
  });
}

// ============================================================
// SERVER SWITCHING
// ============================================================
function switchServer(serverName) {
  currentServer = serverName;
  chatbox.innerHTML = "";
  displayedMessages.clear();
  clearReply();

  if (dbRef && dbListener) { dbRef.off("child_added", dbListener); dbListener = null; }

  // Clean up old typing listener and reset
  db.ref(`typing/${currentServer}`).off();
  setTyping(false);
  isTyping = false;

  dbRef = db.ref(`messages/${currentServer}`);

  document.querySelectorAll(".serverBtn").forEach(btn => {
    btn.classList.toggle("selected", btn.getAttribute("data-server") === serverName);
  });

  const names = { server1: "general", server2: "general-2" };
  const label = names[serverName] || serverName;
  channelName.textContent = label;
  msgInput.placeholder    = `Message #${label}`;

  setupTypingListener();

  dbRef.orderByChild("timestamp").once("value", snap => {
    const msgs = [];
    snap.forEach(child => msgs.push({ key: child.key, ...child.val() }));
    msgs.forEach(data => {
      if (displayedMessages.has(data.key)) return;
      displayedMessages.add(data.key);
      addMessageToChat(data);
    });
    chatbox.scrollTop = chatbox.scrollHeight;

    const since = Date.now();
    dbListener = dbRef.orderByChild("timestamp").startAt(since).on("child_added", snapshot => {
      const key  = snapshot.key;
      const data = snapshot.val();
      if (displayedMessages.has(key)) return;
      displayedMessages.add(key);
      addMessageToChat({ key, ...data });
    });
  });
}

// ============================================================
// RENDER MESSAGE
// ============================================================
function addMessageToChat(data) {
  const { key: messageId, name, message, time, userId: senderId, color, timestamp = 0, replyTo, avatarUrl } = data;
  const isMine = senderId === currentUserId;

  db.ref(`adminData/userTags/${senderId}`).once("value", snap => {
    const tags    = snap.val() || [];
    const tagHTML = tags.length
      ? `<span class="tag-glow">${tags.map(t =>
          `<span class="tag-${t.toLowerCase().replace(/\s+/g,"-")}">[${t}]</span>`
        ).join(" ")}</span>`
      : "";

    const nameColor = color || "#ffffff";
    const msgDiv    = document.createElement("div");
    msgDiv.classList.add("message", isMine ? "mine" : "other");
    msgDiv.setAttribute("data-message-id", messageId);
    msgDiv.setAttribute("data-timestamp",  timestamp);

    // Reply quote block
    let replyHTML = "";
    if (replyTo) {
      replyHTML = `
        <div class="reply-quote">
          <span class="reply-quote-name">${escapeHtml(replyTo.name)}</span>
          <span class="reply-quote-text">${escapeHtml(stripHtml(replyTo.text).substring(0, 80))}</span>
        </div>`;
    }

    // Check for @mention of current user
    const mentionedMe = message.includes(`@${currentUsername}`);
    if (mentionedMe) msgDiv.classList.add("mentioned");

    // Parse @mentions into highlighted spans
    const parsedMsg = message.replace(/@(\w+)/g, (match, uname) => {
      const isMe = uname === currentUsername;
      return `<span class="mention${isMe ? " mention-me" : ""}">${escapeHtml(match)}</span>`;
    });

    msgDiv.innerHTML = `
      ${replyHTML}
      <div class="msg-header">
        ${tagHTML}
        <span class="username" style="color:${nameColor} !important">${escapeHtml(name)}</span>
        <span class="time">${time}</span>
      </div>
      <span class="text">${parsedMsg}</span>
      <div class="reactions"></div>
    `;

    // Insert avatar to the LEFT of the bubble
    const avatarEl = buildAvatarEl(avatarUrl || null, name, nameColor, 34);
    avatarEl.classList.add("msg-avatar");

    // Wrap: avatar + bubble
    const wrapper = document.createElement("div");
    wrapper.classList.add("msg-wrapper", isMine ? "mine" : "other");
    wrapper.appendChild(avatarEl);
    wrapper.appendChild(msgDiv);

    // Emoji picker
    const emojis = ["👍","😂","❤️","🔥","😮","😢","🎉","💀","👀","✅","❌","💯"];
    const picker  = document.createElement("div");
    picker.className     = "emoji-picker";
    picker.style.display = "none";
    emojis.forEach(emoji => {
      const eBtn = document.createElement("span");
      eBtn.className   = "emoji-btn";
      eBtn.textContent = emoji;
      eBtn.addEventListener("click", () => {
        const ref = db.ref(`messages/${currentServer}/${messageId}/reactions/${encodeEmoji(emoji)}/${currentUserId}`);
        ref.once("value", s => { s.exists() ? ref.remove() : ref.set(true); picker.style.display = "none"; });
      });
      picker.appendChild(eBtn);
    });
    msgDiv.appendChild(picker);

    // Context menu on click: reply + (owner) delete
    msgDiv.addEventListener("click", async e => {
      if (e.target.closest(".reaction") || e.target.classList.contains("emoji-btn")) return;

      // Close other pickers
      document.querySelectorAll(".emoji-picker").forEach(p => { if (p !== picker) p.style.display = "none"; });
      document.querySelectorAll(".msg-context-menu").forEach(m => m.remove());

      // Build context menu
      const menu = document.createElement("div");
      menu.className = "msg-context-menu";

      const replyBtn = document.createElement("button");
      replyBtn.textContent = "↩ Reply";
      replyBtn.addEventListener("click", () => {
        setReply(messageId, name, message);
        menu.remove();
      });
      menu.appendChild(replyBtn);

      // Check if user has Owner tag → can delete any message
      const myTagsSnap = await db.ref(`adminData/userTags/${currentUserId}`).once("value");
      const myTags     = myTagsSnap.val() || [];
      if (myTags.includes("Owner") || senderId === currentUserId) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑️ Delete";
        delBtn.className   = "danger";
        delBtn.addEventListener("click", async () => {
          menu.remove();
          const ok = await modConfirm("🗑️", "Delete Message?", "This message will be permanently deleted.");
          if (ok) {
            db.ref(`messages/${currentServer}/${messageId}`).remove();
            wrapper.remove();
          }
        });
        menu.appendChild(delBtn);
      }

      // Emoji picker toggle
      const reactBtn = document.createElement("button");
      reactBtn.textContent = "😀 React";
      reactBtn.addEventListener("click", () => {
        picker.style.display = picker.style.display === "none" ? "flex" : "none";
        menu.remove();
      });
      menu.appendChild(reactBtn);

      msgDiv.appendChild(menu);

      // Auto-close
      setTimeout(() => {
        document.addEventListener("click", function close(ev) {
          if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener("click", close); }
        });
      }, 10);
    });

    // Live reactions
    db.ref(`messages/${currentServer}/${messageId}/reactions`).on("value", snap => {
      const reactions   = snap.val() || {};
      const reactionDiv = msgDiv.querySelector(".reactions");
      reactionDiv.innerHTML = "";
      emojis.forEach(emoji => {
        const key = encodeEmoji(emoji);
        if (!reactions[key]) return;
        const count   = Object.keys(reactions[key]).length;
        const reacted = reactions[key][currentUserId] ? "reacted" : "";
        const span    = document.createElement("span");
        span.className   = `reaction ${reacted}`;
        span.textContent = `${emoji} ${count}`;
        span.addEventListener("click", () => {
          const ref = db.ref(`messages/${currentServer}/${messageId}/reactions/${key}/${currentUserId}`);
          ref.once("value", s => s.exists() ? ref.remove() : ref.set(true));
        });
        reactionDiv.appendChild(span);
      });
      const isNearBottom = chatbox.scrollHeight - chatbox.scrollTop - chatbox.clientHeight < 150;
      if (isNearBottom) chatbox.scrollTop = chatbox.scrollHeight;
    });

    // Intelligent insertion by timestamp
    const allWrappers = Array.from(chatbox.children);
    if (allWrappers.length === 0) {
      chatbox.appendChild(wrapper);
    } else {
      let inserted = false;
      for (let i = allWrappers.length - 1; i >= 0; i--) {
        const child = allWrappers[i].querySelector("[data-timestamp]");
        const existingTime = parseInt(child ? child.getAttribute("data-timestamp") : "0");
        if (existingTime <= timestamp) {
          chatbox.insertBefore(wrapper, allWrappers[i].nextSibling);
          inserted = true;
          break;
        }
      }
      if (!inserted) chatbox.insertBefore(wrapper, chatbox.firstChild);
    }

    chatbox.scrollTop = chatbox.scrollHeight;
  });
}

// ============================================================
// MESSAGE SENDING
// ============================================================
const badWords = [
  "nigger","nigga","niga","niger","faggot","chink","coon","gook","kike","spic","wetback",
  "fag","dyke","tranny","porn","xxx","hardcore","incest","bestiality"
];

function normalizeText(t) {
  return t.toLowerCase()
    .replace(/[=\s\-_.|]+/g,"")
    .replace(/[1!]/g,"i").replace(/3/g,"e").replace(/0/g,"o")
    .replace(/@/g,"a").replace(/5/g,"s").replace(/7/g,"t");
}

function filterBadWords(msg) {
  let out  = msg;
  const norm = normalizeText(msg);
  badWords.forEach(w => {
    const re = new RegExp(`(${w})`, "gi");
    if (norm.includes(w)) out = out.replace(re, "****");
  });
  return out;
}

function parseMarkdown(msg) {
  msg = msg.replace(/#([^#]+)#/g, "<strong>$1</strong>");
  msg = msg.replace(/\/([^/]+)\//g, "<em>$1</em>");
  msg = msg.replace(/(https?:\/\/[^\s<]+[^\s<.,:;"')\]\}])/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');
  return msg;
}

function isUserBanned(callback) {
  db.ref(`adminData/bannedUsers/${currentUserId}`).once("value", s => callback(s.exists()));
}

function isUserTimedOut(callback) {
  db.ref(`adminData/timeouts/${currentUserId}`).once("value", s => {
    const data = s.val();
    if (!data) return callback(false, 0);
    const remaining = data.until - Date.now();
    callback(remaining > 0, remaining);
  });
}

let lastSentTime = 0;

function sendMessage() {
  const now    = Date.now();
  if (now - lastSentTime < 2000) return;
  const rawMsg = msgInput.value.trim();
  if (!rawMsg) return;

  isUserBanned(banned => {
    if (banned) { alert("You are banned from sending messages."); msgInput.value = ""; return; }

    isUserTimedOut((timedOut, remaining) => {
      if (timedOut) {
        const mins = Math.ceil(remaining / 60000);
        const hrs  = Math.floor(mins / 60);
        const msg  = hrs > 0
          ? `You are timed out for ${hrs}h ${mins % 60}m more.`
          : `You are timed out for ${mins} more minute${mins !== 1 ? "s" : ""}.`;
        alert(msg);
        msgInput.value = "";
        return;
      }

      const filtered  = filterBadWords(rawMsg);
      const formatted = parseMarkdown(filtered);

      const msgData = {
        name:      currentUsername,
        message:   formatted,
        time:      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: now,
        color:     myColor,
        userId:    currentUserId,
        avatarUrl: myAvatar || null,
      };

      if (replyingTo) {
        msgData.replyTo = {
          messageId: replyingTo.messageId,
          name:      replyingTo.name,
          text:      replyingTo.text,
        };
      }

      db.ref(`messages/${currentServer}`).push(msgData);
      msgInput.value = "";
      lastSentTime   = now;
      clearReply();

      // Clear typing
      clearTimeout(typingTimer);
      isTyping = false;
      setTyping(false);

      db.ref(`adminData/allUsers/${currentUserId}`).update({
        username: currentUsername, usernameColor: myColor, avatarUrl: myAvatar || null
      });
    });
  });
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && msgInput.value.trim() !== "/modmenu") {
    if (mentionActive) return; // don't send while picking mention
    sendMessage();
  }
  // Escape closes reply/mention
  if (e.key === "Escape") {
    clearReply();
    mentionDropdown.style.display = "none";
  }
});

// ============================================================
// MOD MENU
// ============================================================
const TAG_STYLES = {
  "Mod":           { color: "#ff4444", bg: "rgba(255,68,68,0.15)",   border: "rgba(255,68,68,0.35)"   },
  "Admin":         { color: "#ff9900", bg: "rgba(255,153,0,0.15)",   border: "rgba(255,153,0,0.35)"   },
  "SN":            { color: "#5b8aff", bg: "rgba(91,138,255,0.15)",  border: "rgba(91,138,255,0.35)"  },
  "VIP":           { color: "#ffd700", bg: "rgba(255,215,0,0.15)",   border: "rgba(255,215,0,0.35)"   },
  "Friend":        { color: "#57f287", bg: "rgba(87,242,135,0.15)",  border: "rgba(87,242,135,0.35)"  },
  "Tester":        { color: "#00ffff", bg: "rgba(0,255,255,0.15)",   border: "rgba(0,255,255,0.35)"   },
  "Owner":         { color: "#ffffff", bg: "rgba(255,255,255,0.1)",  border: "rgba(255,255,255,0.25)" },
  "Dev":           { color: "#888888", bg: "rgba(136,136,136,0.15)", border: "rgba(136,136,136,0.3)"  },
  "Jobless":       { color: "#a0522d", bg: "rgba(160,82,45,0.15)",   border: "rgba(160,82,45,0.35)"   },
  "Asked for Tag": { color: "#808080", bg: "rgba(128,128,128,0.12)", border: "rgba(128,128,128,0.28)" },
  "Gay":           { color: null,      bg: "rgba(255,100,100,0.1)",  border: "rgba(255,100,100,0.2)"  },
};

const availableTags = ["Mod","Admin","SN","VIP","Friend","Tester","Owner","Dev","Jobless","Asked for Tag","Gay"];
let selectedTagFromPalette = null;

// Confirm dialog
function modConfirm(icon, title, message) {
  return new Promise(resolve => {
    const dialog = document.getElementById("modConfirmDialog");
    document.getElementById("confirmIcon").textContent    = icon;
    document.getElementById("confirmTitle").textContent   = title;
    document.getElementById("confirmMessage").textContent = message;
    dialog.style.display = "flex";

    const ok     = document.getElementById("confirmOkBtn");
    const cancel = document.getElementById("confirmCancelBtn");
    const newOk  = ok.cloneNode(true);
    const newCan = cancel.cloneNode(true);
    ok.parentNode.replaceChild(newOk, ok);
    cancel.parentNode.replaceChild(newCan, cancel);

    const cleanup = result => { dialog.style.display = "none"; resolve(result); };
    newOk.addEventListener("click",  () => cleanup(true));
    newCan.addEventListener("click", () => cleanup(false));
  });
}

function copyToClipboard(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = el.innerHTML;
    el.classList.add("copied");
    el.innerHTML = "✓ Copied!";
    setTimeout(() => { el.innerHTML = orig; el.classList.remove("copied"); }, 1500);
  });
}

function setupModMenuTrigger() {
  msgInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && msgInput.value.trim() === "/modmenu") {
      e.preventDefault();
      msgInput.value = "";
      modMenuPasswordGate.style.display = "flex";
      modMenuPasswordInput.value = "";
      modMenuGateMessage.textContent = "";
      modMenuPasswordInput.focus();
    }
  });
}

function checkModPassword() {
  const entered = modMenuPasswordInput.value;
  if (!entered) { showModGateMsg("Please enter the password."); return; }
  db.ref("adminData/mod/password").once("value", snap => {
    if (entered === snap.val()) {
      showModGateMsg("Access granted.", true);
      setTimeout(() => {
        modMenuPasswordGate.style.display = "none";
        modMenu.style.display = "flex";
        initModMenu();
      }, 300);
    } else {
      showModGateMsg("Incorrect password.");
      modMenuPasswordInput.value = "";
      modMenuPasswordInput.focus();
    }
  });
}

modMenuEnterBtn.addEventListener("click", checkModPassword);
modMenuPasswordInput.addEventListener("keydown", e => { if (e.key === "Enter") checkModPassword(); });

modMenuCloseBtn.addEventListener("click", () => {
  modMenu.style.display = "none";
  modMenuPasswordGate.style.display = "none";
  db.ref("adminData/allUsers").off();
  db.ref("adminData/bannedUsers").off();
  db.ref("adminData/userTags").off();
  db.ref("adminData/timeouts").off();
});

function initModMenuTabs() {
  document.querySelectorAll(".modTab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".modTab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".modTabContent").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const id = "tab" + tab.getAttribute("data-tab").charAt(0).toUpperCase() + tab.getAttribute("data-tab").slice(1);
      document.getElementById(id).classList.add("active");
    });
  });
}

function initModSearch() {
  document.getElementById("modSearchInput").addEventListener("input", e => {
    renderUsersList(e.target.value.trim().toLowerCase());
  });
}

function buildTagPalette() {
  const palette = document.getElementById("tagPalette");
  palette.innerHTML = "";
  availableTags.forEach(tag => {
    const style = TAG_STYLES[tag] || {};
    const btn   = document.createElement("button");
    btn.className   = "tagPaletteBtn";
    btn.textContent = tag;
    if (style.color)  btn.style.color = style.color;
    if (style.bg)     btn.style.background = style.bg;
    if (style.border) btn.style.borderColor = style.border;
    if (tag === "Gay") {
      btn.style.background  = "linear-gradient(to right,rgba(255,68,68,0.15),rgba(255,153,0,0.15),rgba(87,242,135,0.15),rgba(91,138,255,0.15))";
      btn.style.borderColor = "rgba(255,100,100,0.3)";
    }
    btn.addEventListener("click", () => {
      palette.querySelectorAll(".tagPaletteBtn").forEach(b => b.classList.remove("selected"));
      if (selectedTagFromPalette === tag) {
        selectedTagFromPalette = null;
        document.getElementById("tagNameInput").value = "";
      } else {
        selectedTagFromPalette = tag;
        btn.classList.add("selected");
        document.getElementById("tagNameInput").value = tag;
        document.getElementById("tagUserIdInput").focus();
      }
    });
    palette.appendChild(btn);
  });
}

function renderUsersList(filter = "") {
  const list  = document.getElementById("allUsersList");
  list.innerHTML = "";
  let count = 0;

  for (let id in allUsersCache) {
    if (id === "placeholder") continue;
    const u     = allUsersCache[id];
    const name  = u.username || "Guest";
    const color = u.usernameColor || "#ffffff";
    if (filter && !name.toLowerCase().includes(filter) && !id.toLowerCase().includes(filter)) continue;
    count++;

    const card = document.createElement("div");
    card.className = "modUserCard";

    const avatarEl = buildAvatarEl(u.avatarUrl || null, name, color, 38);
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

    const banBtn = document.createElement("button");
    banBtn.className   = "mod-action-btn danger sm";
    banBtn.textContent = "🚫 Ban";
    banBtn.addEventListener("click", async () => {
      const ok = await modConfirm("🚫","Ban User?",`Ban "${name}"? They will be unable to send messages.`);
      if (ok) { db.ref(`adminData/bannedUsers/${id}`).set(true); document.querySelector('.modTab[data-tab="bans"]').click(); }
    });

    const removeBtn = document.createElement("button");
    removeBtn.className   = "removeUserBtn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      const ok = await modConfirm("⚠️","Remove User?",`Permanently remove "${name}" from the server?`);
      if (ok) await Promise.all([db.ref(`adminData/allUsers/${id}`).remove(), db.ref(`adminData/userTags/${id}`).remove()]);
    });

    actions.appendChild(banBtn);
    actions.appendChild(removeBtn);
    card.appendChild(avatarEl);
    card.appendChild(info);
    card.appendChild(actions);
    list.appendChild(card);
  }

  document.getElementById("usersTabBadge").textContent = Object.keys(allUsersCache).filter(k => k !== "placeholder").length;
  if (count === 0) list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">🔍</div>${filter ? "No users match your search." : "No users yet."}</div>`;
}

function renderTagsList(allTags) {
  const list    = document.getElementById("userTagsList");
  list.innerHTML = "";
  const entries = Object.entries(allTags).filter(([id]) => id !== "placeholder");
  document.getElementById("tagsTabBadge").textContent = entries.length;

  if (entries.length === 0) {
    list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">🏷️</div>No tagged users yet.</div>`;
    return;
  }

  entries.forEach(([id, tags]) => {
    const user  = allUsersCache[id] || {};
    const name  = user.username || "Unknown User";
    const color = user.usernameColor || "#ffffff";

    const card = document.createElement("div");
    card.className = "taggedUserCard";

    const header = document.createElement("div");
    header.className = "taggedUserHeader";

    const avatarEl = buildAvatarEl(user.avatarUrl || null, name, color, 28);
    const nameEl   = document.createElement("div");
    nameEl.className   = "taggedUserName";
    nameEl.textContent = name;
    nameEl.style.color = color;
    const idEl = document.createElement("div");
    idEl.className = "taggedUserId";
    idEl.innerHTML = `<span>${id.length > 18 ? id.substring(0,18)+"…":id}</span> 📋`;
    idEl.addEventListener("click", () => copyToClipboard(id, idEl));

    header.appendChild(avatarEl);
    header.appendChild(nameEl);
    header.appendChild(idEl);

    const pillsRow = document.createElement("div");
    pillsRow.className = "taggedPills";

    tags.forEach(tag => {
      const style = TAG_STYLES[tag] || {};
      const pill  = document.createElement("span");
      pill.className = "tagPill";
      if (style.color)  pill.style.color = style.color;
      if (style.bg)     pill.style.background = style.bg;
      if (style.border) pill.style.borderColor = style.border;

      const label = document.createElement("span");
      label.textContent = tag;
      const del = document.createElement("button");
      del.className   = "tagPillDelete";
      del.textContent = "✕";
      del.addEventListener("click", async () => {
        const ok = await modConfirm("🏷️",`Remove "${tag}" tag?`,`Remove ${tag} from ${name}?`);
        if (!ok) return;
        db.ref(`adminData/userTags/${id}`).once("value", s => {
          const updated = (s.val() || []).filter(t => t !== tag);
          updated.length === 0 ? db.ref(`adminData/userTags/${id}`).remove() : db.ref(`adminData/userTags/${id}`).set(updated);
        });
      });
      pill.appendChild(label);
      pill.appendChild(del);
      pillsRow.appendChild(pill);
    });

    card.appendChild(header);
    card.appendChild(pillsRow);
    list.appendChild(card);
  });
}

function renderBannedList(banned) {
  const list    = document.getElementById("bannedUsersList");
  list.innerHTML = "";
  const entries = Object.keys(banned).filter(k => k !== "placeholder");
  document.getElementById("bansTabBadge").textContent = entries.length;

  if (entries.length === 0) {
    list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">✅</div>No banned users.</div>`;
    return;
  }

  entries.forEach(id => {
    const user  = allUsersCache[id];
    const displayName = user ? `${user.username}  (${id.substring(0,14)}…)` : id;

    const card = document.createElement("div");
    card.className = "bannedCard";

    const icon = document.createElement("span");
    icon.className = "bannedIcon";
    icon.textContent = "🚫";

    const idEl = document.createElement("span");
    idEl.className   = "bannedId";
    idEl.textContent = displayName;
    idEl.addEventListener("click", () => copyToClipboard(id, idEl));

    const unbanBtn = document.createElement("button");
    unbanBtn.className   = "unbanBtn";
    unbanBtn.textContent = "✓ Unban";
    unbanBtn.addEventListener("click", async () => {
      const ok = await modConfirm("✅","Unban User?",`Unban "${user ? user.username : id}"?`);
      if (ok) db.ref(`adminData/bannedUsers/${id}`).remove();
    });

    card.appendChild(icon);
    card.appendChild(idEl);
    card.appendChild(unbanBtn);
    list.appendChild(card);
  });
}

// ---- TIMEOUTS ----
function initTimeoutTab() {
  // Duration button selection
  document.querySelectorAll(".timeoutDurBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".timeoutDurBtn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedTimeoutMs = parseInt(btn.getAttribute("data-ms"));
    });
  });

  document.getElementById("applyTimeoutBtn").addEventListener("click", async () => {
    const id = document.getElementById("timeoutUserIdInput").value.trim();
    if (!id)               return alert("Please enter a User ID.");
    if (!selectedTimeoutMs) return alert("Please select a duration.");

    const user  = allUsersCache[id];
    const uname = user ? user.username : id;
    const label = document.querySelector(`.timeoutDurBtn[data-ms="${selectedTimeoutMs}"]`)?.textContent || "";
    const ok    = await modConfirm("⏱️","Apply Timeout?",`Timeout "${uname}" for ${label}?`);
    if (!ok) return;

    const until = Date.now() + selectedTimeoutMs;
    await db.ref(`adminData/timeouts/${id}`).set({ until, username: uname });
    document.getElementById("timeoutUserIdInput").value = "";
    document.querySelectorAll(".timeoutDurBtn").forEach(b => b.classList.remove("selected"));
    selectedTimeoutMs = null;
  });
}

function renderTimeoutsList(timeouts) {
  const list    = document.getElementById("activeTimeoutsList");
  list.innerHTML = "";
  const entries = Object.entries(timeouts).filter(([id]) => id !== "placeholder");

  // Filter to only active ones
  const active = entries.filter(([, v]) => v.until > Date.now());
  document.getElementById("timeoutsTabBadge").textContent = active.length;

  if (active.length === 0) {
    list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">✅</div>No active timeouts.</div>`;
    return;
  }

  active.forEach(([id, v]) => {
    const remaining = v.until - Date.now();
    const totalMins = Math.ceil(remaining / 60000);
    const hrs       = Math.floor(totalMins / 60);
    const mins      = totalMins % 60;
    const label     = hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`;

    const card = document.createElement("div");
    card.className = "timeoutCard";

    const info = document.createElement("div");
    info.className = "timeoutInfo";
    const nameEl = document.createElement("div");
    nameEl.className   = "timeoutName";
    nameEl.textContent = v.username || id;
    const timeEl = document.createElement("div");
    timeEl.className   = "timeoutRemaining";
    timeEl.textContent = `⏱ ${label}`;

    info.appendChild(nameEl);
    info.appendChild(timeEl);

    const releaseBtn = document.createElement("button");
    releaseBtn.className   = "unbanBtn";
    releaseBtn.textContent = "Release";
    releaseBtn.addEventListener("click", async () => {
      const ok = await modConfirm("✅","Release Timeout?",`End timeout for "${v.username || id}" early?`);
      if (ok) db.ref(`adminData/timeouts/${id}`).remove();
    });

    card.appendChild(info);
    card.appendChild(releaseBtn);
    list.appendChild(card);
  });
}

function initModMenu() {
  initModMenuTabs();
  initModSearch();
  buildTagPalette();
  initTimeoutTab();

  // Reset to users tab
  document.querySelectorAll(".modTab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".modTabContent").forEach(c => c.classList.remove("active"));
  document.querySelector('.modTab[data-tab="users"]').classList.add("active");
  document.getElementById("tabUsers").classList.add("active");

  db.ref("adminData/allUsers").on("value", snap => {
    allUsersCache = snap.val() || {};
    const q = document.getElementById("modSearchInput").value.trim().toLowerCase();
    renderUsersList(q);
  });

  db.ref("adminData/bannedUsers").on("value", snap => renderBannedList(snap.val() || {}));
  db.ref("adminData/userTags").on("value",    snap => renderTagsList(snap.val() || {}));
  db.ref("adminData/timeouts").on("value",    snap => renderTimeoutsList(snap.val() || {}));
}

banUserBtn.addEventListener("click", async () => {
  const id    = banUserInput.value.trim();
  if (!id) return;
  const user  = allUsersCache[id];
  const uname = user ? user.username : id;
  const ok    = await modConfirm("🚫","Ban User?",`Ban "${uname}"?`);
  if (ok) { db.ref(`adminData/bannedUsers/${id}`).set(true); banUserInput.value = ""; }
});

addTagBtn.addEventListener("click", () => {
  const id  = document.getElementById("tagUserIdInput").value.trim();
  const tag = document.getElementById("tagNameInput").value.trim();
  if (!id || !tag || !availableTags.includes(tag)) {
    alert("Please select a tag from the palette and enter a valid User ID.");
    return;
  }
  db.ref(`adminData/userTags/${id}`).once("value", snap => {
    const current = snap.val() || [];
    if (!current.includes(tag)) { current.push(tag); db.ref(`adminData/userTags/${id}`).set(current); }
    document.getElementById("tagUserIdInput").value = "";
    document.getElementById("tagNameInput").value   = "";
    selectedTagFromPalette = null;
    document.querySelectorAll(".tagPaletteBtn").forEach(b => b.classList.remove("selected"));
  });
});

// ============================================================
// CHANNEL SWITCHING
// ============================================================
document.addEventListener("click", e => {
  const btn = e.target.closest(".serverBtn");
  if (btn) {
    switchServer(btn.getAttribute("data-server"));
    document.querySelectorAll(".serverBtn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  }
});

document.querySelectorAll(".serverBtn").forEach(button => {
  button.onclick = () => {
    const serverId = button.getAttribute("data-server");
    switchServer(serverId);
    document.querySelectorAll(".serverBtn").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
  };
});
