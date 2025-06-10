import Products from "../../models/products.js";
import Series from "../../models/series.js";
import Categories from "../../models/categories.js";
import SubCategories from "../../models/subCategories.js";
import Specifications from "../../models/specifications.js";
import fileUpload from "../../utils/fileUpload.js";
import { ApiError } from "../../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import { performSearch } from "../../utils/searchHelper.js";
import { transformProductImagePaths } from "../../utils/urlTransformer.js";

/**
 * 產品控制器 - 專注於產品數據管理和檔案處理
 */
class ProductsController {
	constructor() {
		// 為了與 HierarchyManager 兼容而添加的屬性
		this.entityName = "products";
		this.responseKey = "productsList";
		this.parentField = "specifications";

		// 添加兼容層 - 模擬 EntityService 的介面
		this.entityService = {
			parentField: "specifications",

			// 與 EntityService.ensureExists 相容的方法
			ensureExists: async (id, options = {}) => {
				try {
					// 移除isActive強制過濾
					const query = { _id: id };

					// 仍然保留如果選項中有isActive的情況
					if (options.isActive !== undefined) {
						query.isActive = options.isActive;
					}

					const entity = await Products.findOne(query);
					if (!entity) {
						throw new ApiError(StatusCodes.NOT_FOUND, `找不到該產品`);
					}

					return entity;
				} catch (error) {
					if (error instanceof ApiError) throw error;
					throw new ApiError(StatusCodes.BAD_REQUEST, `查詢產品時發生錯誤: ${error.message}`);
				}
			},

			// 與 EntityService.search 相容的方法
			search: async (query = {}, options = {}) => {
				try {
					const { language, sort, ...restOptions } = options;

					// 構建查詢條件
					const searchQuery = { ...query };

					// 排序設定
					const sortOption = {};
					if (sort) {
						if (typeof sort === "object") {
							Object.assign(sortOption, sort);
						} else {
							sortOption[sort] = 1; // 默認升序
						}
					} else {
						sortOption.createdAt = 1;
					}

					// 執行查詢
					let products = await Products.find(searchQuery).sort(sortOption);

					// 處理特殊的 populate 選項
					if (options.populate) {
						products = await Products.populate(products, options.populate);
					}

					return {
						data: products,
						total: products.length
					};
				} catch (error) {
					console.error("產品搜索錯誤:", error);
					throw new ApiError(StatusCodes.BAD_REQUEST, `搜索產品失敗: ${error.message}`);
				}
			},

			// 格式化輸出
			formatOutput: (item, options = {}) => {
				if (!item) return null;

				// 轉換為普通物件
				const obj = item.toObject ? item.toObject() : item;

				// 如果有語言參數，可以進行額外處理
				// 暫時不實現這部分，因為產品的多語言處理已經在模型內部處理

				return obj;
			}
		};

		// 綁定所有方法到當前實例，確保 'this' 上下文正確
		this.getProducts = this.getProducts.bind(this);
		this.searchProducts = this.searchProducts.bind(this);
		this.getProductById = this.getProductById.bind(this);
		this.createProduct = this.createProduct.bind(this);
		this.updateProduct = this.updateProduct.bind(this);
		this.deleteProduct = this.deleteProduct.bind(this);
		this.batchProcess = this.batchProcess.bind(this);
		this._processFormData = this._processFormData.bind(this);
		this._processMultilingualFormData = this._processMultilingualFormData.bind(this);
		this._parseJsonFields = this._parseJsonFields.bind(this);
		this._processFileUploads = this._processFileUploads.bind(this);
		this._getProductHierarchy = this._getProductHierarchy.bind(this);
		this._prepareProductData = this._prepareProductData.bind(this);
	}

