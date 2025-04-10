import { syncToCloud } from "../services/syncService.js";
import { ApiError } from "../utils/responseHandler.js";

export const syncProducts = async (req, res, next) => {
	try {
		// 從資料庫獲取產品資料
		const products = await req.app.locals.models.products.find({});

		// 同步到雲端
		const result = await syncToCloud(products, "sync/products");

		if (!result.success) {
			throw new ApiError(500, "同步失敗: " + result.error);
		}

		res.status(200).json({
			success: true,
			message: "產品資料已同步到雲端",
			syncedCount: products.length
		});
	} catch (error) {
		next(error);
	}
};

export const syncNews = async (req, res, next) => {
	try {
		// 從資料庫獲取新聞資料
		const news = await req.app.locals.models.news.find({});

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
	} catch (error) {
		next(error);
	}
};
