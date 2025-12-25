#!/usr/bin/env python3
"""
分析 ATI 模型效果
"""
import pandas as pd
import numpy as np
from scipy.stats import spearmanr, pearsonr
import os

# 讀取資料
base_dir = os.path.join(os.path.dirname(__file__), '..')
test_df = pd.read_csv(os.path.join(base_dir, 'data', 'test', 'ati_test_per_post_results.csv'))
train_df = pd.read_csv(os.path.join(base_dir, 'data', 'train', 'ati_train_per_post_results.csv'))
brand_df = pd.read_csv(os.path.join(base_dir, 'data', 'processed', 'ati_test_brand_agg.csv'))

print('=' * 70)
print('📊 ATI 模型效果評估報告')
print('=' * 70)

# 1. 基本統計
print('\n【1. 資料基本統計】')
print(f'訓練集樣本數: {len(train_df):,}')
print(f'測試集樣本數: {len(test_df):,}')
print(f'品牌數: {len(brand_df)}')
print(f'\n測試集 y 值統計:')
print(f'  範圍: [{test_df["y"].min():.6f}, {test_df["y"].max():.6f}]')
print(f'  平均: {test_df["y"].mean():.6f}')
print(f'  中位數: {test_df["y"].median():.6f}')
print(f'  標準差: {test_df["y"].std():.6f}')
print(f'\n測試集 ATI_final 統計:')
print(f'  範圍: [{test_df["ATI_final"].min():.2f}, {test_df["ATI_final"].max():.2f}]')
print(f'  平均: {test_df["ATI_final"].mean():.2f}')
print(f'  中位數: {test_df["ATI_final"].median():.2f}')
print(f'  標準差: {test_df["ATI_final"].std():.2f}')

# 2. 相關性分析
print('\n【2. 相關性分析（測試集）】')
print('-' * 70)
metrics = [
    ('text_DS', 'Text 模態 DS'),
    ('image_DS', 'Image 模態 DS'),
    ('meta_DS', 'Meta 模態 DS'),
    ('DS_final', '最終 DS'),
    ('ATI_final', '最終 ATI')
]

results = []
for metric, name in metrics:
    if metric in test_df.columns:
        # 移除缺失值
        mask = test_df[metric].notna() & test_df['y'].notna()
        if mask.sum() > 10:
            r_spearman, p_spearman = spearmanr(test_df.loc[mask, metric], test_df.loc[mask, 'y'])
            r_pearson, p_pearson = pearsonr(test_df.loc[mask, metric], test_df.loc[mask, 'y'])
            
            sig = '***' if p_spearman < 0.001 else '**' if p_spearman < 0.01 else '*' if p_spearman < 0.05 else ''
            results.append({
                'metric': name,
                'spearman_r': r_spearman,
                'spearman_p': p_spearman,
                'pearson_r': r_pearson,
                'pearson_p': p_pearson,
                'sig': sig
            })
            
            print(f'{name:20s}: Spearman r={r_spearman:7.4f} (p={p_spearman:.4f}){sig:3s} | Pearson r={r_pearson:7.4f} (p={p_pearson:.4f})')

# 3. 分位數分析
print('\n【3. 分位數分析（測試集）- ATI_final 與 y 的關係】')
print('-' * 70)
test_df_clean = test_df.dropna(subset=['ATI_final', 'y']).copy()
if len(test_df_clean) > 0:
    try:
        test_df_clean['decile'] = pd.qcut(test_df_clean['ATI_final'], 10, labels=False, duplicates='drop')
        decile_stats = test_df_clean.groupby('decile').agg({
            'y': ['count', 'mean', 'median', 'std'],
            'ATI_final': 'mean'
        }).round(4)
        decile_stats.columns = ['樣本數', 'y_平均', 'y_中位數', 'y_標準差', 'ATI_平均']
        print(decile_stats.to_string())
        
        # 檢查單調性
        y_means = decile_stats['y_平均'].values
        if len(y_means) >= 3:
            # 計算趨勢
            increasing = sum(y_means[i] < y_means[i+1] for i in range(len(y_means)-1))
            decreasing = sum(y_means[i] > y_means[i+1] for i in range(len(y_means)-1))
            print(f'\n趨勢分析: {increasing} 個區間遞增, {decreasing} 個區間遞減')
    except Exception as e:
        print(f'分位數分析失敗: {e}')

# 4. 品牌層級分析
print('\n【4. 品牌層級相關性】')
print('-' * 70)
if 'y_mean' in brand_df.columns and 'ATI_final_mean' in brand_df.columns:
    mask = brand_df['ATI_final_mean'].notna() & brand_df['y_mean'].notna()
    if mask.sum() > 3:
        r_brand, p_brand = spearmanr(brand_df.loc[mask, 'ATI_final_mean'], brand_df.loc[mask, 'y_mean'])
        r_brand_p, p_brand_p = pearsonr(brand_df.loc[mask, 'ATI_final_mean'], brand_df.loc[mask, 'y_mean'])
        sig = '***' if p_brand < 0.001 else '**' if p_brand < 0.01 else '*' if p_brand < 0.05 else ''
        print(f'品牌平均 ATI vs 品牌平均 y:')
        print(f'  Spearman r={r_brand:.4f} (p={p_brand:.4f}){sig}')
        print(f'  Pearson r={r_brand_p:.4f} (p={p_brand_p:.4f})')
        
        print(f'\n品牌層級統計:')
        print(f'  品牌數: {len(brand_df)}')
        print(f'  品牌平均 y 範圍: [{brand_df["y_mean"].min():.4f}, {brand_df["y_mean"].max():.4f}]')
        print(f'  品牌平均 ATI 範圍: [{brand_df["ATI_final_mean"].min():.2f}, {brand_df["ATI_final_mean"].max():.2f}]')

