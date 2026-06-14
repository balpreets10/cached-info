import { Router } from 'express';
import systemRoutes from './system.routes.js';

/**
 * Root API router. Each feature mounts its own sub-router here, keeping route
 * wiring in one discoverable place. Later phases add: auth, catalog, resources,
 * requests, me, admin.
 */
const router = Router();

router.use(systemRoutes);

export default router;
