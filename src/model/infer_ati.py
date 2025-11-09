# src/model/infer_ati.py
import os, sys, json, argparse, datetime
import ast, joblib, re, pathlib, math
import numpy as np
import pandas as pd
import easyocr
from PIL import Image, UnidentifiedImageError
import torch
from transformers import (
    CLIPModel, CLIPProcessor,
    ChineseCLIPModel, ChineseCLIPProcessor,
)

# ---------- existing constants (kept) ----------
BASE_DIR = "./src/model"
CACHE_DIR = f"{BASE_DIR}/cache"; os.makedirs(CACHE_DIR, exist_ok=True)
IMG_DIR  = f"{BASE_DIR}/input_images"; os.makedirs(IMG_DIR, exist_ok=True)
ART_DIR  = pathlib.Path(BASE_DIR) / "outputs" / "ati_artifacts"
OCR_MAX_IMAGES = 1; IMG_MAX_IMAGES = 1

EMOJI_PATTERN = re.compile(r'[\U00010000-\U0010ffff]', flags=re.UNICODE)
def count_emojis(text): return 0 if not isinstance(text, str) else len(EMOJI_PATTERN.findall(text))

def has_any(text, keywords):
    if not isinstance(text, str): return 0
    low = text.lower()
    return int(any(kw in low for kw in keywords))

