<template>
  <div class="container mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4 theme-text">內容管理</h1>
      <p :class="conditionalClass('text-gray-400', 'text-slate-500')">管理最新消息與常見問題</p>
    </div>

    <!-- Tab 切換按鈕 -->
    <div
      class="flex mb-6 border-b"
      :class="conditionalClass('border-gray-700', 'border-slate-200')"
    >
      <button
        @click="setActiveTab('news')"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'news'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        最新消息
      </button>
      <button
        @click="setActiveTab('faq')"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'faq'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        常見問題
      </button>
    </div>

    <!-- 錯誤提示 -->
    <div
      v-if="error"
      class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6"
    >
      {{ error }}
      <button @click="error = ''" class="float-right text-red-100 hover:text-white">&times;</button>
    </div>

    <!-- 載入中提示 -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 mb-4"
        :class="conditionalClass('border-white', 'border-blue-600')"
      ></div>
      <p :class="conditionalClass('text-gray-300', 'text-slate-500')">正在載入資料...</p>
    </div>

    <!-- 內容管理區塊 -->
    <div v-else :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm']">
      <!-- 頂部操作列 -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold theme-text">
          {{ activeTab === 'news' ? '消息列表' : '問題列表' }}
        </h2>
        <button
          @click="handleAddItem"
          class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
        >
          新增{{ activeTab === 'news' ? '消息' : '問題' }}
        </button>
      </div>

      <!-- 最新消息列表 -->
      <div v-if="activeTab === 'news'" class="overflow-x-auto">
        <table class="w-full text-center">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="py-3 px-4 theme-text opacity-50">標題 (TW)</th>
              <th class="py-3 px-4 theme-text opacity-50">分類</th>
              <th class="py-3 px-4 theme-text opacity-50">作者</th>
              <th class="py-3 px-4 theme-text opacity-50">發布日期</th>
              <th class="py-3 px-4 theme-text opacity-50">封面圖</th>
              <th class="py-3 px-4 theme-text opacity-50">圖片</th>
              <th class="py-3 px-4 theme-text opacity-50">影片</th>
              <th class="py-3 px-4 theme-text opacity-50">狀態</th>
              <th class="py-3 px-4 theme-text opacity-50">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in newsStore.items"
              :key="item._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text max-w-[550px] truncate">
                {{ item.title?.TW || '-' }}
              </td>
              <td class="py-3 px-4 theme-text">{{ item.category || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ item.author || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ formatDate(item.publishDate) }}</td>
              <td
                class="py-3 px-4"
                :title="'封面圖: ' + (item.coverImageUrl ? '✓' : '✗')"
                :class="item.coverImageUrl ? 'text-green-500' : 'text-red-500'"
              >
                {{ item.coverImageUrl ? '✓' : '✗' }}
              </td>
              <td
                class="py-3 px-4"
                :title="'圖片: ' + (hasContentImages(item.content) ? '✓' : '✗')"
                :class="hasContentImages(item.content) ? 'text-green-500' : 'text-red-500'"
              >
                {{ hasContentImages(item.content) ? '✓' : '✗' }}
              </td>
              <td
                class="py-3 px-4"
                :title="'影片: ' + (hasContentVideos(item.content) ? '✓' : '✗')"
                :class="hasContentVideos(item.content) ? 'text-green-500' : 'text-red-500'"
              >
                {{ hasContentVideos(item.content) ? '✓' : '✗' }}
              </td>
              <td class="py-3 px-4">
                <span
                  :class="statusDisplayClass(item.status, item.isActive, 'news')"
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ getStatusLabel(item.status, item.isActive, 'news') }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2 justify-center">
                  <button
                    @click="handleEditItem(item)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDeleteItem(item)"
                    :disabled="deletingItem === item._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingItem === item._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!newsStore.items || newsStore.items.length === 0">
              <td
                colspan="9"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有任何最新消息
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 常見問題列表 -->
      <div v-else-if="activeTab === 'faq'" class="overflow-x-auto">
        <table class="w-full text-center">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="py-3 px-4 theme-text opacity-50">問題 (TW)</th>
              <th class="py-3 px-4 theme-text opacity-50">發布日期</th>
              <th class="py-3 px-4 theme-text opacity-50">主分類</th>
              <th class="py-3 px-4 theme-text opacity-50">子分類</th>
              <th class="py-3 px-4 theme-text opacity-50">作者</th>
              <th class="py-3 px-4 theme-text opacity-50">產品型號</th>
              <th class="py-3 px-4 theme-text opacity-50">圖片</th>
              <th class="py-3 px-4 theme-text opacity-50">文件</th>
              <th class="py-3 px-4 theme-text opacity-50">影片</th>
              <th class="py-3 px-4 theme-text opacity-50">狀態</th>
              <th class="py-3 px-4 theme-text opacity-50">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in faqStore.items"
              :key="item._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">{{ item.question?.TW || '-' }}</td>
              <td class="py-3 px-4 theme-text">
                {{ formatDate(item.publishDate || item.createdAt) }}
              </td>
              <td class="py-3 px-4 theme-text">
                {{
                  typeof item.category === 'object' && item.category
                    ? item.category.main || '-'
                    : item.category || '-'
                }}
              </td>
              <td class="py-3 px-4 theme-text">
                {{
                  typeof item.category === 'object' && item.category
                    ? item.category.sub || '-'
                    : '-'
                }}
              </td>
              <td class="py-3 px-4 theme-text">{{ item.author || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ item.productModel || '-' }}</td>
              <td
                class="py-3 px-4"
                :title="'圖片: ' + (item.imageUrl && item.imageUrl.length > 0 ? '✓' : '✗')"
                :class="
                  item.imageUrl && item.imageUrl.length > 0 ? 'text-green-500' : 'text-red-500'
                "
              >
                {{ item.imageUrl && item.imageUrl.length > 0 ? '✓' : '✗' }}
              </td>
              <td
                class="py-3 px-4"
                :title="'文件: ' + (item.documentUrl && item.documentUrl.length > 0 ? '✓' : '✗')"
                :class="
                  item.documentUrl && item.documentUrl.length > 0
                    ? 'text-green-500'
                    : 'text-red-500'
                "
              >
                {{ item.documentUrl && item.documentUrl.length > 0 ? '✓' : '✗' }}
              </td>
              <td
                class="py-3 px-4"
                :title="'影片: ' + (item.videoUrl && item.videoUrl.length > 0 ? '✓' : '✗')"
                :class="
                  item.videoUrl && item.videoUrl.length > 0 ? 'text-green-500' : 'text-red-500'
                "
              >
                {{ item.videoUrl && item.videoUrl.length > 0 ? '✓' : '✗' }}
              </td>
              <td class="py-3 px-4">
                <span
                  :class="statusDisplayClass(null, item.isActive, 'faq')"
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ getStatusLabel(null, item.isActive, 'faq') }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2 justify-center">
                  <button
                    @click="handleEditItem(item)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDeleteItem(item)"
                    :disabled="deletingItem === item._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingItem === item._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!faqStore.items || faqStore.items.length === 0">
              <td
                colspan="11"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有任何常見問題
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 動態 Modal -->
    <NewsModal
      v-if="activeTab === 'news'"
      v-model:show="showModal"
      :news-item="editingItem"
      @saved="refreshList"
    />
    <FaqModal
      v-if="activeTab === 'faq'"
      v-model:show="showModal"
      :faq-item="editingItem"
      @saved="refreshList"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useNewsStore } from '@/stores/newsStore'
