from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import fmean
from typing import Dict, List, Tuple

ROOT_DIR = Path(__file__).resolve().parents[1]
RESULTS_DIR = ROOT_DIR / "結果"
PER_POST_PATH_TEST = RESULTS_DIR / "ati_test_per_post.csv"
PER_POST_PATH_TRAIN = RESULTS_DIR / "ati_train_per_post.csv"
BRAND_AGG_PATH = RESULTS_DIR / "ati_test_brand_agg.csv"
OUTPUT_DIR = ROOT_DIR / "src" / "data" / "generated"
SUMMARY_PATH = OUTPUT_DIR / "summary.json"
SCATTER_PATH = OUTPUT_DIR / "novelty_diversity_scatter.json"
BRAND_RANKINGS_PATH = OUTPUT_DIR / "brand_rankings.json"
MODALITY_BREAKDOWN_PATH = OUTPUT_DIR / "modality_breakdown.json"
CASE_STUDIES_PATH = OUTPUT_DIR / "case_studies.json"


@dataclass
class SummaryStats:
  total_brands: int
  total_posts: int
  avg_ati: float
  high_risk_brand_count: int
  high_risk_threshold: float


@dataclass
class PostRecord:
  post_id: str
  brand: str
  ati: float
  text_ati: float
  image_ati: float
  meta_ati: float
  novelty: float
  diversity: float
  text_nov: float
  image_nov: float
  meta_nov: float
  text_div: float
  image_div: float
  meta_div: float
  likes: int
  comments: int
  followers: float
  y: float
  caption: str
  ocr_text: str
  is_late_entry: bool


def safe_float(value: str | None, default: float = 0.0) -> float:
  if value is None or value == "":
    return default
  try:
    return float(value)
  except ValueError:
    return default


def safe_int(value: str | None, default: int = 0) -> int:
  if value is None or value == "":
    return default
  try:
    return int(float(value))
  except ValueError:
    return default


def clean_text(value: str | None) -> str:
  if not value:
    return ""
  return " ".join(value.split())


def clean_snippet(value: str, max_length: int = 120) -> str:
  cleaned = clean_text(value)
  if len(cleaned) <= max_length:
    return cleaned
  return cleaned[:max_length].rstrip() + "…"


def load_posts() -> List[PostRecord]:
  posts: List[PostRecord] = []
  post_counter = 0
  
  # 先載入測試集
  if PER_POST_PATH_TEST.exists():
    with PER_POST_PATH_TEST.open(newline="", encoding="utf-8") as f:
      reader = csv.DictReader(f)
      for row in reader:
        text_nov = safe_float(row.get("text_nov"))
        image_nov = safe_float(row.get("image_nov"))
        meta_nov = safe_float(row.get("meta_nov"))
        text_div = safe_float(row.get("text_div"))
        image_div = safe_float(row.get("image_div"))
        meta_div = safe_float(row.get("meta_div"))
        novelty = fmean([text_nov, image_nov, meta_nov])
        diversity = fmean([text_div, image_div, meta_div])

        posts.append(
          PostRecord(
            post_id=f"{row['brand']}_{post_counter:05d}",
            brand=row["brand"],
            ati=safe_float(row.get("ATI_final")),
            text_ati=safe_float(row.get("text_ATI")),
            image_ati=safe_float(row.get("image_ATI")),
            meta_ati=safe_float(row.get("meta_ATI")),
            novelty=novelty,
            diversity=diversity,
            text_nov=text_nov,
            image_nov=image_nov,
            meta_nov=meta_nov,
            text_div=text_div,
            image_div=image_div,
            meta_div=meta_div,
            likes=safe_int(row.get("count_like")),
            comments=safe_int(row.get("count_comment")),
            followers=safe_float(row.get("followers")),
            y=safe_float(row.get("y")),
            caption=clean_text(row.get("caption")),
            ocr_text=clean_text(row.get("ocr_text")),
            is_late_entry=row.get("is_late_entry_brand") == "1",
          )
        )
        post_counter += 1
  
  # 再載入訓練集
  if PER_POST_PATH_TRAIN.exists():
    with PER_POST_PATH_TRAIN.open(newline="", encoding="utf-8") as f:
      reader = csv.DictReader(f)
      for row in reader:
        text_nov = safe_float(row.get("text_nov"))
        image_nov = safe_float(row.get("image_nov"))
        meta_nov = safe_float(row.get("meta_nov"))
        text_div = safe_float(row.get("text_div"))
        image_div = safe_float(row.get("image_div"))
        meta_div = safe_float(row.get("meta_div"))
        novelty = fmean([text_nov, image_nov, meta_nov])
        diversity = fmean([text_div, image_div, meta_div])

        posts.append(
          PostRecord(
            post_id=f"{row['brand']}_{post_counter:05d}",
            brand=row["brand"],
            ati=safe_float(row.get("ATI_final")),
            text_ati=safe_float(row.get("text_ATI")),
            image_ati=safe_float(row.get("image_ATI")),
            meta_ati=safe_float(row.get("meta_ATI")),
            novelty=novelty,
            diversity=diversity,
            text_nov=text_nov,
            image_nov=image_nov,
            meta_nov=meta_nov,
            text_div=text_div,
            image_div=image_div,
            meta_div=meta_div,
            likes=safe_int(row.get("count_like")),
            comments=safe_int(row.get("count_comment")),
            followers=safe_float(row.get("followers")),
            y=safe_float(row.get("y")),
            caption=clean_text(row.get("caption")),
            ocr_text=clean_text(row.get("ocr_text")),
            is_late_entry=0,  # 訓練集沒有 is_late_entry_brand 欄位
          )
        )
        post_counter += 1
  
  return posts


