import { Router } from "express";
import { syncProducts, syncNews } from "../controllers/syncController.js";

/**
 * 雲端同步路由
 * 提供手動觸發同步資料到雲端的 API 端點
 */
const router = Router();

// 產品資料同步
router.post("/products", syncProducts);

// 新聞資料同步 (尚未完全實現)
router.post("/news", syncNews);

export default router;
