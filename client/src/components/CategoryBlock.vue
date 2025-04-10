<template>
  <div class="categories-block">
    <!-- 加載中指示器 -->
    <div v-if="loading" class="container mx-auto py-8 text-center">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
        :class="isDarkTheme ? 'border-white' : 'border-blue-600'"
      ></div>
      <p class="mt-4 theme-text-secondary">正在加載類別資料...</p>
    </div>

    <!-- 錯誤提示 -->
    <div v-else-if="error" class="container mx-auto py-8">
      <div class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-4">
        {{ error }}
      </div>
      <button
        @click="loadCategories"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        重新加載
      </button>
    </div>

    <!-- 無資料提示 -->
    <div v-else-if="categoryList.length === 0" class="container mx-auto py-8 text-center">
      <p class="theme-text-secondary">目前沒有類別資料</p>
    </div>

    <!-- 分類內容顯示區域 -->
    <template v-else>
      <section
        v-for="category in categoryList"
        :key="category.code"
        class="container mx-auto py-[24px] lg:py-[48px]"
      >
        <div class="flex justify-between items-center py-[12px] lg:py-[24px]">
          <h3 class="text-[24px] lg:text-[36px] theme-text">
            {{ getLocalizedField(category, 'name', '未命名類別', 'TW') }}
          </h3>
          <div class="flex gap-2">
            <!-- 新增子分類按鈕 -->
            <button
              type="button"
              @click="handleSubCategoriesButton(category)"
              class="transition-colors duration-200 px-[12px] lg:px-[16px] py-[8px] lg:py-[12px] rounded-[10px] flex items-end gap-[8px] cursor-pointer"
              :class="
                isDarkTheme
                  ? 'bg-[#212a37] hover:bg-[#2a323c] border-2 border-[#3F5069]'
                  : 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700'
              "
            >
              <span class="text-[12px] lg:text-[16px]">新增子分類</span>
              <svg
                class="w-[16px] lg:w-[24px] aspect-square"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <!-- 新增規格按鈕 -->
            <button
              type="button"
              @click="handleSpecificationsButton(category)"
              class="transition-colors duration-200 px-[12px] lg:px-[16px] py-[8px] lg:py-[12px] rounded-[10px] flex items-end gap-[8px] cursor-pointer"
              :class="
                isDarkTheme
                  ? 'bg-[#212a37] hover:bg-[#2a323c] border-2 border-[#3F5069]'
                  : 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700'
              "
            >
              <span class="text-[12px] lg:text-[16px]">新增規格</span>
              <svg
                class="w-[16px] lg:w-[24px] aspect-square"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <!-- 新增產品按鈕 -->
            <button
              type="button"
              @click="handleAddProduct(category)"
              class="transition-colors duration-200 px-[12px] lg:px-[16px] py-[8px] lg:py-[12px] rounded-[10px] flex items-end gap-[8px] cursor-pointer"
              :class="
                isDarkTheme
                  ? 'bg-[#212a37] hover:bg-[#2a323c] border-2 border-[#3F5069]'
                  : 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700'
              "
            >
              <span class="text-[12px] lg:text-[16px]">新增產品</span>
              <svg
                class="w-[16px] lg:w-[24px] aspect-square"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- 產品表格 -->
        <div class="mt-4">
          <ProductTable
            :categories-id="category._id"
            :specifications-id="selectedSubCategory"
            @refresh="refreshCategoryData"
          />
        </div>
      </section>
    </template>

    <!-- 使用通用多語言表單對話框 - 子分類 -->
    <MultilingualFormDialog
      v-model="showSubCategoryModal"
      title="管理子分類"
      item-label="子分類"
      item-label-en="subCategories"
      model-type="subCategories"
      :parent-id="selectedCategory ? selectedCategory.toString() : ''"
      parent-field="categories"
      @submit-success="handleSubCategorySubmitSuccess"
      @refresh-data="loadCategories"
    />

    <!-- 使用通用多語言表單對話框 - 規格 -->
    <MultilingualFormDialog
      v-model="showSpecificationModal"
      title="管理規格"
      item-label="規格"
      item-label-en="specifications"
      model-type="specifications"
      :parent-id="selectedSubCategory ? selectedSubCategory.toString() : ''"
      parent-field="subCategories"
      @submit-success="handleSpecificationSubmitSuccess"
      @refresh-data="loadCategories"
    />

    <!-- 子分類選擇對話框 -->
    <div
      v-if="showSubCategorySelector"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div :class="[cardClass, 'w-full max-w-md rounded-[10px] shadow-lg p-[24px]']">
        <h2 class="text-[24px] font-bold text-center mb-[16px] theme-text">選擇子分類</h2>

        <!-- 載入中 -->
        <div v-if="loadingSubCategories" class="text-center py-4">
          <div
            class="inline-block animate-spin rounded-full h-6 w-6 border-b-2"
            :class="conditionalClass('border-white', 'border-blue-600')"
          ></div>
          <p class="mt-2 theme-text-secondary">載入子分類中...</p>
        </div>

        <!-- 錯誤提示 -->
        <div
          v-else-if="subCategoryError"
          class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-4"
        >
          {{ subCategoryError }}
        </div>

        <!-- 選擇列表 -->
        <div v-else-if="subCategoriesList.length > 0" class="mb-[16px]">
          <p class="mb-[12px] theme-text">請選擇要管理規格的子分類：</p>

          <div class="max-h-[300px] overflow-y-auto">
            <div
              v-for="subCategory in subCategoriesList"
              :key="subCategory._id"
              :class="[
                'p-[12px] mb-[8px] rounded-[8px] cursor-pointer transition-colors',
                conditionalClass(
                  'bg-[#2a3544] hover:bg-[#344155]',
                  'bg-slate-100 hover:bg-slate-200',
                ),
              ]"
              @click="selectSubCategory(subCategory)"
            >
              {{ getLocalizedField(subCategory, 'name', '未命名子分類', 'TW') }}
            </div>
          </div>
        </div>

        <!-- 無子分類 -->
        <div
          v-else
          class="mb-[16px] text-center"
          :class="conditionalClass('text-gray-400', 'text-slate-500')"
        >
          <p>該類別下沒有子分類</p>
          <p class="text-sm mt-2">請先新增子分類後再管理規格</p>
        </div>

        <!-- 操作按鈕 -->
        <div class="flex justify-end gap-[12px]">
          <button
            @click="closeSubCategorySelector"
            :class="[
              'px-4 py-2 rounded-[5px]',
              conditionalClass(
                'bg-gray-600 hover:bg-gray-700 text-white',
                'bg-slate-200 hover:bg-slate-300 text-slate-700',
              ),
            ]"
          >
            關閉
          </button>
          <button
            v-if="subCategoriesList.length > 0"
            @click="createSubCategory"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px]"
          >
            新增子分類
          </button>
        </div>
      </div>
    </div>

    <!-- 產品表單 -->
    <ProductFormModal
      v-model:visible="showProductModal"
      :categories-id="selectedCategory"
      :product-id="''"
      @submit-success="handleProductSubmitSuccess"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useSeriesStore } from '@/stores/models/series'
