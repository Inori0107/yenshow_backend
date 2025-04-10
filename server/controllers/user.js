import User from "../models/user.js";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { ApiError, successResponse } from "../utils/responseHandler.js";

/**
 * 用戶登入
 * @route POST /api/user/login
 * @access Public
 */
export const login = async (req, res, next) => {
	try {
		console.log("處理登入:", { account: req.user.account, _id: req.user._id });

		const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "7 days" });

		if (!req.user.tokens) {
			req.user.tokens = [];
		}

		req.user.tokens.push(token);
		await req.user.save();

		const userData = {
			account: req.user.account,
			role: req.user.role
		};

		return successResponse(res, StatusCodes.OK, "登入成功", {
			result: { token, user: userData }
		});
	} catch (error) {
		console.error("登入失敗:", error);
		next(error);
	}
};

/**
 * 延長用戶登入時間
 * @route PATCH /api/user/extend
 * @access Private
 */
export const extend = async (req, res, next) => {
	try {
		console.log("延長登入時間:", { account: req.user.account, _id: req.user._id });

		// 尋找使用者當前的 token
		const idx = req.user.tokens.findIndex((token) => token === req.token);
		if (idx === -1) {
			throw ApiError.unauthorized("無效的 token");
		}

		// 建立新的 token
		const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "7 days" });

		// 更新 token
		req.user.tokens[idx] = token;
		await req.user.save();

		console.log("延長登入時間成功");

		return successResponse(res, token, "延長登入時間成功");
	} catch (error) {
		console.error("延長登入時間失敗:", error);
		next(error);
	}
};

/**
 * 獲取用戶個人資料
 * @route GET /api/user/profile
 * @access Private
 */
export const profile = (req, res, next) => {
	try {
		console.log("獲取用戶資料:", { account: req.user.account, _id: req.user._id });

		const userData = {
			account: req.user.account,
			email: req.user.email,
			role: req.user.role
		};

		return successResponse(res, StatusCodes.OK, "獲取用戶資料成功", { result: userData });
	} catch (error) {
		console.error("獲取用戶資料失敗:", error);
		next(error);
	}
};

/**
 * 用戶登出
 * @route DELETE /api/user/logout
 * @access Private
 */
export const logout = async (req, res, next) => {
	try {
		console.log("處理登出:", { account: req.user.account, _id: req.user._id });

		// 移除當前的 token
		req.user.tokens = req.user.tokens.filter((token) => token !== req.token);
		await req.user.save();

		console.log("登出成功");

		return successResponse(res, StatusCodes.OK, "登出成功");
	} catch (error) {
		console.error("登出失敗:", error);
		next(error);
	}
};

/**
 * 修改密碼（包括首次登入強制修改密碼）
 * @route POST /api/user/change-password
 * @access Private
 */
export const changePassword = async (req, res, next) => {
	try {
		const { currentPassword, newPassword } = req.body;
		const userId = req.user._id;

		console.log("修改密碼請求:", { userId });

		// 驗證請求參數
		if (!currentPassword || !newPassword) {
			throw ApiError.badRequest("當前密碼和新密碼為必填項");
		}

		// 驗證密碼長度
		if (newPassword.length < 4 || newPassword.length > 20) {
			throw ApiError.badRequest("密碼長度必須在 4-20 個字符之間");
		}

		// 獲取用戶並包含密碼字段
		const user = await User.findById(userId).select("+password");
		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		// 驗證當前密碼
		const isMatch = await user.comparePassword(currentPassword);
		if (!isMatch) {
			throw ApiError.badRequest("當前密碼不正確");
		}

		// 更新密碼
		user.password = newPassword;

		// 如果是首次登入，更新標記
		if (user.isFirstLogin) {
			user.isFirstLogin = false;
		}

		await user.save();

		return successResponse(res, StatusCodes.OK, "密碼已成功更新");
	} catch (error) {
		console.error("修改密碼失敗:", error);
		next(error);
	}
};
