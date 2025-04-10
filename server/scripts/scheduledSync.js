import cron from "node-cron";
import mongoose from "mongoose";
import { syncToCloud } from "../services/syncService.js";

// 每 4 小時同步一次產品資料
cron.schedule("0 */4 * * *", async () => {
	try {
		// 確保只在啟用同步的情況下運行
		if (process.env.CLOUD_SYNC_ENABLED !== "true") return;

		console.log("開始同步產品資料...");
		const products = await mongoose.model("Products").find({});
		const result = await syncToCloud(products, "sync/products");

		if (result.success) {
			console.log(`${products.length} 個產品已同步到雲端`);
		} else {
			console.error("產品同步失敗:", result.error);
		}
	} catch (error) {
		console.error("定時同步產品出錯:", error);
	}
});

// 每 2 小時同步一次新聞資料
cron.schedule("0 */2 * * *", async () => {
	try {
		// 確保只在啟用同步的情況下運行
		if (process.env.CLOUD_SYNC_ENABLED !== "true") return;

		console.log("開始同步新聞資料...");
		const news = await mongoose.model("News").find({});
		const result = await syncToCloud(news, "sync/news");

		if (result.success) {
			console.log(`${news.length} 條新聞已同步到雲端`);
		} else {
			console.error("新聞同步失敗:", result.error);
		}
	} catch (error) {
		console.error("定時同步新聞出錯:", error);
	}
});
