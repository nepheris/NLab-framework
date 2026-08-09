#!/usr/bin/env python3
import argparse, json
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description='nLab static QR generator')
    p.add_argument('config'); p.add_argument('--value'); p.add_argument('--output')
    a=p.parse_args(); cfg=json.loads(Path(a.config).read_text(encoding='utf-8'))
    try:
        import qrcode
        from qrcode.image.svg import SvgPathImage
    except ImportError as e:
        raise SystemExit('Missing dependency: pip install qrcode[pil]') from e
    data=a.value or cfg.get('source',{}).get('value') or cfg.get('data')
    if not data: raise SystemExit('QR source is empty')
    ec={'L':qrcode.constants.ERROR_CORRECT_L,'M':qrcode.constants.ERROR_CORRECT_M,'Q':qrcode.constants.ERROR_CORRECT_Q,'H':qrcode.constants.ERROR_CORRECT_H}.get(cfg.get('error_correction','M'),qrcode.constants.ERROR_CORRECT_M)
    qr=qrcode.QRCode(version=None,error_correction=ec,box_size=max(1,int(cfg.get('box_size',10))),border=max(0,int(cfg.get('quiet_zone',4))))
    qr.add_data(data); qr.make(fit=True)
    out=Path(a.output or cfg.get('output') or 'qr.svg'); out.parent.mkdir(parents=True,exist_ok=True)
    fg=cfg.get('foreground','#000000'); bg=cfg.get('background','#ffffff')
    if out.suffix.lower()=='.svg': qr.make_image(image_factory=SvgPathImage,fill_color=fg,back_color=bg).save(out)
    else: qr.make_image(fill_color=fg,back_color=bg).save(out)
    print(out)
if __name__=='__main__': main()
