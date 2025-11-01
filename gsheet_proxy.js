const express = require('express');

// Use built-in fetch when available (Node 18+), otherwise fall back to node-fetch
const doFetch = (...args) => {
  if (typeof fetch === 'function') return fetch(...args);
  return import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));
};

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Proxy endpoint: /gsheet?url=<published_csv_url>
app.get('/gsheet', async (req, res) => {
  const csvUrl = req.query.url;
  if (!csvUrl) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  try {
    const response = await doFetch(csvUrl);
    if (!response.ok) {
      res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
      return;
    }
    const csv = await response.text();
    res.set('Content-Type', 'text/csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}`);
});

