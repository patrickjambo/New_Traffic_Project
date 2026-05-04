const express = require('express');
const axios = require('axios');

const router = express.Router();

const TILE_SERVERS = [
  process.env.TILE_SERVER_URL,
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
].filter(Boolean);

const OSRM_SERVERS = [
  process.env.OSRM_SERVER_URL,
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car'
].filter(Boolean);

const subdomains = ['a', 'b', 'c'];

const buildTileUrl = (template, z, x, y) => {
  const sub = subdomains[(Number(x) + Number(y)) % subdomains.length];
  return template
    .replace('{s}', sub)
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y)
    .replace('{r}', '');
};

const tryTileFetch = async (z, x, y) => {
  for (const template of TILE_SERVERS) {
    try {
      const url = buildTileUrl(template, z, x, y);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 8000,
      });
      return response;
    } catch (error) {
      // Try next tile server
    }
  }
  return null;
};

router.get('/tiles/:z/:x/:y.png', async (req, res) => {
  const { z, x, y } = req.params;
  const response = await tryTileFetch(z, x, y);
  if (!response) {
    return res.status(502).json({ message: 'Tile server unavailable' });
  }

  res.set('Content-Type', response.headers['content-type'] || 'image/png');
  res.set('Cache-Control', 'public, max-age=86400');
  return res.send(response.data);
});

router.get('/tiles/:z/:x/:y', async (req, res) => {
  const { z, x, y } = req.params;
  const response = await tryTileFetch(z, x, y);
  if (!response) {
    return res.status(502).json({ message: 'Tile server unavailable' });
  }

  res.set('Content-Type', response.headers['content-type'] || 'image/png');
  res.set('Cache-Control', 'public, max-age=86400');
  return res.send(response.data);
});

router.get('/osrm', async (req, res) => {
  const path = req.query.path;
  if (!path) {
    return res.status(400).json({ message: 'Missing path parameter' });
  }

  for (const baseUrl of OSRM_SERVERS) {
    try {
      const response = await axios.get(`${baseUrl}${path}`, { timeout: 8000 });
      return res.json(response.data);
    } catch (error) {
      // Try next OSRM server
    }
  }

  return res.status(502).json({ code: 'Error', message: 'OSRM unavailable' });
});

module.exports = router;