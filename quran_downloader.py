"""
Quran Audio Downloader
======================
يتيح هذا السكريبت تحميل تلاوات القرآن الكريم بجودات مختلفة مع إمكانية التشغيل بدون إنترنت.

المتطلبات:
    pip install requests tqdm colorama

الاستخدام:
    python quran_downloader.py
"""

import os
import sys
import json
import time
import threading
import requests
from pathlib import Path

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    HAS_COLOR = True
except ImportError:
    HAS_COLOR = False

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
OFFLINE_DIR = BASE_DIR / "offline_audio"
INDEX_FILE  = OFFLINE_DIR / "index.json"

API_BASE    = "https://api.alquran.cloud/v1"
CDN_BASE    = "https://cdn.islamic.network/quran/audio-surah"
CDN_AYAH    = "https://cdn.islamic.network/quran/audio"

QUALITIES = {
    "1": {"label": "عالية  (128 kbps)", "kbps": 128},
    "2": {"label": "متوسطة  (64 kbps)",  "kbps": 64},
    "3": {"label": "منخفضة  (32 kbps)",  "kbps": 32},
}

SURAH_NAMES = [
    "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف",
    "الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر",
    "النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون",
    "النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان",
    "السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
    "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح",
    "الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة",
    "الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون",
    "التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح",
    "الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات",
    "عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق",
    "الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح",
    "التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر",
    "العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
    "المسد","الإخلاص","الفلق","الناس"
]

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def c(text, color=""):
    if not HAS_COLOR:
        return text
    colors = {
        "green":  Fore.GREEN,
        "yellow": Fore.YELLOW,
        "red":    Fore.RED,
        "cyan":   Fore.CYAN,
        "bold":   Style.BRIGHT,
        "reset":  Style.RESET_ALL,
    }
    return colors.get(color, "") + text + Style.RESET_ALL


def print_banner():
    print("\n" + c("═" * 55, "cyan"))
    print(c("  📖  محمّل تلاوات القرآن الكريم  📖", "bold"))
    print(c("═" * 55, "cyan"))
    print()


def load_index() -> dict:
    """Load the local offline index tracking what's downloaded."""
    if INDEX_FILE.exists():
        return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    return {"reciters": {}}


def save_index(idx: dict):
    OFFLINE_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_FILE.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")


def is_downloaded(idx: dict, identifier: str, surah: int, kbps: int) -> bool:
    return (idx.get("reciters", {})
               .get(identifier, {})
               .get(str(kbps), {})
               .get(str(surah)) is not None)


def mark_downloaded(idx: dict, identifier: str, surah: int, kbps: int, path: str):
    idx.setdefault("reciters", {})
    idx["reciters"].setdefault(identifier, {})
    idx["reciters"][identifier].setdefault(str(kbps), {})
    idx["reciters"][identifier][str(kbps)][str(surah)] = path
    save_index(idx)


def get_local_path(idx: dict, identifier: str, surah: int, kbps: int) -> str | None:
    return (idx.get("reciters", {})
               .get(identifier, {})
               .get(str(kbps), {})
               .get(str(surah)))


# ─────────────────────────────────────────────────────────────────────────────
# API
# ─────────────────────────────────────────────────────────────────────────────

def fetch_reciters() -> list:
    """Fetch list of Arabic audio editions from AlQuran.cloud."""
    print(c("  جاري جلب قائمة القراء...", "yellow"), end="", flush=True)
    try:
        r = requests.get(f"{API_BASE}/edition?format=audio&language=ar", timeout=15)
        data = r.json()["data"]
        print(c(" ✓", "green"))
        return data
    except Exception as e:
        print(c(f" ✗ ({e})", "red"))
        return []


def build_surah_url(identifier: str, surah: int, kbps: int) -> str:
    return f"{CDN_BASE}/{kbps}/{identifier}/{surah}.mp3"


# ─────────────────────────────────────────────────────────────────────────────
# DOWNLOAD
# ─────────────────────────────────────────────────────────────────────────────

