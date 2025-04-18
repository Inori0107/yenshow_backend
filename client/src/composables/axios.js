import axios from 'axios'
import { useUserStore } from '@/stores/userStore'
import { useNotifications } from '@/composables/notificationCenter'
import { useLanguageStore } from '@/stores/languageStore'
// 建立實例
const api = axios.create({
  baseURL: import.meta.env.VITE_API,
})
const apiAuth = axios.create({
  baseURL: import.meta.env.VITE_API,
})

// 在每個請求中自動加上 JWT Token
apiAuth.interceptors.request.use((config) => {
  const user = useUserStore()
  config.headers.Authorization = 'Bearer ' + user.token
  return config
})

// 處理回應錯誤，特別是處理登入過期的情況
apiAuth.interceptors.response.use(
  (res) => {
    return res
  },
  async (error) => {
    if (error.response) {
      if (error.response.data.message === '登入過期' && error.config.url !== '/user/extend') {
        const user = useUserStore()
        try {
          const { data } = await apiAuth.patch('/user/extend')
          user.token = data.result
          error.config.headers.Authorization = 'Bearer ' + user.token
          return axios(error.config)
        } catch (error) {
          user.logout()
          return Promise.reject(error)
        }
      }
    }
    return Promise.reject(error)
  },
)

// 新增 pingServer 函式以防止後端進入休眠狀態
function pingServer() {
  api
    .get('/ping')
    .then(() => {
      console.log('Ping success')
    })
    .catch((error) => {
      console.error('Ping failed:', error)
    })
}

// 每 5 分鐘 (300000 毫秒) ping 一次伺服器
setInterval(pingServer, 300000)

// 批次請求隊列
const batchQueue = []
let batchTimeout = null
const BATCH_DELAY = 50 // 50毫秒內的請求會被批次處理

/**
 * 處理批次請求
 */
function processBatchQueue() {
  if (batchQueue.length === 0) return

  const requests = [...batchQueue]
  batchQueue.length = 0

  // 檢查是否可以使用批次API
  if (requests.length > 1 && requests.every((req) => req.method === 'GET')) {
    // 建立一個批次請求，假設後端有支援批次API
    const batchRequestBody = {
      requests: requests.map((req) => ({
        url: req.url,
        params: req.params || {},
      })),
    }

    api
      .post('/batch', batchRequestBody)
      .then((response) => {
        // 假設批次API返回的是一個陣列，按請求順序返回結果
        if (response.data && Array.isArray(response.data.results)) {
          requests.forEach((req, index) => {
            const result = response.data.results[index]
            if (result.success) {
              req.resolve(result)
            } else {
              req.reject(new Error(result.message || '批次請求失敗'))
            }
          })
        }
      })
      .catch((error) => {
        // 如果批次請求失敗，個別執行每個請求
        console.error('批次請求失敗，改為單獨請求:', error.message)
        requests.forEach((req) => {
          const { method, url, params, data, resolve, reject } = req
          api({ method, url, params, data }).then(resolve).catch(reject)
        })
      })
  } else {
    // 無法批次處理，個別執行
    requests.forEach((req) => {
      const { method, url, params, data, resolve, reject } = req
      api({ method, url, params, data }).then(resolve).catch(reject)
    })
  }

  batchTimeout = null
}

/**
 * 增強版API，支援批次請求和優化
 */
