<template>
  <div>
    <!-- 表頭 -->
    <div
      class="grid grid-cols-5 justify-items-center items-center py-3 text-center text-[12px] lg:text-[16px] rounded-t-lg"
      :class="
        conditionalClass(
          'bg-[#1e293b] border-b border-white/30',
          'bg-slate-100 border-b border-slate-300 text-slate-700 font-medium',
        )
      "
    >
      <div class="px-4 lg:px-6">產品</div>
      <!-- 子分類篩選器 (下拉式選單) -->
      <div class="relative" ref="categoriesDropdownRef">
        <button
          @click="toggleCategoriesDropdown"
          class="flex items-center gap-2 px-4 py-2 rounded-[10px] transition-colors"
          :class="
            conditionalClass(
              'border-2 border-[#3F5069] hover:bg-[#3a434c]',
              'border-2 border-slate-300 bg-white hover:bg-slate-50',
            )
          "
        >
          <span>{{ selectedCategoriesLabel }}</span>
          <svg
            class="w-5 h-5 transition-transform"
            :class="{ 'rotate-180': isCategoriesDropdownOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 9l-7 7-7-7"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div
          v-if="isCategoriesDropdownOpen"
          class="absolute z-50 min-w-[200px] rounded-[10px] shadow-lg max-h-[300px] overflow-y-auto space-y-1"
          :class="
            conditionalClass(
              'bg-[#1e293b] border border-[#3F5069]',
              'bg-white border border-slate-200',
            )
          "
        >
          <button
            class="w-full px-4 py-2 text-left flex justify-between items-center gap-2 transition-colors"
            :class="conditionalClass('hover:bg-[#3a434c]', 'hover:bg-slate-100')"
            @click="selectAllCategories"
          >
            <span>全部</span>
            <span v-if="!selectedSubCategoriesId" class="text-blue-400">✓</span>
          </button>
          <template v-if="subCategories && subCategories.length > 0">
            <button
              v-for="subCategory in subCategories"
              :key="subCategory?._id || index"
              class="w-full px-4 py-2 text-left flex justify-between items-center gap-2 transition-colors"
              :class="conditionalClass('hover:bg-[#3a434c]', 'hover:bg-slate-100')"
              @click="subCategory?._id && selectSubCategories(subCategory._id)"
            >
              <span>{{ getLocalizedField(subCategory || {}, 'name', '未命名子分類', 'TW') }}</span>
              <span v-if="selectedSubCategoriesId === subCategory?._id" class="text-blue-400"
                >✓</span
              >
            </button>
          </template>
          <div
            v-else
            class="px-4 py-2 text-center"
            :class="conditionalClass('text-gray-400', 'text-slate-500')"
          >
            無子分類可選擇
          </div>
        </div>
      </div>
      <div class="px-4 lg:px-6">描述</div>
      <div class="px-4 lg:px-6 flex justify-center gap-[8px] lg:gap-[12px]">上架</div>
      <div class="px-4 lg:px-6 flex justify-center gap-[8px] lg:gap-[12px]">時間</div>
    </div>

    <!-- 產品列表 -->
    <div
      v-if="isLoading"
      class="p-8 text-center"
      :class="conditionalClass('text-gray-400', 'text-slate-500')"
    >
      <div class="flex justify-center items-center">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2"
          :class="conditionalClass('border-white', 'border-blue-600')"
        ></div>
      </div>
      <p class="mt-2">正在載入資料...</p>
    </div>
    <div
      v-else-if="!displayedProducts || displayedProducts.length === 0"
      class="p-8 text-center h-[200px] flex justify-center items-center"
      :class="conditionalClass('text-gray-400', 'text-slate-500')"
    >
      <div>
        <svg
          class="w-12 h-12 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          :class="conditionalClass('text-gray-400', 'text-slate-400')"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <p class="mt-2">該分類下暫無產品</p>
      </div>
    </div>
    <div v-else :class="conditionalClass('divide-y divide-white/30', 'divide-y divide-slate-200')">
      <div
        v-for="product in displayedProducts"
        :key="product?._id || index"
        class="grid grid-cols-5 justify-items-center items-center py-3 group"
      >
        <!-- 產品欄 -->
        <div class="flex items-center">
          <img
            :src="
              product?.images && product.images.length > 0 ? product.images[0] : '/placeholder.jpg'
            "
            alt="產品圖片"
            class="w-[48px] aspect-square mr-3 object-cover rounded-md"
            @error="handleImageError($event)"
          />
          <span class="truncate theme-text">{{
            getLocalizedField(product || {}, 'code', '未命名產品', 'TW')
          }}</span>
        </div>

        <!-- 規格欄 -->
        <div class="truncate theme-text">
          {{ getLocalizedField(product || {}, 'name', '未命名產品', 'TW') }}
        </div>

        <!-- 描述欄 -->
        <div class="w-full overflow-hidden text-nowrap theme-text-secondary">
          {{ getLocalizedField(product || {}, 'description', '無描述', 'TW') }}
        </div>

        <!-- 上架狀態 -->
        <div class="flex justify-center">
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              :checked="product?.isActive"
              class="sr-only peer"
              @change="product && toggleProductActive(product)"
            />
            <div
              :class="
                conditionalClass(
                  'w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white',
                  'w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600',
                )
              "
            ></div>
          </label>
        </div>

        <!-- 時間與操作 -->
        <div class="flex items-center gap-[8px] lg:gap-[12px]">
          <span class="theme-text-secondary">{{
            formatDate(product?.updatedAt) || '無更新時間'
          }}</span>
          <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              :class="
                conditionalClass(
                  'p-1 text-white hover:text-blue-400',
                  'p-1 text-slate-600 hover:text-blue-600',
                )
              "
              @click="product && editProduct(product)"
              title="編輯"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </button>
            <button
              :class="
                conditionalClass(
                  'p-1 text-white hover:text-red-400',
                  'p-1 text-slate-600 hover:text-red-600',
                )
              "
              @click="product && confirmDelete(product)"
              title="刪除"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分頁控制 -->
    <div v-if="pagination.totalPages > 1" class="py-4 flex justify-center gap-2">
      <button
        @click="changePage(pagination.currentPage - 1)"
        :disabled="pagination.currentPage === 1"
        :class="
          conditionalClass(
            'px-3 py-1 rounded bg-[#3F5069] disabled:opacity-50',
            'px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50',
          )
        "
      >
        上一頁
      </button>
      <span class="px-3 py-1 theme-text">
        {{ pagination.currentPage }} / {{ pagination.totalPages }}
      </span>
      <button
        @click="changePage(pagination.currentPage + 1)"
        :disabled="pagination.currentPage === pagination.totalPages"
        :class="
          conditionalClass(
            'px-3 py-1 rounded bg-[#3F5069] disabled:opacity-50',
            'px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50',
          )
        "
      >
        下一頁
      </button>
    </div>

    <!-- 確認刪除對話框 -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50" @click="showDeleteConfirm = false"></div>
      <div :class="[cardClass, 'w-full max-w-md rounded-[10px] shadow-lg z-10 p-[24px]']">
        <h3 class="text-[18px] font-bold mb-[16px]">確認刪除</h3>
        <p class="mb-[24px]">
          確定要刪除「{{
            getLocalizedField(productToDelete, 'name', productToDelete?.code || '未命名產品', 'TW')
          }}」嗎？此操作無法恢復。
        </p>
        <div class="flex justify-end gap-[12px]">
          <button
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-[5px]"
            @click="showDeleteConfirm = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-[5px]"
            @click="deleteProduct"
            :disabled="deleting"
          >
            {{ deleting ? '處理中...' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 編輯產品模態框 -->
    <ProductFormModal
      v-model:visible="showProductModal"
      :product-id="editingProductId"
      :categories-id="categoriesId || ''"
      @submit-success="handleProductSubmitSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useNotifications } from '@/composables/notificationCenter'
import { useLanguage } from '@/composables/useLanguage'
import { useApi } from '@/composables/axios'
import { useThemeClass } from '@/composables/useThemeClass'
import ProductFormModal from '@/components/ProductFormModal.vue'

const props = defineProps({
  categoriesId: {
    type: String,
    required: true,
  },
  specificationsId: {
    type: String,
    required: false,
    default: null,
  },
})

const emit = defineEmits(['refresh', 'editProduct'])

// 使用通知和本地化功能
const notify = useNotifications()
const { getLocalizedField } = useLanguage()
const { entityApi, hierarchyApi } = useApi()

// 主題相關
const { cardClass, conditionalClass } = useThemeClass()

// =====================================================
// 基本狀態管理
// =====================================================
const isLoading = ref(false)
const products = ref([])
const pagination = ref({
  currentPage: 1,
  itemsPerPage: 10,
  totalItems: 0,
  totalPages: 0,
})

const subCategories = ref([])
const selectedSubCategoriesId = ref(null)
const categoriesDropdownRef = ref(null)
const isCategoriesDropdownOpen = ref(false)

// 編輯產品相關
const showProductModal = ref(false)
const editingProductId = ref('')

// 刪除產品相關
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const productToDelete = ref(null)

// =====================================================
// 計算屬性
// =====================================================

// 計算選中的類別標籤
const selectedCategoriesLabel = computed(() => {
  if (!selectedSubCategoriesId.value) return '全部子分類'
  const selected = subCategories.value.find((s) => s._id === selectedSubCategoriesId.value)
  if (!selected) return '選擇子分類'
  return getLocalizedField(selected, 'name', '未命名子分類', 'TW')
})

// 顯示的產品列表
const displayedProducts = computed(() => {
  return !products.value || products.value.length === 0 ? [] : products.value
})

// =====================================================
// 共用函數
// =====================================================

// 重置分頁並載入產品資料
const resetAndLoadProducts = () => {
  pagination.value.currentPage = 1
  loadProducts()
}

// 設置/清空產品列表並處理錯誤
const setProductsAndHandleError = (error, errorMessage) => {
  console.error(errorMessage, error)
  products.value = []
  return []
}

// 安全獲取API返回的列表數據
const safeGetArrayFromResult = (result, mainKey, fallbackKey) => {
  return result?.[mainKey] || result?.[fallbackKey] || []
}

// =====================================================
// 數據加載功能
// =====================================================

// 載入類別階層資料
const loadCategoriesHierarchy = async () => {
  if (!props.categoriesId) {
    console.warn('無法載入子分類：categoriesId 為空')
    return
  }

  try {
    const result = await hierarchyApi.getChildrenByParent('categories', props.categoriesId, {
      includeDetail: true,
    })

    // 兼容兩種可能的API返回結構
    const subCategoriesData = safeGetArrayFromResult(result, 'subCategories', 'subCategoriesList')

    if (subCategoriesData.length > 0) {
      subCategories.value = subCategoriesData
    } else {
      console.warn('API返回無子分類數據:', result)
      subCategories.value = []
    }
  } catch (error) {
    console.error('載入子分類失敗:', error)
    subCategories.value = []
    notify.handleApiError(error, { defaultMessage: '載入子分類失敗', showToast: true })
  }
}

// 改進的加載策略
const loadProducts = async () => {
  isLoading.value = true
  try {
    // 限制並發請求數量
    const MAX_CONCURRENT_REQUESTS = 5

    if (selectedSubCategoriesId.value) {
      await loadProductsBySubCategory(selectedSubCategoriesId.value)
    } else if (props.categoriesId) {
      // 改進：先僅獲取所有子分類，然後分批處理其規格和產品
      const result = await hierarchyApi.getChildrenByParent('categories', props.categoriesId, {
        includeDetail: true,
      })

      const subCategoriesList = safeGetArrayFromResult(result, 'subCategoriesList', 'subCategories')

      if (subCategoriesList.length === 0) {
        products.value = []
        return
      }

      // 分批處理子分類
      const allProducts = []
      for (let i = 0; i < subCategoriesList.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = subCategoriesList.slice(i, i + MAX_CONCURRENT_REQUESTS)
        const batchResults = await Promise.all(
          batch.map((subCategory) =>
            subCategory && subCategory._id
              ? loadProductsBySubCategory(subCategory._id)
              : Promise.resolve([]),
          ),
        )

        batchResults.forEach((result) => {
          if (Array.isArray(result)) {
            allProducts.push(...result)
          }
        })
      }

      products.value = allProducts
    } else if (props.specificationsId) {
      await loadProductsBySpecification(props.specificationsId)
    }
  } catch (error) {
    console.error('載入產品數據失敗:', error)
    notify.notifyError('載入產品數據失敗')
    products.value = []
  } finally {
    isLoading.value = false
  }
}

// 按子分類加載產品 - 修復版本
const loadProductsBySubCategory = async (subCategoryId) => {
  if (!subCategoryId) {
    console.warn('嘗試載入子分類產品，但未提供有效的子分類ID')
    products.value = []
    return []
  }

  try {
    // 獲取子分類下的所有規格
    const specificationsResult = await hierarchyApi.getChildrenByParent(
      'subCategories',
      subCategoryId,
      { includeDetail: true },
    )

    // 檢查API返回結構
    if (!specificationsResult) {
      return setProductsAndHandleError(null, '規格API返回無數據')
    }

    // 安全地獲取規格列表
    const specificationsList = safeGetArrayFromResult(
      specificationsResult,
      'specificationsList',
      'specifications',
    )

    if (specificationsList.length === 0) {
      console.log(`子分類 ${subCategoryId} 下無規格數據`)
      products.value = []
      return []
    }

    const allProducts = []

    // 併發請求所有規格下的產品
    const productPromises = specificationsList.map((spec) => {
      if (!spec || !spec._id) {
        console.warn('發現無效規格數據:', spec)
        return Promise.resolve({ items: [] })
      }

      return entityApi('products').search({
        specificationsId: spec._id,
        page: pagination.value.currentPage,
        limit: pagination.value.itemsPerPage,
      })
    })

    const productsResults = await Promise.all(productPromises)

    // 合併所有產品
    productsResults.forEach((result) => {
      if (result && Array.isArray(result.items)) {
        allProducts.push(...result.items)
      }
    })

    products.value = allProducts
    return allProducts
  } catch (error) {
    return setProductsAndHandleError(error, '載入子分類產品失敗:')
  }
}

// 按規格加載產品
const loadProductsBySpecification = async (specificationId) => {
  try {
    const result = await entityApi('products').search({
      specificationsId: specificationId,
      page: pagination.value.currentPage,
      limit: pagination.value.itemsPerPage,
    })

    if (result) {
      products.value = result.items || []
      pagination.value = result.pagination || pagination.value
    }
  } catch (error) {
    console.error('載入規格產品失敗:', error)
    throw error
  }
}

// =====================================================
// 事件處理功能
// =====================================================

// 處理下拉選單操作
const toggleCategoriesDropdown = () => {
  isCategoriesDropdownOpen.value = !isCategoriesDropdownOpen.value
}

// 選擇全部類別
const selectAllCategories = () => {
  selectedSubCategoriesId.value = null
  isCategoriesDropdownOpen.value = false
  resetAndLoadProducts()
}

// 選擇子分類
const selectSubCategories = (subCategoriesId) => {
  selectedSubCategoriesId.value = subCategoriesId
  isCategoriesDropdownOpen.value = false
  resetAndLoadProducts()
}

// 切換頁面
const changePage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return

  pagination.value.currentPage = page
  loadProducts()
}

// 編輯產品
const editProduct = (product) => {
  editingProductId.value = product._id
  showProductModal.value = true
}

// 處理產品提交成功
const handleProductSubmitSuccess = () => {
  loadProducts()
  emit('refresh')
}

// 確認刪除
const confirmDelete = (product) => {
  productToDelete.value = product
  showDeleteConfirm.value = true
}

// 執行刪除
const deleteProduct = async () => {
  if (!productToDelete.value) return

  deleting.value = true
  try {
    const success = await entityApi('products').delete(productToDelete.value._id)

    if (success) {
      showDeleteConfirm.value = false

      // 使用統一的刷新機制
      notify.refreshAfterAction('delete', 'products', {
        name: getLocalizedField(
          productToDelete.value,
          'name',
          productToDelete.value?.code || '未命名產品',
          'TW',
        ),
      })

      await loadProducts()
      emit('refresh')
    } else {
      notify.notifyError('刪除產品失敗')
    }
  } catch (error) {
    notify.handleApiError(error, { defaultMessage: '刪除產品失敗' })
  } finally {
    deleting.value = false
    productToDelete.value = null
  }
}

// 切換產品狀態
const toggleProductActive = async (product) => {
  try {
    // 更新產品狀態
    const updatedData = {
      ...product,
      isActive: !product.isActive,
    }

    const result = await entityApi('products').update(product._id, updatedData)

    if (result) {
      // 使用統一的刷新機制
      notify.refreshAfterAction('update', 'products', {
        name: getLocalizedField(product, 'name', product?.code || '未命名產品', 'TW'),
      })

      // 更新本地狀態
      const index = products.value.findIndex((p) => p._id === product._id)
      if (index !== -1) {
        products.value[index] = result
      }
    } else {
      notify.notifyError('更新產品狀態失敗')
    }
  } catch (error) {
    notify.handleApiError(error, { defaultMessage: '更新產品狀態失敗' })
  }
}

// =====================================================
// 輔助函數
// =====================================================

// 點擊外部關閉下拉選單
const handleClickOutside = (event) => {
  if (categoriesDropdownRef.value && !categoriesDropdownRef.value.contains(event.target)) {
    isCategoriesDropdownOpen.value = false
  }
}

// 處理圖片載入錯誤
const handleImageError = (event) => {
  // 替換為預設圖片
  event.target.src = '/placeholder.jpg'
  // 可選：添加樣式標記錯誤狀態
  event.target.classList.add('img-error')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
    .getDate()
    .toString()
    .padStart(2, '0')}`
}

// =====================================================
// 生命週期鉤子和監聽器
// =====================================================

// 監聽 categoriesId 變化
watch(
  () => props.categoriesId,
  async (newCategoriesId) => {
    if (newCategoriesId) {
      selectedSubCategoriesId.value = null // 重置子分類選擇
      pagination.value.currentPage = 1 // 重置頁數

      // 載入分類階層並初始化子分類
      await loadCategoriesHierarchy()

      // 載入產品
      await loadProducts()
    } else {
      // 清空狀態
      products.value = []
      subCategories.value = []
    }
  },
  { immediate: true },
)

// 監聽 selectedSubCategoriesId 變化
watch(
  () => selectedSubCategoriesId.value,
  () => {
    if (props.categoriesId) {
      resetAndLoadProducts()
    }
  },
)

// 監聽 specificationsId 變化
watch(
  () => props.specificationsId,
  async () => {
    if (props.categoriesId) {
      resetAndLoadProducts()
    }
  },
)

// 監聽通知刷新觸發器
watch(
  () => notify.refreshTriggers.products,
  (newVal, oldVal) => {
    if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
      loadProducts()
    }
  },
)

// 初始化載入
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 暴露刷新方法供父組件調用
defineExpose({
  refreshData: loadProducts,
})
</script>
