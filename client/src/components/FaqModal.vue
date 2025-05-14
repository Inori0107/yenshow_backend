<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center"
    style="background-color: rgba(0, 0, 0, 0.7)"
    @mousedown.self="closeModal"
  >
    <div
      :class="[
        cardClass,
        'w-full max-w-3xl rounded-[10px] shadow-lg p-[24px] max-h-[90vh] overflow-y-auto relative',
      ]"
    >
      <button
        @click="closeModal"
        class="absolute top-4 right-4 p-1 rounded-full hover:bg-opacity-20"
        :class="conditionalClass('hover:bg-gray-500', 'hover:bg-gray-300')"
        title="關閉"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-6 h-6 theme-text"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <h2
        class="text-[16px] lg:text-[24px] font-bold text-center mb-[12px] lg:mb-[24px] theme-text"
      >
        {{ isEditing ? '編輯問題' : '新增問題' }}
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
        <!-- Author & IsActive -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="faqAuthor" class="block mb-3">作者 *</label>
            <input
              id="faqAuthor"
              v-model="form.author"
              type="text"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                validationErrors['author'] ? 'border-red-500' : '',
              ]"
              placeholder="請輸入作者名稱"
              required
            />
            <div v-if="validationErrors['author']" class="text-red-500 text-sm mt-1">
              {{ validationErrors['author'] }}
            </div>
          </div>
          <div>
            <label for="faqIsActiveSelect" class="block mb-3">發布狀態</label>
            <div v-if="isAdmin">
              <select
                id="faqIsActiveSelect"
                v-model="form.isActive"
                :class="[
                  inputClass,
                  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                ]"
              >
                <option :value="false" class="text-black/70">待審查</option>
                <option :value="true" class="text-black/70">已發布</option>
              </select>
            </div>
            <div v-else-if="isEditing && !isAdmin">
              <p
                :class="[
                  inputClass,
                  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                  'bg-opacity-50 cursor-not-allowed',
                ]"
              >
                {{ form.isActive ? '已發布' : '待審查' }}
              </p>
            </div>
            <div v-else>
              <p
                :class="[
                  inputClass,
                  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                  'bg-opacity-50 cursor-not-allowed',
                ]"
              >
                待審查 (提交後自動設為待審查)
              </p>
            </div>
          </div>
        </div>

        <!-- Category & Publish Date -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
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
          <div>
            <label for="publishDate" class="block mb-3">發布日期</label>
            <input
              type="date"
              id="publishDate"
              v-model="form.publishDate"
              class="pe-3"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                validationErrors['publishDate'] ? 'border-red-500' : '',
              ]"
            />
            <div v-if="validationErrors['publishDate']" class="text-red-500 text-sm mt-1">
              {{ validationErrors['publishDate'] }}
            </div>
          </div>
        </div>

        <!-- 問題 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">問題 *</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm">語言:</span>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  questionLanguage === 'TW' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="questionLanguage = 'TW'"
              >
                TW
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  questionLanguage === 'EN' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="questionLanguage = 'EN'"
              >
                EN
              </button>
            </div>
          </div>
          <div class="mb-3">
            <input
              v-model="form.question[questionLanguage]"
              type="text"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                validationErrors[`question.${questionLanguage}`] ? 'border-red-500' : '',
              ]"
              :placeholder="`請輸入問題 (${questionLanguage})`"
            />
            <div
              v-if="validationErrors[`question.TW`] && questionLanguage === 'TW'"
              class="text-red-500 text-sm mt-1"
            >
              {{ validationErrors[`question.TW`] }}
            </div>
            <div
              v-if="validationErrors[`question.EN`] && questionLanguage === 'EN'"
              class="text-red-500 text-sm mt-1"
            >
              {{ validationErrors[`question.EN`] }}
            </div>
          </div>
        </div>

        <!-- 答案 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">答案 *</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm">語言:</span>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  answerLanguage === 'TW' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="answerLanguage = 'TW'"
              >
                TW
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  answerLanguage === 'EN' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="answerLanguage = 'EN'"
              >
                EN
              </button>
            </div>
          </div>
          <div class="mb-3">
            <textarea
              v-model="form.answer[answerLanguage]"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                validationErrors[`answer.${answerLanguage}`] ? 'border-red-500' : '',
              ]"
              rows="5"
              :placeholder="`請輸入答案 (${answerLanguage})`"
            ></textarea>
            <div
              v-if="validationErrors[`answer.TW`] && answerLanguage === 'TW'"
              class="text-red-500 text-sm mt-1"
            >
              {{ validationErrors[`answer.TW`] }}
            </div>
            <div
              v-if="validationErrors[`answer.EN`] && answerLanguage === 'EN'"
              class="text-red-500 text-sm mt-1"
            >
              {{ validationErrors[`answer.EN`] }}
            </div>
          </div>
        </div>

        <!-- Image URLs -->
        <div class="mb-6">
          <label class="block mb-3 theme-text">相關圖片 (可上傳多張)</label>

          <!-- Display existing and newly selected image previews -->
          <div
            v-if="imagePreviews.length > 0"
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4"
          >
            <div v-for="preview in imagePreviews" :key="preview.tempId" class="relative group">
              <img :src="preview.url" alt="圖片預覽" class="w-full h-32 object-cover rounded-md" />
              <button
                type="button"
                @click.stop="removeImagePreview(preview)"
                class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-75 group-hover:opacity-100"
                title="移除圖片"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- File Uploader Input Area -->
          <div
            class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400"
            :class="conditionalClass('border-gray-600', 'border-gray-300')"
            @click="triggerImageInput"
          >
            <div class="space-y-1 text-center">
              <svg
                class="mx-auto h-12 w-12"
                :class="conditionalClass('text-gray-500', 'text-gray-400')"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="flex text-sm" :class="conditionalClass('text-gray-500', 'text-gray-400')">
                <p class="pl-1">點擊或拖曳以上傳圖片 (可選多張)</p>
              </div>
              <p class="text-xs" :class="conditionalClass('text-gray-600', 'text-gray-500')">
                PNG, JPG, GIF, WEBP
              </p>
            </div>
            <input
              ref="imageInputRef"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              @change="handleImageUpload"
            />
          </div>
          <div v-if="validationErrors['imageUrl']" class="text-red-500 text-sm mt-1">
            {{ validationErrors['imageUrl'] }}
          </div>
        </div>

        <!-- 影片 URL -->
        <div class="relative">
          <label for="videoUrl" class="block mb-3">相關影片 URL</label>
          <input
            id="videoUrl"
            v-model="form.videoUrl"
            type="url"
            :class="[
              inputClass,
              'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              validationErrors['videoUrl'] ? 'border-red-500' : '',
            ]"
            placeholder="請輸入影片 URL (選填, 例如 YouTube)"
          />
          <div v-if="validationErrors['videoUrl']" class="text-red-500 text-sm mt-1">
            {{ validationErrors['videoUrl'] }}
          </div>
        </div>

        <!-- 排序 -->
        <div class="relative">
          <label for="faqOrder" class="block mb-3">排序 (數字越小越前面)</label>
          <input
            id="faqOrder"
            v-model.number="form.order"
            type="number"
            :class="[
              inputClass,
              'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              validationErrors['order'] ? 'border-red-500' : '',
            ]"
            placeholder="請輸入排序數字 (預設 0)"
          />
          <div v-if="validationErrors['order']" class="text-red-500 text-sm mt-1">
            {{ validationErrors['order'] }}
          </div>
        </div>

        <!-- 產品型號 -->
        <div class="relative">
          <label for="productModel" class="block mb-3">產品型號</label>
          <input
            id="productModel"
            v-model="form.productModel"
            type="text"
            :class="[
              inputClass,
              'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              validationErrors['productModel'] ? 'border-red-500' : '',
            ]"
            placeholder="請輸入產品型號 (選填)"
          />
          <div v-if="validationErrors['productModel']" class="text-red-500 text-sm mt-1">
            {{ validationErrors['productModel'] }}
          </div>
        </div>

        <!-- 提交按鈕 -->
        <div
          class="flex justify-end gap-4 pt-4 border-t"
          :class="conditionalClass('border-gray-700', 'border-gray-300')"
        >
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
            :disabled="isProcessing"
          >
            取消
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-[10px] cursor-pointer text-white"
            :disabled="isProcessing"
          >
            <span v-if="isProcessing">處理中...</span>
            <span v-else>{{ isEditing ? '更新問題' : '新增問題' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useFaqStore } from '@/stores/faqStore'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import { useFormValidation } from '@/composables/useFormValidation'
import { useUserStore } from '@/stores/userStore'

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

const imageInputRef = ref(null) // Define imageInputRef

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

// Image handling for MULTIPLE images
const imageFiles = ref([])
const imagePreviews = ref([])

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
  _id: '',
  question: { TW: '', EN: '' },
  answer: { TW: '', EN: '' },
  category: '',
  author: '',
  publishDate: formatDateForInput(new Date()),
  order: 0,
  isActive: false,
  productModel: '',
  videoUrl: '',
  imageUrl: [],
})
const form = ref(initialFormState())

