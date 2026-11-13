# MessageGun — decentralized chat with GunDB

The third implementation of the same idea, after Holochain (`message-happ/`)
and blockchain (`message-chain/`). GunDB is a real-time, decentralized,
offline-first graph database that syncs directly between browsers — and
it's by far the easiest of the three to actually deploy.

## Why this one is simpler than Holochain or blockchain

- No conductor, no WASM compilation, no Rust (Holochain)
- No gas, no wallet, no mining, no MetaMask required (blockchain)
- It's a **JavaScript library loaded via CDN**, like jQuery. Browsers sync
  data directly to each other and to lightweight "relay" peers.

A relay peer is not a server that owns your data the way a traditional
backend does — it's closer to a helper that (a) gives scattered browsers a
common address to find each other through, and (b) persists data to disk
so messages survive even when every browser is offline.

---

## 1. Project layout

```
message-gun/
├── relay/
│   ├── server.js       # tiny Node.js relay peer
│   └── package.json
└── public/
    ├── index.html
    └── app.js           # GunDB client logic
```

---

## 2. Run it locally

### Start the relay peer
```bash
cd message-gun/relay
npm install
npm start
```
You should see:
```
GUN relay peer running at http://localhost:8765/gun
```
Leave this running. It creates a `gun-data/` folder next to it — that's
where messages are actually persisted to disk.

### Serve the chat UI
In a separate terminal:
```bash
cd message-gun/public
python3 -m http.server 5500
```
Open `http://localhost:5500` in your browser.

### Test with two windows
Open a second window — a regular Chrome tab is actually fine here, no
need for Incognito or a second profile like the blockchain version
needed, since there's no wallet/account state tied to the browser
extension. Set a different name in each window's "Your name" field, send
a message from one, and watch it appear in the other within a second or
two — no page refresh needed.

---

## 3. What's actually happening (the GunDB-specific mental model)

- `gun.get("message-gun-chat-room")` — this is a shared graph **node**,
  identified by that string key. Any browser pointed at the same relay
  (or a relay that syncs with it) that calls `.get()` with the same key
  is looking at the same shared node.
- `.set({...})` — adds a new child under that node with an
  auto-generated id, which is how you get an append-only list of
  messages rather than one shared value getting overwritten.
- `.map().on(callback)` — subscribes to every child of the node, both
  the ones that already exist and any added later, and fires your
  callback in real time as they arrive. This is the live-sync mechanism
  — no polling loop, no manual refresh.
- There's no mining, no validation rules, no proof-of-work — GunDB
  prioritizes availability and speed over the strict consistency
  guarantees blockchain gives you. For a casual chat demo this trade-off
  is exactly right; for something like a financial ledger it wouldn't be.

---

## 4. Deploying it for real (so others can use it over the internet)

Two pieces, same split as the blockchain version:

| Component     | Deploys to                          |
|-----------------|--------------------------------------|
| Relay peer     | Render, Railway, Fly.io, or a small VPS — anywhere that runs a long-lived Node.js process |
| Chat UI        | Vercel, Netlify, or the same host as the relay |

### 4.1 Deploy the relay peer (example: Render)
1. Push `message-gun/relay/` to a GitHub repo (or just the whole project)
2. On Render.com (free tier works): **New → Web Service**, point it at
   your repo, set:
   - Root directory: `relay`
   - Build command: `npm install`
   - Start command: `npm start`
3. Once deployed, Render gives you a URL like
   `https://your-relay.onrender.com`

**Important**: free tiers on most platforms spin down after inactivity
and lose non-persisted disk storage on redeploy — fine for a demo, but if
you want messages to truly persist long-term, use a host with a
persistent disk/volume, or add a paid persistent volume add-on.

### 4.2 Update the UI to point at your deployed relay
In `public/app.js`, change:
```js
const RELAY_PEERS = ["http://localhost:8765/gun"];
```
to:
```js
const RELAY_PEERS = ["https://your-relay.onrender.com/gun"];
```

### 4.3 Deploy the UI
```bash
npm install -g vercel
cd message-gun/public
vercel --prod
```
This gives you a public URL, same as the blockchain version's Vercel
deployment.

### 4.4 Test with real people
Share the Vercel URL. Anyone who opens it connects straight to your
relay peer and starts syncing — no wallet, no MetaMask, no gas, no
install. This is the single biggest practical difference from the
blockchain version: **zero setup cost for your end user.**

---

## 5. How this compares to the other two implementations

| | Blockchain (Anvil/Sepolia) | Holochain (hApp) | GunDB |
|---|---|---|---|
| End-user setup | MetaMask + test ETH | Desktop installer (Kangaroo) | None — just a URL |
| Who validates writes | Every node, via consensus | DHT-neighbor peers, via WASM rules | Nobody — last-write-wins, no validation layer by default |
| Data ownership model | Shared contract storage | Each agent's own source chain | Shared graph, replicated across peers |
| Cost per message | Real gas (even if testnet) | Free | Free |
| Tamper resistance | High — needs majority consensus to alter history | High — cryptographically signed source chains | Low by default — GunDB trusts whoever writes; add SEA (GunDB's auth/crypto layer) for real integrity guarantees |

That last row is the honest trade-off worth sitting with: GunDB's ease of
deployment comes from *not* enforcing the strict validation or consensus
rules the other two have built in by default. For a learning demo or a
casual chat app, that's a fine trade. For anything where you need to
prove who said what and prevent tampering, you'd want to add GunDB's SEA
module (asymmetric signing per user) — worth a follow-up if you want to
go there.
