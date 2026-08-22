const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: "Doctors routes working" });
});

module.exports = router;
