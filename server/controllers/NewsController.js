import News from "../models/News.js";
import { EntityController } from "./EntityController.js";
import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import fileUpload from "../utils/fileUpload.js"; // 引入統一的檔案處理工具
import path from "path"; // 引入 path 模塊
import fs from "fs"; // 引入 fs 模塊
import { Permissions } from "../middlewares/permission.js"; // 導入 Permissions

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
					throw new ApiError(StatusCodes.BAD_REQUEST, "richText 項目缺少有效的 richTextData 物件");
				}
				if (!item.richTextData.TW || typeof item.richTextData.TW !== "object" || !item.richTextData.EN || typeof item.richTextData.EN !== "object") {
					throw new ApiError(StatusCodes.BAD_REQUEST, "richTextdata 必須包含 TW 和 EN 物件");
				}
				if (item.richTextData.TW.type !== "doc" || item.richTextData.EN.type !== "doc") {
					console.warn("Rich text data for TW or EN might not be a valid Tiptap document structure (missing type: 'doc')");
				}
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
				delete item.richTextData;
				delete item.videoEmbedUrl;
				delete item.videoCaption;
				break;
			case "videoEmbed":
				// Allow videoEmbedUrl to be a marker like "__NEW_CONTENT_VIDEO__" or an actual URL string
				if (
					item.videoEmbedUrl !== undefined &&
					item.videoEmbedUrl !== null &&
					typeof item.videoEmbedUrl !== "string" &&
					item.videoEmbedUrl !== "__NEW_CONTENT_VIDEO__"
				) {
					throw new ApiError(StatusCodes.BAD_REQUEST, "videoEmbed 項目 videoEmbedUrl 格式無效");
				}
				if (item.videoCaption && typeof item.videoCaption !== "object") throw new ApiError(StatusCodes.BAD_REQUEST, "videoCaption 格式無效");
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
			entityName: "news",
			responseKey: "news",
			// 調整 basicFields 移除 status
			basicFields: ["title", "category", "isActive", "publishDate", "author", "summary", "coverImageUrl", "createdAt", "updatedAt"]
		});
		if (this._prepareNewsData) {
			this._prepareNewsData = this._prepareNewsData.bind(this);
		}
	}

	async _prepareNewsData(req, isUpdate = false, existingNews = null) {
		let rawData;
		if (req.is("multipart/form-data") && req.body.newsDataPayload) {
			try {
				rawData = JSON.parse(req.body.newsDataPayload);
			} catch (e) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "無法解析 newsDataPayload JSON 字串");
			}
		} else {
			rawData = { ...req.body };
		}

		const data = { ...rawData };
		const files = req.files || {};
		const userRole = req.accessContext?.userRole; // 從 accessContext 獲取角色

		if (isUpdate && data._id) {
			delete data._id;
		}

		data._pendingCoverFile = files.coverImage?.[0];
		data._pendingContentImageFiles = files.contentImages || []; // Renamed for clarity
		data._pendingContentVideoFiles = files.contentVideoFiles || []; // NEW: pending video files

		let imagesToDeletePaths = [];
		let videosToDeletePaths = []; // NEW: for videos to delete

		let currentContentImageFileIndex = 0;
		let currentContentVideoFileIndex = 0; // NEW: index for video files

		if (data.title !== undefined) {
			if (typeof data.title !== "object" || !data.title.TW) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文標題為必填，或標題格式錯誤");
			}
			data.newsTitleTw = data.title.TW;
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少標題欄位");
		} else if (existingNews) {
			data.newsTitleTw = existingNews.title?.TW || data.title?.TW;
		}

		if (data.content !== undefined) {
			try {
				if (Array.isArray(data.content)) {
					data.content.forEach((item) => {
						if ((item.itemType === "image" || item.itemType === "videoEmbed") && item.richTextData) {
							delete item.richTextData;
						}
					});
				}
				validateContentItems(data.content);
			} catch (validationError) {
				throw validationError;
			}
			if (Array.isArray(data.content)) {
				data.content.forEach((block) => {
					if (block.itemType === "image") {
						const wantsNewImageForBlock = block.imageUrl === "__NEW_CONTENT_IMAGE__";
						if (wantsNewImageForBlock && data._pendingContentImageFiles[currentContentImageFileIndex]) {
							block._pendingFile = data._pendingContentImageFiles[currentContentImageFileIndex];
							currentContentImageFileIndex++;
							if (isUpdate && existingNews) {
								const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
								if (existingBlockInNews?.imageUrl && !existingBlockInNews.imageUrl.startsWith("http")) {
									imagesToDeletePaths.push(existingBlockInNews.imageUrl);
								}
							}
							block.imageUrl = ""; // Will be replaced by uploaded file path
						} else if (isUpdate && block.imageUrl === null && existingNews) {
							// Explicitly removing an image
							const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
							if (existingBlockInNews?.imageUrl && !existingBlockInNews.imageUrl.startsWith("http")) {
								imagesToDeletePaths.push(existingBlockInNews.imageUrl);
							}
						}
					} else if (block.itemType === "videoEmbed") {
						// NEW: Handle video blocks
						const wantsNewVideoForBlock = block.videoEmbedUrl === "__NEW_CONTENT_VIDEO__";
						if (wantsNewVideoForBlock && data._pendingContentVideoFiles[currentContentVideoFileIndex]) {
							block._pendingVideoFile = data._pendingContentVideoFiles[currentContentVideoFileIndex];
							currentContentVideoFileIndex++;
							if (isUpdate && existingNews) {
								const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
								if (existingBlockInNews?.videoEmbedUrl && existingBlockInNews.videoEmbedUrl.startsWith("/storage")) {
									videosToDeletePaths.push(existingBlockInNews.videoEmbedUrl);
								}
							}
							block.videoEmbedUrl = ""; // Will be replaced by uploaded file path
						} else if (isUpdate && block.videoEmbedUrl === null && existingNews) {
							// Explicitly removing a video
							const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
							if (existingBlockInNews?.videoEmbedUrl && existingBlockInNews.videoEmbedUrl.startsWith("/storage")) {
								videosToDeletePaths.push(existingBlockInNews.videoEmbedUrl);
							}
						}
					}
				});
			}
		} else if (!isUpdate) {
			data.content = [];
		} else if (isUpdate && data.content === null) {
			// If client sends null for content, means remove all content
			data.content = [];
			if (existingNews?.content) {
				existingNews.content.forEach((block) => {
					if (block.itemType === "image" && block.imageUrl && !block.imageUrl.startsWith("http")) {
						imagesToDeletePaths.push(block.imageUrl);
					}
					if (block.itemType === "videoEmbed" && block.videoEmbedUrl && block.videoEmbedUrl.startsWith("/storage")) {
						videosToDeletePaths.push(block.videoEmbedUrl);
					}
				});
			}
		}

		if (data.category !== undefined) {
			const validCategories = News.schema.path("category").enumValues;
			if (!validCategories.includes(data.category)) {
				throw new ApiError(StatusCodes.BAD_REQUEST, `無效的分類：${data.category}`);
			}
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少分類欄位");
		}

		if (data.summary !== undefined) {
			if (typeof data.summary !== "object") {
				throw new ApiError(StatusCodes.BAD_REQUEST, "摘要格式無效或解析錯誤");
			}
		}

		if (data.publishDate !== undefined) {
			if (data.publishDate === "" || data.publishDate === null) {
				if (isUpdate && (data.publishDate === null || data.publishDate === "")) {
					data.publishDate = null;
				} else if (!isUpdate && (data.publishDate === null || data.publishDate === "")) {
					delete data.publishDate;
				}
			} else {
				const parsedDate = new Date(data.publishDate);
				if (isNaN(parsedDate.getTime())) {
					throw new ApiError(StatusCodes.BAD_REQUEST, "發布日期格式無效");
				}
				data.publishDate = parsedDate;
			}
		} else if (!isUpdate) {
			delete data.publishDate;
		}

		if (userRole !== Permissions.ADMIN) {
			if (!isUpdate) {
				data.isActive = false;
			} else {
				delete data.isActive;
			}
		} else {
			if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
				throw new ApiError(StatusCodes.BAD_REQUEST, `isActive 欄位必須是布林值`);
			}
			if (!isUpdate && data.isActive === undefined) {
				data.isActive = false;
			}
		}

		const wantsNewCover = data.coverImageUrl === "__NEW_COVER__";
		if (wantsNewCover && data._pendingCoverFile) {
			if (isUpdate && existingNews?.coverImageUrl && !existingNews.coverImageUrl.startsWith("http")) {
				imagesToDeletePaths.push(existingNews.coverImageUrl);
			}
			data.coverImageUrl = ""; // Will be replaced by uploaded file path
		} else if (isUpdate && data.coverImageUrl === null && existingNews?.coverImageUrl && !existingNews.coverImageUrl.startsWith("http")) {
			imagesToDeletePaths.push(existingNews.coverImageUrl);
		} else if (!wantsNewCover && data.coverImageUrl !== undefined) {
			// Keep existing URL or client provided external URL
		} else if (isUpdate && data.coverImageUrl === undefined) {
			delete data.coverImageUrl; // No change intended to cover image
		} else if (!isUpdate && data.coverImageUrl === undefined) {
			data.coverImageUrl = null; // Default to null if not provided during creation and not a new cover upload
		}

		return { processedData: data, imagesToDelete: imagesToDeletePaths, videosToDelete: videosToDeletePaths }; // Return videosToDeletePaths
	}

	createItem = async (req, res, next) => {
		let rawNewItem;
		try {
			const { processedData } = await this._prepareNewsData(req, false, null);

			if (!processedData.author) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "作者欄位為必填");
			}

			const newsTitleForPath = processedData.newsTitleTw || "untitled_news";
			const pendingCoverFile = processedData._pendingCoverFile;
			const pendingContentImageFiles = processedData._pendingContentImageFiles || [];
			const pendingContentVideoFiles = processedData._pendingContentVideoFiles || [];

			delete processedData._pendingCoverFile;
			delete processedData._pendingContentImageFiles;
			delete processedData._pendingContentVideoFiles;
			const newsTitleTwForPath = processedData.newsTitleTw; // Keep for path generation
			delete processedData.newsTitleTw;

			if (Array.isArray(processedData.content)) {
				processedData.content.forEach((block) => {
					delete block._tempClientKey;
					delete block._pendingFile; // For images
					delete block._pendingVideoFile; // For videos
					if ((block.itemType === "image" || block.itemType === "videoEmbed") && block.richTextData) {
						delete block.richTextData;
					}
				});
			}
			processedData.coverImageUrl = undefined; // Will be set after upload if file exists

			rawNewItem = await this.entityService.create(processedData, {
				session: req.dbSession,
				returnRawInstance: true
			});

			const newsId = rawNewItem._id.toString();
			let itemChangedByFileUpload = false;

			if (pendingCoverFile) {
				try {
					rawNewItem.coverImageUrl = fileUpload.saveEntityAsset(
						pendingCoverFile.buffer,
						"news",
						newsId,
						newsTitleTwForPath,
						"news_cover",
						pendingCoverFile.originalname
					);
					itemChangedByFileUpload = true;
				} catch (e) {
					console.error("封面圖片上傳失敗:", e);
				}
			}

			// Process content images and videos
			if (Array.isArray(rawNewItem.content)) {
				// Retrieve the pending files from the original processedData before they were deleted
				// This assumes the order and structure of content blocks in rawNewItem matches processedData.content
				const originalContentBlocks = (await this._prepareNewsData(req, false, null)).processedData.content || [];
				let currentImageFileIndex = 0;
				let currentVideoFileIndex = 0;

				for (let blockIndex = 0; blockIndex < rawNewItem.content.length; blockIndex++) {
					const blockInRawItem = rawNewItem.content[blockIndex];
					// Find the corresponding original block that might have _pendingFile or _pendingVideoFile
					// This relies on the content arrays maintaining their order and not having IDs yet for new items.
					const originalBlockData = originalContentBlocks[blockIndex];

					if (originalBlockData?.itemType === "image" && originalBlockData.imageUrl === "" && originalBlockData._pendingFile) {
						try {
							const imageUrl = fileUpload.saveEntityAsset(
								originalBlockData._pendingFile.buffer,
								"news",
								newsId,
								newsTitleTwForPath,
								"news_content_image",
								originalBlockData._pendingFile.originalname
							);
							blockInRawItem.imageUrl = imageUrl;
							itemChangedByFileUpload = true;
						} catch (uploadError) {
							console.error(`內容圖片上傳失敗 (original index ${blockIndex}):`, uploadError);
							blockInRawItem.imageUrl = null;
						}
					} else if (originalBlockData?.itemType === "videoEmbed" && originalBlockData.videoEmbedUrl === "" && originalBlockData._pendingVideoFile) {
						try {
							const videoUrl = fileUpload.saveEntityAsset(
								originalBlockData._pendingVideoFile.buffer,
								"news",
								newsId,
								newsTitleTwForPath,
								"news_content_video",
								originalBlockData._pendingVideoFile.originalname
							);
							blockInRawItem.videoEmbedUrl = videoUrl;
							itemChangedByFileUpload = true;
						} catch (uploadError) {
							console.error(`內容影片上傳失敗 (original index ${blockIndex}):`, uploadError);
							blockInRawItem.videoEmbedUrl = null;
						}
					}
				}
			}

			if (itemChangedByFileUpload) {
				rawNewItem = await rawNewItem.save({ session: req.dbSession });
			}

			const formattedNewItem = this.entityService.formatOutput(rawNewItem);
			this._sendResponse(res, StatusCodes.CREATED, `${this.entityName} 創建成功`, { [this.responseKey]: formattedNewItem });
		} catch (error) {
			if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
				this._handleError(new ApiError(StatusCodes.CONFLICT, "Slug 已存在"), "創建", next);
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

			// Store old file paths before _prepareNewsData modifies them or existingItem
			const oldCoverUrl = existingItem.coverImageUrl && existingItem.coverImageUrl.startsWith("/storage") ? existingItem.coverImageUrl : null;
			const oldContentFiles = new Set();
			if (existingItem.content && Array.isArray(existingItem.content)) {
				existingItem.content.forEach((block) => {
					if (block.itemType === "image" && block.imageUrl && block.imageUrl.startsWith("/storage")) {
						oldContentFiles.add(block.imageUrl);
					}
					if (block.itemType === "videoEmbed" && block.videoEmbedUrl && block.videoEmbedUrl.startsWith("/storage")) {
						oldContentFiles.add(block.videoEmbedUrl);
					}
				});
			}

			const {
				processedData,
				imagesToDelete: filesToDeleteFromPrepare, // Renamed for clarity, these are determined by _prepareNewsData
				videosToDelete: additionalVideosToDeleteFromPrepare // also determined by _prepareNewsData
			} = await this._prepareNewsData(req, true, existingItem);

			const newsId = existingItem._id.toString();
			const newsTitleForPath = processedData.newsTitleTw || existingItem.title?.TW || "untitled_news";

			const pendingCoverFile = processedData._pendingCoverFile;
			// We need the original pending files from processedData before they are deleted
			// These are attached to the content blocks themselves by _prepareNewsData

			delete processedData._pendingCoverFile;
			delete processedData._pendingContentImageFiles; // These are now on individual content blocks
			delete processedData._pendingContentVideoFiles; // These are now on individual content blocks
			const newsTitleTwForPath = processedData.newsTitleTw; // Keep for path generation in uploads
			delete processedData.newsTitleTw;
			if (Array.isArray(processedData.content)) {
				processedData.content.forEach((block) => {
					delete block._tempClientKey;
					// _pendingFile and _pendingVideoFile are kept for upload logic below
					if ((block.itemType === "image" || block.itemType === "videoEmbed") && block.richTextData) {
						delete block.richTextData;
					}
				});
			}

			const updatePayload = { ...processedData };

			if (pendingCoverFile) {
				try {
					updatePayload.coverImageUrl = fileUpload.saveEntityAsset(
						pendingCoverFile.buffer,
						"news",
						newsId,
						newsTitleTwForPath, // Use the stored title for path
						"news_cover",
						pendingCoverFile.originalname
					);
				} catch (e) {
					console.error("封面圖片更新上傳失敗:", e);
					// If upload fails, do not change updatePayload.coverImageUrl; it will either be null (if client removed) or undefined (no change from client)
					// So, if it was meant to be replaced, it will revert to not changing it, or if it was meant to be null, it stays null.
					if (updatePayload.coverImageUrl === "") {
						// It was marked for new upload
						updatePayload.coverImageUrl = oldCoverUrl; // Revert to old on failure if it was an upload attempt
					} else {
						delete updatePayload.coverImageUrl; // No change if it wasn't an upload attempt
					}
				}
			} else if (updatePayload.coverImageUrl === "") {
				// Marked for new upload but no file provided
				updatePayload.coverImageUrl = oldCoverUrl; // Revert to old
			}
			// If updatePayload.coverImageUrl is null, it means client wants to remove it.
			// If updatePayload.coverImageUrl is undefined, client didn't send it, meaning no change to cover.

			// Update content images and videos
			if (Array.isArray(updatePayload.content)) {
				for (let i = 0; i < updatePayload.content.length; i++) {
					const block = updatePayload.content[i];
					const existingBlockEquivalent = existingItem.content.find((b) => b._id?.toString() === block._id?.toString());

					if (block.itemType === "image" && block._pendingFile) {
						try {
							block.imageUrl = fileUpload.saveEntityAsset(
								block._pendingFile.buffer,
								"news",
								newsId,
								newsTitleTwForPath,
								"news_content_image",
								block._pendingFile.originalname
							);
						} catch (e) {
							console.error(`內容圖片更新上傳失敗 for block (ID: ${block._id || "new"}):`, e);
							block.imageUrl = existingBlockEquivalent?.imageUrl || null;
						}
						delete block._pendingFile; // Clean up after processing
					} else if (block.itemType === "image" && block.imageUrl === "") {
						// Marked for new image but no file was available in _pendingFile (e.g. error in _prepareNewsData or client issue)
						block.imageUrl = existingBlockEquivalent?.imageUrl || null;
					}

					if (block.itemType === "videoEmbed" && block._pendingVideoFile) {
						try {
							block.videoEmbedUrl = fileUpload.saveEntityAsset(
								block._pendingVideoFile.buffer,
								"news",
								newsId,
								newsTitleTwForPath,
								"news_content_video",
								block._pendingVideoFile.originalname
							);
						} catch (e) {
							console.error(`內容影片更新上傳失敗 for block (ID: ${block._id || "new"}):`, e);
							block.videoEmbedUrl = existingBlockEquivalent?.videoEmbedUrl || null;
						}
						delete block._pendingVideoFile; // Clean up after processing
					} else if (block.itemType === "videoEmbed" && block.videoEmbedUrl === "") {
						block.videoEmbedUrl = existingBlockEquivalent?.videoEmbedUrl || null;
					}
				}
			}

			Object.keys(updatePayload).forEach((key) => {
				if (updatePayload[key] !== undefined || key === "coverImageUrl" || key === "content") {
					existingItem[key] = updatePayload[key];
				}
			});

			// Determine all files to delete
			// Start with files identified for deletion by _prepareNewsData
			const allFilesToDelete = new Set([...filesToDeleteFromPrepare, ...additionalVideosToDeleteFromPrepare]);

			// _prepareNewsData should now be the single source of truth for deletions.
			// The logic below that re-calculates deletions based on old vs new state is redundant if _prepareNewsData is correct.
			// For safety during refactor, we keep it but it should eventually be removed.

			// // Check cover image
			// const newCoverUrl = existingItem.coverImageUrl && existingItem.coverImageUrl.startsWith("/storage") ? existingItem.coverImageUrl : null;
			// if (oldCoverUrl && oldCoverUrl !== newCoverUrl) {
			// 	allFilesToDelete.add(oldCoverUrl);
			// }

			// // Check content files
			// const newContentFiles = new Set();
			// if (existingItem.content && Array.isArray(existingItem.content)) {
			// 	existingItem.content.forEach(block => {
			// 		if (block.itemType === "image" && block.imageUrl && block.imageUrl.startsWith("/storage")) {
			// 			newContentFiles.add(block.imageUrl);
			// 		}
			// 		if (block.itemType === "videoEmbed" && block.videoEmbedUrl && block.videoEmbedUrl.startsWith("/storage")) {
			// 			newContentFiles.add(block.videoEmbedUrl);
			// 		}
			// 	});
			// }
			// oldContentFiles.forEach(oldFile => {
			// 	if (!newContentFiles.has(oldFile)) {
			// 		allFilesToDelete.add(oldFile);
			// 	}
			// });

			const updatedItem = await existingItem.save({ session: req.dbSession });

			if (allFilesToDelete.size > 0) {
				allFilesToDelete.forEach((filePath) => {
					try {
						if (filePath && filePath.startsWith("/storage")) {
							const deleted = fileUpload.deleteFileByWebPath(filePath);
							if (deleted) console.log("已刪除舊檔案 (圖片或影片):", filePath);
						}
					} catch (deleteError) {
						console.error("刪除舊檔案失敗:", filePath, deleteError);
					}
				});
			}

			const formattedUpdatedItem = this.entityService.formatOutput(updatedItem);
			this._sendResponse(res, StatusCodes.OK, `${this.entityName} 更新成功`, { [this.responseKey]: formattedUpdatedItem });
		} catch (error) {
			if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
				this._handleError(new ApiError(StatusCodes.CONFLICT, "Slug 已存在"), "更新", next);
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

			await this.entityService.delete(id, { session: req.dbSession });

			if (itemToDelete._id) {
				const titleForPath = typeof itemToDelete.title?.TW === "string" ? itemToDelete.title.TW : "untitled_news";
				fileUpload.deleteEntityAssetDirectory("news", itemToDelete._id.toString(), titleForPath);
			}

			res.status(StatusCodes.OK).json({ success: true, message: `${this.entityName} 刪除成功` });
		} catch (error) {
			this._handleError(error, "刪除", next);
		}
	};
}

export default new NewsController();
