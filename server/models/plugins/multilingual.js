// 多語言插件
export const multilingualPlugin = function (schema, options) {
	const fields = options.fields || [];

	// 為每個字段添加語言支持
	fields.forEach((field) => {
		// 修改原始字段定義為物件
		schema.path(field).options.type = Object;

		// 添加虛擬屬性
		schema.virtual("TW").get(function () {
			/* 返回 TW 版本的所有欄位 */
		});

		schema.virtual("EN").get(function () {
			/* 返回 EN 版本的所有欄位 */
		});
	});
};
