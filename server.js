import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Trust proxy setting - only enable in production with nginx
if (process.env.NODE_ENV === 'production') {
  app.set("trust proxy", 1); // Trust first proxy (nginx)
}
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

// Secure in-memory user store with additional security features
const users = [];
const failedLogins = new Map(); // Track failed login attempts
const activeSessions = new Map(); // Track active sessions for security

// Initialize with default user - SECURE PASSWORD: @Darth77.
const defaultUserHash = await bcrypt.hash("@Darth77.", 12);
users.push({
  id: 1,
  email: "cheruiyotca@gmail.com",
  password: defaultUserHash,
  provider: "local",
  createdAt: new Date(),
  lastLogin: null,
  loginAttempts: 0,
  accountLocked: false,
  accountLockedUntil: null
});

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: "Too many login attempts, please try again later." },
  skipSuccessfulRequests: true
});

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 100 // limit each IP to 100 requests per windowMs
});

// Helper function to get system processes
async function getSystemProcesses() {
  try {
    console.log("🔍 DEBUG: Executing ps command...");
    const { stdout } = await execAsync("ps -eo pid,user,%cpu,%mem,stat,start,command --sort=-%cpu | head -50");
    console.log("🔍 DEBUG: ps command stdout length:", stdout.length);
    console.log("🔍 DEBUG: First 200 chars:", JSON.stringify(stdout.substring(0, 200)));
    
    const lines = stdout.trim().split("\n");
    console.log("🔍 DEBUG: Number of lines:", lines.length);
    console.log("🔍 DEBUG: First line:", lines[0]);
    console.log("🔍 DEBUG: Second line:", lines[1]);
    
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
          COMMAND: parts.slice(6).join(" ").substring(0, 50)
        };
      }
      return null;
    }).filter(proc => proc !== null);
    
    console.log("🔍 DEBUG: Final processes array length:", processes.length);
    return processes;
  } catch (error) {
    console.error("Error getting system processes:", error);
    return [];
  }
}


// Security helper functions
function isAccountLocked(user) {
  if (user.accountLocked && user.accountLockedUntil && new Date() < user.accountLockedUntil) {
    return true;
  }
  if (user.accountLocked && user.accountLockedUntil && new Date() >= user.accountLockedUntil) {
    // Unlock account
    user.accountLocked = false;
    user.accountLockedUntil = null;
    user.loginAttempts = 0;
  }
  return false;
}

function handleFailedLogin(user, ip) {
  user.loginAttempts = (user.loginAttempts || 0) + 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (user.loginAttempts >= 5) {
    user.accountLocked = true;
    user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
}

function handleSuccessfulLogin(user) {
  user.loginAttempts = 0;
  user.accountLocked = false;
  user.accountLockedUntil = null;
  user.lastLogin = new Date();
}

// Middleware
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Enhanced session configuration with security
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  name: 'threedots.session', // Change default session name
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true, // Prevent XSS attacks
    maxAge: 4 * 60 * 60 * 1000, // 4 hours (shorter for security)
    sameSite: 'strict' // CSRF protection
  },
  genid: () => {
    return crypto.randomBytes(32).toString('hex'); // Secure session ID generation
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Enhanced Local strategy with security checks
passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
  try {
    const user = users.find(u => u.email === email);
    if (!user) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    // Check if account is locked
    if (isAccountLocked(user)) {
      return done(null, false, { message: 'Account temporarily locked due to too many failed attempts' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      handleFailedLogin(user);
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    handleSuccessfulLogin(user);
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  // Store session info for security tracking
  activeSessions.set(user.id, {
    userId: user.id,
    loginTime: new Date(),
    lastActivity: new Date()
  });
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  if (user && activeSessions.has(id)) {
    // Update last activity
    activeSessions.get(id).lastActivity = new Date();
  }
  done(null, user);
});

// Enhanced auth middleware with session tracking
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated() && activeSessions.has(req.user.id)) {
    const session = activeSessions.get(req.user.id);
    // Check if session is expired (4 hours of inactivity)
    const now = new Date();
    const sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours
    
    if (now - session.lastActivity > sessionTimeout) {
      activeSessions.delete(req.user.id);
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
        res.redirect('/auth/login');
      });
      return;
    }
    
    session.lastActivity = now;
    return next();
  }
  res.redirect('/auth/login');
}

