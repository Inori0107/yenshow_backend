import News from "../models/News.js";
import { EntityController } from "./EntityController.js";
import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import fileUpload from "../utils/fileUpload.js"; // 引入統一的檔案處理工具
import { v4 as uuidv4 } from "uuid"; // 用於生成區塊臨時 ID 的備份 (如果前端沒傳)
import path from "path"; // 引入 path 模塊
import fs from "fs"; // 引入 fs 模塊

// --- Helper function to validate content items (can be moved to a service/validator) ---
function validateContentItems(content) {
	if (!Array.isArray(content)) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "內容 (content) 必須是一個陣列");
	}

	for (const item of content) {
		if (!item || typeof item !== "object") {
			throw new ApiError(StatusCodes.BAD_REQUEST, "內容陣列中的項目格式無效");
		}
		if (!item.itemType || !["richText", "image", "videoEmbed"].includes(item.itemType)) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `無效的內容項目類型: ${item.itemType}`);
		}

		// Validate based on itemType and clean up extraneous fields
		switch (item.itemType) {
			case "richText":
				if (!item.richTextData || typeof item.richTextData !== "object") {
					throw new ApiError(StatusCodes.BAD_REQUEST, "richText 項目缺少有效的 richTextData");
				}
				const validateRichTextLang = (langData) => {
					if (langData && !Array.isArray(langData)) return false;
					if (langData) {
						for (const block of langData) {
							if (!block || typeof block !== "object" || !block.type || !block.text) return false;
						}
					}
					return true;
				};
				if (!validateRichTextLang(item.richTextData.TW) || !validateRichTextLang(item.richTextData.EN)) {
					throw new ApiError(StatusCodes.BAD_REQUEST, "richTextData 內部結構無效 (TW 或 EN)");
				}
				// Clean up fields not relevant to richText
				delete item.imageUrl;
				delete item.imageAltText;
				delete item.imageCaption;
				delete item.videoEmbedUrl;
				delete item.videoCaption;
				break;
			case "image":
				if (item.imageUrl !== undefined && item.imageUrl !== null && typeof item.imageUrl !== "string" && item.imageUrl !== "__NEW_CONTENT_IMAGE__") {
					throw new ApiError(StatusCodes.BAD_REQUEST, "image 項目提供的 imageUrl 格式無效");
				}
				if (item.imageAltText && typeof item.imageAltText !== "object") throw new ApiError(StatusCodes.BAD_REQUEST, "imageAltText 格式無效");
				if (item.imageCaption && typeof item.imageCaption !== "object") throw new ApiError(StatusCodes.BAD_REQUEST, "imageCaption 格式無效");
				// Clean up fields not relevant to image
				delete item.richTextData;
				delete item.videoEmbedUrl;
				delete item.videoCaption;
				break;
			case "videoEmbed":
				if (!item.videoEmbedUrl || typeof item.videoEmbedUrl !== "string") {
					throw new ApiError(StatusCodes.BAD_REQUEST, "videoEmbed 項目缺少有效的 videoEmbedUrl");
				}
				if (item.videoCaption && typeof item.videoCaption !== "object") throw new ApiError(StatusCodes.BAD_REQUEST, "videoCaption 格式無效");
				// Clean up fields not relevant to videoEmbed
				delete item.richTextData;
				delete item.imageUrl;
				delete item.imageAltText;
				delete item.imageCaption;
				break;
		}
		if (item.sortOrder !== undefined && typeof item.sortOrder !== "number") {
			throw new ApiError(StatusCodes.BAD_REQUEST, "sortOrder 必須是數字");
		}
	}
	content.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

class NewsController extends EntityController {
	constructor() {
		super(News, {
			entityName: "News",
			responseKey: "news",
			// 調整 basicFields 以包含新模型結構，移除不必要的 images 欄位
			basicFields: ["title", "slug", "category", "isActive", "publishDate", "author", "summary", "coverImageUrl", "createdAt", "updatedAt"]
		});
		if (this._prepareNewsData) {
			this._prepareNewsData = this._prepareNewsData.bind(this);
		}
	}

