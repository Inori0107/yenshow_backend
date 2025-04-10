import axios from "axios";

export const syncToCloud = async (data, endpoint) => {
	try {
		const response = await axios.post(`${process.env.CLOUD_WEBSITE_URL}/api/${endpoint}`, data, {
			headers: {
				"x-api-key": process.env.API_KEY,
				"x-api-secret": process.env.API_SECRET
			}
		});

		return {
			success: true,
			data: response.data
		};
	} catch (error) {
		console.error(`同步到雲端失敗 (${endpoint}):`, error.message);
		return {
			success: false,
			error: error.message
		};
	}
};
