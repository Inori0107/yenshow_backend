import { Schema, model } from "mongoose";

const newsSchema = new Schema(
	{
		title: {
			TW: { type: String, required: true },
			EN: { type: String }
		},
		content: {
			TW: { type: String, required: true },
			EN: { type: String }
		},
		category: {
			type: String
		},
		imageUrl: {
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

export default model("News", newsSchema);
