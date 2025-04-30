<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center"
    style="background-color: rgba(0, 0, 0, 0.7)"
  >
    <div
      :class="[
        cardClass,
        'w-full max-w-2xl rounded-[10px] shadow-lg p-[24px] max-h-[90vh] overflow-y-auto relative',
      ]"
    >
      <h2
        class="text-[16px] lg:text-[24px] font-bold text-center mb-[12px] lg:mb-[24px] theme-text"
      >
        {{ isEditing ? '編輯產品' : '新增產品' }}
      </h2>

      <!-- 加載指示器 -->
      <div v-if="loading" class="text-center py-8">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
          :class="conditionalClass('border-white', 'border-blue-600')"
        ></div>
        <p class="mt-2" :class="conditionalClass('text-gray-400', 'text-slate-500')">
          正在加載數據...
        </p>
      </div>

      <!-- 錯誤提示 -->
      <div
        v-else-if="formError"
        class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4"
      >
        {{ formError }}
      </div>

      <!-- 表單內容 -->
      <form v-else @submit.prevent="submitForm" class="space-y-[12px] lg:space-y-[24px]">
        <!-- 基本資訊 -->
        <div class="grid grid-cols-1 gap-4 mb-6">
          <!-- 產品名稱多語言輸入 -->
          <div class="grid grid-cols-2 gap-3">
            <!-- 產品名稱 -->
            <div class="relative">
              <label class="block mb-3">產品名稱 *</label>
              <input
                v-model="form.name_TW"
                type="text"
                :class="[
                  inputClass,
                  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                  validationErrors['name_TW'] ? 'border-red-500' : '',
                ]"
                placeholder="請輸入產品名稱"
                required
              />
              <div v-if="validationErrors['name_TW']" class="text-red-500 text-sm mt-1">
                {{ validationErrors['name_TW'] }}
              </div>
            </div>

            <!-- 產品型號 -->
            <div class="relative">
              <label class="block mb-3">產品型號 *</label>
              <input
                v-model="form.name_EN"
                type="text"
                :class="[
                  inputClass,
                  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                  validationErrors['name_EN'] ? 'border-red-500' : '',
                ]"
                placeholder="請輸入產品型號"
                @input="generateCode"
              />
            </div>
          </div>
        </div>

        <!-- 層級選擇區 -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <!-- 子分類選擇 -->
          <div>
            <label class="block mb-3">子分類 *</label>
            <select
              v-model="form.subCategoriesId"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                validationErrors['subCategoriesId'] ? 'border-red-500' : '',
              ]"
              required
              @change="handleSubCategoriesChange"
            >
              <option value="" disabled>請選擇子分類</option>
              <option
                v-for="subCat in subCategories"
                :key="subCat._id"
                :value="subCat._id"
                class="text-black/70"
              >
                {{ getSubCategoryName(subCat) }}
              </option>
            </select>
            <div v-if="validationErrors['subCategoriesId']" class="text-red-500 text-sm mt-1">
              {{ validationErrors['subCategoriesId'] }}
            </div>
            <span
              v-if="subCategories.length === 0"
              class="mt-2 text-sm"
              :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
            >
              無可用子分類
            </span>
          </div>

          <!-- 規格選擇 -->
          <div>
            <label class="block mb-3">產品規格 *</label>
            <select
              v-model="form.specifications"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                validationErrors['specifications'] ? 'border-red-500' : '',
              ]"
              required
              :disabled="specifications.length === 0"
              @change="handleSpecificationsChange"
            >
              <option value="" disabled>請選擇產品規格</option>
              <option
                v-for="spec in specifications"
                :key="spec._id"
                :value="spec._id"
                class="text-black/70"
              >
                {{ getSpecificationName(spec) }}
              </option>
            </select>
            <div v-if="validationErrors['specifications']" class="text-red-500 text-sm mt-1">
              {{ validationErrors['specifications'] }}
            </div>
            <span
              v-if="specifications.length === 0"
              class="mt-2 text-sm"
              :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
            >
              該子分類下無可用規格
            </span>
          </div>
        </div>

        <!-- 產品特點 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">產品特點</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm">語言:</span>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  featureLanguage === 'TW' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="featureLanguage = 'TW'"
              >
                繁體中文
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  featureLanguage === 'EN' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="featureLanguage = 'EN'"
              >
                English
              </button>
            </div>
          </div>
          <div
            v-for="(feature, index) in form.features"
            :key="index"
            class="flex items-center mb-3"
          >
            <input
              v-model="form.features[index][featureLanguage]"
              type="text"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              :placeholder="`請輸入產品特點 (${featureLanguage === 'TW' ? '繁體中文' : '英文'})`"
            />
            <div class="flex ml-2">
              <button
                type="button"
                @click="removeFeature(index)"
                class="p-2 text-red-500 hover:text-red-400 cursor-pointer"
                title="移除特點"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
          <button
            type="button"
            @click="addFeature"
            class="mt-3 flex items-center text-[#3490dc] hover:text-[#2779bd] cursor-pointer"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            新增特點
          </button>
        </div>

        <!-- 產品描述 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">產品描述</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm">語言:</span>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  descriptionLanguage === 'TW'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300'
                "
                @click="descriptionLanguage = 'TW'"
              >
                繁體中文
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  descriptionLanguage === 'EN'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300'
                "
                @click="descriptionLanguage = 'EN'"
              >
                English
              </button>
            </div>
          </div>
          <div class="mb-3">
            <textarea
              v-model="form[`description_${descriptionLanguage}`]"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              rows="5"
              :placeholder="`請輸入產品描述 (${descriptionLanguage === 'TW' ? '繁體中文' : '英文'})`"
            ></textarea>
          </div>
        </div>

        <!-- 產品圖片上傳 -->
        <div class="mb-6">
          <label class="block mb-3"> 產品示圖 </label>
          <div
            class="border-2 border-dashed rounded-[10px] p-4 text-center cursor-pointer hover:border-[#3490dc]"
            :class="[
              conditionalClass('border-gray-600', 'border-slate-300'),
              imageFile && !imagePreview
                ? conditionalClass('border-green-500', 'border-green-600')
                : '',
            ]"
            @click="$refs.imageInput.click()"
          >
            <input
              ref="imageInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleImageUpload"
            />
            <div v-if="!imagePreview">
              <svg
                class="mx-auto w-12 h-12"
                :class="conditionalClass('text-gray-500', 'text-slate-400')"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              <p class="mt-2 text-sm" :class="conditionalClass('text-gray-400', 'text-slate-500')">
                點擊或拖曳上傳圖片
              </p>
              <p
                v-if="imageFile"
                class="mt-1 text-sm"
                :class="conditionalClass('text-green-500', 'text-green-600')"
              >
                檔案已選擇: {{ imageFile.name }}
              </p>
            </div>
            <img v-else :src="imagePreview" alt="預覽圖片" class="mx-auto max-h-40 rounded" />
          </div>
        </div>

        <!-- PDF文件上傳 -->
        <div class="mb-6">
          <label class="block mb-3">PDF檔案</label>
          <div
            class="border-2 border-dashed rounded p-4 text-center cursor-pointer hover:border-[#3490dc]"
            :class="[
              conditionalClass('border-gray-600', 'border-slate-300'),
              pdfFile ? conditionalClass('border-green-500', 'border-green-600') : '',
            ]"
            @click="$refs.pdfInput.click()"
          >
            <input
              ref="pdfInput"
              type="file"
              accept="application/pdf"
              class="hidden"
              @change="handlePdfUpload"
            />
            <div v-if="!pdfFileName">
              <svg
                class="mx-auto w-12 h-12"
                :class="conditionalClass('text-gray-500', 'text-slate-400')"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <p class="mt-2 text-sm" :class="conditionalClass('text-gray-400', 'text-slate-500')">
                點擊或拖曳上傳PDF檔案
              </p>
              <p
                v-if="pdfFile"
                class="mt-1 text-sm"
                :class="conditionalClass('text-green-500', 'text-green-600')"
              >
                檔案已選擇: {{ pdfFile.name }}
              </p>
            </div>
            <div v-else class="flex items-center justify-center">
              <svg
                class="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <p class="ml-2">{{ pdfFileName }}</p>
            </div>
          </div>
        </div>

        <!-- 上傳進度顯示 -->
        <div v-if="uploadStatus" class="mb-6">
          <div class="text-sm font-medium mb-1">{{ uploadStatus }}</div>
          <div
            class="w-full rounded-full h-2.5"
            :class="conditionalClass('bg-gray-700', 'bg-slate-200')"
          >
            <div
              class="h-2.5 rounded-full transition-all duration-300 bg-blue-600"
              :style="{ width: `${uploadProgress}%` }"
            ></div>
          </div>
          <div class="text-right text-xs mt-1">{{ uploadProgress }}%</div>
        </div>

        <!-- 上架選項 -->
        <div class="mb-6 flex items-center">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="form.isActive" class="sr-only peer" />
            <div
              :class="[
                'w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:border after:rounded-full after:h-5 after:w-5 after:transition-all',
                conditionalClass(
                  'bg-gray-700 peer-checked:bg-white after:bg-black after:border-gray-300',
                  'bg-slate-300 peer-checked:bg-blue-600 after:bg-white after:border-slate-300',
                ),
              ]"
            ></div>
            <span class="ml-3 text-sm font-medium theme-text">上架商品</span>
          </label>
        </div>

        <!-- 提交按鈕 -->
        <div class="flex justify-end gap-4">
          <button
            type="button"
            class="px-4 py-2 rounded-[10px] cursor-pointer"
            :class="
              conditionalClass(
                'bg-gray-600 hover:bg-gray-700',
                'bg-slate-300 hover:bg-slate-400 text-slate-700',
              )
            "
            @click="closeModal"
          >
            取消
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-[10px] cursor-pointer text-white"
            :disabled="isProcessing"
          >
            <span v-if="isProcessing">處理中...</span>
            <span v-else>{{ isEditing ? '更新產品' : '新增產品' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNotifications } from '@/composables/notificationCenter'
import { useLanguage } from '@/composables/useLanguage'
import { useFormValidation } from '@/composables/useFormValidation'
import { useProductsStore } from '@/stores/models/products'
import { useThemeClass } from '@/composables/useThemeClass'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  productId: {
    type: String,
    default: '',
  },
  categoryData: {
    type: Object,
    required: true,
    default: () => ({ _id: '', name: '', subCategories: [] }),
  },
})

