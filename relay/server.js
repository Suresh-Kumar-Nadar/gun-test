/**
 * A GunDB relay peer.
 *
 * This is NOT a chat server in the traditional sense — it never reads or
 * interprets your messages. Its only job is:
 *   1. Give browsers a stable address to connect to (since two random
 *      browsers can't always reach each other directly over the internet).
 *   2. Persist data to disk so messages survive even if every browser
 *      disconnects at once.
 *
 * Data still syncs directly between connected peers wherever possible;
 * this relay is a convenience/availability layer, not a source of truth
 * the way a traditional backend would be.
 */
const Gun = require("gun");
const http = require("http");

const PORT = process.env.PORT || 8765;

const server = http.createServer(Gun.serve(__dirname));
server.listen(PORT);

Gun({
  web: server,
  file: "gun-data", // persists to ./gun-data on disk
});

console.log(`GUN relay peer running at http://localhost:${PORT}/gun`);
