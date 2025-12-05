// 品牌名稱中英文對照表
export const brandNameMap: Record<string, string> = {
  // 知名品牌
  'chatime.tw_official': '日出茶太',
  'comebuy_tw': 'COMEBUY',
  'chosen.tea': '初韻',
  'chunshuitang': '春水堂',
  'hechaloutea': '鶴茶樓',
  'missingtea_2015': '思茶',
  'teamagichand00': '茶の魔手',
  'milksha_tw': '迷客夏',
  'machimachi__official': '麥吉',
  'happylemon_tw': '快樂檸檬',
  'mr.wish_tw': 'Mr.Wish',
  'cocotea.tw': '都可茶飲',
  'lagmilktea': 'lagmilktea',
  'itso_tw': '一芳',
  'hanlin.tea': '翰林茶館',
  'daming_tea': '大茗',
  'dejengoolongtea': '得正',
  'dragonhorn.official': '龍角',
  'fullup.tea.shop': '滿上',
  'macu2008tw': '麻古茶坊',
  'mamatea_1211': '紅茶媽媽',
  'mincha_official': '抿茶',
  'morningcall1127': '慕飲客',
  'mr.blacktea': '紅茶老爹',
  'blackteabus': '紅茶巴士',
  'chaffee_tw': 'chaffee',
  'chanungtw': '水巷茶弄',
  'chunfunhow': '春芳號',
  'lepharelife': '樂法',
  'liketeashop': '老賴茶棧',
  'somilk1978': '壽奶茶',
  'naturalfirst2005': '鮮自然',
  'ni_hao1998': '喫茶小舖',
  'peaktea.official': '青山',
  'perfectlife.teashop': '花好月圓',
  'presotea_global': '鮮茶道',
  'redsuntea': '紅太陽國際茶飲',
  'shang_yulin': '上宇林',
  'songbenmilktea': '松本鮮奶茶',
  'tao.tao.tea': '先喝道',
  'tea.melody': '十二韻',
  'teafect.1': '台茶1号',
  'teatop_tw': 'TeaTop第一味',
  'tenrentw': '天仁茗茶',
  'thre_spring': '三分春色',
  'toptiertea.tw': '特好喝',
  'tptea.taiwan': '茶湯會',
  'trizzo_tea': '康青龍',
  'trueboss.tw': '醋頭家',
  'truewin_lucteaday': '初韻',
  'twdrinkstore': '水雲朵',
  'ugtea_official': 'UG Tea',
  'unocha_tw': '烏弄',
  'wanpotea.com.tw': '萬波',
  'welldone2557': '微堂',
  'woocha2019': '金茶伍',
  'wooteatw': '五桐號',
  'wuwin_tw': '無飲現萃茶',
  'yiqingyuen': '一青苑',
  'youintw2021': '有飲',
  'napteazzz': '再睡五分鐘',
  'taro_yuan.official': '清原',
  'zhizuocha': '植作茶',
  'thefarfarfarm': '發發牧場',
  'lagmilktea': 'LAG累擱',
  'y.j_coffee': '玉津咖啡',
  'topup.tw': '序序茶',
};

/**
 * 取得品牌的中文名稱
 * @param brandName 品牌英文名稱或 IG 帳號
 * @returns 品牌中文名稱，如果找不到則返回原名稱
 */
export function getBrandChineseName(brandName: string): string {
  return brandNameMap[brandName] || brandName;
}

/**
 * 格式化品牌名稱顯示（優先顯示中文，如果沒有則顯示原名稱）
 * @param brandName 品牌英文名稱或 IG 帳號
 * @param showOriginal 是否顯示原始名稱（預設為 false，只顯示中文）
 * @returns 格式化後的品牌名稱
 */
export function formatBrandName(brandName: string, showOriginal: boolean = false): string {
  const chineseName = brandNameMap[brandName];
  if (chineseName) {
    return showOriginal ? `${chineseName} (${brandName})` : chineseName;
  }
  return brandName;
}

