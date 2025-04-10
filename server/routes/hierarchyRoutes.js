import express from "express";
import SeriesController from "../controllers/models/series.js";
import CategoriesController from "../controllers/models/categories.js";
import SubCategoriesController from "../controllers/models/subCategories.js";
import SpecificationsController from "../controllers/models/specifications.js";
import ProductsController from "../controllers/models/products.js";
import HierarchyManager from "../controllers/HierarchyManager.js";
import fileUpload from "../utils/fileUpload.js";

const router = express.Router();

// 階層管理 API
router.get("/hierarchy", HierarchyManager.getFullHierarchy);
router.get("/hierarchy/children/:parentType/:parentId", HierarchyManager.getChildrenByParentId);
router.get("/hierarchy/parents/:itemType/:itemId", HierarchyManager.getParentHierarchy);

// 系列 API
router.get("/series", SeriesController.getAllItems);
router.get("/series/search", SeriesController.searchItems);
router.get("/series/:id", SeriesController.getItemById);
router.post("/series", SeriesController.createItem);
router.put("/series/:id", SeriesController.updateItem);
router.delete("/series/:id", SeriesController.deleteItem);
router.post("/series/batch", SeriesController.batchProcess);

// 分類 API
router.get("/categories", CategoriesController.getAllItems);
router.get("/categories/search", CategoriesController.searchItems);
router.get("/categories/:id", CategoriesController.getItemById);
router.post("/categories", CategoriesController.createItem);
router.put("/categories/:id", CategoriesController.updateItem);
router.delete("/categories/:id", CategoriesController.deleteItem);
router.post("/categories/batch", CategoriesController.batchProcess);

// 子分類 API
router.get("/subCategories", SubCategoriesController.getAllItems);
router.get("/subCategories/search", SubCategoriesController.searchItems);
router.get("/subCategories/:id", SubCategoriesController.getItemById);
router.post("/subCategories", SubCategoriesController.createItem);
router.put("/subCategories/:id", SubCategoriesController.updateItem);
router.delete("/subCategories/:id", SubCategoriesController.deleteItem);
router.post("/subCategories/batch", SubCategoriesController.batchProcess);

// 規格 API
router.get("/specifications", SpecificationsController.getAllItems);
router.get("/specifications/search", SpecificationsController.searchItems);
router.get("/specifications/:id", SpecificationsController.getItemById);
router.post("/specifications", SpecificationsController.createItem);
router.put("/specifications/:id", SpecificationsController.updateItem);
router.delete("/specifications/:id", SpecificationsController.deleteItem);
router.post("/specifications/batch", SpecificationsController.batchProcess);

// 產品 API - 使用新的方法名稱
router.get("/products", ProductsController.getProducts);
router.get("/products/search", ProductsController.searchProducts);
router.get("/products/:id", ProductsController.getProductById);
router.post("/products", fileUpload.getProductUploadMiddleware(), ProductsController.createProduct);
router.put("/products/:id", fileUpload.getProductUploadMiddleware(), ProductsController.updateProduct);
router.delete("/products/:id", ProductsController.deleteProduct);
router.post("/products/batch", ProductsController.batchProcess);

export default router;
