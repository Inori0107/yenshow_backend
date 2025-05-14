import fs from "fs";
import path from "path";
import multer from "multer";
import { ApiError } from "./responseHandler.js";
import os from "os";

const MAX_TOTAL_NEWS_IMAGES = 20; // 新聞總圖片數上限 (封面+內容)
const MAX_NEWS_CONTENT_IMAGES = MAX_TOTAL_NEWS_IMAGES - 1; // 內容圖片上限

/**
 * 檔案上傳工具類
 * 提供檔案上傳處理、儲存和驗證功能
 */
class FileUpload {
	constructor() {
		// 檢測操作系統類型
		this.isWindows = os.platform() === "win32";

		// 根據操作系統設置默認的檔案根目錄
		let defaultRoot = "/app/storage";
		if (this.isWindows) {
			// Windows 環境下使用 D:\storage 作為默認儲存位置
			defaultRoot = "D:\\storage";
		}

		// 設置檔案儲存根目錄，優先使用環境變數
		this.FILES_ROOT = process.env.FILES_ROOT || defaultRoot;

		console.log(`檔案儲存根目錄: ${this.FILES_ROOT}`);

		// 確保檔案儲存目錄存在
		this.ensureRootDirectoryExists();

		this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

		// 設定存儲策略
		this.storage = multer.memoryStorage();

		// 檔案過濾器
		this.fileFilter = (req, file, cb) => {
			// Specific handling for news uploads
			if (file.fieldname === "coverImage" || file.fieldname === "contentImages") {
				if (!file.mimetype.startsWith("image/")) {
					return cb(new ApiError(400, "新聞相關圖片只允許上傳圖片檔案"), false);
				}
			}
			// Specific handling for FAQ image uploads
			else if (file.fieldname === "faqImages") {
				if (!file.mimetype.startsWith("image/")) {
					return cb(new ApiError(400, "FAQ 圖片只允許上傳圖片檔案"), false);
				}
			}
			// Specific handling for FAQ video upload (NEW)
			else if (file.fieldname === "faqVideoFile") {
				if (!file.mimetype.startsWith("video/")) {
					return cb(new ApiError(400, "FAQ 影片只允許上傳影片檔案"), false);
				}
			}
			// Specific handling for News content video uploads (NEW)
			else if (file.fieldname === "contentVideoFiles") {
				if (!file.mimetype.startsWith("video/")) {
					return cb(new ApiError(400, "新聞內容影片只允許上傳影片檔案"), false);
				}
			}
			// Handling for product uploads
			else if (file.fieldname === "images" || file.fieldname === "documents" || file.fieldname === "videos") {
				if (file.fieldname === "images" && !file.mimetype.startsWith("image/")) {
					return cb(new ApiError(400, "產品示圖只允許上傳圖片檔案"), false);
				}
				if (file.fieldname === "documents" && file.mimetype !== "application/pdf") {
					return cb(new ApiError(400, "產品文檔僅允許 PDF 格式"), false);
				}
				if (file.fieldname === "videos" && !file.mimetype.startsWith("video/")) {
					// Ensure product videos are checked
					return cb(new ApiError(400, "產品影片只允許上傳影片檔案"), false);
				}
			}
			// Generic file type check for other potential uploads
			else {
				// Check if it's an image or video for generic types as well
				if (!this.isAllowedMimeType(file.mimetype) && !file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
					return cb(new ApiError(400, "不支援的檔案類型"), false);
				}
			}

			cb(null, true);
		};

		// 基本 multer 配置
		this.upload = multer({
			storage: this.storage,
			fileFilter: this.fileFilter,
			limits: {
				fileSize: this.MAX_FILE_SIZE
			}
		});
	}

	/**
	 * 確保根目錄存在
	 */
	ensureRootDirectoryExists() {
		try {
			if (!fs.existsSync(this.FILES_ROOT)) {
				fs.mkdirSync(this.FILES_ROOT, { recursive: true });
				console.log(`已創建檔案儲存根目錄: ${this.FILES_ROOT}`);
			}
		} catch (error) {
			console.error(`無法創建檔案儲存根目錄: ${error.message}`);
		}
	}

