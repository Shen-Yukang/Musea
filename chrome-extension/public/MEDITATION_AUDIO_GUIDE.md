# 冥想音频配置指南

## 📁 音频文件放置方式

### 方式一：本地文件放置（推荐）

1. **创建音频文件夹**
   在Chrome扩展的 `public` 目录下创建 `meditation` 文件夹：
   ```
   chrome-extension/public/meditation/
   ```

2. **放置音频文件**
   将你的音频文件按以下命名规则放置：
   ```
   chrome-extension/public/meditation/
   ├── forest.mp3          # 森林场景
   ├── ocean.mp3           # 海洋场景  
   ├── rain.mp3            # 雨声场景
   ├── birds.mp3           # 鸟鸣场景
   ├── cafe.mp3            # 咖啡厅场景
   ├── library.mp3         # 图书馆场景
   ├── white_noise.mp3     # 白噪音场景
   ├── temple.mp3          # 寺庙场景
   └── singing_bowl.mp3    # 颂钵场景
   ```

3. **重新构建扩展**
   ```bash
   pnpm build
   ```

### 方式二：在线音频URL配置

如果你想使用在线音频资源，可以通过浏览器开发者工具配置：

1. **打开开发者工具**
   - 按 F12 或右键选择"检查"
   - 切换到 Console 标签

2. **配置自定义音频URL**
   ```javascript
   // 设置森林场景的音频URL
   chrome.storage.local.get(['meditation-storage-key'], (result) => {
     const config = result['meditation-storage-key'] || {};
     config.customAudioUrls = config.customAudioUrls || {};
     config.customAudioUrls.forest = 'https://example.com/forest-sounds.mp3';
     chrome.storage.local.set({'meditation-storage-key': config});
   });
   
   // 设置多个场景
   chrome.storage.local.get(['meditation-storage-key'], (result) => {
     const config = result['meditation-storage-key'] || {};
     config.customAudioUrls = {
       forest: 'https://example.com/forest.mp3',
       ocean: 'https://example.com/ocean.mp3',
       rain: 'https://example.com/rain.mp3',
       // ... 其他场景
     };
     chrome.storage.local.set({'meditation-storage-key': config});
   });
   ```

3. **移除自定义URL**
   ```javascript
   chrome.storage.local.get(['meditation-storage-key'], (result) => {
     const config = result['meditation-storage-key'] || {};
     if (config.customAudioUrls) {
       delete config.customAudioUrls.forest; // 移除森林场景的自定义URL
       chrome.storage.local.set({'meditation-storage-key': config});
     }
   });
   ```

## 🎵 音频文件要求

### 格式支持
- **推荐格式**: MP3, OGG, WAV
- **文件大小**: 建议每个文件不超过 10MB
- **时长**: 建议至少 5-10 分钟，支持循环播放

### 音质建议
- **比特率**: 128kbps - 320kbps
- **采样率**: 44.1kHz 或 48kHz
- **声道**: 立体声或单声道均可

## 🔧 音频场景说明

| 场景 | 文件名 | 描述 | 推荐音频类型 |
|------|--------|------|-------------|
| 🌲 森林 | `forest.mp3` | 鸟鸣与树叶沙沙声 | 自然森林环境音 |
| 🌊 海洋 | `ocean.mp3` | 海浪轻拍海岸声 | 海浪声、海风声 |
| 🌧️ 雨声 | `rain.mp3` | 温柔的雨滴声 | 雨滴声、雷声（轻柔） |
| 🐦 鸟鸣 | `birds.mp3` | 清晨鸟儿歌唱 | 各种鸟类叫声 |
| ☕ 咖啡厅 | `cafe.mp3` | 温馨的咖啡厅环境音 | 轻柔背景音乐、人声低语 |
| 📚 图书馆 | `library.mp3` | 安静的学习氛围 | 极轻的环境音、翻页声 |
| 🔊 白噪音 | `white_noise.mp3` | 纯净的白噪音 | 白噪音、粉噪音 |
| 🏯 寺庙 | `temple.mp3` | 宁静的寺庙钟声 | 钟声、木鱼声、诵经声 |
| 🎵 颂钵 | `singing_bowl.mp3` | 治愈的颂钵音 | 西藏颂钵、水晶钵声 |
| 🤫 静音 | - | 完全安静的冥想 | 无需音频文件 |

## 🎯 使用技巧

### 1. 音频循环
- 所有音频都会自动循环播放
- 确保音频开头和结尾能够无缝衔接

### 2. 音量控制
- 在冥想设置中可以调节音量（0-100%）
- 建议音量设置在 30-60% 之间

### 3. 测试音频
- 配置完成后，启动一个短时间的冥想会话进行测试
- 检查音频是否正常播放和循环

## 🔍 故障排除

### 音频无法播放
1. **检查文件路径**: 确保文件名和路径正确
2. **检查文件格式**: 确保使用支持的音频格式
3. **检查文件大小**: 过大的文件可能导致加载失败
4. **检查网络**: 在线URL需要稳定的网络连接

### 音频播放卡顿
1. **降低音质**: 使用较低比特率的音频文件
2. **使用本地文件**: 本地文件比在线URL更稳定
3. **检查系统资源**: 确保系统有足够的内存

### 自定义URL不生效
1. **检查URL有效性**: 确保URL可以直接访问
2. **检查CORS策略**: 某些网站可能限制跨域访问
3. **重新配置**: 清除配置后重新设置

## 📚 推荐资源

### 免费音频资源网站
- **Freesound.org**: 大量免费环境音效
- **Zapsplat.com**: 专业音效库（需注册）
- **BBC Sound Effects**: BBC开放的音效库

### 音频编辑工具
- **Audacity**: 免费开源音频编辑器
- **GarageBand**: Mac用户的音频编辑工具
- **Adobe Audition**: 专业音频编辑软件

## 💡 高级配置

### 批量配置多个URL
```javascript
const audioUrls = {
  forest: 'https://example.com/forest.mp3',
  ocean: 'https://example.com/ocean.mp3',
  rain: 'https://example.com/rain.mp3',
  birds: 'https://example.com/birds.mp3',
  cafe: 'https://example.com/cafe.mp3',
  library: 'https://example.com/library.mp3',
  white_noise: 'https://example.com/white_noise.mp3',
  temple: 'https://example.com/temple.mp3',
  singing_bowl: 'https://example.com/singing_bowl.mp3'
};

chrome.storage.local.get(['meditation-storage-key'], (result) => {
  const config = result['meditation-storage-key'] || {};
  config.customAudioUrls = audioUrls;
  chrome.storage.local.set({'meditation-storage-key': config});
  console.log('所有音频URL配置完成！');
});
```

### 查看当前配置
```javascript
chrome.storage.local.get(['meditation-storage-key'], (result) => {
  console.log('当前冥想配置:', result['meditation-storage-key']);
});
```

---

**注意**: 配置完成后，建议重启Chrome扩展以确保所有更改生效。
