#!/usr/bin/env python3
"""Собирает весь сайт в один HTML-файл, который открывается без сервера и без соседних файлов
(например, на телефоне из «Загрузок»).

Запуск: python3 tools/build-single.py [путь_к_результату]
По умолчанию результат — dist/matematika-po-shagam.html.

Как устроено: каждая страница хранится внутри файла строкой, общие скрипты и стили — один раз.
Страница показывается во встроенном фрейме (srcdoc), а переходы по ссылкам перехватываются
и подменяют содержимое фрейма. Кнопка «Назад» работает через адрес вида #/topics/limits.html.
"""
import base64
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def norm(base_dir, href):
    parts = (base_dir + '/' + href).split('/') if base_dir else href.split('/')
    out = []
    for p in parts:
        if p in ('', '.'):
            continue
        if p == '..':
            if out:
                out.pop()
        else:
            out.append(p)
    return '/'.join(out)


def katex_css():
    css = read('vendor/katex/katex.min.css')

    def font(m):
        name = m.group(1)
        path = os.path.join(ROOT, 'vendor/katex/fonts', name)
        if not os.path.exists(path):
            return 'url(data:,)'
        with open(path, 'rb') as f:
            return 'url(data:font/woff2;base64,' + base64.b64encode(f.read()).decode() + ')'

    css = re.sub(r'url\(fonts/([^)]+\.woff2)\)', font, css)
    # woff/ttf-запасные варианты не нужны: все современные браузеры понимают woff2
    css = re.sub(r',\s*url\(fonts/[^)]+\.(?:woff|ttf)\)\s*format\("[^"]+"\)', '', css)
    return css


NAV = """<script>
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  var h = a.getAttribute('href');
  if (/^(https?:|mailto:)/.test(h)) { a.target = '_blank'; a.rel = 'noopener'; return; }
  e.preventDefault();
  if (h.charAt(0) === '#') { var el = document.getElementById(decodeURIComponent(h.slice(1))); if (el) el.scrollIntoView(); return; }
  parent.postMessage({ msGo: h }, '*');
}, true);
</script>"""


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'matematika-po-shagam.html')
    pages_list = ['index.html'] + ['topics/' + f for f in sorted(os.listdir(os.path.join(ROOT, 'topics'))) if f.endswith('.html')]
    assets = {'@katex.css': katex_css()}
    pages = {}
    for page in pages_list:
        html = read(page)
        base = os.path.dirname(page)

        def css_link(m):
            p = norm(base, m.group(1))
            if p == 'vendor/katex/katex.min.css':
                key = '@katex.css'
            else:
                key = p
                assets.setdefault(key, read(p))
            return '<style>@@' + key + '@@</style>'

        def script(m):
            p = norm(base, m.group(1))
            assets.setdefault(p, read(p))
            return '<script>@@' + p + '@@</script>'

        html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_link, html)
        html = re.sub(r'<script src="([^"]+)"></script>', script, html)
        html = html.replace('</body>', NAV + '\n</body>')
        pages[page] = html

    def js(obj):
        return json.dumps(obj, ensure_ascii=False).replace('</', '<\\/')

    shell = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Математика по шагам</title>
<style>
  html, body { margin: 0; height: 100%; background: #faf8f4; }
  @media (prefers-color-scheme: dark) { html, body { background: #16181d; } }
  iframe { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; display: block; }
</style>
</head>
<body>
<iframe id="page" title="Математика по шагам"></iframe>
<script type="application/json" id="ms-assets">""" + js(assets) + """</script>
<script type="application/json" id="ms-pages">""" + js(pages) + """</script>
<script>
(function () {
  var assets = JSON.parse(document.getElementById('ms-assets').textContent);
  var pages = JSON.parse(document.getElementById('ms-pages').textContent);
  var frame = document.getElementById('page');
  var current = 'index.html';
  function resolve(href) {
    var hash = '', i = href.indexOf('#');
    if (i >= 0) { hash = href.slice(i + 1); href = href.slice(0, i); }
    var parts = (current.indexOf('/') >= 0 ? current.slice(0, current.lastIndexOf('/') + 1) : '') + href;
    var out = [];
    parts.split('/').forEach(function (p) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); });
    return { path: out.join('/') || 'index.html', hash: hash };
  }
  function build(path) {
    return pages[path].replace(/@@([^@]+)@@/g, function (m, key) { return assets[key] !== undefined ? assets[key] : m; });
  }
  function show(path, hash) {
    if (!pages[path]) path = 'index.html';
    current = path;
    frame.onload = function () {
      var d = frame.contentDocument;
      if (d && d.title) document.title = d.title;
      var el = hash && d && d.getElementById(decodeURIComponent(hash));
      if (el) el.scrollIntoView(); else if (frame.contentWindow) frame.contentWindow.scrollTo(0, 0);
    };
    frame.srcdoc = build(path);
  }
  function fromLocation() {
    var h = location.hash.replace(/^#\\/?/, '');
    if (!h) { show('index.html'); return; }
    var i = h.indexOf('#');
    show(i >= 0 ? h.slice(0, i) : h, i >= 0 ? h.slice(i + 1) : '');
  }
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data.msGo !== 'string') return;
    var r = resolve(e.data.msGo);
    var target = '#/' + r.path + (r.hash ? '#' + r.hash : '');
    if (location.hash === target) show(r.path, r.hash); else location.hash = target;
  });
  window.addEventListener('hashchange', fromLocation);
  fromLocation();
})();
</script>
</body>
</html>
"""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(shell)
    print(out_path, round(os.path.getsize(out_path) / 1024), 'КБ,', len(pages), 'страниц')


if __name__ == '__main__':
    main()
