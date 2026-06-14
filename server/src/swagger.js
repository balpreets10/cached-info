import swaggerJSDoc from 'swagger-jsdoc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// OpenAPI spec built from JSDoc @openapi blocks on the route handlers in this
// directory. Add a @openapi comment above a route and it shows up at /api/docs.
const spec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'cachedinfo.gamingdronzz.com API',
      version: '0.1.0',
      description: 'Backend API for cachedinfo.gamingdronzz.com (Express + node-postgres).',
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: `local (${config.env})` },
    ],
  },
  // Scan all route files for @openapi annotations. Use POSIX-style forward
  // slashes — swagger-jsdoc globs internally and Windows backslashes won't match.
  apis: [`${__dirname.replace(/\\/g, '/')}/*.js`],
});

export default spec;
