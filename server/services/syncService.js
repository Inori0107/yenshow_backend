import axios from "axios";

/**
 * 將資料同步到雲端
 * @param {Array|Object} data - 要同步的資料
 * @param {String} endpoint - 雲端API端點
 * @returns {Object} 同步結果
 */
export const syncToCloud = async (data, endpoint) => {
	try {
		console.log(`開始同步資料到 ${endpoint}...`);

		if (!process.env.CLOUD_WEBSITE_URL) {
			throw new Error("未設定雲端網站URL (CLOUD_WEBSITE_URL)");
		}

		if (!process.env.API_KEY || !process.env.API_SECRET) {
			throw new Error("未設定API認證資訊 (API_KEY/API_SECRET)");
		}

		// 添加重試機制
		let retries = 3;
		let lastError = null;

		while (retries > 0) {
			try {
				const response = await axios.post(`${process.env.CLOUD_WEBSITE_URL}/api/${endpoint}`, data, {
					headers: {
						"x-api-key": process.env.API_KEY,
						"x-api-secret": process.env.API_SECRET,
						"Content-Type": "application/json"
					},
					timeout: 30000 // 30秒超時
				});

				console.log(`成功同步資料到 ${endpoint}`);
				return {
					success: true,
					data: response.data
				};
			} catch (error) {
				lastError = error;
				retries--;

				if (retries > 0) {
					console.log(`同步失敗，剩餘重試次數: ${retries}`);
					// 等待 2 秒再重試
					await new Promise((resolve) => setTimeout(resolve, 2000));
				}
			}
		}

		// 所有重試都失敗
		throw lastError;
	} catch (error) {
		console.error(`同步到雲端失敗 (${endpoint}):`, error.message);

		// 記錄詳細錯誤信息
		if (error.response) {
			// 伺服器回應了錯誤
			console.error(`狀態碼: ${error.response.status}`);
			console.error(`回應數據:`, error.response.data);
		} else if (error.request) {
			// 請求已發送但沒有收到回應
			console.error(`無回應: 請求已發送但未收到回應`);
		}

		return {
			success: false,
			error: error.message
		};
	}
};
