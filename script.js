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
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
const appContainer         = document.getElementById("appContainer");
const loadingScreen        = document.getElementById("loadingScreen");
const chatbox              = document.getElementById("chatbox");
const msgInput             = document.getElementById("msgInput");
const sendBtn              = document.getElementById("sendBtn");
const channelName          = document.getElementById("channelName");
const sidebarUsername      = document.getElementById("sidebarUsername");
const sidebarAvatar        = document.getElementById("sidebarAvatar");
const logoutBtn            = document.getElementById("logoutBtn");
const changeUsernameBtn    = document.getElementById("changeUsernameBtn");
const usernameChangeBar    = document.getElementById("usernameChangeBar");
const usernameChangeInput  = document.getElementById("usernameChangeInput");
const usernameChangeSaveBtn    = document.getElementById("usernameChangeSaveBtn");
const usernameChangeCancelBtn  = document.getElementById("usernameChangeCancelBtn");
const usernameChangeCooldown   = document.getElementById("usernameChangeCooldown");

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
let currentServer   = "server1";
let dbRef           = null;
let dbListener      = null;
let displayedMessages = new Set();

// ============================================================
// HELPERS
// ============================================================
function showError(el, msg) {
  el.textContent = msg;
  el.classList.add("show");
}
function clearError(el) {
  el.textContent = "";
  el.classList.remove("show");
}
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
    "auth/user-not-found":      "No account with that email.",
    "auth/wrong-password":      "Incorrect password.",
    "auth/invalid-email":       "Invalid email address.",
    "auth/too-many-requests":   "Too many attempts — try again later.",
    "auth/email-already-in-use":"An account with that email already exists.",
    "auth/invalid-credential":  "Incorrect email or password.",
  };
  return map[code] || "Something went wrong. Try again.";
}

// ============================================================
// AUTH SCREEN NAVIGATION
// ============================================================
function showCard(which) {
  loginCard.style.display          = which === "login"           ? "" : "none";
  signupCard.style.display         = which === "signup"          ? "" : "none";
  verifyCard.style.display         = which === "verify"          ? "" : "none";
  googleUsernameCard.style.display = which === "googleUsername"  ? "" : "none";
  clearError(loginError);
  clearError(signupError);
  clearError(googleUsernameError);
}

showSignupBtn.addEventListener("click",  e => { e.preventDefault(); showCard("signup"); });
showLoginBtn.addEventListener("click",   e => { e.preventDefault(); showCard("login"); });
backToLoginBtn.addEventListener("click", e => { e.preventDefault(); showCard("login"); });

// ============================================================
// USERNAME AVAILABILITY CHECK
// ============================================================
function checkUsernameAvailable(name, excludeUid, callback) {
  db.ref("adminData/allUsers").once("value", snap => {
    const users = snap.val() || {};
    const lower = name.toLowerCase();
    let taken = false;
    for (let id in users) {
      if (id === excludeUid) continue;
      if ((users[id].username || "").toLowerCase() === lower) { taken = true; break; }
    }
    callback(!taken);
  });
}

async function findAvailableUsername(base) {
  const snap  = await db.ref("adminData/allUsers").once("value");
  const users = snap.val() || {};
  const taken = new Set(Object.values(users).map(u => (u.username || "").toLowerCase()));
  let candidate = base.replace(/\s+/g, "").substring(0, 20) || "User";
  if (!taken.has(candidate.toLowerCase())) return candidate;
  let i = 2;
  while (taken.has((candidate + i).toLowerCase())) i++;
  return candidate + i;
}