import { useHierarchyStore } from '@/stores/hierarchyStore'
import { useNotifications } from '@/composables/notificationCenter'
import { useLanguage } from '@/composables/useLanguage'
import MultilingualFormDialog from '@/components/MultilingualFormDialog.vue'
import ProductTable from '@/components/ProductTable.vue'
import ProductFormModal from '@/components/ProductFormModal.vue'
import { useThemeClass } from '@/composables/useThemeClass'

// Props
const props = defineProps({
  currentSeries: {
    type: String,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

// 啟用通知中心和本地化工具
const notify = useNotifications()
const { getLocalizedField } = useLanguage()

// 獲取主題狀態和樣式
const { isDarkTheme, cardClass, conditionalClass } = useThemeClass()

// Store 初始化
const seriesStore = useSeriesStore()
const hierarchyStore = useHierarchyStore()

// 基本狀態
const categoryList = ref([])
const subCategoriesList = ref([]) // 存儲加載的子分類數據
const selectedCategory = ref('')
const selectedSubCategory = ref('')
const showSubCategoryModal = ref(false)
const showSpecificationModal = ref(false)
const loading = ref(false)
const error = ref('')
const showSubCategorySelector = ref(false)
const loadingSubCategories = ref(false)
const subCategoryError = ref('')
const showProductModal = ref(false)

// 計算屬性：獲取當前選擇的系列
const currentSeriesData = computed(() => {
  const seriesItem = seriesStore.items?.find((s) => s.code === props.currentSeries) || null
  return seriesItem
})

// 加載分類數據
const loadCategories = async () => {
  if (!props.currentSeries) return

  // 檢查 currentSeriesData 是否存在
  if (!currentSeriesData.value) {
    error.value = '找不到對應的系列資料'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // 使用層次結構 API 獲取該系列下的所有類別
    const result = await hierarchyStore.fetchChildrenByParent(
      'series',
      currentSeriesData.value._id,
      { includeDetail: true },
    )

    if (!result) {
      throw new Error('載入類別失敗')
    }

    // 將返回的類別列表設置到狀態
    if (result.categories) {
      categoryList.value = result.categories
    } else if (result.categoriesList) {
      categoryList.value = result.categoriesList
    } else {
      console.warn('未找到類別數據，API返回結果:', result)
      categoryList.value = []
    }
  } catch (err) {
    notify.handleApiError(err, {
      showToast: true,
      defaultMessage: '載入類別時發生錯誤',
    })
    error.value = err.message || '載入類別時發生錯誤'
  } finally {
    loading.value = false
  }
}

// 加載指定分類的子分類數據
const loadSubCategories = async (categoryId) => {
  if (!categoryId) {
    notify.notifyWarning('無效的類別 ID')
    return { success: false }
  }

  try {
    // 使用層次結構 API 獲取該類別下的所有子類別
    const result = await hierarchyStore.fetchChildrenByParent('categories', categoryId, {
      includeDetail: true,
    })

    if (!result) {
      throw new Error('載入子分類失敗')
    }

    // 設置子類別列表
    subCategoriesList.value = result.subCategoriesList || []
    return { success: true, subCategories: subCategoriesList.value }
  } catch (err) {
    notify.handleApiError(err, {
      showToast: true,
      defaultMessage: '載入子分類時發生錯誤',
    })
    return { success: false, error: err }
  }
}

// 處理子分類按鈕點擊
function handleSubCategoriesButton(category) {
  if (!category || !category._id) {
    notify.notifyWarning('無效的類別資料')
    return
  }
  selectedCategory.value = category._id
  showSubCategoryModal.value = true
}

// 處理規格按鈕點擊
async function handleSpecificationsButton(category) {
  if (!category) {
    notify.notifyWarning('無效的類別資料')
    return
  }

  selectedCategory.value = category._id
  showSubCategorySelector.value = true
  loadingSubCategories.value = true
  subCategoryError.value = ''

  try {
    // 載入該分類下的子分類數據
    const result = await loadSubCategories(category._id)

    if (!result.success) {
      subCategoryError.value = '載入子分類數據失敗'
      return
    }

    if (subCategoriesList.value.length === 0) {
      subCategoryError.value = `類別「${getLocalizedField(category, 'name', '未命名類別', 'TW')}」下沒有子分類，請先新增子分類`
    }
  } catch (err) {
    console.error('載入子分類數據時發生錯誤:', err)
    subCategoryError.value = '載入子分類數據時發生錯誤'
  } finally {
    loadingSubCategories.value = false
  }
}

// 處理子分類提交成功
function handleSubCategorySubmitSuccess(result) {
  if (!result) return

  // 使用統一的刷新機制
  notify.refreshAfterAction(result.isNew ? 'create' : 'update', 'subCategories', {
    name: result.item?.name || '',
  })

  // 如果當前有選擇的分類，重新載入其子分類
  if (selectedCategory.value) {
    loadSubCategories(selectedCategory.value)
  }
}

// 處理規格提交成功
function handleSpecificationSubmitSuccess(result) {
  if (!result) return

  // 使用統一的刷新機制
  notify.refreshAfterAction(result.isNew ? 'create' : 'update', 'specifications', {
    name: result.item?.name || '',
  })

  // 如果當前有選擇的分類，重新載入其子分類
  if (selectedCategory.value) {
    loadSubCategories(selectedCategory.value)
  }
}

// 子分類選擇對話框相關方法
function selectSubCategory(subCategory) {
  selectedSubCategory.value = subCategory._id
  showSubCategorySelector.value = false
  showSpecificationModal.value = true
}

function closeSubCategorySelector() {
  showSubCategorySelector.value = false
}

function createSubCategory() {
  // 實現新增子分類的邏輯 - 打開子分類對話框
  showSubCategorySelector.value = false
  showSubCategoryModal.value = true
}

// 處理新增產品按鈕點擊
function handleAddProduct(category) {
  if (!category || !category._id) {
    notify.notifyWarning('無效的類別資料')
    return
  }
  selectedCategory.value = category._id
  showProductModal.value = true
}

// 處理產品提交成功
function handleProductSubmitSuccess(result) {
  if (!result) return

  // 使用統一的刷新機制
  notify.refreshAfterAction(result.isNew ? 'create' : 'update', 'products', {
    name: result.product?.name || '',
  })

  refreshCategoryData()
}

// 刷新類別數據
function refreshCategoryData() {
  // 刷新產品表格數據
  const productTableRefs = document.querySelectorAll('product-table')
  productTableRefs.forEach((ref) => {
    if (ref.refreshData) {
      ref.refreshData()
    }
  })
}

// 監聽 props 變化
watch(
  () => props.currentSeries,
  (newValue) => {
    if (newValue) {
      console.log('currentSeries 變更為:', newValue)
      try {
        loadCategories()
      } catch (err) {
        notify.handleApiError(err, {
          showToast: true,
          defaultMessage: '載入類別時發生錯誤',
        })
        error.value = err.message || '載入類別時發生錯誤'
      }
    } else {
      // 如果系列值為空，清空類別列表
      categoryList.value = []
    }
  },
  { immediate: true },
)

// 監聽 seriesStore.items 變化
watch(
  () => seriesStore.items,
  (newItems) => {
    if (props.currentSeries && newItems?.length > 0) {
      // seriesStore 資料更新後，如果當前系列有值，嘗試重新載入類別
      loadCategories()
    }
  },
)

// 監聽通知刷新觸發器
watch(
  () => notify.refreshTriggers.categories,
  (newVal, oldVal) => {
    if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
      loadCategories()
    }
  },
)
</script>
