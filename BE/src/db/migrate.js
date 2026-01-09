const { pool } = require('./connection');

const migrations = [
  // Enable TimescaleDB extension
  `CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`,

  // Nodes table - sensor locations in Mohali
  `CREATE TABLE IF NOT EXISTS nodes (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    sector VARCHAR(50),
    zone_type VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Sensor readings - time-series data
  `CREATE TABLE IF NOT EXISTS sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    node_id VARCHAR(20) REFERENCES nodes(id),
    noise DECIMAL(5, 2),
    temperature DECIMAL(5, 2),
    air_quality INTEGER,
    crowd_density INTEGER,
    stress_index INTEGER,
    PRIMARY KEY (time, node_id)
  );`,

  // Convert to hypertable for time-series optimization
  `SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);`,

  // Anomalies table
  `CREATE TABLE IF NOT EXISTS anomalies (
    id SERIAL PRIMARY KEY,
    time TIMESTAMPTZ NOT NULL,
    node_id VARCHAR(20) REFERENCES nodes(id),
    anomaly_score DECIMAL(4, 3),
    signals TEXT[],
    explanation TEXT,
    stress_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Index for faster queries
  `CREATE INDEX IF NOT EXISTS idx_readings_node_time ON sensor_readings (node_id, time DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_anomalies_node_time ON anomalies (node_id, time DESC);`,
];

async function migrate() {
  const client = await pool.connect();
  try {
    for (const sql of migrations) {
      console.log('Running migration:', sql.substring(0, 60) + '...');
      await client.query(sql);
    }
    console.log('All migrations completed');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  require('dotenv').config();
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrate };
