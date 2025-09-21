// server.js
app.post('/api/pm2/:pmid/:action', requireAuth, async (req, res) => {
const { pmid, action } = req.params;
const allowed = ['restart', 'stop', 'delete', 'start'];
if (!allowed.includes(action)) return res.status(400).json({ error: 'invalid action' });
const cmd = `pm2 ${action} ${pmid}`;
const r = await run(cmd);
res.json(r);
});


// Docker controls: restart | stop | remove
app.post('/api/docker/:name/:action', requireAuth, async (req, res) => {
const { name, action } = req.params;
const map = { restart: `docker restart ${name}`, stop: `docker stop ${name}`, remove: `docker rm -f ${name}` };
if (!map[action]) return res.status(400).json({ error: 'invalid action' });
const r = await run(map[action]);
res.json(r);
});


// Simple metrics: memory and network delta (reads /proc/net/dev). Keeps last values in-memory.
let prevNet = null;
function readNetTotals() {
try {
const data = fs.readFileSync('/proc/net/dev', 'utf8');
const lines = data.split('\n').slice(2).filter(Boolean);
let rx = 0, tx = 0;
for (const line of lines) {
const parts = line.replace(/:/, ' ').trim().split(/\s+/);
const iface = parts[0];
if (iface === 'lo' || iface.startsWith('docker') || iface.startsWith('veth')) continue;
// /proc/net/dev columns: iface, rx_bytes, rx_packets, ... tx_bytes at a later column
const rxBytes = parseInt(parts[1], 10) || 0;
const txBytes = parseInt(parts[9], 10) || 0;
rx += rxBytes; tx += txBytes;
}
return { rx, tx };
} catch (e) {
return { rx: 0, tx: 0 };
}
}


app.get('/api/metrics', requireAuth, (req, res) => {
const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const usedPct = Math.round((usedMem / totalMem) * 10000) / 100; // percent with 2 decimals


const now = Date.now();
const totals = readNetTotals();
let rxRate = 0, txRate = 0;
if (prevNet) {
const dt = (now - prevNet.ts) / 1000; // seconds
if (dt > 0) {
rxRate = Math.round((totals.rx - prevNet.rx) / dt); // bytes/sec
txRate = Math.round((totals.tx - prevNet.tx) / dt);
}
}
prevNet = { rx: totals.rx, tx: totals.tx, ts: now };


res.json({ mem: { total: totalMem, free: freeMem, usedPct }, net: { rxBytes: totals.rx, txBytes: totals.tx, rxBps: rxRate, txBps: txRate } });
});


// Health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));


// Start
const PORT = process.env.PORT || 7100;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));