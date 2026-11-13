// --- Connect to your relay peer(s). Update this if you deploy the relay
// somewhere other than localhost (e.g. a Render/Fly.io/Railway URL). ---
const RELAY_PEERS = ["https://gun-test.onrender.com/gun"];

const gun = Gun({ peers: RELAY_PEERS });

// A fixed, shared "room" node. Any browser running this same app, pointed
// at the same relay (or any relay that gossips with it), will read and
// write to this same shared graph node — this IS the chat room.
const room = gun.get("message-gun-chat-room");

const chatEl = document.getElementById("chat");
const nameInput = document.getElementById("name");
const contentInput = document.getElementById("content");
const sendBtn = document.getElementById("send-btn");

// A random per-tab id, just so "me" styling works correctly even before
// GunDB's SEA user-auth is added — this is NOT a security identity, just
// a local UI convenience to tell "my own messages" apart visually.
const myTabId = Math.random().toString(36).slice(2);

const seen = new Map();

function render() {
  const entries = Array.from(seen.values()).sort((a, b) => a.timestamp - b.timestamp);
  chatEl.innerHTML = "";
  for (const m of entries) {
    const div = document.createElement("div");
    div.className = "msg" + (m.tabId === myTabId ? " me" : "");
    const when = new Date(m.timestamp).toLocaleTimeString();
    const who = document.createElement("div");
    who.className = "who";
    who.textContent = m.author;
    const text = document.createElement("div");
    text.className = "text";
    text.textContent = m.content; // textContent only — avoids HTML injection
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = when;
    div.appendChild(who);
    div.appendChild(text);
    div.appendChild(meta);
    chatEl.appendChild(div);
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}

// `.map().on()` subscribes to every child of `room`, present and future —
// this fires once per existing message immediately, then again in
// real time whenever any peer (including yourself, from another tab)
// writes a new one. This is the live, decentralized sync.
room.map().on((data, id) => {
  if (!data || !data.content) return;
  seen.set(id, {
    content: data.content,
    author: data.author,
    timestamp: data.timestamp,
    tabId: data.tabId,
  });
  render();
});

function send() {
  const content = contentInput.value.trim();
  const author = nameInput.value.trim() || "Anonymous";
  if (!content) return;

  // .set() adds a new child with an auto-generated id — like "append to
  // the chat log" rather than overwriting a single shared value.
  room.set({
    content,
    author,
    timestamp: Date.now(),
    tabId: myTabId,
  });

  contentInput.value = "";
}

sendBtn.addEventListener("click", send);
contentInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") send();
});
