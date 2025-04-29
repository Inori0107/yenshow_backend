import Faq from "../models/Faq.js";
import { EntityController } from "./EntityController.js";

class FaqController extends EntityController {
	constructor() {
		super(Faq, {
			entityName: "Faq",
			responseKey: "faq",
			basicFields: ["category", "isActive"]
		});
	}
}

export default new FaqController();
