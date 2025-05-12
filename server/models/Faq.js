import { Schema, model } from "mongoose";

const faqSchema = new Schema(
	{
		question: {
			TW: { type: String, required: [true, "繁體中文問題為必填"] },
			EN: { type: String }
		},
		answer: {
			TW: { type: String, required: [true, "繁體中文答案為必填"] },
			EN: { type: String }
		},
		category: {
			type: String,
			trim: true
		},
		order: {
			type: Number,
			default: 0
		},
		isActive: {
			type: Boolean,
			default: true
		},
		author: {
			// 作者 (可選)
			type: Schema.Types.ObjectId,
			ref: "users"
		},
		metaTitle: {
			// SEO 標題
			TW: { type: String },
			EN: { type: String }
		},
		metaDescription: {
			// SEO 描述
			TW: { type: String },
			EN: { type: String }
		}
	},
	{
		timestamps: true
	}
);

// --- 添加轉換配置 ---
const transformOptions = {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		// 轉換 _id 為字符串
		if (ret._id) {
			ret._id = ret._id.toString();
		}
		return ret;
	}
};
faqSchema.set("toObject", transformOptions);
faqSchema.set("toJSON", transformOptions);
// --- 配置結束 ---

export default model("Faq", faqSchema);
