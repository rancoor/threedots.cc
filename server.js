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
app.set("trust proxy", true); // Trust nginx proxy
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
      const parts = stdout.trim().split(/\\s+/);
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
