const express = require('express');
const router = express.Router();

// Dummy auth routes for now - so backend doesn't crash
router.get('/', (req, res) => {
  res.json({ message: "Auth routes working" });
});

router.post('/login', (req, res) => {
  res.json({ message: "Login dummy" });
});

router.post('/register', (req, res) => {
  res.json({ message: "Register dummy" });
});

module.exports = router;
