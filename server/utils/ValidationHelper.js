import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "./responseHandler.js";

export class ValidationHelper {
	/**
	 * 基礎 ID 驗證邏輯（內部方法）
	 * @param {String} id - ID
	 * @returns {Object} 驗證結果
	 */
	static _validateId(id) {
		// 基本存在檢查
		if (!id) {
			return {
				valid: false,
				reason: "missing"
			};
		}

		// 類型檢查
		if (typeof id !== "string") {
			return {
				valid: false,
				reason: "type"
			};
		}

		// 安全檢查（防止 NoSQL 注入）
		if (id.includes("$")) {
			return {
				valid: false,
				reason: "injection"
			};
		}

		// 格式檢查
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return {
				valid: false,
				reason: "format",
				value: id
			};
		}

		return {
			valid: true,
			sanitizedId: new mongoose.Types.ObjectId(id).toString()
		};
	}

	/**
	 * 驗證多語言名稱
	 * @param {Array} name - 多語言名稱陣列
	 * @param {Array} requiredLanguages - 必須的語言
	 * @param {Number} minLength - 最小長度
	 * @returns {Object} 驗證結果
	 */
	static validateMultilingualName(name, requiredLanguages = ["TW"], minLength = 2) {
		if (!name || !Array.isArray(name) || name.length === 0) {
			return {
				valid: false,
				message: "名稱為必填項",
				apiError: ApiError.badRequest("名稱為必填項")
			};
		}

		// 檢查必要語言
		for (const lang of requiredLanguages) {
			const hasLanguage = name.some((item) => item.language === lang && item.value && item.value.trim().length >= minLength);

			if (!hasLanguage) {
				const message = `名稱必須包含${lang}版本，且至少包含 ${minLength} 個字符`;
				return {
					valid: false,
					message,
					apiError: ApiError.badRequest(message)
				};
			}
		}

		// 檢查格式是否正確
		const hasInvalidFormat = name.some((item) => !item.language || !item.value || !["TW", "EN"].includes(item.language));

		if (hasInvalidFormat) {
			return {
				valid: false,
				message: "多語言名稱格式不正確",
				apiError: ApiError.badRequest("多語言名稱格式不正確")
			};
		}

		return {
			valid: true
		};
	}

	/**
	 * 驗證代碼
	 * @param {String} code - 代碼
	 * @param {Number} minLength - 最小長度
	 * @returns {Object} 驗證結果
	 */
	static validateCode(code, minLength = 2) {
		if (!code || typeof code !== "string" || code.trim().length < minLength) {
			const message = `代碼必須至少包含 ${minLength} 個字符`;
			return {
				valid: false,
				message,
				apiError: ApiError.badRequest(message)
			};
		}
		return {
			valid: true
		};
	}

	/**
	 * 驗證關聯 ID
	 * @param {String} id - ID
	 * @param {String} fieldName - 欄位名稱
	 * @returns {Object} 驗證結果
	 */
	static validateRelationId(id, fieldName) {
		const result = this._validateId(id);

		if (!result.valid) {
			let message;
			switch (result.reason) {
				case "missing":
					message = `${fieldName} ID 為必填項`;
					break;
				case "type":
				case "injection":
				case "format":
					message = `無效的 ${fieldName} ID 格式`;
					break;
			}

			return {
				valid: false,
				message,
				statusCode: StatusCodes.BAD_REQUEST,
				apiError: ApiError.badRequest(message)
			};
		}

		return {
			valid: true,
			sanitizedId: result.sanitizedId
		};
	}

	/**
	 * 驗證 URL 參數 ID
	 * @param {String} id - ID
	 * @param {String} entityName - 實體名稱
	 * @returns {Object} 驗證結果
	 */
	static validateUrlParamId(id, entityName) {
		const result = this._validateId(id);

		if (!result.valid) {
			let message;
			switch (result.reason) {
				case "missing":
					message = `缺少${entityName} ID`;
					break;
				case "type":
					message = `無效的${entityName} ID 格式`;
					break;
				case "injection":
					message = `${entityName} ID 包含非法字元`;
					break;
				case "format":
					message = `無效的${entityName} ID 格式: ${result.value}`;
					break;
			}

			return {
				valid: false,
				message,
				statusCode: StatusCodes.BAD_REQUEST,
				apiError: ApiError.badRequest(message)
			};
		}

		return {
			valid: true,
			sanitizedId: result.sanitizedId
		};
	}

	/**
	 * 驗證代碼唯一性
	 * @param {Model} model - Mongoose 模型
	 * @param {String} code - 代碼
	 * @param {String} excludeId - 排除的 ID (用於更新時)
	 * @returns {Promise<Object>} 驗證結果
	 */
	static async validateCodeUniqueness(model, code, excludeId = null) {
		const query = { code };

		// 如果提供了排除 ID，在查詢中排除該記錄
		if (excludeId) {
			query._id = { $ne: excludeId };
		}

		const exists = await model.exists(query);

		if (exists) {
			const message = `代碼 '${code}' 已被使用`;
			return {
				valid: false,
				message,
				apiError: ApiError.conflict(message)
			};
		}

		return {
			valid: true
		};
	}

	/**
	 * 綜合代碼驗證（格式與唯一性）
	 * @param {String} code - 代碼
	 * @param {Model} model - Mongoose 模型
	 * @param {String} excludeId - 排除的 ID (用於更新時)
	 * @param {Number} minLength - 最小長度
	 * @returns {Promise<Object>} 驗證結果
	 */
	static async validateCodeComprehensive(code, model, excludeId = null, minLength = 2) {
		// 基本格式驗證
		const formatResult = this.validateCode(code, minLength);
		if (!formatResult.valid) {
			return formatResult;
		}

		// 標準化代碼
		const standardizedCode = code.trim().toUpperCase();

		// 唯一性驗證
		const uniqueResult = await this.validateCodeUniqueness(model, standardizedCode, excludeId);
		if (!uniqueResult.valid) {
			return uniqueResult;
		}

		return {
			valid: true,
			standardizedCode
		};
	}

	/**
	 * 驗證批量處理資料
	 * @param {Object} data - 批量處理資料
	 * @param {String} parentIdField - 父項目 ID 欄位名稱
	 * @returns {Object} 驗證結果
	 */
	static validateBatchProcessData(data, parentIdField) {
		const { toCreate = [], toUpdate = [] } = data;
		const errors = [];

		// 驗證父項目 ID
		if (!data[parentIdField]) {
			errors.push(`缺少必要參數：${parentIdField}`);
		}

		// 驗證創建項目
		toCreate.forEach((item, index) => {
			if (!item.name_TW && (!item.name || !item.name.some((n) => n.language === "TW"))) {
				errors.push({
					index,
					type: "create",
					message: "至少需要提供中文(TW)名稱",
					data: item
				});
			}

			if (!item.code) {
				errors.push({
					index,
					type: "create",
					message: "代碼為必填項",
					data: item
				});
			}
		});

		// 驗證更新項目
		toUpdate.forEach((item, index) => {
			if (!item._id) {
				errors.push({
					index,
					type: "update",
					message: "更新項目必須提供ID",
					data: item
				});
			}
		});

		if (errors.length > 0) {
			return {
				valid: false,
				errors,
				message: "批量處理驗證失敗",
				apiError: ApiError.badRequest("批量處理驗證失敗")
			};
		}

		return {
			valid: true
		};
	}

	/**
	 * 將驗證結果轉換為 API 回應
	 * @param {Object} result - 驗證結果
	 * @returns {Object} API 回應數據
	 */
	static toApiResponse(result) {
		if (result.valid) {
			return {
				success: true,
				data: {
					sanitizedId: result.sanitizedId,
					standardizedCode: result.standardizedCode
				}
			};
		} else {
			return {
				success: false,
				apiError: result.apiError || ApiError.badRequest(result.message),
				details: result.errors
			};
		}
	}
}
