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
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">標題 (TW)</th>
              <th class="text-left py-3 px-4 theme-text">分類</th>
              <th class="text-left py-3 px-4 theme-text">發布日期</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in newsStore.items"
              :key="item._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">{{ item.title?.TW || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ item.category || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ formatDate(item.publishDate) }}</td>
              <td class="py-3 px-4">
                <span :class="statusClass(item.isActive)" class="px-2 py-1 rounded-full text-sm">
                  {{ item.isActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    @click="handleEditItem(item)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleStatusToggle(item)"
                    :class="statusButtonClass(item.isActive)"
                    :disabled="statusLoading === item._id"
                    class="px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="statusLoading === item._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    {{ item.isActive ? '停用' : '啟用' }}
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
                colspan="5"
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
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">問題 (TW)</th>
              <th class="text-left py-3 px-4 theme-text">分類</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in faqStore.items"
              :key="item._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">{{ item.question?.TW || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ item.category || '-' }}</td>
              <td class="py-3 px-4">
                <span :class="statusClass(item.isActive)" class="px-2 py-1 rounded-full text-sm">
                  {{ item.isActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    @click="handleEditItem(item)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleStatusToggle(item)"
                    :class="statusButtonClass(item.isActive)"
                    :disabled="statusLoading === item._id"
                    class="px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="statusLoading === item._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    {{ item.isActive ? '停用' : '啟用' }}
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
                colspan="5"
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
const statusLoading = ref(null) // 正在變更狀態的項目 ID
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

// 格式化日期 (僅用於 News)
const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString() // 使用本地化日期格式
    // 或者使用更詳細的格式: return date.toLocaleString();
  } catch /*(e)*/ {
    // 移除未使用的變數 e
    return dateString // 如果轉換失敗，返回原始字串
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

// 處理狀態切換
const handleStatusToggle = async (item) => {
  const store = currentStore()
  const entityName = activeTab.value === 'news' ? '消息' : '問題'
  const action = item.isActive ? '停用' : '啟用'
  if (!confirm(`確定要${action}這個${entityName}嗎？`)) return

  statusLoading.value = item._id
  try {
    const updateData = { isActive: !item.isActive }
    await store.update(item._id, updateData)
    notify.notifySuccess(`${action}${entityName}成功`)
    await refreshList(false) // 更新列表但不顯示載入動畫
  } catch (err) {
    const message = err.message || `操作失敗，請稍後再試`
    notify.notifyError(message)
  } finally {
    statusLoading.value = null
  }
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

// 刷新列表
const refreshList = async (showLoadingIndicator = true) => {
  if (showLoadingIndicator) {
    loading.value = true
  }
  error.value = ''
  const store = currentStore()
  const entityName = activeTab.value === 'news' ? '最新消息' : '常見問題'

  try {
    await store.fetchAll() // 或 store.search() 如果有分頁/搜索
    console.log(`${entityName}列表已更新`)
    // 如果只是靜默更新，可以考慮不彈出成功提示，避免干擾
    // if (!showLoadingIndicator) { notify.notifySuccess(`${entityName}列表已更新`); }
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

// --- Helper functions for styling ---
const statusClass = (isActive) => {
  return isActive
    ? conditionalClass('bg-green-500/20 text-green-300', 'bg-green-100 text-green-700')
    : conditionalClass('bg-red-500/20 text-red-300', 'bg-red-100 text-red-700')
}

const statusButtonClass = (isActive) => {
  return isActive
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-green-500 hover:bg-green-600 text-white'
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
