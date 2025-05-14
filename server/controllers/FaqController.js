import Faq from "../models/Faq.js";
import { EntityController } from "./EntityController.js";
import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import { Permissions } from "../middlewares/permission.js";
import fileUpload from "../utils/fileUpload.js";

class FaqController extends EntityController {
	constructor() {
		super(Faq, {
			entityName: "faqs",
			responseKey: "faqs",
			basicFields: [
				"question",
				"answer",
				"category",
				"isActive",
				"publishDate",
				"order",
				"author",
				"productModel",
				"videoUrl",
				"imageUrl",
				"createdAt",
				"updatedAt"
			]
		});
		if (this._prepareFaqData) {
			this._prepareFaqData = this._prepareFaqData.bind(this);
		}
	}

	async _prepareFaqData(req, isUpdate = false, existingFaq = null) {
		let rawData;
		if (req.is("multipart/form-data") && req.body.faqDataPayload) {
			try {
				rawData = JSON.parse(req.body.faqDataPayload);
			} catch (e) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "無法解析 faqDataPayload JSON 字串");
			}
		} else {
			rawData = { ...req.body };
		}

		const data = { ...rawData };
		const files = req.files || {};
		const userRole = req.accessContext?.userRole;

		let imageUploadTasks = [];
		let videoUploadTask = null;
		let imagePathsToDelete = [];
		let videoPathToDelete = null;

		if (isUpdate && data._id) {
			delete data._id;
		}

		const pendingImageFiles = files.faqImages || [];
		const pendingVideoFile = files.faqVideoFile?.[0];

		if (data.question && data.question.TW) {
			data.faqQuestionTw = data.question.TW;
		} else if (isUpdate && existingFaq?.question?.TW) {
			data.faqQuestionTw = existingFaq.question.TW;
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "問題為必填");
		}

		if (!data.question?.TW && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文問題為必填");
		if (!data.answer?.TW && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文答案為必填");
		if (!data.author && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "作者為必填");
		if (!data.category && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "分類為必填");

		if (data.category !== undefined && data.category !== null) {
			data.category = String(data.category).trim();
		} else if (data.category === null && isUpdate) {
			data.category = null;
		} else if (!isUpdate && data.category === undefined) {
			data.category = "";
			if (!data.category && !isUpdate) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "分類為必填");
			}
		}

		if (data.order !== undefined) {
			const orderNum = parseInt(data.order, 10);
			if (isNaN(orderNum)) {
				data.order = 0;
			} else {
				data.order = orderNum;
			}
		} else if (!isUpdate) {
			data.order = 0;
		}

		if (data.productModel !== undefined) {
			data.productModel = String(data.productModel || "").trim() || null;
		}

		if (isUpdate && existingFaq) {
			const existingImageUrls = existingFaq.imageUrl || [];
			const clientImageUrls = Array.isArray(data.imageUrl) ? data.imageUrl : [];
			const finalImageUrlsWithMarkers = [];
			let newImageFileCounter = 0;

			clientImageUrls.forEach((urlOrMarker) => {
				if (typeof urlOrMarker === "string" && urlOrMarker.startsWith("__NEW_IMAGE_MARKER_")) {
					const fileIndex = parseInt(urlOrMarker.split("_").pop(), 10);
					if (pendingImageFiles[fileIndex]) {
						const marker = `__UPLOAD_IMAGE_PLACEHOLDER_${newImageFileCounter}__`;
						imageUploadTasks.push({ file: pendingImageFiles[fileIndex], marker });
						finalImageUrlsWithMarkers.push(marker);
						newImageFileCounter++;
					}
				} else if (typeof urlOrMarker === "string" && urlOrMarker.trim() !== "") {
					finalImageUrlsWithMarkers.push(urlOrMarker.trim());
				}
			});
			data.imageUrl = finalImageUrlsWithMarkers;

			const finalImageUrlSet = new Set(finalImageUrlsWithMarkers.filter((url) => !url.startsWith("__UPLOAD_IMAGE_PLACEHOLDER_")));
			existingImageUrls.forEach((oldUrl) => {
				if (!finalImageUrlSet.has(oldUrl) && oldUrl && !oldUrl.startsWith("http")) {
					imagePathsToDelete.push(oldUrl);
				}
			});

			if (data.videoUrl === "__NEW_VIDEO_MARKER__" && pendingVideoFile) {
				const marker = "__UPLOAD_VIDEO_PLACEHOLDER__";
				videoUploadTask = { file: pendingVideoFile, marker };
				data.videoUrl = marker;
				if (existingFaq.videoUrl && existingFaq.videoUrl.startsWith("/storage")) {
					videoPathToDelete = existingFaq.videoUrl;
				}
			} else if (data.videoUrl === null || data.videoUrl === "") {
				data.videoUrl = null;
				if (existingFaq.videoUrl && existingFaq.videoUrl.startsWith("/storage")) {
					videoPathToDelete = existingFaq.videoUrl;
				}
			} else if (data.videoUrl && typeof data.videoUrl === "string") {
				data.videoUrl = data.videoUrl.trim();
				if (existingFaq.videoUrl && existingFaq.videoUrl.startsWith("/storage") && existingFaq.videoUrl !== data.videoUrl) {
					videoPathToDelete = existingFaq.videoUrl;
				}
			} else if (data.videoUrl === undefined) {
				delete data.videoUrl;
			}
		} else if (!isUpdate) {
			data._pendingFaqImageFiles = pendingImageFiles;
			data._pendingFaqVideoFile = pendingVideoFile;
			data.imageUrl = [];
			data.videoUrl = null;
		}

		if (userRole !== Permissions.ADMIN) {
			if (!isUpdate) data.isActive = false;
			else delete data.isActive;
		} else {
			if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
				throw new ApiError(StatusCodes.BAD_REQUEST, `isActive 欄位必須是布林值`);
			}
			if (!isUpdate && data.isActive === undefined) data.isActive = false;
		}

		if (data.publishDate !== undefined) {
			if (data.publishDate === "" || data.publishDate === null) {
				data.publishDate = null;
			} else {
				const parsedDate = new Date(data.publishDate);
				if (isNaN(parsedDate.getTime())) throw new ApiError(StatusCodes.BAD_REQUEST, "發布日期格式無效");
				data.publishDate = parsedDate;
			}
		} else if (!isUpdate) {
			delete data.publishDate;
		}

		if (data.imageUrl && !isUpdate && !Array.isArray(data.imageUrl)) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "imageUrl 必須是一個陣列");
		}

		return {
			processedData: data,
			...(isUpdate && {
				imageUploadTasks,
				videoUploadTask,
				imagePathsToDelete,
				videoPathToDelete
			})
		};
	}

	createItem = async (req, res, next) => {
		let rawNewItem;
		try {
			const { processedData } = await this._prepareFaqData(req, false, null);

			const pendingImageFiles = processedData._pendingFaqImageFiles || [];
			const pendingVideoFile = processedData._pendingFaqVideoFile;

			delete processedData._pendingFaqImageFiles;
			delete processedData._pendingFaqVideoFile;
			const faqQuestionTwForPath = processedData.faqQuestionTw;
			delete processedData.faqQuestionTw;

			rawNewItem = await this.entityService.create(processedData, {
				session: req.dbSession,
				returnRawInstance: true
			});

			let itemChangedByFileUpload = false;
			const uploadedImageUrls = [];
			for (const file of pendingImageFiles) {
				try {
					const newUrl = fileUpload.saveEntityAsset(file.buffer, "faqs", rawNewItem._id.toString(), faqQuestionTwForPath, "faq_item_image", file.originalname);
					uploadedImageUrls.push(newUrl);
					itemChangedByFileUpload = true;
				} catch (uploadError) {
					console.error("FAQ 圖片上傳失敗 (create - multiple):", uploadError);
				}
			}
			if (itemChangedByFileUpload) {
				rawNewItem.imageUrl = uploadedImageUrls;
			}

			if (pendingVideoFile) {
				try {
					const newVideoUrl = fileUpload.saveEntityAsset(
						pendingVideoFile.buffer,
						"faqs",
						rawNewItem._id.toString(),
						faqQuestionTwForPath,
						"faq_item_video",
						pendingVideoFile.originalname
					);
					rawNewItem.videoUrl = newVideoUrl;
					itemChangedByFileUpload = true;
				} catch (uploadError) {
					console.error("FAQ 影片上傳失敗 (create):", uploadError);
				}
			}

			if (itemChangedByFileUpload) {
				rawNewItem = await rawNewItem.save({ session: req.dbSession });
			}

			const formattedNewItem = this.entityService.formatOutput(rawNewItem);
			this._sendResponse(res, StatusCodes.CREATED, `${this.entityName} 創建成功`, { [this.responseKey]: formattedNewItem });
		} catch (error) {
			this._handleError(error, "創建", next);
		}
	};

	updateItem = async (req, res, next) => {
		try {
			const { id } = req.params;
			const existingItem = await this.model.findById(id);
			if (!existingItem) throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);

			const { processedData, imageUploadTasks, videoUploadTask, imagePathsToDelete, videoPathToDelete } = await this._prepareFaqData(req, true, existingItem);

			const faqId = existingItem._id.toString();
			const faqQuestionForPath = processedData.faqQuestionTw || existingItem.question?.TW || "untitled_faq";

			delete processedData.faqQuestionTw;

			const updatePayload = { ...processedData };
			const markerToUrlMap = {};

			if (imageUploadTasks && imageUploadTasks.length > 0) {
				for (const task of imageUploadTasks) {
					try {
						const newUrl = fileUpload.saveEntityAsset(task.file.buffer, "faqs", faqId, faqQuestionForPath, "faq_item_image", task.file.originalname);
						markerToUrlMap[task.marker] = newUrl;
					} catch (uploadError) {
						console.error(`FAQ 圖片上傳失敗 (update for marker ${task.marker}):`, uploadError);
						markerToUrlMap[task.marker] = null;
					}
				}
			}

			if (updatePayload.imageUrl && Array.isArray(updatePayload.imageUrl)) {
				updatePayload.imageUrl = updatePayload.imageUrl
					.map((urlOrMarker) => (markerToUrlMap[urlOrMarker] !== undefined ? markerToUrlMap[urlOrMarker] : urlOrMarker))
					.filter((url) => url !== null);
			}

			if (videoUploadTask && videoUploadTask.file) {
				try {
					const newVideoUrl = fileUpload.saveEntityAsset(
						videoUploadTask.file.buffer,
						"faqs",
						faqId,
						faqQuestionForPath,
						"faq_item_video",
						videoUploadTask.file.originalname
					);
					markerToUrlMap[videoUploadTask.marker] = newVideoUrl;
				} catch (uploadError) {
					console.error(`FAQ 影片上傳失敗 (update for marker ${videoUploadTask.marker}):`, uploadError);
					markerToUrlMap[videoUploadTask.marker] = null;
				}
			}

			if (updatePayload.videoUrl && markerToUrlMap[updatePayload.videoUrl] !== undefined) {
				updatePayload.videoUrl = markerToUrlMap[updatePayload.videoUrl];
			} else if (updatePayload.videoUrl === null && !videoUploadTask) {
				updatePayload.videoUrl = null;
			}

			if (videoUploadTask && videoUploadTask.marker === updatePayload.videoUrl && markerToUrlMap[videoUploadTask.marker] === null) {
				updatePayload.videoUrl = existingItem.videoUrl;
			}

			Object.keys(updatePayload).forEach((key) => {
				if (updatePayload[key] !== undefined || key === "imageUrl" || key === "videoUrl") {
					existingItem[key] = updatePayload[key];
				}
			});

			const updatedItem = await existingItem.save({ session: req.dbSession });

			if (imagePathsToDelete && imagePathsToDelete.length > 0) {
				imagePathsToDelete.forEach((filePath) => {
					try {
						if (filePath && filePath.startsWith("/storage")) {
							fileUpload.deleteFileByWebPath(filePath);
							console.log("已刪除舊 FAQ 圖片:", filePath);
						}
					} catch (deleteError) {
						console.error("刪除舊 FAQ 圖片失敗:", filePath, deleteError);
					}
				});
			}

			if (videoPathToDelete) {
				try {
					if (videoPathToDelete.startsWith("/storage")) {
						fileUpload.deleteFileByWebPath(videoPathToDelete);
						console.log("已刪除舊 FAQ 影片:", videoPathToDelete);
					}
				} catch (deleteError) {
					console.error("刪除舊 FAQ 影片失敗:", videoPathToDelete, deleteError);
				}
			}

			const formattedUpdatedItem = this.entityService.formatOutput(updatedItem);
			this._sendResponse(res, StatusCodes.OK, `${this.entityName} 更新成功`, { [this.responseKey]: formattedUpdatedItem });
		} catch (error) {
			this._handleError(error, "更新", next);
		}
	};

	deleteItem = async (req, res, next) => {
		try {
			const { id } = req.params;
			const itemToDelete = await this.model.findById(id).lean();
			if (!itemToDelete) throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);

			await this.entityService.delete(id, { session: req.dbSession });

			const questionForPath = itemToDelete.question?.TW || (itemToDelete.question && Object.values(itemToDelete.question)[0]) || "untitled_faq";
			fileUpload.deleteEntityAssetDirectory("faqs", itemToDelete._id.toString(), questionForPath);

			res.status(StatusCodes.OK).json({ success: true, message: `${this.entityName} 刪除成功` });
		} catch (error) {
			this._handleError(error, "刪除", next);
		}
	};
}

export default new FaqController();