const emit = defineEmits(['update:visible', 'submit-success', 'close'])

// 初始化工具與狀態
const notify = useNotifications()
const { getLocalizedField } = useLanguage()
const { validateRequired, errors: validationErrors, clearErrors, setError } = useFormValidation()
const productsStore = useProductsStore()

// 獲取主題相關工具
const { cardClass, inputClass, conditionalClass } = useThemeClass()

// 基本狀態
const loading = ref(false)
const formError = ref('')
const isProcessing = ref(false)
const isEditing = computed(() => !!props.productId)

// 表單數據
const form = ref({
  _id: '',
  name_TW: '',
  name_EN: '',
  code: '',
  subCategoriesId: '',
  specifications: '',
  features: [{ TW: '', EN: '', featureId: 'feature_1' }],
  description_TW: '',
  description_EN: '',
  isActive: true,
})

// 相關數據
const imageFile = ref(null)
const imagePreview = ref(null)
const pdfFile = ref(null)
const pdfFileName = ref(null)
const uploadProgress = ref(0)
const uploadStatus = ref('')
const specifications = ref([])

// 語言切換狀態
const featureLanguage = ref('TW')
const descriptionLanguage = ref('TW')

// ===== 計算屬性 (用於獲取子分類) =====
const subCategories = computed(() => {
  const extractedSubCats = props.categoryData?.subCategories || []
  console.log('[ProductFormModal] Extracted subCategories from prop:', extractedSubCats)
  return extractedSubCats
})

