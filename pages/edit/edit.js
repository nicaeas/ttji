const store = require('../../utils/store')
const util = require('../../utils/util')
const files = require('../../utils/files')
const templates = require('../../utils/templates')

Page({
  data: {
    isEdit: false,
    id: '',
    title: '',
    content: '',
    timeText: '',
    tags: [],
    tagInput: '',
    sugTags: [], // 可点选的标签：预设 + 已用标签，排除已选
    images: [], // 图片本地路径（持久化用）
    displayImages: [], // 展示用路径（devtools 下 usr 路径转 base64，真机与 images 相同）
    audio: [], // [{ path, duration }]
    recording: false,
    recordSeconds: 0,
    playingIndex: -1,
    templates: []
  },

  onLoad(options) {
    // 已持久化但本次会话被移除的附件，保存成功后再真正删除
    this._removedFiles = []
    this._discardRecord = false

    this.initRecorder()
    this.initPlayer()

    const id = options && options.id
    if (id) {
      const note = store.getById(id)
      if (note) {
        this.setData({
          isEdit: true,
          id: note.id,
          title: note.title,
          content: note.content,
          timeText: util.formatTime(note.updatedAt),
          tags: (note.tags || []).slice(),
          images: (note.images || []).slice(),
          audio: (note.audio || []).slice()
        })
        this.syncDisplayImages()
        wx.setNavigationBarTitle({ title: '编辑笔记' })
      }
    }
    if (!this.data.isEdit) {
      wx.setNavigationBarTitle({ title: '新建笔记' })
    }
    this.setData({ templates: templates.getAllTemplates() })
    this.refreshSugTags()
  },

  onShow() {
    // 从模板管理页返回后刷新自定义模板
    this.setData({ templates: templates.getAllTemplates() })
    this.refreshSugTags()
  },

  /* ---------- 输入捕获 ----------
   * 标题/正文输入直接写入 this.data 而不 setData 回写 value：
   * 避免真机中文输入法下「受控回显」打字丢字导致保存时误判为空。
   * 模板填充、编辑回填仍走 setData 正常刷新。
   */
  onTitleInput(e) {
    this.data.title = e.detail.value
  },

  onContentInput(e) {
    this.data.content = e.detail.value
  },

  /* ---------- 模板 ---------- */

  onApplyTemplate(e) {
    const content = templates.getContent(e.currentTarget.dataset.id)
    if (util.isBlank(content)) return
    const apply = () => this.setData({ content })
    if (util.isBlank(this.data.content)) {
      apply()
      return
    }
    wx.showModal({
      title: '应用模板',
      content: '将覆盖当前正文，是否继续？',
      success: res => { if (res.confirm) apply() }
    })
  },

  onManageTemplates() {
    wx.navigateTo({ url: '/pages/templates/templates' })
  },

  /* ---------- 标签 ---------- */

  // 可点选标签池：预设 + 历史用过的标签，常用在前、最近在前，排除已选
  refreshSugTags() {
    const selected = this.data.tags
    const stats = store.tagStats(true)
    this.setData({ sugTags: stats.filter(s => selected.indexOf(s.name) === -1).map(s => s.name) })
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value })
  },

  onAddTag() {
    const t = (this.data.tagInput || '').trim().replace(/^#+/, '')
    if (!t) return
    if (this.data.tags.indexOf(t) === -1) {
      this.setData({ tags: this.data.tags.concat([t]) })
    }
    this.setData({ tagInput: '' })
    this.refreshSugTags()
  },

  onRemoveTag(e) {
    const t = e.currentTarget.dataset.tag
    this.setData({ tags: this.data.tags.filter(x => x !== t) })
    this.refreshSugTags()
  },

  // 点选预设/历史标签
  onSugTagTap(e) {
    const t = e.currentTarget.dataset.tag
    if (this.data.tags.indexOf(t) === -1) {
      this.setData({ tags: this.data.tags.concat([t]) })
    }
    this.refreshSugTags()
  },

  // 长按标签：删除（从预设与所有笔记中移除该标签）
  onSugTagLongPress(e) {
    const name = e.currentTarget.dataset.tag
    wx.showModal({
      title: '删除标签 #' + name,
      content: '将从预设和所有笔记中移除该标签，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success: res => {
        if (!res.confirm) return
        store.deleteTag(name)
        if (this.data.tags.indexOf(name) !== -1) {
          this.setData({ tags: this.data.tags.filter(t => t !== name) })
        }
        this.refreshSugTags()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  /* ---------- 图片附件 ---------- */

  onAddImages() {
    const left = 9 - this.data.images.length
    if (left <= 0) {
      wx.showToast({ title: '最多添加 9 张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: left,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => {
        const paths = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ images: this.data.images.concat(paths) })
        this.syncDisplayImages()
      }
    })
  },

  // 展示路径与持久化路径分离：预览/保存用 images（原生 API 支持），渲染用 displayImages
  syncDisplayImages() {
    this.setData({ displayImages: this.data.images.map(p => files.displaySrc(p)) })
  },

  onPreviewImage(e) {
    const idx = e.currentTarget.dataset.index
    wx.previewImage({ current: this.data.images[idx], urls: this.data.images })
  },

  onRemoveImage(e) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.images.slice()
    const removed = images.splice(idx, 1)
    // 已持久化的文件先记录，保存成功后再删除，避免未保存退出导致断链
    this._removedFiles = this._removedFiles.concat(removed)
    this.setData({ images })
    this.syncDisplayImages()
  },

  /* ---------- 语音附件 ---------- */

  initRecorder() {
    this.recorderManager = wx.getRecorderManager()
    this.recorderManager.onStop(res => {
      this.clearTimer()
      const discard = this._discardRecord
      this._discardRecord = false
      this.setData({ recording: false })
      if (discard || !res.tempFilePath) return
      const duration = Math.max(1, Math.round((res.duration || 1000) / 1000))
      this.setData({ audio: this.data.audio.concat([{ path: res.tempFilePath, duration }]) })
      wx.showToast({ title: '已添加语音', icon: 'none' })
    })
    this.recorderManager.onError(() => {
      this.clearTimer()
      this._discardRecord = false
      this.setData({ recording: false })
      wx.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
    })
  },

  initPlayer() {
    this.audioContext = wx.createInnerAudioContext()
    this.audioContext.onEnded(() => this.setData({ playingIndex: -1 }))
    this.audioContext.onError(() => {
      // 对无音源的空实例做 stop、或系统回收音频资源时也会触发 onError，
      // 只有用户主动播放中失败才提示，避免添加图片等操作误弹「播放失败」
      if (this.data.playingIndex !== -1) {
        wx.showToast({ title: '播放失败', icon: 'none' })
      }
      this.setData({ playingIndex: -1 })
    })
  },

  onUnload() {
    this.clearTimer()
    if (this.audioContext) {
      this.audioContext.destroy()
      this.audioContext = null
    }
  },

  onHide() {
    // 离开页面时停止录音（丢弃）与播放
    if (this.data.recording) {
      this._discardRecord = true
      this.clearTimer()
      this.recorderManager.stop()
      this.setData({ recording: false })
    }
    // 只对设置过音源的实例 stop：空实例 stop 会触发 onError（chooseMedia 打开时页面会 onHide）
    if (this.audioContext && this.audioContext.src) {
      this.setData({ playingIndex: -1 })
      this.audioContext.stop()
    }
  },

  clearTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  onToggleRecord() {
    if (this.data.recording) {
      this._discardRecord = false
      this.recorderManager.stop()
      return
    }
    // 不额外限制时长：上限取系统最大 10 分钟，到点由系统自动停止并入列
    this.recorderManager.start({ format: 'mp3', duration: 600000 })
    this.setData({ recording: true, recordSeconds: 0 })
    // 计时仅用于按钮上的秒数显示，不参与任何停止逻辑
    this._timer = setInterval(() => {
      if (!this.data.recording) {
        this.clearTimer()
        return
      }
      this.setData({ recordSeconds: Math.min(this.data.recordSeconds + 1, 599) })
    }, 1000)
  },

  onTogglePlay(e) {
    const idx = e.currentTarget.dataset.index
    if (this.data.playingIndex === idx) {
      this.setData({ playingIndex: -1 })
      this.audioContext.stop()
      return
    }
    this.audioContext.stop()
    this.audioContext.src = this.data.audio[idx].path
    this.audioContext.play()
    this.setData({ playingIndex: idx })
  },

  onRemoveAudio(e) {
    const idx = e.currentTarget.dataset.index
    const audio = this.data.audio.slice()
    const removed = audio.splice(idx, 1)
    this._removedFiles = this._removedFiles.concat(removed.map(a => a.path))
    if (this.data.playingIndex === idx) {
      this.setData({ playingIndex: -1 })
      this.audioContext.stop()
    }
    this.setData({ audio })
  },

  /* ---------- 保存 / 删除 / 分享 ---------- */

  onSave() {
    // 录音进行中不允许保存：提交中的录音尚未入列，直接保存会丢失
    if (this.data.recording) {
      wx.showToast({ title: '请先停止录音再保存', icon: 'none' })
      return
    }
    const { isEdit, id, tags, images, audio } = this.data
    const title = this.data.title || ''
    const content = this.data.content || ''
    if (util.isBlank(title) && util.isBlank(content) && !images.length && !audio.length) {
      wx.showToast({ title: '写点内容再保存吧', icon: 'none' })
      return
    }
    // 临时文件持久化到用户目录，已持久化的原样保留
    const savedImages = files.persistAll(images)
    const savedAudio = audio.map(a => ({ path: files.persistFile(a.path), duration: a.duration }))
    const ok = isEdit
      ? store.update(id, { title, content, tags, images: savedImages, audio: savedAudio })
      : store.add({ title, content, tags, images: savedImages, audio: savedAudio })
    if (!ok) return

    files.deleteFiles(this._removedFiles)
    this._removedFiles = []

    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  },

  // 编辑页删除 = 移入回收站
  onDelete() {
    if (this.data.recording) {
      wx.showToast({ title: '请先停止录音再操作', icon: 'none' })
      return
    }
    wx.showModal({
      title: '删除笔记',
      content: '笔记将移入回收站，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success: res => {
        if (res.confirm) {
          store.softDelete(this.data.id)
          wx.showToast({ title: '已移入回收站', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 600)
        }
      }
    })
  },

  onShareImage() {
    wx.navigateTo({ url: '/pages/share/share?id=' + this.data.id })
  }
})
