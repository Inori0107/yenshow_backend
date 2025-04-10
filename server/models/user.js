import { Schema, model, Error } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import UserRole from "../enums/UserRole.js";

// 使用者資料
const schema = new Schema(
	{
		account: {
			type: String,
			required: [true, "使用者帳號必填"],
			minlength: [2, "使用者帳號長度不符"],
			maxlength: [20, "使用者帳號長度不符"],
			unique: true,
			validate: {
				validator(value) {
					return validator.isAlphanumeric(value);
				},
				message: "使用者帳號格式錯誤"
			}
		},
		password: {
			type: String,
			required: [true, "使用者密碼必填"],
			select: false
		},
		email: {
			type: String,
			required: [true, "使用者信箱必填"],
			unique: true,
			validate: {
				validator(value) {
					return !value || validator.isEmail(value);
				},
				message: "信箱格式錯誤"
			}
		},
		tokens: {
			type: [String]
		},
		role: {
			type: String,
			default: UserRole.USER
		},
		isActive: {
			type: Boolean,
			default: true
		},
		isFirstLogin: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true,
		versionKey: false
	}
);

// 確認使用者密碼是否有修改，有的話就加密
schema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();

	try {
		this.password = await bcrypt.hash(this.password, 10);
		if (this.isModified("password") && !this.isNew) {
			this.passwordLastChanged = Date.now();
		}
		next();
	} catch (error) {
		next(error);
	}
});

// 添加比較密碼的方法
schema.methods.comparePassword = async function (password) {
	return await bcrypt.compare(password, this.password);
};

export default model("users", schema);
