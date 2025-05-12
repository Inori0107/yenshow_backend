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

        <!-- Meta 標題 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">Meta 標題 (SEO)</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm">語言:</span>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  metaTitleLanguage === 'TW'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300'
                "
                @click="metaTitleLanguage = 'TW'"
              >
                TW
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  metaTitleLanguage === 'EN'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300'
                "
                @click="metaTitleLanguage = 'EN'"
              >
                EN
              </button>
            </div>
          </div>
          <div class="mb-3">
            <input
              v-model="form.metaTitle[metaTitleLanguage]"
              type="text"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              :placeholder="`請輸入 Meta 標題 (${metaTitleLanguage})`"
            />
          </div>
        </div>

        <!-- Meta 描述 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block">Meta 描述 (SEO)</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm">語言:</span>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  metaDescLanguage === 'TW' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="metaDescLanguage = 'TW'"
              >
                TW
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs rounded-md"
                :class="
                  metaDescLanguage === 'EN' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                "
                @click="metaDescLanguage = 'EN'"
              >
                EN
              </button>
            </div>
          </div>
          <div class="mb-3">
            <textarea
              v-model="form.metaDescription[metaDescLanguage]"
              :class="[
                inputClass,
                'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
              ]"
              rows="3"
              :placeholder="`請輸入 Meta 描述 (${metaDescLanguage})`"
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
            <span v-else>{{ isEditing ? '更新問題' : '新增問題' }}</span>
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
const metaTitleLanguage = ref('TW')
const metaDescLanguage = ref('TW')

// 表單數據
const initialFormState = () => ({
  _id: '',
  question: { TW: '', EN: '' },
  answer: { TW: '', EN: '' },
  category: '',
  order: 0,
  isActive: true,
  metaTitle: { TW: '', EN: '' },
  metaDescription: { TW: '', EN: '' },
})
const form = ref(initialFormState())

// ===== 表單處理方法 =====

const validateForm = () => {
  clearErrors()
  formError.value = ''
  let isValid = true

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

  // 確保至少一種語言的問題和答案有值 (TW 已設為必填)
  // const hasQuestionContent = form.value.question.TW || form.value.question.EN
  // const hasAnswerContent = form.value.answer.TW || form.value.answer.EN

  // if (!hasQuestionContent) {
  //   setError('question.TW', '問題至少需要一種語言版本')
  //   isValid = false
  // }

  // if (!hasAnswerContent) {
  //   setError('answer.TW', '答案至少需要一種語言版本')
  //   isValid = false
  // }

  if (!isValid) {
    formError.value = Object.values(validationErrors.value)[0]?.message || '表單驗證失敗'
  }

  return isValid
}

const submitForm = async () => {
  try {
    if (!validateForm()) return
    isProcessing.value = true

    // 構建與後端模型匹配的數據對象
    const data = {
      category: form.value.category,
      question: {
        TW: form.value.question.TW || '',
        EN: form.value.question.EN || '',
      },
      answer: {
        TW: form.value.answer.TW || '',
        EN: form.value.answer.EN || '',
      },
      order: form.value.order === '' ? 0 : Number(form.value.order), // 確保是數字，空字串轉為0
      isActive: form.value.isActive,
      metaTitle: {
        TW: form.value.metaTitle.TW || '',
        EN: form.value.metaTitle.EN || '',
      },
      metaDescription: {
        TW: form.value.metaDescription.TW || '',
        EN: form.value.metaDescription.EN || '',
      },
    }

    // 移除空值的 EN 欄位，如果後端不需要空字串
    if (data.question.EN === '') delete data.question.EN
    if (data.answer.EN === '') delete data.answer.EN
    if (data.metaTitle.EN === '') delete data.metaTitle.EN
    if (data.metaDescription.EN === '') delete data.metaDescription.EN
    // 如果metaTitle整個都是空的，也可以選擇刪除它
    if (!data.metaTitle.TW && !data.metaTitle.EN) delete data.metaTitle
    if (!data.metaDescription.TW && !data.metaDescription.EN) delete data.metaDescription

    console.log('資料提交中...', data)

    let result
    if (isEditing.value) {
      result = await faqStore.update(form.value._id, data)
    } else {
      result = await faqStore.create(data)
    }

    if (faqStore.error) {
      throw new Error(faqStore.error.message || faqStore.error) // 確保能拿到 message 字串
    }

    notify.notifySuccess(`問題 ${isEditing.value ? '更新' : '創建'} 成功！`)
    notify.triggerRefresh('faq')
    emit('saved', {
      faq: result || { _id: form.value._id || 'tempId', ...data }, // 提供回饋資料
      isNew: !isEditing.value,
    })
    closeModal()
  } catch (error) {
    console.error('操作失敗:', error)
    formError.value = error.message || '操作失敗，請稍後再試'
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
  metaTitleLanguage.value = 'TW'
  metaDescLanguage.value = 'TW'
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
          order: props.faqItem.order !== undefined ? Number(props.faqItem.order) : 0,
          isActive: props.faqItem.isActive !== undefined ? props.faqItem.isActive : true,
          metaTitle: {
            TW: props.faqItem.metaTitle?.TW || '',
            EN: props.faqItem.metaTitle?.EN || '',
          },
          metaDescription: {
            TW: props.faqItem.metaDescription?.TW || '',
            EN: props.faqItem.metaDescription?.EN || '',
          },
        }
        questionLanguage.value = form.value.question.TW ? 'TW' : 'EN'
        answerLanguage.value = form.value.answer.TW ? 'TW' : 'EN'
        metaTitleLanguage.value = form.value.metaTitle.TW ? 'TW' : 'EN'
        metaDescLanguage.value = form.value.metaDescription.TW ? 'TW' : 'EN'
      } else {
        resetForm()
      }
    }
  },
)
</script>
