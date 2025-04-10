import { Schema, model } from "mongoose";

const productSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN);
				},
				message: "產品名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			trim: true,
			comment: "系列識別碼，用於系統識別和URL"
		},
		specificationsId: { type: Schema.Types.ObjectId, ref: "Specifications", required: true },
		description: {
			type: Object,
			default: {
				TW: "",
				EN: ""
			},
			comment: "產品多語言描述"
		},
		features: [
			{
				featureId: { type: String, required: true },
				TW: { type: String, default: "" },
				EN: { type: String, default: "" }
			}
		],
		images: [{ type: String, required: true }],
		documents: [{ type: String }],
		isActive: { type: Boolean, default: true }
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: false },
		toObject: { virtuals: false }
	}
);

// 添加獲取特定語言的方法
productSchema.methods.getDataByLang = function (lang = "TW") {
	const result = {
		_id: this._id,
		code: this.code,
		specificationsId: this.specificationsId,
		categoriesId: this.categoriesId,
		subCategoriesId: this.subCategoriesId,
		images: this.images,
		documents: this.documents,
		isActive: this.isActive,
		createdAt: this.createdAt,
		updatedAt: this.updatedAt,
		id: this._id,
		name: this.name && this.name[lang] ? this.name[lang] : "",
		description: this.description && this.description[lang] ? this.description[lang] : ""
	};

	// 處理 features 的特殊結構
	if (this.features && this.features.length) {
		result.features = this.features.map((feature) => ({
			featureId: feature.featureId,
			value: feature[lang] || ""
		}));
	} else {
		result.features = [];
	}

	return result;
};

export default model("Products", productSchema);
