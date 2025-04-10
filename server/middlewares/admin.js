import User from "../models/user.js";
import { BaseMiddleware } from "../utils/baseMiddleware.js";
import UserRole from "../enums/UserRole.js";
import { ApiError } from "../utils/responseHandler.js";

/**
 * 管理員中間件類
 * 負責管理員用戶的創建和更新驗證
 */
class AdminMiddleware extends BaseMiddleware {
	constructor() {
		super(User, "Admin", ["account", "password", "email", "name"]);
	}

	// 驗證創建數據
	async validateCreateData(data) {
		const { account, password, email, name } = data;

		// 基本欄位檢查
		if (!account || !password || !name) {
			throw ApiError.badRequest("帳號、密碼和姓名為必填欄位");
		}

		// 驗證用戶名是否重複
		await this.checkDuplicate("account", account);

		// 如果提供了郵箱，驗證是否重複
		if (email) {
			await this.checkDuplicate("email", email);
		}

		// 驗證密碼強度
		if (password.length < 4 || password.length > 20) {
			throw ApiError.badRequest("密碼長度必須在  個字符之間");
		}

		// 設置為管理員角色
		data.role = UserRole.ADMIN;

		// 設置活動狀態和首次登入標記
		data.isActive = true;
		data.isFirstLogin = true; // 強制首次登入修改密碼
	}

	// 驗證更新數據
	async validateUpdateData(admin, updateData) {
		const { account, email } = updateData;

		// 如果要更新帳號，檢查是否重複
		if (account && account !== admin.account) {
			await this.checkDuplicate("account", account);
		}

		// 如果要更新郵箱，檢查是否重複
		if (email && email !== admin.email) {
			await this.checkDuplicate("email", email);
		}

		// 不允許通過此方法直接更新密碼
		if (updateData.password) {
			delete updateData.password;
		}

		// 不允許管理員更改自己的角色
		if (updateData.role) {
			delete updateData.role;
		}
	}

	// 驗證停用用戶請求
	validateDeactivation = (req, res, next) => {
		try {
			// 檢查是否在嘗試停用自己的帳號
			if (req.params.id === req.user.id) {
				throw ApiError.badRequest("不能停用自己的帳號");
			}
			next();
		} catch (err) {
			next(err);
		}
	};

	// 驗證重置密碼請求
	validatePasswordReset = (req, res, next) => {
		try {
			// 這裡可以添加密碼重置的特殊驗證
			next();
		} catch (err) {
			next(err);
		}
	};

	// 驗證刪除用戶請求
	validateDeletion = (req, res, next) => {
		try {
			// 檢查是否在嘗試刪除自己的帳號
			if (req.params.id === req.user.id) {
				throw ApiError.badRequest("不能刪除自己的帳號");
			}

			// 也可以添加其他驗證邏輯，例如防止刪除超級管理員等
			next();
		} catch (err) {
			next(err);
		}
	};
}

export default new AdminMiddleware();
