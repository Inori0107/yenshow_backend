import { StatusCodes } from "http-status-codes";
import { successResponse } from "../utils/responseHandler.js";
import { EntityService } from "../services/EntityService.js";

export class EntityController {
	constructor(model, options = {}) {
		// 基本配置
		this.model = model;
		this.entityName = options.entityName || model.modelName.toLowerCase();
		this.responseKey = options.responseKey || `${this.entityName}`;

		// 建立 EntityService 實例
		this.entityService = new EntityService(model, {
			parentField: options.parentField || null,
			parentModel: options.parentModel || null,
			basicFields: options.basicFields || ["code", "isActive"]
		});

		// 父層關聯配置 - 直接使用 EntityService 的值
		this.parentEntityName = options.parentEntityName || (this.entityService.parentModel ? this.entityService.parentModel.modelName.toLowerCase() : null);

		// 綁定所有方法
		this._bindMethods();
	}

	// 綁定所有方法
	_bindMethods() {
		// 綁定所有公共方法到當前實例
		const methods = ["getAllItems", "getItemById", "createItem", "updateItem", "deleteItem", "batchProcess", "searchItems"];

		methods.forEach((method) => {
			if (typeof this[method] === "function") {
				this[method] = this[method].bind(this);
			}
		});
	}

	// 處理響應
	_sendResponse(res, statusCode, message, data) {
		// 回傳資料，不需要特殊處理，因為模型中已經沒有虛擬欄位
		return successResponse(res, statusCode, message, { result: data });
	}

	// 統一錯誤處理
	_handleError(error, operation, next) {
		console.error(`${operation}${this.entityName}失敗:`, error);
		// 檢查 next 是否是函數，如果不是，直接拋出錯誤
		if (typeof next === "function") {
			next(error);
		} else {
			// 當 next 不是函數時，嘗試處理錯誤
			console.error(`錯誤處理函數無效，直接處理錯誤:`, error);
			throw error; // 重新拋出錯誤
		}
	}

	// 供子類覆寫的自定義過濾方法
	_applyCustomFilters(query, req) {
		// 子類可以覆寫此方法以添加自定義過濾邏輯
	}

	// 獲取所有項目
	async getAllItems(req, res, next) {
		try {
			// 構建查詢條件
			const query = { isActive: true };

			// 處理父實體過濾
			if (this.entityService.parentField) {
				const parentId = req.query[this.entityService.parentField];
				if (parentId) {
					query[this.entityService.parentField] = parentId;
				}
			}

			// 應用其他過濾條件
			this._applyCustomFilters(query, req);

			const results = await this.entityService.search(query, {
				sort: { createdAt: 1 }
			});

			return this._sendResponse(res, StatusCodes.OK, `獲取${this.entityName}列表成功`, { [this.responseKey]: results.data });
		} catch (error) {
			this._handleError(error, "獲取", next);
		}
	}

	// 獲取單個項目
	async getItemById(req, res, next) {
		try {
			const { id } = req.params;

			// 檢查項目是否已通過中間件載入
			if (req[this.entityName]) {
				return this._sendResponse(res, StatusCodes.OK, `獲取${this.entityName}成功`, {
					[this.entityName]: this.entityService.formatOutput(req[this.entityName])
				});
			}

			// 確保實體存在
			const entity = await this.entityService.ensureExists(id);

			return this._sendResponse(res, StatusCodes.OK, `獲取${this.entityName}成功`, { [this.entityName]: this.entityService.formatOutput(entity) });
		} catch (error) {
			this._handleError(error, "獲取", next);
		}
	}

	// 創建項目
	async createItem(req, res, next) {
		try {
			const newItem = await this.entityService.create(req.body, {
				session: req.dbSession
			});

			return this._sendResponse(res, StatusCodes.CREATED, `${this.entityName}創建成功`, { [this.entityName]: newItem });
		} catch (error) {
			this._handleError(error, "創建", next);
		}
	}

	// 更新項目
	async updateItem(req, res, next) {
		try {
			const item = await this.entityService.update(req.params.id, req.body, {
				session: req.dbSession
			});

			// 從資料庫重新查詢以確保獲取最新資料
			const refreshedItem = await this.model.findById(req.params.id);

			return this._sendResponse(res, StatusCodes.OK, `${this.entityName}更新成功`, { [this.entityName]: this.entityService.formatOutput(refreshedItem) });
		} catch (error) {
			this._handleError(error, "更新", next);
		}
	}

	// 刪除項目
	async deleteItem(req, res, next) {
		try {
			const result = await this.entityService.delete(req.params.id, {
				session: req.dbSession
			});

			return this._sendResponse(res, StatusCodes.OK, `${this.entityName}已成功刪除`, { [this.entityName]: result });
		} catch (error) {
			this._handleError(error, "刪除", next);
		}
	}

	// 批量處理
	async batchProcess(req, res, next) {
		try {
			const { toCreate = [], toUpdate = [] } = req.body;

			const results = await this.entityService.batchProcess({
				toCreate,
				toUpdate,
				session: req.dbSession,
				options: { excludePopulated: true }
			});

			return this._sendResponse(res, StatusCodes.OK, `批量處理${this.entityName}完成`, results);
		} catch (error) {
			this._handleError(error, "批量處理", next);
		}
	}

	// 搜尋項目
	async searchItems(req, res, next) {
		try {
			const { keyword, page, limit, sort, sortDirection } = req.query;

			const parentField = this.entityService.parentField;
			const parentFilter = parentField && req.query[parentField] ? { [parentField]: req.query[parentField] } : {};

			const results = await this.entityService.search(
				{
					isActive: true,
					...parentFilter
				},
				{
					keyword,
					pagination: { page: parseInt(page) || 1, limit: parseInt(limit) || 20 },
					sort: { [sort || "createdAt"]: sortDirection === "desc" ? -1 : 1 }
				}
			);

			return this._sendResponse(res, StatusCodes.OK, `${this.entityName}搜索結果`, {
				[this.responseKey]: results.data,
				pagination: results.pagination
			});
		} catch (error) {
			this._handleError(error, "搜索", next);
		}
	}
}
