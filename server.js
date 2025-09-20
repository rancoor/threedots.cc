const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "supersecretkey", // change in production
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// --- Routes ---
const authRoutes = require("./routes/auth");
const dockerRoutes = require("./routes/docker");
const pm2Routes = require("./routes/pm2");

app.use("/", authRoutes);
app.use("/docker", dockerRoutes);
app.use("/pm2", pm2Routes);

// --- Protect Dashboard ---
function ensureAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/login");
}

app.get("/dashboard", ensureAuth, (req, res) => {
  res.render("dashboard", { user: req.session.username });
});

// Start server
app.listen(3000, () => {
  console.log("Dashboard running at http://localhost:3000");
});
