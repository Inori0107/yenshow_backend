<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
    @click.self="closeModal"
  >
    <div
      :class="[
        cardClass,
        'w-full max-w-2xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto relative',
      ]"
    >
      <button
        @click="closeModal"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="關閉"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <h2
        class="text-[16px] lg:text-[24px] font-bold text-center mb-[12px] lg:mb-[24px] theme-text"
      >
        {{ isEditing ? '編輯常見問題' : '新增常見問題' }}
      </h2>

      <div v-if="loading" class="text-center py-8">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
          :class="conditionalClass('border-white', 'border-blue-600')"
        ></div>
        <p class="mt-2" :class="conditionalClass('text-gray-400', 'text-slate-500')">
          正在載入資料...
        </p>
      </div>

      <form v-else @submit.prevent="submitForm" class="space-y-[12px] lg:space-y-[24px]">
        <div
          v-if="formError"
          class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-4"
        >
          {{ formError }}
        </div>

        <!-- Author & IsActive -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="faqAuthor" class="block mb-3 theme-text">作者 *</label>
            <input
              id="faqAuthor"
              v-model="form.author"
              type="text"
              :class="[inputClass, validationErrors.author ? 'border-red-500' : '']"
              placeholder="請輸入作者名稱"
            />
            <p v-if="validationErrors.author" class="text-red-500 text-xs mt-1">
              {{ validationErrors.author }}
            </p>
          </div>
          <div>
            <label for="faqIsActiveSelect" class="block mb-3 theme-text">發布狀態</label>
            <div v-if="isAdmin">
              <select id="faqIsActiveSelect" v-model="form.isActive" :class="[inputClass]">
                <option :value="false" class="text-black/70">待審查</option>
                <option :value="true" class="text-black/70">已發布</option>
              </select>
            </div>
            <div v-else-if="isEditing && !isAdmin">
              <p :class="[inputClass, 'bg-opacity-50 cursor-not-allowed']">
                {{ form.isActive ? '已發布' : '待審查' }}
              </p>
            </div>
            <div v-else>
              <p :class="[inputClass, 'bg-opacity-50 cursor-not-allowed']">
                待審查 (提交後將由管理員審核)
              </p>
            </div>
          </div>
        </div>

        <!-- Category & Product Model -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="faqCategory" class="block mb-3 theme-text">分類 *</label>
            <input
              id="faqCategory"
              v-model="form.category"
              type="text"
              :class="[inputClass, validationErrors.category ? 'border-red-500' : '']"
              placeholder="請輸入分類"
            />
            <p v-if="validationErrors.category" class="text-red-500 text-xs mt-1">
              {{ validationErrors.category }}
            </p>
          </div>
          <div>
            <label for="faqProductModel" class="block mb-3 theme-text">產品型號 (選填)</label>
            <input
              id="faqProductModel"
              v-model="form.productModel"
              type="text"
              :class="[inputClass]"
              placeholder="例如: XYZ-123"
            />
          </div>
        </div>

        <!-- Publish Date -->
        <div>
          <label for="publishDate" class="block mb-3 theme-text">發布日期 *</label>
          <input
            type="date"
            id="publishDate"
            v-model="form.publishDate"
            :class="[inputClass, 'pe-3', validationErrors.publishDate ? 'border-red-500' : '']"
          />
          <p v-if="validationErrors.publishDate" class="text-red-500 text-xs mt-1">
            {{ validationErrors.publishDate }}
          </p>
        </div>

        <!-- 問題 -->
        <div class="space-y-3">
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium theme-text">問題 *</label>
            <div class="flex items-center space-x-1">
              <button
                type="button"
                @click="questionLanguage = 'TW'"
                :class="[
                  questionLanguage === 'TW'
                    ? 'bg-blue-500 text-white'
                    : conditionalClass('bg-gray-700 text-gray-300', 'bg-gray-200 text-gray-700'),
                  'px-2 py-1 text-xs rounded-md',
                ]"
              >
                TW
              </button>
              <button
                type="button"
                @click="questionLanguage = 'EN'"
                :class="[
                  questionLanguage === 'EN'
                    ? 'bg-blue-500 text-white'
                    : conditionalClass('bg-gray-700 text-gray-300', 'bg-gray-200 text-gray-700'),
                  'px-2 py-1 text-xs rounded-md',
                ]"
              >
                EN
              </button>
            </div>
          </div>
          <div v-show="questionLanguage === 'TW'">
            <input
              v-model="form.question.TW"
              type="text"
              :class="[inputClass, validationErrors['question.TW'] ? 'border-red-500' : '']"
              placeholder="請輸入問題 (繁體中文)"
            />
            <p v-if="validationErrors['question.TW']" class="text-red-500 text-xs mt-1">
              {{ validationErrors['question.TW'] }}
            </p>
          </div>
          <div v-show="questionLanguage === 'EN'">
            <input
              v-model="form.question.EN"
              type="text"
              :class="[inputClass]"
              placeholder="請輸入問題 (English)"
            />
          </div>
        </div>

        <!-- 答案 -->
        <div class="space-y-3">
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium theme-text">答案 *</label>
            <div class="flex items-center space-x-1">
              <button
                type="button"
                @click="answerLanguage = 'TW'"
                :class="[
                  answerLanguage === 'TW'
                    ? 'bg-blue-500 text-white'
                    : conditionalClass('bg-gray-700 text-gray-300', 'bg-gray-200 text-gray-700'),
                  'px-2 py-1 text-xs rounded-md',
                ]"
              >
                TW
              </button>
              <button
                type="button"
                @click="answerLanguage = 'EN'"
                :class="[
                  answerLanguage === 'EN'
                    ? 'bg-blue-500 text-white'
                    : conditionalClass('bg-gray-700 text-gray-300', 'bg-gray-200 text-gray-700'),
                  'px-2 py-1 text-xs rounded-md',
                ]"
              >
                EN
              </button>
            </div>
          </div>
          <div v-show="answerLanguage === 'TW'">
            <textarea
              v-model="form.answer.TW"
              rows="4"
              :class="[inputClass, validationErrors['answer.TW'] ? 'border-red-500' : '']"
              placeholder="請輸入答案 (繁體中文)"
            ></textarea>
            <p v-if="validationErrors['answer.TW']" class="text-red-500 text-xs mt-1">
              {{ validationErrors['answer.TW'] }}
            </p>
          </div>
          <div v-show="answerLanguage === 'EN'">
            <textarea
              v-model="form.answer.EN"
              rows="4"
              :class="[inputClass]"
              placeholder="請輸入答案 (English)"
            ></textarea>
          </div>
        </div>

        <!-- 圖片上傳 -->
        <div class="mb-6">
          <label class="block mb-3 theme-text">圖片 (可上傳多張)</label>
          <MultiAttachmentUploader
            :manager="imageManager"
            attachmentType="image"
            :themeConditionalClass="conditionalClass"
            :inputBaseClass="inputClass"
          />
        </div>

        <!-- 文件上傳 -->
        <div class="mb-6">
          <label class="block mb-3 theme-text">文件 (可上傳多個)</label>
          <MultiAttachmentUploader
            :manager="documentManager"
            attachmentType="document"
            :themeConditionalClass="conditionalClass"
            :inputBaseClass="inputClass"
          />
        </div>

        <!-- 影片上傳 -->
        <div class="mb-6">
          <label class="block mb-3 theme-text">影片 (可上傳多部)</label>
          <MultiAttachmentUploader
            :manager="videoManager"
            attachmentType="video"
            :themeConditionalClass="conditionalClass"
            :inputBaseClass="inputClass"
          />
        </div>

        <!-- 按鈕 -->
        <div
          class="flex justify-end space-x-3 pt-4 border-t"
          :class="conditionalClass('border-gray-700', 'border-gray-200')"
        >
          <button
            type="button"
            @click="closeModal"
            :disabled="isProcessing"
            class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
            :class="
              conditionalClass(
                'bg-gray-600 hover:bg-gray-500 text-gray-200',
                'bg-slate-200 hover:bg-slate-300 text-slate-700',
              )
            "
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="isProcessing || loading"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            <span v-if="isProcessing">
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              處理中...
            </span>
            <span v-else>{{ isEditing ? '更新 FAQ' : '新增 FAQ' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFaqStore } from '@/stores/faqStore'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import { useFormValidation } from '@/composables/useFormValidation'
import { useUserStore } from '@/stores/userStore'
import { useMultiAttachmentManager } from '@/composables/useMultiAttachmentManager'
import MultiAttachmentUploader from '@/components/common/MultiAttachmentUploader.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  faqItem: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:show', 'saved'])

