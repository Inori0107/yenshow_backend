import mongoose from "mongoose";
import dotenv from "dotenv";
import products from "../models/products.js";
import Series from "../models/series.js";
import categories from "../models/categories.js";
import SubCategories from "../models/subCategories.js";
import specifications from "../models/specifications.js";
import fs from "fs";
import path from "path";
import fileUpload from "../utils/fileUpload.js";

dotenv.config();

const productsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "products.json"), "utf8"));

async function importproducts() {
	try {
		console.log("開始導入產品數據...");
		let created = 0;
		let updated = 0;
		let skipped = 0;

		// 預查所有相關實體
		const seriesCodes = [...new Set(productsData.map((p) => p.seriesCode).filter(Boolean))];
		const categoriesCodes = [...new Set(productsData.map((p) => p.categoriesCode).filter(Boolean))];
		const subCategoriesCodes = [...new Set(productsData.map((p) => p.subCategoriesCode).filter(Boolean))];
		const specificationsCodes = [...new Set(productsData.map((p) => p.specificationsCode).filter(Boolean))];

		// 獲取所有需要的實體
		const series = await Series.find({ code: { $in: seriesCodes } });
		const categories = await categories.find({ code: { $in: categoriesCodes } });
		const subCategories = await SubCategories.find({ code: { $in: subCategoriesCodes } });
		const specifications = await specifications.find({ code: { $in: specificationsCodes } });

		// 創建查找映射
		const seriesMap = new Map(series.map((s) => [s.code, s]));
		const categoriesMap = new Map(categories.map((c) => [c.code, c]));
		const subCategoriesMap = new Map(subCategories.map((s) => [s.code, s]));
		const specificationsMap = new Map(specifications.map((s) => [s.code, s]));

		// 檢查現有產品
		const productsCodes = productsData.map((p) => p.code).filter(Boolean);
		const existingproducts = await products.find({ code: { $in: productsCodes } });
		const productsMap = new Map(existingproducts.map((p) => [p.code, p]));

		const operations = [];

		for (const productsData of productsData) {
			try {
				if (!productsData.name || !productsData.code || !productsData.modelNumber || !productsData.specificationsCode) {
					console.log(`跳過缺少必要字段的產品: ${productsData.name || productsData.code || "未知產品"}`);
					skipped++;
					continue;
				}

				const specifications = specificationsMap.get(productsData.specificationsCode);

				if (!specifications) {
					console.log(`跳過找不到規格的產品: ${productsData.name} (規格碼: ${productsData.specificationsCode})`);
					skipped++;
					continue;
				}

				const existing = productsMap.get(productsData.code);

				// 處理圖片和文件
				if (productsData.imagePaths && productsData.imagePaths.length > 0) {
					// 假設 imagePaths 包含本地圖片檔案路徑
					const imageResults = [];
					for (const imagePath of productsData.imagePaths) {
						if (fs.existsSync(imagePath)) {
							// 創建產品目錄
							const directories = await fileUpload.createproductsDirectories(productsData);

							// 複製圖片到目標目錄
							const fileName = path.basename(imagePath);
							const targetPath = path.join(directories.imagesPath, fileName);
							fs.copyFileSync(imagePath, targetPath);

							// 保存相對路徑
							const relativePath = path.join("uploads", directories.relativeImagesPath, fileName).replace(/\\/g, "/");
							imageResults.push(relativePath);
						}
					}
					productsData.images = imageResults;
				}

				if (productsData.documentPath && fs.existsSync(productsData.documentPath)) {
					// 假設 documentPath 包含本地文件檔案路徑
					const directories = await fileUpload.createproductsDirectories(productsData);

					// 複製文件到目標目錄
					const fileName = path.basename(productsData.documentPath);
					const targetPath = path.join(directories.documentsPath, fileName);
					fs.copyFileSync(productsData.documentPath, targetPath);

					// 保存相對路徑
					const relativePath = path.join("uploads", directories.relativeDocumentsPath, fileName).replace(/\\/g, "/");
					productsData.document = relativePath;
				}

				// 處理產品資料
				const productsDoc = {
					name: productsData.name,
					value: productsData.value || productsData.name.toLowerCase().replace(/\s+/g, "-"),
					code: productsData.code,
					modelNumber: productsData.modelNumber,
					specifications: specifications._id,
					description: productsData.description || "",
					features: productsData.features || [],
					images: productsData.images || [],
					document: productsData.document || "",
					isActive: productsData.isActive !== undefined ? productsData.isActive : true
				};

				if (!existing) {
					// 創建新產品
					operations.push({
						insertOne: {
							document: productsDoc
						}
					});
					created++;
				} else {
					// 更新現有產品
					operations.push({
						updateOne: {
							filter: { code: productsData.code },
							update: { $set: productsDoc }
						}
					});
					updated++;
				}
			} catch (err) {
				fs.appendFileSync("import-errors.log", `${new Date().toISOString()} - ${err.message}\n${JSON.stringify(productsData)}\n\n`);
				console.error(`處理產品時出錯: ${productsData.name || productsData.code || "未知產品"}`, err);
				skipped++;
			}
		}

		if (operations.length > 0) {
			await products.bulkWrite(operations);
		}

		console.log("產品導入完成!");
		console.log(`  創建: ${created} | 更新: ${updated} | 跳過: ${skipped}`);
	} catch (error) {
		console.error("導入產品時出錯:", error);
	} finally {
		console.log("導入過程結束");
	}
}

mongoose
	.connect(process.env.DB_URL)
	.then(() => {
		console.log("已連接到MongoDB");
		return importproducts();
	})
	.then(() => {
		console.log("導入完成，關閉數據庫連接");
		return mongoose.disconnect();
	})
	.catch((err) => {
		console.error("執行錯誤:", err);
		if (mongoose.connection.readyState === 1) {
			return mongoose.disconnect();
		}
	})
	.finally(() => {
		console.log("腳本執行完畢");
	});
