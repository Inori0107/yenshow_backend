// Utilities
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/axios'
import { useNotifications } from '@/composables/notificationCenter'

export const useAdminStore = defineStore('admin', () => {
  const { apiAuth, safeApiCall } = useApi()
  const notify = useNotifications()

  // 用戶列表狀態
  const users = ref([])
  const loading = ref(false)
  const error = ref('')

  // 獲取所有用戶
  const getAllUsers = async () => {
    loading.value = true
    error.value = ''

    try {
      console.log('獲取用戶列表開始')
      const { data } = await apiAuth.get('/admin/users')
      console.log('獲取用戶列表回應:', data)

      if (!data || !data.success) {
        throw new Error(data?.message || '獲取用戶列表失敗')
      }

      // 根據實際後端回應格式提取用戶列表
      if (Array.isArray(data.users)) {
        users.value = data.users
      } else if (data.result && Array.isArray(data.result.users)) {
        users.value = data.result.users
      } else {
        console.error('回應格式不符合預期:', data)
        throw new Error('回應中找不到用戶列表')
      }

      return data.message || '獲取用戶列表成功'
    } catch (error) {
      console.error('獲取用戶列表錯誤:', error)
      const errorResult = notify.handleApiError(error, {
        defaultMessage: '獲取用戶列表失敗',
        showToast: true,
      })
      error.value = errorResult.message
      throw error
    } finally {
      loading.value = false
    }
  }

  // 創建新用戶
  const createUser = async (userData) => {
    return await safeApiCall(
      async () => {
        loading.value = true
        console.log('創建用戶開始:', userData)
        const { data } = await apiAuth.post('/admin/users', userData)
        console.log('創建用戶回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '創建用戶失敗')
        }

        // 允許兩種可能的格式
        const newUser = data.result || data.user
        if (newUser) {
          console.log('新用戶數據:', newUser)
          users.value.push(newUser)
          notify.notifySuccess('創建用戶成功')
          return { success: true, message: data.message || '創建用戶成功' }
        } else {
          console.error('回應中找不到用戶數據:', data)
          // 嘗試重新載入用戶列表
          await getAllUsers()
          return { success: true, message: data.message || '創建用戶成功，但無法獲取新用戶詳情' }
        }
      },
      {
        defaultMessage: '創建用戶失敗',
        onFinally: () => {
          loading.value = false
        },
      },
    )
  }

  // 更新用戶信息
  const updateUser = async (userId, userData) => {
    return await safeApiCall(
      async () => {
        loading.value = true
        console.log('更新用戶開始:', { userId, userData })
        const { data } = await apiAuth.put(`/admin/users/${userId}`, userData)
        console.log('更新用戶回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '更新用戶失敗')
        }

        // 允許兩種可能的格式
        const updatedUser = data.result || data.user
        if (updatedUser) {
          const index = users.value.findIndex((user) => user._id === userId)
          if (index !== -1) {
            users.value[index] = { ...users.value[index], ...updatedUser }
          }
          return { success: true, message: data.message || '更新用戶成功' }
        } else {
          console.error('回應中找不到用戶數據:', data)
          // 嘗試重新載入用戶列表
          await getAllUsers()
          return { success: true, message: data.message || '更新用戶成功，但無法獲取更新詳情' }
        }
      },
      {
        defaultMessage: '更新用戶失敗',
        onFinally: () => {
          loading.value = false
        },
      },
    )
  }

  // 重置用戶密碼
  const resetUserPassword = async (userId) => {
    return await safeApiCall(
      async () => {
        loading.value = true
        console.log('重置密碼開始:', userId)
        // 使用固定的預設密碼
        const defaultPassword = 'Aa83124007'

        const { data } = await apiAuth.post(`/admin/users/${userId}/reset-password`, {
          password: defaultPassword,
        })
        console.log('重置密碼回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '重置密碼失敗')
        }

        return {
          success: true,
          message: data.message || '密碼重置成功',
          newPassword: defaultPassword,
        }
      },
      {
        defaultMessage: '重置密碼失敗',
        onFinally: () => {
          loading.value = false
        },
      },
    )
  }

  // 啟用用戶
  const activateUser = async (userId) => {
    return await safeApiCall(
      async () => {
        loading.value = true
        console.log('啟用用戶開始:', userId)
        const { data } = await apiAuth.post(`/admin/users/${userId}/activate`)
        console.log('啟用用戶回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '啟用用戶失敗')
        }

        // 允許多種可能的格式
        const updatedUser = data.result?.user || data.user || data.result
        if (updatedUser) {
          // 更新本地狀態
          const index = users.value.findIndex((user) => user._id === userId)
          if (index !== -1) {
            users.value[index] = updatedUser
          }
          return data.message || '用戶啟用成功'
        } else {
          console.warn('回應中找不到更新後的用戶數據:', data)
          // 重新載入用戶列表
          await getAllUsers()
          return data.message || '用戶啟用成功'
        }
      },
      {
        defaultMessage: '啟用用戶失敗',
        onFinally: () => {
          loading.value = false
        },
      },
    )
  }

  // 停用用戶
  const deactivateUser = async (userId) => {
    return await safeApiCall(
      async () => {
        loading.value = true
        console.log('停用用戶開始:', userId)
        const { data } = await apiAuth.post(`/admin/users/${userId}/deactivate`)
        console.log('停用用戶回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '停用用戶失敗')
        }

        // 允許多種可能的格式
        const updatedUser = data.result?.user || data.user || data.result
        if (updatedUser) {
          // 更新本地狀態
          const index = users.value.findIndex((user) => user._id === userId)
          if (index !== -1) {
            users.value[index] = updatedUser
          }
          return data.message || '用戶停用成功'
        } else {
          console.warn('回應中找不到更新後的用戶數據:', data)
          // 重新載入用戶列表
          await getAllUsers()
          return data.message || '用戶停用成功'
        }
      },
      {
        defaultMessage: '停用用戶失敗',
        onFinally: () => {
          loading.value = false
        },
      },
    )
  }

  // 刪除用戶
  const deleteUser = async (userId) => {
    return await safeApiCall(
      async () => {
        loading.value = true
        console.log('刪除用戶開始:', userId)
        const { data } = await apiAuth.delete(`/admin/users/${userId}`)
        console.log('刪除用戶回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '刪除用戶失敗')
        }

        // 從用戶列表中移除該用戶
        const index = users.value.findIndex((user) => user._id === userId)
        if (index !== -1) {
          users.value.splice(index, 1)
        }

        notify.notifySuccess('用戶刪除成功')
        return { success: true, message: data.message || '用戶刪除成功' }
      },
      {
        defaultMessage: '刪除用戶失敗',
        onFinally: () => {
          loading.value = false
        },
      },
    )
  }

  return {
    // 狀態
    users,
    loading,
    error,
    // 方法
    getAllUsers,
    createUser,
    updateUser,
    resetUserPassword,
    activateUser,
    deactivateUser,
    deleteUser,
  }
})
