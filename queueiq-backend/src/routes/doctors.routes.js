const express = require('express');
const router = express.Router();
const { getDoctorsByOrg } = require('../controllers/doctors.controller');

router.get('/:orgId', getDoctorsByOrg);

module.exports = router;