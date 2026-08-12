#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, pathlib, re, shutil, subprocess, sys, tempfile, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
BRANCH = "build/01-ux-ui-prototype"
EXPECTED_ZIP_SHA256 = "3c6560a095a8f513b5f36493d1b8bca31a86c05d1be41eafded469141d440ab1"
EXPECTED = {
    "favicon.ico": "c506b53bab498bef770bee094f87885bc2003203443d905c8d362b08495350e5",
    "favicon-16x16.png": "a63a45c46d241db7114639874e8c975e4287939b07d259a6a38934ad8fe9198f",
    "favicon-32x32.png": "e99d64c0b8324dfdf43c6a99705b4ac809c83304c0fe17f4cbead7461f1591ba",
    "apple-touch-icon.png": "964d1e37c150937a0e7b9dae0f3a6d6b9a329ce434ee004e06dc2e745eca80d9",
    "android-chrome-192x192.png": "b0568f87df233fe22b31044b062f27e01f37d914167f429551fe03592b5a2643",
    "android-chrome-512x512.png": "2844dff035ceeaedb318fd4cd1660e71debf113fc0f5a0d22716feac110deccd",
}

def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()

def ensure_branch() -> None:
    current = run("git", "branch", "--show-current")
    if current != BRANCH:
        raise SystemExit(f"ABORT: current branch is {current!r}; switch to {BRANCH!r} first.")

def find_zip() -> pathlib.Path:
    candidates = [ROOT / "favicon_io.zip", ROOT / "assets" / "brand" / "source" / "favicon_io.zip"]
    for p in candidates:
        if p.exists() and sha256(p) == EXPECTED_ZIP_SHA256:
            return p
    raise SystemExit("ABORT: exact founder-approved favicon_io.zip not found. Upload it to repository root as favicon_io.zip.")

def extract_verified(src_zip: pathlib.Path, brand: pathlib.Path) -> None:
    brand.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        tmp = pathlib.Path(td)
        with zipfile.ZipFile(src_zip) as z:
            z.extractall(tmp)
        for name, expected in EXPECTED.items():
            src = tmp / name
            if not src.exists() or sha256(src) != expected:
                raise SystemExit(f"ABORT: checksum mismatch for {name}")
            shutil.copy2(src, brand / name)

