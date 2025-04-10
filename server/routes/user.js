import { Router } from "express";
import { login, extend, profile, logout, changePassword } from "../controllers/user.js";
import authMiddleware from "../middlewares/auth.js";

const router = Router();

/**
 * 公開路由 - 不需要身份驗證
 */
// 用戶登入
router.post("/login", authMiddleware.login, login);

/**
 * 受保護路由 - 需要身份驗證
 */
// 延長用戶登入時間
router.patch("/extend", authMiddleware.verifyJWT, extend);

// 獲取用戶個人資料
router.get("/profile", authMiddleware.verifyJWT, profile);

// 用戶登出
router.delete("/logout", authMiddleware.verifyJWT, logout);

// 修改密碼（包括首次登入強制修改密碼）
router.post("/change-password", authMiddleware.verifyJWT, changePassword);

export default router;
