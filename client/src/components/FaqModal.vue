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
        <!-- 問題分類 -->
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

        <!-- 問題 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">問題</label>
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
                繁體中文
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  questionLanguage === 'EN' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="questionLanguage = 'EN'"
              >
                English
              </button>
            </div>
          </div>
          <div class="mb-3">
            <input
              v-model="form[`question_${questionLanguage}`]"
              type="text"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              :placeholder="`請輸入問題 (${questionLanguage === 'TW' ? '繁體中文' : '英文'})`"
              required
            />
          </div>
        </div>

        <!-- 答案 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">答案</label>
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
                繁體中文
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  answerLanguage === 'EN' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="answerLanguage = 'EN'"
              >
                English
              </button>
            </div>
          </div>
          <div class="mb-3">
            <textarea
              v-model="form[`answer_${answerLanguage}`]"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              rows="5"
              :placeholder="`請輸入答案 (${answerLanguage === 'TW' ? '繁體中文' : '英文'})`"
            ></textarea>
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
            <span class="ml-3 text-sm font-medium theme-text">顯示</span>
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
import { useFaqStore } from '@/stores/faqStore'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import { useFormValidation } from '@/composables/useFormValidation'

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

// 初始化工具與狀態
const faqStore = useFaqStore()
const notify = useNotifications()
const { cardClass, inputClass, conditionalClass } = useThemeClass()
const { errors: validationErrors, clearErrors, setError } = useFormValidation()

// 基本狀態
const loading = ref(false)
const formError = ref('')
const isProcessing = ref(false)
const isEditing = computed(() => !!props.faqItem?._id)

// 語言切換狀態
const questionLanguage = ref('TW')
const answerLanguage = ref('TW')

// 表單數據
const initialFormState = () => ({
  _id: '',
  question_TW: '',
  question_EN: '',
  answer_TW: '',
  answer_EN: '',
  category: '',
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

  if (!form.value.question_TW || form.value.question_TW.trim() === '') {
    setError('question_TW', '繁體中文問題為必填項')
    isValid = false
  }

  if (!form.value.answer_TW || form.value.answer_TW.trim() === '') {
    setError('answer_TW', '繁體中文答案為必填項')
    isValid = false
  }

  // 檢查輸入值是否為有效字串，而非純數字
  if (form.value.category && !isNaN(form.value.category) && form.value.category.trim() !== '') {
    // 只是提醒，不影響提交
    console.warn('提醒：分類可能需要是字串而非數字')
  }

  // 確保至少一種語言的問題和答案有值
  const hasQuestionContent = form.value.question_TW || form.value.question_EN
  const hasAnswerContent = form.value.answer_TW || form.value.answer_EN

  if (!hasQuestionContent) {
    setError('question_TW', '問題至少需要一種語言版本')
    isValid = false
  }

  if (!hasAnswerContent) {
    setError('answer_TW', '答案至少需要一種語言版本')
    isValid = false
  }

  if (!isValid) {
    formError.value = Object.values(validationErrors.value)[0] || '表單驗證失敗'
  }

  return isValid
}

const submitForm = async () => {
  try {
    if (!validateForm()) return
    isProcessing.value = true

    // 構建 JSON 數據對象 (不使用 FormData)
    const data = {
      category: form.value.category,
      // 構建嵌套對象結構
      question: {
        TW: form.value.question_TW || '',
        EN: form.value.question_EN || '',
      },
      answer: {
        TW: form.value.answer_TW || '',
        EN: form.value.answer_EN || '',
      },
      isActive: form.value.isActive,
    }

    // 簡化日誌輸出
    console.log('資料提交中...')

    // 額外檢查 TW 字段是否存在並有值
    if (!data.question.TW || !data.answer.TW) {
      formError.value = '繁體中文問題和答案為必填項'
      return
    }

    // 確保數據結構符合後端期望
    const structureCheck = {
      hasQuestion: typeof data.question === 'object',
      hasAnswer: typeof data.answer === 'object',
      questionFormat: data.question && 'TW' in data.question,
      answerFormat: data.answer && 'TW' in data.answer,
    }

    if (!Object.values(structureCheck).every((v) => v)) {
      formError.value = '表單數據結構無效，請重試'
      isProcessing.value = false
      return
    }

    // 使用 faq store 提交數據
    let result

    if (isEditing.value) {
      result = await faqStore.update(form.value._id, data)
    } else {
      result = await faqStore.create(data)
    }

    // 檢查錯誤
    if (faqStore.error) {
      throw new Error(faqStore.error)
    }

    // 如果沒有錯誤但也沒有結果，我們假設操作成功
    if (!result) {
      result = {
        _id: isEditing.value ? form.value._id : 'tempId',
        ...data,
      }
    }

    notify.notifySuccess(`問題${isEditing.value ? '更新' : '創建'}成功！`)

    // 觸發資料刷新
    notify.triggerRefresh('faq')

    // 發送成功事件並關閉模態框
    emit('saved', {
      faq: result,
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
  questionLanguage.value = 'TW'
  answerLanguage.value = 'TW'
  clearErrors()
}

// ===== 監聽器 =====

watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      resetForm()
      if (props.faqItem?._id) {
        form.value = {
          ...initialFormState(),
          _id: props.faqItem._id,
          question_TW: props.faqItem.question?.TW || '',
          question_EN: props.faqItem.question?.EN || '',
          answer_TW: props.faqItem.answer?.TW || '',
          answer_EN: props.faqItem.answer?.EN || '',
          category: props.faqItem.category || '',
          isActive: props.faqItem.isActive !== undefined ? props.faqItem.isActive : true,
        }
        questionLanguage.value = form.value.question_TW ? 'TW' : 'EN'
        answerLanguage.value = form.value.answer_TW ? 'TW' : 'EN'
      } else {
        resetForm()
      }
    }
  },
)
</script>
