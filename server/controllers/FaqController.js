import Faq from "../models/Faq.js";
import { EntityController } from "./EntityController.js";
import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";

class FaqController extends EntityController {
	constructor() {
		super(Faq, {
			entityName: "Faq",
			responseKey: "faq",
			basicFields: ["question", "answer", "category", "isActive", "order", "author", "metaTitle", "metaDescription", "createdAt", "updatedAt"]
		});
		if (this._prepareFaqData) {
			this._prepareFaqData = this._prepareFaqData.bind(this);
		}
	}

	async _prepareFaqData(req, isUpdate = false, existingFaq = null) {
		const data = { ...req.body };

		if (isUpdate && data._id) {
			delete data._id;
		}

		if (data.question !== undefined) {
			if (typeof data.question !== "object" || !data.question.TW) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文問題為必填，或問題格式錯誤");
			}
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少問題欄位");
		}

		if (data.answer !== undefined) {
			if (typeof data.answer !== "object" || !data.answer.TW) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文答案為必填，或答案格式錯誤");
			}
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少答案欄位");
		}

		if (data.category !== undefined && data.category !== null) {
			data.category = String(data.category).trim();
		} else if (data.category === null && isUpdate) {
			data.category = null;
		} else if (!isUpdate && data.category === undefined) {
			data.category = "";
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

		if (data.isActive !== undefined) {
			data.isActive = String(data.isActive).toLowerCase() === "true";
		} else if (!isUpdate) {
			data.isActive = true;
		}

		if (isUpdate) {
			delete data.author;
		} else if (req.user && req.user._id) {
			data.author = req.user._id;
		}

		const seoFields = ["metaTitle", "metaDescription"];
		for (const field of seoFields) {
			if (data[field] !== undefined) {
				if (typeof data[field] !== "object" && data[field] !== null) {
					throw new ApiError(StatusCodes.BAD_REQUEST, `${field} 格式無效 (應為物件或 null)`);
				}
			}
		}
		return { processedData: data };
	}

	createItem = async (req, res, next) => {
		try {
			const { processedData } = await this._prepareFaqData(req, false, null);

			const newFaq = await this.entityService.create(processedData, {
				session: req.dbSession
			});
			this._sendResponse(res, StatusCodes.CREATED, `${this.entityName} 創建成功`, { [this.responseKey]: newFaq });
		} catch (error) {
			this._handleError(error, "創建", next);
		}
	};

	updateItem = async (req, res, next) => {
		try {
			const { id } = req.params;
			const existingFaq = await this.model.findById(id);
			if (!existingFaq) {
				throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);
			}

			const { processedData } = await this._prepareFaqData(req, true, existingFaq);

			const updatedFaq = await this.entityService.update(id, processedData, {
				session: req.dbSession
			});
			this._sendResponse(res, StatusCodes.OK, `${this.entityName} 更新成功`, { [this.responseKey]: updatedFaq });
		} catch (error) {
			this._handleError(error, "更新", next);
		}
	};
}

export default new FaqController();
