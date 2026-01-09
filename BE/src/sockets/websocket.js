const WebSocket = require('ws');

let wss = null;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });
  
  console.log('WebSocket server initialized');
}

function broadcast(message) {
  if (!wss) return;
  
  const data = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

module.exports = { initWebSocket, broadcast };
