# Contact sheet: python3 scripts/dev/sheet.py out.png cols scale label1=img1 ...
import sys
from PIL import Image, ImageDraw
out, cols, scale = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
items = [a.split("=", 1) for a in sys.argv[4:]]
ims = [(l, Image.open(f).convert("RGB")) for l, f in items]
w, h = int(ims[0][1].width * scale), int(ims[0][1].height * scale)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w + (cols - 1) * 6, rows * (h + 22) - 4), "#2a2a2a")
d = ImageDraw.Draw(sheet)
for i, (l, im) in enumerate(ims):
    x, y = (i % cols) * (w + 6), (i // cols) * (h + 22)
    d.text((x + 4, y + 4), l, fill="#ddd")
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + 18))
sheet.save(out)
