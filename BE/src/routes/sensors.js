const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

router.post('/ingest', sensorController.ingest);
router.get('/live', sensorController.getLive);
router.get('/history', sensorController.getHistory);
router.get('/nodes', sensorController.getNodes);

module.exports = router;
