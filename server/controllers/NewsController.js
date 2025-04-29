import News from "../models/News.js";
import { EntityController } from "./EntityController.js";

class NewsController extends EntityController {
	constructor() {
		super(News, {
			entityName: "News",
			responseKey: "news",
			basicFields: ["category", "isActive"]
		});
	}
}

export default new NewsController();
