/**
 * 语音配置常量 - 统一管理所有语音类型和默认文本
 */

// 语音选项接口
export interface VoiceOption {
  value: string;
  label: string;
  defaultText: string;
}

// 语音类型枚举
export enum VoiceType {
  ZH_FEMALE_LINJIANVHAI = 'zh_female_linjianvhai_moon_bigtts',
  ZH_FEMALE_YUANQINVYOU = 'zh_female_yuanqinvyou_moon_bigtts',
  ZH_FEMALE_GAOLENGYUJIE = 'zh_female_gaolengyujie_moon_bigtts',
  ZH_FEMALE_TIANMEIXIAOYUAN = 'zh_female_tianmeixiaoyuan_moon_bigtts',
  ZH_FEMALE_KAILANGJIEJIE = 'zh_female_kailangjiejie_moon_bigtts',
  MULTI_FEMALE_SHUANGKUAISISI = 'multi_female_shuangkuaisisi_moon_bigtts',
  MULTI_FEMALE_GAOLENGYUJIE = 'multi_female_gaolengyujie_moon_bigtts',
}

// 默认文本常量
export const DEFAULT_TEXTS = {
  CHINESE:
    '呀~ 看你专注的样子，眼睛亮亮的，真的超有魅力呢！这股认真劲儿，一定能收获满满！加油哦，我就悄悄在旁边陪你一起，专注冲鸭！',
  JAPANESE:
    'いやー、集中しているところを見ると、目がキラキラしていて、超魅力的ですよね!この本気さ、きっと手に入ります!頑張って、私はそっとそばであなたに付き添って一緒に、集中してアヒルを沖ます!愛してますよ',
  FALLBACK: '专注模式已启动，加油保持专注！',
} as const;

// 统一的语音选项配置
export const VOICE_OPTIONS: VoiceOption[] = [
  {
    value: VoiceType.ZH_FEMALE_LINJIANVHAI,
    label: '领家女孩',
    defaultText: DEFAULT_TEXTS.CHINESE,
  },
  {
    value: VoiceType.ZH_FEMALE_YUANQINVYOU,
    label: '撒娇学妹',
    defaultText: DEFAULT_TEXTS.CHINESE,
  },
  {
    value: VoiceType.ZH_FEMALE_GAOLENGYUJIE,
    label: '高冷御姐',
    defaultText: DEFAULT_TEXTS.CHINESE,
  },
  {
    value: VoiceType.MULTI_FEMALE_SHUANGKUAISISI,
    label: 'はるこ',
    defaultText: DEFAULT_TEXTS.JAPANESE,
  },
  {
    value: VoiceType.MULTI_FEMALE_GAOLENGYUJIE,
    label: 'あけみ',
    defaultText: DEFAULT_TEXTS.JAPANESE,
  },
  {
    value: VoiceType.ZH_FEMALE_TIANMEIXIAOYUAN,
    label: '甜美小源',
    defaultText: DEFAULT_TEXTS.CHINESE,
  },
  {
    value: VoiceType.ZH_FEMALE_KAILANGJIEJIE,
    label: '开朗姐姐',
    defaultText: DEFAULT_TEXTS.CHINESE,
  },
];

/**
 * 根据语音类型获取默认文本
 */
export function getDefaultTextByVoiceType(voiceType: string): string {
  const voiceOption = VOICE_OPTIONS.find(option => option.value === voiceType);
  return voiceOption?.defaultText || DEFAULT_TEXTS.FALLBACK;
}

/**
 * 检查是否为开始语音文本
 * 目的只是为了缓存，所以只需要检查是否包含开始语音的关键词
 * 有点 hacky，但是目前应该够用了
 */
export function isStartVoiceText(text: string): boolean {
  return (
    text.includes('专注模式已启动') ||
    text.includes('开始专注') ||
    text.includes('加油，保持专注') ||
    text.includes('看你专注的样子') ||
    text.includes('集中しているところを見ると') ||
    text.includes('专注冲鸭') ||
    text.includes('集中してアヒルを沖ます')
  );
}

/**
 * 获取语音选项的标签
 */
export function getVoiceLabelByType(voiceType: string): string {
  const voiceOption = VOICE_OPTIONS.find(option => option.value === voiceType);
  return voiceOption?.label || voiceType;
}