def download_file(url: str, dest: Path) -> bool:
    """Download a file with progress bar. Returns True on success."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        with requests.get(url, stream=True, timeout=30) as resp:
            if resp.status_code != 200:
                return False
            total = int(resp.headers.get("content-length", 0))
            if HAS_TQDM:
                bar = tqdm(
                    total=total, unit="B", unit_scale=True,
                    desc=f"  {dest.name[:35]}", leave=False,
                    bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]"
                )
            written = 0
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        written += len(chunk)
                        if HAS_TQDM:
                            bar.update(len(chunk))
            if HAS_TQDM:
                bar.close()
        return written > 0
    except Exception as e:
        print(c(f"\n    خطأ: {e}", "red"))
        if dest.exists():
            dest.unlink()
        return False


def download_surah(identifier: str, reciter_name: str, surah: int,
                   kbps: int, idx: dict, force: bool = False) -> bool:
    """Download a single surah if not already cached."""
    if not force and is_downloaded(idx, identifier, surah, kbps):
        print(c(f"  ✓ سورة {SURAH_NAMES[surah-1]} محفوظة مسبقاً", "green"))
        return True

    url  = build_surah_url(identifier, surah, kbps)
    dest = OFFLINE_DIR / identifier / str(kbps) / f"{surah:03d}_{SURAH_NAMES[surah-1]}.mp3"

    ok = download_file(url, dest)
    if ok:
        mark_downloaded(idx, identifier, surah, kbps, str(dest))
        print(c(f"  ✓ سورة {SURAH_NAMES[surah-1]} تم تحميلها", "green"))
    else:
        print(c(f"  ✗ فشل تحميل سورة {SURAH_NAMES[surah-1]}", "red"))
    return ok


def download_full_quran(identifier: str, reciter_name: str, kbps: int, idx: dict):
    """Download all 114 surahs for a reciter."""
    print(c(f"\n  بدء تحميل القرآن كاملاً للقارئ: {reciter_name}", "bold"))
    print(c(f"  الجودة: {QUALITIES[str(kbps)]['label']}", "cyan"))
    print(c("  " + "─" * 40, "cyan"))

    success = fail = 0
    for i in range(1, 115):
        print(f"  [{i}/114] سورة {SURAH_NAMES[i-1]}: ", end="")
        ok = download_surah(identifier, reciter_name, i, kbps, idx)
        if ok:
            success += 1
        else:
            fail += 1
        time.sleep(0.2)  # polite delay

    print()
    print(c(f"  الإجمالي: {success} سورة تم تحميلها، {fail} أخفق", "bold"))


# ─────────────────────────────────────────────────────────────────────────────
# UPDATE JS INDEX
# ─────────────────────────────────────────────────────────────────────────────

def update_js_offline_map(idx: dict):
    """
    Write a JS file that the web app can load to know which files are locally available.
    The paths use relative URLs from the app root.
    """
    js_lines = ["// Auto-generated by quran_downloader.py – DO NOT EDIT\n",
                "window.OFFLINE_AUDIO = "]
    
    offline_map = {}
    for identifier, qualities in idx.get("reciters", {}).items():
        offline_map[identifier] = {}
        for kbps, surahs in qualities.items():
            offline_map[identifier][kbps] = {}
            for surah_num, abs_path in surahs.items():
                # Make it relative to app root
                try:
                    rel = Path(abs_path).relative_to(BASE_DIR).as_posix()
                except ValueError:
                    rel = abs_path
                offline_map[identifier][kbps][surah_num] = rel

    js_lines.append(json.dumps(offline_map, ensure_ascii=False, indent=2))
    js_lines.append(";\n")

    out = BASE_DIR / "js" / "offline_audio_map.js"
    out.write_text("".join(js_lines), encoding="utf-8")
    print(c(f"\n  ✓ تم تحديث خريطة الملفات: {out}", "green"))


# ─────────────────────────────────────────────────────────────────────────────
# INTERACTIVE MENU
# ─────────────────────────────────────────────────────────────────────────────

def choose_quality() -> tuple[int, str]:
    print(c("\n  اختر الجودة:", "bold"))
    for k, v in QUALITIES.items():
        print(f"    {k}. {v['label']}")
    while True:
        q = input(c("\n  رقم الجودة: ", "cyan")).strip()
        if q in QUALITIES:
            return QUALITIES[q]["kbps"], QUALITIES[q]["label"]
        print(c("  اختيار غير صحيح!", "red"))


def choose_reciter(reciters: list) -> dict:
    print(c(f"\n  القراء المتاحون ({len(reciters)}):", "bold"))
    for i, r in enumerate(reciters[:50], 1):
        print(f"    {i:2}. {r['name']} ({r['identifier']})")
    if len(reciters) > 50:
        print(c(f"    ... و {len(reciters)-50} آخرون.", "yellow"))

    while True:
        choice = input(c("\n  رقم القارئ أو اسمه: ", "cyan")).strip()
        if choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(reciters):
                return reciters[idx]
        else:
            matches = [r for r in reciters if choice in r["name"] or choice in r["identifier"]]
            if len(matches) == 1:
                return matches[0]
            elif len(matches) > 1:
                print(c(f"  وجد {len(matches)} نتيجة، حدد أكثر:", "yellow"))
                for j, m in enumerate(matches[:10], 1):
                    print(f"    {j}. {m['name']}")
                continue
        print(c("  اختيار غير صحيح!", "red"))


def show_downloaded_list(idx: dict):
    reciters = idx.get("reciters", {})
    if not reciters:
        print(c("\n  لا توجد ملفات محفوظة بعد.", "yellow"))
        return
    print(c("\n  الملفات المحفوظة محلياً:", "bold"))
    for identifier, qualities in reciters.items():
        for kbps, surahs in qualities.items():
            count = len(surahs)
            size_mb = sum(
                Path(p).stat().st_size for p in surahs.values()
                if Path(p).exists()
            ) / (1024 * 1024)
            print(f"  • {identifier} | {kbps} kbps | {count} سورة | {size_mb:.1f} MB")


def main():
    print_banner()
    idx = load_index()

    while True:
        print(c("\n  القائمة الرئيسية:", "bold"))
        print("    1. تحميل سورة واحدة")
        print("    2. تحميل القرآن كاملاً لقارئ معين")
        print("    3. عرض الملفات المحفوظة محلياً")
        print("    4. تحديث خريطة الملفات (للتطبيق)")
        print("    0. خروج")

        choice = input(c("\n  اختيارك: ", "cyan")).strip()

        if choice == "0":
            print(c("\n  مع السلامة 🌙\n", "green"))
            break

        elif choice in ("1", "2"):
            reciters = fetch_reciters()
            if not reciters:
                print(c("  تعذّر جلب القراء. تحقق من الإنترنت.", "red"))
                continue

            reciter  = choose_reciter(reciters)
            kbps, ql = choose_quality()

            print(c(f"\n  القارئ   : {reciter['name']}", "bold"))
            print(c(f"  المعرّف  : {reciter['identifier']}", "bold"))
            print(c(f"  الجودة   : {ql}", "bold"))

            if choice == "1":
                print(c("\n  أدخل رقم السورة (1-114):", "yellow"))
                for i, name in enumerate(SURAH_NAMES, 1):
                    print(f"    {i:3}. {name}")
                while True:
                    s = input(c("\n  رقم السورة: ", "cyan")).strip()
                    if s.isdigit() and 1 <= int(s) <= 114:
                        surah_num = int(s)
                        break
                    print(c("  رقم غير صحيح!", "red"))
                download_surah(reciter["identifier"], reciter["name"], surah_num, kbps, idx)

            else:
                confirm = input(c(f"\n  تأكيد تحميل القرآن كاملاً لـ {reciter['name']}؟ (نعم/لا): ", "yellow")).strip()
                if confirm.lower() in ("نعم", "y", "yes", "1"):
                    download_full_quran(reciter["identifier"], reciter["name"], kbps, idx)
                else:
                    print(c("  تم الإلغاء.", "yellow"))

            update_js_offline_map(idx)

        elif choice == "3":
            show_downloaded_list(idx)

        elif choice == "4":
            update_js_offline_map(idx)

        else:
            print(c("  اختيار غير صحيح!", "red"))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(c("\n\n  تم الإيقاف بواسطة المستخدم.\n", "yellow"))