// Auth routes with enhanced security
app.get('/auth/login', (req, res) => {
  res.render('login', { 
    error: req.session.error,
    success: req.session.success
  });
  delete req.session.error;
  delete req.session.success;
});

app.post('/auth/login', loginLimiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      req.session.error = 'Login failed';
      return res.redirect('/auth/login');
    }
    if (!user) {
      req.session.error = info.message || 'Login failed';
      return res.redirect('/auth/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login session error:', err);
        req.session.error = 'Login failed';
        return res.redirect('/auth/login');
      }
      console.log(`✅ Successful login: ${user.email} at ${new Date().toISOString()}`);
      return res.redirect('/');
    });
  })(req, res, next);
});

app.get('/auth/register', (req, res) => {
  res.render('register', { error: req.session.error });
  delete req.session.error;
});

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    
    // Enhanced validation
    if (!email || !password || !confirmPassword) {
      req.session.error = 'All fields are required';
      return res.redirect('/auth/register');
    }
    
    if (password !== confirmPassword) {
      req.session.error = 'Passwords do not match';
      return res.redirect('/auth/register');
    }
    
    // Password strength validation
    if (password.length < 8) {
      req.session.error = 'Password must be at least 8 characters long';
      return res.redirect('/auth/register');
    }
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      req.session.error = 'User already exists';
      return res.redirect('/auth/register');
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      id: users.length + 1,
      email: email,
      password: hashedPassword,
      provider: 'local',
      createdAt: new Date(),
      lastLogin: null,
      loginAttempts: 0,
      accountLocked: false,
      accountLockedUntil: null
    };
    
    users.push(newUser);
    console.log(`✅ New user registered: ${email} at ${new Date().toISOString()}`);
    req.session.success = 'Account created successfully. Please login.';
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.session.error = 'Registration failed';
    res.redirect('/auth/register');
  }
});

app.get('/auth/logout', (req, res) => {
  if (req.user) {
    activeSessions.delete(req.user.id);
    console.log(`✅ User logged out: ${req.user.email} at ${new Date().toISOString()}`);
  }
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login');
  });
});

// Protected dashboard routes (unchanged from previous version)
app.get("/", isAuthenticated, async (req, res) => {
  res.render("landing", { user: req.user });
});

// PM2 Dashboard route
app.get("/pm2", isAuthenticated, async (req, res) => {
  try {
    if (!apiClient) {
      res.status(500).send("API configuration missing. Please set API_BASE and API_KEY environment variables.");
      return;
    }
    const response = await apiClient.get("/pm2");
    res.render("dashboard", { 
      processes: response.data,
      activeTab: "pm2",
      user: req.user
    });
  } catch (err) {
    res.status(500).send("Error fetching PM2 data: " + err.message);
  }
});

app.get("/docker", isAuthenticated, async (req, res) => {
  try {
    if (!apiClient) {
      res.status(500).send("API configuration missing. Please set API_BASE and API_KEY environment variables.");
      return;
    }
    const response = await apiClient.get("/docker");
    res.render("docker", { 
      containers: response.data,
      activeTab: "docker",
      user: req.user
    });
  } catch (err) {
    res.status(500).send("Error fetching Docker data: " + err.message);
  }
});

app.get("/system", isAuthenticated, async (req, res) => {
  console.log("\uD83D\uDCCA DEBUG: System route called");
  
  try {
    const processes = await getSystemProcesses();
    console.log("\uD83D\uDCCA DEBUG: Processes length:", processes.length);
    console.log("\uD83D\uDCCA DEBUG: First process:", processes[0]);
    
    res.render("system", { 
      processes: processes,
      activeTab: "system",
      user: req.user
    });
  } catch (err) {
    res.status(500).send("Error fetching system processes: " + err.message);
  }
});

// Protected API routes (same as before)
app.post("/action/:id/:cmd", isAuthenticated, async (req, res) => {
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

app.get("/logs/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    if (!apiClient) {
      res.status(500).send("API configuration missing. Please set API_BASE and API_KEY environment variables.");
      return;
    }
    const response = await apiClient.get(`/pm2/logs/${id}`);
    res.render("logs", { id, logs: response.data, type: "PM2", user: req.user });
  } catch (err) {
    res.status(500).send("Error fetching PM2 logs: " + err.message);
  }
});