// Live username check on signup form
let usernameCheckTimer = null;
function setupLiveUsernameCheck(inputEl, hintEl, excludeUid = null) {
  inputEl.addEventListener("input", () => {
    clearTimeout(usernameCheckTimer);
    const val = inputEl.value.trim();
    if (!val) { hintEl.textContent = ""; hintEl.className = "field-hint"; return; }
    hintEl.textContent = "Checking...";
    hintEl.className = "field-hint";
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
  } catch(err) {
    showError(loginError, err.message);
  }
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
      username: name,
      usernameColor: "#5865f2",
      lastUsernameChange: 0,
      email: pendingGoogleUser.email || ""
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
        username: name,
        usernameColor: "#5865f2",
        lastUsernameChange: 0,
        email: email
      });
      verifyEmailAddr.textContent = email;
      showCard("verify");
    } catch(err) {
      showError(signupError, friendlyAuthError(err.code));
    }
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
  } catch(err) {
    showError(loginError, friendlyAuthError(err.code));
  }
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
// AUTH STATE OBSERVER
// ============================================================
auth.onAuthStateChanged(async user => {
  if (!user) {
    authScreen.style.display = "flex";
    appContainer.style.display = "none";
    loadingScreen.style.display = "none";
    showCard("login");
    return;
  }

  const isGoogle = user.providerData[0]?.providerId === "google.com";

  if (!isGoogle && !user.emailVerified) {
    await auth.signOut();
    return;
  }

  const snap = await db.ref(`adminData/allUsers/${user.uid}`).once("value");
  if (!snap.exists()) {
    return;
  }

  currentUser   = user;
  currentUserId = user.uid;
  authScreen.style.display = "none";
  startApp();
});

