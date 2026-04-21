import { Router } from "express";
import { aiAssistantController } from "../config/di";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/analyze", authMiddleware, (req, res) => aiAssistantController.analyze(req, res));

export default router;