// ===== 資料載入方法 =====

/**
 * 載入產品數據 (Refactored to use props and search within categoryData for parent IDs)
 */
const loadProductData = async () => {
  resetForm() // Reset form before loading/setting new data

  // Pre-populate subCategories from props immediately
  // No need to call loadSubCategories()

  if (!isEditing.value) {
    // New Product logic remains the same...
    if (subCategories.value.length > 0 && !form.value.subCategoriesId) {
      form.value.subCategoriesId = subCategories.value[0]._id
      const defaultSubCat = subCategories.value[0]
      specifications.value = defaultSubCat?.specifications || []
      form.value.specifications = ''
    }
    return
  }

  // --- Editing Product ---
  loading.value = true
  formError.value = ''
  uploadStatus.value = ''
  uploadProgress.value = 0

  try {
    // Step 1: Fetch basic product details (name, desc, images, isActive etc.)
    // We will IGNORE subCategoriesId and specifications returned from here.
    const productData = await productsStore.fetchProductById(props.productId)
    if (!productData) throw new Error('無法載入產品數據')

    // Step 2: Search within props.categoryData to find the product and its true parent IDs
    let foundSubCatId = ''
    let foundSpecId = ''

    console.log(
      `[ProductFormModal] Searching for product ${props.productId} within props.categoryData:`,
      props.categoryData,
    )
    if (props.categoryData?.subCategories) {
      for (const subCat of props.categoryData.subCategories) {
        if (subCat.specifications) {
          for (const spec of subCat.specifications) {
            if (spec.products && spec.products.some((p) => p._id === props.productId)) {
              foundSubCatId = subCat._id
              foundSpecId = spec._id
              console.log(
                `[ProductFormModal] Found product ${props.productId} under SubCategory ${foundSubCatId} and Specification ${foundSpecId}`,
              )
              break // Found product in spec
            }
          }
        }
        if (foundSubCatId) break // Found product in subCat
      }
    }

    if (!foundSubCatId || !foundSpecId) {
      console.error(
        `[ProductFormModal] CRITICAL: Product ID ${props.productId} not found within the provided props.categoryData structure! Cannot determine parent IDs.`,
      )
      // Decide how to handle this error - show message, block form? Reset IDs?
      // For now, let's try using the potentially incorrect ones from productData as a fallback, but log a warning.
      foundSubCatId = productData.subCategoriesId || ''
      foundSpecId = productData.specifications || ''
      if (!foundSubCatId || !foundSpecId) {
        throw new Error(
          `無法在提供的分類數據中定位產品 ${props.productId}，且產品自身數據也缺少父級ID。`,
        )
      }
      formError.value = `警告：無法在分類結構中定位產品，預選可能不準確。`
      console.warn(
        `[ProductFormModal] Fallback: Using subCategoriesId (${foundSubCatId}) and specifications (${foundSpecId}) from fetched productData because product was not found in props.categoryData.`,
      )
    }

    // Step 3: Populate form fields using basic info from productData and FOUND parent IDs
    form.value = {
      _id: productData._id,
      name_TW: productData.name?.TW || '',
      name_EN: productData.name?.EN || '',
      code: productData.code || '',
      subCategoriesId: foundSubCatId, // Use the ID found by searching props.categoryData
      specifications: foundSpecId, // Use the ID found by searching props.categoryData
      description_TW: productData.description?.TW || '',
      description_EN: productData.description?.EN || '',
      features: processFeatures(productData.features),
      isActive: productData.isActive !== undefined ? productData.isActive : true,
    }
    console.log(
      '[ProductFormModal] Form value after population (using found IDs):',
      JSON.parse(JSON.stringify(form.value)),
    )

    // Step 4: Set files previews (from productData)
    imagePreview.value =
      productData.images && productData.images.length > 0 ? productData.images[0] : null
    pdfFileName.value =
      productData.documents && productData.documents.length > 0
        ? productData.documents[0].split('/').pop()
        : null

    // Step 5: Populate specifications dropdown based on the FOUND subCategoriesId
    if (form.value.subCategoriesId) {
      const selectedSubCat = subCategories.value.find((sc) => sc._id === form.value.subCategoriesId)
      // console.log('[ProductFormModal] loadProductData - Found subCategory for dropdown population:', selectedSubCat)
      specifications.value = selectedSubCat?.specifications || []
      console.log(
        '[ProductFormModal] loadProductData - Set specifications dropdown options based on found subCatId:',
        specifications.value,
      )

      // Validation check remains useful: ensure the *selected* spec ID is actually in the list for that subCat
      if (
        form.value.specifications &&
        !specifications.value.some((s) => s._id === form.value.specifications)
      ) {
        console.warn(
          `[ProductFormModal] Consistency Check Failed: The determined specification ID ${form.value.specifications} is not found in the specifications list of the determined subCategory ${form.value.subCategoriesId}. Resetting selection.`,
        )
        form.value.specifications = '' // Reset if inconsistent
      }
    } else {
      // This case should be less likely now if the search worked, but keep as safety net
      specifications.value = []
      form.value.specifications = ''
      console.log(
        '[ProductFormModal] loadProductData - Could not determine subCategoryId, specifications dropdown cleared.',
      )
    }
  } catch (error) {
    console.error('載入產品錯誤:', error)
    formError.value = '載入產品數據失敗: ' + (error.message || '未知錯誤')
  } finally {
    loading.value = false
  }
}