// ============================================================
// LOGOUT
// ============================================================
logoutBtn.addEventListener("click", () => {
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
  
  const chatboxElement = document.getElementById("chatbox");
  if (chatboxElement) chatboxElement.style.fontSize = savedSize;

  ["12px","14px","16px","18px"].forEach(size => {
    const btn = document.createElement("button");
    btn.className = "size-btn" + (savedSize === size ? " active" : "");
    btn.textContent = size;
    btn.addEventListener("click", () => {
      if (chatboxElement) chatboxElement.style.fontSize = size;
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
  sidebarAvatar.textContent   = currentUsername.charAt(0).toUpperCase();
}

// ============================================================
// USERNAME CHANGE (once per week)
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
    usernameChangeInput.disabled = false;
    usernameChangeSaveBtn.disabled = false;
  }

  usernameChangeInput.value = currentUsername;
  usernameChangeBar.style.display = "block";
  if (!usernameChangeInput.disabled) usernameChangeInput.focus();
});

usernameChangeCancelBtn.addEventListener("click", () => {
  usernameChangeBar.style.display = "none";
});

usernameChangeSaveBtn.addEventListener("click", async () => {
  const newName = usernameChangeInput.value.trim();
  if (!newName || newName.length < 2) return alert("Username must be at least 2 characters.");
  if (newName === currentUsername)    { usernameChangeBar.style.display = "none"; return; }

  const snap = await db.ref(`adminData/allUsers/${currentUserId}/lastUsernameChange`).once("value");
  if (Date.now() - (snap.val() || 0) < WEEK_MS) return alert("You can only change your username once per week.");

  checkUsernameAvailable(newName, currentUserId, async available => {
    if (!available) return alert("That username is already taken.");
    currentUsername = newName;
    await db.ref(`adminData/allUsers/${currentUserId}`).update({
      username: newName,
      lastUsernameChange: Date.now()
    });
    updateUserPanel();
    usernameChangeBar.style.display = "none";
  });
});

// ============================================================
// BETA WARNING DISMISS
// ============================================================
const betaWarn = document.getElementById("betaWarning");
if (betaWarn) {
  betaWarn.addEventListener("click", () => {
    betaWarn.style.opacity = "0";
    betaWarn.style.transform = "scale(0.9)";
    setTimeout(() => betaWarn.style.display = "none", 300);
  });
}

// ============================================================
// SERVER / CHANNEL SWITCHING
// ============================================================
function switchServer(serverName) {
  currentServer = serverName;
  chatbox.innerHTML = "";
  displayedMessages.clear();

  if (dbRef && dbListener) { dbRef.off("child_added", dbListener); dbListener = null; }

  dbRef = db.ref(`messages/${currentServer}`);

  document.querySelectorAll(".serverBtn").forEach(btn => {
    btn.classList.toggle("selected", btn.getAttribute("data-server") === serverName);
  });

  const names = { server1: "general", server2: "general-2" };
  const label = names[serverName] || serverName;
  channelName.textContent = label;
  msgInput.placeholder    = `Message #${label}`;

  dbRef.orderByChild("timestamp").once("value", snap => {
    const msgs = [];
    snap.forEach(child => {
      msgs.push({ key: child.key, ...child.val() });
    });
    
    msgs.forEach(data => {
      if (displayedMessages.has(data.key)) return;
      displayedMessages.add(data.key);
      addMessageToChat(data.name, data.message, data.time, data.userId === currentUserId, data.color, data.userId, data.key, data.timestamp);
    });

    chatbox.scrollTop = chatbox.scrollHeight;

    const since = Date.now();
    dbListener = dbRef.orderByChild("timestamp").startAt(since).on("child_added", snapshot => {
      const key  = snapshot.key;
      const data = snapshot.val();
      if (displayedMessages.has(key)) return;
      displayedMessages.add(key);
      addMessageToChat(data.name, data.message, data.time, data.userId === currentUserId, data.color, data.userId, key, data.timestamp);
    });
  });
}

// ============================================================
// RENDER MESSAGE
// ============================================================
function addMessageToChat(name, message, time, isMine, color, senderId, messageId, timestamp = 0) {
  db.ref(`adminData/userTags/${senderId}`).once("value", snap => {
    const tags   = snap.val() || [];
    const tagHTML = tags.length
      ? `<span class="tag-glow">${tags.map(t =>
          `<span class="tag-${t.toLowerCase().replace(/\s+/g,"-")}">[${t}]</span>`
        ).join(" ")}</span> `
      : "";

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", isMine ? "mine" : "other");
    msgDiv.setAttribute("data-message-id", messageId);
    msgDiv.setAttribute("data-timestamp", timestamp);
    
    const nameColor = color || "#ffffff";
    
    msgDiv.innerHTML = `
      <div class="msg-header">
        ${tagHTML}
        <span class="username" style="color:${nameColor} !important">${escapeHtml(name)}</span>
        <span class="time">${time}</span>
      </div>
      <span class="text">${message}</span>
      <div class="reactions"></div>
    `;

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
        ref.once("value", s => {
          s.exists() ? ref.remove() : ref.set(true);
          picker.style.display = "none";
        });
      });
      picker.appendChild(eBtn);
    });
    msgDiv.appendChild(picker);

    msgDiv.addEventListener("click", e => {
      if (e.target.closest(".reaction") || e.target.classList.contains("emoji-btn")) return;
      document.querySelectorAll(".emoji-picker").forEach(p => {
        if (p !== picker) p.style.display = "none";
      });
      picker.style.display = picker.style.display === "none" ? "flex" : "none";
    });

    db.ref(`messages/${currentServer}/${messageId}/reactions`).on("value", snap => {
      const reactions   = snap.val() || {};
      const reactionDiv = msgDiv.querySelector(".reactions");
      reactionDiv.innerHTML = "";
      
      let hasReactions = false;
      emojis.forEach(emoji => {
        const key = encodeEmoji(emoji);
        if (!reactions[key]) return;
        hasReactions = true;
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
      if (isNearBottom) {
        chatbox.scrollTop = chatbox.scrollHeight;
      }
    });

    // Intelligent insertion (sorted by timestamp)
    const allMsgs = Array.from(chatbox.children);
    if (allMsgs.length === 0) {
      chatbox.appendChild(msgDiv);
    } else {
      let inserted = false;
      for (let i = allMsgs.length - 1; i >= 0; i--) {
        const existingTime = parseInt(allMsgs[i].getAttribute("data-timestamp") || "0");
        if (existingTime <= timestamp) {
          chatbox.insertBefore(msgDiv, allMsgs[i].nextSibling);
          inserted = true;
          break;
        }
      }
      if (!inserted) chatbox.insertBefore(msgDiv, chatbox.firstChild);
    }
    
    chatbox.scrollTop = chatbox.scrollHeight;
    return msgDiv;
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

let lastSentTime = 0;

function sendMessage() {
  const now = Date.now();
  if (now - lastSentTime < 2000) return;
  const rawMsg = msgInput.value.trim();
  if (!rawMsg) return;

  isUserBanned(banned => {
    if (banned) { alert("You are banned from sending messages."); msgInput.value = ""; return; }

    const filtered  = filterBadWords(rawMsg);
    const formatted = parseMarkdown(filtered);

    db.ref(`messages/${currentServer}`).push({
      name:      currentUsername,
      message:   formatted,
      time:      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: now,
      color:     myColor,
      userId:    currentUserId
    });

    msgInput.value = "";
    lastSentTime   = now;

    db.ref(`adminData/allUsers/${currentUserId}`).update({
      username:      currentUsername,
      usernameColor: myColor
    });
  });
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && msgInput.value.trim() !== "/modmenu") sendMessage();
});

// ============================================================
// MOD MENU — FULLY REDESIGNED
// ============================================================

// Tag color/style map
const TAG_STYLES = {
  "Mod":           { color: "#ff4444", bg: "rgba(255,68,68,0.15)",    border: "rgba(255,68,68,0.35)"   },
  "Admin":         { color: "#ff9900", bg: "rgba(255,153,0,0.15)",    border: "rgba(255,153,0,0.35)"   },
  "SN":            { color: "#5b8aff", bg: "rgba(91,138,255,0.15)",   border: "rgba(91,138,255,0.35)"  },
  "VIP":           { color: "#ffd700", bg: "rgba(255,215,0,0.15)",    border: "rgba(255,215,0,0.35)"   },
  "Friend":        { color: "#57f287", bg: "rgba(87,242,135,0.15)",   border: "rgba(87,242,135,0.35)"  },
  "Tester":        { color: "#00ffff", bg: "rgba(0,255,255,0.15)",    border: "rgba(0,255,255,0.35)"   },
  "Owner":         { color: "#ffffff", bg: "rgba(255,255,255,0.1)",   border: "rgba(255,255,255,0.25)" },
  "Dev":           { color: "#888888", bg: "rgba(136,136,136,0.15)",  border: "rgba(136,136,136,0.3)"  },
  "Jobless":       { color: "#a0522d", bg: "rgba(160,82,45,0.15)",    border: "rgba(160,82,45,0.35)"   },
  "Asked for Tag": { color: "#808080", bg: "rgba(128,128,128,0.12)",  border: "rgba(128,128,128,0.28)" },
  "Gay":           { color: null,      bg: "rgba(255,100,100,0.1)",   border: "rgba(255,100,100,0.2)"  },
};

const availableTags = ["Mod","Admin","SN","VIP","Friend","Tester","Owner","Dev","Jobless","Asked for Tag","Gay"];

let allUsersCache = {};
let selectedTagFromPalette = null;

// ---- Confirm Dialog ----
function modConfirm(icon, title, message) {
  return new Promise(resolve => {
    const dialog = document.getElementById("modConfirmDialog");
    document.getElementById("confirmIcon").textContent = icon;
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMessage").textContent = message;
    dialog.style.display = "flex";

    const ok     = document.getElementById("confirmOkBtn");
    const cancel = document.getElementById("confirmCancelBtn");

    // Clone to remove old listeners
    const newOk     = ok.cloneNode(true);
    const newCancel = cancel.cloneNode(true);
    ok.parentNode.replaceChild(newOk, ok);
    cancel.parentNode.replaceChild(newCancel, cancel);

    function cleanup(result) {
      dialog.style.display = "none";
      resolve(result);
    }

    newOk.addEventListener("click",     () => cleanup(true));
    newCancel.addEventListener("click", () => cleanup(false));
  });
}

// ---- Copy to clipboard ----
function copyToClipboard(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = el.innerHTML;
    el.classList.add("copied");
    el.innerHTML = "✓ Copied!";
    setTimeout(() => { el.innerHTML = orig; el.classList.remove("copied"); }, 1500);
  });
}

