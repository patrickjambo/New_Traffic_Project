const express = require('express');
const app = express();
app.use(express.json());

// Mount the main dashboard route (now simplified controller)
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/health', (req, res) => res.json({ status: 'ok', node_env: process.env.NODE_ENV || 'dev' }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => console.log(`Debug dashboard server v2 listening on ${PORT}`));
