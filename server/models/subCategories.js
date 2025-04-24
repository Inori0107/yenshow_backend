import { Schema, model } from "mongoose";

const subCategoriesSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN);
				},
				message: "子分類名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			trim: true,
			comment: "子分類識別碼，用於系統識別和URL"
		},
		categories: {
			type: Schema.Types.ObjectId,
			ref: "Categories",
			required: true,
			comment: "所屬分類"
		},
		isActive: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: false },
		toObject: { virtuals: false }
	}
);

export default model("SubCategories", subCategoriesSchema);