	/**
	 * 確保指定目錄存在
	 * @param {String} directoryPath - 目錄的絕對路徑
	 */
	ensureDirectory(directoryPath) {
		try {
			if (!fs.existsSync(directoryPath)) {
				fs.mkdirSync(directoryPath, { recursive: true });
				console.log(`已創建目錄: ${directoryPath}`);
			}
		} catch (error) {
			console.error(`無法創建目錄: ${directoryPath}`, error);
			// 可以選擇拋出錯誤或返回失敗狀態
			throw new ApiError(500, `無法創建目錄 ${directoryPath}: ${error.message}`);
		}
	}

	/**
	 * 檢查 MIME 類型是否允許
	 * @param {String} mimeType - MIME 類型
	 * @returns {Boolean} 是否允許
	 */
	isAllowedMimeType(mimeType) {
		const allowedTypes = [
			// 圖片
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			// 文檔
			"application/pdf",
			// 常見辦公文檔
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.ms-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			// 文本
			"text/plain",
			// 影片 (NEW)
			"video/mp4",
			"video/mpeg",
			"video/ogg",
			"video/webm",
			"video/quicktime",
			"video/x-msvideo" // AVI
		];

		return allowedTypes.includes(mimeType);
	}

	/**
	 * 獲取產品檔案上傳中間件
	 * @returns {Function} Multer 中間件
	 */
	getProductUploadMiddleware() {
		return this.upload.fields([
			{ name: "images", maxCount: 10 },
			{ name: "documents", maxCount: 5 },
			{ name: "videos", maxCount: 5 }
		]);
	}

	/**
	 * 獲取單一檔案上傳中間件
	 * @param {String} fieldName - 欄位名稱
	 * @returns {Function} Multer 中間件
	 */
	getSingleFileMiddleware(fieldName) {
		return this.upload.single(fieldName);
	}

	/**
	 * 保存 Buffer 型檔案到指定路徑
	 * @param {Buffer} buffer - 檔案內容
	 * @param {String} targetPath - 目標路徑
	 */
	saveBufferToFile(buffer, targetPath) {
		try {
			// 確保目錄存在
			this.ensureDirectoryExists(targetPath);

			// 寫入檔案
			fs.writeFileSync(targetPath, buffer);
			console.log(`檔案已保存至: ${targetPath}`);
			return true;
		} catch (error) {
			console.error("保存檔案失敗:", error);
			return false;
		}
	}

