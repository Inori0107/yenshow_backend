import fs from "fs";
import path from "path";
import multer from "multer";
import { ApiError } from "./responseHandler.js";
import os from "os";

/**
 * 檔案上傳工具類
 * 提供檔案上傳處理、儲存和驗證功能
 */
class FileUpload {
	constructor() {
		// 檢測操作系統類型
		this.isWindows = os.platform() === "win64";

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
			// 檢查檔案類型
			switch (file.fieldname) {
				case "images":
					if (!file.mimetype.startsWith("image/")) {
						return cb(new ApiError(400, "只允許上傳圖片檔案"), false);
					}
					break;
				case "documents":
					if (file.mimetype !== "application/pdf") {
						return cb(new ApiError(400, "文檔僅允許 PDF 格式"), false);
					}
					break;
				default:
					if (!this.isAllowedMimeType(file.mimetype)) {
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
			"text/plain"
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
			{ name: "documents", maxCount: 5 }
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
		const baseName = path.basename(originalName);
		const ext = path.extname(baseName);
		const name = path.basename(baseName, ext);

		// 清理檔案名
		const cleanName = this.sanitizeFileName(name);

		// 組合唯一檔案名
		return `${prefix ? prefix + "_" : ""}${cleanName}_${timestamp}${ext}`;
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
			if (dirPath === this.FILES_ROOT || !dirPath.startsWith(this.FILES_ROOT)) {
				console.error(`安全限制: 不允許刪除根目錄或非儲存目錄: ${dirPath}`);
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
			fs.rmdirSync(dirPath);
			console.log(`已刪除目錄: ${dirPath}`);
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
		const relativePath = webPath.replace(/^\/storage\//, "");

		// 在 Windows 環境中轉換路徑分隔符
		let normalizedPath = relativePath;
		if (this.isWindows) {
			normalizedPath = relativePath.replace(/\//g, "\\");
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
}

// 匯出單例
export default new FileUpload();
