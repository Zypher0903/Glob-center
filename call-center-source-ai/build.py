import glob
src = "\n".join(open(f, encoding="utf-8").read() for f in sorted(glob.glob('src/*.js')))
t = open('template.html', encoding="utf-8").read().replace('/*__SOURCE__*/', src.replace('</script>', '<\\/script>'))
open('call-center.html', 'w', encoding="utf-8").write(t)
print('gotovo')