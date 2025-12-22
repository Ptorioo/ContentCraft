#!/usr/bin/env python3
"""
驗證 ATI 計算邏輯的腳本
比較修改前後的計算方式
"""
import json
import numpy as np
from pathlib import Path

# 讀取配置
config_path = Path("src/model/outputs/ati_artifacts/config.json")
with open(config_path, 'r') as f:
    cfg = json.load(f)

print("=" * 60)
print("ATI 計算邏輯驗證")
print("=" * 60)
print()

# 1. 分析配置檔案
print("1. 配置檔案分析")
print("-" * 60)
phase2_v = np.array(cfg['phase2_v'], dtype=np.float32)
print(f"原始 phase2_v: {phase2_v.tolist()}")
print(f"  - text 權重: {phase2_v[0]:.3f}")
print(f"  - image 權重: {phase2_v[1]:.3f}")
print(f"  - meta 權重: {phase2_v[2]:.3f}")
print()

# 2. 原本的計算邏輯
print("2. 原本的計算邏輯（有 metadata）")
print("-" * 60)
print("DS_final = {:.3f}*DS_text + {:.3f}*DS_image + {:.3f}*DS_meta".format(
    phase2_v[0], phase2_v[1], phase2_v[2]))
print()
print("重要發現：")
print(f"  - 原本的模型**只使用圖片模態**（image 權重 = {phase2_v[1]:.3f}）")
print(f"  - 文字和 metadata 的權重都是 0.0")
print()

# 3. 沒有圖片時的特殊情況
print("3. 沒有圖片時的特殊情況")
print("-" * 60)
print("原本的行為：")
print("  - 如果沒有圖片，image_vec 是零向量")
print("  - compute_DS_for_modality 會將零向量計算為 DS_image = 1.0")
print("  - DS_final = 0.0*DS_text + 1.0*DS_image + 0.0*DS_meta = 1.0")
print("  - ATI = 100 * (1 - 1.0) = 0.0")
print()
print("修改後的行為：")
print("  - 如果沒有圖片，使用文字模態（權重 1.0）")
print("  - DS_final = 1.0*DS_text + 0.0*DS_image = DS_text")
print("  - ATI = 100 * (1 - DS_text)")
print("  - 如果 DS_text = 0.5，則 ATI = 50.0")
print()

# 4. 範例計算比較
print("4. 範例計算比較")
print("-" * 60)
scenarios = [
    ("有圖片，DS_text=0.5, DS_image=0.9", True, 0.5, 0.9, 0.4),
    ("無圖片，DS_text=0.5", False, 0.5, None, None),
    ("有圖片，DS_text=0.3, DS_image=0.7", True, 0.3, 0.7, 0.4),
    ("無圖片，DS_text=0.7", False, 0.7, None, None),
]

for scenario, has_image, ds_text, ds_image, ds_meta in scenarios:
    print(f"\n情境：{scenario}")
    
    # 原本的計算（假設有 metadata）
    if has_image:
        ds_final_original = phase2_v[0]*ds_text + phase2_v[1]*ds_image + phase2_v[2]*ds_meta
    else:
        # 沒有圖片時，image 是零向量，DS_image = 1.0
        ds_final_original = phase2_v[0]*ds_text + phase2_v[1]*1.0 + phase2_v[2]*(ds_meta if ds_meta else 0.0)
    ati_original = 100 * (1 - ds_final_original)
    
    # 新的計算
    if has_image:
        v_new = np.array([phase2_v[0], phase2_v[1]], dtype=np.float32)
        if v_new.sum() > 1e-9:
            v_new = v_new / v_new.sum()
        else:
            v_new = np.array([0.5, 0.5])
        ds_final_new = v_new[0]*ds_text + v_new[1]*ds_image
    else:
        v_new = np.array([1.0, 0.0], dtype=np.float32)
        ds_final_new = v_new[0]*ds_text + v_new[1]*0.0  # DS_image 不再計算
    ati_new = 100 * (1 - ds_final_new)
    
    diff = ati_new - ati_original
    
    print(f"  原本 ATI: {ati_original:.2f}")
    print(f"  新的 ATI: {ati_new:.2f}")
    print(f"  差異: {diff:+.2f} ({'上升' if diff > 0 else '下降' if diff < 0 else '相同'})")

print()
print("=" * 60)
print("結論與建議")
print("=" * 60)
print()
print("問題根源：")
print("  1. 原本的模型配置只使用圖片模態（phase2_v = [0.0, 1.0, 0.0]）")
print("  2. 沒有圖片時，原本的邏輯會導致 ATI = 0.0（因為 DS_image = 1.0）")
print("  3. 修改後的邏輯在沒有圖片時使用文字模態，導致 ATI 大幅上升")
print()
print("建議：")
print("  1. 確認是否真的需要移除 metadata")
print("  2. 如果移除 metadata，需要重新訓練模型以調整權重")
print("  3. 或者保持原來的邏輯：沒有圖片時仍然使用圖片模態（DS_image = 1.0）")
print("  4. 或者修改沒有圖片時的處理方式，使其與原本邏輯一致")
print()