def read_per_post_stats(posts: List[PostRecord]) -> Tuple[int, float]:
  if not posts:
    raise ValueError("No post records loaded.")
  return len(posts), fmean([post.ati for post in posts])


def read_brand_stats(posts: List[PostRecord]) -> Tuple[int, int, float]:
  # 從全部貼文資料計算品牌數和統計，而不是只從 brand_agg CSV
  # 這樣可以確保與 scatter 資料一致
  brand_set = {post.brand for post in posts if post.brand}
  brand_count = len(brand_set)
  
  # 計算每個品牌的平均 ATI（用於計算 high_risk_threshold）
  brand_ati_map: Dict[str, List[float]] = {}
  for post in posts:
    if post.brand:
      if post.brand not in brand_ati_map:
        brand_ati_map[post.brand] = []
      brand_ati_map[post.brand].append(post.ati)
  
  # 計算每個品牌的平均 ATI
  brand_avg_atis = [
    sum(atis) / len(atis) 
    for atis in brand_ati_map.values() 
    if len(atis) > 0
  ]
  
  if not brand_avg_atis:
    raise ValueError("No brand ATI values found in posts")
  
  sorted_values = sorted(brand_avg_atis, reverse=True)
  threshold_index = max(int(round(brand_count * 0.1)) - 1, 0)
  high_risk_threshold = sorted_values[threshold_index]
  high_risk_brand_count = sum(value >= high_risk_threshold for value in brand_avg_atis)

  return brand_count, high_risk_brand_count, high_risk_threshold


def build_summary(posts: List[PostRecord]) -> SummaryStats:
  total_posts, avg_ati = read_per_post_stats(posts)
  total_brands, high_risk_brand_count, high_risk_threshold = read_brand_stats(posts)
  return SummaryStats(
    total_brands=total_brands,
    total_posts=total_posts,
    avg_ati=avg_ati,
    high_risk_brand_count=high_risk_brand_count,
    high_risk_threshold=high_risk_threshold,
  )


def build_novelty_diversity_scatter(posts: List[PostRecord]) -> List[dict]:
  brand_accumulators: Dict[str, Dict[str, float]] = {}

  for post in posts:
    stats = brand_accumulators.setdefault(
      post.brand,
      {
        "post_count": 0,
        "ati_sum": 0.0,
        "nov_sum": 0.0,
        "div_sum": 0.0,
        "followers_values": [],
      },
    )
    stats["post_count"] += 1
    stats["ati_sum"] += post.ati
    stats["nov_sum"] += post.novelty
    stats["div_sum"] += post.diversity
    if post.followers:
      stats["followers_values"].append(post.followers)

  scatter_rows: List[dict] = []
  for brand, stats in brand_accumulators.items():
    post_count = stats["post_count"]
    if post_count == 0:
      continue
    avg_followers = fmean(stats["followers_values"]) if stats["followers_values"] else 0.0
    scatter_rows.append(
      {
        "brandId": brand,
        "brandName": brand,
        "ati": round(stats["ati_sum"] / post_count, 2),
        "novelty": round(stats["nov_sum"] / post_count, 4),
        "diversity": round(stats["div_sum"] / post_count, 4),
        "postCount": int(post_count),
        "followerCount": int(round(avg_followers)),
      }
    )

  scatter_rows.sort(key=lambda item: item["ati"], reverse=True)
  return scatter_rows


def build_brand_rankings(scatter_rows: List[dict], top_n: int = 6) -> dict:
  if not scatter_rows:
    return {"highRiskBrands": [], "resilientBrands": []}

  high_risk = scatter_rows[:top_n]
  resilient = sorted(scatter_rows, key=lambda item: item["ati"])[:top_n]

  return {
    "highRiskBrands": high_risk,
    "resilientBrands": resilient,
  }


