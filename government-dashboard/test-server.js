const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <h1 style="color: blue; font-size: 48px;">✅ SERVER IS WORKING!</h1>
      <p>If you see this, the server can respond to HTTP requests.</p>
      <p>Port: 3005</p>
    </body>
    </html>
  `);
});

server.listen(3005, '0.0.0.0', () => {
  console.log('Test server running on http://localhost:3005');
});
