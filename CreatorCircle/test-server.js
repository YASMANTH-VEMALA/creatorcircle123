const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'Test server is working',
    timestamp: new Date().toISOString(),
    url: req.url
  }));
});

const PORT = 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
}); 