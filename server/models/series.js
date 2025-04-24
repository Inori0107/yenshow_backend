import { Schema, model } from "mongoose";

const seriesSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN); // 至少有一種語言版本
				},
				message: "系列名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			trim: true,
			comment: "系列識別碼，用於系統識別和URL"
		},
		isActive: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: false }, // 不使用虛擬欄位
		toObject: { virtuals: false }
	}
);

export default model("Series", seriesSchema);
