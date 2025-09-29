import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 7100;
const API_BASE = process.env.API_BASE;
const API_KEY = process.env.API_KEY;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { Authorization: `Bearer ${API_KEY}` },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// ===== PM2 Dashboard =====
app.get("/", async (req, res) => {
  try {
    const response = await apiClient.get("/pm2");
    res.render("dashboard", { 
        processes: response.data, 
        activeTab: 'pm2' 
    });
  } catch (err) {
    res.status(500).send("Error fetching PM2 data: " + err.message);
  }
});

// PM2 Logs
app.get("/logs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await apiClient.get(`/pm2/logs/${id}`);
    res.render("logs", { id, logs: response.data });
  } catch (err) {
    res.status(500).send("Error fetching logs: " + err.message);
  }
});

// PM2 Actions
app.post("/action/:id/:cmd", async (req, res) => {
  const { id, cmd } = req.params;
  try {
    const response = await apiClient.post(`/pm2/${id}/${cmd}`);
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== Docker Dashboard =====
app.get("/docker", async (req, res) => {
  try {
    const response = await apiClient.get("/docker");
    const containers = response.data.map(c => ({
      ...c,
      CPU: 0,
      Memory: 0
    }));
    res.render("docker", { 
        containers,
        activeTab: 'docker'
    });
  } catch (err) {
    res.status(500).send("Error fetching Docker data: " + err.message);
  }
});

// Docker Actions
app.post("/docker/action/:id/:cmd", async (req, res) => {
  const { id, cmd } = req.params;
  try {
    const response = await apiClient.post(`/docker/${id}/${cmd}`);
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Docker Logs
app.get("/docker/logs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await apiClient.get(`/docker/logs/${id}`);
    res.render("logs", { id, logs: response.data });
  } catch (err) {
    res.status(500).send("Error fetching Docker logs: " + err.message);
  }
});

// ===== Socket.io Live Updates =====
io.on("connection", (socket) => {
  console.log("Client connected");

  const interval = setInterval(async () => {
    try {
      const [pm2Res, dockerRes] = await Promise.all([
        apiClient.get("/pm2"),
        apiClient.get("/docker")
      ]);

      // Ensure numeric CPU/Memory for Docker
      const containers = dockerRes.data.map(c => ({
        ...c,
        CPU: c.CPU || 0,
        Memory: c.Memory || 0
      }));

      socket.emit("pm2Update", pm2Res.data);
      socket.emit("dockerUpdate", containers);
    } catch (err) {
      console.error("Socket update error:", err.message);
    }
  }, 5000);

  socket.on("disconnect", () => clearInterval(interval));
});

// ===== Start Server =====
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
