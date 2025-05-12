<template>
  <div class="p-4 rich-text-block-editor rounded-md">
    <div class="flex justify-between items-center mb-2">
      <p class="theme-text">內容區塊</p>
      <language-switcher v-model="currentEditingLanguage" />
    </div>

    <div
      v-if="editor"
      class="tiptap-toolbar grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-1 p-2 rounded-t-md border-b"
      :class="conditionalClass('bg-gray-700/20 border-gray-600', 'bg-gray-100/80 border-gray-300')"
    >
      <!-- Format Group -->
      <div class="toolbar-button-group flex items-center gap-1 text-[13px]">
        <label :class="['toolbar-label', conditionalClass('text-gray-400', 'text-gray-600')]">
          格式：
        </label>
        <button
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :class="['toolbar-button', isHeadingActive ? 'is-active' : defaultButtonClass]"
          title="標題 (H2)"
        >
          標題
        </button>
        <button
          type="button"
          @click="editor.chain().focus().setParagraph().run()"
          :class="['toolbar-button', isParagraphActive ? 'is-active' : defaultButtonClass]"
          title="內文 (Paragraph)"
        >
          內文
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="['toolbar-button', isBlockquoteActive ? 'is-active' : defaultButtonClass]"
          title="備註 (引用)"
        >
          備註
        </button>
      </div>

      <!-- Style Group -->
      <div class="toolbar-button-group flex items-center gap-1 text-[13px]">
        <label :class="['toolbar-label', conditionalClass('text-gray-400', 'text-gray-600')]">
          樣式：
        </label>
        <button
          type="button"
          @click="editor.chain().focus().toggleBold().run()"
          :disabled="!editor.can().chain().focus().toggleBold().run()"
          :class="['toolbar-button', editor.isActive('bold') ? 'is-active' : defaultButtonClass]"
          title="粗體"
        >
          粗體
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleItalic().run()"
          :disabled="!editor.can().chain().focus().toggleItalic().run()"
          :class="['toolbar-button', editor.isActive('italic') ? 'is-active' : defaultButtonClass]"
          title="斜體"
        >
          斜體
        </button>
      </div>

      <!-- Color Group -->
      <div class="toolbar-button-group flex items-center gap-1 text-[13px]">
        <label :class="['toolbar-label', conditionalClass('text-gray-400', 'text-gray-600')]">
          顏色：
        </label>
        <input
          type="color"
          @input="editor.chain().focus().setColor($event.target.value).run()"
          :value="editor.getAttributes('textStyle').color || (isDark ? '#FFFFFF' : '#000000')"
          title="文字顏色"
          class="toolbar-button color-picker"
          :style="{
            backgroundColor:
              editor.getAttributes('textStyle').color || (isDark ? '#FFFFFF' : '#000000'),
          }"
        />
        <button
          type="button"
          @click="editor.chain().focus().unsetColor().run()"
          :class="['toolbar-button', defaultButtonClass]"
          title="清除顏色"
        >
          清除顏色
        </button>
      </div>
    </div>
    <editor-content :editor="editor" class="tiptap-content-area" />
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, onMounted, computed } from 'vue'
import { useThemeClass } from '@/composables/useThemeClass'
import { useDark } from '@vueuse/core'
import LanguageSwitcher from '@/components/languageSwitcher.vue'

import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({ TW: {}, EN: {} }),
  },
  initialLanguage: {
    type: String,
    default: 'TW',
  },
})

const emit = defineEmits(['update:modelValue'])
const { conditionalClass } = useThemeClass()
const isDark = useDark()

const currentEditingLanguage = ref(props.initialLanguage || 'TW')

const defaultEmptyContent = () => ({ type: 'doc', content: [{ type: 'paragraph' }] })

const editor = useEditor({
  content: props.modelValue[currentEditingLanguage.value] || defaultEmptyContent(),
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [2],
      },
      bulletList: false,
      orderedList: false,
      listItem: false,
      codeBlock: false,
      hardBreak: false,
      horizontalRule: false,
    }),
    TextStyle,
    Color,
  ],
  editable: true,
  onUpdate: ({ editor: updatedEditor }) => {
    const currentJson = updatedEditor.getJSON()
    const newModelData = {
      ...props.modelValue,
      [currentEditingLanguage.value]: currentJson,
    }
    emit('update:modelValue', newModelData)
  },
})

// Computed properties for button active states
const isHeadingActive = computed(() => {
  return editor.value ? editor.value.isActive('heading', { level: 2 }) : false
})

const isBlockquoteActive = computed(() => {
  // Active if it's a blockquote.
  return editor.value ? editor.value.isActive('blockquote') : false
})

const isParagraphActive = computed(() => {
  // Active if it's a paragraph.
  return editor.value ? editor.value.isActive('paragraph') : false
})

