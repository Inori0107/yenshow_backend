<template>
  <div class="series-view-container">
    <!-- 頂部系列切換組件 -->
    <SeriesSwitch
      :current-series="currentSeries"
      :is-loading="seriesStore.isLoading"
      :available-series="seriesStore.items"
      @change-series="changeSeries"
      @refresh-data="loadSeriesData"
    />

    <!-- 錯誤提示 -->
    <div
      v-if="errorMessage || seriesStore.error"
      class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded m-4"
    >
      {{ errorMessage || seriesStore.error }}
    </div>

    <!-- 載入中提示 -->
    <div v-if="seriesStore.isLoading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>

    <!-- 主內容區域 -->
    <router-view
      v-else
      :key="currentSeries"
      :current-series="currentSeries"
      :is-loading="seriesStore.isLoading"
    />
  </div>
</template>

<style scoped>
.series-view-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
}
</style>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSeriesStore } from '@/stores/models/series'
import { useNotifications } from '@/composables/notificationCenter'
import { useHierarchyStore } from '@/stores/hierarchyStore'
import SeriesSwitch from '@/components/products/SeriesSwitch.vue'

// 初始化 stores
const seriesStore = useSeriesStore()
const hierarchyStore = useHierarchyStore()
const route = useRoute()
const router = useRouter()
const notifications = useNotifications()

// 狀態
const errorMessage = ref('')

// 從路由獲取當前系列代碼
const currentSeries = computed(() => {
  return route.params.seriesCode || 'default'
})

// 監聽刷新觸發器
watch(
  () => notifications.refreshTriggers.series,
  (newVal, oldVal) => {
    if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
      loadSeriesData()
    }
  },
)

// 當路由參數變更時載入對應資料
watch(
  () => route.params.seriesCode,
  (newSeriesCode) => {
    if (newSeriesCode) {
      loadSeriesData()
    }
  },
  { immediate: true },
)

// 載入系列資料
async function loadSeriesData() {
  errorMessage.value = ''

  try {
    // 獲取系列列表
    await seriesStore.fetchAll()

    // 檢查系列數據
    const availableSeries = seriesStore.items || []

    if (!availableSeries || availableSeries.length === 0) {
      throw new Error('無法獲取系列列表資料')
    }

    // 尋找當前系列
    const currentSeriesData = availableSeries.find((s) => s.code === currentSeries.value)

    if (!currentSeriesData && availableSeries.length > 0) {
      // 如果找不到當前系列但有其他系列，重定向到第一個系列
      const firstSeriesCode = availableSeries[0].code
      router.replace({ name: 'series-category', params: { seriesCode: firstSeriesCode } })
      return
    }

    // 可選：載入層次結構數據
    await hierarchyStore.fetchFullHierarchy()
  } catch (error) {
    // 使用 notificationCenter 處理錯誤
    notifications.handleApiError(error, {
      showToast: true,
      defaultMessage: '載入系列資料時發生錯誤',
    })
    errorMessage.value = error.message || '載入系列資料時發生錯誤'
  }
}

// 切換系列
function changeSeries(seriesCode) {
  if (seriesCode !== currentSeries.value) {
    router.push({ name: 'series-category', params: { seriesCode } })
  }
}

// 組件掛載時載入資料
onMounted(() => {
  loadSeriesData()
})
</script>
