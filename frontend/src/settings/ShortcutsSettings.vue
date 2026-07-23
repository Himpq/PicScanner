<script setup>
const groups = [
  {
    title: '图库',
    items: [
      { keys: ['Ctrl', 'F'], text: '搜索照片' },
      { keys: ['Ctrl', '滚轮'], text: '调整照片墙缩略图' },
      { keys: ['Alt'], text: '立即显示悬停照片参数' },
      { keys: ['C'], text: '打开或关闭对比选图' },
      { keys: ['F'], text: '收藏或取消收藏悬停照片' },
      { keys: ['E'], text: '编辑悬停照片笔记' },
      { keys: ['R'], text: '编辑当前日期笔记' },
      { keys: ['S'], text: '设置悬停照片分类' },
    ],
  },
  {
    title: '快速调整',
    items: [
      { keys: ['Q'], text: '在图库选择照片快速调整' },
      { keys: ['灯箱', 'Q'], text: '调整当前照片' },
      { keys: ['Ctrl', 'S'], text: '保存调整结果' },
      { keys: ['Ctrl', 'Z'], text: '撤销调整' },
      { keys: ['Esc'], text: '退出快速调整或关闭弹层' },
    ],
  },
  {
    title: '灯箱',
    items: [
      { keys: ['滚轮'], text: '缩放图片' },
      { keys: ['←'], text: '上一张' },
      { keys: ['→'], text: '下一张' },
      { keys: ['i'], text: '显示或隐藏参数面板按钮' },
    ],
  },
];
</script>

<template>
  <div class="settings-stack">
    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>快捷键</h3>
          <p>这里只展示现有键位，本次不提供键位修改。</p>
        </div>
      </div>
      <div class="settings-panel-body">
        <section v-for="group in groups" :key="group.title" class="settings-shortcut-group">
          <h3>{{ group.title }}</h3>
          <div v-for="item in group.items" :key="item.text" class="settings-shortcut-row">
            <span class="settings-shortcut-keys">
              <kbd v-for="key in item.keys" :key="key">{{ key }}</kbd>
            </span>
            <span>{{ item.text }}</span>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