const triggerImageInput = () => {
  imageInputRef.value?.click()
}

const handleImageUpload = (event) => {
  const files = Array.from(event.target.files)
  files.forEach((file) => {
    if (file.type.startsWith('image/')) {
      const newFileIndex = imageFiles.value.filter((f) => f !== null).length // Count actual files to be uploaded for unique marker
      imageFiles.value.push(file)
      const previewUrl = URL.createObjectURL(file)
      imagePreviews.value.push({
        url: previewUrl,
        isNew: true,
        fileMarker: `__NEW_IMAGE_MARKER_${newFileIndex}__`, // Store marker for payload
        tempId: `new_${Date.now()}_${Math.random()}_${newFileIndex}`,
      })
    }
  })
  if (event.target) event.target.value = ''
}

const removeImagePreview = (previewToRemove) => {
  if (previewToRemove.isNew && previewToRemove.url.startsWith('blob:')) {
    URL.revokeObjectURL(previewToRemove.url)
  }
  imagePreviews.value = imagePreviews.value.filter((p) => p.tempId !== previewToRemove.tempId)

  if (previewToRemove.isNew) {
    // Find the corresponding file by marker or a more robust link if needed, and nullify it
    // For simplicity, if we remove a new preview, we assume it won't be in `actualFilesToUpload` if not re-added.
    // This relies on `actualFilesToUpload` being built from `imageFiles` where nulls are filtered.
    // To be more robust, we'd need to find the exact file in `imageFiles` and remove or nullify it.
    // A simpler approach is to rebuild `imageFiles` from `imagePreviews` that are `isNew` before submit if many removals happen.
    // For now, rely on filtering `imageFiles` for `null` values before appending to FormData.
  }
  // If it was an existing image, ensure its URL is removed from the list that will be sent to backend
  if (!previewToRemove.isNew) {
    form.value.imageUrl = form.value.imageUrl.filter((url) => url !== previewToRemove.url)
  }
}