	/**
	 * 獲取產品列表
	 */
	async getProducts(req, res) {
		try {
			const { specifications, hasImages, hasDocuments, featuresCount, page = 1, limit = 20, sort = "createdAt", sortDirection = "asc" } = req.query;

			// 構建查詢條件 - 移除isActive過濾
			const query = {};

			// 父層關聯過濾
			if (specifications) {
				query.specifications = specifications;
			}

			// 自定義過濾器
			if (hasImages === "true") {
				query.images = { $exists: true, $ne: [] };
			}

			if (hasDocuments === "true") {
				query.documents = { $exists: true, $ne: [] };
			}

			if (featuresCount) {
				query.features = { $size: parseInt(featuresCount) };
			}

			// 計算分頁
			const skip = (parseInt(page) - 1) * parseInt(limit);
			const sortOrder = sortDirection === "desc" ? -1 : 1;

			// 執行查詢
			const total = await Products.countDocuments(query);
			const products = await Products.find(query)
				.sort({ [sort]: sortOrder })
				.skip(skip)
				.limit(parseInt(limit));

			// 應用轉換
			const baseUrl = process.env.PUBLIC_BASE_URL;
			const transformedProducts = products.map((p) => transformProductImagePaths(p.toObject(), baseUrl));

			// 回傳結果
			return res.status(StatusCodes.OK).json({
				success: true,
				message: "獲取產品列表成功",
				result: {
					productsList: transformedProducts,
					pagination: {
						page: parseInt(page),
						limit: parseInt(limit),
						total,
						pages: Math.ceil(total / parseInt(limit))
					}
				}
			});
		} catch (error) {
			console.error("獲取產品列表失敗:", error);
			return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `獲取產品列表失敗: ${error.message}`
			});
		}
	}

	/**
	 * 搜索產品
	 */
	async searchProducts(req, res) {
		try {
			const { keyword, specifications, page = 1, limit = 20, sort = "createdAt", sortDirection = "asc" } = req.query;

			// 構建附加條件 - 移除isActive過濾
			const additionalConditions = {};

			if (specifications) {
				additionalConditions.specifications = specifications;
			}

			// 使用 searchHelper 進行搜索
			const searchResults = await performSearch({
				model: Products,
				keyword,
				additionalConditions,
				searchFields: ["code", "name.TW", "name.EN", "description.TW", "description.EN"],
				sort,
				sortDirection,
				limit: parseInt(limit),
				populate: "specifications"
			});

			// 計算分頁
			const { items, total } = searchResults;
			const skip = (parseInt(page) - 1) * parseInt(limit);
			const paginatedItems = items.slice(skip, skip + parseInt(limit));

			// 應用轉換
			const baseUrl = process.env.PUBLIC_BASE_URL;
			const transformedItems = paginatedItems.map((item) => transformProductImagePaths(item.toObject(), baseUrl));

			// 回傳結果
			return res.status(StatusCodes.OK).json({
				success: true,
				message: "搜索產品成功",
				result: {
					productsList: transformedItems,
					pagination: {
						page: parseInt(page),
						limit: parseInt(limit),
						total,
						pages: Math.ceil(total / parseInt(limit))
					}
				}
			});
		} catch (error) {
			console.error("搜索產品失敗:", error);
			return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `搜索產品失敗: ${error.message}`
			});
		}
	}

	/**
	 * 獲取單個產品
	 */
	async getProductById(req, res) {
		try {
			const { id } = req.params;
			// This method does not check for isActive, so it can be used by admin to fetch any product.
			const product = await Products.findById(id);

			if (!product) {
				throw new ApiError(StatusCodes.NOT_FOUND, "找不到該產品");
			}

			// 應用轉換
			const baseUrl = process.env.PUBLIC_BASE_URL;
			const transformedProduct = transformProductImagePaths(product.toObject(), baseUrl);

			return res.status(StatusCodes.OK).json({
				success: true,
				message: "獲取產品成功",
				result: { products: transformedProduct }
			});
		} catch (error) {
			console.error("獲取產品失敗:", error);
			return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `獲取產品失敗: ${error.message}`
			});
		}
	}

	/**
	 * 創建產品
	 */
	async createProduct(req, res) {
		try {
			// 1. 處理請求數據
			const productData = this._processFormData(req);

			// 2. 驗證必要參數
			if (!productData.specifications || !productData.code) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "缺少必要參數: specifications 和 code");
			}

			// 3. 處理檔案上傳
			if (req.files && Object.keys(req.files).length > 0) {
				const fileResults = await this._processFileUploads(req, productData);

				if (fileResults.images.length > 0) {
					productData.images = fileResults.images;
				}

				if (fileResults.documents.length > 0) {
					productData.documents = fileResults.documents;
				}

				if (fileResults.videos.length > 0) {
					productData.videos = fileResults.videos;
				}
			}

			// 4. 創建產品
			const newProduct = await Products.create(productData);

			return res.status(StatusCodes.CREATED).json({
				success: true,
				message: "產品創建成功",
				result: { products: newProduct }
			});
		} catch (error) {
			console.error("創建產品失敗:", error);
			return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `創建產品失敗: ${error.message}`
			});
		}
	}

	/**
	 * 更新產品
	 */
	async updateProduct(req, res) {
		try {
			const { id } = req.params;

			// 1. 檢查產品是否存在
			const existingProduct = await Products.findById(id);
			if (!existingProduct) {
				throw new ApiError(StatusCodes.NOT_FOUND, "找不到該產品");
			}

			// 2. 準備數據，包括文件處理邏輯
			const { processedData, imagePathsToDelete, documentPathsToDelete, videoPathsToDelete, productCodeForContext } = await this._prepareProductData(
				req,
				true,
				existingProduct
			);

			const hierarchyData = await this._getProductHierarchy(processedData.specifications || existingProduct.specifications.toString());
			const productCode = productCodeForContext;

			const pendingImages = processedData._pendingImages || [];
			const pendingDocuments = processedData._pendingDocuments || [];
			const pendingVideos = processedData._pendingVideos || [];

			// Remove temporary/internal fields before forming update payload
			delete processedData._pendingImages;
			delete processedData._pendingDocuments;
			delete processedData._pendingVideos;

			const updatePayload = { ...processedData }; // Start with text field updates

			// 3. 處理新檔案上傳並合併 URL
			const newImageUrls = [];
			for (const file of pendingImages) {
				try {
					const newUrl = fileUpload.saveProductFile(file.buffer, {
						hierarchyData,
						productCode,
						fileName: file.originalname,
						fileType: "images"
					});
					newImageUrls.push(newUrl);
				} catch (uploadError) {
					console.error(`產品圖片上傳失敗: ${file.originalname}`, uploadError);
					// Decide error handling: throw, or push a marker/null
				}
			}
			updatePayload.images = (updatePayload.images || []).filter((url) => !url.startsWith("__PENDING_PRODUCT_FILE_PLACEHOLDER_")).concat(newImageUrls);

			const newDocumentUrls = [];
			for (const file of pendingDocuments) {
				try {
					const newUrl = fileUpload.saveProductFile(file.buffer, {
						hierarchyData,
						productCode,
						fileName: file.originalname,
						fileType: "documents"
					});
					newDocumentUrls.push(newUrl);
				} catch (uploadError) {
					console.error(`產品文件上傳失敗: ${file.originalname}`, uploadError);
				}
			}
			updatePayload.documents = (updatePayload.documents || []).filter((url) => !url.startsWith("__PENDING_PRODUCT_FILE_PLACEHOLDER_")).concat(newDocumentUrls);

			const newVideoUrls = [];
			for (const file of pendingVideos) {
				try {
					const newUrl = fileUpload.saveProductFile(file.buffer, {
						hierarchyData,
						productCode,
						fileName: file.originalname,
						fileType: "videos"
					});
					newVideoUrls.push(newUrl);
				} catch (uploadError) {
					console.error(`產品影片上傳失敗: ${file.originalname}`, uploadError);
				}
			}
			updatePayload.videos = (updatePayload.videos || []).filter((url) => !url.startsWith("__PENDING_PRODUCT_FILE_PLACEHOLDER_")).concat(newVideoUrls);

			// 4. 更新產品: Apply updates to the existing item
			Object.keys(updatePayload).forEach((key) => {
				// Allow setting null or empty arrays explicitly if provided in payload
				if (updatePayload[key] !== undefined) {
					existingProduct[key] = updatePayload[key];
				}
			});
			const updatedProductDb = await existingProduct.save();

			// 5. 刪除舊檔案
			[...imagePathsToDelete, ...documentPathsToDelete, ...videoPathsToDelete].forEach((filePath) => {
				try {
					if (filePath && filePath.startsWith("/storage")) {
						fileUpload.deleteFileByWebPath(filePath);
						console.log("已刪除舊產品檔案:", filePath);
					}
				} catch (deleteError) {
					console.error("刪除舊產品檔案失敗:", filePath, deleteError);
				}
			});

			return res.status(StatusCodes.OK).json({
				success: true,
				message: "產品更新成功",
				result: { products: updatedProductDb } // Return the saved product
			});
		} catch (error) {
			console.error("更新產品失敗:", error);
			return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `更新產品失敗: ${error.message}`
			});
		}
	}

	/**
	 * 刪除產品
	 */
	async deleteProduct(req, res) {
		try {
			const { id } = req.params;

			// 檢查產品是否存在
			const product = await Products.findById(id);
			if (!product) {
				throw new ApiError(StatusCodes.NOT_FOUND, "找不到該產品");
			}

			// 刪除圖片檔案
			if (product.images && product.images.length > 0) {
				for (const imagePath of product.images) {
					const deleted = fileUpload.deleteFileByWebPath(imagePath);
					console.log(`刪除圖片 ${imagePath}: ${deleted ? "成功" : "失敗"}`);
				}
			}

			// 刪除文檔檔案
			if (product.documents && product.documents.length > 0) {
				for (const docPath of product.documents) {
					const deleted = fileUpload.deleteFileByWebPath(docPath);
					console.log(`刪除文檔 ${docPath}: ${deleted ? "成功" : "失敗"}`);
				}
			}

			// 刪除影片檔案
			if (product.videos && product.videos.length > 0) {
				for (const videoPath of product.videos) {
					const deleted = fileUpload.deleteFileByWebPath(videoPath);
					console.log(`刪除影片 ${videoPath}: ${deleted ? "成功" : "失敗"}`);
				}
			}

			try {
				// 獲取產品層級結構
				const hierarchyData = await this._getProductHierarchy(product.specifications);

				// 刪除產品目錄
				const deleteResult = fileUpload.deleteProductDirectories(hierarchyData, product.code);

				if (deleteResult.success) {
					console.log(`成功刪除產品 '${product.code}' 的主目錄: ${deleteResult.physicalPath}`);
				} else {
					console.log(`刪除產品 '${product.code}' 的主目錄失敗: ${deleteResult.message || "未知原因"}`);
					// 可以在這裡記錄更詳細的錯誤信息，例如 deleteResult.path
					console.log(`(目標路徑: ${deleteResult.physicalPath})`);
				}
			} catch (dirError) {
				// 目錄刪除失敗不應該阻止產品刪除，因此僅記錄錯誤
				console.error(`刪除產品目錄時出錯:`, dirError);
			}

			// 執行真正的刪除（而非軟刪除）
			await Products.findByIdAndDelete(id);

			return res.status(StatusCodes.OK).json({
				success: true,
				message: "產品已成功刪除",
				result: { products: true }
			});
		} catch (error) {
			console.error("刪除產品失敗:", error);
			return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `刪除產品失敗: ${error.message}`
			});
		}
	}

	/**
	 * 批量處理產品
	 */
	async batchProcess(req, res) {
		try {
			const { toCreate = [], toUpdate = [] } = req.body;
			const results = {
				created: [],
				updated: [],
				errors: []
			};

			// 處理批量創建
			for (const item of toCreate) {
				try {
					// 進行基本驗證
					if (!item.code || !item.specifications || !item.name) {
						results.errors.push({
							operation: "create",
							data: item,
							error: "缺少必要欄位: code, specifications, name"
						});
						continue;
					}

					const newProduct = await Products.create(item);
					results.created.push(newProduct);
				} catch (error) {
					results.errors.push({
						operation: "create",
						data: item,
						error: error.message
					});
				}
			}

			// 處理批量更新
			for (const item of toUpdate) {
				try {
					if (!item._id) {
						results.errors.push({
							operation: "update",
							data: item,
							error: "缺少 ID 欄位"
						});
						continue;
					}

					const updatedProduct = await Products.findByIdAndUpdate(item._id, { ...item }, { new: true, runValidators: true });

					if (!updatedProduct) {
						results.errors.push({
							operation: "update",
							data: item,
							error: "找不到要更新的產品"
						});
						continue;
					}

					results.updated.push(updatedProduct);
				} catch (error) {
					results.errors.push({
						operation: "update",
						data: item,
						error: error.message
					});
				}
			}

			return res.status(StatusCodes.OK).json({
				success: true,
				message: "批量處理產品完成",
				result: results
			});
		} catch (error) {
			console.error("批量處理產品失敗:", error);
			return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `批量處理產品失敗: ${error.message}`
			});
		}
	}

	/**
	 * 處理 FormData 請求數據
	 * @private
	 */
	_processFormData(req) {
		// 1. 從 FormData 獲取所有字段
		let productData = { ...req.body };

		// 2. 處理查詢參數
		if (req.query.specifications) {
			productData.specifications = req.query.specifications;
		}

		if (req.query.code) {
			productData.code = req.query.code;
		}

		// 3. 處理多語言欄位
		this._processMultilingualFormData(productData);

		// 4. 解析 JSON 字符串
		this._parseJsonFields(productData);

		// 5. 處理 features 欄位
		if (productData.features) {
			if (typeof productData.features === "string") {
				try {
					productData.features = JSON.parse(productData.features);
				} catch (e) {
					productData.features = [];
				}
			}

			if (Array.isArray(productData.features)) {
				productData.features = productData.features.filter((feature) => feature && (feature.TW || feature.EN) && feature.featureId);
			}
		}

		return productData;
	}

	/**
	 * 處理多語言表單數據
	 * @private
	 */
	_processMultilingualFormData(data) {
		// 處理如 name[TW]、name[EN] 格式的欄位
		const multilingualPattern = /^(\w+)\[(\w+)\]$/;

		for (const key in data) {
			const matches = key.match(multilingualPattern);

			// 檢查 data[key] 是否為 undefined 或 null，若是則跳過
			if (data[key] === undefined || data[key] === null) {
				continue;
			}

			if (matches) {
				const [, field, lang] = matches;

				// 初始化欄位
				if (!data[field] || typeof data[field] !== "object") {
					data[field] = {};
				}

				// 設置語言值
				data[field][lang] = data[key];

				// 刪除原始欄位
				delete data[key];
			}
		}
	}

	/**
	 * 解析 JSON 字符串欄位
	 * @private
	 */
	_parseJsonFields(data) {
		for (const key in data) {
			if (typeof data[key] === "string" && (data[key].startsWith("{") || data[key].startsWith("["))) {
				try {
					data[key] = JSON.parse(data[key]);
				} catch (e) {
					// 保持原值
				}
			}
		}
	}

	/**
	 * 處理檔案上傳
	 * @private
	 */
	async _processFileUploads(req, productData) {
		const result = {
			images: [],
			documents: [],
			videos: []
		};

		// 檢查是否有上傳檔案
		if (!req.files) {
			return result;
		}

		const { specifications, code } = productData;

		if (!specifications || !code) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少必要參數: specifications 和 code");
		}

		// 獲取產品層級結構
		const hierarchyData = await this._getProductHierarchy(specifications);

		// 處理圖片
		if (req.files.images && req.files.images.length > 0) {
			for (const file of req.files.images) {
				try {
					const virtualPath = fileUpload.saveProductFile(file.buffer, {
						hierarchyData,
						productCode: code,
						fileName: file.originalname,
						fileType: "images"
					});

					result.images.push(virtualPath);
				} catch (err) {
					console.error(`處理圖片 ${file.originalname} 失敗:`, err);
				}
			}
		}

		// 處理文檔
		if (req.files.documents && req.files.documents.length > 0) {
			for (const file of req.files.documents) {
				try {
					const virtualPath = fileUpload.saveProductFile(file.buffer, {
						hierarchyData,
						productCode: code,
						fileName: file.originalname,
						fileType: "documents"
					});

					result.documents.push(virtualPath);
				} catch (err) {
					console.error(`處理文檔 ${file.originalname} 失敗:`, err);
				}
			}
		}

		// 處理影片
		if (req.files.videos && req.files.videos.length > 0) {
			for (const file of req.files.videos) {
				try {
					const virtualPath = fileUpload.saveProductFile(file.buffer, {
						hierarchyData,
						productCode: code,
						fileName: file.originalname,
						fileType: "videos"
					});
					result.videos.push(virtualPath);
				} catch (err) {
					console.error(`處理影片 ${file.originalname} 失敗:`, err);
				}
			}
		}

		return result;
	}

	/**
	 * 獲取產品層級結構
	 * @private
	 */
	async _getProductHierarchy(specificationsId) {
		try {
			// 查詢規格信息
			const specification = await Specifications.findById(specificationsId);
			if (!specification) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到規格 ID: ${specificationsId}`);
			}

			// 查詢子分類信息
			const subCategory = await SubCategories.findById(specification.subCategories);
			if (!subCategory) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到子分類: ${specification.subCategories}`);
			}

			// 查詢分類信息
			const category = await Categories.findById(subCategory.categories);
			if (!category) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到分類: ${subCategory.categories}`);
			}

			// 查詢系列信息
			const series = await Series.findById(category.series);
			if (!series) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到系列: ${category.series}`);
			}

			// 返回完整層級結構
			return {
				series,
				category,
				subCategory,
				specification
			};
		} catch (error) {
			console.error(`獲取產品層級結構失敗 (ID: ${specificationsId}):`, error);
			throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `無法取得產品層級結構: ${error.message}`);
		}
	}

	async _prepareProductData(req, isUpdate = false, existingProduct = null) {
		let rawData;
		if (req.is("multipart/form-data") && req.body.productDataPayload) {
			try {
				rawData = JSON.parse(req.body.productDataPayload);
			} catch (e) {
				console.error("解析 productDataPayload 失敗:", req.body.productDataPayload, e);
				throw new ApiError(StatusCodes.BAD_REQUEST, "無法解析 productDataPayload JSON 字串");
			}
		} else {
			// Fallback or error if productDataPayload is expected but not found
			// For now, let's assume it might still come directly from req.body for some reason
			console.warn("productDataPayload 未找到，嘗試從 req.body 直接讀取欄位。建議前端始終發送 productDataPayload。");
			rawData = { ...req.body };
		}

		const data = { ...rawData }; // data 將是純淨的JS對象
		const files = req.files || {};

		// For file uploads and deletions
		data._pendingImages = files.images || [];
		data._pendingDocuments = files.documents || [];
		data._pendingVideos = files.videos || [];

		let imagePathsToDelete = [];
		let documentPathsToDelete = [];
		let videoPathsToDelete = [];

		if (isUpdate && data._id) {
			delete data._id; // Don't allow updating _id
		}

		// For context in file path generation if needed, or for other logic
		let productCodeForContext = "untitled_product";
		if (data.code) {
			productCodeForContext = data.code;
		} else if (isUpdate && existingProduct?.code) {
			productCodeForContext = existingProduct.code;
		}

		// Basic Validations (can be expanded)
		if (!data.specifications && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "規格為必填");
		if (!data.code && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "產品代碼為必填");
		if (!data.name?.TW && !data.name?.EN && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "產品名稱 (至少一種語言) 為必填");

		// Handle features - ensure it's an array of objects
		if (data.features && typeof data.features === "string") {
			try {
				data.features = JSON.parse(data.features);
			} catch (e) {
				console.warn("無法解析產品特點 JSON 字串，將其視為空陣列:", data.features);
				data.features = [];
			}
		}
		if (!Array.isArray(data.features)) {
			data.features = [];
		}
		data.features = data.features.filter((f) => f && (f.TW || f.EN) && f.featureId);
		this._processMultilingualFormData(data);
		this._parseJsonFields(data);

		const imageMarkerPrefix = "__PRODUCT_IMAGE_MARKER_"; // Example, align with frontend if used
		const documentMarkerPrefix = "__PRODUCT_DOCUMENT_MARKER_";
		const videoMarkerPrefix = "__PRODUCT_VIDEO_MARKER_";

		// Manage file arrays
		if (isUpdate) {
			// Only manage existing files if updating
			data.images = this._manageProductFileArray(
				data.images, // client-sent array from payload
				existingProduct?.images,
				data._pendingImages,
				imagePathsToDelete,
				imageMarkerPrefix
			);
			data.documents = this._manageProductFileArray(
				data.documents, // client-sent array from payload
				existingProduct?.documents,
				data._pendingDocuments,
				documentPathsToDelete,
				documentMarkerPrefix
			);
			data.videos = this._manageProductFileArray(
				data.videos, // client-sent array from payload
				existingProduct?.videos,
				data._pendingVideos,
				videoPathsToDelete,
				videoMarkerPrefix
			);
		} else {
			// For create, initialize as empty arrays, will be populated after upload
			data.images = [];
			data.documents = [];
			data.videos = [];
		}

		return {
			processedData: data,
			imagePathsToDelete,
			documentPathsToDelete,
			videoPathsToDelete,
			productCodeForContext
		};
	}

	_manageProductFileArray(clientUrls, existingUrls, pendingFiles, pathsToDelete, clientMarkerPrefix) {
		const validClientKeptUrls = [];
		if (Array.isArray(clientUrls)) {
			clientUrls.forEach((url) => {
				if (typeof url !== "string") return;

				let relativeUrl = url;
				// 如果是完整的 URL，嘗試轉換為相對路徑
				if (url.startsWith("http")) {
					try {
						const urlObject = new URL(url);
						relativeUrl = urlObject.pathname;
					} catch (e) {
						console.warn(`無法解析收到的 URL: ${url}`);
						// 如果解析失敗，則不視為有效路徑
						return;
					}
				}

				// 確保路徑是我們期望的 /storage/ 格式
				if (relativeUrl.startsWith("/storage/")) {
					validClientKeptUrls.push(relativeUrl);
				}
			});
		}

		const finalUrls = [...validClientKeptUrls]; // 從客戶端希望保留的有效 /storage/ URL 開始

		// 識別需要刪除的檔案：資料庫中存在的 /storage/ URL，但客戶端不再希望保留它們
		if (Array.isArray(existingUrls)) {
			existingUrls.forEach((oldUrl) => {
				if (typeof oldUrl === "string" && oldUrl.startsWith("/storage/") && !validClientKeptUrls.includes(oldUrl)) {
					pathsToDelete.push(oldUrl);
				} else if (
					typeof oldUrl === "string" &&
					!oldUrl.startsWith("/storage/") &&
					!oldUrl.startsWith(clientMarkerPrefix) &&
					!validClientKeptUrls.includes(oldUrl)
				) {
					pathsToDelete.push(oldUrl);
				}
			});
		}

		pendingFiles.forEach((_, index) => {
			finalUrls.push(`__PENDING_PRODUCT_FILE_PLACEHOLDER_${index}__`);
		});
		return finalUrls;
	}
}

// 匯出單例實例
export default new ProductsController();
