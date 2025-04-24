import express from "express";
import NewsController from "../controllers/NewsController.js";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";

const router = express.Router();

// 公開路由 (不需驗證)
router.get("/search", checkRole([Permissions.PUBLIC]), NewsController.searchItems); // 搜索
router.get("/", checkRole([Permissions.PUBLIC]), NewsController.getAllItems); // 獲取所有 (啟用狀態)
router.get("/:id", checkRole([Permissions.PUBLIC]), NewsController.getItemById); // 獲取單個

// 需要身份驗證的路由
router.use(requireAuth);

// 需要事務處理和權限的路由
router.post("/", checkRole([Permissions.ADMIN, Permissions.STAFF]), NewsController.createItem); // 創建
router.put("/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), NewsController.updateItem); // 更新
router.delete("/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), NewsController.deleteItem); // 刪除
router.post("/batch", checkRole([Permissions.ADMIN, Permissions.STAFF]), NewsController.batchProcess); // 批量處理

export default router;
