import { Conversation, Message, PostAnalysisData, Attachment } from '../types';

const createMessage = (content: string, isUser: boolean, timestamp = new Date()): Message => ({
  id: Math.random().toString(36).substr(2, 9),
  content,
  isUser,
  timestamp
});

// 市場平均 ATI（從 /api/market/stats 獲取：29.378）
const AVG_ATI = 29.38;

// 慕飲客貼文分析結果（已計算，含圖片，權重 [0.2, 0.8]）
// 綜合 novelty 和 diversity：0.2 × text + 0.8 × image
const muyinkeAnalysisData: PostAnalysisData = {
  ati: 72.01,
  avgAti: AVG_ATI,
  novelty: 0.229, // 綜合 novelty = 0.2 × 0.410 + 0.8 × 0.184
  diversity: 0.875, // 綜合 diversity = 0.2 × 0.916 + 0.8 × 0.865
  components: {
    DS_text: 0.663,
    DS_image: 0.184,
    DS_final: 0.280
  }
};

// 慕飲客貼文內容
const muyinkePostText = `再努力一下
為了你想見的人
想做的事
以及想成為的自己
有時候前路會顯得有點漫長
甚至有些孤單
但請相信
每一次的堅持都在慢慢靠近理想的模樣
就像一杯奶霜紅茶——
茶的清香需要時間去浸潤
奶霜的綿密則是慢慢堆疊出來的柔和
當它們交融時
才有了細膩溫潤的口感
人生不也如此嗎
酸甜苦澀交織
才成為獨一無二的風味
願你在追逐夢想的途中
也能給自己一點溫柔的犒賞——
一杯陪伴的飲品
一段靜下來的時光
慕飲客 奶霜紅茶
陪你走穩每一步
再努力一下就能更靠近想要的
#慕飲客 #奶霜紅茶
#再努力一下
📍 慕飲客｜宜蘭地區據點
讓溫暖日常從一杯好飲品開始
#羅東總店（成功國小對面）
📞 03-9573688
🏠 宜蘭縣羅東鎮興東南路131號
🕙 10:00～19:00（每週日公休）
▸ 冬山中華店（冬山火車站對面）
📞 03-9590686
🏠 宜蘭縣冬山鄉中華路23號
🕙 10:00～20:00
▸ 南澳蘇花店（南澳郵局旁）
📞 03-9981198
🏠 宜蘭縣南澳鄉蘇花路二段335號
🕙 10:00～20:00
想開一間屬於自己的溫度飲品店？
✏️ 立即填表了解加盟資訊：
🔗 https://forms.gle/Dg73b1zv2uNib2ePA
📲 加盟專線：0911-594969
#慕飲一杯 #客細品一味時光
#飲料 #手搖飲料 
#羅東景點 #羅東美食 
#羅東必喝 #羅東飲料`;

// 清原貼文內容
const qingyuanPostText = `一口Q角，不只是甜品 —
是阿嬤放在碗裡的牽掛👵
💭小時候，夏日午後她輕聲喚我進屋，
冬日黃昏她默默在灶前添柴——
一碗碗甜湯，藏著她不動聲色的牽掛與細心❣️
⭐️【#Q角綠豆飲】
一口沁涼，像午後微風滑過喉間，暑意瞬間散去。這碗，是記憶裡最安心的消暑聖品，也是夏天限定的人情味。
⭐️【#Q角紅豆飲】
像盛夏午後，她輕聲叮嚀：「來，喝碗冰冰的，涼快又舒服。」這碗，是夏天專屬的清甜，也是阿嬤最懂你的消暑方。
◖門市查詢 | https://www.taroyuan.com/branch/
◖加入LINE | https://lin.ee/4HJnLbe
◖更多新品資訊 | https://linktr.ee/TaroYuan.official
#清原 #Q角紅豆飲 #Q角綠豆飲
#阿嬤慢火系列 #喝甜湯也能手搖化
#Q角控請報到 #夏日人氣王 #清原推薦`;

// 清原分析結果（已計算，含圖片，權重 [0.2, 0.8]）
// 綜合 novelty 和 diversity：0.2 × text + 0.8 × image
const qingyuanAnalysisData: PostAnalysisData = {
  ati: 30.24,
  avgAti: AVG_ATI,
  novelty: 0.664, // 綜合 novelty = 0.2 × 0.514 + 0.8 × 0.701 = 0.664
  diversity: 0.899, // 綜合 diversity = 0.2 × 0.856 + 0.8 × 0.910 = 0.899
  components: {
    DS_text: 0.685,
    DS_image: 0.701,
    DS_final: 0.698
  }
};

// 創建分析結果消息
const createAnalysisMessage = (postText: string, analysisData: PostAnalysisData): Message => {
  const comparisonText = analysisData.ati < analysisData.avgAti 
    ? `低於市場平均` 
    : `高於市場平均`;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    content: `您的貼文 ATI 分數為 ${analysisData.ati.toFixed(2)}，${comparisonText} (市場平均: ${analysisData.avgAti.toFixed(1)})。\n\n內容雷同性指數 (ATI) 分析完成。`,
    isUser: false,
    timestamp: new Date(),
    postAnalysisData: analysisData,
    originalUserContent: postText,
  };
};

export const sampleConversations: Conversation[] = [
  {
    id: '2',
    title: '檢測範例2 - 清原',
    messages: [
      {
        id: 'msg2',
        content: qingyuanPostText,
        isUser: true,
        timestamp: new Date(Date.now() - 1800000), // 30 分鐘前
        originalUserContent: qingyuanPostText,
        attachment: {
          name: 'qingyuan.jpg',
          url: '/images/qingyuan.jpg',
          type: 'image/jpeg',
        },
      },
      createAnalysisMessage(qingyuanPostText, qingyuanAnalysisData),
    ],
    lastUpdated: new Date(Date.now() - 1800000),
  },
  {
    id: '1',
    title: '檢測範例1 - 慕飲客',
    messages: [
      {
        id: 'msg1',
        content: muyinkePostText,
        isUser: true,
        timestamp: new Date(Date.now() - 3600000), // 1 小時前
        originalUserContent: muyinkePostText,
        attachment: {
          name: 'muyinke.jpg',
          url: '/images/muyinke.jpg',
          type: 'image/jpeg',
        },
      },
      createAnalysisMessage(muyinkePostText, muyinkeAnalysisData),
    ],
    lastUpdated: new Date(Date.now() - 3600000),
  },
];
