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

export default model("Products", productSchema);
