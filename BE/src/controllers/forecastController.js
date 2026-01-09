const mlService = require('../services/mlService');

exports.getForecast = async (req, res) => {
  try {
    const { horizon = 60 } = req.query;
    const forecast = await mlService.getForecast(null, parseInt(horizon));
    res.json(forecast);
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
};

exports.getNodeForecast = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { horizon = 60 } = req.query;
    const forecast = await mlService.getForecast(nodeId, parseInt(horizon));
    res.json(forecast);
  } catch (err) {
    console.error('Node forecast error:', err);
    res.status(500).json({ error: 'Failed to fetch node forecast' });
  }
};