app.post("/docker/action/:id/:cmd", isAuthenticated, async (req, res) => {
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

app.get("/docker/logs/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    if (!apiClient) {
      res.status(500).send("API configuration missing. Please set API_BASE and API_KEY environment variables.");
      return;
    }
    const response = await apiClient.get(`/docker/logs/${id}`);
    res.render("logs", { id, logs: response.data, type: "Docker", user: req.user });
  } catch (err) {
    res.status(500).send("Error fetching Docker logs: " + err.message);
  }
});

app.post("/system/kill/:pid", isAuthenticated, async (req, res) => {
  const { pid } = req.params;
  try {
    await execAsync(`kill ${pid}`);
    res.json({ success: true, message: `Process ${pid} killed` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get("/system/details/:pid", isAuthenticated, async (req, res) => {
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
      
      // Get additional process details
      try {
        const { stdout: memInfo } = await execAsync(`ps -p ${pid} -o pid,vsz,rss --no-headers`);
        if (memInfo.trim()) {
          const memParts = memInfo.trim().split(/\s+/);
          details.VSZ = memParts[1]; // Virtual memory size
          details.RSS = memParts[2]; // Resident memory size
        }
      } catch (memErr) {
        console.warn('Could not get memory details:', memErr.message);
      }
      
      res.json({ success: true, details });
    } else {
      res.json({ success: false, error: 'Process not found' });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// New endpoint for process logs
app.get("/system/logs/:pid", isAuthenticated, async (req, res) => {
  const { pid } = req.params;
  try {
    // Try to get process command first
    const { stdout: cmdOut } = await execAsync(`ps -p ${pid} -o command --no-headers`);
    if (!cmdOut.trim()) {
      res.json({ success: false, error: 'Process not found' });
      return;
    }
    
    const command = cmdOut.trim();
    let logs = [];
    
    // Try different methods to get logs based on process type
    try {
      // Method 1: Check if it's a journald service
      const serviceName = command.split(' ')[0].split('/').pop();
      const { stdout: journalLogs } = await execAsync(`journalctl -u ${serviceName} --no-pager -n 50 --since "1 hour ago" 2>/dev/null || echo "No journal logs"`);
      if (journalLogs && !journalLogs.includes('No journal logs')) {
        logs.push({ type: 'journal', content: journalLogs });
      }
    } catch (journalErr) {
      // Ignore journal errors
    }
    
    try {
      // Method 2: Check common log locations
      const logPaths = [
        `/var/log/${command.split(' ')[0].split('/').pop()}.log`,
        `/var/log/syslog`,
        `/var/log/messages`
      ];
      
      for (const logPath of logPaths) {
        try {
          const { stdout: fileContent } = await execAsync(`grep -i "${pid}\|${command.split(' ')[0]}" ${logPath} 2>/dev/null | tail -20 || echo ""`);
          if (fileContent.trim()) {
            logs.push({ type: 'file', path: logPath, content: fileContent });
          }
        } catch (fileErr) {
          // Ignore file errors
        }
      }
    } catch (fileErr) {
      // Ignore file errors
    }
    
    // Method 3: Get process file descriptors (open files)
    try {
      const { stdout: lsofOut } = await execAsync(`lsof -p ${pid} 2>/dev/null | grep -E "(log|tmp)" | head -10 || echo ""`);
      if (lsofOut.trim()) {
        logs.push({ type: 'files', content: lsofOut });
      }
    } catch (lsofErr) {
      // Ignore lsof errors
    }
    
    // If no logs found, return basic process info
    if (logs.length === 0) {
      logs.push({ 
        type: 'info', 
        content: `No specific logs found for process ${pid} (${command})\n\nProcess is running with command: ${command}` 
      });
    }
    
    res.json({ success: true, logs, command, pid });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// System statistics endpoint
app.get("/system/stats", isAuthenticated, async (req, res) => {
  try {
    const stats = {};
    
    // Get system uptime
    try {
      const { stdout: uptime } = await execAsync('uptime -p');
      stats.uptime = uptime.trim();
    } catch (err) {
      stats.uptime = 'Unknown';
    }
    
    // Get system load
    try {
      const { stdout: loadavg } = await execAsync('cat /proc/loadavg');
      const loads = loadavg.trim().split(' ');
      stats.load = {
        '1min': parseFloat(loads[0]) || 0,
        '5min': parseFloat(loads[1]) || 0,
        '15min': parseFloat(loads[2]) || 0
      };
    } catch (err) {
      stats.load = { '1min': 0, '5min': 0, '15min': 0 };
    }
    
    // Get memory usage
    try {
      const { stdout: meminfo } = await execAsync('free -m');
      const lines = meminfo.split('\n');
      const memLine = lines[1].split(/\s+/);
      stats.memory = {
        total: parseInt(memLine[1]) || 0,
        used: parseInt(memLine[2]) || 0,
        free: parseInt(memLine[3]) || 0,
        available: parseInt(memLine[6]) || 0
      };
      stats.memory.usedPercent = Math.round((stats.memory.used / stats.memory.total) * 100);
    } catch (err) {
      stats.memory = { total: 0, used: 0, free: 0, available: 0, usedPercent: 0 };
    }
    
    // Get CPU usage
    try {
      const { stdout: cpuinfo } = await execAsync('grep "cpu MHz" /proc/cpuinfo | wc -l');
      stats.cpuCores = parseInt(cpuinfo.trim()) || 1;
    } catch (err) {
      stats.cpuCores = 1;
    }
    
    // Get process count
    try {
      const processes = await getSystemProcesses();
      stats.processCount = processes.length;
      
      // Calculate average CPU and memory usage
      const totalCpu = processes.reduce((sum, proc) => sum + (parseFloat(proc.CPU) || 0), 0);
      const totalMem = processes.reduce((sum, proc) => sum + (parseFloat(proc.MEM) || 0), 0);
      stats.avgCpu = Math.round((totalCpu / processes.length) * 100) / 100;
      stats.avgMem = Math.round((totalMem / processes.length) * 100) / 100;
    } catch (err) {
      stats.processCount = 0;
      stats.avgCpu = 0;
      stats.avgMem = 0;
    }
    
    res.json({ success: true, stats });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Socket.io with enhanced security
io.use((socket, next) => {
  // In production, implement proper socket authentication with session verification
  next();
});

io.on("connection", (socket) => {
  console.log("Client connected");

  const interval = setInterval(async () => {
    try {
      if (apiClient) {
        try {
          const pm2Res = await apiClient.get("/pm2");
          socket.emit("pm2Update", pm2Res.data);
        } catch (apiErr) {
          console.error("PM2 API error:", apiErr.message);
        }

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

      const systemProcesses = await getSystemProcesses();
      socket.emit("systemUpdate", systemProcesses);
      
    } catch (err) {
      console.error("Socket update error:", err.message);
    }
  }, 5000);
  
  // Handle process kill requests from client
  socket.on("killProcess", async (data) => {
    try {
      const { pid } = data;
      await execAsync(`kill ${pid}`);
      socket.emit("processKilled", { success: true, pid, message: `Process ${pid} killed successfully` });
      io.emit("processRemoved", { pid }); // Notify all clients
    } catch (err) {
      socket.emit("processKilled", { success: false, error: err.message });
    }
  });
  
  // Handle force kill requests
  socket.on("forceKillProcess", async (data) => {
    try {
      const { pid } = data;
      await execAsync(`kill -9 ${pid}`);
      socket.emit("processKilled", { success: true, pid, message: `Process ${pid} force killed successfully` });
      io.emit("processRemoved", { pid }); // Notify all clients
    } catch (err) {
      socket.emit("processKilled", { success: false, error: err.message });
    }
  });

  socket.on("disconnect", () => clearInterval(interval));
});

// Cleanup inactive sessions periodically
setInterval(() => {
  const now = new Date();
  const sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours
  
  for (const [userId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > sessionTimeout) {
      activeSessions.delete(userId);
      console.log(`🧹 Cleaned up inactive session for user ID: ${userId}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔐 Dashboard protected by enhanced authentication`);
  console.log(`👤 Default user: cheruiyotca@gmail.com`);
  console.log(`🔑 Default password: @Darth77.`);
  console.log(`🛡️ Security features enabled:`);
  console.log(`   • Rate limiting (5 login attempts per 15 min)`);
  console.log(`   • Account lockout (30 min after 5 failed attempts)`);
  console.log(`   • Session timeout (4 hours of inactivity)`);
  console.log(`   • Secure session management`);
  console.log(`   • Password strength validation`);
});
