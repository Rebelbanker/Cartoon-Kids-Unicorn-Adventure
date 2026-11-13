#!/usr/bin/env python3
"""Bundle the game into single self-contained HTML files (no server, no other files needed).

  dist/unicorn-adventure.html      full page, double-click to play
  dist/unicorn-adventure.fragment.html  same page without <html>/<head>/<body>, for publishing as an Artifact
"""
import re, os
root = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(root, 'index.html'), encoding='utf-8').read()

def inline(m):
    path = os.path.join(root, m.group(1))
    code = open(path, encoding='utf-8').read()
    assert '</script' not in code.lower(), path
    return '<script>\n' + code + '\n</script>'

full = re.sub(r'<script src="([^"]+)"></script>', inline, src)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'dist', 'unicorn-adventure.html'), 'w', encoding='utf-8').write(full)

# fragment: keep <title>, <style>, body content
title = re.search(r'<title>.*?</title>', full, re.S).group(0)
style = re.search(r'<style>.*?</style>', full, re.S).group(0)
body = re.search(r'<body>(.*)</body>', full, re.S).group(1)
frag = title + '\n' + style + '\n' + body
open(os.path.join(root, 'dist', 'unicorn-adventure.fragment.html'), 'w', encoding='utf-8').write(frag)
print('full', len(full)//1024, 'KB; fragment', len(frag)//1024, 'KB')
