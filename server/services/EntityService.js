import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";

/**
 * EntityService 類 - 提供模型實體通用操作
 */
export class EntityService {
	/**
	 * 建構函數
	 * @param {Object} model - Mongoose 模型
	 * @param {Object} options - 配置選項
	 * @param {String} options.parentField - 父層實體欄位名稱
	 * @param {Object} options.parentModel - 父層實體模型
	 * @param {Array} options.basicFields - 基本欄位清單
	 */
	constructor(model, options = {}) {
		this.model = model;
		this.modelName = model.modelName;
		this.parentField = options.parentField || null;
		this.parentModel = options.parentModel || null;
		this.basicFields = options.basicFields || ["code", "isActive"];
	}

	/**
	 * 檢查實體是否存在
	 * @param {String} id - 實體ID
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 實體對象
	 */
	async ensureExists(id, options = {}) {
		try {
			const query = { _id: id };
			if (options.isActive !== undefined) {
				query.isActive = options.isActive;
			}

			const entity = await this.model.findOne(query);
			if (!entity) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到該${this.modelName.toLowerCase()}`);
			}

			return entity;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `查詢${this.modelName.toLowerCase()}時發生錯誤: ${error.message}`);
		}
	}

	/**
	 * 檢查父層實體是否存在
	 * @param {String} parentId - 父層實體ID
	 * @returns {Promise<Object>} - 父層實體對象
	 */
	async ensureParentExists(parentId) {
		if (!this.parentModel || !this.parentField) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `該實體類型不支持父層查詢`);
		}

		try {
			const parent = await this.parentModel.findOne({
				_id: parentId,
				isActive: true
			});

			if (!parent) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到相關的${this.parentModel.modelName.toLowerCase()}`);
			}

