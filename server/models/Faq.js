import { Schema, model } from "mongoose";

const faqSchema = new Schema(
	{
		question: {
			TW: { type: String, required: true },
			EN: { type: String }
		},
		answer: {
			TW: { type: String, required: true },
			EN: { type: String }
		},
		category: {
			type: String
		},
		isActive: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true
	}
);

export default model("Faq", faqSchema);
