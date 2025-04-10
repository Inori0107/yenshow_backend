import { Router } from "express";
import { getAllUsers, createUser, updateUser, resetPassword, deactivateUser, activateUser, deleteUser } from "../controllers/admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

/**
 * 管理員路由 - 需要管理員權限
 * 所有路由都受到保護，需要管理員角色
 */

// 先應用基本身份驗證中間件
router.use(requireAuth);
// 再應用管理員權限中間件
router.use(requireAdmin);

// 用戶管理路由
// 獲取所有用戶
router.get("/users", getAllUsers);

// 創建新用戶
router.post("/users", createUser);

// 更新用戶信息
router.put("/users/:id", updateUser);

// 刪除用戶
router.delete("/users/:id", deleteUser);

// 特殊操作需要額外驗證
router.post("/users/:id/reset-password", resetPassword);
router.post("/users/:id/deactivate", deactivateUser);
router.post("/users/:id/activate", activateUser);

export default router;
