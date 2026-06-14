import { Router } from 'express';
import systemRoutes from './system.routes.js';
import authRoutes from './auth.routes.js';
import catalogRoutes from './catalog.routes.js';
import resourceRoutes from './resource.routes.js';
import searchRoutes from './search.routes.js';
import requestRoutes from './request.routes.js';
import meRoutes from './me.routes.js';
import adminRoutes from './admin.routes.js';

/**
 * Root API router. Each feature mounts its own sub-router here, keeping route
 * wiring in one discoverable place.
 */
const router = Router();

router.use(systemRoutes);
router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/resources', resourceRoutes);
router.use('/search', searchRoutes);
router.use('/requests', requestRoutes);
router.use('/me', meRoutes);
router.use('/admin', adminRoutes);

export default router;
