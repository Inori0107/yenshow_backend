import { Client } from "@line/bot-sdk";
import hierarchyService from "./HierarchyService.js";
import { createProductNavigationMessage, createProductListMessage } from "../utils/lineFlexTemplates.js";
import { transformProductImagePaths } from "../utils/urlTransformer.js";

// Initialize LINE SDK Client
const client = new Client({
	channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.LINE_CHANNEL_SECRET
});

/**
 * Fetches series and their respective categories, then sends a single Flex Message.
 * @param {string} replyToken - The reply token from the webhook event.
 */
const sendProductNavigation = async (replyToken) => {
	try {
		const hierarchy = await hierarchyService.getFullHierarchyData({
			accessOptions: { filterActive: true },
			maxDepth: 1
		});

		if (!hierarchy || hierarchy.length === 0) {
			return client.replyMessage(replyToken, { type: "text", text: "目前沒有任何產品系列喔！" });
		}

		const flexMessage = createProductNavigationMessage(hierarchy);
		await client.replyMessage(replyToken, flexMessage);
	} catch (error) {
		console.error("Failed to send product navigation:", error);
		throw error;
	}
};

/**
 * 從一個分類的層級樹中，精準地提取所有產品。
 * 此邏輯模仿自 client/src/components/products/ProductTable.vue。
 * @param {object} categoryNode - 從 hierarchyService.getSubHierarchyData 獲取的分類節點。
 * @returns {Array<object>} 一個包含所有產品的陣列。
 */
function extractProductsFromCategoryTree(categoryNode) {
	const products = [];
	// categoryNode 包含 subCategories 陣列
	if (!categoryNode || !Array.isArray(categoryNode.subCategories)) {
		return products;
	}

	categoryNode.subCategories.forEach((subCategory) => {
		// 每個 subCategory 包含 specifications 陣列
		if (subCategory && Array.isArray(subCategory.specifications)) {
			subCategory.specifications.forEach((spec) => {
				// 每個 spec 包含 products 陣列
				if (spec && Array.isArray(spec.products)) {
					// 將找到的產品推入結果陣列
					// HierarchyService 已經處理了 isActive 的過濾
					products.push(...spec.products);
				}
			});
		}
	});

	return products;
}

/**
 * Sends a Flex Message containing a list of products for a specific category.
 * @param {string} replyToken - The reply token from the webhook event.
 * @param {string} categoryId - The ID of the category to get products for.
 */
const sendProductList = async (replyToken, categoryId) => {
	try {
		// 1. 使用 HierarchyService 獲取該分類下的完整巢狀資料樹
		const categoryTree = await hierarchyService.getSubHierarchyData("categories", categoryId, {
			accessOptions: { filterActive: true }
		});

		// 2. 使用模仿前端邏輯的函式來提取所有產品
		let productList = extractProductsFromCategoryTree(categoryTree);

		// 3. 將產品列表中的圖片路徑轉換為絕對 URL
		const baseUrl = process.env.PUBLIC_BASE_URL;
		if (baseUrl) {
			productList = productList.map((product) => transformProductImagePaths(product, baseUrl));
		}

		if (productList.length === 0) {
			return client.replyMessage(replyToken, { type: "text", text: "這個分類底下目前沒有任何產品喔！" });
		}

		const flexMessage = createProductListMessage(productList);
		await client.replyMessage(replyToken, flexMessage);
	} catch (error) {
		console.error(`Failed to send product list for category ${categoryId}:`, error);
		throw error;
	}
};

// --- Event Handlers ---

export const handleMessage = async (event) => {
	if (event.message.type === "text") {
		const userMessage = event.message.text.trim();
		if (userMessage === "產品一覽") {
			return sendProductNavigation(event.replyToken);
		}
		// You can add other keyword responses here.
		// For example, sending a default reply for unhandled messages.
	}
	return Promise.resolve(null);
};

export const handlePostback = async (event) => {
	const postbackData = new URLSearchParams(event.postback.data);
	const action = postbackData.get("action");

	if (action === "view_products") {
		const categoryId = postbackData.get("categoryId");
		return sendProductList(event.replyToken, categoryId);
	}

	console.log("Unhandled Postback received:", event.postback.data);
	return Promise.resolve(null);
};

export const handleFollow = async (event) => {
	console.log(`User ${event.source.userId} followed the bot.`);
	const welcomeMessages = [
		{
			type: "text",
			text: "歡迎加入 YENSHOW 官方帳號！🎉\n\n我們是您在安全監控領域的專業夥伴，致力於提供最先進的門禁安防與影像監控解決方案。"
		},
		{
			type: "text",
			text: "您可以隨時點擊下方的【圖文選單】，輕鬆探索我們的全系列產品與最新消息。"
		},
		{
			type: "text",
			text: "若想直接提問，請點擊左下角的鍵盤圖示 ⌨️，即可切換回文字輸入模式與我們互動。"
		}
	];
	// Send a welcome message
	return client.replyMessage(event.replyToken, welcomeMessages);
};

export const handleUnfollow = async (event) => {
	// It's not possible to reply to an unfollow event.
	console.log(`User ${event.source.userId} unfollowed or blocked the bot.`);
	return Promise.resolve(null);
};
