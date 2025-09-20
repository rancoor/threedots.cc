const express = require("express");
const pm2 = require("pm2");
const router = express.Router();

router.get("/list", (req, res) => {
  pm2.connect(() => {
    pm2.list((err, list) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json(list);
    });
  });
});

router.post("/restart/:id", (req, res) => {
  pm2.connect(() => {
    pm2.restart(req.params.id, (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    });
  });
});
router.get("/stats/:id", (req, res) => {
  pm2.connect(() => {
    pm2.describe(req.params.id, (err, proc) => {
      if (err || !proc[0]) return res.json({ success: false });
      const monit = proc[0].monit;
      res.json({
        cpu: monit.cpu,
        mem: (monit.memory / 1024 / 1024).toFixed(2), // MB
      });
    });
  });
});

module.exports = router;
