import express from "express";
import FaqController from "../controllers/FaqController.js";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";
import fileUpload from "../utils/fileUpload.js";

const router = express.Router();

// 公開路由 (不需驗證)
router.get("/search", checkRole([Permissions.PUBLIC]), FaqController.searchItems); // 搜索
router.get("/", checkRole([Permissions.PUBLIC]), FaqController.getAllItems); // 獲取所有 (啟用狀態)
router.get("/:id", checkRole([Permissions.PUBLIC]), FaqController.getItemById); // 獲取單個

// 需要身份驗證的路由
router.use(requireAuth); // 應用 JWT 驗證

// 獲取處理 FAQ 圖片上傳的 multer 中間件
const uploadFaqImage = fileUpload.getFaqUploadMiddleware();

// 需要事務處理和權限的路由
router.post("/", checkRole([Permissions.ADMIN, Permissions.STAFF]), uploadFaqImage, FaqController.createItem); // 創建
router.put("/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), uploadFaqImage, FaqController.updateItem); // 更新
router.delete("/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), FaqController.deleteItem); // 刪除
router.post("/batch", checkRole([Permissions.ADMIN, Permissions.STAFF]), FaqController.batchProcess); // 批量處理

export default router;