const validateForm = () => {
  clearErrors()
  formError.value = ''
  let isValid = true

  if (!form.value.author || form.value.author.trim() === '') {
    setError('author', '作者為必填項')
    isValid = false
  }
  if (!form.value.category || form.value.category.trim() === '') {
    setError('category', '分類為必填項')
    isValid = false
  }
  if (!form.value.question.TW || form.value.question.TW.trim() === '') {
    setError('question.TW', 'TW 問題為必填項')
    isValid = false
  }
  if (!form.value.answer.TW || form.value.answer.TW.trim() === '') {
    setError('answer.TW', 'TW 答案為必填項')
    isValid = false
  }
  if (typeof form.value.order !== 'number') {
    setError('order', '排序必須是數字')
    isValid = false
  }
  if (form.value.publishDate && isNaN(new Date(form.value.publishDate).getTime())) {
    setError('publishDate', '發布日期格式無效')
    isValid = false
  }

  if (!isValid && !formError.value) {
    const firstErrorKey = Object.keys(validationErrors.value)[0]
    formError.value = validationErrors.value[firstErrorKey]?.message || '表單驗證失敗'
  }
  return isValid
}

const submitForm = async () => {
  if (!validateForm()) return

  isProcessing.value = true
  formError.value = ''

  const finalImageUrlsForPayload = []
  const actualFilesToUpload = []

  imagePreviews.value.forEach((preview) => {
    if (preview.isNew) {
      finalImageUrlsForPayload.push(preview.fileMarker || `__NEW_IMAGE_UNLINKED__`)
    } else {
      finalImageUrlsForPayload.push(preview.url)
    }
  })

  // Rebuild actualFilesToUpload based on previews that are new and still exist
  imagePreviews.value.forEach((preview) => {
    if (preview.isNew) {
      const fileFromArray = imageFiles.value.find(
        (f) => f && URL.createObjectURL(f) === preview.url,
      )
      if (fileFromArray) {
        actualFilesToUpload.push(fileFromArray)
      } else {
        console.warn('Could not find matching file for new preview:', preview)
      }
    }
  })

  const faqData = {
    question: {
      TW: form.value.question.TW || '',
      EN: form.value.question.EN || '',
    },
    answer: {
      TW: form.value.answer.TW || '',
      EN: form.value.answer.EN || '',
    },
    category: form.value.category,
    author: form.value.author,
    publishDate: form.value.publishDate ? new Date(form.value.publishDate).toISOString() : null,
    order: form.value.order === '' || form.value.order === null ? 0 : Number(form.value.order),
    isActive: form.value.isActive,
    productModel: form.value.productModel || null,
    videoUrl: form.value.videoUrl || null,
    imageUrl: finalImageUrlsForPayload,
  }

  if (isEditing.value && form.value._id) {
    faqData._id = form.value._id
  }

  if (faqData.question.EN === '') delete faqData.question.EN
  if (faqData.answer.EN === '') delete faqData.answer.EN

  const useFormData = actualFilesToUpload.length > 0
  let submissionPayload

  if (useFormData) {
    submissionPayload = new FormData()
    submissionPayload.append('faqDataPayload', JSON.stringify(faqData))
    actualFilesToUpload.forEach((file) => {
      submissionPayload.append('faqImages', file)
    })
  } else {
    submissionPayload = faqData
  }

  try {
    let result
    if (isEditing.value) {
      result = await faqStore.update(form.value._id, submissionPayload, useFormData)
    } else {
      result = await faqStore.create(submissionPayload, useFormData)
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
      faq: result || {
        _id: form.value._id || 'tempId',
        ...faqData,
        imageUrl: result?.imageUrl || faqData.imageUrl,
      },
      isNew: !isEditing.value,
    })
    closeModal()
  } catch (error) {
    console.error('FAQ 操作失敗:', error)
    formError.value = error.message || '操作失敗，請稍後再試'
  } finally {
    isProcessing.value = false
  }
}

