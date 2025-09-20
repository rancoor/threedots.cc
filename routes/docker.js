const express = require("express");
const Docker = require("dockerode");
const router = express.Router();

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

router.get("/containers", async (req, res) => {
  const containers = await docker.listContainers({ all: true });
  res.json(containers);
});

router.post("/restart/:id", async (req, res) => {
  const container = docker.getContainer(req.params.id);
  try {
    await container.restart();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});


router.get("/stats/:id", async (req, res) => {
  const container = docker.getContainer(req.params.id);
  const stream = await container.stats({ stream: false });

  const cpuDelta =
    stream.cpu_stats.cpu_usage.total_usage -
    stream.precpu_stats.cpu_usage.total_usage;
  const systemDelta =
    stream.cpu_stats.system_cpu_usage - stream.precpu_stats.system_cpu_usage;

  const cpuPercent =
    systemDelta > 0
      ? (cpuDelta / systemDelta) * stream.cpu_stats.cpu_usage.percpu_usage.length * 100
      : 0;

  const memUsage = stream.memory_stats.usage || 0;
  const memLimit = stream.memory_stats.limit || 1;
  const memPercent = (memUsage / memLimit) * 100;

  res.json({
    cpu: cpuPercent.toFixed(2),
    mem: (memUsage / 1024 / 1024).toFixed(2), // MB
    memPercent: memPercent.toFixed(2),
  });
});
module.exports = router;