import { useFaqStore } from '@/stores/faqStore'
import { useThemeClass } from '@/composables/useThemeClass'
import { useNotifications } from '@/composables/notificationCenter'
import NewsModal from '@/components/news/NewsModal.vue'
import FaqModal from '@/components/FaqModal.vue'

const newsStore = useNewsStore()
const faqStore = useFaqStore()
const notify = useNotifications()
const { cardClass, conditionalClass } = useThemeClass()

// 本地狀態
const loading = ref(false)
const error = ref('')
const activeTab = ref('news') // 'news' or 'faq'
const showModal = ref(false)
const editingItem = ref(null) // 正在編輯的項目 (News 或 Faq)

// 操作狀態追蹤
const deletingItem = ref(null) // 正在刪除的項目 ID

// 根據 activeTab 獲取對應的 store
const currentStore = () => {
  return activeTab.value === 'news' ? newsStore : faqStore
}

// 設置活動標籤並加載數據
const setActiveTab = async (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  await fetchData()
}

// 初始化載入
onMounted(async () => {
  await fetchData()
})

// 獲取數據
const fetchData = async () => {
  loading.value = true
  error.value = ''
  const store = currentStore()
  const entityName = activeTab.value === 'news' ? '最新消息' : '常見問題'

  try {
    await store.fetchAll()
    if (!store.items || store.items.length === 0) {
      notify.notifyInfo(`目前沒有任何${entityName}`)
    }
  } catch (err) {
    console.error(`載入${entityName}失敗：`, err)
    const message = err.message || `載入${entityName}失敗，請重新整理頁面`
    error.value = message
    notify.notifyError(message)
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString() // 使用本地化日期格式
  } catch {
    return dateString // 如果轉換失敗，返回原始字串
  }
}

