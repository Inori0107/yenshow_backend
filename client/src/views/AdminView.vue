<template>
  <div class="container mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4 theme-text">管理員控制台</h1>
      <p :class="conditionalClass('text-gray-400', 'text-slate-500')">
        管理用戶帳號、權限和系統設置
      </p>
    </div>

    <!-- Tab 切換按鈕 -->
    <div
      class="flex mb-6 border-b"
      :class="conditionalClass('border-gray-700', 'border-slate-200')"
    >
      <button
        @click="activeTab = 'all'"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'all'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        所有用戶
      </button>
      <button
        @click="activeTab = 'clients'"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'clients'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        客戶管理
      </button>
      <button
        @click="activeTab = 'staff'"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'staff'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        員工管理
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
      <p :class="conditionalClass('text-gray-300', 'text-slate-500')">正在載入用戶資料...</p>
    </div>

    <!-- 用戶管理區塊 -->
    <div v-else :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm']">
      <!-- 頂部操作列 -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold theme-text">
          {{ activeTab === 'all' ? '用戶管理' : activeTab === 'clients' ? '客戶管理' : '員工管理' }}
        </h2>
        <button
          @click="showCreateUserModal = true"
          class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
        >
          新增{{ activeTab === 'clients' ? '客戶' : activeTab === 'staff' ? '員工' : '用戶' }}
        </button>
      </div>

      <!-- 所有用戶列表 -->
      <div v-if="activeTab === 'all'" class="overflow-x-auto">
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">帳號</th>
              <th class="text-left py-3 px-4 theme-text">身分</th>
              <th class="text-left py-3 px-4 theme-text">信箱</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in userList"
              :key="user._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">{{ user.account }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.role === 'admin'
                      ? conditionalClass(
                          'bg-purple-700/30 text-purple-200',
                          'bg-purple-200 text-purple-800',
                        )
                      : user.role === 'staff'
                        ? conditionalClass(
                            'bg-yellow-700/30 text-yellow-200',
                            'bg-yellow-200 text-yellow-800',
                          )
                        : conditionalClass(
                            'bg-green-500/20 text-green-300',
                            'bg-green-100 text-green-700',
                          )
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.role === 'admin' ? '管理員' : user.role === 'staff' ? '員工' : '客戶' }}
                </span>
              </td>
              <td class="py-3 px-4 theme-text">{{ user.email }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.isActive
                      ? conditionalClass(
                          'bg-green-500/20 text-green-300',
                          'bg-green-100 text-green-700',
                        )
                      : conditionalClass('bg-red-500/20 text-red-300', 'bg-red-100 text-red-700')
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.isActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    @click="handleResetPassword(user._id)"
                    :disabled="passwordResetting === user._id"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="passwordResetting === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    重置密碼
                  </button>
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleStatusToggle(user)"
                    :class="
                      user.isActive
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    "
                    :disabled="statusLoading === user._id"
                    class="px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="statusLoading === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    {{ user.isActive ? '停用' : '啟用' }}
                  </button>
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleDeleteUser(user)"
                    :disabled="deletingUser === user._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingUser === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 客戶列表 -->
      <div v-else-if="activeTab === 'clients'" class="overflow-x-auto">
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">帳號</th>
              <th class="text-left py-3 px-4 theme-text">公司名稱</th>
              <th class="text-left py-3 px-4 theme-text">聯絡人</th>
              <th class="text-left py-3 px-4 theme-text">電話</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers('client')"
              :key="user._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">{{ user.account }}</td>
              <td class="py-3 px-4 theme-text">{{ user.clientInfo?.companyName || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ user.clientInfo?.contactPerson || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ user.clientInfo?.phone || '-' }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.isActive
                      ? conditionalClass(
                          'bg-green-500/20 text-green-300',
                          'bg-green-100 text-green-700',
                        )
                      : conditionalClass('bg-red-500/20 text-red-300', 'bg-red-100 text-red-700')
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.isActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    @click="handleResetPassword(user._id)"
                    :disabled="passwordResetting === user._id"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="passwordResetting === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    重置密碼
                  </button>
                  <button
                    @click="handleStatusToggle(user)"
                    :class="
                      user.isActive
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    "
                    :disabled="statusLoading === user._id"
                    class="px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="statusLoading === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    {{ user.isActive ? '停用' : '啟用' }}
                  </button>
                  <button
                    @click="handleDeleteUser(user)"
                    :disabled="deletingUser === user._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingUser === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 員工列表 -->
      <div v-else-if="activeTab === 'staff'" class="overflow-x-auto">
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">帳號</th>
              <th class="text-left py-3 px-4 theme-text">身分</th>
              <th class="text-left py-3 px-4 theme-text">部門</th>
              <th class="text-left py-3 px-4 theme-text">職位</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers('staff')"
              :key="user._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">
                {{ user.account }}
              </td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.role === 'admin'
                      ? conditionalClass(
                          'bg-purple-700/30 text-purple-200',
                          'bg-purple-200 text-purple-800',
                        )
                      : user.role === 'staff'
                        ? conditionalClass(
                            'bg-yellow-700/30 text-yellow-200',
                            'bg-yellow-200 text-yellow-800',
                          )
                        : conditionalClass(
                            'bg-green-500/20 text-green-300',
                            'bg-green-100 text-green-700',
                          )
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.role === 'admin' ? '管理員' : user.role === 'staff' ? '員工' : '客戶' }}
                </span>
              </td>
              <td class="py-3 px-4 theme-text">{{ user.staffInfo?.department || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ user.staffInfo?.position || '-' }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.isActive
                      ? conditionalClass(
                          'bg-green-500/20 text-green-300',
                          'bg-green-100 text-green-700',
                        )
                      : conditionalClass('bg-red-500/20 text-red-300', 'bg-red-100 text-red-700')
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.isActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    @click="handleResetPassword(user._id)"
                    :disabled="passwordResetting === user._id"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="passwordResetting === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    重置密碼
                  </button>
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleStatusToggle(user)"
                    :class="
                      user.isActive
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    "
                    :disabled="statusLoading === user._id"
                    class="px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="statusLoading === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    {{ user.isActive ? '停用' : '啟用' }}
                  </button>
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleDeleteUser(user)"
                    :disabled="deletingUser === user._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingUser === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增用戶 Modal，根據activeTab設置預設角色 -->
    <CreateUserModal
      v-model:show="showCreateUserModal"
      :default-role="
        activeTab === 'clients' ? 'client' : activeTab === 'staff' ? 'staff' : 'client'
      "
      @user-created="refreshUserList"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useThemeClass } from '@/composables/useThemeClass'
