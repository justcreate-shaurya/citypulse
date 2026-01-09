const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecastController');

router.get('/forecast', forecastController.getForecast);
router.get('/forecast/:nodeId', forecastController.getNodeForecast);

module.exports = router;
