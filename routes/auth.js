const express = require("express");
const router = express.Router();

const USER = "admin";
const PASS = "password"; // change to env vars in production

router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === USER && password === PASS) {
    req.session.loggedIn = true;
    req.session.username = username;
    res.redirect("/dashboard");
  } else {
    res.render("login", { error: "Invalid credentials" });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

module.exports = router;
