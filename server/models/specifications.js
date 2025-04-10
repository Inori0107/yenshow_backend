import { Schema, model } from "mongoose";

const specificationsSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN);
				},
				message: "規格名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			trim: true,
			comment: "規格識別碼，用於系統識別和URL"
		},
		subCategories: {
			type: Schema.Types.ObjectId,
			ref: "SubCategories",
			required: true,
			comment: "所屬子分類"
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

// 添加獲取特定語言名稱的方法
specificationsSchema.methods.getNameByLang = function (lang = "TW") {
	return this.name && this.name[lang] ? this.name[lang] : "";
};

export default model("Specifications", specificationsSchema);
