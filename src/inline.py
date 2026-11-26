import base64,json
s=open('app.html').read()
three=open('node_modules/three/build/three.min.js').read()
cub=open('node_modules/cubejs/lib/cube.js').read()+'\n'+open('node_modules/cubejs/lib/solve.js').read()+'\n//@@TAIL\n'+open('worker-tail.js').read()
assert '</script' not in cub and '</script' not in three
tpl=[{'src':'data:image/jpeg;base64,'+base64.b64encode(open(f'../work/t_{n}.jpg','rb').read()).decode()} for n in ['blue','brown','orange','maroon','green']]
s=s.replace('/*THREE*/',three).replace('/*CUBEJS*/',cub).replace('/*CORE*/',open('core.js').read()).replace('/*VISION*/',open('vision.js').read()).replace('/*TEMPLATES*/',json.dumps(tpl))
open('index.html','w').write(s);print(len(s))