def make_header(brand: pathlib.Path) -> None:
    try:
        from PIL import Image
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "pillow"])
        from PIL import Image
    src = Image.open(brand / "android-chrome-512x512.png").convert("RGBA")
    mark = src.crop((122, 48, 400, 312))
    word = src.crop((72, 310, 444, 451))
    bg = src.getpixel((8, 8))
    canvas = Image.new("RGBA", (1600, 520), bg)
    mark.thumbnail((450, 450), Image.Resampling.LANCZOS)
    word.thumbnail((960, 360), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, (58, (520 - mark.height) // 2))
    canvas.alpha_composite(word, (560, (520 - word.height) // 2 + 10))
    canvas.save(brand / "shell-co-header-horizontal.png", optimize=True)

def update_manifest() -> None:
    manifest = {
        "name": "Shell & Co Remodeling",
        "short_name": "Shell & Co",
        "icons": [
            {"src": "assets/brand/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "assets/brand/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png"},
        ],
        "theme_color": "#3d3b39",
        "background_color": "#f7f3ed",
        "display": "standalone",
    }
    (ROOT / "site.webmanifest").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

def update_index() -> None:
    p = ROOT / "index.html"
    html = p.read_text(encoding="utf-8")
    fav = '\n'.join([
        '<link rel="apple-touch-icon" sizes="180x180" href="assets/brand/apple-touch-icon.png">',
        '<link rel="icon" type="image/png" sizes="32x32" href="assets/brand/favicon-32x32.png">',
        '<link rel="icon" type="image/png" sizes="16x16" href="assets/brand/favicon-16x16.png">',
        '<link rel="icon" href="assets/brand/favicon.ico">',
        '<link rel="manifest" href="site.webmanifest">',
        '<meta name="theme-color" content="#3d3b39">',
    ])
    if 'apple-touch-icon' not in html:
        html = html.replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="noindex,nofollow">\n' + fav)
    html = re.sub(r'<a class="brand" href="#top">.*?</a>', '<a class="brand" href="#top"><img class="brand-logo brand-logo-horizontal" src="assets/brand/shell-co-header-horizontal.png" alt="Shell & Co Remodeling — Cutting Edge. Lasting Results."></a>', html, count=1, flags=re.S)
    html = re.sub(r'<div class="hero-visual" aria-hidden="true">.*?</div></section>', '<div class="hero-visual" aria-hidden="true"><img class="hero-brand-mark" src="assets/brand/android-chrome-512x512.png" alt=""></div></section>', html, count=1, flags=re.S)
    p.write_text(html, encoding="utf-8")

def update_css() -> None:
    p = ROOT / "assets" / "styles.css"
    css = p.read_text(encoding="utf-8")
    css = re.sub(r'\.brand-logo\{[^}]*\}', '.brand-logo{display:block;object-fit:contain}.brand-logo-horizontal{width:min(320px,34vw);height:auto;background:transparent;border-radius:0}', css, count=1)
    addon = '.hero-brand-mark{position:relative;z-index:1;width:min(480px,88%);height:auto;object-fit:contain;filter:drop-shadow(0 18px 36px rgba(0,0,0,.2))}\n@media(max-width:560px){.brand-logo-horizontal{width:220px}.hero-brand-mark{width:min(390px,92%)}}\n'
    if '.hero-brand-mark{' not in css:
        css += '\n' + addon
    p.write_text(css, encoding="utf-8")

def write_records(source_hash: str) -> None:
    rec = ROOT / "docs" / "brand" / "SCR-BRAND-ASSET-REVIEW-002.md"
    rec.write_text(f'''# SCR-BRAND-ASSET-REVIEW-002 — Official Digital Brand Asset Adoption Record v1.0\n\n**Record ID:** SCR-BRAND-ASSET-REVIEW-002  \n**Version:** 1.0  \n**Status:** FOUNDER-ADOPTED — APPLIED  \n**Effective date:** 2026-08-12  \n**Authority:** Elijah L. Cooley  \n**Source package SHA-256:** `{source_hash}`  \n**Branch applied:** `{BRANCH}`\n\n## Adopted Assets\n\n- `assets/brand/favicon.ico`\n- `assets/brand/favicon-16x16.png`\n- `assets/brand/favicon-32x32.png`\n- `assets/brand/apple-touch-icon.png`\n- `assets/brand/android-chrome-192x192.png`\n- `assets/brand/android-chrome-512x512.png`\n- `assets/brand/shell-co-header-horizontal.png` — derived web lockup created only by recomposing the approved artwork; the core S&C + diamond-blade mark was not redesigned.\n- `site.webmanifest`\n\n## Superseded\n\n`assets/shell-co-logo.svg` — **SUPERSEDED / REMOVED**. Temporary prototype reconstruction; no longer authorized.\n\n## Photo Hold\n\nHistorical remodeling photographs supplied by Bernard Shell Jr. remain excluded until before/progress/after sequencing and commercial-use status are verified.\n\n## Authorization Boundary\n\nThis record governs digital brand assets only. It does not authorize unverified project photography, licensing/insurance claims, production customer-data transmission, or live OpenAI API generation.\n\n## Next Authorized Action\n\nVerify GitHub Pages founder-review rendering across desktop/mobile and confirm icon/header delivery.\n''', encoding="utf-8")

    bp = ROOT / "docs" / "brand" / "SCR-BRAND-001.md"
    txt = bp.read_text(encoding="utf-8")
    txt = txt.replace('**Version:** 1.0', '**Version:** 1.2', 1)
    txt = txt.replace('**Status:** ADOPTED — BRAND ARCHITECTURE / VISUAL ARTWORK NOT LOCKED', '**Status:** ADOPTED — FOUNDER-SELECTED DIGITAL IDENTITY & ASSET FAMILY', 1)
    txt = txt.replace('**Canon status:** PARTIAL', '**Canon status:** PARTIAL — DIGITAL BRAND ASSETS ADOPTED', 1)
    txt = txt.replace('Concept boards exist, but no specific logo artwork is canon-locked by this record.', 'Founder-approved digital artwork is adopted through SCR-BRAND-ASSET-REVIEW-002. The favicon family is authoritative for digital icon use. The prior prototype SVG is superseded and removed. The horizontal website-header lockup is a derived web application created from the approved artwork without redesigning the core S&C + diamond-blade mark.')
    if 'v1.2 — Founder-approved digital asset family adopted' not in txt:
        txt += '\n- v1.2 — Founder-approved digital asset family adopted under SCR-BRAND-ASSET-REVIEW-002; prototype SVG superseded.\n'
    bp.write_text(txt, encoding="utf-8")

    br = ROOT / "docs" / "build-records" / "SCR-BR01-001.md"
    txt = br.read_text(encoding="utf-8")
    txt = txt.replace('`/assets/shell-co-logo.svg`', '`/assets/brand/shell-co-header-horizontal.png`\n- `/assets/brand/favicon.ico` + PNG icon family\n- `/site.webmanifest`')
    if '## Brand Asset Update' not in txt:
        txt += '\n## Brand Asset Update\n\nSCR-BRAND-ASSET-REVIEW-002 completed. Founder-approved favicon/icon family is authoritative; temporary prototype SVG superseded and removed. Historical remodel photos remain withheld.\n'
    br.write_text(txt, encoding="utf-8")

def cleanup() -> None:
    for p in [ROOT / "assets" / "shell-co-logo.svg", ROOT / ".github" / "workflows" / "apply-brand-assets.yml", ROOT / "assets" / "brand" / "source" / "TRIGGER.md"]:
        if p.exists(): p.unlink()
    chunks = ROOT / "assets" / "brand" / "source" / "chunks"
    if chunks.exists(): shutil.rmtree(chunks)
    badzip = ROOT / "assets" / "brand" / "source" / "favicon_io.zip"
    if badzip.exists(): badzip.unlink()

def verify() -> None:
    required = [
        ROOT / "index.html", ROOT / "site.webmanifest",
        ROOT / "assets/brand/favicon.ico", ROOT / "assets/brand/favicon-16x16.png", ROOT / "assets/brand/favicon-32x32.png",
        ROOT / "assets/brand/apple-touch-icon.png", ROOT / "assets/brand/android-chrome-192x192.png", ROOT / "assets/brand/android-chrome-512x512.png",
        ROOT / "assets/brand/shell-co-header-horizontal.png", ROOT / "docs/brand/SCR-BRAND-ASSET-REVIEW-002.md",
    ]
    missing = [str(p.relative_to(ROOT)) for p in required if not p.exists()]
    if missing: raise SystemExit('ABORT missing: ' + ', '.join(missing))
    if (ROOT / 'assets/shell-co-logo.svg').exists(): raise SystemExit('ABORT: prototype SVG still exists')
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    for ref in ['assets/brand/shell-co-header-horizontal.png','assets/brand/apple-touch-icon.png','assets/brand/favicon-32x32.png','site.webmanifest']:
        if ref not in html: raise SystemExit(f'ABORT: missing website reference {ref}')
    # Strict photo hold: no historical user-supplied remodel-photo directories/assets are introduced by this script.
    print('VERIFIED: exact approved asset checksums, header lockup, manifest, website references, prototype SVG removal, metadata records.')

def main() -> None:
    ensure_branch()
    src_zip = find_zip()
    source_hash = sha256(src_zip)
    brand = ROOT / 'assets' / 'brand'
    extract_verified(src_zip, brand)
    make_header(brand)
    update_manifest(); update_index(); update_css(); write_records(source_hash); cleanup(); verify()
    # Preserve source outside public site: remove root upload after successful extraction.
    if src_zip == ROOT / 'favicon_io.zip' and src_zip.exists(): src_zip.unlink()
    print('\nREADY TO COMMIT. Review with: git status && git diff -- index.html assets/styles.css site.webmanifest docs/brand docs/build-records/SCR-BR01-001.md')
    print('Then commit/push: git add -A && git commit -m "Apply founder-approved Shell & Co digital brand assets" && git push origin build/01-ux-ui-prototype')

if __name__ == '__main__': main()
