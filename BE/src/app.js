require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initWebSocket } = require('./sockets/websocket');

const sensorRoutes = require('./routes/sensors');
const anomalyRoutes = require('./routes/anomalies');
const forecastRoutes = require('./routes/forecast');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api', sensorRoutes);
app.use('/api', anomalyRoutes);
app.use('/api', forecastRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'citypulse-backend' });
});

initWebSocket(server);

module.exports = { app, server };