	// _prepareNewsData 修改：
	// 1. 處理封面圖 (req.files['coverImage'])
	// 2. 處理內容區塊圖片 (req.files['contentImages'])
	async _prepareNewsData(req, isUpdate = false, existingNews = null) {
		let rawData;
		if (req.is("multipart/form-data") && req.body.newsDataPayload) {
			try {
				rawData = JSON.parse(req.body.newsDataPayload);
			} catch (e) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "無法解析 newsDataPayload JSON 字串");
			}
		} else {
			rawData = { ...req.body }; // Fallback for non-FormData or if newsDataPayload is not present
		}

		const data = { ...rawData }; // slug, isActive, publishDate etc. from parsed data
		const files = req.files || {}; // Should be { coverImage?: [File], contentImages?: [File, File...] }

		// If updating, and ID was part of newsDataPayload, remove it as it's from req.params
		if (isUpdate && data._id) {
			delete data._id;
		}

		data._pendingCoverFile = files.coverImage?.[0];
		data._pendingContentFiles = files.contentImages || []; // Array of content image files
		let imagesToDeletePaths = [];
		let currentContentImageFileIndex = 0;

		// 1. 解析並驗證 title (現在 data.title 應該已經是解析後的 JS 物件了)
		if (data.title !== undefined) {
			if (typeof data.title !== "object" || !data.title.TW) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文標題為必填，或標題格式錯誤");
			}
			data.newsTitleTw = data.title.TW; // Store TW title for file naming (still used for file paths)
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少標題欄位");
		} else if (existingNews) {
			data.newsTitleTw = existingNews.title?.TW || data.title?.TW;
		}

		// 3. 處理 content (基本結構驗證，圖片檔案稍後處理)
		if (data.content !== undefined) {
			try {
				// 簡化不必要的欄位
				if (Array.isArray(data.content)) {
					data.content.forEach((item) => {
						// 對於 image 和 videoEmbed 類型，移除 richTextData 欄位
						if ((item.itemType === "image" || item.itemType === "videoEmbed") && item.richTextData) {
							delete item.richTextData;
						}
					});
				}

				validateContentItems(data.content); // data.content 應該是 JS 陣列
			} catch (validationError) {
				throw validationError;
			}
			// 將內容圖片檔案關聯到 content blocks
			if (Array.isArray(data.content)) {
				data.content.forEach((block, blockIndex) => {
					if (block.itemType === "image") {
						const wantsNewImageForBlock = block.imageUrl === "__NEW_CONTENT_IMAGE__"; // Special marker
						if (wantsNewImageForBlock && data._pendingContentFiles[currentContentImageFileIndex]) {
							block._pendingFile = data._pendingContentFiles[currentContentImageFileIndex];
							currentContentImageFileIndex++;
							if (isUpdate && existingNews) {
								const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
								if (existingBlockInNews?.imageUrl && !existingBlockInNews.imageUrl.startsWith("http")) {
									imagesToDeletePaths.push(existingBlockInNews.imageUrl);
								}
							}
							block.imageUrl = ""; // Placeholder, will be set by controller
						} else if (isUpdate && block.imageUrl === null && existingNews) {
							const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
							if (existingBlockInNews?.imageUrl && !existingBlockInNews.imageUrl.startsWith("http")) {
								imagesToDeletePaths.push(existingBlockInNews.imageUrl);
							}
						}
					}
				});
			}
		} else if (!isUpdate) {
			data.content = [];
		} else if (isUpdate && data.content === null) {
			data.content = [];
			if (existingNews?.content) {
				existingNews.content.forEach((block) => {
					if (block.itemType === "image" && block.imageUrl && !block.imageUrl.startsWith("http")) {
						imagesToDeletePaths.push(block.imageUrl);
					}
				});
			}
		}

		// 4. 處理 category
		if (data.category !== undefined) {
			const validCategories = News.schema.path("category").enumValues;
			if (!validCategories.includes(data.category)) {
				throw new ApiError(StatusCodes.BAD_REQUEST, `無效的分類：${data.category}`);
			}
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少分類欄位");
		}

		// 5. author (創建時在 createItem 中設定，更新時忽略)
		if (isUpdate) delete data.author;

		// 6. summary
		if (data.summary !== undefined) {
			if (typeof data.summary !== "object") {
				throw new ApiError(StatusCodes.BAD_REQUEST, "摘要格式無效或解析錯誤");
			}
		}

		// 8. publishDate
		if (data.publishDate !== undefined) {
			if (data.publishDate === "" || data.publishDate === null) {
				if (isUpdate) delete data.publishDate;
				else data.publishDate = new Date();
			} else {
				data.publishDate = new Date(data.publishDate);
				if (isNaN(data.publishDate.getTime())) data.publishDate = new Date();
			}
		} else if (!isUpdate) {
			delete data.publishDate;
		}

		// 9. isActive
		if (data.isActive !== undefined) {
			data.isActive = String(data.isActive).toLowerCase() === "true";
		} else if (!isUpdate) {
			data.isActive = true;
		}

		// 10. 處理封面圖片
		const wantsNewCover = data.coverImageUrl === "__NEW_COVER__"; // Marker from frontend
		if (wantsNewCover && data._pendingCoverFile) {
			// _pendingCoverFile is already set from req.files.coverImage
			if (isUpdate && existingNews?.coverImageUrl && !existingNews.coverImageUrl.startsWith("http")) {
				imagesToDeletePaths.push(existingNews.coverImageUrl);
			}
			data.coverImageUrl = ""; // Placeholder, will be replaced by new URL by controller action
		} else if (isUpdate && data.coverImageUrl === null && existingNews?.coverImageUrl && !existingNews.coverImageUrl.startsWith("http")) {
			// Cover image explicitly removed (coverImageUrl is null from newsDataPayload)
			imagesToDeletePaths.push(existingNews.coverImageUrl);
			// data.coverImageUrl is already null
		} else if (!wantsNewCover && data.coverImageUrl !== undefined) {
			// Keep existing URL if not changing and not null.
		} else if (isUpdate && data.coverImageUrl === undefined) {
			// If coverImageUrl was not part of the payload, don't change existing.
			delete data.coverImageUrl;
		}

		return { processedData: data, imagesToDelete: imagesToDeletePaths };
	}

	createItem = async (req, res, next) => {
		let rawNewItem; // Changed variable name to indicate it's a raw Mongoose doc
		try {
			const { processedData } = await this._prepareNewsData(req, false, null);

			if (req.user && req.user._id) processedData.author = req.user._id;
			else throw new ApiError(StatusCodes.UNAUTHORIZED, "無法確定作者");

			const newsTitleForPath = processedData.newsTitleTw || "untitled_news";
			const pendingCoverFile = processedData._pendingCoverFile;
			const pendingContentFiles = processedData._pendingContentFiles || [];

			// Clean up temp properties before initial save
			delete processedData._pendingCoverFile;
			delete processedData._pendingContentFiles;
			delete processedData.newsTitleTw;
			if (Array.isArray(processedData.content)) {
				processedData.content.forEach((block) => {
					delete block._tempClientKey;
					delete block._pendingFile;
					// 確保 image 和 videoEmbed 類型沒有 richTextData
					if ((block.itemType === "image" || block.itemType === "videoEmbed") && block.richTextData) {
						delete block.richTextData;
					}
				});
			}
			processedData.coverImageUrl = undefined;

			// Call entityService.create with returnRawInstance: true
			rawNewItem = await this.entityService.create(processedData, {
				session: req.dbSession,
				returnRawInstance: true
			});

			const newsId = rawNewItem._id;
			let itemChangedByFileUpload = false;

			if (pendingCoverFile) {
				try {
					rawNewItem.coverImageUrl = fileUpload.saveNewsCoverImage(pendingCoverFile.buffer, newsId.toString(), newsTitleForPath, pendingCoverFile.originalname);
					itemChangedByFileUpload = true;
				} catch (e) {
					console.error("封面圖片上傳失敗:", e);
				}
			}

			const contentImageUrls = [];
			if (Array.isArray(rawNewItem.content)) {
				for (let i = 0; i < pendingContentFiles.length; i++) {
					const fileToSave = pendingContentFiles[i];
					let targetBlockIndex = -1;
					let currentFileMarkerCount = 0;
					for (let j = 0; j < processedData.content.length; j++) {
						if (processedData.content[j].itemType === "image" && processedData.content[j].imageUrl === "") {
							if (currentFileMarkerCount === i) {
								targetBlockIndex = j;
								break;
							}
							currentFileMarkerCount++;
						}
					}

					if (targetBlockIndex !== -1 && rawNewItem.content[targetBlockIndex]) {
						try {
							const imageUrl = fileUpload.saveNewsContentImage(fileToSave.buffer, newsId.toString(), newsTitleForPath, fileToSave.originalname);
							rawNewItem.content[targetBlockIndex].imageUrl = imageUrl;
							contentImageUrls.push(imageUrl);
							itemChangedByFileUpload = true;
						} catch (uploadError) {
							console.error(`內容圖片上傳失敗 (original index ${targetBlockIndex}):`, uploadError);
							rawNewItem.content[targetBlockIndex].imageUrl = null;
						}
					}
				}
			}

			if (itemChangedByFileUpload) {
				rawNewItem = await rawNewItem.save();
			}

			// Format the raw Mongoose document before sending the response
			const formattedNewItem = this.entityService.formatOutput(rawNewItem);
			this._sendResponse(res, StatusCodes.CREATED, `${this.entityName} 創建成功`, { [this.responseKey]: formattedNewItem });
		} catch (error) {
			if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
				this._handleError(new ApiError(StatusCodes.CONFLICT, "Slug 已存在 (如果slug仍要求unique)"), "創建", next);
			} else {
				this._handleError(error, "創建", next);
			}
		}
	};

	updateItem = async (req, res, next) => {
		try {
			const { id } = req.params;
			const existingItem = await this.model.findById(id);
			if (!existingItem) throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);

			// 1. Store all current local content image URLs from existingItem before modification
			const oldContentImageUrls = new Set();
			if (existingItem.content && Array.isArray(existingItem.content)) {
				existingItem.content.forEach((block) => {
					if (block.itemType === "image" && block.imageUrl && !block.imageUrl.startsWith("http")) {
						oldContentImageUrls.add(block.imageUrl);
					}
				});
			}
			// Also consider the main cover image if it's local
			const oldCoverImageUrl = existingItem.coverImageUrl && !existingItem.coverImageUrl.startsWith("http") ? existingItem.coverImageUrl : null;

			const { processedData, imagesToDelete: initialImagesToDelete } = await this._prepareNewsData(req, true, existingItem);
			const newsId = existingItem._id;
			const newsTitleForPath = processedData.newsTitleTw || existingItem.title?.TW || "untitled_news";

			const pendingCoverFile = processedData._pendingCoverFile;
			const pendingContentFiles = processedData._pendingContentFiles || [];

			delete processedData._pendingCoverFile;
			delete processedData._pendingContentFiles;
			delete processedData.newsTitleTw;
			if (Array.isArray(processedData.content)) {
				processedData.content.forEach((block) => {
					delete block._tempClientKey;
					delete block._pendingFile;
					// 確保 image 和 videoEmbed 類型沒有 richTextData
					if ((block.itemType === "image" || block.itemType === "videoEmbed") && block.richTextData) {
						delete block.richTextData;
					}
				});
			}

			// Store the actual data to be applied to existingItem
			const updatePayload = { ...processedData };

			// Handle Cover Image Update
			if (pendingCoverFile) {
				try {
					updatePayload.coverImageUrl = fileUpload.saveNewsCoverImage(
						pendingCoverFile.buffer,
						newsId.toString(),
						newsTitleForPath,
						pendingCoverFile.originalname
					);
				} catch (e) {
					console.error("封面圖片更新上傳失敗:", e);
					// Decide if we should proceed or throw error
					// For now, we'll let it proceed without updating coverImageUrl if upload fails
					delete updatePayload.coverImageUrl; // Do not set a new URL if save failed
				}
			} else if (updatePayload.coverImageUrl === null) {
				// coverImageUrl is explicitly set to null in body (and no new file), means remove
				// This is handled by updatePayload.coverImageUrl = null;
			} else {
				// No new file, not set to null -> keep existing value. Delete from payload to avoid overwrite.
				delete updatePayload.coverImageUrl;
			}

			// Handle Content Images Update (update URLs in updatePayload.content)
			let currentContentFileIdx = 0;
			if (Array.isArray(updatePayload.content)) {
				for (let i = 0; i < updatePayload.content.length; i++) {
					const block = updatePayload.content[i];
					if (block.itemType === "image" && block.imageUrl === "" && block._id === undefined) {
						// imageUrl was placeholder for new image in new block
						if (pendingContentFiles[currentContentFileIdx]) {
							try {
								const newUrl = fileUpload.saveNewsContentImage(
									pendingContentFiles[currentContentFileIdx].buffer,
									newsId.toString(),
									newsTitleForPath,
									pendingContentFiles[currentContentFileIdx].originalname
								);
								block.imageUrl = newUrl;
							} catch (e) {
								console.error(`內容圖片更新上傳失敗 for block at index ${i}:`, e);
								block.imageUrl = null;
							}
							currentContentFileIdx++;
						} else {
							block.imageUrl = null; // Placeholder was set, but no corresponding file.
						}
					} else if (block.itemType === "image" && block.imageUrl === "" && block._id !== undefined) {
						// imageUrl was placeholder for existing block replacement
						if (pendingContentFiles[currentContentFileIdx]) {
							try {
								const newUrl = fileUpload.saveNewsContentImage(
									pendingContentFiles[currentContentFileIdx].buffer,
									newsId.toString(),
									newsTitleForPath,
									pendingContentFiles[currentContentFileIdx].originalname
								);
								block.imageUrl = newUrl;
							} catch (e) {
								console.error(`內容圖片更新上傳失敗 for block ${block._id}:`, e);
								// Keep existing image or set to null? For now, let's try to keep, or set to null if it was truly meant to be new
								// This part of logic is tricky if _prepareNewsData didn't perfectly clear it.
								// Assuming _prepareNewsData correctly identified the old image for deletion if this was a replacement.
								block.imageUrl = existingItem.content.find((b) => b._id?.toString() === block._id?.toString())?.imageUrl || null;
							}
							currentContentFileIdx++;
						} else {
							// Placeholder set for existing block, but no file. Revert to old or set to null.
							block.imageUrl = existingItem.content.find((b) => b._id?.toString() === block._id?.toString())?.imageUrl || null;
						}
					}
				}
			}

			// Apply updatePayload to existingItem
			Object.keys(updatePayload).forEach((key) => {
				if (updatePayload[key] !== undefined || key === "coverImageUrl" || key === "content") {
					// Ensure content/coverImageUrl are updated even if set to null
					existingItem[key] = updatePayload[key];
				}
			});

			// 2. Collect all new local content image URLs from the updated existingItem.content
			const newContentImageUrls = new Set();
			if (existingItem.content && Array.isArray(existingItem.content)) {
				existingItem.content.forEach((block) => {
					if (block.itemType === "image" && block.imageUrl && !block.imageUrl.startsWith("http")) {
						newContentImageUrls.add(block.imageUrl);
					}
				});
			}
			const newCoverImageUrl = existingItem.coverImageUrl && !existingItem.coverImageUrl.startsWith("http") ? existingItem.coverImageUrl : null;

			// 3. Determine images to delete
			const allImagesToDelete = new Set(initialImagesToDelete); // From _prepareNewsData (direct replacements/nulls)

			// Add content images that were present before but not after
			oldContentImageUrls.forEach((oldUrl) => {
				if (!newContentImageUrls.has(oldUrl)) {
					allImagesToDelete.add(oldUrl);
				}
			});

			// Add cover image if it was present before but not after (or changed)
			if (oldCoverImageUrl && oldCoverImageUrl !== newCoverImageUrl) {
				allImagesToDelete.add(oldCoverImageUrl);
			}

			const updatedItem = await existingItem.save();

			// 4. Delete files from disk
			if (allImagesToDelete.size > 0) {
				allImagesToDelete.forEach((filePath) => {
					try {
						if (filePath && !filePath.startsWith("http")) {
							const deleted = fileUpload.deleteFileByWebPath(filePath);
							if (deleted) console.log("已刪除舊圖片:", filePath);
						}
					} catch (deleteError) {
						console.error("刪除舊圖片失敗:", filePath, deleteError);
					}
				});
			}

			// Format the Mongoose document before sending the response
			const formattedUpdatedItem = this.entityService.formatOutput(updatedItem);
			this._sendResponse(res, StatusCodes.OK, `${this.entityName} 更新成功`, { [this.responseKey]: formattedUpdatedItem });
		} catch (error) {
			if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
				this._handleError(new ApiError(StatusCodes.CONFLICT, "Slug 已存在 (如果slug仍要求unique)"), "更新", next);
			} else {
				this._handleError(error, "更新", next);
			}
		}
	};

	deleteItem = async (req, res, next) => {
		try {
			const { id } = req.params;
			const itemToDelete = await this.model.findById(id).lean();
			if (!itemToDelete) throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);

			await this.entityService.delete(id);

			// After DB deletion, delete the entire news item's directory
			if (itemToDelete._id && itemToDelete.title?.TW) {
				fileUpload.deleteNewsItemDirectory(itemToDelete._id.toString(), itemToDelete.title.TW);
			}

			res.status(StatusCodes.OK).json({ success: true, message: `${this.entityName} 刪除成功` });
		} catch (error) {
			this._handleError(error, "刪除", next);
		}
	};
}

// 需要在文件頂部引入 fs
// import fs from 'fs'; // 如果 deleteDirectory 中沒有 fs.existsSync
// 實際上 fileUpload.js 中已有 fs，此處控制器不需要直接引入。

export default new NewsController();