export const useApi = () => {
  /**
   * 批次處理API請求
   * @param {string} method - 請求方法
   * @param {string} url - 請求路徑
   * @param {Object} params - 查詢參數
   * @param {Object} data - 請求體數據
   * @returns {Promise} - 請求Promise
   */
  const batchableApi = (method, url, params, data) => {
    return new Promise((resolve, reject) => {
      // 只有GET請求會進入批次隊列
      if (method === 'GET') {
        batchQueue.push({ method, url, params, data, resolve, reject })

        if (!batchTimeout) {
          batchTimeout = setTimeout(processBatchQueue, BATCH_DELAY)
        }
      } else {
        // 非GET請求直接執行
        api({ method, url, params, data }).then(resolve).catch(reject)
      }
    })
  }

  /**
   * 安全API請求，自動處理錯誤
   * @param {Function} apiCall - API調用函數
   * @param {Object} errorOptions - 錯誤處理選項
   * @returns {Promise} 處理過的Promise
   */
  const safeApiCall = async (apiCall, errorOptions = {}) => {
    try {
      const response = await apiCall()
      return response
    } catch (error) {
      const notify = useNotifications()
      notify.handleApiError(error, errorOptions)
      throw error // 重新拋出錯誤，以便調用者可以進一步處理
    }
  }

  // 1. 添加語言攔截器
  const setupLanguageInterceptor = () => {
    // 請求拦截器 - 自動添加語言參數
    api.interceptors.request.use((config) => {
      const languageStore = useLanguageStore()

      // 為GET請求添加語言參數
      if (config.method?.toLowerCase() === 'get') {
        config.params = {
          ...(config.params || {}),
          lang: languageStore.currentLang,
        }
      }
      // 為其他請求在數據中添加語言參數
      else if (
        config.data &&
        typeof config.data === 'object' &&
        !(config.data instanceof FormData)
      ) {
        config.data = {
          ...config.data,
          lang: languageStore.currentLang,
        }
      }

      return config
    })

    // 同樣為 apiAuth 添加語言攔截器
    apiAuth.interceptors.request.use((config) => {
      const languageStore = useLanguageStore()

      if (config.method?.toLowerCase() === 'get') {
        config.params = {
          ...(config.params || {}),
          lang: languageStore.currentLang,
        }
      } else if (
        config.data &&
        typeof config.data === 'object' &&
        !(config.data instanceof FormData)
      ) {
        config.data = {
          ...config.data,
          lang: languageStore.currentLang,
        }
      }

      return config
    })
  }

  // 2. 添加響應格式處理
  const handleSuccessResponse = (response) => {
    // 處理後端成功響應格式
    if (response.data && response.data.success === true) {
      return response.data.result || {}
    }

    // 如果沒有遵循標準格式，直接返回
    return response.data
  }

  // 3. 創建符合 EntityService 處理邏輯的API包裝器
  const entityApi = (entityType, options = {}) => {
    const responseKey = options.responseKey || `${entityType}List`

    return {
      // 獲取所有項目 (對應 BaseController.getAllItems)
      getAll: async (params = {}) => {
        const response = await safeApiCall(() => api.get(`/api/${entityType}`, { params }))
        return response?.data?.result?.[responseKey] || []
      },

      // 獲取單個項目 (對應 BaseController.getItemById)
      getById: async (id, params = {}) => {
        const response = await safeApiCall(() => api.get(`/api/${entityType}/${id}`, { params }))
        return response?.data?.result?.[entityType] || null
      },

      // 搜索項目 (對應 BaseController.searchItems)
      search: async (params = {}) => {
        const response = await safeApiCall(() => api.get(`/api/${entityType}/search`, { params }))
        return {
          items: response?.data?.result?.[responseKey] || [],
          pagination: response?.data?.result?.pagination || null,
        }
      },

      // 創建項目 (對應 BaseController.createItem)
      create: async (data) => {
        const response = await safeApiCall(() => api.post(`/api/${entityType}`, data))
        return response?.data?.result?.[entityType] || null
      },

      // 更新項目 (對應 BaseController.updateItem)
      update: async (id, data) => {
        const response = await safeApiCall(() => api.put(`/api/${entityType}/${id}`, data))
        return response?.data?.result?.[entityType] || null
      },

      // 刪除項目 (對應 BaseController.deleteItem)
      delete: async (id) => {
        const response = await safeApiCall(() => api.delete(`/api/${entityType}/${id}`))
        return response?.data?.success || false
      },

      // 批量處理 (對應 BaseController.batchProcess)
      batchProcess: async (data) => {
        const response = await safeApiCall(() => api.post(`/api/${entityType}/batch`, data))
        return response?.data?.result || null
      },
    }
  }

  // 4. 創建符合 HierarchyManager 的API包裝器
  const hierarchyApi = {
    // 獲取完整層次結構 (對應 HierarchyManager.getFullHierarchy)
    getFullHierarchy: async (params = {}) => {
      const response = await safeApiCall(() => api.get('/api/hierarchy', { params }))
      return response?.data?.result?.hierarchy || []
    },

    // 根據父項獲取子項 (對應 HierarchyManager.getChildrenByParentId)
    getChildrenByParent: async (parentType, parentId, params = {}) => {
      const response = await safeApiCall(() =>
        api.get(`/api/hierarchy/children/${parentType}/${parentId}`, { params }),
      )
      return response?.data?.result || null
    },

    // 獲取父層結構 (對應 HierarchyManager.getParentHierarchy)
    getParentHierarchy: async (itemType, itemId, params = {}) => {
      const response = await safeApiCall(() =>
        api.get(`/api/hierarchy/parents/${itemType}/${itemId}`, { params }),
      )
      return response?.data?.result?.hierarchy || []
    },
  }

  // 初始化時設置語言攔截器
  setupLanguageInterceptor()

  return {
    // 現有功能
    api,
    apiAuth,
    batchableApi: {
      get: (url, params) => batchableApi('GET', url, params),
      post: (url, data) => api.post(url, data),
      put: (url, data) => api.put(url, data),
      patch: (url, data) => api.patch(url, data),
      delete: (url) => api.delete(url),
    },
    safeApiCall,

    // 新增功能
    entityApi,
    hierarchyApi,
    handleSuccessResponse,
  }
}
