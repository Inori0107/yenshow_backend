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
			default: false
		},
		author: {
			type: String,
			required: [true, "作者為必填"]
		},
		publishDate: {
			type: Date,
			default: Date.now
		},
		productModel: {
			type: String,
			trim: true
		},
		videoUrl: {
			type: String,
			trim: true
		},
		imageUrl: [{ type: String }]
	},
	{
		timestamps: true,
		toObject: { virtuals: true }, // 確保 virtuals 被包含在 toObject 結果中
		toJSON: { virtuals: true } // 確保 virtuals 被包含在 toJSON 結果中
	}
);

// --- VIRTUALS ---
faqSchema.virtual("metaTitle").get(function () {
	const siteNameTW = "遠岫科技";
	const siteNameEN = "Yenshow";
	const pageTypeTW = "常見問題";
	const pageTypeEN = "FAQ";
	let baseTitleTW = "";
	let baseTitleEN = "";

	if (this.category && this.category.trim() !== "") {
		let categoryStr = this.category.trim();
		// 限制 category 長度
		if (categoryStr.length > 20) {
			categoryStr = categoryStr.substring(0, 20) + "...";
		}
		baseTitleTW = `${categoryStr} | ${pageTypeTW}`;
		baseTitleEN = `${categoryStr} | ${pageTypeEN}`; // 假設 category 對 TW 和 EN 是一樣的
	} else {
		baseTitleTW = pageTypeTW;
		baseTitleEN = pageTypeEN;
	}

	return {
		TW: `${baseTitleTW} | ${siteNameTW}`,
		EN: `${baseTitleEN} | ${siteNameEN}`
	};
});

faqSchema.virtual("metaDescription").get(function () {
	const maxLength = 155;
	if (this.question) {
		let descTW = this.question.TW || "";
		let descEN = this.question.EN || "";

		// TW
		if (descTW.length > maxLength) {
			descTW = descTW.substring(0, maxLength - 3) + "...";
		}

		// EN
		if (descEN.length > maxLength) {
			descEN = descEN.substring(0, maxLength - 3) + "...";
		}
		return {
			TW: descTW,
			EN: descEN
		};
	}
	return { TW: "", EN: "" }; // 如果沒有 question，返回空字串
});

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
