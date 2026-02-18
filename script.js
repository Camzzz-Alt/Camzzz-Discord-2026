// ============================================================
// FIREBASE CONFIG
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
// AUTH UI ELEMENTS
// ============================================================
const authScreen      = document.getElementById("authScreen");
const loginCard       = document.getElementById("loginCard");
const signupCard      = document.getElementById("signupCard");
const verifyCard      = document.getElementById("verifyCard");

// Login
const loginEmail      = document.getElementById("loginEmail");
const loginPassword   = document.getElementById("loginPassword");
const loginBtn        = document.getElementById("loginBtn");
const loginError      = document.getElementById("loginError");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const showSignupBtn   = document.getElementById("showSignupBtn");
const verifyNotice    = document.getElementById("verifyNotice");
const resendVerifyBtn = document.getElementById("resendVerifyBtn");

// Signup
const signupUsername  = document.getElementById("signupUsername");
const signupEmail     = document.getElementById("signupEmail");
const signupPassword  = document.getElementById("signupPassword");
const signupBtn       = document.getElementById("signupBtn");
const signupError     = document.getElementById("signupError");
const googleSignUpBtn = document.getElementById("googleSignUpBtn");
const showLoginBtn    = document.getElementById("showLoginBtn");
const usernameCheck   = document.getElementById("usernameCheck");

// Verify card
const verifyEmailAddr  = document.getElementById("verifyEmailAddr");
const resendVerifyBtn2 = document.getElementById("resendVerifyBtn2");
const backToLoginBtn   = document.getElementById("backToLoginBtn");

// App elements
const appContainer    = document.getElementById("appContainer");
const loadingScreen   = document.getElementById("loadingScreen");
const chatbox         = document.getElementById("chatbox");
const msgInput        = document.getElementById("msgInput");
const sendBtn         = document.getElementById("sendBtn");
const sidebarUsername = document.getElementById("sidebarUsername");
const sidebarAvatar   = document.getElementById("sidebarAvatar");
const logoutBtn       = document.getElementById("logoutBtn");
const channelName     = document.getElementById("channelName");
const serverIndicator = document.getElementById("serverIndicator");
const changeUsernameBtn     = document.getElementById("changeUsernameBtn");
const usernameChangeBar     = document.getElementById("usernameChangeBar");
const usernameChangeInput   = document.getElementById("usernameChangeInput");
const usernameChangeSaveBtn = document.getElementById("usernameChangeSaveBtn");
const usernameChangeCancelBtn = document.getElementById("usernameChangeCancelBtn");
const usernameChangeCooldown  = document.getElementById("usernameChangeCooldown");

// Mod menu
const modMenuPasswordGate  = document.getElementById("modMenuPasswordGate");
const modMenuPasswordInput = document.getElementById("modMenuPasswordInput");
const modMenuEnterBtn      = document.getElementById("modMenuEnterBtn");
const modMenuGateMessage   = document.getElementById("modMenuGateMessage");
const modMenu              = document.getElementById("modMenu");
const modMenuCloseBtn      = document.getElementById("modMenuCloseBtn");
const banUserInput         = document.getElementById("banUserInput");
const banUserBtn           = document.getElementById("banUserBtn");
const bannedUsersList      = document.getElementById("bannedUsersList");
const tagUserIdInput       = document.getElementById("tagUserIdInput");
const tagNameInput         = document.getElementById("tagNameInput");
const addTagBtn            = document.getElementById("addTagBtn");
const userTagsList         = document.getElementById("userTagsList");
const allUsersList         = document.getElementById("allUsersList");

// ============================================================
// GLOBAL STATE
// ============================================================
let currentUser     = null;
let currentUserId   = null;
let currentUsername = "Guest";
let myColor         = "#5865f2";
let currentServer   = "server1";
let dbRef           = null;
let listener        = null;
let displayedMessages = new Set();

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

// ============================================================
// AUTH SCREEN NAVIGATION
// ============================================================
showSignupBtn.addEventListener("click", e => { e.preventDefault(); showCard("signup"); });
showLoginBtn.addEventListener("click",  e => { e.preventDefault(); showCard("login"); });
backToLoginBtn.addEventListener("click", e => { e.preventDefault(); showCard("login"); });

function showCard(which) {
  loginCard.style.display  = which === "login"  ? "" : "none";
  signupCard.style.display = which === "signup" ? "" : "none";
  verifyCard.style.display = which === "verify" ? "" : "none";
  clearError(loginError);
  clearError(signupError);
}

