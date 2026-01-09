const { pool } = require('./connection');

// Mohali sensor nodes - real locations
const nodes = [
  { id: 'CP-MOH-01', name: 'IT Park Sector 70', lat: 30.7046, lng: 76.6934, sector: 'Sector 70', zone_type: 'commercial' },
  { id: 'CP-MOH-02', name: 'Phase 11', lat: 30.7010, lng: 76.7179, sector: 'Phase 11', zone_type: 'residential' },
  { id: 'CP-MOH-03', name: 'Phase 7', lat: 30.7120, lng: 76.7292, sector: 'Phase 7', zone_type: 'mixed' },
  { id: 'CP-MOH-04', name: 'Sector 77', lat: 30.6815, lng: 76.6512, sector: 'Sector 77', zone_type: 'residential' },
  { id: 'CP-MOH-05', name: 'Phase 3B2', lat: 30.6885, lng: 76.7245, sector: 'Phase 3B2', zone_type: 'commercial' },
];

// Mohali baseline values by time of day and zone
const MOHALI_BASELINES = {
  commercial: {
    morning: { noise: 55, temp: 24, aqi: 80, crowd: 8 },
    afternoon: { noise: 65, temp: 32, aqi: 95, crowd: 15 },
    evening: { noise: 70, temp: 28, aqi: 90, crowd: 20 },
    night: { noise: 45, temp: 22, aqi: 70, crowd: 3 },
  },
  residential: {
    morning: { noise: 45, temp: 23, aqi: 75, crowd: 5 },
    afternoon: { noise: 50, temp: 31, aqi: 85, crowd: 8 },
    evening: { noise: 55, temp: 27, aqi: 80, crowd: 12 },
    night: { noise: 35, temp: 21, aqi: 65, crowd: 2 },
  },
  mixed: {
    morning: { noise: 50, temp: 24, aqi: 78, crowd: 6 },
    afternoon: { noise: 58, temp: 32, aqi: 90, crowd: 12 },
    evening: { noise: 65, temp: 28, aqi: 85, crowd: 18 },
    night: { noise: 40, temp: 21, aqi: 68, crowd: 3 },
  },
};

function getTimeSlot(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function generateReading(node, timestamp) {
  const hour = timestamp.getHours();
  const timeSlot = getTimeSlot(hour);
  const baseline = MOHALI_BASELINES[node.zone_type][timeSlot];
  
  // Add realistic variance
  const variance = () => (Math.random() - 0.5) * 0.3;
  
  const noise = Math.round(baseline.noise * (1 + variance()) * 10) / 10;
  const temperature = Math.round(baseline.temp * (1 + variance() * 0.5) * 10) / 10;
  const air_quality = Math.round(baseline.aqi * (1 + variance()));
  const crowd_density = Math.round(baseline.crowd * (1 + variance()));
  
  // Calculate stress index using the formula from frontend
  const nScore = Math.min(((noise - 40) / 60) * 100, 100);
  const tScore = Math.min(((temperature - 15) / 25) * 100, 100);
  const aScore = Math.min((air_quality / 150) * 100, 100);
  const dScore = Math.min((crowd_density / 30) * 100, 100);
  
  const stress_index = Math.max(0, Math.round(
    (nScore * 0.4) + (tScore * 0.25) + (aScore * 0.2) + (dScore * 0.15)
  ));
  
  return { noise, temperature, air_quality, crowd_density, stress_index };
}

async function seed() {
  const client = await pool.connect();
  try {
    // Insert nodes
    for (const node of nodes) {
      await client.query(
        `INSERT INTO nodes (id, name, latitude, longitude, sector, zone_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = $2`,
        [node.id, node.name, node.lat, node.lng, node.sector, node.zone_type]
      );
    }
    console.log(`Seeded ${nodes.length} nodes`);
    
    // Generate 24 hours of historical data (every 5 minutes)
    const now = new Date();
    const readings = [];
    
    for (let i = 0; i < 288; i++) {
      const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000));
      
      for (const node of nodes) {
        const data = generateReading(node, timestamp);
        readings.push({
          time: timestamp,
          node_id: node.id,
          ...data
        });
      }
    }
    
    // Batch insert readings
    for (const r of readings) {
      await client.query(
        `INSERT INTO sensor_readings (time, node_id, noise, temperature, air_quality, crowd_density, stress_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [r.time, r.node_id, r.noise, r.temperature, r.air_quality, r.crowd_density, r.stress_index]
      );
    }
    
    console.log(`Seeded ${readings.length} sensor readings`);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  require('dotenv').config();
  seed().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seed, nodes, MOHALI_BASELINES };