const faqStore = useFaqStore()
const notify = useNotifications()
const { cardClass, inputClass: themeInputClass, conditionalClass } = useThemeClass()
const { errors: validationErrors, clearErrors, setError } = useFormValidation()
const userStore = useUserStore()

const inputClass = computed(() => [
  themeInputClass.value,
  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px] text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
])

const loading = ref(false)
const formError = ref('')
const isProcessing = ref(false)
const isEditing = computed(() => !!props.faqItem?._id)
const isAdmin = computed(() => userStore.isAdmin)

const questionLanguage = ref('TW')
const answerLanguage = ref('TW')

const imageManager = useMultiAttachmentManager({
  formFieldName: 'faqImages',
  markerPrefix: '__NEW_FAQ_IMAGE_MARKER_',
  accept: 'image/*',
})

const videoManager = useMultiAttachmentManager({
  formFieldName: 'faqVideos',
  markerPrefix: '__NEW_FAQ_VIDEO_MARKER_',
  accept: 'video/*',
})

const documentManager = useMultiAttachmentManager({
  formFieldName: 'faqDocuments',
  markerPrefix: '__NEW_FAQ_DOCUMENT_MARKER__',
  accept:
    '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain',
})

onMounted(() => {
  console.log('Image input ref in modal onMount:', imageManager.inputRef.value)
  console.log('Video input ref in modal onMount:', videoManager.inputRef.value)
  console.log('Document input ref in modal onMount:', documentManager.inputRef.value)
})

