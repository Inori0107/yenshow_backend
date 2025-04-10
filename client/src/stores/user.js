// Utilities
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import UserRole from '@/enums/UserRole.js'
import { useApi } from '@/composables/axios'
import { useNotifications } from '@/composables/notificationCenter'

export const useUserStore = defineStore(
  'user',
  () => {
    const { api, apiAuth } = useApi()
    const notify = useNotifications()

    const token = ref('')
    const account = ref('')
    const email = ref('')
    const role = ref(UserRole.USER)

    const isLogin = computed(() => {
      return token.value.length > 0
    })
    const isAdmin = computed(() => {
      return role.value === UserRole.ADMIN
    })

    const login = async (values) => {
      try {
        console.log('發送登入請求:', values)
        const { data } = await api.post('/user/login', values)
        console.log('登入回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '登入失敗')
        }

        // 使用更嚴格的提取邏輯
        if (data.token) {
          // 直接取得 token
          token.value = data.token
        } else if (data.result?.token) {
          // token 在 result 中
          token.value = data.result.token
        } else {
          throw new Error('回應中找不到有效的 token')
        }

        // 同樣處理用戶資料
        if (data.user) {
          account.value = data.user.account || ''
          role.value = data.user.role || UserRole.USER
        } else if (data.result?.user) {
          account.value = data.result.user.account || ''
          role.value = data.result.user.role || UserRole.USER
        } else {
          console.warn('回應中找不到用戶資料')
        }

        return data.message || '登入成功'
      } catch (error) {
        console.error('登入錯誤:', error)
        const errorResult = notify.handleApiError(error, {
          defaultMessage: '登入失敗',
          showToast: true,
        })
        return errorResult.message
      }
    }

    const profile = async () => {
      if (!isLogin.value) return

      try {
        const { data } = await apiAuth.get('/user/profile')

        if (!data || !data.success) {
          throw new Error(data?.message || '獲取個人資料失敗')
        }

        // 用戶資料可能在不同位置，優先檢查 result
        const userData = data.result || data

        // 安全提取，設置預設值
        account.value = userData.account || ''
        email.value = userData.email || ''
        role.value = userData.role || UserRole.USER

        return true
      } catch (error) {
        console.error('獲取個人資料錯誤:', error)
        const errorResult = notify.handleApiError(error, {
          defaultMessage: '獲取個人資料失敗',
          showToast: true,
        })

        // 清除用戶資料
        token.value = ''
        account.value = ''
        role.value = UserRole.USER
        email.value = ''

        throw errorResult.error
      }
    }

    const logout = async () => {
      try {
        if (isLogin.value) {
          await apiAuth.delete('/user/logout')
        }
      } catch (error) {
        console.error('登出錯誤:', error)
        notify.handleApiError(error, {
          defaultMessage: '登出失敗',
          showToast: false,
        })
      } finally {
        // 無論如何都清除本地狀態
        token.value = ''
        account.value = ''
        role.value = UserRole.USER
        email.value = ''
      }
    }

    return {
      token,
      account,
      email,
      role,
      isLogin,
      isAdmin,
      login,
      profile,
      logout,
    }
  },
  {
    persist: {
      key: 'user',
      paths: ['token'],
    },
  },
)