/**
 * 處理產品特點資料 - 確保格式統一
 */
const processFeatures = (features) => {
  if (!features || features.length === 0) {
    return [{ TW: '', EN: '', featureId: 'feature_1' }]
  }

  // 處理陣列格式的特點
  if (Array.isArray(features)) {
    return features.map((f, index) => ({
      TW: f.TW || '',
      EN: f.EN || '',
      featureId: f.featureId || `feature_${index + 1}`,
    }))
  }

  // 如果是物件格式，轉換為陣列
  if (typeof features === 'object' && !Array.isArray(features)) {
    return Object.entries(features).map(([key, value], index) => ({
      TW: value.TW || '',
      EN: value.EN || '',
      featureId: key || `feature_${index + 1}`,
    }))
  }

  // 預設返回一個空特點
  return [{ TW: '', EN: '', featureId: 'feature_1' }]
}

// ===== 表單處理方法 =====

/**
 * 子分類變更處理 (Refactored)
 */
const handleSubCategoriesChange = () => {
  form.value.specifications = '' // Reset specification selection
  specifications.value = [] // Clear specifications list first

  if (!form.value.subCategoriesId) {
    console.log('子分類未選擇，清空規格列表')
    return
  }

  // Find the selected subcategory object from the computed list
  const selectedSubCat = subCategories.value.find((sc) => sc._id === form.value.subCategoriesId)

  if (selectedSubCat && selectedSubCat.specifications) {
    specifications.value = selectedSubCat.specifications
    console.log('為子分類載入規格:', specifications.value)
  } else {
    console.warn(`子分類 ${form.value.subCategoriesId} 沒有找到或沒有規格數據`)
  }
}

