import cron from "node-cron";
import { syncToCloud } from "../services/syncService.js";
import Products from "../models/products.js";

// 每 4 小時同步一次產品資料 (0 0,4,8,12,16,20 * * *)
cron.schedule("0 0,4,8,12,16,20 * * *", async () => {
	try {
		// 確保只在啟用同步的情況下運行
		if (process.env.CLOUD_SYNC_ENABLED !== "true") {
			console.log("雲端同步未啟用，跳過產品同步");
			return;
		}

		console.log("開始同步產品資料...");

		// 直接使用 Products 模型
		const products = await Products.find({}).populate({
			path: "specificationsId",
			select: "name code isActive"
		});

		console.log(`找到 ${products.length} 個產品準備同步`);

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

		if (result.success) {
			console.log(`${products.length} 個產品已同步到雲端`);
		} else {
			console.error("產品同步失敗:", result.error);
		}
	} catch (error) {
		console.error("定時同步產品出錯:", error);
	}
});

// 注意: 暫時移除新聞同步，等 news 模型完成後再實現
// 以下是新聞同步的代碼範本註釋掉，供日後參考
// cron.schedule("0 0,2,4,6,8,10,12,14,16,18,20,22 * * *", async () => {
//   try {
//     // 同步新聞資料...
//   } catch (error) {
//     console.error("定時同步新聞出錯:", error);
//   }
// });