	/**
	 * 確保目錄存在
	 * @param {String} filePath - 檔案路徑
	 */
	ensureDirectoryExists(filePath) {
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
			console.log(`已創建目錄: ${dir}`);
		}
	}

	/**
	 * 生成唯一檔案名
	 * @param {String} originalName - 原始檔案名
	 * @param {String} prefix - 檔案名前綴
	 * @returns {String} 唯一檔案名
	 */
	generateUniqueFileName(originalName, prefix = "") {
		const timestamp = Date.now().toString().slice(-6);
		const ext = path.extname(originalName);
		const baseNameWithoutExt = path.basename(originalName, ext);
		const cleanBaseName = this.sanitizeFileName(baseNameWithoutExt);
		return `${prefix ? prefix + "_" : ""}${cleanBaseName}_${timestamp}${ext}`;
	}

	/**
	 * 清理檔案名，移除特殊字符
	 * @param {String} fileName - 檔案名
	 * @returns {String} 清理後的檔案名
	 */
	sanitizeFileName(fileName) {
		return fileName
			.replace(/[\\/:*?"<>|]/g, "_") // 替換 Windows 不允許的字符
			.replace(/\s+/g, "_") // 替換空格為下底線
			.replace(/_+/g, "_") // 替換多個連續下底線為一個
			.trim();
	}

	/**
	 * 刪除檔案
	 * @param {String} filePath - 檔案路徑
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteFile(filePath) {
		try {
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
				return true;
			}
			return false;
		} catch (error) {
			console.error("刪除檔案失敗:", error);
			return false;
		}
	}

	/**
	 * 從Web路徑刪除檔案
	 * @param {String} webPath - Web路徑
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteFileByWebPath(webPath) {
		try {
			// 將Web路徑轉換為實體路徑
			const physicalPath = this.webToPhysicalPath(webPath);
			// 執行刪除
			return this.deleteFile(physicalPath);
		} catch (error) {
			console.error(`刪除Web路徑檔案失敗: ${webPath}`, error);
			return false;
		}
	}

	/**
	 * 遞歸刪除目錄及其內容
	 * @param {String} dirPath - 目錄路徑
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteDirectory(dirPath) {
		try {
			// 檢查路徑是否存在且為目錄
			if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
				console.log(`目錄不存在或不是有效目錄: ${dirPath}`);
				return false;
			}

			// 安全檢查 - 確保不會刪除根目錄或系統重要目錄
			if (dirPath === this.FILES_ROOT || !dirPath.startsWith(this.FILES_ROOT) || path.normalize(dirPath) === path.normalize(this.FILES_ROOT)) {
				console.error(`安全限制: 不允許刪除此目錄: ${dirPath}`);
				return false;
			}

			// 讀取目錄內容
			const entries = fs.readdirSync(dirPath, { withFileTypes: true });

			// 遞歸刪除所有檔案和子目錄
			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);
				if (entry.isDirectory()) {
					// 遞歸刪除子目錄
					this.deleteDirectory(fullPath);
				} else {
					// 刪除檔案
					fs.unlinkSync(fullPath);
					console.log(`已刪除檔案: ${fullPath}`);
				}
			}

			// 刪除空目錄
			fs.rmSync(dirPath, { recursive: true, force: true }); // Use fs.rmSync for modern Node.js
			console.log(`已(嘗試)遞歸刪除目錄: ${dirPath}`);
			return true;
		} catch (error) {
			console.error(`刪除目錄失敗: ${dirPath}`, error);
			return false;
		}
	}

	/**
	 * 獲取並刪除產品目錄
	 * @param {Object} hierarchyData - 層級結構資料
	 * @param {String} productCode - 產品代碼
	 * @returns {Object} 包含刪除結果的物件
	 */
	deleteProductDirectories(hierarchyData, productCode) {
		try {
			if (!hierarchyData || !productCode) {
				throw new ApiError(400, "缺少必要參數");
			}

			const { series, category, subCategory, specification } = hierarchyData;

			if (!series || !category || !subCategory || !specification) {
				throw new ApiError(400, "層級結構不完整");
			}

			// 清理和格式化代碼，與產生檔案路徑邏輯保持一致
			const seriesName = this.sanitizeFileName(series.name?.TW || "unknown");
			const categoryName = this.sanitizeFileName(category.name?.TW || "unknown");
			const subCategoryName = this.sanitizeFileName(subCategory.name?.TW || "unknown");
			const specificationName = this.sanitizeFileName(specification.name?.TW || "unknown");

			// 產品根目錄的Web路徑 - **修改點：包含 productCode**
			const productWebPath = `/storage/products/${seriesName}/${categoryName}/${subCategoryName}/${specificationName}/${productCode}`;

			// 轉換為實體路徑
			const productPhysicalPath = this.webToPhysicalPath(productWebPath);

			// 確保目錄存在
			if (!fs.existsSync(productPhysicalPath) || !fs.statSync(productPhysicalPath).isDirectory()) {
				console.log(`產品目錄不存在: ${productPhysicalPath}`);
				return {
					success: true, // 目錄不存在，視為成功（無需刪除）
					message: "產品目錄不存在，無需刪除"
				};
			}

			// **修改點：直接嘗試刪除產品主目錄及其所有內容**
			const deleteSuccess = this.deleteDirectory(productPhysicalPath);
			console.log(`刪除產品主目錄 ${productPhysicalPath}: ${deleteSuccess ? "成功" : "失敗"}`);

			// 返回刪除結果
			return {
				success: deleteSuccess,
				path: productWebPath, // 保留原始路徑信息以供參考
				physicalPath: productPhysicalPath,
				message: deleteSuccess ? `產品目錄 '${productCode}' 已刪除` : `產品目錄 '${productCode}' 刪除失敗` // **修改點：更新消息**
			};
		} catch (error) {
			console.error("刪除產品目錄失敗:", error);
			return {
				success: false,
				message: error.message || "刪除產品目錄時發生未知錯誤"
			};
		}
	}

	/**
	 * 將 Web 路徑轉換為實體路徑
	 * @param {String} webPath - Web 路徑
	 * @returns {String} 實體路徑
	 */
	webToPhysicalPath(webPath) {
		if (!webPath || !webPath.startsWith("/storage")) {
			throw new ApiError(400, "無效的 Web 路徑格式，必須以 /storage 開頭");
		}

		// 移除前導 /storage/ 部分
		const relativePath = webPath.substring("/storage".length);

		// 在 Windows 環境中轉換路徑分隔符
		let normalizedPath = this.isWindows ? relativePath.replace(/\//g, "\\") : relativePath;
		if (normalizedPath.startsWith("/") || normalizedPath.startsWith("\\")) {
			normalizedPath = normalizedPath.substring(1);
		}

		// 合併根路徑和相對路徑
		const fullPath = path.join(this.FILES_ROOT, normalizedPath);
		console.log(`Web路徑 ${webPath} 轉換為物理路徑: ${fullPath}`);

		return fullPath;
	}

	/**
	 * 產生產品檔案儲存路徑
	 * @param {Object} hierarchyData - 層級結構資料
	 * @param {String} productCode - 產品代碼
	 * @param {String} fileName - 檔案名稱
	 * @param {String} fileType - 檔案類型 (images/documents)
	 * @returns {Object} 包含虛擬路徑和實體路徑的物件
	 */
	generateProductFilePath(hierarchyData, productCode, fileName, fileType) {
		try {
			if (!hierarchyData || !productCode || !fileName) {
				throw new ApiError(400, "缺少必要參數");
			}

			const { series, category, subCategory, specification } = hierarchyData;

			if (!series || !category || !subCategory || !specification) {
				throw new ApiError(400, "層級結構不完整");
			}

			// 清理和格式化代碼，改用 name.TW 作為資料夾名稱
			const seriesName = this.sanitizeFileName(series.name?.TW || "unknown");
			const categoryName = this.sanitizeFileName(category.name?.TW || "unknown");
			const subCategoryName = this.sanitizeFileName(subCategory.name?.TW || "unknown");
			const specificationName = this.sanitizeFileName(specification.name?.TW || "unknown");

			// 使用原始檔案名
			const cleanFileName = this.sanitizeFileName(path.basename(fileName));

			// 建立虛擬路徑，使用前向斜線 / 作為 Web 路徑
			const virtualPath = `/storage/products/${seriesName}/${categoryName}/${subCategoryName}/${specificationName}/${productCode}/${fileType}/${cleanFileName}`;

			// 轉換為物理路徑
			const physicalPath = this.webToPhysicalPath(virtualPath);

			// 確保目標目錄存在
			this.ensureDirectoryExists(physicalPath);

			return {
				virtualPath,
				physicalPath
			};
		} catch (error) {
			console.error("產生檔案路徑失敗:", error);
			throw error;
		}
	}

	/**
	 * 儲存產品檔案
	 * @param {Buffer} fileBuffer - 檔案內容
	 * @param {Object} options - 儲存選項
	 * @returns {String} 檔案虛擬路徑
	 */
	saveProductFile(fileBuffer, options) {
		// 驗證參數
		if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
			throw new ApiError(400, "無效的檔案內容");
		}

		const { hierarchyData, productCode, fileName, fileType } = options;

		// 檢查必要參數
		if (!hierarchyData || !productCode || !fileName || !fileType) {
			const missingParams = [];
			if (!hierarchyData) missingParams.push("hierarchyData");
			if (!productCode) missingParams.push("productCode");
			if (!fileName) missingParams.push("fileName");
			if (!fileType) missingParams.push("fileType");

			throw new ApiError(400, `缺少必要參數: ${missingParams.join(", ")}`);
		}

		try {
			// 產生檔案路徑
			const { virtualPath, physicalPath } = this.generateProductFilePath(hierarchyData, productCode, fileName, fileType);

			// 儲存檔案
			const saveResult = this.saveBufferToFile(fileBuffer, physicalPath);
			if (!saveResult) {
				throw new ApiError(500, "儲存檔案失敗");
			}

			return virtualPath;
		} catch (error) {
			console.error("儲存產品檔案失敗:", error);
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(500, `儲存檔案時發生錯誤: ${error.message}`);
		}
	}

	// --- 新聞圖片統一處理 ---
	/**
	 * 產生新聞圖片檔案儲存路徑 (通用於封面和內容圖片)
	 * @param {String} newsId - 新聞的 ID
	 * @param {String} newsTitleTw - 新聞的繁體中文標題 (用於路徑)
	 * @param {String} originalFileName - 原始檔案名
	 * @returns {Object} 包含虛擬路徑和實體路徑的物件
	 */
	generateNewsImageFilePath(newsId, newsTitleTw, originalFileName) {
		try {
			if (!newsId || !originalFileName) {
				throw new ApiError(400, "產生新聞圖片路徑缺少 newsId 或 originalFileName");
			}
			const safeNewsId = this.sanitizeFileName(newsId.toString()); // Ensure newsId is filename-safe
			const safeTitlePart = newsTitleTw ? this.sanitizeFileName(newsTitleTw) : "untitled";
			// 組合父目錄名
			const parentDirName = `${safeNewsId}_${safeTitlePart}`.substring(0, 100); // Limit length
			// 使用原始檔名，加上時間戳確保唯一性
			const uniqueFileName = this.generateUniqueFileName(originalFileName, "img"); // Generic prefix "img"

			const baseDirectory = "news"; // Base directory for all news related images
			const imageSubDirectory = "images"; // Subdirectory for actual image files

			const newsItemSpecificDir = path.join(this.FILES_ROOT, baseDirectory, parentDirName, imageSubDirectory);
			this.ensureDirectory(newsItemSpecificDir); // 確保 /storage/news/{newsId_safeTitle}/images/ 目錄存在

			const virtualPath = `/storage/${baseDirectory}/${parentDirName}/${imageSubDirectory}/${uniqueFileName}`;
			const physicalPath = this.webToPhysicalPath(virtualPath);

			return {
				virtualPath,
				physicalPath
			};
		} catch (error) {
			console.error("產生新聞圖片檔案路徑失敗:", error);
			throw error;
		}
	}

	/**
	 * 儲存新聞圖片檔案 (通用於封面和內容圖片)
	 * @param {Buffer} fileBuffer
	 * @param {String} newsId
	 * @param {String} newsTitleTw
	 * @param {String} originalFileName
	 * @returns {String} 檔案的虛擬路徑
	 */
	saveNewsImage(fileBuffer, newsId, newsTitleTw, originalFileName) {
		if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) throw new ApiError(400, "無效的檔案內容 (新聞圖片)");
		if (!newsId || !originalFileName) throw new ApiError(400, "儲存新聞圖片缺少 newsId 或 originalFileName");

		try {
			const { virtualPath, physicalPath } = this.generateNewsImageFilePath(newsId, newsTitleTw, originalFileName);
			const saveResult = this.saveBufferToFile(fileBuffer, physicalPath);
			if (!saveResult) throw new ApiError(500, "儲存新聞圖片檔案本身失敗");
			return virtualPath;
		} catch (error) {
			console.error("儲存新聞圖片檔案過程失敗:", error);
			if (error instanceof ApiError) throw error;
			throw new ApiError(500, `儲存新聞圖片檔案時發生錯誤: ${error.message}`);
		}
	}

	// New middleware for news images (cover + content)
	getNewsUploadMiddleware() {
		return this.upload.fields([
			{ name: "coverImage", maxCount: 1 },
			{ name: "contentImages", maxCount: MAX_NEWS_CONTENT_IMAGES },
			{ name: "contentVideoFiles", maxCount: MAX_NEWS_CONTENT_IMAGES } // Assuming similar limit for videos in content
		]);
	}

	// --- Generic Entity Asset Handling --- (NEW)
	/**
	 * 產生實體資源的基礎相對目錄路徑 (相對於 FILES_ROOT)
	 * @param {String} entityTypePlural - 實體類型複數 (e.g., 'news', 'faqs')
	 * @param {String} entityId - 實體 ID
	 * @param {String} entityNameHint - 實體名稱提示 (用於路徑)
	 * @returns {String} 基礎相對目錄路徑
	 */
	_generateEntityAssetBaseDir(entityTypePlural, entityId, entityNameHint) {
		const safeEntityId = this.sanitizeFileName(entityId.toString());
		const safeNameHintPart = entityNameHint ? this.sanitizeFileName(entityNameHint) : `untitled_${entityTypePlural.slice(0, -1)}`;
		const dirNamePart = `${safeEntityId}_${safeNameHintPart}`.substring(0, 100); // Limit length
		return path.join(entityTypePlural, dirNamePart);
	}

	/**
	 * 產生特定實體資源的路徑
	 * @param {String} entityTypePlural - e.g., 'news', 'faqs'
	 * @param {String} entityId
	 * @param {String} entityNameHint - e.g., news title, faq question
	 * @param {String} assetPurpose - e.g., 'news_cover', 'news_content_image', 'faq_item_video'
	 * @param {String} originalFileName
	 * @returns {Object} { virtualPath, physicalPath }
	 */
	generateEntityAssetPath(entityTypePlural, entityId, entityNameHint, assetPurpose, originalFileName) {
		if (!entityTypePlural || !entityId || !assetPurpose || !originalFileName) {
			throw new ApiError(400, "產生實體資源路徑缺少必要參數");
		}

		let subDir = "";
		let filePrefix = "";

		switch (assetPurpose) {
			case "news_cover":
				subDir = "covers";
				filePrefix = "cover";
				break;
			case "news_content_image":
				subDir = "images";
				filePrefix = "content_img";
				break;
			case "news_content_video":
				subDir = "videos";
				filePrefix = "content_vid";
				break;
			case "faq_item_image":
				subDir = "images";
				filePrefix = "faq_img";
				break;
			case "faq_item_video":
				subDir = "videos"; // Changed from 'video' to 'videos' for consistency
				filePrefix = "faq_vid";
				break;
			default:
				throw new ApiError(400, `不支援的 assetPurpose: ${assetPurpose}`);
		}

		try {
			const baseDirRelative = this._generateEntityAssetBaseDir(entityTypePlural, entityId, entityNameHint);
			const uniqueFileName = this.generateUniqueFileName(originalFileName, filePrefix);

			const fullDirectoryPath = path.join(this.FILES_ROOT, baseDirRelative, subDir);
			this.ensureDirectory(fullDirectoryPath); // Ensure the specific subdirectory (e.g., /covers, /images) exists

			const virtualPath = `/storage/${baseDirRelative}/${subDir}/${uniqueFileName}`;
			// Physical path is now more directly constructed
			const physicalPath = path.join(fullDirectoryPath, uniqueFileName);

			return { virtualPath, physicalPath };
		} catch (e) {
			console.error(`為 ${assetPurpose} 產生路徑失敗:`, e);
			throw e;
		}
	}

	/**
	 * 儲存實體資源檔案
	 * @param {Buffer} fileBuffer
	 * @param {String} entityTypePlural
	 * @param {String} entityId
	 * @param {String} entityNameHint
	 * @param {String} assetPurpose
	 * @param {String} originalFileName
	 * @returns {String} 檔案的虛擬路徑
	 */
	saveEntityAsset(fileBuffer, entityTypePlural, entityId, entityNameHint, assetPurpose, originalFileName) {
		if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) throw new ApiError(400, `無效的檔案內容 (${assetPurpose})`);
		try {
			const { virtualPath, physicalPath } = this.generateEntityAssetPath(entityTypePlural, entityId, entityNameHint, assetPurpose, originalFileName);
			if (!this.saveBufferToFile(fileBuffer, physicalPath)) throw new ApiError(500, `儲存實體資源檔案 (${assetPurpose}) 失敗`);
			return virtualPath;
		} catch (e) {
			console.error(`儲存實體資源檔案 (${assetPurpose}) 過程失敗:`, e);
			if (e instanceof ApiError) throw e;
			throw new ApiError(500, `儲存實體資源檔案 (${assetPurpose}) 時發生錯誤: ${e.message}`);
		}
	}

	/**
	 * 刪除指定實體的所有相關資源目錄
	 * @param {String} entityTypePlural
	 * @param {String} entityId
	 * @param {String} entityNameHint
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteEntityAssetDirectory(entityTypePlural, entityId, entityNameHint) {
		try {
			const baseDirRelative = this._generateEntityAssetBaseDir(entityTypePlural, entityId, entityNameHint);
			const fullPath = path.join(this.FILES_ROOT, baseDirRelative);
			return this.deleteDirectory(fullPath);
		} catch (error) {
			console.error(`刪除實體資源目錄失敗 (${entityTypePlural}/${entityId}):`, error);
			return false;
		}
	}

	// --- News Specific File Handling --- (REFACTORED)

	_generateNewsItemBaseDir(newsId, newsTitleTw) {
		return this._generateEntityAssetBaseDir("news", newsId, newsTitleTw);
	}

	generateNewsCoverPath(newsId, newsTitleTw, originalFileName) {
		return this.generateEntityAssetPath("news", newsId, newsTitleTw, "news_cover", originalFileName);
	}

	saveNewsCoverImage(fileBuffer, newsId, newsTitleTw, originalFileName) {
		return this.saveEntityAsset(fileBuffer, "news", newsId, newsTitleTw, "news_cover", originalFileName);
	}

	generateNewsContentImagePath(newsId, newsTitleTw, originalFileName) {
		return this.generateEntityAssetPath("news", newsId, newsTitleTw, "news_content_image", originalFileName);
	}

	saveNewsContentImage(fileBuffer, newsId, newsTitleTw, originalFileName) {
		return this.saveEntityAsset(fileBuffer, "news", newsId, newsTitleTw, "news_content_image", originalFileName);
	}

	// Method to delete the entire directory for a news item
	deleteNewsItemDirectory(newsId, newsTitleTw) {
		return this.deleteEntityAssetDirectory("news", newsId, newsTitleTw);
	}

	// --- FAQ Specific File Handling --- (REFACTORED)

	/**
	 * Middleware for FAQ images (multiple images named 'faqImages')
	 */
	getFaqUploadMiddleware() {
		return this.upload.fields([
			{ name: "faqImages", maxCount: 10 }, // Allow up to 10 images for an FAQ item
			{ name: "faqVideoFile", maxCount: 1 } // Allow 1 video for an FAQ item
		]);
	}

	_generateFaqItemBaseDir(faqId, faqQuestionTw) {
		return this._generateEntityAssetBaseDir("faqs", faqId, faqQuestionTw);
	}

	generateFaqImagePath(faqId, faqQuestionTw, originalFileName) {
		return this.generateEntityAssetPath("faqs", faqId, faqQuestionTw, "faq_item_image", originalFileName);
	}

	saveFaqImage(fileBuffer, faqId, faqQuestionTw, originalFileName) {
		return this.saveEntityAsset(fileBuffer, "faqs", faqId, faqQuestionTw, "faq_item_image", originalFileName);
	}

	deleteFaqItemDirectory(faqId, faqQuestionTw) {
		return this.deleteEntityAssetDirectory("faqs", faqId, faqQuestionTw);
	}

	generateFaqVideoPath(faqId, faqQuestionTw, originalFileName) {
		return this.generateEntityAssetPath("faqs", faqId, faqQuestionTw, "faq_item_video", originalFileName);
	}

	saveFaqVideo(fileBuffer, faqId, faqQuestionTw, originalFileName) {
		return this.saveEntityAsset(fileBuffer, "faqs", faqId, faqQuestionTw, "faq_item_video", originalFileName);
	}

	// News Content Video Methods (REFACTORED)
	generateNewsContentVideoPath(newsId, newsTitleTw, originalFileName) {
		return this.generateEntityAssetPath("news", newsId, newsTitleTw, "news_content_video", originalFileName);
	}

	saveNewsContentVideo(fileBuffer, newsId, newsTitleTw, originalFileName) {
		return this.saveEntityAsset(fileBuffer, "news", newsId, newsTitleTw, "news_content_video", originalFileName);
	}
}

// 匯出單例
export default new FileUpload();
