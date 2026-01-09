const express = require('express');
const router = express.Router();
const anomalyController = require('../controllers/anomalyController');

router.get('/anomalies', anomalyController.getAnomalies);
router.get('/anomalies/:nodeId', anomalyController.getNodeAnomalies);

module.exports = router;
