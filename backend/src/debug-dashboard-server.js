const express = require('express');
const app = express();
app.use(express.json());

// Mount the test dashboard route (uses a lightweight controller that doesn't require DB)
app.use('/api/dashboard', require('./routes/dashboard_test'));

app.get('/health', (req, res) => res.json({ status: 'ok', node_env: process.env.NODE_ENV || 'dev' }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => console.log(`Debug dashboard server listening on ${PORT}`));
