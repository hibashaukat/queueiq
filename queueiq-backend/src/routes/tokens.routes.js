const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: "Tokens routes working" });
});

router.post('/issue', (req, res) => {
  res.json({ message: "Token issue dummy" });
});

module.exports = router;
