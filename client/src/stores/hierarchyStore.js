import { defineStore } from 'pinia'
import { useApi } from '@/composables/axios'

export const useHierarchyStore = defineStore('hierarchy', {
  state: () => ({
    hierarchyData: [],
    currentEntity: null,
    currentPath: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    // 獲取特定類型的所有項目
    getEntitiesByType: (state) => (type) => {
      if (type === 'series' && state.hierarchyData.length) {
        return state.hierarchyData
      }

      // 在層級數據中搜尋特定類型的所有項目
      const findEntities = (items, targetType) => {
        let result = []
        for (const item of items) {
          if (targetType in item && Array.isArray(item[targetType])) {
            result = [...result, ...item[targetType]]
          }

          // 遞迴搜尋下層
          const childTypes = ['categories', 'subCategories', 'specifications', 'products']
          for (const childType of childTypes) {
            if (childType in item && Array.isArray(item[childType])) {
              const childResults = findEntities(item[childType], targetType)
              result = [...result, ...childResults]
            }
          }
        }
        return result
      }

      return findEntities(state.hierarchyData, type)
    },

    // 獲取當前實體的子項
    childEntities: (state) => {
      if (!state.currentEntity) return []

      const childTypes = {
        series: 'categories',
        categories: 'subCategories',
        subCategories: 'specifications',
        specifications: 'products',
      }

      const childType = childTypes[state.currentEntity.type]
      return childType && state.currentEntity[childType] ? state.currentEntity[childType] : []
    },
  },

  actions: {
    // 獲取完整層級結構
    async fetchFullHierarchy() {
      this.isLoading = true
      this.error = null

      try {
        const { hierarchyApi } = useApi()
        this.hierarchyData = await hierarchyApi.getFullHierarchy()
      } catch (error) {
        this.error = error.message || '獲取層級結構時發生錯誤'
        console.error('獲取層級結構錯誤:', error)
      } finally {
        this.isLoading = false
      }
    },

    // 根據父項獲取子項
    async fetchChildrenByParent(parentType, parentId, params = {}) {
      this.isLoading = true
      this.error = null

      try {
        const { hierarchyApi } = useApi()
        return await hierarchyApi.getChildrenByParent(parentType, parentId, params)
      } catch (error) {
        this.error = error.message || '獲取子項時發生錯誤'
        console.error('獲取子項錯誤:', error)
        return null
      } finally {
        this.isLoading = false
      }
    },

    // 獲取某項的所有上層階層
    async fetchParentHierarchy(itemType, itemId, params = {}) {
      this.isLoading = true
      this.error = null

      try {
        const { hierarchyApi } = useApi()
        this.currentPath = await hierarchyApi.getParentHierarchy(itemType, itemId, params)
        return this.currentPath
      } catch (error) {
        this.error = error.message || '獲取父層階層時發生錯誤'
        console.error('獲取父層階層錯誤:', error)
        return []
      } finally {
        this.isLoading = false
      }
    },

    // 設置當前實體
    setCurrentEntity(entity, type) {
      this.currentEntity = { ...entity, type }
    },

    // 清除當前實體
    clearCurrentEntity() {
      this.currentEntity = null
      this.currentPath = []
    },
  },
})