const closeModal = () => {
  if (isProcessing.value) return
  // Cleanup for all previews, new or old, is handled in resetForm or onBeforeUnmount
  emit('update:show', false)
}

const resetForm = () => {
  form.value = initialFormState()
  formError.value = ''
  isProcessing.value = false
  loading.value = false
  questionLanguage.value = 'TW'
  answerLanguage.value = 'TW'

  // Revoke blob URLs for previews of new files
  imagePreviews.value.forEach((preview) => {
    if (preview.isNew && preview.url.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url)
    }
  })
  imagePreviews.value = []
  imageFiles.value = []

  clearErrors()
}

watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      resetForm()
      if (props.faqItem?._id) {
        loading.value = true
        form.value = {
          ...initialFormState(),
          _id: props.faqItem._id,
          question: {
            TW: props.faqItem.question?.TW || '',
            EN: props.faqItem.question?.EN || '',
          },
          answer: {
            TW: props.faqItem.answer?.TW || '',
            EN: props.faqItem.answer?.EN || '',
          },
          category: props.faqItem.category || '',
          author: props.faqItem.author || '',
          publishDate: formatDateForInput(props.faqItem.publishDate),
          order: props.faqItem.order !== undefined ? Number(props.faqItem.order) : 0,
          isActive: props.faqItem.isActive || false,
          productModel: props.faqItem.productModel || '',
          videoUrl: props.faqItem.videoUrl || '',
          imageUrl: [...(props.faqItem.imageUrl || [])],
        }
        // Populate imagePreviews from form.value.imageUrl (which are existing URLs)
        imagePreviews.value = form.value.imageUrl.map((url, index) => ({
          url: url,
          isNew: false,
          tempId: `existing_${index}_${Date.now()}`,
        }))
        questionLanguage.value = form.value.question.TW ? 'TW' : 'EN'
        answerLanguage.value = form.value.answer.TW ? 'TW' : 'EN'
        loading.value = false
      }
    }
  },
  { immediate: true }, // Added immediate to ensure resetForm runs on initial show if true
)

onBeforeUnmount(() => {
  // Revoke any outstanding new image blob URLs
  imagePreviews.value.forEach((preview) => {
    if (preview.isNew && preview.url.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url)
    }
  })
})
</script>
