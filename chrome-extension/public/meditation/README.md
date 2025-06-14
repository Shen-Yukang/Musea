# 冥想音频文件目录

这个目录用于存放冥想场景的音频文件。

## 📁 目录结构

```
meditation/
├── README.md           # 本说明文件
├── forest.ogg          # 森林场景音频 (推荐)
├── forest.mp3          # 森林场景音频 (备用)
├── ocean.ogg           # 海洋场景音频
├── ocean.mp3           # 海洋场景音频 (备用)
├── rain.ogg            # 雨声场景音频
├── rain.mp3            # 雨声场景音频 (备用)
├── birds.ogg           # 鸟鸣场景音频
├── cafe.ogg            # 咖啡厅场景音频
├── library.ogg         # 图书馆场景音频
├── white_noise.ogg     # 白噪音场景音频
├── temple.ogg          # 寺庙场景音频
└── singing_bowl.ogg    # 颂钵场景音频
```

## 🎵 音频要求

### 格式优先级
1. **OGG Vorbis** (首选) - 更小的文件大小，更好的音质
2. **MP3** (备用) - 通用兼容性
3. **WAV** (可选) - 无损音质

### 文件规格
- **时长**: 建议 5-15 分钟（支持循环播放）
- **音质**: OGG q4-q6 (约128-192kbps)
- **采样率**: 44.1kHz 或 48kHz
- **文件大小**: OGG 建议每个文件不超过 5MB

## 🌐 推荐音频资源

### 免费资源网站
1. **Freesound.org** - 大量免费环境音效
   - 搜索关键词: "forest ambience", "ocean waves", "rain"
   - 下载后转换为OGG格式

2. **Zapsplat.com** - 专业音效库
   - 需要免费注册
   - 高质量环境音效

3. **BBC Sound Effects** - BBC开放音效库
   - 免费下载
   - 高质量录音

### 具体推荐
- **森林**: 鸟鸣 + 树叶沙沙声 + 微风
- **海洋**: 海浪声 + 海鸥叫声（轻柔）
- **雨声**: 温柔雨滴声，避免雷声
- **鸟鸣**: 清晨鸟类歌唱，多种鸟类混合
- **咖啡厅**: 轻柔背景音乐 + 人声低语
- **图书馆**: 极轻的环境音 + 偶尔翻页声
- **白噪音**: 纯净白噪音或粉噪音
- **寺庙**: 钟声 + 木鱼声，节奏缓慢
- **颂钵**: 西藏颂钵或水晶钵，治愈音频

## 🔧 音频处理建议

### 使用Audacity处理
1. 导入原始音频文件
2. 调整音量到适中水平（避免过大或过小）
3. 确保开头和结尾能无缝循环
4. 导出为OGG格式（质量等级5）

### 循环处理
- 确保音频开头和结尾能够无缝衔接
- 避免突然的音量变化
- 可以使用淡入淡出效果

## 📝 使用说明

1. 将音频文件放入此目录
2. 按照上述命名规则命名文件
3. 重新构建Chrome扩展: `pnpm build`
4. 在冥想设置中选择对应场景即可使用

## ⚠️ 注意事项

- 请确保使用的音频文件具有合法的使用权限
- 建议使用开源或免费的音频资源
- 文件大小过大可能影响加载速度
- 如果没有音频文件，对应场景将自动静音

## 🔄 格式转换

如果你有MP3文件想转换为OGG，可以使用：

### 在线转换
- CloudConvert.com
- Online-Convert.com

### 命令行转换 (FFmpeg)
```bash
ffmpeg -i input.mp3 -c:a libvorbis -q:a 5 output.ogg
```

---

更多详细信息请参考 `MEDITATION_AUDIO_GUIDE.md` 文件。
