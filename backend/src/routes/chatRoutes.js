import express from 'express';
import { handleMessage, createSession } from '../controllers/chatController.js';

const router = express.Router();

router.post('/message', handleMessage);
router.post('/session', createSession); 

export default router;


