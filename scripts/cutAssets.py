# 원본 시트(상위 폴더의 PNG)를 잘라 assets/ 에 넣는다. 실행: python scripts/cutAssets.py
# - 하늘 배경 → backgrounds/sky.jpg
# - 측면 캐릭터 4종(투명 배경) → characters/side-1..4.png  (알파 투영으로 자동 분할)
# - 정면 시트 → characters/front-sheet.png (시작 화면용, 크림 배경 그대로)
# - 여권 표지·스탬프 테두리 → passport/cover.png, passport/stamp-1..6.png
# - 배송 물건 8종 → parcels/parcel-1..8.png (크림 배경 제거)

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent
OUT = ROOT / 'assets'

def save(img, rel, **kw):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, **kw)
    print(rel, img.size)

# ---- 하늘 ----
sky = Image.open(SRC / '7. 하늘').convert('RGB')
sky = sky.resize((1600, int(sky.height * 1600 / sky.width)), Image.LANCZOS)
save(sky, 'backgrounds/sky.jpg', quality=82, optimize=True)

# ---- 측면 캐릭터: 알파 열 투영으로 4개 구간 찾기 ----
side = Image.open(SRC / '2. 측면 캐릭터 (배경제거)').convert('RGBA')
alpha = side.getchannel('A')
w, h = side.size
cols = [0] * w
px = alpha.load()
for x in range(w):
    s = 0
    for y in range(0, h, 2):
        if px[x, y] > 40:
            s += 1
    cols[x] = s
# 빗자루 꼬리가 겹쳐 완전히 빈 열이 없으므로, 1/4·2/4·3/4 지점 근처에서 가장 비어 있는 열을 경계로 삼는다
cuts = [0]
for k in (1, 2, 3):
    center = w * k // 4
    lo, hi = center - 140, center + 140
    best = min(range(lo, hi), key=lambda x: cols[x])
    cuts.append(best)
cuts.append(w)
merged = [(cuts[i], cuts[i + 1]) for i in range(4)]
print('side cuts', cuts)
for i, (x0, x1) in enumerate(merged, 1):
    crop = side.crop((max(0, x0 - 8), 0, min(w, x1 + 8), h))
    bbox = crop.getbbox()
    crop = crop.crop(bbox)
    crop.thumbnail((360, 360), Image.LANCZOS)
    save(crop, f'characters/side-{i}.png', optimize=True)

# ---- 정면 시트 (시작 화면 장식) ----
front = Image.open(SRC / '1. 정면캐릭터').convert('RGB')
front.thumbnail((1200, 1200), Image.LANCZOS)
save(front, 'characters/front-sheet.png', optimize=True)

def key_out(img, bg, tol=12):
    # 가장자리에서 이어진 크림색만 지운다 (물건 안쪽의 크림색 종이는 남긴다)
    from collections import deque
    px = img.load()
    W, H = img.size
    seen = bytearray(W * H)
    q = deque()
    def is_bg(x, y):
        r, g, b, a = px[x, y]
        return abs(r - bg[0]) < tol and abs(g - bg[1]) < tol and abs(b - bg[2]) < tol
    for x in range(W):
        for y in (0, H - 1):
            if is_bg(x, y): q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if is_bg(x, y): q.append((x, y))
    while q:
        x, y = q.popleft()
        i = y * W + x
        if seen[i]: continue
        seen[i] = 1
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and is_bg(nx, ny):
                q.append((nx, ny))
    return img

# ---- 여권 ----
pp = Image.open(SRC / '6. 여권 표지와 스탬프 테두리').convert('RGB')
cover = pp.crop((40, 70, 690, 1010))
cover.thumbnail((400, 600), Image.LANCZOS)
save(cover, 'passport/cover.png', optimize=True)
frames = [
    (690, 40, 1030, 390),    # 1 앰버 톱니 원
    (1035, 50, 1405, 380),   # 2 세이지 타원
    (680, 390, 1050, 710),   # 3 세이지 점선 타원
    (1080, 380, 1410, 700),  # 4 앰버 물결 원
    (680, 700, 1020, 1030),  # 5 앰버 점선 원
    (1030, 720, 1410, 1020), # 6 세이지 물결 타원
]
pp_bg = pp.getpixel((5, 5))
for i, box in enumerate(frames, 1):
    f = key_out(pp.crop(box).convert('RGBA'), pp_bg)  # 테두리 바깥 크림색만 투명하게
    f.thumbnail((240, 240), Image.LANCZOS)
    save(f, f'passport/stamp-{i}.png', optimize=True)

