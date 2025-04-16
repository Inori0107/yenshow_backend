<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- 背景遮罩 -->
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

    <!-- Modal 內容 -->
    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div :class="[cardClass, 'relative rounded-xl max-w-md w-full p-6']">
        <!-- 標題 -->
        <h3 class="text-xl font-semibold mb-6 theme-text">新增用戶</h3>

        <!-- 表單 -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 帳號 -->
          <div>
            <label for="account" class="block text-sm font-medium mb-2 theme-text">帳號 *</label>
            <input
              type="text"
              id="account"
              v-model="formData.account"
              required
              :class="[
                inputClass,
                'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
              ]"
              placeholder="請輸入帳號（4-20個字元）"
            />
          </div>

          <!-- 電子郵件 -->
          <div>
            <label for="email" class="block text-sm font-medium mb-2 theme-text">電子郵件 *</label>
            <input
              type="email"
              id="email"
              v-model="formData.email"
              required
              :class="[
                inputClass,
                'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
              ]"
              placeholder="請輸入電子郵件"
            />
          </div>

          <!-- 密碼 -->
          <div>
            <label for="password" class="block text-sm font-medium mb-2 theme-text">密碼 *</label>
            <input
              type="password"
              id="password"
              v-model="formData.password"
              required
              :class="[
                inputClass,
                'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
              ]"
              placeholder="請輸入密碼（4-20個字元）"
            />
          </div>

          <!-- 角色選擇 -->
          <div>
            <label for="role" class="block text-sm font-medium mb-2 theme-text">用戶角色</label>
            <select
              id="role"
              v-model="formData.role"
              :class="[
                inputClass,
                'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
              ]"
            >
              <option :value="UserRole.USER">一般用戶</option>
              <option :value="UserRole.ADMIN">管理員</option>
            </select>
          </div>

          <!-- 錯誤訊息 -->
          <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>

          <!-- 按鈕組 -->
          <div class="flex justify-end gap-4 mt-6">
            <button
              type="button"
              @click="close"
              :class="
                conditionalClass(
                  'text-white/70 hover:text-white',
                  'text-slate-500 hover:text-slate-700',
                )
              "
              class="px-4 py-2 transition"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition flex items-center gap-2 text-white"
            >
              <span
                v-if="loading"
                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
              />
              {{ loading ? '處理中...' : '確認新增' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, toRefs } from 'vue'
import { useAdminStore } from '@/stores/admin'
import UserRole from '@/enums/UserRole'
import validator from 'validator'
import { useThemeClass } from '@/composables/useThemeClass'

// 獲取主題相關工具
const { cardClass, inputClass, conditionalClass } = useThemeClass()

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

// 使用 toRefs 來解構 props
const { show } = toRefs(props)

const emit = defineEmits(['update:show'])
const adminStore = useAdminStore()

const formData = reactive({
  account: '',
  email: '',
  password: '',
  role: UserRole.USER,
})

const loading = ref(false)
const error = ref('')

const validateForm = () => {
  // 必填欄位檢查
  if (!formData.account || !formData.email || !formData.password) {
    error.value = '帳號、信箱和密碼為必填欄位'
    return false
  }

  // 帳號長度檢查
  if (formData.account.length < 2 || formData.account.length > 20) {
    error.value = '帳號長度必須在 2-20 個字元之間'
    return false
  }

  // Email 格式檢查
  if (!validator.isEmail(formData.email)) {
    error.value = '無效的 email 格式'
    return false
  }

  // 密碼長度檢查
  if (formData.password.length < 4 || formData.password.length > 20) {
    error.value = '密碼長度必須在 4-20 個字元之間'
    return false
  }

  return true
}

const resetForm = () => {
  formData.account = ''
  formData.email = ''
  formData.password = ''
  formData.role = UserRole.USER
  error.value = ''
}

const close = () => {
  emit('update:show', false)
  resetForm()
}

const handleSubmit = async () => {
  error.value = ''

  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const message = await adminStore.createUser({
      account: formData.account,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    })
    // 顯示成功訊息
    console.log(message) // '創建用戶成功'
    close()
  } catch (err) {
    console.error('創建用戶失敗:', err)
    // 直接使用錯誤訊息字串
    error.value = err || '創建用戶失敗'
  } finally {
    loading.value = false
  }
}
</script>
