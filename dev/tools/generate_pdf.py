#!/usr/bin/env python3
import argparse
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description='nLab static PDF generator from HTML/CSS print view')
    p.add_argument('source',help='HTML file path or URL')
    p.add_argument('output')
    a=p.parse_args()
    try:
        from weasyprint import HTML
    except ImportError as e:
        raise SystemExit('Missing dependency: pip install weasyprint') from e
    src=a.source
    html=HTML(url=src) if src.startswith(('http://','https://','file://')) else HTML(filename=str(Path(src)))
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    html.write_pdf(a.output)
    print(a.output)
if __name__=='__main__': main()
