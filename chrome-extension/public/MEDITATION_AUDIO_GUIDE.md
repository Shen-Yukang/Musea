# 冥想音频配置指南

## 📁 音频文件放置方式

### 方式一：本地文件放置（推荐）

1. **创建音频文件夹**
   在Chrome扩展的 `public` 目录下创建 `meditation` 文件夹：
   ```
   chrome-extension/public/meditation/
   ```

2. **放置音频文件**
   将你的音频文件按以下命名规则放置（支持多种格式）：
   ```
   chrome-extension/public/meditation/
   ├── forest.ogg          # 森林场景（推荐OGG格式）
   ├── forest.mp3          # 森林场景（备用MP3格式）
   ├── ocean.ogg           # 海洋场景
   ├── ocean.mp3           # 海洋场景（备用）
   ├── rain.ogg            # 雨声场景
   ├── rain.mp3            # 雨声场景（备用）
   ├── birds.ogg           # 鸟鸣场景
   ├── cafe.ogg            # 咖啡厅场景
   ├── library.ogg         # 图书馆场景
   ├── white_noise.ogg     # 白噪音场景
   ├── temple.ogg          # 寺庙场景
   └── singing_bowl.ogg    # 颂钵场景
   ```

   **格式优先级**: OGG > MP3 > WAV
   - 系统会自动选择最佳可用格式
   - 建议优先使用OGG格式（更小的文件大小，更好的音质）

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

### 为什么推荐OGG格式？

OGG Vorbis是一种开源的音频压缩格式，具有以下优势：

#### 🎯 技术优势
- **更好的压缩率**: 相同音质下文件比MP3小20-30%
- **更高的音质**: 在低比特率下音质优于MP3
- **无专利限制**: 完全开源，无版权问题
- **更好的循环**: 支持无缝循环播放

#### 💡 实际效果
- **文件大小**: 10分钟冥想音频约2-4MB (vs MP3的3-6MB)
- **加载速度**: 更小的文件意味着更快的加载
- **音质表现**: 特别适合环境音和自然声音
- **浏览器支持**: 现代浏览器都支持OGG播放

#### 🔄 兼容性
- **Chrome**: ✅ 完全支持
- **Firefox**: ✅ 完全支持
- **Safari**: ⚠️ 部分支持 (建议提供MP3备用)
- **Edge**: ✅ 完全支持

### 格式支持
- **推荐格式**:
  1. **OGG Vorbis** (首选) - 开源格式，压缩率高，音质优秀
  2. **MP3** - 通用格式，兼容性好
  3. **WAV** - 无损格式，文件较大
- **文件大小**:
  - OGG: 建议每个文件不超过 5MB
  - MP3: 建议每个文件不超过 8MB
  - WAV: 建议每个文件不超过 15MB
- **时长**: 建议至少 5-10 分钟，支持循环播放

### 音质建议

#### OGG Vorbis (推荐)
- **质量等级**: q4-q6 (约128-192kbps)
- **采样率**: 44.1kHz 或 48kHz
- **声道**: 立体声或单声道均可
- **优势**: 文件小、音质好、开源免费

#### MP3 (备用)
- **比特率**: 128kbps - 192kbps
- **采样率**: 44.1kHz 或 48kHz
- **编码**: CBR 或 VBR 均可

#### WAV (高质量)
- **比特率**: 16-bit 或 24-bit
- **采样率**: 44.1kHz 或 48kHz
- **用途**: 适合高质量音频源

## 🔧 音频场景说明

| 场景 | 文件名 | 描述 | 推荐音频类型 |
|------|--------|------|-------------|
| 🌲 森林 | `forest.ogg/mp3/wav` | 鸟鸣与树叶沙沙声 | 自然森林环境音 |
| 🌊 海洋 | `ocean.ogg/mp3/wav` | 海浪轻拍海岸声 | 海浪声、海风声 |
| 🌧️ 雨声 | `rain.ogg/mp3/wav` | 温柔的雨滴声 | 雨滴声、雷声（轻柔） |
| 🐦 鸟鸣 | `birds.ogg/mp3/wav` | 清晨鸟儿歌唱 | 各种鸟类叫声 |
| ☕ 咖啡厅 | `cafe.ogg/mp3/wav` | 温馨的咖啡厅环境音 | 轻柔背景音乐、人声低语 |
| 📚 图书馆 | `library.ogg/mp3/wav` | 安静的学习氛围 | 极轻的环境音、翻页声 |
| 🔊 白噪音 | `white_noise.ogg/mp3/wav` | 纯净的白噪音 | 白噪音、粉噪音 |
| 🏯 寺庙 | `temple.ogg/mp3/wav` | 宁静的寺庙钟声 | 钟声、木鱼声、诵经声 |
| 🎵 颂钵 | `singing_bowl.ogg/mp3/wav` | 治愈的颂钵音 | 西藏颂钵、水晶钵声 |
| 🤫 静音 | - | 完全安静的冥想 | 无需音频文件 |

**注意**: 系统会按 OGG → MP3 → WAV 的优先级自动选择可用格式

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
- **Audacity**: 免费开源音频编辑器，支持OGG导出
- **GarageBand**: Mac用户的音频编辑工具
- **Adobe Audition**: 专业音频编辑软件
- **FFmpeg**: 命令行音频转换工具

### OGG格式转换

#### 使用Audacity转换为OGG
1. 打开Audacity，导入音频文件
2. 选择 `文件` → `导出` → `导出为OGG`
3. 设置质量等级为 4-6 (推荐)
4. 点击保存

#### 使用FFmpeg命令行转换
```bash
# 转换MP3为OGG (质量等级5)
ffmpeg -i input.mp3 -c:a libvorbis -q:a 5 output.ogg

# 批量转换当前目录所有MP3文件
for file in *.mp3; do
  ffmpeg -i "$file" -c:a libvorbis -q:a 5 "${file%.mp3}.ogg"
done
```

#### 在线转换工具
- **CloudConvert**: 支持OGG格式的在线转换
- **Online-Convert**: 免费音频格式转换
- **Convertio**: 支持批量转换

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
