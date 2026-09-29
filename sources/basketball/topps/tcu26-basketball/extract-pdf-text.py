import sys
from pypdf import PdfReader
src, dst = sys.argv[1], sys.argv[2]
r = PdfReader(src)
out = []
out.append(f"PAGES: {len(r.pages)}")
for i, pg in enumerate(r.pages):
    t = pg.extract_text() or ""
    out.append(f"===== PAGE {i+1} =====")
    out.append(t)
open(dst, "w", encoding="utf-8").write("\n".join(out))
print("ok", dst)