const defaultButtonClass = computed(() => {
  return conditionalClass(
    'bg-gray-500/30 hover:bg-gray-500/50 text-gray-200',
    'bg-gray-200/70 hover:bg-gray-300/70 text-gray-800',
  )
})

watch(currentEditingLanguage, (newLang, oldLang) => {
  if (editor.value && newLang !== oldLang) {
    let newContent = props.modelValue[newLang]
    if (
      !newContent ||
      !newContent.type ||
      newContent.type !== 'doc' ||
      !newContent.content ||
      newContent.content.length === 0
    ) {
      newContent = defaultEmptyContent()
    }
    editor.value.commands.setContent(newContent, false)
  }
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (editor.value) {
      const editorContent = editor.value.getJSON()
      let newContentForLang = newVal[currentEditingLanguage.value]
      if (
        !newContentForLang ||
        !newContentForLang.type ||
        newContentForLang.type !== 'doc' ||
        !newContentForLang.content ||
        newContentForLang.content.length === 0
      ) {
        newContentForLang = defaultEmptyContent()
      }
      if (JSON.stringify(editorContent) !== JSON.stringify(newContentForLang)) {
        editor.value.commands.setContent(newContentForLang, false)
      }
    }
  },
  { deep: true },
)

watch(
  () => props.initialLanguage,
  (newVal) => {
    if (newVal && newVal !== currentEditingLanguage.value) {
      currentEditingLanguage.value = newVal
    }
  },
)

onMounted(() => {
  if (editor.value) {
    let initialContent = props.modelValue[currentEditingLanguage.value]
    if (
      !initialContent ||
      !initialContent.type ||
      initialContent.type !== 'doc' ||
      !initialContent.content ||
      initialContent.content.length === 0
    ) {
      initialContent = defaultEmptyContent()
    }
    if (JSON.stringify(editor.value.getJSON()) !== JSON.stringify(initialContent)) {
      editor.value.commands.setContent(initialContent, false)
    }
  }
})

onUnmounted(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style>
.toolbar-label {
  font-size: 0.8125rem;
  font-weight: 500;
  margin-right: 0.25rem;
  white-space: nowrap;
  color: var(--toolbar-label-color, #4a5568);
}
html.dark .toolbar-label {
  color: var(--toolbar-label-color-dark, #a0aec0);
}

.tiptap-toolbar button.toolbar-button,
.tiptap-toolbar input.toolbar-button {
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  transition:
    background-color 0.2s ease-in-out,
    border-color 0.2s ease-in-out;
}

.tiptap-toolbar button.toolbar-button:not(.is-active) {
  border-color: var(--button-default-border-color, #e2e8f0);
}
html.dark .tiptap-toolbar button.toolbar-button:not(.is-active) {
  border-color: var(--button-default-border-color-dark, #4a5568);
}

.tiptap-toolbar button.toolbar-button.is-active {
  background-color: #3b82f6 !important;
  color: white !important;
  border-color: #3b82f6 !important;
}
html.dark .tiptap-toolbar button.toolbar-button.is-active {
  background-color: #60a5fa !important;
  color: #1f2937 !important;
  border-color: #60a5fa !important;
}

.tiptap-toolbar .color-picker {
  width: 1.6rem;
  height: 1.6rem;
  padding: 0.1rem;
  border: 1px solid;
  cursor: pointer;
  vertical-align: middle;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-color: transparent;
  border-radius: 0.25rem;
}

html.dark .tiptap-toolbar .color-picker {
  border-color: var(--button-default-border-color-dark, #4a5568);
}
html:not(.dark) .tiptap-toolbar .color-picker {
  border-color: var(--button-default-border-color, #e2e8f0);
}

.tiptap-toolbar .color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}
.tiptap-toolbar .color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 0.125rem;
}
.tiptap-toolbar .color-picker::-moz-color-swatch {
  border: none;
  border-radius: 0.125rem;
}

.tiptap-content-area .ProseMirror {
  min-height: 150px;
  padding: 0.75rem;
  border: 1px solid;
  border-radius: 0 0 0.375rem 0.375rem;
  outline: none;
  margin-top: -1px;
}

html.dark .tiptap-content-area .ProseMirror {
  border-color: #4a5568;
  color: #d1d5db;
  background-color: #1f2937;
}

html:not(.dark) .tiptap-content-area .ProseMirror {
  border-color: #d1d5db;
  color: #1f2937;
  background-color: white;
}

.ProseMirror h2 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 0.5em;
  margin-bottom: 0.25em;
}
.ProseMirror p {
  margin-bottom: 0.5em;
  line-height: 1.6;
}
.ProseMirror blockquote {
  border-left: 3px solid;
  margin-left: 1rem;
  padding-left: 1rem;
  font-style: italic;
}
html:not(.dark) .ProseMirror blockquote {
  border-left-color: #cbd5e1;
  color: #4b5563;
}
html.dark .ProseMirror blockquote {
  border-left-color: #4b5563;
  color: #9ca3af;
}
</style>