// ---- Setup mod menu trigger ----
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

// ---- Password check ----
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

// ---- Close mod menu ----
modMenuCloseBtn.addEventListener("click", () => {
  modMenu.style.display = "none";
  modMenuPasswordGate.style.display = "none";
  db.ref("adminData/allUsers").off();
  db.ref("adminData/bannedUsers").off();
  db.ref("adminData/userTags").off();
});

// ---- Tab switching ----
function initModMenuTabs() {
  document.querySelectorAll(".modTab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".modTab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".modTabContent").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const tabId = "tab" + tab.getAttribute("data-tab").charAt(0).toUpperCase() + tab.getAttribute("data-tab").slice(1);
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// ---- Search ----
function initModSearch() {
  document.getElementById("modSearchInput").addEventListener("input", e => {
    renderUsersList(e.target.value.trim().toLowerCase());
  });
}

// ---- Tag Palette ----
function buildTagPalette() {
  const palette = document.getElementById("tagPalette");
  palette.innerHTML = "";

  availableTags.forEach(tag => {
    const style = TAG_STYLES[tag] || {};
    const btn = document.createElement("button");
    btn.className = "tagPaletteBtn";
    btn.textContent = tag;
    if (style.color) btn.style.color = style.color;
    if (style.bg)    btn.style.background = style.bg;
    if (style.border) btn.style.borderColor = style.border;
    if (tag === "Gay") {
      btn.style.background = "linear-gradient(to right, rgba(255,68,68,0.15), rgba(255,153,0,0.15), rgba(87,242,135,0.15), rgba(91,138,255,0.15))";
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

// ---- Render user list ----
function renderUsersList(filter = "") {
  const list = document.getElementById("allUsersList");
  list.innerHTML = "";
  const users = allUsersCache;
  let count = 0;

  for (let id in users) {
    if (id === "placeholder") continue;
    const u = users[id];
    const name  = u.username || "Guest";
    const color = u.usernameColor || "#ffffff";

    if (filter && !name.toLowerCase().includes(filter) && !id.toLowerCase().includes(filter)) continue;
    count++;

    const card = document.createElement("div");
    card.className = "modUserCard";

    // Avatar
    const avatar = document.createElement("div");
    avatar.className = "modUserAvatar";
    avatar.textContent = name.charAt(0).toUpperCase();
    avatar.style.background = `linear-gradient(135deg, ${color}cc, ${color}66)`;

    // Info
    const info = document.createElement("div");
    info.className = "modUserInfo";

    const nameEl = document.createElement("div");
    nameEl.className = "modUserName";
    nameEl.textContent = name;
    nameEl.style.color = color;

    const idEl = document.createElement("div");
    idEl.className = "modUserId";
    idEl.innerHTML = `<span>${id.length > 20 ? id.substring(0, 20) + "…" : id}</span><span class="copy-icon">📋</span>`;
    idEl.title = "Click to copy User ID";
    idEl.addEventListener("click", () => copyToClipboard(id, idEl));

    info.appendChild(nameEl);
    info.appendChild(idEl);

    // Actions
    const actions = document.createElement("div");
    actions.className = "modUserActions";

    const banBtn = document.createElement("button");
    banBtn.className = "mod-action-btn danger sm";
    banBtn.textContent = "🚫 Ban";
    banBtn.addEventListener("click", async () => {
      const ok = await modConfirm("🚫", "Ban User?", `Ban "${name}"? They will be unable to send messages.`);
      if (ok) {
        db.ref(`adminData/bannedUsers/${id}`).set(true);
        document.querySelector('.modTab[data-tab="bans"]').click();
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "removeUserBtn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      const ok = await modConfirm("⚠️", "Remove User?", `Permanently remove "${name}" from the server user list? This cannot be undone.`);
      if (ok) {
        await Promise.all([
          db.ref(`adminData/allUsers/${id}`).remove(),
          db.ref(`adminData/userTags/${id}`).remove()
        ]);
      }
    });

    actions.appendChild(banBtn);
    actions.appendChild(removeBtn);

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(actions);
    list.appendChild(card);
  }

  // Update badge
  document.getElementById("usersTabBadge").textContent =
    Object.keys(users).filter(k => k !== "placeholder").length;

  if (count === 0) {
    list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">🔍</div>${filter ? "No users match your search." : "No users yet."}</div>`;
  }
}

// ---- Render tags list ----
function renderTagsList(allTags) {
  const list = document.getElementById("userTagsList");
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

    // Header
    const header = document.createElement("div");
    header.className = "taggedUserHeader";

    const nameEl = document.createElement("div");
    nameEl.className = "taggedUserName";
    nameEl.textContent = name;
    nameEl.style.color = color;

    const idEl = document.createElement("div");
    idEl.className = "taggedUserId";
    idEl.innerHTML = `<span>${id.length > 18 ? id.substring(0, 18) + "…" : id}</span> 📋`;
    idEl.title = "Click to copy ID";
    idEl.addEventListener("click", () => copyToClipboard(id, idEl));

    header.appendChild(nameEl);
    header.appendChild(idEl);

    // Pills
    const pillsRow = document.createElement("div");
    pillsRow.className = "taggedPills";

    tags.forEach(tag => {
      const style = TAG_STYLES[tag] || {};
      const pill  = document.createElement("span");
      pill.className = "tagPill";
      if (style.color)  pill.style.color = style.color;
      if (style.bg)     pill.style.background = style.bg;
      if (style.border) pill.style.borderColor = style.border;
      if (tag === "Gay") {
        pill.style.background = "linear-gradient(to right, rgba(255,68,68,0.15), rgba(255,153,0,0.15), rgba(87,242,135,0.15), rgba(91,138,255,0.15))";
      }

      const label = document.createElement("span");
      label.textContent = tag;

      const del = document.createElement("button");
      del.className = "tagPillDelete";
      del.textContent = "✕";
      del.title = `Remove ${tag} tag`;
      del.addEventListener("click", async () => {
        const ok = await modConfirm("🏷️", `Remove "${tag}" tag?`, `Remove the ${tag} tag from ${name}?`);
        if (!ok) return;
        db.ref(`adminData/userTags/${id}`).once("value", snap => {
          const current = snap.val() || [];
          const updated = current.filter(t => t !== tag);
          if (updated.length === 0) {
            db.ref(`adminData/userTags/${id}`).remove();
          } else {
            db.ref(`adminData/userTags/${id}`).set(updated);
          }
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

// ---- Render banned list ----
function renderBannedList(banned) {
  const list = document.getElementById("bannedUsersList");
  list.innerHTML = "";
  const entries = Object.keys(banned).filter(k => k !== "placeholder");
  document.getElementById("bansTabBadge").textContent = entries.length;

  if (entries.length === 0) {
    list.innerHTML = `<div class="modEmpty"><div class="modEmptyIcon">✅</div>No banned users.</div>`;
    return;
  }

  entries.forEach(id => {
    const user = allUsersCache[id];
    const displayName = user
      ? `${user.username}  (${id.substring(0, 14)}…)`
      : id;

    const card = document.createElement("div");
    card.className = "bannedCard";

    const icon = document.createElement("span");
    icon.className = "bannedIcon";
    icon.textContent = "🚫";

    const idEl = document.createElement("span");
    idEl.className = "bannedId";
    idEl.textContent = displayName;
    idEl.title = "Click to copy ID";
    idEl.addEventListener("click", () => copyToClipboard(id, idEl));

    const unbanBtn = document.createElement("button");
    unbanBtn.className = "unbanBtn";
    unbanBtn.textContent = "✓ Unban";
    unbanBtn.addEventListener("click", async () => {
      const uname = user ? user.username : id;
      const ok = await modConfirm("✅", "Unban User?", `Unban "${uname}"? They will be able to send messages again.`);
      if (ok) db.ref(`adminData/bannedUsers/${id}`).remove();
    });

    card.appendChild(icon);
    card.appendChild(idEl);
    card.appendChild(unbanBtn);
    list.appendChild(card);
  });
}

// ---- INIT MOD MENU ----
function initModMenu() {
  initModMenuTabs();
  initModSearch();
  buildTagPalette();

  // Reset to users tab
  document.querySelectorAll(".modTab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".modTabContent").forEach(c => c.classList.remove("active"));
  document.querySelector('.modTab[data-tab="users"]').classList.add("active");
  document.getElementById("tabUsers").classList.add("active");

  // Live data listeners
  db.ref("adminData/allUsers").on("value", snap => {
    allUsersCache = snap.val() || {};
    const q = document.getElementById("modSearchInput").value.trim().toLowerCase();
    renderUsersList(q);
  });

  db.ref("adminData/bannedUsers").on("value", snap => {
    renderBannedList(snap.val() || {});
  });

  db.ref("adminData/userTags").on("value", snap => {
    renderTagsList(snap.val() || {});
  });
}

// ---- Ban button (ban tab) ----
banUserBtn.addEventListener("click", async () => {
  const id = banUserInput.value.trim();
  if (!id) return;
  const user  = allUsersCache[id];
  const uname = user ? user.username : id;
  const ok    = await modConfirm("🚫", "Ban User?", `Ban "${uname}"? They will be unable to send messages.`);
  if (ok) {
    db.ref(`adminData/bannedUsers/${id}`).set(true);
    banUserInput.value = "";
  }
});

// ---- Add tag ----
addTagBtn.addEventListener("click", () => {
  const id  = document.getElementById("tagUserIdInput").value.trim();
  const tag = document.getElementById("tagNameInput").value.trim();
  if (!id || !tag || !availableTags.includes(tag)) {
    alert("Please select a tag from the palette and enter a valid User ID.");
    return;
  }
  db.ref(`adminData/userTags/${id}`).once("value", snap => {
    const current = snap.val() || [];
    if (!current.includes(tag)) {
      current.push(tag);
      db.ref(`adminData/userTags/${id}`).set(current);
    }
    document.getElementById("tagUserIdInput").value = "";
    document.getElementById("tagNameInput").value   = "";
    selectedTagFromPalette = null;
    document.querySelectorAll(".tagPaletteBtn").forEach(b => b.classList.remove("selected"));
  });
});

// ============================================================
// CHANNEL SWITCHING CLICK HANDLERS
// ============================================================
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".serverBtn");
  if (btn) {
    const targetServer = btn.getAttribute("data-server");
    switchServer(targetServer);
    document.querySelectorAll(".serverBtn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  }
});

document.querySelectorAll('.serverBtn').forEach(button => {
  button.onclick = () => {
    const serverId = button.getAttribute('data-server');
    const name = button.textContent.trim().replace('#', '').trim();
    switchServer(serverId);
    if (channelName) channelName.textContent = name;
    document.querySelectorAll('.serverBtn').forEach(b => b.classList.remove('selected'));
    button.classList.add('selected');
  };
});