/**
 * 處理規格變更
 */
const handleSpecificationsChange = () => {
  console.log('規格已選擇:', form.value.specifications)
}

/**
 * 添加新特點
 */
const addFeature = () => {
  const newIndex = form.value.features.length + 1
  form.value.features.push({
    TW: '',
    EN: '',
    featureId: `feature_${newIndex}`,
  })
}

/**
 * 移除特點
 */
const removeFeature = (index) => {
  if (form.value.features.length > 1) {
    form.value.features.splice(index, 1)
    form.value.features.forEach((feature, idx) => {
      feature.featureId = `feature_${idx + 1}`
    })
  } else {
    form.value.features = [{ TW: '', EN: '', featureId: 'feature_1' }]
  }
}

/**
 * 處理圖片上傳
 */
const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (!file || !file.type.startsWith('image/')) return

  imageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

/**
 * 處理PDF上傳
 */
const handlePdfUpload = (event) => {
  const file = event.target.files[0]
  if (!file || file.type !== 'application/pdf') return

  pdfFile.value = file
  pdfFileName.value = file.name
}

/**
 * 生成產品代碼
 */
const generateCode = () => {
  if (!form.value.name_EN) {
    form.value.code = 'PROD_' + Date.now().toString().substring(7)
    return
  }

  // 轉換英文名稱為代碼
  let code = form.value.name_EN
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase()

  // 確保代碼不為空
  if (!code) {
    code = 'PROD_' + Date.now().toString().substring(7)
  }

  form.value.code = code
}

