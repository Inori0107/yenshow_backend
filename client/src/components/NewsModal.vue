<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center"
    style="background-color: rgba(0, 0, 0, 0.7)"
  >
    <div
      :class="[
        cardClass,
        'w-full max-w-xl rounded-[10px] shadow-lg p-[24px] max-h-[90vh] overflow-y-auto relative',
      ]"
    >
      <h2
        class="text-[16px] lg:text-[24px] font-bold text-center mb-[12px] lg:mb-[24px] theme-text"
      >
        {{ isEditing ? '編輯新聞' : '新增新聞' }}
      </h2>

      <!-- 加載指示器 -->
      <div v-if="loading" class="text-center py-8">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
          :class="conditionalClass('border-white', 'border-blue-600')"
        ></div>
        <p class="mt-2" :class="conditionalClass('text-gray-400', 'text-slate-500')">正在處理...</p>
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
        <!-- 新聞分類 -->
        <div class="relative">
          <label class="block mb-3">分類 *</label>
          <input
            v-model="form.category"
            type="text"
            :class="[
              inputClass,
              'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              validationErrors['category'] ? 'border-red-500' : '',
            ]"
            placeholder="請輸入分類"
            required
          />
          <div v-if="validationErrors['category']" class="text-red-500 text-sm mt-1">
            {{ validationErrors['category'] }}
          </div>
        </div>

        <!-- 標題 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">標題</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm">語言:</span>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  titleLanguage === 'TW' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="titleLanguage = 'TW'"
              >
                繁體中文
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  titleLanguage === 'EN' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="titleLanguage = 'EN'"
              >
                English
              </button>
            </div>
          </div>
          <div class="mb-3">
            <input
              v-model="form[`title_${titleLanguage}`]"
              type="text"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              :placeholder="`請輸入標題 (${titleLanguage === 'TW' ? '繁體中文' : '英文'})`"
              required
            />
          </div>
        </div>

        <!-- 內容 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">內容</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm">語言:</span>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  contentLanguage === 'TW' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="contentLanguage = 'TW'"
              >
                繁體中文
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  contentLanguage === 'EN' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="contentLanguage = 'EN'"
              >
                English
              </button>
            </div>
          </div>
          <div class="mb-3">
            <textarea
              v-model="form[`content_${contentLanguage}`]"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              rows="5"
              :placeholder="`請輸入內容 (${contentLanguage === 'TW' ? '繁體中文' : '英文'})`"
            ></textarea>
          </div>
        </div>

        <!-- 圖片上傳 -->
        <div class="mb-6">
          <label class="block mb-3">圖片</label>
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
            <div v-if="!imagePreview && !form.imageUrl">
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
            <img
              v-else-if="imagePreview"
              :src="imagePreview"
              alt="預覽圖片"
              class="mx-auto max-h-40 rounded"
            />
            <img
              v-else-if="form.imageUrl"
              :src="form.imageUrl"
              alt="新聞圖片"
              class="mx-auto max-h-40 rounded"
            />
          </div>
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
            <span class="ml-3 text-sm font-medium theme-text">上架新聞</span>
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
            <span v-else>{{ isEditing ? '更新新聞' : '新增新聞' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNewsStore } from '@/stores/newsStore'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import { useFormValidation } from '@/composables/useFormValidation'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  newsItem: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:show', 'saved'])

// 初始化工具與狀態
const newsStore = useNewsStore()
const notify = useNotifications()
const { cardClass, inputClass, conditionalClass } = useThemeClass()
const { errors: validationErrors, clearErrors, setError } = useFormValidation()

// 基本狀態
const loading = ref(false)
const formError = ref('')
const isProcessing = ref(false)
const isEditing = computed(() => !!props.newsItem?._id)

// 語言切換狀態
const titleLanguage = ref('TW')
const contentLanguage = ref('TW')

// 圖片上傳狀態
const imageFile = ref(null)
const imagePreview = ref(null)

// 表單數據
const initialFormState = () => ({
  _id: '',
  title_TW: '',
  title_EN: '',
  content_TW: '',
  content_EN: '',
  category: '',
  imageUrl: '',
  isActive: true,
})
const form = ref(initialFormState())

// ===== 表單處理方法 =====

const validateForm = () => {
  clearErrors()
  formError.value = ''
  let isValid = true

  // 檢查必填字段
  if (!form.value.category || form.value.category.trim() === '') {
    setError('category', '分類為必填項')
    isValid = false
  }

  if (!form.value.title_TW || form.value.title_TW.trim() === '') {
    setError('title_TW', '繁體中文標題為必填項')
    isValid = false
  }

  if (!form.value.content_TW || form.value.content_TW.trim() === '') {
    setError('content_TW', '繁體中文內容為必填項')
    isValid = false
  }

  // 檢查輸入值是否為有效字串，而非純數字
  if (form.value.category && !isNaN(form.value.category) && form.value.category.trim() !== '') {
    // 只是提醒，不影響提交
    console.warn('提醒：分類可能需要是字串而非數字')
  }

  // 確保至少一種語言的標題和內容有值
  const hasTitleContent = form.value.title_TW || form.value.title_EN
  const hasMainContent = form.value.content_TW || form.value.content_EN

  if (!hasTitleContent) {
    setError('title_TW', '標題至少需要一種語言版本')
    isValid = false
  }

  if (!hasMainContent) {
    setError('content_TW', '內容至少需要一種語言版本')
    isValid = false
  }

  if (!isValid) {
    formError.value = Object.values(validationErrors.value)[0] || '表單驗證失敗'
  }

  return isValid
}

// 處理圖片上傳
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

const submitForm = async () => {
  try {
    if (!validateForm()) return
    isProcessing.value = true

    let formData = null

    // 如果有圖片，需要使用 FormData
    if (imageFile.value) {
      formData = new FormData()

      // 添加基本資料
      formData.append('category', form.value.category)

      // 添加多語言標題
      const title = {
        TW: form.value.title_TW || '',
        EN: form.value.title_EN || '',
      }
      formData.append('title', JSON.stringify(title))

      // 添加多語言內容
      const content = {
        TW: form.value.content_TW || '',
        EN: form.value.content_EN || '',
      }
      formData.append('content', JSON.stringify(content))

      // 添加圖片
      formData.append('image', imageFile.value)

      // 添加上架選項
      formData.append('isActive', form.value.isActive ? 'true' : 'false')

      console.log('資料提交中 (含圖片)...')
    } else {
      // 如果沒有新圖片，使用一般 JSON 對象
      formData = {
        category: form.value.category,
        title: {
          TW: form.value.title_TW || '',
          EN: form.value.title_EN || '',
        },
        content: {
          TW: form.value.content_TW || '',
          EN: form.value.content_EN || '',
        },
        isActive: form.value.isActive,
      }

      // 如果編輯模式且已有圖片 URL，保留該 URL
      if (isEditing.value && form.value.imageUrl) {
        formData.imageUrl = form.value.imageUrl
      }

      console.log('資料提交中...')
    }

    // 確保必要欄位存在
    if (
      (formData instanceof FormData && !formData.get('title')) ||
      (!(formData instanceof FormData) && !formData.title?.TW)
    ) {
      formError.value = '繁體中文標題和內容為必填項'
      isProcessing.value = false
      return
    }

    // 使用 news store 提交數據
    let result

    if (isEditing.value) {
      result = await newsStore.update(form.value._id, formData)
    } else {
      result = await newsStore.create(formData)
    }

    // 檢查錯誤
    if (newsStore.error) {
      throw new Error(newsStore.error)
    }

    // 如果沒有錯誤但也沒有結果，我們假設操作成功
    if (!result) {
      result = {
        _id: isEditing.value ? form.value._id : 'tempId',
        ...(formData instanceof FormData ? {} : formData),
      }
    }

    notify.notifySuccess(`新聞${isEditing.value ? '更新' : '創建'}成功！`)

    // 觸發資料刷新
    notify.triggerRefresh('news')

    // 發送成功事件並關閉模態框
    emit('saved', {
      news: result,
      isNew: !isEditing.value,
    })

    closeModal()
  } catch (error) {
    console.error('操作失敗:', error.message)

    // 簡化錯誤處理
    if (error.response?.data) {
      formError.value = error.response.data.message || '提交失敗'
    } else {
      formError.value = error.message || '操作失敗，請稍後再試'
    }
  } finally {
    isProcessing.value = false
  }
}

// ===== 模態框控制 =====

const closeModal = () => {
  emit('update:show', false)
}

const resetForm = () => {
  form.value = initialFormState()
  formError.value = ''
  isProcessing.value = false
  loading.value = false
  titleLanguage.value = 'TW'
  contentLanguage.value = 'TW'
  imageFile.value = null
  imagePreview.value = null
  clearErrors()
}

// ===== 監聽器 =====

watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      resetForm()
      if (props.newsItem?._id) {
        form.value = {
          ...initialFormState(),
          _id: props.newsItem._id,
          title_TW: props.newsItem.title?.TW || '',
          title_EN: props.newsItem.title?.EN || '',
          content_TW: props.newsItem.content?.TW || '',
          content_EN: props.newsItem.content?.EN || '',
          category: props.newsItem.category || '',
          imageUrl: props.newsItem.imageUrl || '',
          isActive: props.newsItem.isActive !== undefined ? props.newsItem.isActive : true,
        }
        titleLanguage.value = form.value.title_TW ? 'TW' : 'EN'
        contentLanguage.value = form.value.content_TW ? 'TW' : 'EN'

        // 如果有圖片 URL，設置為預覽
        if (form.value.imageUrl) {
          imagePreview.value = null // 使用現有的 imageUrl，不需要本地預覽
        }
      } else {
        resetForm()
      }
    }
  },
)
</script>
