import { Router } from "express";
import { login, logout, getProfile, changePassword, extendToken } from "../controllers/authController.js";
import { getUsers, createUser, updateUser, resetPassword, deactivateUser, activateUser, deleteUser } from "../controllers/admin/admin.js";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";
import { login as loginMiddleware } from "../middlewares/auth.js";

const router = Router();

// 公開路由 - 不需要身份驗證
router.post("/login", loginMiddleware, login);

// 受保護的基本路由 - 所有已認證用戶皆可使用
router.use(requireAuth);
router.get("/profile", getProfile);
router.delete("/logout", logout);
router.post("/change-password", changePassword);
router.patch("/extend", extendToken);

// 客戶特有功能

// 僅管理員可訪問的用戶管理功能
router.get("/users", checkRole([Permissions.ADMIN]), getUsers);
router.post("/users", checkRole([Permissions.ADMIN]), createUser);
router.put("/users/:id", checkRole([Permissions.ADMIN]), updateUser);
router.delete("/users/:id", checkRole([Permissions.ADMIN]), deleteUser);
router.post("/users/:id/reset-password", checkRole([Permissions.ADMIN]), resetPassword);
router.post("/users/:id/deactivate", checkRole([Permissions.ADMIN]), deactivateUser);
router.post("/users/:id/activate", checkRole([Permissions.ADMIN]), activateUser);

export default router;
