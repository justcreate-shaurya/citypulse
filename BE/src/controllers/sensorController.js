const { query } = require('../db/connection');
const { broadcast } = require('../sockets/websocket');
const mlService = require('../services/mlService');

// Calculate stress index using the same formula as frontend
function calculateStressIndex(sensors) {
  const nScore = Math.min(((sensors.noise - 40) / 60) * 100, 100);
  const tScore = Math.min(((sensors.temperature - 15) / 25) * 100, 100);
  const aScore = Math.min((sensors.air_quality / 150) * 100, 100);
  const dScore = Math.min((sensors.crowd_density / 30) * 100, 100);
  
  return Math.max(0, Math.round(
    (nScore * 0.4) + (tScore * 0.25) + (aScore * 0.2) + (dScore * 0.15)
  ));
}

exports.ingest = async (req, res) => {
  try {
    const { node_id, noise, temperature, air_quality, crowd_density } = req.body;
    
    if (!node_id) {
      return res.status(400).json({ error: 'node_id required' });
    }
    
    const stress_index = calculateStressIndex({ noise, temperature, air_quality, crowd_density });
    const time = new Date();
    
    await query(
      `INSERT INTO sensor_readings (time, node_id, noise, temperature, air_quality, crowd_density, stress_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [time, node_id, noise, temperature, air_quality, crowd_density, stress_index]
    );
    
    const reading = { time, node_id, noise, temperature, air_quality, crowd_density, stress_index };
    
    // Check for anomalies via ML service
    const anomalyResult = await mlService.detectAnomaly(reading);
    if (anomalyResult && anomalyResult.is_anomaly) {
      await query(
        `INSERT INTO anomalies (time, node_id, anomaly_score, signals, explanation, stress_index)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [time, node_id, anomalyResult.anomaly_score, anomalyResult.signals, anomalyResult.explanation, stress_index]
      );
      reading.anomaly = anomalyResult;
    }
    
    // Broadcast to WebSocket clients
    broadcast({ type: 'reading', data: reading });
    
    res.json({ success: true, data: reading });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: 'Failed to ingest data' });
  }
};

exports.getLive = async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT ON (node_id) 
        sr.time, sr.node_id, sr.noise, sr.temperature, sr.air_quality, 
        sr.crowd_density, sr.stress_index, n.name, n.latitude, n.longitude,
        n.sector, n.zone_type
      FROM sensor_readings sr
      JOIN nodes n ON sr.node_id = n.id
      ORDER BY node_id, time DESC
    `);
    
    const nodes = result.rows.map(row => ({
      nodeId: row.node_id,
      name: row.name,
      coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)],
      sensors: {
        noise: parseFloat(row.noise),
        temp: parseFloat(row.temperature),
        airQuality: row.air_quality,
        crowd: row.crowd_density
      },
      stressIndex: row.stress_index,
      isAnomaly: row.stress_index > 80,
      timestamp: new Date(row.time).getTime(),
      sector: row.sector,
      zoneType: row.zone_type
    }));
    
    res.json(nodes);
  } catch (err) {
    console.error('Live data error:', err);
    res.status(500).json({ error: 'Failed to fetch live data' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { node_id, hours = 24 } = req.query;
    
    let sql = `
      SELECT time, node_id, noise, temperature, air_quality, crowd_density, stress_index
      FROM sensor_readings
      WHERE time > NOW() - INTERVAL '${parseInt(hours)} hours'
    `;
    
    if (node_id) {
      sql += ` AND node_id = $1`;
    }
    
    sql += ` ORDER BY time DESC LIMIT 500`;
    
    const result = await query(sql, node_id ? [node_id] : []);
    
    const data = result.rows.map(row => ({
      timestamp: new Date(row.time).getTime(),
      nodeId: row.node_id,
      noise: parseFloat(row.noise),
      temp: parseFloat(row.temperature),
      airQuality: row.air_quality,
      crowd: row.crowd_density,
      stressIndex: row.stress_index
    }));
    
    res.json(data);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

exports.getNodes = async (req, res) => {
  try {
    const result = await query('SELECT * FROM nodes ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Nodes error:', err);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
};