// Helper function to get status label
const getStatusLabel = (statusKey, isActive, type) => {
  if (type === 'faq') {
    return isActive ? '已發布' : '待審查'
  }
  if (type === 'news') {
    return isActive ? '已發布' : '待審查' // News 也根據 isActive 顯示
  }
  // Fallback or other types (if any)
  const statusMap = {
    pendingReview: '待審核',
    published: '已發布',
    rejected: '已拒絕',
  }
  return statusMap[statusKey] || statusKey
}

// Helper function for status display class
const statusDisplayClass = (status, isActive, type) => {
  if (type === 'faq' || type === 'news') {
    // News 也根據 isActive 決定樣式
    if (isActive) {
      return conditionalClass('bg-green-500/30 text-green-300', 'bg-green-100 text-green-700') // Published
    } else {
      return conditionalClass('bg-yellow-500/30 text-yellow-300', 'bg-yellow-100 text-yellow-700') // Pending Review
    }
  }
  switch (status) {
    case 'published':
      return conditionalClass('bg-green-500/30 text-green-300', 'bg-green-100 text-green-700')
    case 'pendingReview':
      return conditionalClass('bg-yellow-500/30 text-yellow-300', 'bg-yellow-100 text-yellow-700')
    case 'rejected':
      return conditionalClass('bg-red-500/30 text-red-300', 'bg-red-100 text-red-700')
    default:
      return conditionalClass('bg-gray-600/30 text-gray-400', 'bg-gray-200 text-gray-500')
  }
}

// 處理新增項目
const handleAddItem = () => {
  editingItem.value = null // 清空編輯項目表示新增
  showModal.value = true
}

// 處理編輯項目
const handleEditItem = (item) => {
  editingItem.value = { ...item } // 傳遞副本
  showModal.value = true
}

// 處理刪除項目
const handleDeleteItem = async (item) => {
  const store = currentStore()
  const entityName = activeTab.value === 'news' ? '消息' : '問題'
  const identifier = activeTab.value === 'news' ? item.title?.TW : item.question?.TW

  if (!confirm(`確定要刪除${entityName} "${identifier || item._id}" 嗎？此操作不可恢復！`)) {
    return
  }

  deletingItem.value = item._id
  try {
    await store.delete(item._id)
    notify.notifySuccess(`成功刪除${entityName}`)
    await refreshList(false) // 更新列表但不顯示載入動畫
  } catch (err) {
    const message = err.message || `刪除${entityName}失敗，請稍後再試`
    notify.notifyError(message)
  } finally {
    deletingItem.value = null
  }
}

// 檢查 News content 是否包含圖片
const hasContentImages = (content) => {
  if (!content || !Array.isArray(content)) return false
  return content.some((block) => block.itemType === 'image' && block.imageUrl)
}

// 檢查 News content 是否包含影片
const hasContentVideos = (content) => {
  if (!content || !Array.isArray(content)) return false
  return content.some((block) => block.itemType === 'videoEmbed' && block.videoEmbedUrl)
}

// 刷新列表
const refreshList = async (showLoadingIndicator = true) => {
  if (showLoadingIndicator) {
    loading.value = true
  }
  error.value = ''
  const store = currentStore()
  const entityName = activeTab.value === 'news' ? '最新消息' : '常見問題'

  try {
    await store.fetchAll()
  } catch (err) {
    console.error(`刷新${entityName}列表失敗：`, err)
    const message = err.message || `刷新${entityName}列表失敗`
    error.value = message
    // 僅在顯式刷新時提示錯誤
    if (showLoadingIndicator) {
      notify.notifyError(message)
    }
  } finally {
    if (showLoadingIndicator) {
      loading.value = false
    }
    // 確保 Modal 在保存後關閉
    showModal.value = false
  }
}
</script>

<style scoped>
/* 可以添加特定於此視圖的樣式 */
table {
  border-collapse: separate;
  border-spacing: 0;
}

th {
  font-weight: 500;
}

button {
  white-space: nowrap;
}
</style>