# ---- 배송 물건: 4×2 격자, 크림 배경을 투명으로 ----
pc = Image.open(SRC / '5. 배송 물건').convert('RGBA')
bg = pc.getpixel((5, 5))[:3]
cw, ch = pc.width // 4, pc.height // 2
for i in range(8):
    x, y = (i % 4) * cw, (i // 4) * ch
    cell = key_out(pc.crop((x, y, x + cw, y + ch)), bg)
    bbox = cell.getbbox()
    cell = cell.crop(bbox)
    cell.thumbnail((220, 220), Image.LANCZOS)
    save(cell, f'parcels/parcel-{i + 1}.png', optimize=True)

# ---- 빗자루 5단계 ----
# 처음에는 시트 3(가로 한 줄)을 5등분해 잘랐는데, 빗자루가 비스듬히 그려져 있어
# 손잡이 끝이 옆 칸으로 넘어가면서 잘렸다. 2026-09-16 사용자가 단계별 낱장 PNG
# ('1단계 빗자루.png' ~ '5단계 빗자루.png', 투명 배경)를 넣어 주어 그것을 쓴다.
# 파일 이름에 오타가 있어도 되도록 앞 숫자로만 찾는다.
broom_files = {}
for f in SRC.glob('*빗자루*.png'):
    head = f.name[0]
    if head.isdigit():
        broom_files[int(head)] = f

if len(broom_files) >= 5:
    for i in range(1, 6):
        b = Image.open(broom_files[i]).convert('RGBA')
        bbox = b.getchannel('A').getbbox()
        if bbox:
            b = b.crop(bbox)
        b.thumbnail((300, 300), Image.LANCZOS)
        save(b, f'brooms/broom-{i}.png', optimize=True)
else:
    # 낱장 파일이 없으면 예전처럼 시트에서 자른다 (손잡이가 잘릴 수 있다)
    br = Image.open(SRC / '3. 빗자루').convert('RGBA')
    br_bg = br.getpixel((5, 5))
    bw = br.width // 5
    for i in range(5):
        cell = key_out(br.crop((i * bw, 0, (i + 1) * bw, br.height)), br_bg)
        bbox = cell.getbbox()
        cell = cell.crop(bbox)
        cell.thumbnail((260, 260), Image.LANCZOS)
        save(cell, f'brooms/broom-{i + 1}.png', optimize=True)

# ---- 꾸미기 아이템 12종 (원본 시트 4, 4×3 격자) ----
it = Image.open(SRC / '4. 꾸미기 아이템').convert('RGBA')
it_bg = it.getpixel((5, 5))
iw, ih = it.width // 4, it.height // 3
# 격자 그대로 자르면 옆 칸 그림의 끝자락이 함께 들어온다. 칸 안쪽으로 조금 물려 자른다.
# (덩어리 크기로 거르는 방법은 얇은 윤곽선으로 그린 동물 얼굴까지 지워서 쓰지 않는다)
inset_x, inset_y = int(iw * 0.06), int(ih * 0.06)
for i in range(12):
    x, y = (i % 4) * iw + inset_x, (i // 4) * ih + inset_y
    cell = key_out(it.crop((x, y, x + iw - 2 * inset_x, y + ih - 2 * inset_y)), it_bg)
    bbox = cell.getbbox()
    cell = cell.crop(bbox)
    cell.thumbnail((200, 200), Image.LANCZOS)
    save(cell, f'items/item-{i + 1}.png', optimize=True)
print('done')
