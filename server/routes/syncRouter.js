import express from "express";
import { syncProducts, syncNews } from "../controllers/syncController.js";
import { apiKeyAuth } from "../middlewares/auth/apiKeyAuth.js";

const router = express.Router();

// 所有同步路由都需要 API 金鑰驗證
router.use(apiKeyAuth);

// 手動同步路由
router.post("/products", syncProducts);
router.post("/news", syncNews);

export default router;
