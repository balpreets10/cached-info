import { createApp } from './app.js';
import config from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[server] ${config.env} API listening on http://localhost:${config.port}`);
  console.log(`[server] API docs:    http://localhost:${config.port}/api/docs`);
  console.log(`[server] CORS origin: ${config.clientOrigin}`);
});
