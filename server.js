// server.js
const express = require("express");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");

const app = express();

// --- middleware ---
app.use(express.json());
app.use(express.static("public")); // serve your frontend

// simple auth middleware (stub — replace later)
function requireAuth(req, res, next) {
  // you can replace with real session/JWT logic later
  // right now it's open for testing
  next();
}

// helper to run shell commands
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve({ stdout, stderr });
    });
  });
}

// --- PM2 controls ---
app.post("/api/pm2/:pmid/:action", requireAuth, async (req, res) => {
  const { pmid, action } = req.params;
  const allowed = ["restart", "stop", "delete", "start"];
  if (!allowed.includes(action))
    return res.status(400).json({ error: "invalid action" });

  try {
    const r = await run(`pm2 ${action} ${pmid}`);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// --- Docker controls ---
app.post("/api/docker/:name/:action", requireAuth, async (req, res) => {
  const { name, action } = req.params;
  const map = {
    restart: `docker restart ${name}`,
    stop: `docker stop ${name}`,
    remove: `docker rm -f ${name}`,
  };
  if (!map[action]) return res.status(400).json({ error: "invalid action" });

  try {
    const r = await run(map[action]);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// --- Metrics ---
let prevNet = null;
function readNetTotals() {
  try {
    const data = fs.readFileSync("/proc/net/dev", "utf8");
    const lines = data.split("\n").slice(2).filter(Boolean);
    let rx = 0,
      tx = 0;
    for (const line of lines) {
      const parts = line.replace(/:/, " ").trim().split(/\s+/);
      const iface = parts[0];
      if (iface === "lo" || iface.startsWith("docker") || iface.startsWith("veth"))
        continue;
      const rxBytes = parseInt(parts[1], 10) || 0;
      const txBytes = parseInt(parts[9], 10) || 0;
      rx += rxBytes;
      tx += txBytes;
    }
    return { rx, tx };
  } catch (e) {
    return { rx: 0, tx: 0 };
  }
}

app.get("/api/metrics", requireAuth, (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usedPct = Math.round((usedMem / totalMem) * 10000) / 100;

  const now = Date.now();
  const totals = readNetTotals();
  let rxRate = 0,
    txRate = 0;
  if (prevNet) {
    const dt = (now - prevNet.ts) / 1000;
    if (dt > 0) {
      rxRate = Math.round((totals.rx - prevNet.rx) / dt);
      txRate = Math.round((totals.tx - prevNet.tx) / dt);
    }
  }
  prevNet = { rx: totals.rx, tx: totals.tx, ts: now };

  res.json({
    mem: { total: totalMem, free: freeMem, usedPct },
    net: { rxBytes: totals.rx, txBytes: totals.tx, rxBps: rxRate, txBps: txRate },
  });
});

// --- Health ---
app.get("/api/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// --- Start ---
const PORT = process.env.PORT || 7100;
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
// visit http://localhost:7100 in your browser