def compute_pearson(xs: List[float], ys: List[float]) -> float:
  n = len(xs)
  if n == 0 or len(ys) != n:
    return 0.0
  mean_x = sum(xs) / n
  mean_y = sum(ys) / n
  sum_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
  sum_x2 = sum((x - mean_x) ** 2 for x in xs)
  sum_y2 = sum((y - mean_y) ** 2 for y in ys)
  denom = (sum_x2 * sum_y2) ** 0.5
  if denom == 0:
    return 0.0
  return sum_xy / denom


def build_modality_breakdown(posts: List[PostRecord], per_post_avg_ati: float) -> dict:
  modality_values = {
    "text": {"ati": [], "novelty": [], "diversity": [], "engagement": []},
    "image": {"ati": [], "novelty": [], "diversity": [], "engagement": []},
    "metadata": {"ati": [], "novelty": [], "diversity": [], "engagement": []},
  }

  for post in posts:
    modality_values["text"]["ati"].append(post.text_ati)
    modality_values["text"]["novelty"].append(post.text_nov)
    modality_values["text"]["diversity"].append(post.text_div)
    modality_values["text"]["engagement"].append(post.y)

    modality_values["image"]["ati"].append(post.image_ati)
    modality_values["image"]["novelty"].append(post.image_nov)
    modality_values["image"]["diversity"].append(post.image_div)
    modality_values["image"]["engagement"].append(post.y)

    modality_values["metadata"]["ati"].append(post.meta_ati)
    modality_values["metadata"]["novelty"].append(post.meta_nov)
    modality_values["metadata"]["diversity"].append(post.meta_div)
    modality_values["metadata"]["engagement"].append(post.y)

  breakdown: Dict[str, dict] = {}
  weights: List[float] = []

  for modality, values in modality_values.items():
    ati_values = values["ati"]
    if not ati_values:
      breakdown[modality] = {
        "ati": 0.0,
        "novelty": 0.0,
        "diversity": 0.0,
        "engagementWeight": 0.0,
      }
      weights.append(0.0)
      continue

    corr = abs(compute_pearson(ati_values, values["engagement"]))
    weights.append(corr)
    breakdown[modality] = {
      "ati": round(fmean(ati_values), 2),
      "novelty": round(fmean(values["novelty"]), 4),
      "diversity": round(fmean(values["diversity"]), 4),
      "engagementWeight": corr,
    }

  weight_sum = sum(weights)
  normalized_weights = [1 / len(weights)] * len(weights) if weight_sum == 0 else [w / weight_sum for w in weights]

  for modality, normalized_weight in zip(breakdown.keys(), normalized_weights):
    breakdown[modality]["engagementWeight"] = round(normalized_weight, 4)

  return {
    "text": breakdown.get("text", {"ati": 0, "novelty": 0, "diversity": 0, "engagementWeight": 0}),
    "image": breakdown.get("image", {"ati": 0, "novelty": 0, "diversity": 0, "engagementWeight": 0}),
    "metadata": breakdown.get("metadata", {"ati": 0, "novelty": 0, "diversity": 0, "engagementWeight": 0}),
    "combinedAti": round(per_post_avg_ati, 2),
  }


def make_snapshot(post: PostRecord) -> dict:
  return {
    "postId": post.post_id,
    "date": "N/A",
    "captionSnippet": clean_snippet(post.caption),
    "ati": round(post.ati, 2),
    "novelty": round(post.novelty, 4),
    "diversity": round(post.diversity, 4),
    "likeCount": post.likes,
    "commentCount": post.comments,
  }


