import { Conversation, Message, PostAnalysisData, Attachment } from '../types';

const createMessage = (content: string, isUser: boolean, timestamp = new Date()): Message => ({
  id: Math.random().toString(36).substr(2, 9),
  content,
  isUser,
  timestamp
});

// 市場平均 ATI（從 /api/market/stats 獲取：29.378）
const AVG_ATI = 29.38;

// 麻古貼文分析結果（已計算，純文字，權重 [1.0, 0.0]）
// 純文字時，novelty 和 diversity 就是 text 的值
const macuAnalysisData: PostAnalysisData = {
  ati: 9.36, // 已計算的 ATI 值
  avgAti: AVG_ATI,
  novelty: 0.905, // 純文字，使用 text novelty
  diversity: 0.924, // 純文字，使用 text diversity
  components: {
    DS_text: 0.915,
    DS_image: 1.0, // 沒有圖片，DS_image = 1.0
    DS_final: 0.915 // 純文字時，DS_final = DS_text
  }
};

// 麻古貼文內容
const macuPostText = `🏀【麻古挺體育｜陽明國小籃球隊 再創佳績！】
榮耀雙收 114年度冠軍 + 亞軍到手 🏆
📢恭喜 #高雄市陽明國小籃球隊
在 114年度國民小學運動會籃球聯賽中
奪得「男生甲一組 冠軍」🏅
📢並於2025全國小學籃球錦標賽
榮獲「全國乙組亞軍」
每場比賽，都是孩子追逐夢想的每一步
他們在球場上奔跑、跳投與吶喊
打出了屬於自己的榮耀一戰！
麻古願一路相挺，持續用行動支持少年體育
成為這群小籃球員的堅強後盾 🏀💪
👀💬 編也偷問大家你最喜歡哪位籃球巨星呢？
#麻古茶坊 #麻古 #MACU
#麻古挺體育 #陽明國小 #陽明國小籃球隊


`;

// 麻古 A/B test 修改後的內容
const macuABTestText = `🏀 汗水是青春的勳章，而麻古是你的主場應援！

恭喜 #高雄市陽明國小籃球隊 狂掃雙獎！拿下國小運「男甲一組冠軍」與全國錦標賽「亞軍」。

為了慶祝這份榮耀，也為了幫正在努力的你補點體力，我們準備了熱血應援價！

🔥 【榮耀回饋｜麻古挺你的熱血】
不管你是剛下課、剛練完球，還是剛加完班，這一口喝下去，靈魂直接歸位。

🥤 應援限時特價： 指定人氣果茶系列，兩杯現折 $20 元（詳情以門市公告為主）

🏃‍♂️ 團練必備： 大宗訂購另有優惠，讓全隊戰力瞬間滿格！

✨ 讓夢想不留白，讓口渴成為過去： 「球場上沒有白跑的路，每一口麻古也都是真功夫。」 現在就用 麻古 x 你訂 快速下單，把這份冠軍級的清爽送到你手上！

👉 立即訂購，挺你的熱血夢

#麻古茶坊 #MACU #麻古挺體育 #陽明國小 #籃球夢 #限時優惠 #你訂 #熱血應援 #這杯我挺你`;

// 麻古 A/B test 修改後的分析結果
const macuABTestAnalysisData: PostAnalysisData = {
  ati: 15.0, // 修改後的 ATI 值
  avgAti: AVG_ATI,
  novelty: 0.5, // 佔位值（需實際計算）
  diversity: 0.5, // 佔位值（需實際計算）
  components: {
    DS_text: 0.5, // 佔位值（需實際計算）
    DS_image: 0.5, // 佔位值（需實際計算）
    DS_final: 0.85 // 根據 ATI = 100 * (1 - DS_final) 計算：DS_final = 1 - 15.0/100
  }
};

// 滿上貼文內容
const manshangPostText = `【中午熱到快融化？來杯愛玉冰茶清涼一下！】

最近天氣真的好熱，冷氣好像都不太夠強。 如果你覺得很渴，可以來喝我們的愛玉系列。

這裡有三款口味： ✨ 桂花青檸愛玉 ｜ $65：味道還不錯，有淡淡花香。 🍍 旺來鳳梨愛玉 ｜ $60：就是鳳梨加愛玉，酸酸甜甜的。 🍋 黑糖青檸愛玉 ｜ $55：古早味的感覺，喝起來很普通。

我們是用阿里山的愛玉，吃起來很新鮮。 現在有優惠活動： 🎁 門市自取第二杯半價 🎁 線上訂餐滿 300 元折 30 元

「只要努力工作，生活就會變好。」

想喝的人可以考慮看看，找回好心情。

#阿里山手採愛玉 #滿上手作愛玉 #清涼冰茶我可以 #中午續命神器 #限時優惠 #第二杯半價`;

// 滿上分析結果（已計算，含圖片，權重 [0.5, 0.5]）
// 綜合 novelty 和 diversity：0.5 × text + 0.5 × image
const manshangAnalysisData: PostAnalysisData = {
  ati: 61.82, // 已計算的 ATI 值（權重 1:1）
  avgAti: AVG_ATI,
  novelty: 0.302, // 綜合 novelty = 0.5 × 0.554 + 0.5 × 0.049
  diversity: 0.868, // 綜合 diversity = 0.5 × 0.875 + 0.5 × 0.861
  components: {
    DS_text: 0.715,
    DS_image: 0.049,
    DS_final: 0.382
  }
};