const formatDateForInput = (dateStringOrDate) => {
  if (!dateStringOrDate) return ''
  try {
    const date = new Date(dateStringOrDate)
    const year = date.getFullYear()
    const month = ('0' + (date.getMonth() + 1)).slice(-2)
    const day = ('0' + date.getDate()).slice(-2)
    return `${year}-${month}-${day}`
  } catch /* (e) */ {
    return ''
  }
}

const initialFormState = () => ({
  _id: null,
  question: { TW: '', EN: '' },
  answer: { TW: '', EN: '' },
  category: '',
  author: '',
  publishDate: formatDateForInput(new Date()),
  productModel: '',
  isActive: false,
  imageUrl: [],
  videoUrl: [],
  documentUrl: [],
})
const form = ref(initialFormState())

const resetForm = () => {
  form.value = initialFormState()
  imageManager.reset()
  videoManager.reset()
  documentManager.reset()
  clearErrors()
  formError.value = ''
  isProcessing.value = false
  questionLanguage.value = 'TW'
  answerLanguage.value = 'TW'
}

watch(
  () => props.show,
  async (newVal) => {
    if (newVal) {
      resetForm()
      if (isEditing.value && props.faqItem?._id) {
        loading.value = true
        try {
          const faqData = props.faqItem
          form.value = {
            _id: faqData._id,
            question: {
              TW: faqData.question?.TW || '',
              EN: faqData.question?.EN || '',
            },
            answer: {
              TW: faqData.answer?.TW || '',
              EN: faqData.answer?.EN || '',
            },
            category: faqData.category || '',
            author: faqData.author || '',
            publishDate: formatDateForInput(faqData.publishDate),
            productModel: faqData.productModel || '',
            isActive: faqData.isActive,
            imageUrl: [],
            videoUrl: [],
            documentUrl: [],
          }

          imageManager.populatePreviews(faqData.imageUrl || [])
          videoManager.populatePreviews(faqData.videoUrl || [])
          documentManager.populatePreviews(faqData.documentUrl || [])

          questionLanguage.value = form.value.question.TW ? 'TW' : 'EN'
          answerLanguage.value = form.value.answer.TW ? 'TW' : 'EN'
        } catch (error) {
          console.error('Failed to load FAQ data for editing:', error)
          formError.value = `載入 FAQ 失敗: ${error.message}`
          notify.notifyError(formError.value)
        } finally {
          loading.value = false
        }
      } else {
        if (userStore.currentUser && !isAdmin.value) {
          form.value.author = userStore.currentUser.username || userStore.currentUser.name || ''
        }
      }
    }
  },
  { immediate: true },
)

