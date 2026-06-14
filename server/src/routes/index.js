import { Router } from 'express';
import systemRoutes from './system.routes.js';
import authRoutes from './auth.routes.js';

/**
 * Root API router. Each feature mounts its own sub-router here, keeping route
 * wiring in one discoverable place. Later phases add: catalog, resources,
 * requests, me, admin.
 */
const router = Router();

router.use(systemRoutes);
router.use('/auth', authRoutes);

export default router;