# 5. 各模態分數分佈
print('\n【5. 各模態分數分佈（測試集）】')
print('-' * 70)
for mod in ['text', 'image', 'meta']:
    ds_col = f'{mod}_DS'
    ati_col = f'{mod}_ATI'
    if ds_col in test_df.columns:
        print(f'\n{mod.upper()} 模態:')
        print(f'  DS:  平均={test_df[ds_col].mean():.4f}, 標準差={test_df[ds_col].std():.4f}, 範圍=[{test_df[ds_col].min():.4f}, {test_df[ds_col].max():.4f}]')
        print(f'  ATI: 平均={test_df[ati_col].mean():.2f}, 標準差={test_df[ati_col].std():.2f}, 範圍=[{test_df[ati_col].min():.2f}, {test_df[ati_col].max():.2f}]')

# 6. 極值案例
print('\n【6. 極值案例（測試集）】')
print('-' * 70)
print('最高 y 值的前 5 篇貼文（高互動率）:')
top_y = test_df.nlargest(5, 'y')[['brand', 'y', 'ATI_final', 'DS_final', 'count_like', 'count_comment', 'followers']]
for idx, row in top_y.iterrows():
    print(f"  {row['brand']:25s} | y={row['y']:8.4f} | ATI={row['ATI_final']:6.2f} | 按讚={row['count_like']:5.0f} | 留言={row['count_comment']:3.0f} | 追蹤者={row['followers']:8.0f}")

print('\n最低 ATI（最新穎）的前 5 篇貼文:')
low_ati = test_df.nsmallest(5, 'ATI_final')[['brand', 'y', 'ATI_final', 'DS_final', 'count_like', 'count_comment']]
for idx, row in low_ati.iterrows():
    print(f"  {row['brand']:25s} | y={row['y']:8.4f} | ATI={row['ATI_final']:6.2f} | DS={row['DS_final']:.4f} | 按讚={row['count_like']:5.0f}")

print('\n最高 ATI（最不新穎）的前 5 篇貼文:')
high_ati = test_df.nlargest(5, 'ATI_final')[['brand', 'y', 'ATI_final', 'DS_final', 'count_like', 'count_comment']]
for idx, row in high_ati.iterrows():
    print(f"  {row['brand']:25s} | y={row['y']:8.4f} | ATI={row['ATI_final']:6.2f} | DS={row['DS_final']:.4f} | 按讚={row['count_like']:5.0f}")

# 7. 訓練集 vs 測試集比較
print('\n【7. 訓練集 vs 測試集比較】')
print('-' * 70)
if 'y' in train_df.columns and 'ATI_final' in train_df.columns:
    train_mask = train_df['ATI_final'].notna() & train_df['y'].notna()
    test_mask = test_df['ATI_final'].notna() & test_df['y'].notna()
    
    if train_mask.sum() > 10 and test_mask.sum() > 10:
        r_train, p_train = spearmanr(train_df.loc[train_mask, 'ATI_final'], train_df.loc[train_mask, 'y'])
        r_test, p_test = spearmanr(test_df.loc[test_mask, 'ATI_final'], test_df.loc[test_mask, 'y'])
        
        print(f'訓練集: Spearman r={r_train:.4f} (p={p_train:.4f})')
        print(f'測試集: Spearman r={r_test:.4f} (p={p_test:.4f})')
        print(f'差異: {abs(r_test - r_train):.4f}')

# 8. 總結評估
print('\n' + '=' * 70)
print('【總結評估】')
print('=' * 70)

# 找出最佳相關性
if results:
    best = max(results, key=lambda x: abs(x['spearman_r']))
    print(f'✅ 最佳相關性: {best["metric"]} (Spearman r={best["spearman_r"]:.4f})')
    
    # 評估效果
    final_ati_result = next((r for r in results if '最終 ATI' in r['metric']), None)
    if final_ati_result:
        r_final = abs(final_ati_result['spearman_r'])
        p_final = final_ati_result['spearman_p']
        
        if r_final < 0.1:
            assessment = "❌ 效果不佳：相關性極弱"
        elif r_final < 0.3:
            assessment = "⚠️  效果有限：相關性弱"
        elif r_final < 0.5:
            assessment = "⚠️  效果中等：相關性中等"
        elif r_final < 0.7:
            assessment = "✅ 效果良好：相關性較強"
        else:
            assessment = "✅ 效果優秀：相關性強"
        
        print(f'\n📈 最終 ATI 模型評估:')
        print(f'   相關性強度: {r_final:.4f} (p={p_final:.4f})')
        print(f'   評估結果: {assessment}')
        
        if p_final >= 0.05:
            print(f'   ⚠️  注意：p 值 >= 0.05，統計上不顯著')
        else:
            print(f'   ✓ 統計顯著性：p < 0.05')

print('\n' + '=' * 70)

