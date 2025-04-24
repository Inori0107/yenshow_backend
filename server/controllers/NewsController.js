import { BaseController } from "./BaseController.js";
import News from "../models/News.js";

class NewsController extends BaseController {
	constructor() {
		super(News, {
			entityName: "News",
			responseKey: "news",
			basicFields: ["category", "isActive"]
		});
	}
}

export default new NewsController();
