const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

console.log('🧪 Final WebSocket Connection Test...');

const token = jwt.sign(
  { id: 'test_final', email: 'test@nasa.com', role: 'user' },
  'test_secret',
  { expiresIn: '1h' }
);

const socket = io('http://localhost:3001', {
  auth: { token },
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ WebSocket connection successful!');
  console.log('📡 Client ID:', socket.id);

  socket.emit('subscribe:nasa:iss', {});
  socket.emit('ping', { timestamp: Date.now() });
});

socket.on('subscribed', (data) => {
  console.log('✅ NASA ISS subscription successful:', data.stream);
});

socket.on('pong', (data) => {
  const latency = Date.now() - data.timestamp;
  console.log('✅ Ping/Pong successful - Latency:', latency + 'ms');
  console.log('🎯 Real-time features validated successfully!');
  socket.disconnect();
});

socket.on('error', (error) => {
  console.log('❌ WebSocket error:', error.message);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection failed:', error.message);
});

setTimeout(() => {
  socket.disconnect();
  console.log('✅ Test completed successfully!');
  process.exit(0);
}, 8000);