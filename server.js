import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 9100;
const API_BASE = process.env.API_BASE;
const API_KEY = process.env.API_KEY;

// Create API client only if API_BASE is configured
let apiClient = null;
if (API_BASE && API_KEY) {
  apiClient = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
}

const execAsync = promisify(exec);

// Helper function to get system processes
async function getSystemProcesses() {
  try {
    const { stdout } = await execAsync('ps -eo pid,user,%cpu,%mem,stat,start,command --sort=-%cpu | head -50');
    const lines = stdout.trim().split('\n');
    const headers = lines[0].trim().split(/\s+/);
    
    const processes = lines.slice(1).map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 7) {
        return {
          PID: parts[0],
          USER: parts[1],
          CPU: parseFloat(parts[2]) || 0,
          MEM: parseFloat(parts[3]) || 0,
          STAT: parts[4],
          START: parts[5],
          COMMAND: parts.slice(6).join(' ').substring(0, 50) // Limit command length
        };
      }
      return null;
    }).filter(proc => proc !== null);
    
    return processes;
  } catch (error) {
    console.error('Error getting system processes:', error);
    return [];
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// ===== PM2 Dashboard Route =====
app.get("/", async (req, res) => {
  try {
    if (!apiClient) {
      res.status(500).send("API configuration missing. Please set API_BASE and API_KEY environment variables.");
      return;
    }
    const response = await apiClient.get("/pm2"); // your PM2 API endpoint
    res.render("dashboard", { 
      processes: response.data,
      activeTab: "pm2"
    });
  } catch (err) {
    res.status(500).send("Error fetching PM2 data: " + err.message);
  }
});

// PM2 actions
app.post("/action/:id/:cmd", async (req, res) => {
  const { id, cmd } = req.params;
  try {
    if (!apiClient) {
      res.json({ success: false, error: "API configuration missing" });
      return;
    }
    const response = await apiClient.post(`/pm2/${id}/${cmd}`);
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// PM2 logs
app.get("/logs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (!apiClient) {
      res.status(500).send("API configuration missing. Please set API_BASE and API_KEY environment variables.");
      return;
    }
    const response = await apiClient.get(`/pm2/logs/${id}`);
    res.render("logs", { id, logs: response.data, type: "PM2" });
  } catch (err) {
    res.status(500).send("Error fetching PM2 logs: " + err.message);
  }
});

// ===== Docker Route =====
app.get("/docker", async (req, res) => {
  try {
    if (!apiClient) {
      res.status(500).send("API configuration missing. Please set API_BASE and API_KEY environment variables.");
      return;
    }
    const response = await apiClient.get("/docker");
    res.render("docker", { 
      containers: response.data,
      activeTab: "docker"
    });
  } catch (err) {
    res.status(500).send("Error fetching Docker data: " + err.message);
  }
});

// Docker actions
app.post("/docker/action/:id/:cmd", async (req, res) => {
  const { id, cmd } = req.params;
  try {
    if (!apiClient) {
      res.json({ success: false, error: "API configuration missing" });
      return;
    }
    const response = await apiClient.post(`/docker/${id}/${cmd}`);
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Docker logs
app.get("/docker/logs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (!apiClient) {
      res.status(500).send("API configuration missing. Please set API_BASE and API_KEY environment variables.");
      return;
    }
    const response = await apiClient.get(`/docker/logs/${id}`);
    res.render("logs", { id, logs: response.data, type: "Docker" });
  } catch (err) {
    res.status(500).send("Error fetching Docker logs: " + err.message);
  }
});

// ===== System Processes Route =====
app.get("/system", async (req, res) => {
  try {
    const processes = await getSystemProcesses();
    res.render("system", { 
      processes: processes,
      activeTab: "system"
    });
  } catch (err) {
    res.status(500).send("Error fetching system processes: " + err.message);
  }
});

// System process kill action
app.post("/system/kill/:pid", async (req, res) => {
  const { pid } = req.params;
  try {
    await execAsync(`kill ${pid}`);
    res.json({ success: true, message: `Process ${pid} killed` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// System process details
app.get("/system/details/:pid", async (req, res) => {
  const { pid } = req.params;
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o pid,user,%cpu,%mem,stat,start,command --no-headers`);
    if (stdout.trim()) {
      const parts = stdout.trim().split(/\s+/);
      const details = {
        PID: parts[0],
        USER: parts[1],
        CPU: parts[2],
        MEM: parts[3],
        STAT: parts[4],
        START: parts[5],
        COMMAND: parts.slice(6).join(' ')
      };
      res.json({ success: true, details });
    } else {
      res.json({ success: false, error: 'Process not found' });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== Socket.io for live PM2/Docker updates =====
io.on("connection", (socket) => {
  console.log("Client connected");

  const interval = setInterval(async () => {
    try {
      // PM2 live data (only if API client is configured)
      if (apiClient) {
        try {
          const pm2Res = await apiClient.get("/pm2");
          socket.emit("pm2Update", pm2Res.data);
        } catch (apiErr) {
          console.error("PM2 API error:", apiErr.message);
        }

        // Docker live data (only if API client is configured)
        try {
          const dockerRes = await apiClient.get("/docker");
          const container = dockerRes.data[0];
          if (container) {
            socket.emit("dockerUpdate", {
              CPU: container.CPU || 0,
              Memory: container.Memory || 0
            });
          }
        } catch (apiErr) {
          console.error("Docker API error:", apiErr.message);
        }
      }

      // System processes live data (always available)
      const systemProcesses = await getSystemProcesses();
      socket.emit("systemUpdate", systemProcesses);
      
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