def build_case_studies(posts: List[PostRecord], scatter_rows: List[dict]) -> List[dict]:
  if not posts or not scatter_rows:
    return []

  posts_by_brand: Dict[str, List[PostRecord]] = {}
  for post in posts:
    posts_by_brand.setdefault(post.brand, []).append(post)

  for brand_posts in posts_by_brand.values():
    brand_posts.sort(key=lambda p: p.ati)

  scatter_lookup = {item["brandId"]: item for item in scatter_rows}
  case_studies: List[dict] = []
  visited: set[str] = set()

  def create_case(brand_id: str, trap_ranking: str) -> dict | None:
    brand_posts = posts_by_brand.get(brand_id)
    if not brand_posts:
      return None

    stats = scatter_lookup.get(brand_id)
    avg_ati = stats["ati"] if stats else fmean([p.ati for p in brand_posts])
    lowest_post = brand_posts[0]
    highest_post = brand_posts[-1]

    if trap_ranking == "highest":
      baseline_post = highest_post
      counterpart_post = lowest_post if highest_post.post_id != lowest_post.post_id else None
      rationale = f"平均 ATI {avg_ati:.1f} 為所有品牌中最高，貼文語氣高度趨同。"
      scenario_title = "套用差異化貼文元素"
      scenario_desc = "同品牌在觀測期內 ATI 最低的貼文做為參考，可觀察差異化帶來的下降空間。"
      ati_direction = "下降"
    else:
      baseline_post = lowest_post
      counterpart_post = highest_post if highest_post.post_id != lowest_post.post_id else None
      rationale = f"平均 ATI {avg_ati:.1f} 位於最低區段，持續保持內容差異化。"
      scenario_title = "改成促銷語氣的極端案例"
      scenario_desc = "若參考同品牌 ATI 最高的貼文語氣，將顯著增加平均陷阱風險。"
      ati_direction = "上升"

    scenarios: List[dict] = []
    if counterpart_post:
      delta_ati = counterpart_post.ati - baseline_post.ati
      scenarios.append(
        {
          "title": scenario_title,
          "description": scenario_desc,
          "adjustedAti": round(counterpart_post.ati, 2),
          "changes": [
            f"ATI {ati_direction} {abs(delta_ati):.1f} 點（{baseline_post.ati:.1f} → {counterpart_post.ati:.1f}）",
            f"Novelty 變化 {counterpart_post.novelty - baseline_post.novelty:+.2f}",
            f"Diversity 變化 {counterpart_post.diversity - baseline_post.diversity:+.2f}",
            f"互動指標 y 變化 {counterpart_post.y - baseline_post.y:+.4f}",
          ],
        }
      )

    return {
      "brandId": brand_id,
      "brandName": brand_id,
      "trapRanking": trap_ranking,
      "rationale": rationale,
      "baseline": make_snapshot(baseline_post),
      "scenarioTests": scenarios,
    }

  highest_brand = scatter_rows[0]["brandId"]
  case_high = create_case(highest_brand, "highest")
  if case_high:
    case_studies.append(case_high)
    visited.add(highest_brand)

  for row in reversed(scatter_rows):
    if row["brandId"] in visited:
      continue
    case_low = create_case(row["brandId"], "lowest")
    if case_low:
      case_studies.append(case_low)
      break

  return case_studies


def main() -> None:
  if not PER_POST_PATH_TEST.exists():
    raise FileNotFoundError(f"Missing file: {PER_POST_PATH_TEST}")
  if not BRAND_AGG_PATH.exists():
    raise FileNotFoundError(f"Missing file: {BRAND_AGG_PATH}")
  
  print(f"📊 載入資料...")
  print(f"   測試集: {PER_POST_PATH_TEST}")
  if PER_POST_PATH_TRAIN.exists():
    print(f"   訓練集: {PER_POST_PATH_TRAIN}")
  else:
    print(f"   訓練集: 未找到（將只使用測試集）")

  OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

  posts = load_posts()
  stats = build_summary(posts)

  summary_payload = {
    "timeframeLabel": "2025/04 – 2025/09",
    "totalBrands": stats.total_brands,
    "totalPosts": stats.total_posts,
    "avgAti": round(stats.avg_ati, 2),
    "highRiskBrandCount": int(stats.high_risk_brand_count),
    "highRiskThreshold": round(stats.high_risk_threshold, 2),
    "highRiskDefinition": "Top 10% ATI_final_mean across brands",
    "lastUpdated": datetime.now(timezone.utc).isoformat(),
  }

  with SUMMARY_PATH.open("w", encoding="utf-8") as f:
    json.dump(summary_payload, f, ensure_ascii=False, indent=2)

  scatter_payload = build_novelty_diversity_scatter(posts)
  with SCATTER_PATH.open("w", encoding="utf-8") as f:
    json.dump(scatter_payload, f, ensure_ascii=False, indent=2)

  rankings_payload = build_brand_rankings(scatter_payload)
  with BRAND_RANKINGS_PATH.open("w", encoding="utf-8") as f:
    json.dump(rankings_payload, f, ensure_ascii=False, indent=2)

  modality_payload = build_modality_breakdown(posts, stats.avg_ati)
  with MODALITY_BREAKDOWN_PATH.open("w", encoding="utf-8") as f:
    json.dump(modality_payload, f, ensure_ascii=False, indent=2)

  case_studies_payload = build_case_studies(posts, scatter_payload)
  with CASE_STUDIES_PATH.open("w", encoding="utf-8") as f:
    json.dump(case_studies_payload, f, ensure_ascii=False, indent=2)

  print(f"Summary written to {SUMMARY_PATH.relative_to(ROOT_DIR)}")
  print(f"Scatter data written to {SCATTER_PATH.relative_to(ROOT_DIR)}")
  print(f"Brand rankings written to {BRAND_RANKINGS_PATH.relative_to(ROOT_DIR)}")
  print(f"Modality breakdown written to {MODALITY_BREAKDOWN_PATH.relative_to(ROOT_DIR)}")
  print(f"Case studies written to {CASE_STUDIES_PATH.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
  main()


