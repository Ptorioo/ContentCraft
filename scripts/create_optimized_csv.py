#!/usr/bin/env python3
"""
創建優化版的 CSV 文件，只保留必要的欄位以加快服務器啟動速度
"""
import csv
import sys
import os

# 需要保留的欄位
REQUIRED_FIELDS = [
    'brand',
    'count_like',
    'count_comment',
    'followers',
    'y',
    'text_nov', 'text_div', 'text_DS', 'text_ATI',
    'image_nov', 'image_div', 'image_DS', 'image_ATI',
    'meta_nov', 'meta_div', 'meta_DS', 'meta_ATI',
    'ATI_final',
    'DS_final',
    'caption',
    'ftime_parsed',
]

def create_optimized_csv(input_file: str, output_file: str):
    """創建優化版的 CSV"""
    if not os.path.exists(input_file):
        print(f"錯誤: 輸入文件不存在: {input_file}")
        return False
    
    print(f"讀取: {input_file}")
    print(f"輸出: {output_file}")
    
    with open(input_file, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        
        # 檢查所有需要的欄位是否存在
        available_fields = reader.fieldnames
        missing_fields = [f for f in REQUIRED_FIELDS if f not in available_fields]
        if missing_fields:
            print(f"警告: 缺少欄位: {missing_fields}")
        
        # 只保留需要的欄位
        fields_to_keep = [f for f in REQUIRED_FIELDS if f in available_fields]
        
        # 寫入優化版 CSV
        with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=fields_to_keep)
            writer.writeheader()
            
            row_count = 0
            for row in reader:
                # 只保留需要的欄位
                optimized_row = {field: row.get(field, '') for field in fields_to_keep}
                writer.writerow(optimized_row)
                row_count += 1
                
                if row_count % 100 == 0:
                    print(f"  處理了 {row_count} 行...", end='\r')
            
            print(f"\n完成: 處理了 {row_count} 行")
    
    # 比較文件大小
    original_size = os.path.getsize(input_file)
    optimized_size = os.path.getsize(output_file)
    reduction = (1 - optimized_size / original_size) * 100
    
    print(f"\n文件大小:")
    print(f"  原始: {original_size / 1024:.1f} KB")
    print(f"  優化: {optimized_size / 1024:.1f} KB")
    print(f"  減少: {reduction:.1f}%")
    
    return True

if __name__ == '__main__':
    # 設定路徑
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    files_to_optimize = [
        ('src/model/outputs/ati_test_per_post.csv', 'src/model/outputs/ati_test_per_post_optimized.csv'),
        ('src/model/outputs/ati_train_per_post.csv', 'src/model/outputs/ati_train_per_post_optimized.csv'),
    ]
    
    print("=" * 60)
    print("創建優化版 CSV 文件")
    print("=" * 60)
    
    for input_file, output_file in files_to_optimize:
        input_path = os.path.join(base_dir, input_file)
        output_path = os.path.join(base_dir, output_file)
        
        if os.path.exists(input_path):
            print(f"\n處理: {input_file}")
            print("-" * 60)
            create_optimized_csv(input_path, output_path)
        else:
            print(f"\n跳過: {input_file} (文件不存在)")
    
    print("\n" + "=" * 60)
    print("完成！")
    print("=" * 60)

