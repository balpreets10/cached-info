import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import config from './config.js';
import swaggerSpec from './swagger.js';
import passport from './auth/passport.js';
import apiRouter from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

/**
 * Builds and returns the configured Express app WITHOUT starting the listener.
 * Keeping construction separate from `listen()` lets tests import the app and
 * drive it with supertest. The process entrypoint lives in index.js.
 */
export function createApp() {
  const app = express();

  // Behind a reverse proxy (nginx/Apache on the droplet) — trust it so secure
  // cookies and req.ip work correctly.
  app.set('trust proxy', 1);

  // --- Security & platform middleware ---------------------------------------
  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigin.split(',').map((o) => o.trim()),
      credentials: true, // allow the httpOnly refresh cookie
    }),
  );
  app.use(compression());
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());
  if (config.env !== 'test') {
    app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
  }

  // --- API docs --------------------------------------------------------------
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

  // --- Application routes ----------------------------------------------------
  app.use('/api', apiRouter);

  // --- Tail middleware (order matters) --------------------------------------
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
