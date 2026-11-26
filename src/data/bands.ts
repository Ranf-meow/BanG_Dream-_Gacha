import type { BandId } from '../types';

export interface BandMeta {
  id: BandId;
  name: string;
  shortName: string;
  color: string;
  secondaryColor: string;
  motif: string;
  iconUrl?: string;
}

export const publicAsset = (relativePath: string): string =>
  encodeURI('./' + relativePath);

export const BAND_META: Record<BandId, BandMeta> = {
  popipa: {
    id: 'popipa',
    name: "Poppin'Party",
    shortName: 'PoPiPa',
    color: '#ff3b72',
    secondaryColor: '#ff90b3',
    motif: '★',
    iconUrl: publicAsset("Poppin'Party/Poppin'Party_icon.png"),
  },
  afterglow: {
    id: 'afterglow',
    name: 'Afterglow',
    shortName: 'Afterglow',
    color: '#e53344',
    secondaryColor: '#ff7a59',
    motif: '✦',
    iconUrl: publicAsset('Afterglow/Afterglow_icon.png'),
  },
  pasupare: {
    id: 'pasupare',
    name: 'Pastel*Palettes',
    shortName: 'PasuPare',
    color: '#3dd1a5',
    secondaryColor: '#a7f3d0',
    motif: '✿',
    iconUrl: publicAsset('PastelPalettes/PastelPalettes_icon.png'),
  },
  roselia: {
    id: 'roselia',
    name: 'Roselia',
    shortName: 'Roselia',
    color: '#4c5ce6',
    secondaryColor: '#a5b4fc',
    motif: '❀',
    iconUrl: publicAsset('Roselia/Roselia_icon.png'),
  },
  hhw: {
    id: 'hhw',
    name: 'Hello, Happy World!',
    shortName: 'HHW',
    color: '#ffb703',
    secondaryColor: '#fde68a',
    motif: '☀',
    iconUrl: publicAsset('Hello, Happy World!/Hello, Happy World!_icon.png'),
  },
  morfonica: {
    id: 'morfonica',
    name: 'Morfonica',
    shortName: 'Morfonica',
    color: '#38a3f1',
    secondaryColor: '#bae6fd',
    motif: '❖',
    iconUrl: publicAsset('Morfonica/Morfonica_icon.png'),
  },
  ras: {
    id: 'ras',
    name: 'RAISE A SUILEN',
    shortName: 'RAS',
    color: '#2dd4bf',
    secondaryColor: '#99f6e4',
    motif: '⚡',
    iconUrl: publicAsset('RAISE A SUILEN/RAISE A SUILEN_icon.png'),
  },
  mygo: {
    id: 'mygo',
    name: 'MyGO!!!!!',
    shortName: 'MyGO!!!!!',
    color: '#3388bb',
    secondaryColor: '#7dd3fc',
    motif: '◈',
    iconUrl: publicAsset('MyGO!!!!!/MyGO!!!!!_icon.png'),
  },
  avemujica: {
    id: 'avemujica',
    name: 'Ave Mujica',
    shortName: 'Ave Mujica',
    color: '#8b2252',
    secondaryColor: '#e879f9',
    motif: '☾',
    iconUrl: publicAsset('Ave Mujica/Ave Mujica_icon.png'),
  },
  yumemita: {
    id: 'yumemita',
    name: '夢限大MewType',
    shortName: 'ゆめみた',
    color: '#ff4fd8',
    secondaryColor: '#7dd3fc',
    motif: '∞',
    iconUrl: publicAsset('MewType/MewType_icon.png'),
  },
  millsage: {
    id: 'millsage',
    name: 'millsage',
    shortName: 'millsage',
    color: '#aa22ee',
    secondaryColor: '#e9d5ff',
    motif: '✧',
    iconUrl: publicAsset('millsage/millsage_icon.png'),
  },
  ikka: {
    id: 'ikka',
    name: '一家Dumb Rock!',
    shortName: '一家Dumb Rock!',
    color: '#ffaa33',
    secondaryColor: '#fde68a',
    motif: '❖',
    iconUrl: publicAsset('一家Dumb Rock!/一家Dumb Rock!_icon.jpg'),
  },
  general: {
    id: 'general',
    name: '綜合／共通',
    shortName: 'BanG Dream!',
    color: '#facc15',
    secondaryColor: '#f472b6',
    motif: '♪',
  },
};

export const BAND_LIST: BandMeta[] = Object.values(BAND_META);
