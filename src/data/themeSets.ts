import type { ThemeSet } from '../types';

export const THEME_SETS: ThemeSet[] = [
  {
    id: 'set-vocalists',
    title: '十二大樂團主唱殿堂',
    subtitle: 'All 12 Bands Vocalists',
    description: '集齊 BanG Dream! 十二大樂團的靈魂主唱（含一家Dumb Rock! 雙主唱），聆聽跨越世代的星之歌聲。',
    accentColor: '#facc15',
    cardIds: [
      'bd-ur-005', // 戶山香澄
      'bd-sr-001', // 美竹蘭
      'bd-sr-002', // 丸山彩
      'bd-ur-006', // 湊友希那
      'bd-sr-003', // 弦卷心
      'bd-sr-004', // 倉田真白
      'bd-sr-005', // LAYER
      'bd-ur-007', // 高松燈
      'bd-ssr-010', // 三角初華
      'bd-ym-ur-002', // 仲町阿拉蕾
      'bd-ms-ur-002', // 汐見螢
      'bd-ik-ur-002', // 須賀蕾葉
      'bd-ik-ssr-001', // 馬橋心玖
    ],
  },
  {
    id: 'set-crychic',
    title: '命運的分歧點：CRYCHIC 與春日影',
    subtitle: 'The Fateful Haruhikage',
    description: '重溫那場僅此一次卻牽動十人命運的傳說演出與邦學聖經。',
    accentColor: '#38bdf8',
    cardIds: [
      'bd-ur-010', // CRYCHIC
      'bd-lr-002', // 春日影
      'bd-lr-003', // 為什麼要演奏春日影！？
      'bd-ur-007', // 高松燈
      'bd-ssr-007', // 長崎爽世
      'bd-ssr-008', // 椎名立希
      'bd-ssr-011', // 若葉睦
      'bd-ur-008', // 豐川祥子
    ],
  },
  {
    id: 'set-popipa',
    title: "Poppin'Party 全員集合",
    subtitle: 'Star Beat Five',
    description: '閃閃發光、心動不已！收集花咲川元祖五人與她們的起點之歌。',
    accentColor: '#ff3b72',
    cardIds: [
      'bd-ur-001',
      'bd-ur-005',
      'bd-sr-007',
      'bd-sr-008',
      'bd-sr-009',
      'bd-sr-010',
      'bd-lr-004',
    ],
  },
  {
    id: 'set-roselia',
    title: 'Roselia 頂點への誓い',
    subtitle: 'Pledge to the Summit',
    description: '獻上一切覺悟，集齊蒼藍薔薇五位成員與兩首傳奇名曲。',
    accentColor: '#6366f1',
    cardIds: [
      'bd-ur-002',
      'bd-ur-006',
      'bd-sr-011',
      'bd-sr-012',
      'bd-sr-013',
      'bd-sr-014',
      'bd-ssr-012',
      'bd-ur-009',
    ],
  },
  {
    id: 'set-mygo',
    title: '迷子也要前進！MyGO!!!!!',
    subtitle: 'Lost Together Forever',
    description: '一輩子一起組樂團！收集 MyGO!!!!! 全員與代表曲目。',
    accentColor: '#3388bb',
    cardIds: [
      'bd-ur-003',
      'bd-ur-007',
      'bd-ssr-006',
      'bd-ssr-009',
      'bd-ssr-007',
      'bd-ssr-008',
      'bd-ssr-013',
      'bd-ssr-014',
    ],
  },
  {
    id: 'set-avemujica',
    title: '歡迎來到 Ave Mujica 的世界',
    subtitle: 'Masquerade of Five Dolls',
    description: '戴上假面，集齊五位人偶少女與她們的狂想序曲。',
    accentColor: '#d946ef',
    cardIds: [
      'bd-ur-004',
      'bd-ssr-010',
      'bd-ssr-011',
      'bd-sr-015',
      'bd-sr-016',
      'bd-ur-008',
      'bd-ssr-015',
    ],
  },
  {
    id: 'set-yumemita',
    title: '夢限大MewType：跨越夢與現實',
    subtitle: 'Yumemita 3rd Anniversary (∞)',
    description: '慶祝出道三週年！集齊第十支樂團五位命運共同體成員、出道曲與三週年紀念。',
    accentColor: '#ff4fd8',
    cardIds: [
      'bd-ym-ur-001',
      'bd-ym-ur-002',
      'bd-ym-ssr-001',
      'bd-ym-ssr-002',
      'bd-ym-ssr-003',
      'bd-ym-ssr-004',
      'bd-ym-ssr-005',
      'bd-ym-sr-005',
    ],
  },
  {
    id: 'set-yumemita-anime',
    title: '《BanG Dream! ゆめ∞みた》名場面巡禮',
    subtitle: 'Keep Fighting Even If The Music Stops',
    description: '重溫 2026 年夏季動畫從「ピャーーーーっ！！！」到第 7 話胃痛衝突、秋葉原暴走與最終回神演出的完整軌跡。',
    accentColor: '#7dd3fc',
    cardIds: [
      'bd-ym-lr-001',
      'bd-ym-ur-003',
      'bd-ym-ssr-006',
      'bd-ym-r-001',
      'bd-ym-sr-001',
      'bd-ym-sr-002',
      'bd-ym-uc-001',
      'bd-ym-ur-004',
    ],
  },
  {
    id: 'set-millsage',
    title: 'millsage：滿載雙手的幸福',
    subtitle: 'A Handful of Happiness',
    description: '集齊《BanG Dream! Our Notes》登場的 millsage 五位成員、團卡與出道曲《起死開戦》。',
    accentColor: '#aa22ee',
    cardIds: [
      'bd-ms-ur-001',
      'bd-ms-ur-002',
      'bd-ms-ssr-001',
      'bd-ms-ssr-002',
      'bd-ms-sr-001',
      'bd-ms-sr-002',
      'bd-ms-ssr-003',
    ],
  },
  {
    id: 'set-ikka',
    title: '一家Dumb Rock!：爆音一家團欒',
    subtitle: 'Funk & Groovy Family',
    description: '集齊邦邦首支雙主唱放克搖滾樂團全員、團卡、宿舍「P-Stay」與出道曲《Homie\'s Tie!!》。',
    accentColor: '#ffaa33',
    cardIds: [
      'bd-ik-ur-001',
      'bd-ik-ur-002',
      'bd-ik-ssr-001',
      'bd-ik-sr-001',
      'bd-ik-sr-002',
      'bd-ik-ssr-002',
      'bd-ik-ssr-003',
      'bd-ik-uc-001',
    ],
  },
  {
    id: 'set-bands',
    title: '十二大樂團全制霸',
    subtitle: 'Twelve Bands Grand Slam',
    description: '將 BanG Dream! 跨世代的十二支主力樂團團卡全數收入囊中。',
    accentColor: '#f43f5e',
    cardIds: [
      'bd-ur-001',
      'bd-ssr-001',
      'bd-ssr-002',
      'bd-ur-002',
      'bd-ssr-003',
      'bd-ssr-004',
      'bd-ssr-005',
      'bd-ur-003',
      'bd-ur-004',
      'bd-ym-ur-001',
      'bd-ms-ur-001',
      'bd-ik-ur-001',
    ],
  },
  {
    id: 'set-holy-grounds',
    title: '邦邦聖地巡禮與名產',
    subtitle: 'Venues, Schools & Treats',
    description: '走訪 Live House、名門學園與讓角色們念念不忘的傳說美食。',
    accentColor: '#34d399',
    cardIds: [
      'bd-sr-019',
      'bd-sr-020',
      'bd-r-020',
      'bd-uc-005',
      'bd-uc-006',
      'bd-uc-007',
      'bd-uc-010',
      'bd-uc-011',
      'bd-uc-013',
      'bd-uc-012',
    ],
  },
];