/**
 * 表單驗證 (Updated to use props.categoryData._id if needed)
 */
const validateForm = () => {
  clearErrors()
  formError.value = ''

  if (!form.value.code) generateCode()

  // 驗證必填欄位
  const validations = [
    { field: 'name_TW', label: '產品名稱', minLength: 2 },
    { field: 'code', label: '產品代碼', minLength: 2 },
    { field: 'subCategoriesId', label: '子分類' },
    { field: 'specifications', label: '產品規格' },
  ]

  let isValid = true

  validations.forEach(({ field, label, minLength }) => {
    const valueToValidate = form.value[field]
    const result = validateRequired(valueToValidate, label)

    if (!result.valid) {
      setError(field, result.message)
      isValid = false
    } else if (
      minLength &&
      typeof valueToValidate === 'string' &&
      valueToValidate.length < minLength
    ) {
      setError(field, `${label}至少需要 ${minLength} 個字符`)
      isValid = false
    } else if (field === 'specifications' && !valueToValidate) {
      setError(field, `${label}不能為空`)
      isValid = false
    }
  })

  // 確保有至少一種語言的名稱
  if (!form.value.name_TW && !form.value.name_EN) {
    setError('name_TW', '產品名稱至少需要一種語言版本')
    isValid = false
  }

  // 檢查最關鍵的兩個參數
  if (!form.value.specifications) {
    setError('specifications', '產品規格不能為空，這是必要參數')
    formError.value = formError.value ? formError.value + '、產品規格' : '缺少必要參數: 產品規格'
    isValid = false
  }

  if (!form.value.code) {
    setError('code', '產品代碼不能為空，這是必要參數')
    formError.value = formError.value ? formError.value + '、產品代碼' : '缺少必要參數: 產品代碼'
    isValid = false
  }

  if (!isValid) {
    formError.value = formError.value || Object.values(validationErrors)[0] || '表單驗證失敗'
    return false
  }

  return true
}

/**
 * 提交表單
 */
const submitForm = async () => {
  try {
    if (!validateForm()) return

    isProcessing.value = true
    uploadProgress.value = 0
    uploadStatus.value = '準備上傳...'

    // 構建 FormData - 確保符合後端要求
    const formData = new FormData()

    // 添加基本資料
    formData.append('specifications', form.value.specifications)
    formData.append('code', form.value.code)

    // 添加多語言欄位 - 使用 name[TW] 格式與後端匹配
    if (form.value.name_TW) {
      formData.append('name[TW]', form.value.name_TW)
    }
    if (form.value.name_EN) {
      formData.append('name[EN]', form.value.name_EN)
    }

    // 描述欄位
    if (form.value.description_TW) {
      formData.append('description[TW]', form.value.description_TW)
    }
    if (form.value.description_EN) {
      formData.append('description[EN]', form.value.description_EN)
    }

    // 處理特點資料
    if (form.value.features && form.value.features.length > 0) {
      const validFeatures = form.value.features.filter((f) => f.TW || f.EN)
      if (validFeatures.length > 0) {
        formData.append('features', JSON.stringify(validFeatures))
      }
    }

    // 添加檔案 - 關鍵部分：確保檔案正確添加到 FormData 中
    if (imageFile.value) {
      formData.append('images', imageFile.value, imageFile.value.name)
    } else if (imagePreview.value && imagePreview.value.startsWith('data:')) {
      // 如果是 data URL，轉換為 Blob 並添加
      try {
        const response = await fetch(imagePreview.value)
        const blob = await response.blob()
        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })
        formData.append('images', file)
      } catch (error) {
        console.error('轉換圖片預覽失敗:', error)
      }
    }

    if (pdfFile.value) {
      formData.append('documents', pdfFile.value, pdfFile.value.name)
    }

    // 其他選項
    formData.append('isActive', form.value.isActive ? 'true' : 'false')

    // 使用 products store 提交數據
    let result
    uploadStatus.value = '正在上傳資料...'

    if (isEditing.value) {
      // 更新產品
      result = await productsStore.updateProduct(form.value._id, formData)
    } else {
      // 創建產品
      result = await productsStore.createProduct(formData)
    }

    if (!result) {
      throw new Error(productsStore.error || `產品${isEditing.value ? '更新' : '創建'}失敗`)
    }
    // 處理成功
    uploadStatus.value = '上傳成功！'
    notify.notifySuccess(`產品${isEditing.value ? '更新' : '創建'}成功！`)

    // 觸發資料刷新
    notify.triggerRefresh('products')

    // 發送成功事件並關閉模態框
    emit('submit-success', {
      product: result,
      isNew: !isEditing.value,
    })

    closeModal()
  } catch (error) {
    console.error('提交表單錯誤:', error)
    let errorMessage = error.message || `產品${isEditing.value ? '更新' : '創建'}失敗`

    // 處理不同類型的錯誤
    if (error.response) {
      console.error('回應錯誤:', error.response.data)

      // 處理驗證錯誤
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message
      } else {
        errorMessage = `錯誤碼: ${error.response.status}`
      }
    } else if (error.request) {
      errorMessage = '伺服器無回應，請檢查網路連接'
    }

    formError.value = errorMessage
    uploadStatus.value = '上傳失敗：' + errorMessage
  } finally {
    isProcessing.value = false
  }
}

