import { useToast } from 'vue-toastification'
import { defineStore } from 'pinia'
import { ref } from 'vue'

// 使用 Pinia 建立中央通知儲存庫
export const useNotificationStore = defineStore('notification', () => {
  // === Toast 核心功能 ===

  // 基礎通知函數
  function notify(message, type = 'success', options = {}) {
    const toast = useToast()
    const defaultOptions = {
      timeout: 3000,
      closeOnClick: true,
      pauseOnHover: true,
    }

    const mergedOptions = { ...defaultOptions, ...options }
    toast[type](message, mergedOptions)
  }

  // 成功通知
  function notifySuccess(message, options = {}) {
    notify(message, 'success', options)
  }

  // 錯誤通知
  function notifyError(message, options = {}) {
    notify(message, 'error', { timeout: 5000, ...options })
  }

  // 信息通知
  function notifyInfo(message, options = {}) {
    notify(message, 'info', options)
  }

  // 警告通知
  function notifyWarning(message, options = {}) {
    notify(message, 'warning', { timeout: 4000, ...options })
  }

  // === 錯誤處理功能 ===

  /**
   * 處理 API 錯誤
   * @param {Error} error - 錯誤對象
   * @param {Object} options - 設定選項
   * @returns {string} 處理後的錯誤訊息
   */
  function handleApiError(error, options = {}) {
    const { showToast = true, defaultMessage = '操作失敗，請稍後再試', timeout = 5000 } = options

    let errorMessage = defaultMessage
    let errorDetails = null

    // 解析錯誤訊息
    if (error.response) {
      // 來自後端的錯誤響應
      const { data, status } = error.response

      // 如果後端返回了錯誤訊息，優先使用
      if (data && data.message) {
        errorMessage = data.message
      } else if (data && data.error) {
        errorMessage = data.error
      }

      // 收集錯誤詳情
      if (data && data.details) {
        errorDetails = data.details
      }

      // 特殊狀態碼處理
      if (status === 401 && !window.location.pathname.includes('/login')) {
        errorMessage = '您的登入已過期，請重新登入'
        // 可以在這裡添加重定向到登錄頁的邏輯
      } else if (status === 403) {
        errorMessage = '您沒有權限執行此操作'
      } else if (status === 404) {
        errorMessage = '請求的資源不存在'
      } else if (status === 422 && data.errors) {
        // 處理驗證錯誤
        errorMessage = '表單驗證失敗'
        errorDetails = data.errors
      }
    } else if (error.request) {
      // 請求已發送但沒有收到響應
      errorMessage = '無法連接到伺服器，請檢查您的網絡連接'
    } else if (error.message) {
      // 其他錯誤
      errorMessage = error.message
    }

    // 顯示通知
    if (showToast) {
      notifyError(errorMessage, { timeout })
    }

    // 返回處理後的錯誤訊息和詳情，供進一步處理
    return {
      message: errorMessage,
      details: errorDetails,
    }
  }

  /**
   * 處理表單驗證錯誤
   * @param {Object} validationErrors - 驗證錯誤對象
   * @param {Object} options - 選項
   * @returns {Object} 格式化後的錯誤訊息
   */
  function handleValidationErrors(validationErrors, options = {}) {
    const { showToast = true } = options
    const errors = {}
    let firstError = null

    // 處理後端返回的驗證錯誤
    if (typeof validationErrors === 'object' && validationErrors !== null) {
      Object.keys(validationErrors).forEach((field) => {
        errors[field] = Array.isArray(validationErrors[field])
          ? validationErrors[field][0]
          : validationErrors[field]

        if (!firstError) {
          firstError = errors[field]
        }
      })
    }

    // 如果有錯誤且需要顯示通知
    if (firstError && showToast) {
      notifyError(firstError)
    }

    return errors
  }

  // === 業務通知功能 ===

  // 系列相關通知
  function notifySeriesUpdated(seriesName) {
    notifySuccess(`系列「${seriesName}」已成功更新`)
  }

  // 類別相關通知
  function notifyCategoryUpdated(categoryName) {
    notifySuccess(`類別「${categoryName}」已成功更新`)
  }

  // 產品相關通知
  function notifyProductUpdated(productName) {
    notifySuccess(`產品「${productName}」已成功更新`)
  }

  // === 刷新觸發器功能 ===

  // 刷新觸發器
  const refreshTriggers = ref({
    series: 0,
    categories: 0,
    subCategories: 0,
    specifications: 0,
    products: 0,
  })

  // 資料依賴關係表 - 定義當某類資料變更時，哪些相關資料也需要刷新
  const dataDependencies = {
    series: ['categories'],
    categories: ['subCategories', 'products'],
    subCategories: ['specifications', 'products'],
    specifications: ['products'],
    products: [],
  }

  /**
   * 觸發刷新並連帶刷新相關資料
   * @param {string|Array} types - 要刷新的資料類型
   * @param {Object} options - 配置選項
   */
  function triggerRefresh(types, options = {}) {
    const { cascade = true, showToast = false, message = null } = options
    const typesToRefresh = Array.isArray(types) ? types : [types]
    const refreshed = new Set()

    // 顯示通知
    if (showToast && message) {
      notifyInfo(message)
    }

    // 刷新指定類型
    typesToRefresh.forEach((type) => {
      if (refreshTriggers.value[type] !== undefined && !refreshed.has(type)) {
        refreshTriggers.value[type]++
        refreshed.add(type)
        console.log(`觸發刷新: ${type}`)

        // 如果需要連帶刷新，遞迴刷新依賴的資料
        if (cascade && dataDependencies[type]) {
          dataDependencies[type].forEach((dependentType) => {
            if (!refreshed.has(dependentType)) {
              refreshTriggers.value[dependentType]++
              refreshed.add(dependentType)
              console.log(`連帶刷新: ${dependentType} (因為 ${type} 已更新)`)
            }
          })
        }
      }
    })
  }

  /**
   * 統一的資料刷新函數 - 基於操作類型自動觸發相關刷新
   * @param {string} action - 操作類型 (create, update, delete)
   * @param {string} entityType - 實體類型
   * @param {Object} entity - 實體資料
   */
  function refreshAfterAction(action, entityType, entity = {}) {
    const entityName = entity.name || '資料項目'
    let message = null

    switch (action) {
      case 'create':
        message = `「${entityName}」已成功新增`
        break
      case 'update':
        message = `「${entityName}」已成功更新`
        break
      case 'delete':
        message = `「${entityName}」已成功刪除`
        break
    }

    // 映射實體類型到刷新觸發器類型
    const typeMappings = {
      series: 'series',
      categories: 'categories',
      subCategories: 'subCategories',
      specifications: 'specifications',
      products: 'products',
    }

    const typeToRefresh = typeMappings[entityType] || entityType

    // 觸發刷新
    triggerRefresh(typeToRefresh, {
      cascade: true,
      showToast: true,
      message,
    })
  }

  return {
    // 基本通知方法
    notify,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,

    // 錯誤處理方法
    handleApiError,
    handleValidationErrors,

    // 業務通知方法
    notifySeriesUpdated,
    notifyCategoryUpdated,
    notifyProductUpdated,

    // 刷新觸發器
    refreshTriggers,
    triggerRefresh,
    refreshAfterAction,
  }
})

// 為了方便在組件外使用
export function useNotifications() {
  return useNotificationStore()
}