import CreateUserModal from '@/components/CreateUserModal.vue'
import { useNotifications } from '@/composables/notificationCenter'

const userStore = useUserStore()
const notify = useNotifications()
const { cardClass, conditionalClass } = useThemeClass()

// 本地狀態
const userList = ref([])
const loading = ref(false)
const error = ref('')
const showCreateUserModal = ref(false)
const activeTab = ref('all') // 新增：當前標籤頁，預設為全部用戶

// 操作狀態追蹤
const statusLoading = ref(null) // 正在變更狀態的用戶ID
const passwordResetting = ref(null) // 正在重設密碼的用戶ID
const deletingUser = ref(null) // 正在刪除的用戶ID

// 根據角色過濾用戶
const filteredUsers = (role) => {
  if (role === 'staff') {
    // 返回所有員工和管理員
    return userList.value.filter((user) => user.role === 'staff' || user.role === 'admin')
  } else {
    // 返回指定角色的用戶
    return userList.value.filter((user) => user.role === role)
  }
}

// 監聽標籤變更，更新 CreateUserModal 的預設角色
watch(activeTab, () => {
  if (showCreateUserModal.value) {
    // 如果模態框已開啟，則關閉再重新開啟以應用新的預設值
    showCreateUserModal.value = false
    setTimeout(() => {
      showCreateUserModal.value = true
    }, 100)
  }
})