def load_artifacts():
    centers = {
        "text":  np.load(ART_DIR / "centers_text.npy"),
        "image": np.load(ART_DIR / "centers_image.npy"),
        "meta":  np.load(ART_DIR / "centers_meta.npy"),
    }
    scaler = joblib.load(ART_DIR / "numeric_scaler.joblib")
    with open(ART_DIR / "config.json", "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return centers, scaler, cfg

def _norm_rows(x): n = np.linalg.norm(x, axis=1, keepdims=True) + 1e-9; return (x / n).astype(np.float32)
def _softmax_rows(x, tau):
    z = (x - x.max(axis=1, keepdims=True)) / max(tau, 1e-8)
    e = np.exp(z); return e / (e.sum(axis=1, keepdims=True) + 1e-9)

def compute_DS_for_modality(X, centers, wN, wD, nov_min, nov_max, tau):
    Xn = _norm_rows(X); sims = Xn @ centers.T
    max_sim = sims.max(axis=1)
    nov_raw = 1.0 - max_sim
    if nov_max - nov_min < 1e-9:
        nov = np.zeros_like(nov_raw, dtype=np.float32)
    else:
        nov = ((nov_raw - nov_min) / (nov_max - nov_min)).astype(np.float32)
        nov = np.clip(nov, 0.0, 1.0)
    probs = _softmax_rows(sims, tau=tau)
    ent = -(probs * (np.log(probs + 1e-9))).sum(axis=1) / (math.log(sims.shape[1]) + 1e-9)
    return (wN * nov + wD * ent).astype(np.float32)

def parse_rel_img_paths(cell):
    if pd.isna(cell): return []
    s = str(cell).strip()
    if s == '' or s.lower() == 'nan': return []
    try:
        val = ast.literal_eval(s)
        if isinstance(val, list): return [str(x).strip() for x in val]
    except Exception: pass
    if '|' in s: return [x.strip() for x in s.split('|') if x.strip()]
    if ',' in s: return [x.strip() for x in s.split(',') if x.strip()]
    return [s]

reader = easyocr.Reader(['ch_tra','en'], gpu=True)

def ocr_single_image(p):
    try: return " ".join([r.strip() for r in reader.readtext(p, detail=0, paragraph=True) if isinstance(r, str)])
    except Exception: return ""

def ocr_post(rel_paths, base_dir, cache_key):
    cache_file = os.path.join(CACHE_DIR, f'ocr_{cache_key}.json')
    if os.path.exists(cache_file):
        try:
            with open(cache_file,'r',encoding='utf-8') as f:
                return json.load(f).get('text','')
        except Exception: pass
    texts = []
    for rp in rel_paths[:OCR_MAX_IMAGES]:
        p = os.path.join(base_dir, rp)
        if not os.path.exists(p):
            p2 = os.path.join(base_dir, os.path.basename(rp))
            if os.path.exists(p2): p = p2
            else: continue
        t = ocr_single_image(p)
        if t: texts.append(t)
    final_text = " ".join(texts).strip()
    with open(cache_file,'w',encoding='utf-8') as f:
        json.dump({'text':final_text}, f, ensure_ascii=False)
    return final_text

def load_image_for_clip(p, size_check=True):
    try:
        im = Image.open(p).convert('RGB')
        if size_check: im.thumbnail((1024,1024))
        return im
    except (FileNotFoundError, UnidentifiedImageError, OSError):
        return None

PROMO_WORDS  = ['折','折扣','%off','% off','促銷','滿','送','優惠','特價','買一送一','買一送二','限時','早鳥']
FLAVOR_WORDS = ['芒果','草莓','葡萄','百香','抹茶','烏龍','紅茶','綠茶','奶蓋','珍珠','椰果','仙草']
HEALTH_WORDS = ['無糖','微糖','半糖','少冰','去冰','低卡','健康','無添加']
CTA_WORDS    = ['快來','立刻','今天','現在','一起','打卡','留言','分享','抽獎']
PRICE_PAT    = r'(nt\$|n\$|\$|元)\s*\d+'
PCT_PAT      = r'\d+\s*%'

def build_numeric_features(df, text_col, ocr_col, time_col):
    caps = df[text_col].fillna('').astype(str)
    ocrs = df[ocr_col].fillna('').astype(str) if (ocr_col and ocr_col in df.columns) else pd.Series(['']*len(df), index=df.index)
    feat = {}
    feat['cap_len']      = caps.apply(len)
    feat['cap_hashtags'] = caps.apply(lambda s: len(re.findall(r'#\w+', s)))
    feat['cap_mentions'] = caps.apply(lambda s: len(re.findall(r'@\w+', s)))
    feat['cap_digits']   = caps.apply(lambda s: len(re.findall(r'\d', s)))
    feat['cap_bang']     = caps.apply(lambda s: s.count('!'))
    feat['cap_qmark']    = caps.apply(lambda s: s.count('?'))
    feat['cap_emoji']    = caps.apply(count_emojis)
    feat['cap_promo']    = caps.apply(lambda s: has_any(s, PROMO_WORDS))
    feat['cap_flavor']   = caps.apply(lambda s: has_any(s, FLAVOR_WORDS))
    feat['cap_health']   = caps.apply(lambda s: has_any(s, HEALTH_WORDS))
    feat['cap_cta']      = caps.apply(lambda s: has_any(s, CTA_WORDS))
    feat['ocr_len']       = ocrs.apply(len)
    feat['ocr_digits']    = ocrs.apply(lambda s: len(re.findall(r'\d', s)))
    feat['ocr_has_price'] = ocrs.apply(lambda s: int(re.search(PRICE_PAT, s.lower()) is not None))
    feat['ocr_has_pct']   = ocrs.apply(lambda s: int(re.search(PCT_PAT,   s.lower()) is not None))
    feat['ocr_promo']     = ocrs.apply(lambda s: has_any(s, PROMO_WORDS))
    feat['ocr_flavor']    = ocrs.apply(lambda s: has_any(s, FLAVOR_WORDS))
    feat['ocr_health']    = ocrs.apply(lambda s: has_any(s, HEALTH_WORDS))
    feat['ocr_cta']       = ocrs.apply(lambda s: has_any(s, CTA_WORDS))
    t = pd.to_datetime(df[time_col], format='%Y-%m-%d %H:%M:%S', errors='coerce')
    hours = t.dt.hour.fillna(0).astype(int)
    feat['time_sin'] = np.sin(2*np.pi*hours/24); feat['time_cos'] = np.cos(2*np.pi*hours/24)
    return pd.DataFrame(feat, index=df.index)

device = 'cuda' if torch.cuda.is_available() else 'cpu'
MODEL_BACKEND='chinese-clip'; MODEL_ID_CN='OFA-Sys/chinese-clip-vit-base-patch16'; MODEL_ID_EN='openai/clip-vit-base-patch32'
if MODEL_BACKEND == 'chinese-clip':
    clip_model = ChineseCLIPModel.from_pretrained(MODEL_ID_CN).to(device)
    clip_processor = ChineseCLIPProcessor.from_pretrained(MODEL_ID_CN)
    PROJ_DIM = clip_model.config.projection_dim
else:
    clip_model = CLIPModel.from_pretrained(MODEL_ID_EN).to(device)
    clip_processor = CLIPProcessor.from_pretrained(MODEL_ID_EN)
    PROJ_DIM = clip_model.config.projection_dim

@torch.no_grad()
def embed_text_clip(texts, batch_size=64, max_length=64, device_override=None, use_fp16=True):
    dev = device_override if device_override is not None else device
    feats_all = []
    for i in range(0, len(texts), batch_size):
        raw_chunk = texts[i:i+batch_size]
        chunk = [ (s if isinstance(s, str) and s.strip() != "" else "。")[:512] for s in raw_chunk ]
        inputs = clip_processor(text=chunk, return_tensors="pt", padding=True, truncation=True, max_length=max_length)
        if inputs["input_ids"].numel() == 0:
            feats_all.append(np.zeros((len(chunk), PROJ_DIM), dtype=np.float32)); continue
        inputs = {k: v.to(dev) for k, v in inputs.items()}
        class _nullctx:
            def __enter__(self): return None
            def __exit__(self, *args): return False
        ctx = torch.amp.autocast('cuda', dtype=torch.float16) if (dev == "cuda" and use_fp16) else _nullctx()
        with ctx:
            try:
                feats = clip_model.get_text_features(**inputs)
            except TypeError:
                out = []
                for j in range(inputs["input_ids"].shape[0]):
                    sub = {k: v[j:j+1] for k, v in inputs.items()}
                    try: out.append(clip_model.get_text_features(**sub))
                    except Exception: out.append(torch.zeros((1, PROJ_DIM), device=dev))
                feats = torch.cat(out, dim=0)
        arr = feats.detach().cpu().numpy()
        arr = arr / (np.linalg.norm(arr, axis=1, keepdims=True) + 1e-9)
        feats_all.append(arr.astype(np.float32))
        if dev == "cuda":
            del feats, inputs; torch.cuda.empty_cache()
    return np.vstack(feats_all) if feats_all else np.zeros((0, PROJ_DIM), dtype=np.float32)

@torch.no_grad()
def embed_text_clip_safe(texts):
    for bs in [128,64,32,16,8,4,2,1]:
        try: return embed_text_clip(texts, batch_size=bs, max_length=64, device_override=None, use_fp16=True)
        except RuntimeError as e:
            if 'CUDA out of memory' in str(e): torch.cuda.empty_cache(); continue
            raise
    return embed_text_clip(texts, batch_size=64, max_length=64, device_override='cpu', use_fp16=False)

@torch.no_grad()
def embed_images_clip(pil_images):
    if len(pil_images) == 0: return np.zeros((0, PROJ_DIM), dtype=np.float32)
    inputs = clip_processor(images=pil_images, return_tensors='pt').to(device)
    arr = clip_model.get_image_features(**inputs).detach().cpu().numpy()
    arr = arr / (np.linalg.norm(arr, axis=1, keepdims=True) + 1e-9)
    return arr.astype(np.float32)

def compute_ati_for_df(df: pd.DataFrame) -> pd.DataFrame:
    centers, scaler, cfg = load_artifacts()
    TAU = cfg["TAU"]; v = np.array(cfg["phase2_v"], dtype=np.float32)

    rel_lists = df["rel_img_paths"].apply(parse_rel_img_paths).tolist()
    ocr_texts = []
    for i, rels in enumerate(rel_lists):
        key = f"infer_{i}"
        ocr_texts.append(ocr_post(rels, IMG_DIR, key))
    cap_texts = df["sum"].fillna("").astype(str).tolist()
    cap_emb = embed_text_clip_safe(cap_texts)
    ocr_emb = embed_text_clip_safe(ocr_texts)
    text_vec = np.hstack([cap_emb, ocr_emb]).astype(np.float32)

    img_vecs = []
    for rels in rel_lists:
        vecs = []
        for rp in rels[:cfg["IMG_MAX_IMAGES"]]:
            p = os.path.join(IMG_DIR, rp)
            if not os.path.exists(p):
                p2 = os.path.join(IMG_DIR, os.path.basename(rp))
                if os.path.exists(p2): p = p2
                else: continue
            im = load_image_for_clip(p)
            if im is None: continue
            vimg = embed_images_clip([im])[0]; vecs.append(vimg)
        if len(vecs) == 0:
            vec_mean = np.zeros((cfg["PROJ_DIM"],), dtype=np.float32)
        else:
            arr = np.vstack(vecs); vec_mean = arr.mean(axis=0)
            vec_mean = vec_mean / (np.linalg.norm(vec_mean) + 1e-9)
        img_vecs.append(vec_mean.astype(np.float32))
    image_vec = np.vstack(img_vecs)

    numeric_df = build_numeric_features(df.assign(ocr_text=""), "sum", None, "ftime_parsed")
    numeric_df = build_numeric_features(df.assign(ocr_text=ocr_texts), "sum", "ocr_text", "ftime_parsed")
    numeric_z = pd.DataFrame(
        joblib.load(ART_DIR / "numeric_scaler.joblib").transform(numeric_df),
        columns=numeric_df.columns, index=df.index
    ).values.astype(np.float32)

    DS_text  = compute_DS_for_modality(text_vec,  centers["text"],  cfg["phase1"]["text"]["wN"],  cfg["phase1"]["text"]["wD"],  cfg["phase1"]["text"]["nov_min"],  cfg["phase1"]["text"]["nov_max"],  TAU)
    DS_image = compute_DS_for_modality(image_vec, centers["image"], cfg["phase1"]["image"]["wN"], cfg["phase1"]["image"]["wD"], cfg["phase1"]["image"]["nov_min"], cfg["phase1"]["image"]["nov_max"], TAU)
    DS_meta  = compute_DS_for_modality(numeric_z, centers["meta"],  cfg["phase1"]["meta"]["wN"],  cfg["phase1"]["meta"]["wD"],  cfg["phase1"]["meta"]["nov_min"],  cfg["phase1"]["meta"]["nov_max"],  TAU)

    DS_final = (v[0]*DS_text + v[1]*DS_image + v[2]*DS_meta).astype(np.float32)
    ATI = 100.0*(1.0 - DS_final)

    out = df[["brand","sum","rel_img_paths","ftime_parsed"]].copy()
    out["DS_text"]=DS_text; out["DS_image"]=DS_image; out["DS_meta"]=DS_meta
    out["DS_final"]=DS_final; out["ATI_final"]=ATI
    out["ocr_text"]=ocr_texts
    return out

def compute_ati_single(text: str, rel_img_paths: str | None = None) -> dict:
    """Convenience wrapper: one (text, image) → ATI JSON-ready dict."""
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    df = pd.DataFrame([{
        "brand": "user",
        "sum": text or "",
        "rel_img_paths": rel_img_paths or "",
        "ftime_parsed": now,
    }])
    result = compute_ati_for_df(df)
    row = result.iloc[0]
    return {
        "ati": float(row["ATI_final"]),
        "components": {
            "DS_text":  float(row["DS_text"]),
            "DS_image": float(row["DS_image"]),
            "DS_meta":  float(row["DS_meta"]),
            "DS_final": float(row["DS_final"]),
        },
        "ocr_text": row["ocr_text"],
        "rel_img_paths": rel_img_paths or "",
        "timestamp": now,
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", type=str, required=False, default="")
    parser.add_argument(
        "--rel_img",
        type=str,
        required=False,
        default=None,
        help="relative image path under ./src/model/input_images",
    )
    parser.add_argument(
        "--csv",
        type=str,
        required=False,
        help="optional legacy mode: CSV path processed with compute_ati_for_df",
    )
    args = parser.parse_args()

    # Legacy CSV mode (if you still need it)
    if args.csv:
        df = pd.read_csv(args.csv)
        result = compute_ati_for_df(df)
        result.to_csv("./src/model/outputs/ati_input.csv", index=False)
        # Just dump all ATI scores as JSON
        print(json.dumps(
            {"ati_list": [float(x) for x in result["ATI_final"].tolist()]},
            ensure_ascii=False,
        ))
        sys.exit(0)

    # Single text + optional image mode
    out = compute_ati_single(args.text, args.rel_img)
    print(json.dumps(out, ensure_ascii=False))