// ============================================================
// GOOGLE SIGN-IN / SIGN-UP
// ============================================================
function googleAuth() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(async result => {
    const user = result.user;
    // Check if this is a new user; if so, set a username from their Google name
    const snap = await db.ref(`adminData/allUsers/${user.uid}`).once("value");
    if (!snap.exists()) {
      const baseName = (user.displayName || "User").replace(/\s+/g, "").substring(0, 20);
      const safeName = await findAvailableUsername(baseName);
      await db.ref(`adminData/allUsers/${user.uid}`).set({
        username: safeName,
        usernameColor: "#5865f2",
        lastUsernameChange: 0,
        email: user.email || ""
      });
    }
    // Google accounts are always verified — proceed straight to app
  }).catch(err => {
    showError(loginError, err.message);
  });
}
googleSignInBtn.addEventListener("click", googleAuth);
googleSignUpBtn.addEventListener("click", googleAuth);

async function findAvailableUsername(base) {
  const snap = await db.ref("adminData/allUsers").once("value");
  const users = snap.val() || {};
  const taken = new Set(Object.values(users).map(u => (u.username||"").toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let i = 2;
  while (taken.has((base + i).toLowerCase())) i++;
  return base + i;
}

// ============================================================
// EMAIL SIGNUP
// ============================================================
let usernameCheckTimer = null;
signupUsername.addEventListener("input", () => {
  clearTimeout(usernameCheckTimer);
  const val = signupUsername.value.trim();
  if (!val) { usernameCheck.textContent = ""; usernameCheck.className = "field-hint"; return; }
  usernameCheckTimer = setTimeout(() => checkUsernameAvailable(val, null, ok => {
    usernameCheck.textContent = ok ? "✓ Available" : "✗ Already taken";
    usernameCheck.className = "field-hint " + (ok ? "ok" : "taken");
  }), 400);
});

signupBtn.addEventListener("click", async () => {
  clearError(signupError);
  const name  = signupUsername.value.trim();
  const email = signupEmail.value.trim();
  const pass  = signupPassword.value;

  if (!name)  return showError(signupError, "Please choose a username.");
  if (name.length < 2) return showError(signupError, "Username must be at least 2 characters.");
  if (!email) return showError(signupError, "Please enter your email.");
  if (!pass || pass.length < 6) return showError(signupError, "Password must be at least 6 characters.");

  // Check username availability
  checkUsernameAvailable(name, null, async available => {
    if (!available) return showError(signupError, "That username is already taken.");
    try {
      const result = await auth.createUserWithEmailAndPassword(email, pass);
      const user = result.user;
      await user.sendEmailVerification();
      await db.ref(`adminData/allUsers/${user.uid}`).set({
        username: name,
        usernameColor: "#5865f2",
        lastUsernameChange: 0,
        email: email
      });
      verifyEmailAddr.textContent = email;
      showCard("verify");
    } catch(err) {
      showError(signupError, err.message);
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
      showError(loginError, "Please verify your email first.");
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
    verifyNotice.textContent = "Verification email sent!";
  } catch(err) { showError(loginError, err.message); }
});

resendVerifyBtn2.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (user) { await user.sendEmailVerification(); resendVerifyBtn2.textContent = "Sent!"; }
});

function friendlyAuthError(code) {
  const map = {
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-email": "That doesn't look like a valid email.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/email-already-in-use": "An account with that email already exists.",
  };
  return map[code] || "Something went wrong. Try again.";
}

// ============================================================
// AUTH STATE OBSERVER
// ============================================================
auth.onAuthStateChanged(async user => {
  if (user && (user.emailVerified || user.providerData[0]?.providerId === "google.com")) {
    currentUser   = user;
    currentUserId = user.uid;
    authScreen.style.display = "none";
    startApp();
  } else if (user) {
    // Signed in but not verified
    await auth.signOut();
  } else {
    authScreen.style.display = "flex";
    appContainer.style.display = "none";
    loadingScreen.style.display = "none";
  }
});

logoutBtn.addEventListener("click", () => {
  auth.signOut();
  location.reload();
});

// ============================================================
// CHECK USERNAME AVAILABILITY
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

// ============================================================
// START APP (after auth)
// ============================================================
function startApp() {
  loadingScreen.style.display = "flex";

  // Load user data
  db.ref(`adminData/allUsers/${currentUserId}`).once("value", snap => {
    const data = snap.val() || {};
    currentUsername = data.username || currentUser.displayName || "Guest";
    myColor = data.usernameColor || "#5865f2";
    buildSidebar();
    updateUserPanel();
    runLoadingCountdown();
  });
}

function runLoadingCountdown() {
  const countdownText = document.getElementById("countdownText");
  const countdownBar  = document.getElementById("countdownBar");
  let countdown = 3;
  countdownText.textContent = `${countdown}s`;
  const interval = setInterval(() => {
    countdown -= 0.1;
    const pct = ((3 - countdown) / 3) * 100;
    countdownBar.style.width = pct + "%";
    countdownText.textContent = Math.ceil(countdown) + "s";
    if (countdown <= 0) {
      clearInterval(interval);
      loadingScreen.style.display = "none";
      appContainer.style.display  = "flex";
      switchServer("server1");
      checkForModMenuCommand();
    }
  }, 100);
}

// ============================================================
// SIDEBAR SETUP
// ============================================================
function buildSidebar() {
  const sidebar = document.getElementById("sidebar");

  // Color picker
  const colorPickerBtn = document.getElementById("colorPickerBtn");
  colorPickerBtn.innerHTML = "";
  const colorPicker = document.createElement("input");
  colorPicker.type = "color";
  colorPicker.value = myColor;
  colorPicker.style.cssText = "position:absolute;opacity:0;pointer-events:none;";
  const colorBtn = document.createElement("button");
  colorBtn.className = "sidebar-ctrl-btn";
  colorBtn.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${myColor};margin-right:6px;vertical-align:middle;"></span> Username Color`;
  colorBtn.addEventListener("click", () => colorPicker.click());
  colorPicker.addEventListener("input", e => {
    myColor = e.target.value;
    colorBtn.querySelector("span").style.background = myColor;
    localStorage.setItem("usernameColor_" + currentUserId, myColor);
    db.ref(`adminData/allUsers/${currentUserId}`).update({ usernameColor: myColor });
    updateUserPanel();
  });
  colorPickerBtn.appendChild(colorBtn);
  colorPickerBtn.appendChild(colorPicker);

  // Theme color picker
  const themeSection = document.getElementById("themeColorSection");
  themeSection.innerHTML = "";
  const themeColorPicker = document.createElement("input");
  themeColorPicker.type = "color";
  themeColorPicker.value = localStorage.getItem("themeColor") || "#36393f";
  themeColorPicker.style.cssText = "position:absolute;opacity:0;pointer-events:none;";
  const themeBtn = document.createElement("button");
  themeBtn.className = "sidebar-ctrl-btn";
  themeBtn.textContent = "🎨 Chat Color";
  themeBtn.addEventListener("click", () => themeColorPicker.click());
  themeColorPicker.addEventListener("input", e => {
    localStorage.setItem("themeColor", e.target.value);
    chatbox.style.backgroundColor = e.target.value;
  });
  themeSection.appendChild(themeBtn);
  themeSection.appendChild(themeColorPicker);
  const saved = localStorage.getItem("themeColor");
  if (saved) chatbox.style.backgroundColor = saved;

  // Text size
  const textSection = document.getElementById("textSizeSection");
  textSection.innerHTML = '<div class="sidebar-section-label" style="margin-top:10px;">TEXT SIZE</div>';
  const sizeRow = document.createElement("div");
  sizeRow.className = "text-size-row";
  const savedSize = localStorage.getItem("textSize") || "14px";
  document.body.style.fontSize = savedSize;
  ["12px","14px","16px","18px"].forEach(size => {
    const btn = document.createElement("button");
    btn.className = "size-btn" + (savedSize === size ? " active" : "");
    btn.textContent = size;
    btn.addEventListener("click", () => {
      document.body.style.fontSize = size;
      localStorage.setItem("textSize", size);
      sizeRow.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
    sizeRow.appendChild(btn);
  });
  textSection.appendChild(sizeRow);

  // Logout button is in HTML
}

function updateUserPanel() {
  sidebarUsername.textContent = currentUsername;
  sidebarUsername.style.color = myColor;
  sidebarAvatar.textContent = currentUsername.charAt(0).toUpperCase();
}

// ============================================================
// USERNAME CHANGE (once per week)
// ============================================================
changeUsernameBtn.addEventListener("click", async () => {
  // Check cooldown
  const snap = await db.ref(`adminData/allUsers/${currentUserId}/lastUsernameChange`).once("value");
  const last = snap.val() || 0;
  const now  = Date.now();
  const diff = now - last;

  if (diff < WEEK_MS) {
    const remaining = WEEK_MS - diff;
    const days = Math.floor(remaining / (24*60*60*1000));
    const hrs  = Math.floor((remaining % (24*60*60*1000)) / (60*60*1000));
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
  usernameChangeInput.focus();
});

usernameChangeCancelBtn.addEventListener("click", () => {
  usernameChangeBar.style.display = "none";
});

usernameChangeSaveBtn.addEventListener("click", async () => {
  const newName = usernameChangeInput.value.trim();
  if (!newName || newName.length < 2) return alert("Username must be at least 2 characters.");
  if (newName === currentUsername) { usernameChangeBar.style.display = "none"; return; }

  const snap = await db.ref(`adminData/allUsers/${currentUserId}/lastUsernameChange`).once("value");
  const last = snap.val() || 0;
  if (Date.now() - last < WEEK_MS) return alert("You can only change your username once per week.");

  checkUsernameAvailable(newName, currentUserId, async available => {
    if (!available) return alert("That username is already taken.");
    currentUsername = newName;
    await db.ref(`adminData/allUsers/${currentUserId}`).update({
      username: newName,
      lastUsernameChange: Date.now()
    });
    updateUserPanel();
    usernameChangeBar.style.display = "none";
    // Update placeholder
    msgInput.placeholder = `Message #${currentServer === "server1" ? "general" : "general-2"}`;
  });
});

// ============================================================
// SERVER SWITCHING (with full history)
// ============================================================
function switchServer(serverName) {
  currentServer = serverName;
  chatbox.innerHTML = "";
  displayedMessages.clear();

  if (listener && dbRef) dbRef.off("child_added", listener);

  dbRef = db.ref(`messages/${currentServer}`);

  // Update UI
  document.querySelectorAll(".serverBtn").forEach(btn => {
    const isSelected = btn.getAttribute("data-server") === serverName;
    btn.classList.toggle("selected", isSelected);
  });

  const names = { server1: "general", server2: "general-2" };
  channelName.textContent = names[serverName] || serverName;
  msgInput.placeholder = `Message #${names[serverName]}`;

  // Beta warning update
  const betaEl = document.getElementById("betaWarning");
  if (betaEl) {
    betaEl.style.cursor = "pointer";
    betaEl.onclick = () => {
      betaEl.style.opacity = "0";
      setTimeout(() => betaEl.style.display = "none", 400);
    };
  }

  // Load ALL existing messages first, then listen for new ones
  dbRef.orderByChild("timestamp").once("value", snap => {
    const msgs = snap.val() || {};
    const sorted = Object.entries(msgs).sort((a,b) => (a[1].timestamp||0) - (b[1].timestamp||0));
    sorted.forEach(([key, data]) => {
      if (displayedMessages.has(key)) return;
      displayedMessages.add(key);
      const isMine = data.userId === currentUserId;
      addMessageToChat(data.name, data.message, data.time, isMine, data.color, data.userId, key);
    });

    // Now listen for new messages only
    const listenAfter = Date.now();
    listener = dbRef.orderByChild("timestamp").startAt(listenAfter).on("child_added", snapshot => {
      const key = snapshot.key;
      if (displayedMessages.has(key)) return;
      const data = snapshot.val();
      if ((data.timestamp || 0) < listenAfter) return;
      displayedMessages.add(key);
      const isMine = data.userId === currentUserId;
      addMessageToChat(data.name, data.message, data.time, isMine, data.color, data.userId, key);
    });
  });
}

document.querySelectorAll(".serverBtn").forEach(btn => {
  btn.addEventListener("click", () => switchServer(btn.getAttribute("data-server")));
});

// ============================================================
// ADD MESSAGE TO CHAT
// ============================================================
function addMessageToChat(name, message, time, isMine, color, senderId, messageId) {
  db.ref(`adminData/userTags/${senderId}`).once("value", snap => {
    const tags = snap.val() || [];
    const tagHTML = tags.length > 0
      ? `<span class="tag-glow">${tags.map(t => `<span class="tag-${t.toLowerCase().replace(/\s+/g,'-')}">[${t}]</span>`).join(" ")}</span> `
      : "";

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", isMine ? "mine" : "other");
    msgDiv.setAttribute("data-message-id", messageId);
    msgDiv.innerHTML = `
      <div class="msg-header">
        ${tagHTML}<span class="username" style="color:${color||"#fff"}">${escapeHtml(name)}</span>
        <span class="time">${time}</span>
      </div>
      <span class="text">${message}</span>
      <div class="reactions"></div>
    `;

    // Emoji picker
    const emojis = ["👍","😂","❤️","🔥","😮","😢","🎉","💀","👀","✅","❌","💯"];
    const picker = document.createElement("div");
    picker.className = "emoji-picker";
    picker.style.display = "none";
    emojis.forEach(emoji => {
      const btn = document.createElement("span");
      btn.className = "emoji-btn";
      btn.textContent = emoji;
      btn.addEventListener("click", () => {
        const ref = db.ref(`messages/${currentServer}/${messageId}/reactions/${encodeEmoji(emoji)}/${currentUserId}`);
        ref.once("value", s => {
          s.exists() ? ref.remove() : ref.set(true);
          picker.style.display = "none";
        });
      });
      picker.appendChild(btn);
    });
    msgDiv.appendChild(picker);

    msgDiv.addEventListener("click", e => {
      if (e.target.classList.contains("reaction") || e.target.classList.contains("emoji-btn")) return;
      picker.style.display = picker.style.display === "none" ? "flex" : "none";
    });

    // Live reactions
    db.ref(`messages/${currentServer}/${messageId}/reactions`).on("value", snap => {
      const reactions = snap.val() || {};
      const reactionDiv = msgDiv.querySelector(".reactions");
      reactionDiv.innerHTML = "";
      emojis.forEach(emoji => {
        const key = encodeEmoji(emoji);
        if (reactions[key]) {
          const count = Object.keys(reactions[key]).length;
          const reacted = reactions[key][currentUserId] ? "reacted" : "";
          const span = document.createElement("span");
          span.className = `reaction ${reacted}`;
          span.textContent = `${emoji} ${count}`;
          span.addEventListener("click", () => {
            const ref = db.ref(`messages/${currentServer}/${messageId}/reactions/${key}/${currentUserId}`);
            ref.once("value", s => s.exists() ? ref.remove() : ref.set(true));
          });
          reactionDiv.appendChild(span);
        }
      });
    });

    chatbox.appendChild(msgDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
  });
}

function encodeEmoji(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16)).join("_");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

// ============================================================
// MESSAGE SENDING
// ============================================================
const badWords = [
  "nig","niger","nigger","nigga","niga","faggot","chink","coon","gook","kike","spic","wetback","fag","dyke","tranny",
  "kill","murder","stab","shoot","bomb","torture","lynch",
  "porn","xxx","hardcore","incest","bestiality"
];

function normalizeText(t) {
  return t.toLowerCase()
    .replace(/[=\s\-_.|]+/g,"")
    .replace(/[1!|]/g,"i").replace(/3/g,"e").replace(/0/g,"o")
    .replace(/@/g,"a").replace(/5/g,"s").replace(/7/g,"t");
}

function filterBadWords(msg) {
  let out = msg;
  const norm = normalizeText(msg);
  badWords.forEach(w => {
    const re = new RegExp(`\\b${w}\\w*\\b`, "gi");
    if (re.test(norm)) out = out.replace(re, "****");
  });
  return out;
}

function parseMarkdown(msg) {
  msg = msg.replace(/#(.*?)#/g, "<strong>$1</strong>");
  msg = msg.replace(/\/(.*?)\//g, "<em>$1</em>");
  msg = msg.replace(/(https?:\/\/[^\s<]+[^\s<.,:;"')\]\}])/g, '<a href="$1" target="_blank" rel="noopener" class="chat-link">$1</a>');
  return msg;
}

function isUserBanned(callback) {
  db.ref(`adminData/bannedUsers/${currentUserId}`).once("value", s => callback(s.exists()));
}

let lastSentTime = 0;

function sendMessage() {
  const now = Date.now();
  if (now - lastSentTime < 2000) return;
  let msg = msgInput.value.trim();
  if (!msg) return;

  isUserBanned(banned => {
    if (banned) { alert("You are banned from sending messages."); msgInput.value = ""; return; }
    const filtered   = filterBadWords(msg);
    const formatted  = parseMarkdown(escapeHtml(filtered).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"'));
    // Re-escape after markdown
    const safeFormatted = parseMarkdown(filterBadWords(msg));

    db.ref(`messages/${currentServer}`).push({
      name:      currentUsername,
      message:   safeFormatted,
      time:      new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
      timestamp: now,
      color:     myColor,
      userId:    currentUserId
    });
    msgInput.value = "";
    lastSentTime = now;

    // Keep allUsers up to date
    db.ref(`adminData/allUsers/${currentUserId}`).update({ username: currentUsername, usernameColor: myColor });
  });
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && msgInput.value.trim() !== "/modmenu") sendMessage();
});

// ============================================================
// MOD MENU
// ============================================================
function checkForModMenuCommand() {
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
        displayModMenuData();
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
});

function displayModMenuData() {
  // All users
  db.ref("adminData/allUsers").on("value", snap => {
    allUsersList.innerHTML = "";
    const users = snap.val() || {};
    for (let id in users) {
      if (id === "placeholder") continue;
      const u = users[id];
      const div = document.createElement("div");
      div.className = "userItem";
      div.innerHTML = `
        <span style="color:${u.usernameColor||"#fff"}">${escapeHtml(u.username||"Guest")}</span>
        <span style="color:#6d6f78;font-size:11px;margin-left:6px;flex:1;overflow:hidden;text-overflow:ellipsis">${id}</span>
        <button class="removeUserBtn" data-id="${id}">Remove</button>
      `;
      allUsersList.appendChild(div);
    }
    document.querySelectorAll(".removeUserBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        Promise.all([
          db.ref(`adminData/allUsers/${id}`).remove(),
          db.ref(`adminData/userTags/${id}`).remove()
        ]).then(() => btn.closest(".userItem").remove());
      });
    });
  });

  // Banned users
  db.ref("adminData/bannedUsers").on("value", snap => {
    bannedUsersList.innerHTML = "";
    const banned = snap.val() || {};
    for (let id in banned) {
      if (id === "placeholder") continue;
      const div = document.createElement("div");
      div.className = "userItem";
      div.innerHTML = `<span>${id}</span><button class="unbanBtn" data-id="${id}">Unban</button>`;
      bannedUsersList.appendChild(div);
    }
    document.querySelectorAll(".unbanBtn").forEach(btn => {
      btn.addEventListener("click", () => db.ref(`adminData/bannedUsers/${btn.getAttribute("data-id")}`).remove());
    });
  });

  // Tags
  db.ref("adminData/userTags").on("value", snap => {
    userTagsList.innerHTML = "";
    const tags = snap.val() || {};
    for (let id in tags) {
      if (id === "placeholder") continue;
      const div = document.createElement("div");
      div.className = "userItem";
      div.innerHTML = `
        <span>${id}</span>
        <span style="color:#a5b4fc;font-size:12px;flex:1;margin-left:8px">${tags[id].join(", ")}</span>
        <button class="removeTagBtn" data-id="${id}">Remove Tags</button>
      `;
      userTagsList.appendChild(div);
    }
    document.querySelectorAll(".removeTagBtn").forEach(btn => {
      btn.addEventListener("click", () => db.ref(`adminData/userTags/${btn.getAttribute("data-id")}`).remove());
    });
  });
}

banUserBtn.addEventListener("click", () => {
  const id = banUserInput.value.trim();
  if (!id) return;
  db.ref(`adminData/bannedUsers/${id}`).set(true);
  banUserInput.value = "";
});

const availableTags = ["Mod","Admin","SN","VIP","Friend","Tester","Owner","Dev","Jobless","Asked for Tag","Gay"];
addTagBtn.addEventListener("click", () => {
  const id  = tagUserIdInput.value.trim();
  const tag = tagNameInput.value.trim();
  if (!id || !tag || !availableTags.includes(tag)) {
    alert("Valid tags: " + availableTags.join(", "));
    return;
  }
  db.ref(`adminData/userTags/${id}`).once("value", snap => {
    const current = snap.val() || [];
    if (!current.includes(tag)) {
      current.push(tag);
      db.ref(`adminData/userTags/${id}`).set(current);
    }
    tagUserIdInput.value = "";
    tagNameInput.value = "";
  });
});
