@echo off
echo ============================================
echo  Campus Connect - Frontend Server
echo  Opens at: http://localhost:3000
echo ============================================
cd /d "%~dp0"
node -e "const http=require('http'),fs=require('fs'),path=require('path'),mime={'':' text/html','.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};http.createServer((req,res)=>{let f=path.join('.',req.url==='/'?'index.html':req.url);try{if(!fs.existsSync(f)){res.writeHead(404);return res.end('Not found');}const t=mime[path.extname(f)]||'text/plain';res.writeHead(200,{'Content-Type':t,'Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);}catch(e){res.writeHead(500);res.end('Error');}}).listen(3000,()=>{console.log('Frontend running at http://localhost:3000');console.log('Make sure backend is also running on port 5000!');})"
pause