			return parent;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `查詢父層實體時發生錯誤: ${error.message}`);
		}
	}

	/**
	 * 檢查實體是否有依賴項
	 * @param {String} id - 實體ID
	 * @returns {Promise<void>}
	 */
	async checkDependencies(id) {
		return;
	}

	/**
	 * 格式化輸出數據 - 極簡版本
	 * @param {Object} item - 實體項目
	 * @returns {Object} - 格式化後的數據
	 */
	formatOutput(item) {
		if (!item) return null;

		// 轉換為普通物件
		const obj = item.toObject ? item.toObject() : item;

		// 刪除不必要的語言虛擬欄位
		delete obj.TW;
		delete obj.EN;

		return obj;
	}

	/**
	 * 創建實體
	 * @param {Object} data - 創建數據
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 創建的實體
	 */
	async create(data, options = {}) {
		try {
			// 檢查必要欄位，但對 Faq 和 News 模型例外
			if (!data.code && this.modelName !== "Faq" && this.modelName !== "News") {
				throw new ApiError(StatusCodes.BAD_REQUEST, `${this.modelName} 代碼欄位不能為空`);
			}

			// 創建實體
			const entity = new this.model(data);

			if (options.session) {
				await entity.save({ session: options.session });
			} else {
				await entity.save();
			}

			return this.formatOutput(entity);
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `創建${this.modelName.toLowerCase()}失敗: ${error.message}`);
		}
	}

	/**
	 * 更新實體
	 * @param {String} id - 實體ID
	 * @param {Object} data - 更新數據
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 更新後的實體
	 */
	async update(id, data, options = {}) {
		try {
			// 檢查實體是否存在，注意要保存返回值
			const entity = await this.ensureExists(id);

			// 處理父層關聯
			if (this.parentField && data[this.parentField]) {
				await this.ensureParentExists(data[this.parentField]);
			}

			// 準備更新資料
			const updateData = this.prepareUpdateData(data);

			// 直接使用 findByIdAndUpdate
			const updatedEntity = await this.model.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, session: options.session });

			if (!updatedEntity) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到要更新的${this.modelName.toLowerCase()}`);
			}

			return this.formatOutput(updatedEntity);
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `更新${this.modelName.toLowerCase()}失敗: ${error.message}`);
		}
	}

	// 新增方法，準備更新資料
	prepareUpdateData(data) {
		const updateData = { ...data };
		delete updateData._id;
		delete updateData.__v;

		// 處理多語言欄位
		if (updateData.name && typeof updateData.name === "object") {
			for (const lang in updateData.name) {
				updateData[`name.${lang}`] = updateData.name[lang];
			}
			delete updateData.name;
		}

		return updateData;
	}

	/**
	 * 刪除實體
	 * @param {String} id - 實體ID
	 * @param {Object} options - 選項
	 * @returns {Promise<Boolean>} - 是否成功刪除
	 */
	async delete(id, options = {}) {
		try {
			// 檢查實體是否存在
			await this.ensureExists(id);

			// 檢查是否有子項依賴
			if (options.checkDependencies !== false) {
				await this.checkDependencies(id);
			}

			// 執行刪除
			const result = await this.model.findByIdAndDelete(id);
			return !!result;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `刪除${this.modelName.toLowerCase()}失敗: ${error.message}`);
		}
	}

	/**
	 * 搜索實體
	 * @param {Object} query - 查詢條件
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 搜索結果
	 */
	async search(query = {}, options = {}) {
		try {
			const { term, pagination, sort } = options;

			const searchQuery = { ...query };

			// 如果有搜索詞，使用正則表達式搜索（支持物件格式的多語言欄位）
			if (term) {
				// 確保 term 是字串類型
				const termString = String(term);

				const searchConditions = [{ code: { $regex: termString, $options: "i" } }];

				// 為每個語言添加搜索條件
				this.basicFields.forEach((field) => {
					searchConditions.push({ [field]: { $regex: termString, $options: "i" } });
				});

				searchQuery.$or = searchConditions;
			}

			// 設置分頁
			const page = pagination?.page || 1;
			const limit = pagination?.limit || 50;
			const skip = (page - 1) * limit;

			// 執行計數查詢
			const total = await this.model.countDocuments(searchQuery);

			// 構建查詢
			let dbQuery = this.model.find(searchQuery);

			// 應用排序
			if (sort) {
				dbQuery = dbQuery.sort(sort);
			}

			// 應用分頁
			if (pagination) {
				dbQuery = dbQuery.skip(skip).limit(limit);
			}

			// 執行查詢
			const results = await dbQuery;

			// 返回結果
			return {
				data: results.map((item) => this.formatOutput(item)),
				pagination: pagination
					? {
							page,
							limit,
							total,
							pages: Math.ceil(total / limit)
					  }
					: null
			};
		} catch (error) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `搜索${this.modelName.toLowerCase()}失敗: ${error.message}`);
		}
	}

	/**
	 * 批量處理實體
	 * @param {Object} data - 批量處理數據
	 * @param {Array} data.toCreate - 要創建的實體列表
	 * @param {Array} data.toUpdate - 要更新的實體列表
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 批量處理結果
	 */
	async batchProcess(data, options = {}) {
		const { toCreate = [], toUpdate = [], session } = data;
		const results = {
			created: [],
			updated: [],
			errors: []
		};

		try {
			for (const item of toCreate) {
				try {
					const created = await this.create(item, {
						session,
						...options.options
					});
					results.created.push(created);
				} catch (error) {
					results.errors.push({
						operation: "create",
						data: item,
						error: error.message
					});
				}
			}

			for (const item of toUpdate) {
				if (!item._id) {
					results.errors.push({
						operation: "update",
						data: item,
						error: "缺少ID欄位"
					});
					continue;
				}

				try {
					const updated = await this.update(item._id, item, {
						session,
						...options.options
					});
					results.updated.push(updated);
				} catch (error) {
					results.errors.push({
						operation: "update",
						data: item,
						error: error.message
					});
				}
			}

			return results;
		} catch (error) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `批量處理${this.modelName.toLowerCase()}失敗: ${error.message}`);
		}
	}

	/**
	 * 更新實體欄位
	 * @param {Object} entity - 實體對象
	 * @param {Object} data - 更新數據
	 */
	updateEntityFields(entity, data) {
		// 遍歷更新資料中的所有欄位
		for (const key in data) {
			// 跳過控制欄位和特殊欄位
			if (key === "_id" || key === "__v") continue;

			// 特殊處理多語言欄位
			if ((key === "name" || key === "description") && typeof data[key] === "object") {
				// 確保實體的多語言欄位已初始化
				entity[key] = entity[key] || {};

				// 逐個更新語言欄位
				for (const lang in data[key]) {
					entity[key][lang] = data[key][lang];
				}
			}
			// 特殊處理 features 陣列
			else if (key === "features" && Array.isArray(data[key])) {
				entity.features = data[key].map((feature) => {
					if (feature.name && typeof feature.name === "object") {
						return {
							featureId: feature.featureId,
							name: {
								TW: feature.name.TW || "",
								EN: feature.name.EN || ""
							}
						};
					}
					return feature;
				});
			} else {
				// 其他一般欄位直接更新
				entity[key] = data[key];
			}
		}
	}
}
