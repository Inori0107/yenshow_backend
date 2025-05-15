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
            <language-switcher v-model="featureLanguage" />
          </div>

          <!-- 新增的批次輸入區塊 -->
          <div class="mb-3 text-right">
            <textarea
              v-model="batchFeaturesText"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              rows="3"
              :placeholder="`在此輸入多個產品特點`"
            ></textarea>
            <button
              type="button"
              @click="processBatchFeatures"
              class="mt-2 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors duration-150"
            >
              批次新增
            </button>
          </div>
          <!-- /新增的批次輸入區塊 -->

          <div
            v-for="(feature, index) in form.features"
            :key="feature.featureId"
            class="flex items-center mb-3"
          >
            <input
              v-model="form.features[index][featureLanguage]"
              type="text"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              :placeholder="`請輸入產品特點 (${featureLanguage === 'TW' ? 'TW' : '英文'})`"
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
            <language-switcher v-model="descriptionLanguage" />
          </div>
          <div class="mb-3">
            <textarea
              v-model="form[`description_${descriptionLanguage}`]"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              rows="5"
              :placeholder="`請輸入產品描述 (${descriptionLanguage === 'TW' ? 'TW' : '英文'})`"
            ></textarea>
          </div>
        </div>

        <!-- 產品圖片上傳 -->
        <div class="mb-6">
          <label class="block mb-3"> 產品示圖 </label>
          <MultiAttachmentUploader
            :manager="imageManager"
            attachmentType="image"
            :themeConditionalClass="conditionalClass"
            :inputBaseClass="inputClass"
          />
          <p v-if="validationErrors.images" class="text-red-500 text-sm mt-1">
            {{ validationErrors.images }}
          </p>
        </div>

        <!-- PDF文件上傳 -->
        <div class="mb-6">
          <label class="block mb-3"> 相關文件 (PDF) </label>
          <MultiAttachmentUploader
            :manager="documentManager"
            attachmentType="document"
            :themeConditionalClass="conditionalClass"
            :inputBaseClass="inputClass"
          />
          <p v-if="validationErrors.documents" class="text-red-500 text-sm mt-1">
            {{ validationErrors.documents }}
          </p>
        </div>

        <!-- Video Upload Section -->
        <div class="mb-6">
          <label class="block mb-3">相關影片 (可上傳多部)</label>
          <MultiAttachmentUploader
            :manager="videoManager"
            attachmentType="video"
            :themeConditionalClass="conditionalClass"
            :inputBaseClass="inputClass"
          />
          <p v-if="validationErrors.videos" class="text-red-500 text-sm mt-1">
            {{ validationErrors.videos }}
          </p>
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
          <input
            id="productIsActive"
            type="checkbox"
            v-model="form.isActive"
            class="h-4 w-4 rounded mr-2"
            :class="
              conditionalClass(
                'border-gray-600 text-blue-500 bg-gray-700 focus:ring-blue-600',
                'border-gray-300 text-blue-600 bg-blue-100 focus:ring-blue-500 focus:border-blue-500',
              )
            "
          />
          <label for="productIsActive" class="theme-text font-medium">上架商品</label>
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
import LanguageSwitcher from '@/components/common/languageSwitcher.vue'
import { useMultiAttachmentManager } from '@/composables/useMultiAttachmentManager'
import MultiAttachmentUploader from '@/components/common/MultiAttachmentUploader.vue'

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
  images: [],
  documents: [],
  videos: [],
})

// 初始化附件管理器
const imageManager = useMultiAttachmentManager({
  formFieldName: 'images',
  markerPrefix: '__PRODUCT_IMAGE_MARKER_',
  accept: 'image/*',
})

const documentManager = useMultiAttachmentManager({
  formFieldName: 'documents',
  markerPrefix: '__PRODUCT_DOCUMENT_MARKER_',
  accept: 'application/pdf',
})

const videoManager = useMultiAttachmentManager({
  formFieldName: 'videos',
  markerPrefix: '__PRODUCT_VIDEO_MARKER_',
  accept: 'video/*',
})

// 相關數據
const uploadProgress = ref(0)
const uploadStatus = ref('')
const specifications = ref([])

// 語言切換狀態
const featureLanguage = ref('TW')
const descriptionLanguage = ref('TW')

// 批次新增產品特點
const batchFeaturesText = ref('')

// ===== 計算屬性 (用於獲取子分類) =====
const subCategories = computed(() => {
  const extractedSubCats = props.categoryData?.subCategories || []
  return extractedSubCats
})

