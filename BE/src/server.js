const { server } = require('./app');
const { initDatabase } = require('./db/connection');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDatabase();
    console.log('Database connected');
    
    server.listen(PORT, () => {
      console.log(`CityPulse backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
