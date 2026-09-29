"""Render the Chart sheet of a workbook to PNG: hide other sheets in a temp copy, soffice -> PDF, PyMuPDF -> PNG."""
import sys, os, shutil, subprocess, tempfile, zipfile, re
import fitz  # PyMuPDF
src, out_png = sys.argv[1], sys.argv[2]
dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 220
tmpd = tempfile.mkdtemp(prefix='render_')
tmp_x = os.path.join(tmpd, 'chart_only.xlsx')
# hide every sheet except the first by editing workbook.xml directly (keeps LibreOffice's chart XML untouched)
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp_x, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == 'xl/workbook.xml':
            xml = data.decode('utf-8')
            sheets = re.findall(r'<sheet [^>]*/>', xml)
            for s in sheets[1:]:
                s2 = re.sub(r' state="[^"]*"', '', s).replace('<sheet ', '<sheet state="hidden" ', 1)
                xml = xml.replace(s, s2)
            data = xml.encode('utf-8')
        zout.writestr(item, data)
prof = tempfile.mkdtemp(prefix='lo_prof_')
env = dict(os.environ, SAL_USE_VCLPLUGIN='svp')
subprocess.run(['soffice', f'-env:UserInstallation=file://{prof}', '--headless', '--convert-to', 'pdf', tmp_x, '--outdir', tmpd],
               check=True, capture_output=True, env=env, timeout=240)
pdf = os.path.join(tmpd, 'chart_only.pdf')
doc = fitz.open(pdf)
print('pages', doc.page_count)
page = doc[0]
pix = page.get_pixmap(dpi=dpi)
pix.save(out_png)
print('saved', out_png, pix.width, pix.height)
shutil.copy(pdf, out_png.replace('.png', '.pdf'))