// ===== 資料載入方法 =====

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
    .replace(/\s+/g, '-') // 將空格替換為連字號
    .replace(/[^a-zA-Z0-9-]/g, '') // 保留字母、數字和連字號
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

    // --- 處理多圖片上傳 ---
    const hasNewImages = imageManager.prepareFormData(formData, form.value, 'images')
    if (hasNewImages) {
      // 後端期望 'images' 欄位包含 File 對象， manager 已經處理
      // form.value.images 現在是 URL/marker 陣列，後端應能解析
    }

    // --- 處理多文件上傳 ---
    const hasNewDocuments = documentManager.prepareFormData(formData, form.value, 'documents')
    if (hasNewDocuments) {
      // 類似圖片處理
    }

    // --- 處理多影片上傳 ---
    const hasNewVideos = videoManager.prepareFormData(formData, form.value, 'videos')
    if (hasNewVideos) {
      // 類似圖片處理
    }

    // 其他選項
    formData.append('isActive', form.value.isActive ? 'true' : 'false')

    // 使用 products store 提交數據
    let result
    uploadStatus.value = '正在上傳資料...'

    if (isEditing.value) {
      // 更新產品
      console.log('[ProductFormModal] Updating product with ID:', form.value._id)
      console.log('[ProductFormModal] FormData to be sent for update:', formData)
      // Log each formData entry
      for (let [key, value] of formData.entries()) {
        console.log(
          `[ProductFormModal] FormData Update - ${key}: ${value instanceof File ? value.name : value}`,
        )
      }

      const productPayload = {
        name: { TW: form.value.name_TW, EN: form.value.name_EN }, // 確保後端 _processMultilingualFormData 能處理
        code: form.value.code,
        specifications: form.value.specifications,
        features: form.value.features,
        description: { TW: form.value.description_TW, EN: form.value.description_EN },
        isActive: form.value.isActive,
        images: form.value.images, // <--- 包含現有 URL 和新標記的陣列
        documents: form.value.documents, // <--- 包含現有 URL 和新標記的陣列
        videos: form.value.videos, // <--- 包含現有 URL 和新標記的陣列
        // ... 其他需要提交的 form.value 中的字段
      }

      // 如果是更新，且 _id 存在，也加入 payload
      if (isEditing.value && form.value._id) {
        // productPayload._id = form.value._id; // _id 通常在 URL 中，不在 payload
      }

      // 將 payload 序列化並添加到 FormData
      formData.append('productDataPayload', JSON.stringify(productPayload))
      result = await productsStore.updateProduct(form.value._id, formData, (event) => {
        uploadProgress.value = Math.round((100 * event.loaded) / event.total)
      })
    } else {
      // 創建產品
      console.log('[ProductFormModal] Creating new product.')
      console.log('[ProductFormModal] FormData to be sent for create:', formData)
      // Log each formData entry
      for (let [key, value] of formData.entries()) {
        console.log(
          `[ProductFormModal] FormData Create - ${key}: ${value instanceof File ? value.name : value}`,
        )
      }
      result = await productsStore.createProduct(formData, (event) => {
        uploadProgress.value = Math.round((100 * event.loaded) / event.total)
      })
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
  form.value = getInitialFormState()

  // Reset managers
  imageManager.reset()
  documentManager.reset()
  videoManager.reset()

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

  // Reset batch features text
  batchFeaturesText.value = ''

  // Reset specifications list (will be repopulated on subCat change or load)
  specifications.value = []

  // 清除 MultiAttachmentUploader 的 input 元素的值，以確保 @change 事件能再次觸發
  if (imageManager.inputRef.value) imageManager.inputRef.value.value = ''
  if (documentManager.inputRef.value) documentManager.inputRef.value.value = ''
  if (videoManager.inputRef.value) videoManager.inputRef.value.value = ''
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
      batchFeaturesText.value = '' // 清空批次輸入框

      // Ensure form arrays are initialized
      form.value.images = []
      form.value.documents = []
      form.value.videos = [] // Initialize for video as well

      await loadProductData() // This will now populate imagePreviews and documentPreviews
      // and set initial videoFileName if an existing video exists.
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

// Watch featureLanguage to update textarea placeholder (optional, but good UX)
watch(featureLanguage, () => {
  // This is to ensure the placeholder updates if the user types, then changes lang, then wants to batch add.
  // The textarea itself will have its :placeholder re-evaluated, but this is an explicit trigger if needed.
  // For simple placeholder binding, direct re-evaluation by Vue is usually sufficient.
})

// Re-add uploadStatus definition (was removed by linter fix but is in template)
watch(uploadProgress, (newVal) => {
  if (newVal > 0 && newVal < 100) {
    uploadStatus.value = `正在上傳資料 (${newVal}%)...`
  } else if (newVal === 100) {
    uploadStatus.value = '上傳完成，正在處理...'
  }
})

// 初始化 - Handled by watch on visible
// onMounted(() => { ... })

const productDataForEdit = ref(null) // Store fetched product data for comparison

// Helper to get initial form state
const getInitialFormState = () => ({
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
  images: [],
  documents: [],
  videos: [],
})

async function loadProductData() {
  // Reset form first using the refined initial state logic
  resetForm() // This will now also clear newImageFiles implicitly by not repopulating it

  if (!isEditing.value || !props.productId) {
    productDataForEdit.value = null // Clear stored data
    // If creating a new product, pre-select first subcategory and its specs if available
    if (subCategories.value.length > 0 && !form.value.subCategoriesId) {
      form.value.subCategoriesId = subCategories.value[0]._id
      const defaultSubCat = subCategories.value[0]
      specifications.value = defaultSubCat?.specifications || []
      form.value.specifications = '' // Ensure spec is reset or set to a default
    }
    return
  }

  loading.value = true
  formError.value = ''
  // uploadStatus.value = ''; // uploadStatus is managed by its own watch
  // uploadProgress.value = 0;

  try {
    const fetchedProductData = await productsStore.fetchProductById(props.productId)
    if (!fetchedProductData) throw new Error('無法載入產品數據')

    productDataForEdit.value = JSON.parse(JSON.stringify(fetchedProductData)) // Store a copy

    let foundSubCatId = ''
    let foundSpecId = ''

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
              break
            }
          }
        }
        if (foundSubCatId) break
      }
    }

    if (!foundSubCatId || !foundSpecId) {
      console.warn(
        `[ProductFormModal] Product ID ${props.productId} not found within props.categoryData. Using data from fetched product itself for parent IDs. This might be inaccurate if hierarchy changed.`,
      )
      foundSubCatId = fetchedProductData.subCategoriesId || ''
      foundSpecId = fetchedProductData.specifications || ''
      if (!foundSubCatId || !foundSpecId) {
        // If still not found, it's a more critical issue or data inconsistency.
        console.error(
          `Critical: Parent IDs for product ${props.productId} could not be determined either from hierarchy or product data.`,
        )
        // Set to empty to prevent potential errors with dropdowns, user must select.
        // formError.value = `警告：無法確定產品的分類層級，請手動選擇。`;
      }
    }
    // END of finding parent IDs logic

    // Populate form with a combination of initial state, fetched data, and determined hierarchy IDs
    form.value = {
      ...getInitialFormState(), // Start with defaults
      _id: fetchedProductData._id,
      name_TW: fetchedProductData.name?.TW || '',
      name_EN: fetchedProductData.name?.EN || '',
      code: fetchedProductData.code || '',
      subCategoriesId: foundSubCatId, // Use determined subCategory ID
      specifications: foundSpecId, // Use determined specification ID
      description_TW: fetchedProductData.description?.TW || '',
      description_EN: fetchedProductData.description?.EN || '',
      features:
        fetchedProductData.features && fetchedProductData.features.length > 0
          ? fetchedProductData.features.map((f, index) => ({
              TW: f.TW || '',
              EN: f.EN || '',
              featureId: f.featureId || `feature_${index + 1}`,
            }))
          : [{ TW: '', EN: '', featureId: 'feature_1' }], // Default if no features
      isActive: fetchedProductData.isActive !== undefined ? fetchedProductData.isActive : true,
      images: [...(fetchedProductData.images || [])],
      documents: [...(fetchedProductData.documents || [])],
      videos: [...(fetchedProductData.videos || [])],
    }

    // Populate previews using managers
    imageManager.populatePreviews(fetchedProductData.images || [])
    documentManager.populatePreviews(fetchedProductData.documents || [])
    videoManager.populatePreviews(fetchedProductData.videos || [])

    // Populate specifications dropdown based on the determined subCategoriesId
    if (form.value.subCategoriesId) {
      const selectedSubCat = subCategories.value.find((sc) => sc._id === form.value.subCategoriesId)
      specifications.value = selectedSubCat?.specifications || []
      // Ensure the form.value.specifications (which is foundSpecId) is valid within this list
      if (
        form.value.specifications &&
        !specifications.value.some((s) => s._id === form.value.specifications)
      ) {
        console.warn(
          `Product's saved specification ID ${form.value.specifications} not found in the list for subCategory ${form.value.subCategoriesId}. Resetting.`,
        )
        form.value.specifications = '' // Reset if inconsistent
      }
    } else {
      specifications.value = []
      form.value.specifications = '' // No subCat, so no spec
    }
  } catch (error) {
    console.error('載入產品錯誤:', error)
    formError.value = '載入產品數據失敗: ' + (error.message || '未知錯誤')
    productDataForEdit.value = null // Clear on error too
  } finally {
    loading.value = false
  }
}
</script>
