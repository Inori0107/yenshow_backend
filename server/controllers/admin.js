import User from "../models/user.js";
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../utils/responseHandler.js";
import UserRole from "../enums/UserRole.js";

export const getAllUsers = async (req, res, next) => {
	try {
		const users = await User.find({}).select("-password -tokens").sort({ createdAt: -1 });
		return successResponse(res, StatusCodes.OK, "獲取用戶列表成功", { users });
	} catch (error) {
		next(error);
	}
};

export const createUser = async (req, res, next) => {
	try {
		const { account, email, password, role } = req.body;

		if (!account || !email || !password) {
			throw ApiError.badRequest("帳號、信箱和密碼為必填欄位");
		}

		const existingUser = await User.findOne({ $or: [{ account }, { email }] });
		if (existingUser) {
			throw ApiError.badRequest(existingUser.account === account ? "用戶帳號已存在" : "用戶信箱已存在");
		}

		const user = await User.create({
			account,
			password,
			email,
			role: role || UserRole.USER,
			isActive: true,
			isFirstLogin: true
		});

		return successResponse(res, StatusCodes.CREATED, "用戶創建成功", {
			user: {
				_id: user._id,
				account: user.account,
				email: user.email,
				role: user.role,
				isActive: user.isActive
			}
		});
	} catch (error) {
		next(error);
	}
};

export const updateUser = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { email, role, isActive } = req.body;

		const user = await User.findByIdAndUpdate(id, { email, role, isActive }, { new: true }).select("-password -tokens");

		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		return successResponse(res, StatusCodes.OK, "用戶更新成功", { user });
	} catch (error) {
		next(error);
	}
};

export const resetPassword = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { password } = req.body;

		if (!password) {
			throw ApiError.badRequest("密碼為必填欄位");
		}

		const user = await User.findById(id);
		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		user.password = password;
		user.isFirstLogin = true;
		await user.save();

		return successResponse(res, StatusCodes.OK, "密碼重置成功", {
			user: {
				_id: user._id,
				account: user.account
			}
		});
	} catch (error) {
		next(error);
	}
};

export const activateUser = async (req, res, next) => {
	try {
		const { id } = req.params;
		const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true }).select("-password -tokens");

		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		return successResponse(res, StatusCodes.OK, "用戶已啟用", { user });
	} catch (error) {
		next(error);
	}
};

export const deactivateUser = async (req, res, next) => {
	try {
		const { id } = req.params;
		const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true }).select("-password -tokens");

		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		return successResponse(res, StatusCodes.OK, "用戶已停用", { user });
	} catch (error) {
		next(error);
	}
};

/**
 * 刪除用戶
 * @route DELETE /admin/users/:id
 * @access Admin
 */
export const deleteUser = async (req, res, next) => {
	try {
		const { id } = req.params;

		// 檢查是否嘗試刪除自己
		if (id === req.user.id) {
			throw ApiError.badRequest("不能刪除自己的帳號");
		}

		// 查找並刪除用戶
		const user = await User.findByIdAndDelete(id);

		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		// 返回成功響應
		return successResponse(res, StatusCodes.OK, "用戶刪除成功", {
			result: {
				id: user._id,
				account: user.account
			}
		});
	} catch (error) {
		console.error("刪除用戶失敗:", error);
		next(error);
	}
};
