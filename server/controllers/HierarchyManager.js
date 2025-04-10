import { ApiError, successResponse } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";

/**
 * 階層管理器 - 統一管理所有層級的控制器
 * 提供跨層級操作和數據獲取
 */
class HierarchyManager {
	constructor() {
		// 延遲初始化控制器
		this._controllersCache = {};

		// 層級關係定義
		this.hierarchy = [
			{ name: "series", childField: "categories" },
			{ name: "categories", parentField: "series", childField: "subCategories" },
			{ name: "subCategories", parentField: "categories", childField: "specifications" },
			{ name: "specifications", parentField: "subCategories", childField: "products" },
			{ name: "products", parentField: "specifications" }
		];

		// 層級關係快速查詢表
		this.hierarchyMap = this.hierarchy.reduce((map, level) => {
			map[level.name] = level;
			return map;
		}, {});

		// 綁定方法
		this.getFullHierarchy = this.getFullHierarchy.bind(this);
		this.getChildrenByParentId = this.getChildrenByParentId.bind(this);
		this.getParentHierarchy = this.getParentHierarchy.bind(this);
	}

	/**
	 * 獲取控制器 - 惰性加載
	 * @param {String} controllerName - 控制器名稱
	 * @returns {Object} 控制器實例
	 */
	async getController(controllerName) {
		// 如果已經緩存，直接返回
		if (this._controllersCache[controllerName]) {
			return this._controllersCache[controllerName];
		}

		// 動態導入控制器
		try {
			const controller = (await import(`./models/${controllerName}.js`)).default;
			this._controllersCache[controllerName] = controller;
			return controller;
		} catch (error) {
			console.error(`載入控制器 ${controllerName} 失敗:`, error);
			throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `無法載入控制器: ${controllerName}`);
		}
	}

	/**
	 * 處理錯誤
	 * @private
	 * @param {Error} error - 錯誤對象
	 * @param {String} operation - 操作類型
	 * @param {Function} next - 下一個中間件
	 */
	_handleError(error, operation, next) {
		console.error(`${operation}階層資料錯誤:`, error);
		next(error);
	}

	/**
	 * 檢查層級類型是否有效
	 * @private
	 * @param {String} type - 層級類型
	 * @throws {ApiError} 無效類型錯誤
	 */
	_validateEntityType(type) {
		if (!this.hierarchyMap[type]) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `無效的實體類型: ${type}`);
		}
	}

	/**
	 * 獲取完整的數據層次結構
	 * @param {Object} req - 請求對象
	 * @param {Object} res - 響應對象
	 * @param {Function} next - 下一個中間件
	 */
	async getFullHierarchy(req, res, next) {
		try {
			const { lang } = req.query;
			const maxDepth = parseInt(req.query.maxDepth) || 5; // 限制深度，防止過大的響應負載

			// 獲取所有系列（最頂層）
			const seriesController = await this.getController("series");
			const seriesResult = await seriesController.entityService.search({ isActive: true }, { language: lang, sort: { createdAt: 1 } });

			const hierarchyData = [];

			// 對每個系列，獲取完整的層次結構
			for (const series of seriesResult.data) {
				const seriesWithChildren = await this._buildHierarchyTree("series", series._id, { language: lang, maxDepth });
				hierarchyData.push(seriesWithChildren);
			}

			return successResponse(res, StatusCodes.OK, "獲取完整階層資料成功", {
				result: { hierarchy: hierarchyData }
			});
		} catch (error) {
			this._handleError(error, "獲取", next);
		}
	}

	/**
	 * 根據父項ID獲取子項
	 * @param {Object} req - 請求對象
	 * @param {Object} res - 響應對象
	 * @param {Function} next - 下一個中間件
	 */
	async getChildrenByParentId(req, res, next) {
		try {
			const { parentType, parentId } = req.params;
			const { lang } = req.query;

			// 檢查父層級類型有效性
			this._validateEntityType(parentType);

			// 獲取子層類型
			const childType = this.hierarchyMap[parentType]?.childField;

			// 檢查是否有子層
			if (!childType) {
				throw new ApiError(StatusCodes.BAD_REQUEST, `該層級沒有子層或不支援該操作`);
			}

			// 獲取子層控制器
			const childController = await this.getController(childType);

			// 獲取子項
			const childItems = await childController.entityService.search(
				{
					[childController.entityService.parentField]: parentId,
					isActive: true
				},
				{ language: lang, sort: { createdAt: 1 } }
			);

			return successResponse(res, StatusCodes.OK, `獲取${childController.entityName}列表成功`, {
				result: {
					[childController.responseKey]: childItems.data,
					parent: {
						type: parentType,
						id: parentId
					}
				}
			});
		} catch (error) {
			this._handleError(error, "獲取子項", next);
		}
	}

	/**
	 * 獲取某項的所有上層階層
	 * @param {Object} req - 請求對象
	 * @param {Object} res - 響應對象
	 * @param {Function} next - 下一個中間件
	 */
	async getParentHierarchy(req, res, next) {
		try {
			const { itemType, itemId } = req.params;
			const { lang } = req.query;

			// 檢查項目類型有效性
			this._validateEntityType(itemType);

			// 尋找項目本身
			const controller = await this.getController(itemType);
			const item = await controller.entityService.ensureExists(itemId);

			// 準備返回的層次結構
			const hierarchy = [];

			// 添加當前項目
			hierarchy.push({
				type: itemType,
				item: controller.entityService.formatOutput(item, { language: lang })
			});

			// 尋找所有父層
			let currentType = itemType;
			let currentItem = item;

			while (true) {
				// 獲取父層類型
				const parentType = this.hierarchyMap[currentType]?.parentField;

				// 如果沒有父層，退出循環
				if (!parentType) {
					break;
				}

				// 獲取父層控制器
				const parentController = await this.getController(parentType);

				// 獲取父層ID
				const parentId = currentItem[this.hierarchyMap[currentType].parentField];

				if (!parentId) {
					break;
				}

				// 獲取父層項目
				try {
					const parentItem = await parentController.entityService.ensureExists(parentId);

					// 添加到層次結構
					hierarchy.unshift({
						type: parentType,
						item: parentController.entityService.formatOutput(parentItem, { language: lang })
					});

					// 更新當前項目和類型，繼續尋找上一層
					currentType = parentType;
					currentItem = parentItem;
				} catch (error) {
					console.error(`找不到父層 ${parentType} (ID: ${parentId}):`, error);
					break;
				}
			}

			return successResponse(res, StatusCodes.OK, "獲取階層資料成功", {
				result: { hierarchy }
			});
		} catch (error) {
			this._handleError(error, "獲取父層", next);
		}
	}

	/**
	 * 遞迴建立層次結構樹
	 * @private
	 * @param {String} type - 當前層級類型
	 * @param {String} id - 當前項目ID
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} 層次結構樹
	 */
	async _buildHierarchyTree(type, id, options = {}) {
		// 處理遞迴深度限制
		const currentDepth = options.currentDepth || 0;
		const maxDepth = options.maxDepth || 5;

		if (currentDepth > maxDepth) {
			return { _id: id, type, note: "達到最大深度限制" };
		}

		try {
			// 獲取控制器
			const controller = await this.getController(type);

			// 獲取當前項目
			const item = await controller.entityService.ensureExists(id);
			const formattedItem = controller.entityService.formatOutput(item, options);

			// 獲取子層類型
			const childType = this.hierarchyMap[type]?.childField;

			// 如果沒有子層類型，直接返回
			if (!childType) {
				return formattedItem;
			}

			// 獲取子層控制器
			const childController = await this.getController(childType);

			// 獲取子項
			const children = await childController.entityService.search(
				{
					[childController.entityService.parentField]: id,
					isActive: true
				},
				{ language: options.language, sort: { createdAt: 1 } }
			);

			// 遞迴處理每個子項
			const childrenWithSubtree = [];

			for (const child of children.data) {
				const childWithSubtree = await this._buildHierarchyTree(childType, child._id, { ...options, currentDepth: currentDepth + 1 });
				childrenWithSubtree.push(childWithSubtree);
			}

			// 添加子項到當前項目
			return {
				...formattedItem,
				[childType]: childrenWithSubtree
			};
		} catch (error) {
			console.error(`構建層次結構錯誤 (${type}, ${id}):`, error);
			// 返回當前已有的資訊
			return { _id: id, type };
		}
	}
}

// 匯出單例實例
export default new HierarchyManager();