// 初始化載入
onMounted(async () => {
  await fetchUsers()
})

// 獲取用戶列表
const fetchUsers = async () => {
  loading.value = true
  error.value = ''

  try {
    await userStore.getAllUsers()
    if (userStore.users && Array.isArray(userStore.users)) {
      userList.value = [...userStore.users]
      notify.notifySuccess('用戶列表載入成功')
    } else {
      throw new Error('無法獲取用戶列表資料')
    }
  } catch (err) {
    console.error('載入用戶列表失敗：', err)
    error.value = typeof err === 'string' ? err : '載入用戶列表失敗，請重新整理頁面'
    notify.notifyError(error.value)
  } finally {
    loading.value = false
  }
}

// 處理用戶狀態切換
const handleStatusToggle = async (user) => {
  if (user.role === 'admin') {
    notify.notifyWarning('無法停用管理員帳號')
    return
  }

  const action = user.isActive ? '停用' : '啟用'
  if (!confirm(`確定要${action}該用戶嗎？`)) return

  try {
    statusLoading.value = user._id
    const result = user.isActive
      ? await userStore.deactivateUser(user._id)
      : await userStore.activateUser(user._id)

    console.log(`${action}操作結果:`, result)
    notify.notifySuccess(`${action}用戶成功`)
    await refreshUserList()
  } catch (error) {
    console.error(`${user.isActive ? '停用' : '啟用'}用戶失敗:`, error)
    notify.notifyError(typeof error === 'string' ? error : '操作失敗，請稍後再試')
  } finally {
    statusLoading.value = null
  }
}

// 處理重置密碼
const handleResetPassword = async (userId) => {
  if (!confirm('確定要重置該用戶的密碼嗎？')) return

  try {
    passwordResetting.value = userId
    console.log('正在重置密碼...')
    const result = await userStore.resetUserPassword(userId)
    console.log('重置密碼結果:', result)

    if (result && result.success) {
      notify.notifySuccess(`密碼重置成功，新密碼：${result.newPassword}`)
      await refreshUserList()
    } else {
      throw new Error(result?.message || '重置密碼失敗')
    }
  } catch (error) {
    console.error('重置密碼過程中發生錯誤:', error)
    notify.notifyError(typeof error === 'string' ? error : '重置密碼失敗，請稍後再試')
  } finally {
    passwordResetting.value = null
  }
}

// 處理刪除用戶
const handleDeleteUser = async (user) => {
  if (user.role === 'admin') {
    notify.notifyWarning('不能刪除管理員帳號')
    return
  }

  if (!confirm(`確定要刪除用戶 "${user.account}" 嗎？此操作不可恢復！`)) {
    return
  }

  try {
    deletingUser.value = user._id
    console.log('正在刪除用戶:', user.account)
    const result = await userStore.deleteUser(user._id)

    console.log('刪除操作結果:', result)
    notify.notifySuccess(`成功刪除用戶 ${user.account}`)
    await refreshUserList()
  } catch (error) {
    console.error('刪除用戶失敗:', error)
    notify.notifyError(typeof error === 'string' ? error : '刪除用戶失敗，請稍後再試')
  } finally {
    deletingUser.value = null
  }
}

// 安全地刷新用戶列表
const refreshUserList = async () => {
  if (!loading.value) {
    try {
      console.log('刷新用戶列表開始')
      await userStore.getAllUsers()

      if (userStore.users && Array.isArray(userStore.users)) {
        userList.value = [...userStore.users]
        console.log('用戶列表刷新成功', userList.value.length)
        notify.notifySuccess('用戶列表已更新')
      } else {
        console.warn('無法獲取最新用戶列表')
      }
    } catch (err) {
      console.error('刷新用戶列表失敗：', err)
    }
  } else {
    console.warn('忽略刷新請求，因為目前已有載入操作在進行中')
  }
}
</script>

<style scoped>
table {
  border-collapse: separate;
  border-spacing: 0;
}

th {
  font-weight: 500;
  color: #94a3b8;
}

button {
  white-space: nowrap;
}

.select-all {
  user-select: all;
}
</style>