/**
 * 關閉模態框
 */
const closeModal = () => {
  uploadStatus.value = ''
  uploadProgress.value = 0
  isProcessing.value = false
  emit('update:visible', false)
  emit('close')
  resetForm()
}

/**
 * 重置表單 (Updated)
 */
const resetForm = () => {
  // 重置基本表單數據
  form.value = {
    _id: '',
    name_TW: '',
    name_EN: '',
    code: '',
    subCategoriesId: '',
    specifications: '',
    description_TW: '',
    description_EN: '',
    features: [{ TW: '', EN: '', featureId: 'feature_1' }],
    isActive: true,
  }

  // Reset specifications list based on potentially available subcategories
  specifications.value = []
  if (subCategories.value.length > 0) {
    // Optionally pre-select first subcategory and its specs?
    // Or just leave subCat selection blank until user selects.
    // Let's leave it blank for now.
  }

  // Reset files and previews
  imageFile.value = null
  imagePreview.value = null
  pdfFile.value = null
  pdfFileName.value = null

  // Reset upload status
  uploadStatus.value = ''
  uploadProgress.value = 0
  isProcessing.value = false

  // Reset errors and validation
  formError.value = ''
  clearErrors()

  // Reset language selection
  featureLanguage.value = 'TW'
  descriptionLanguage.value = 'TW'
}

// ===== 輔助方法 =====

/**
 * 獲取子分類本地化名稱
 */
function getSubCategoryName(subCategory) {
  if (!subCategory) return '未命名子分類'
  return getLocalizedField(subCategory) || '未命名子分類'
}

/**
 * 獲取規格本地化名稱
 */
function getSpecificationName(specification) {
  if (!specification) return '未命名規格'
  return getLocalizedField(specification) || '未命名規格'
}

// ===== 監聽器 =====

// 監聽模態框顯示狀態
watch(
  () => props.visible,
  async (newValue) => {
    if (newValue) {
      isProcessing.value = false
      uploadStatus.value = ''
      uploadProgress.value = 0
      formError.value = ''
      await loadProductData()
    } else {
      // Optionally reset form when modal closes
      // resetForm(); // uncomment if needed
    }
  },
  { immediate: true }, // Run immediately if modal starts visible
)

// 監聽英文名稱變化，自動更新代碼
watch(
  () => form.value.name_EN,
  () => generateCode(),
)

// 初始化 - Handled by watch on visible
// onMounted(() => { ... })
</script>
