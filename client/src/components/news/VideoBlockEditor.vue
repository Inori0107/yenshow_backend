<template>
  <div
    class="p-4 video-block-editor"
    :class="conditionalClass('border-gray-700 bg-gray-800/5', 'border-gray-300 bg-gray-50/30')"
  >
    <div class="flex justify-between items-center mb-2">
      <p class="text-sm font-semibold theme-text">嵌入影片區塊</p>
      <language-switcher v-model="currentEditingLanguage" />
    </div>

    <div class="space-y-3">
      <!-- Video Embed URL -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
          >影片嵌入 URL *</label
        >
        <input
          type="url"
          placeholder="例如：https://www.youtube.com/embed/VIDEO_ID"
          :value="blockData.videoEmbedUrl"
          @input="updateField('videoEmbedUrl', $event.target.value)"
          :class="[inputClasses, 'text-sm']"
        />
      </div>

      <!-- Video Preview -->
      <div
        v-if="embeddableVideoUrl"
        class="mt-2 p-2 border rounded aspect-video"
        :class="conditionalClass('border-gray-600', 'border-gray-300')"
      >
        <iframe
          width="100%"
          height="100%"
          :src="embeddableVideoUrl"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          title="影片預覽"
        ></iframe>
      </div>
      <p
        v-else-if="blockData.videoEmbedUrl && !embeddableVideoUrl"
        class="mt-2 text-xs px-3 py-1.5 rounded"
        :class="
          conditionalClass('text-yellow-400 bg-yellow-700/30', 'text-yellow-600 bg-yellow-200/50')
        "
      >
        無法預覽此影片URL，請確保它是有效的嵌入連結。
      </p>

      <!-- Video Caption -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
          >影片說明 (Caption) - {{ currentEditingLanguage }}</label
        >
        <input
          type="text"
          :placeholder="`影片說明 (${currentEditingLanguage})`"
          :value="blockData.videoCaption[currentEditingLanguage]"
          @input="updateLangField('videoCaption', currentEditingLanguage, $event.target.value)"
          :class="[inputClasses, 'text-sm']"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useThemeClass } from '@/composables/useThemeClass'
import LanguageSwitcher from '@/components/languageSwitcher.vue'

const props = defineProps({
  blockData: {
    type: Object,
    required: true,
  },
  initialLanguage: {
    type: String,
    default: 'TW',
  },
})

const emit = defineEmits(['update:blockData'])
const { conditionalClass, inputClass: themeInputClass } = useThemeClass()

const inputClasses = computed(() => [
  themeInputClass.value,
  'w-full rounded-[8px] ps-[10px] py-[6px] text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
])

const currentEditingLanguage = ref(props.initialLanguage || 'TW')

watch(
  () => props.initialLanguage,
  (newVal) => {
    if (newVal) currentEditingLanguage.value = newVal
  },
)

const updateField = (field, value) => {
  emitUpdate({ [field]: value })
}

const updateLangField = (field, lang, value) => {
  const updatedLangs = { ...(props.blockData[field] || {}), [lang]: value }
  emitUpdate({ [field]: updatedLangs })
}

const emitUpdate = (newDataChanges) => {
  const updatedBlockData = {
    ...props.blockData,
    ...newDataChanges,
  }
  emit('update:blockData', updatedBlockData)
}

// Basic video URL to embeddable URL conversion (can be expanded)
const embeddableVideoUrl = computed(() => {
  const url = props.blockData.videoEmbedUrl
  if (!url) return null

  // YouTube: from youtu.be/VIDEO_ID or youtube.com/watch?v=VIDEO_ID to youtube.com/embed/VIDEO_ID
  let youtubeMatch = url.match(
    /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }

  // Vimeo: from vimeo.com/VIDEO_ID to player.vimeo.com/video/VIDEO_ID
  let vimeoMatch = url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/)
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  // If it already looks like an embed URL (very basic check for /embed/ path)
  if (url.includes('/embed/')) {
    // Simplified check
    return url
  }

  return null // Not a recognized or directly embeddable URL by this basic logic
})
</script>