// CoCo 貼文內容（保留供參考）
const cocoPostText = `#第二杯只要9元😮❗❗
留言裡有一位粉絲許願布丁奶茶~小編都有在看喔✌️
再搭配大家都喜歡的QQ奶茶、粉角檸檬冬瓜
#11月的幸福包在CoCo身上🩷

🎁11月禮包 #都可訂限定優惠
11/1~11/30 天天都能用
QQ奶茶(L)/布丁奶茶(L)/粉角檸檬冬瓜(L)
📢憑券任選兩杯69元🩷
每個人有6張券🩷
活動糖度溫度任選
#LINE官方好友聊天室底部的選單可以領券喔

💡注意事項
1️⃣ #領券用券方式與好友日相同
2️⃣ 11/1~11/30都能領取折價券、使用折價券
3️⃣ 領券後，在確認明細時點選''點我使用折價券''帶入折扣
4️⃣ 限使用「CoCo都可訂」線上點單，優惠不併用
5️⃣ 商場門市/部分門市不適用本活動
#好友日 #都可好友日 #CoCo都可`;

// CoCo 分析結果（已計算，含圖片，權重 [0.3, 0.7]）
// 綜合 novelty 和 diversity：0.3 × text + 0.7 × image
const cocoAnalysisData: PostAnalysisData = {
  ati: 50.04, // 已計算的 ATI 值
  avgAti: AVG_ATI,
  novelty: 0.457, // 綜合 novelty = 0.3 × 0.561 + 0.7 × 0.412
  diversity: 0.879, // 綜合 diversity = 0.3 × 0.847 + 0.7 × 0.892
  components: {
    DS_text: 0.704,
    DS_image: 0.412,
    DS_final: 0.500
  }
};

// 滿上 A/B test 修改後的內容
const manshangABTestText = `☀️ 柏油路都在冒煙？你的靈魂需要這場「森林浴」！
冷氣開到 16 度還是覺得心煩意亂？那是因為你的身體在渴望一場來自阿里山的救援。
別再喝那些甜膩到鎖喉的飲料了，#滿上手作愛玉 直接把海拔一千公尺的涼爽搬進你的杯子裡。我們用的不是工廠果凍，而是職人手搓的 #阿里山手採愛玉，那種滑順到會「溜」過喉嚨的口感，才是正宗的夏日解藥。
🌿 今日份的續命清單，你想選哪種涼？
桂花青檸： 像是走進雨後的桂花林，清香跟酸爽在嘴裡玩躲貓貓。
旺來鳳梨： 秘製熬煮的果肉，酸甜平衡到像是在海邊吹冷氣。
黑糖青檸： 懂喝的都點這杯，黑糖的厚度配上檸檬的尖銳，回甘超有深度。
🛒 別排隊曬太陽，指尖下單最聰明： [滿上 x 你訂 專屬傳送門]
#滿上手作愛玉 #阿里山手採愛玉 #夏日救星 #這口很山林 #中午續命神器 #手搖控`;

// 滿上 A/B test 修改後的分析結果（已計算，含圖片，權重 [0.5, 0.5]）
const manshangABTestAnalysisData: PostAnalysisData = {
  ati: 58.58, // 已計算的 ATI 值（權重 1:1）
  avgAti: AVG_ATI,
  novelty: 0.372, // 綜合 novelty = 0.5 × 0.695 + 0.5 × 0.049
  diversity: 0.862, // 綜合 diversity = 0.5 × 0.863 + 0.5 × 0.861
  components: {
    DS_text: 0.779,
    DS_image: 0.049,
    DS_final: 0.414
  }
};

// 導出麻古的 A/B test 數據，供 App.tsx 使用
export const macuABTestData = {
  modifiedText: macuABTestText,
  modifiedAnalysis: macuABTestAnalysisData,
};

// 導出滿上的 A/B test 數據，供 App.tsx 使用
export const manshangABTestData = {
  modifiedText: manshangABTestText,
  modifiedAnalysis: manshangABTestAnalysisData,
};

// 創建分析結果消息
const createAnalysisMessage = (postText: string, analysisData: PostAnalysisData): Message => {
  const comparisonText = analysisData.ati < analysisData.avgAti 
    ? `低於市場平均` 
    : `高於市場平均`;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    content: `您的貼文 ATI 分數為 ${analysisData.ati.toFixed(2)}，${comparisonText} (市場平均: ${analysisData.avgAti.toFixed(1)})。`,
    isUser: false,
    timestamp: new Date(),
    postAnalysisData: analysisData,
    originalUserContent: postText,
  };
};

export const sampleConversations: Conversation[] = [
  {
    id: '2',
    title: '範例2 - 滿上',
    messages: [
      {
        id: 'msg2',
        content: manshangPostText,
        isUser: true,
        timestamp: new Date(Date.now() - 1800000), // 30 分鐘前
        originalUserContent: manshangPostText,
        attachment: {
          name: '滿上.png',
          url: '/images/滿上.png',
          type: 'image/png',
        },
      },
      createAnalysisMessage(manshangPostText, manshangAnalysisData),
    ],
    lastUpdated: new Date(Date.now() - 1800000),
  },
  {
    id: '1',
    title: '範例1 - 麻古',
    messages: [
      {
        id: 'msg1',
        content: macuPostText,
        isUser: true,
        timestamp: new Date(Date.now() - 3600000), // 1 小時前
        originalUserContent: macuPostText,
        // 麻古沒有圖片，移除 attachment
      },
      createAnalysisMessage(macuPostText, macuAnalysisData),
    ],
    lastUpdated: new Date(Date.now() - 3600000),
  },
];