const validateForm = () => {
  clearErrors()
  let isValid = true
  if (!form.value.author?.trim()) {
    setError('author', '作者為必填項')
    isValid = false
  }
  if (!form.value.category?.trim()) {
    setError('category', '分類為必填項')
    isValid = false
  }
  if (!form.value.question.TW?.trim() && !form.value.question.EN?.trim()) {
    setError('question.TW', '至少需要一種語言的問題')
    isValid = false
  }
  if (!form.value.answer.TW?.trim() && !form.value.answer.EN?.trim()) {
    setError('answer.TW', '至少需要一種語言的答案')
    isValid = false
  }
  if (!form.value.publishDate) {
    setError('publishDate', '發布日期為必填項')
    isValid = false
  } else {
    const date = new Date(form.value.publishDate)
    if (isNaN(date.getTime())) {
      setError('publishDate', '發布日期格式無效')
      isValid = false
    }
  }

  if (!isValid && !formError.value) {
    const firstErrorKey = Object.keys(validationErrors.value)[0]
    formError.value = validationErrors.value[firstErrorKey]?.message || '表單包含錯誤，請檢查。'
  }
  return isValid
}

const submitForm = async () => {
  if (!validateForm()) return

  isProcessing.value = true
  formError.value = ''

  const formData = new FormData()
  let hasNewFiles = false

  if (imageManager.prepareFormData(formData, form.value, 'imageUrl')) hasNewFiles = true
  if (videoManager.prepareFormData(formData, form.value, 'videoUrl')) hasNewFiles = true
  if (documentManager.prepareFormData(formData, form.value, 'documentUrl')) hasNewFiles = true

  const faqDataPayload = {
    question: form.value.question,
    answer: form.value.answer,
    category: form.value.category,
    author: form.value.author,
    publishDate: form.value.publishDate ? new Date(form.value.publishDate).toISOString() : null,
    isActive: form.value.isActive,
    productModel: form.value.productModel || null,
    imageUrl: form.value.imageUrl,
    videoUrl: form.value.videoUrl,
    documentUrl: form.value.documentUrl,
  }
  if (!faqDataPayload.question.EN) delete faqDataPayload.question.EN
  if (!faqDataPayload.answer.EN) delete faqDataPayload.answer.EN

  let submissionPayload
  if (hasNewFiles) {
    formData.append('faqDataPayload', JSON.stringify(faqDataPayload))
    submissionPayload = formData
  } else {
    submissionPayload = faqDataPayload
  }

  try {
    let result
    if (isEditing.value) {
      result = await faqStore.update(form.value._id, submissionPayload, hasNewFiles)
    } else {
      result = await faqStore.create(submissionPayload, hasNewFiles)
    }

    if (faqStore.error) {
      const errorMessage =
        typeof faqStore.error === 'string'
          ? faqStore.error
          : faqStore.error.response?.data?.message || faqStore.error.message || '操作失敗'
      throw new Error(errorMessage)
    }

    notify.notifySuccess(`問題 ${isEditing.value ? '更新' : '創建'} 成功！`)
    notify.triggerRefresh('faq')
    emit('saved', {
      faq: result || { _id: form.value._id || 'tempId', ...faqDataPayload },
      isNew: !isEditing.value,
    })
    closeModal()
  } catch (error) {
    console.error('FAQ submission failed:', error)
    formError.value = error.message || '操作失敗，請稍後再試。'
  } finally {
    isProcessing.value = false
  }
}

const closeModal = () => {
  if (isProcessing.value) return
  emit('update:show', false)
}
</script>
