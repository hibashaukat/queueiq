const express = require('express');
const router = express.Router();
const { getOrganizations, getOrganizationById } = require('../controllers/orgs.controller');

router.get('/', getOrganizations);
router.get('/:id', getOrganizationById);

module.exports = router;