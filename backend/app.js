// Compatibility entry point for older hosting configurations.
const { start } = require('./server.cjs');
start().catch((error) => { console.error('Startup failed:', error.message); process.exit(1); });
