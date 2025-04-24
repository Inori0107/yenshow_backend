import { BaseController } from "./BaseController.js";
import Faq from "../models/Faq.js";

class FaqController extends BaseController {
	constructor() {
		super(Faq, {
			entityName: "Faq",
			responseKey: "faq",
			basicFields: ["category", "isActive"]
		});
	}
}

export default new FaqController();
