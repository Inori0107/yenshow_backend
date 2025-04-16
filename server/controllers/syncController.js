import { syncToCloud } from "../services/syncService.js";
import { ApiError } from "../utils/responseHandler.js";
import Products from "../models/products.js";

/**
 * 同步產品資料到雲端
 * 從資料庫取得產品資料，處理後同步到設定的雲端服務
 */
export const syncProducts = async (req, res, next) => {
	try {
		// 從資料庫獲取產品資料
		const products = await Products.find({}).populate({
			path: "specificationsId",
			select: "name code isActive"
		});

		console.log(`準備同步 ${products.length} 個產品到雲端...`);

		// 處理資料格式，確保輕量化
		const simplifiedProducts = products.map((product) => ({
			_id: product._id,
			code: product.code,
			name: product.name,
			description: product.description,
			images: product.images,
			isActive: product.isActive,
			specification: product.specificationsId
				? {
						name: product.specificationsId.name,
						code: product.specificationsId.code
				  }
				: null
		}));

		// 同步到雲端
		const result = await syncToCloud(simplifiedProducts, "sync/products");

		if (!result.success) {
			throw new ApiError(500, "同步失敗: " + result.error);
		}

		res.status(200).json({
			success: true,
			message: "產品資料已同步到雲端",
			syncedCount: products.length
		});
	} catch (error) {
		console.error("同步產品資料出錯:", error);
		next(error);
	}
};

/**
 * 同步新聞資料到雲端 (尚未實現)
 * 此功能將在 News 模型實現後完成
 */
export const syncNews = async (req, res, next) => {
	try {
		// 臨時回應
		res.status(501).json({
			success: false,
			message: "新聞同步功能尚未實現"
		});

		// 下面是將來的實現框架
		/*
		// 從資料庫獲取新聞資料
		const news = await News.find({});

		// 同步到雲端
		const result = await syncToCloud(news, "sync/news");

		if (!result.success) {
			throw new ApiError(500, "同步失敗: " + result.error);
		}

		res.status(200).json({
			success: true,
			message: "新聞資料已同步到雲端",
			syncedCount: news.length
		});
		*/
	} catch (error) {
		console.error("同步新聞資料出錯:", error);
		next(error);
	}
};
