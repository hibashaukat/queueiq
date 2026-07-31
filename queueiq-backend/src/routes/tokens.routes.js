const express = require('express');
const router = express.Router();
const { bookToken } = require('../controllers/tokens.controller');

router.post('/book', bookToken);

module.exports = router;