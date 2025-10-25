import { connect } from 'cloudflare:sockets';

// --- 硬编码配置 ---
const authToken = 'f64bdc57-0f54-4705-bf75-cfd646d98c06';
const fallbackAddress = 'ProxyIP.cmliussss.net';
const fallbackPort = '443';
const socks5Config = '';
// API地址配置
const apiBaseUrl = 'https://s.jhb.edu.kg/sub';

const directDomains = [
    { name: "cloudflare.182682.xyz", domain: "cloudflare.182682.xyz" }, 
    { name: "speed.marisalnc.com", domain: "speed.marisalnc.com" },
    { domain: "freeyx.cloudflare88.eu.org" }, { domain: "bestcf.top" }, 
    { domain: "cdn.2020111.xyz" }, { domain: "cfip.cfcdn.vip" },
    { domain: "cf.0sm.com" }, { domain: "cf.090227.xyz" }, 
    { domain: "cf.zhetengsha.eu.org" }, { domain: "cloudflare.9jy.cc" },
    { domain: "cf.zerone-cdn.pp.ua" }, { domain: "cfip.1323123.xyz" }, 
    { domain: "cnamefuckxxs.yuchen.icu" }, { domain: "cloudflare-ip.mofashi.ltd" },
    { domain: "115155.xyz" }, { domain: "cname.xirancdn.us" }, 
    { domain: "f3058171cad.002404.xyz" }, { domain: "8.889288.xyz" },
    { domain: "cdn.tzpro.xyz" }, { domain: "cf.877771.xyz" }, 
    { domain: "xn--b6gac.eu.org" }
];

const parsedSocks5Config = {};
const isSocksEnabled = false;

const E_INVALID_DATA = atob('aW52YWxpZCBkYXRh');
const E_INVALID_USER = atob('aW52YWxpZCB1c2Vy');
const E_UNSUPPORTED_CMD = atob('Y29tbWFuZCBpcyBub3Qgc3VwcG9ydGVk');
const E_UDP_DNS_ONLY = atob('VURQIHByb3h5IG9ubHkgZW5hYmxlIGZvciBETlMgd2hpY2ggaXMgcG9ydCA1Mw==');
const E_INVALID_ADDR_TYPE = atob('aW52YWxpZCBhZGRyZXNzVHlwZQ==');
const E_EMPTY_ADDR = atob('YWRkcmVzc1ZhbHVlIGlzIGVtcHR5');
const E_WS_NOT_OPEN = atob('d2ViU29ja2V0LmVhZHlTdGF0ZSBpcyBub3Qgb3Blbg==');
const E_INVALID_ID_STR = atob('U3RyaW5naWZpZWQgaWRlbnRpZmllciBpcyBpbnZhbGlk');
const E_INVALID_SOCKS_ADDR = atob('SW52YWxpZCBTT0NLUyBhZGRyZXNzIGZvcm1hdA==');
const E_SOCKS_NO_METHOD = atob('bm8gYWNjZXB0YWJsZSBtZXRob2Rz');
const E_SOCKS_AUTH_NEEDED = atob('c29ja3Mgc2VydmVyIG5lZWRzIGF1dGg=');
const E_SOCKS_AUTH_FAIL = atob('ZmFpbCB0byBhdXRoIHNvY2tzIHNlcnZlcg==');
const E_SOCKS_CONN_FAIL = atob('ZmFpbCB0byBvcGVuIHNvY2tzIGNvbm5lY3Rpb24=');

const ADDRESS_TYPE_IPV4 = 1;
const ADDRESS_TYPE_URL = 2;
const ADDRESS_TYPE_IPV6 = 3;

export default {
	async fetch(request, env, ctx) {
		try {
			const url = new URL(request.url);

			if (request.headers.get('Upgrade') === 'websocket') {
				return await handleWsRequest(request);
			} else if (request.method === 'GET') {
				if (url.pathname === '/') {
					const successHtml = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>部署成功</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background-color:#121212;color:#e0e0e0;text-align:center;}.container{padding:2rem;border-radius:8px;background-color:#1e1e1e;box-shadow:0 4px 6px rgba(0,0,0,0.1);}h1{color:#4caf50;}</style></head><body><div class="container"><h1>✅ 部署成功</h1><p>请继续后面的操作。</p></div></body></html>`;
					return new Response(successHtml, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
				}
				// 支持UUID路径：/uuid - 显示图形化界面
				if (url.pathname.length > 1 && url.pathname !== '/' && !url.pathname.includes('/sub')) {
					const uuid = url.pathname.replace(/\/$/, '').substring(1); // 移除末尾斜杠
					if (isValidFormat(uuid)) {
						if (uuid === authToken) {
							return await handleSubscriptionPage(request, uuid);
						} else {
							return new Response('UUID错误', { status: 403 });
						}
					}
				}
				// 支持UUID/sub路径：/uuid/sub - 返回订阅
				if (url.pathname.includes('/sub')) {
					const pathParts = url.pathname.split('/');
					if (pathParts.length === 2 && pathParts[1] === 'sub') {
						const uuid = pathParts[0].substring(1);
						if (isValidFormat(uuid)) {
							if (uuid === authToken) {
								return await handleSubscriptionRequest(request, uuid, url);
							} else {
								return new Response('UUID错误', { status: 403 });
							}
						}
					}
				}
				// 保持向后兼容
				if (url.pathname.toLowerCase().includes(`/${authToken}`)) {
					return await handleSubscriptionRequest(request, authToken);
				}
			}
			return new Response('Not Found', { status: 404 });
		} catch (err) {
			return new Response(err.toString(), { status: 500 });
		}
	},
};

async function handleSubscriptionPage(request, uuid = null) {
	if (!uuid) uuid = authToken;
	
	const pageHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>订阅中心</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
    <div class="fixed top-4 right-4 text-blue-400 text-sm opacity-70">代理订阅中心 v0.1</div>
    
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <div class="text-center mb-12">
            <h1 class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 mb-4">
                代理订阅中心
            </h1>
            <p class="text-blue-600 text-lg">多客户端支持 • 智能优选 • 一键生成</p>
        </div>

        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-8 mb-6 hover:shadow-xl transition-shadow duration-300">
            <h2 class="text-2xl font-semibold text-blue-700 mb-6">选择客户端</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                <button onclick="generateClientLink('clash')" 
                    class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200">
                    CLASH
                </button>
                <button onclick="generateClientLink('surge')" 
                    class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200">
                    SURGE
                </button>
                <button onclick="generateClientLink('singbox')" 
                    class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200">
                    SING-BOX
                </button>
                <button onclick="generateClientLink('loon')" 
                    class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200">
                    LOON
                </button>
                <button onclick="generateClientLink('v2ray')" 
                    class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200">
                    V2RAY
                </button>
            </div>
            <div id="clientSubscriptionUrl" class="hidden mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg break-all text-sm text-blue-800 font-mono"></div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-8 mb-6 hover:shadow-xl transition-shadow duration-300">
            <h2 class="text-2xl font-semibold text-blue-700 mb-6">快速获取</h2>
            <button onclick="getBase64Subscription()" 
                class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200">
                获取订阅链接
            </button>
            <div id="base64SubscriptionUrl" class="hidden mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg break-all text-sm text-blue-800 font-mono"></div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-8 hover:shadow-xl transition-shadow duration-300">
            <h2 class="text-2xl font-semibold text-blue-700 mb-6">相关链接</h2>
            <div class="flex flex-wrap justify-center gap-6">
                <a href="https://github.com/byJoey/cfnew" target="_blank" 
                    class="text-blue-600 hover:text-blue-800 font-medium text-lg hover:underline transition-colors duration-200">
                    GitHub 项目
                </a>
                <a href="https://www.youtube.com/@joeyblog" target="_blank" 
                    class="text-blue-600 hover:text-blue-800 font-medium text-lg hover:underline transition-colors duration-200">
                    YouTube @joeyblog
                </a>
            </div>
        </div>
    </div>
    <script>
        function generateClientLink(clientType) {
            var currentUrl = window.location.href;
            var subscriptionUrl = currentUrl + "/sub";
            var element = document.getElementById("clientSubscriptionUrl");
            
            // V2RAY 不需要转换，直接返回原始订阅
            if (clientType === 'v2ray') {
                element.textContent = subscriptionUrl;
                element.classList.remove('hidden');
                navigator.clipboard.writeText(subscriptionUrl).then(function() {
                    alert("V2Ray 订阅链接已复制");
                });
            } else {
                // 其他客户端需要通过API转换
                var encodedUrl = encodeURIComponent(subscriptionUrl);
                var apiUrl = "https://s.jhb.edu.kg/sub?target=" + clientType + "&url=" + encodedUrl + "&insert=false";
                element.textContent = apiUrl;
                element.classList.remove('hidden');
                navigator.clipboard.writeText(apiUrl).then(function() {
                    var displayName = clientType.toUpperCase();
                    if (clientType === 'surge') displayName = 'SURGE';
                    if (clientType === 'singbox') displayName = 'SING-BOX';
                    alert(displayName + " 订阅链接已复制");
                });
            }
        }
        function getBase64Subscription() {
            var currentUrl = window.location.href;
            var subscriptionUrl = currentUrl + "/sub";
            var element = document.getElementById("base64SubscriptionUrl");
            
            // 直接获取Base64订阅内容
            fetch(subscriptionUrl)
                .then(function(response) {
                    return response.text();
                })
                .then(function(base64Content) {
                    element.textContent = base64Content;
                    element.classList.remove('hidden');
                    navigator.clipboard.writeText(base64Content).then(function() {
                        alert("Base64订阅内容已复制");
                    });
                })
                .catch(function(error) {
                    console.error("获取订阅失败:", error);
                    alert("获取订阅失败，请重试");
                });
        }
    </script>
</body>
</html>`;
	
	return new Response(pageHtml, { 
		status: 200, 
		headers: { 'Content-Type': 'text/html; charset=utf-8' } 
	});
}

async function handleSubscriptionRequest(request, uuid, url = null) {
    if (!url) url = new URL(request.url);
    
    const finalLinks = [];
    const workerDomain = url.hostname;
    const target = url.searchParams.get('target') || 'base64';

    const nativeList = [{ ip: workerDomain, isp: '原生地址' }];
    finalLinks.push(...generateLinksFromSource(nativeList, uuid, workerDomain));

    const domainList = directDomains.map(d => ({ ip: d.domain, isp: d.name || d.domain }));
    finalLinks.push(...generateLinksFromSource(domainList, uuid, workerDomain));

    const dynamicIPList = await fetchDynamicIPs();
    if (dynamicIPList.length > 0) {
        finalLinks.push(...generateLinksFromSource(dynamicIPList, uuid, workerDomain));
    }

    const newIPList = await fetchAndParseNewIPs();
    if (newIPList.length > 0) {
        finalLinks.push(...generateLinksFromNewIPs(newIPList, uuid, workerDomain));
    }

    if (finalLinks.length === 0) {
        const errorRemark = "所有节点获取失败";
        const errorLink = `vless://00000000-0000-0000-0000-000000000000@127.0.0.1:80?encryption=none&security=none&type=ws&host=error.com&path=%2F#${encodeURIComponent(errorRemark)}`;
        finalLinks.push(errorLink);
    }

    let subscriptionContent;
    let contentType = 'text/plain; charset=utf-8';
    
    switch (target.toLowerCase()) {
        case 'clash':
        case 'clashr':
            subscriptionContent = await generateClashConfig(finalLinks);
            contentType = 'text/yaml; charset=utf-8';
            break;
        case 'surge2':
        case 'surge3':
        case 'surge4':
            subscriptionContent = generateSurgeConfig(finalLinks);
            break;
        case 'quantumult':
        case 'quantumultx':
            subscriptionContent = generateQuantumultConfig(finalLinks);
            break;
        case 'ss':
        case 'ssr':
            subscriptionContent = generateSSConfig(finalLinks);
            break;
        case 'v2ray':
            subscriptionContent = generateV2RayConfig(finalLinks);
            break;
        case 'loon':
            subscriptionContent = generateLoonConfig(finalLinks);
            break;
        default:
            subscriptionContent = btoa(finalLinks.join('\n'));
    }
    
    return new Response(subscriptionContent, {
        headers: { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
    });
}

function generateLinksFromSource(list, uuid, workerDomain) {
    const httpsPorts = [443];
    const httpPorts = [80];
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const proto = 'vless';

    list.forEach(item => {
        const nodeNameBase = item.isp.replace(/\s/g, '_');
        const safeIP = item.ip.includes(':') ? `[${item.ip}]` : item.ip;

        httpsPorts.forEach(port => {
            const wsNodeName = `${nodeNameBase}-${port}-WS-TLS`;
            const wsParams = new URLSearchParams({ 
                encryption: 'none', 
                security: 'tls', 
                sni: workerDomain, 
                fp: 'randomized', 
                type: 'ws', 
                host: workerDomain, 
                path: wsPath 
            });
            links.push(`${proto}://${uuid}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
        });

        httpPorts.forEach(port => {
            const wsNodeName = `${nodeNameBase}-${port}-WS`;
            const wsParams = new URLSearchParams({
                encryption: 'none',
                security: 'none',
                type: 'ws',
                host: workerDomain,
                path: wsPath
            });
            links.push(`${proto}://${uuid}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
        });
    });
    return links;
}

async function fetchDynamicIPs() {
    const fallbackUrl = "https://stock.hostmonit.com/CloudFlareYes";
    try {
        const response = await fetch(fallbackUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return [];
        const html = await response.text();
        const results = [];
        const rowRegex = /<tr><td>([\d.:a-fA-F]+)<\/td><td>.*?<\/td><td>.*?<\/td><td>.*?<\/td><td>(.*?)<\/td>.*?<\/tr>/g;
        
        let match;
        while ((match = rowRegex.exec(html)) !== null) {
            if (match[1] && match[2]) {
                results.push({
                    ip: match[1].trim(),
                    isp: match[2].trim().replace(/\s/g, '')
                });
            }
        }
        return results;
    } catch (e) {
        return [];
    }
}

async function fetchAndParseNewIPs() {
    const url = "https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt";
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const text = await response.text();
        const results = [];
        const lines = text.trim().replace(/\r/g, "").split('\n');
        const regex = /^([^:]+):(\d+)#(.*)$/;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            const match = trimmedLine.match(regex);
            if (match) {
                results.push({
                    ip: match[1],
                    port: parseInt(match[2], 10),
                    name: match[3].trim() || match[1]
                });
            }
        }
        return results;
    } catch (error) {
        return [];
    }
}

function generateLinksFromNewIPs(list, uuid, workerDomain) {
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const proto = 'vless';

    list.forEach(item => {
        const nodeName = item.name;
        const safeIP = item.ip.includes(':') ? `[${item.ip}]` : item.ip;
        const params = {
            encryption: 'none',
            security: 'tls',
            sni: workerDomain,
            fp: 'randomized',
            type: 'ws',
            host: workerDomain,
            path: wsPath
        };
        const wsParams = new URLSearchParams(params);
        links.push(`${proto}://${uuid}@${safeIP}:${item.port}?${wsParams.toString()}#${encodeURIComponent(nodeName)}`);
    });
    return links;
}

// 简化的客户端格式生成函数
async function generateClashConfig(links) {
    const config = {
        port: 7890,
        'socks-port': 7891,
        mode: 'rule',
        proxies: [],
        'proxy-groups': [
            { name: 'PROXY', type: 'select', proxies: ['auto'] },
            { name: 'auto', type: 'url-test', proxies: [], url: 'http://www.gstatic.com/generate_204', interval: 300 }
        ],
        rules: ['GEOIP,CN,DIRECT', 'MATCH,PROXY']
    };
    
    for (const link of links) {
        if (link.startsWith('vless://')) {
            const proxy = parseVlessLink(link);
            if (proxy) {
                config.proxies.push(proxy);
                config['proxy-groups'][1].proxies.push(proxy.name);
            }
        }
    }
    
    return JSON.stringify(config, null, 2);
}

function parseVlessLink(link) {
    try {
        const url = new URL(link);
        const params = new URLSearchParams(url.search);
        const name = decodeURIComponent(url.hash.substring(1));
        
        return {
            name: name,
            type: 'vless',
            server: url.hostname,
            port: parseInt(url.port),
            uuid: url.username,
            network: params.get('type') || 'ws',
            tls: params.get('security') === 'tls',
            'ws-opts': {
                path: params.get('path') || '/',
                headers: { Host: params.get('host') || url.hostname }
            }
        };
    } catch (e) {
        return null;
    }
}

function generateSurgeConfig(links) {
    let config = `[General]
loglevel = notify
dns-server = 8.8.8.8, 1.1.1.1

[Proxy]`;

    for (const link of links) {
        if (link.startsWith('vless://')) {
            const proxy = parseVlessForSurge(link);
            if (proxy) config += `\n${proxy}`;
        }
    }

    config += `\n\n[Proxy Group]
节点选择 = select, auto
auto = url-test, `;

    const nodeNames = [];
    for (const link of links) {
        if (link.startsWith('vless://')) {
            const name = decodeURIComponent(link.split('#')[1] || '节点');
            nodeNames.push(name);
        }
    }
    config += nodeNames.join(', ');

    config += `\nurl = http://www.gstatic.com/generate_204
interval = 300

[Rule]
GEOIP,CN,DIRECT
FINAL,节点选择`;

    return config;
}

function parseVlessForSurge(link) {
    try {
        const url = new URL(link);
        const params = new URLSearchParams(url.search);
        const name = decodeURIComponent(url.hash.substring(1));
        return `${name} = vless, ${url.hostname}, ${url.port}, username=${url.username}, ws=true, ws-path=${params.get('path') || '/'}, ws-headers=host:${params.get('host') || url.hostname}`;
    } catch (e) {
        return null;
    }
}

function generateQuantumultConfig(links) {
    let config = `[general]
server_remote = `;
    for (const link of links) {
        if (link.startsWith('vless://')) {
            config += `${link}, `;
        }
    }
    config += `\n\n[policy]
static = 节点选择, `;
    
    const nodeNames = [];
    for (const link of links) {
        if (link.startsWith('vless://')) {
            const name = decodeURIComponent(link.split('#')[1] || '节点');
            nodeNames.push(name);
        }
    }
    config += nodeNames.join(', ');
    config += `\n\n[filter]
FINAL, 节点选择`;
    
    return config;
}

function generateSSConfig(links) {
    let config = `[General]
loglevel = notify

[Proxy]`;
    for (const link of links) {
        if (link.startsWith('vless://')) {
            const url = new URL(link);
            const name = decodeURIComponent(url.hash.substring(1));
            config += `\n${name} = vless, ${url.hostname}, ${url.port}, ${url.username}`;
        }
    }
    return config;
}

function generateV2RayConfig(links) {
    return btoa(links.join('\n'));
}

function generateLoonConfig(links) {
    let config = `[General]
skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12
dns-server = 8.8.8.8, 1.1.1.1

[Proxy]`;
    for (const link of links) {
        if (link.startsWith('vless://')) {
            const url = new URL(link);
            const params = new URLSearchParams(url.search);
            const name = decodeURIComponent(url.hash.substring(1));
            config += `\n${name} = vless, ${url.hostname}, ${url.port}, username=${url.username}, ws=true, ws-path=${params.get('path') || '/'}, ws-headers=host:${params.get('host') || url.hostname}`;
        }
    }
    return config;
}

// WebSocket处理函数（简化版）
async function handleWsRequest(request) {
    const wsPair = new WebSocketPair();
    const [clientSock, serverSock] = Object.values(wsPair);
    serverSock.accept();

    let remoteConnWrapper = { socket: null };
    let isDnsQuery = false;

    const earlyData = request.headers.get('sec-websocket-protocol') || '';
    const readable = makeReadableStream(serverSock, earlyData);

    readable.pipeTo(new WritableStream({
        async write(chunk) {
            if (isDnsQuery) return await forwardUDP(chunk, serverSock, null);
            if (remoteConnWrapper.socket) {
                const writer = remoteConnWrapper.socket.writable.getWriter();
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }
            const { hasError, message, addressType, port, hostname, rawIndex, version, isUDP } = parseWsPacketHeader(chunk, authToken);
            if (hasError) throw new Error(message);

            if (isUDP) {
                if (port === 53) isDnsQuery = true;
                else throw new Error(E_UDP_DNS_ONLY);
            }
            const respHeader = new Uint8Array([version[0], 0]);
            const rawData = chunk.slice(rawIndex);

            if (isDnsQuery) return forwardUDP(rawData, serverSock, respHeader);
            await forwardTCP(addressType, hostname, port, rawData, serverSock, respHeader, remoteConnWrapper);
        },
    })).catch((err) => { console.log('WS Stream Error:', err); });

    return new Response(null, { status: 101, webSocket: clientSock });
}

async function forwardTCP(addrType, host, portNum, rawData, ws, respHeader, remoteConnWrapper) {
    async function connectAndSend(address, port) {
        const remoteSock = connect({ hostname: address, port: port });
        const writer = remoteSock.writable.getWriter();
        await writer.write(rawData);
        writer.releaseLock();
        return remoteSock;
    }
    async function retryConnection() {
        const newSocket = await connectAndSend(fallbackAddress || host, parseInt(fallbackPort, 10) || portNum);
        remoteConnWrapper.socket = newSocket;
        newSocket.closed.catch(() => {}).finally(() => closeSocketQuietly(ws));
        connectStreams(newSocket, ws, respHeader, null);
    }
    try {
        const initialSocket = await connectAndSend(host, portNum);
        remoteConnWrapper.socket = initialSocket;
        connectStreams(initialSocket, ws, respHeader, retryConnection);
    } catch (err) {
        console.log('Initial connection failed, trying fallback:', err);
        retryConnection();
    }
}

function parseWsPacketHeader(chunk, token) {
	if (chunk.byteLength < 24) return { hasError: true, message: E_INVALID_DATA };
	const version = new Uint8Array(chunk.slice(0, 1));
	if (formatIdentifier(new Uint8Array(chunk.slice(1, 17))) !== token) return { hasError: true, message: E_INVALID_USER };
	const optLen = new Uint8Array(chunk.slice(17, 18))[0];
	const cmd = new Uint8Array(chunk.slice(18 + optLen, 19 + optLen))[0];
	let isUDP = false;
	if (cmd === 1) {} else if (cmd === 2) { isUDP = true; } else { return { hasError: true, message: E_UNSUPPORTED_CMD }; }
	const portIdx = 19 + optLen;
	const port = new DataView(chunk.slice(portIdx, portIdx + 2)).getUint16(0);
	let addrIdx = portIdx + 2, addrLen = 0, addrValIdx = addrIdx + 1, hostname = '';
	const addressType = new Uint8Array(chunk.slice(addrIdx, addrValIdx))[0];
	switch (addressType) {
		case ADDRESS_TYPE_IPV4: addrLen = 4; hostname = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + addrLen)).join('.'); break;
		case ADDRESS_TYPE_URL: addrLen = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + 1))[0]; addrValIdx += 1; hostname = new TextDecoder().decode(chunk.slice(addrValIdx, addrValIdx + addrLen)); break;
		case ADDRESS_TYPE_IPV6: addrLen = 16; const ipv6 = []; const ipv6View = new DataView(chunk.slice(addrValIdx, addrValIdx + addrLen)); for (let i = 0; i < 8; i++) ipv6.push(ipv6View.getUint16(i * 2).toString(16)); hostname = ipv6.join(':'); break;
		default: return { hasError: true, message: `${E_INVALID_ADDR_TYPE}: ${addressType}` };
	}
	if (!hostname) return { hasError: true, message: `${E_EMPTY_ADDR}: ${addressType}` };
	return { hasError: false, addressType, port, hostname, isUDP, rawIndex: addrValIdx + addrLen, version };
}

function makeReadableStream(socket, earlyDataHeader) {
	let cancelled = false;
	return new ReadableStream({
		start(controller) {
			socket.addEventListener('message', (event) => { if (!cancelled) controller.enqueue(event.data); });
			socket.addEventListener('close', () => { if (!cancelled) { closeSocketQuietly(socket); controller.close(); } });
			socket.addEventListener('error', (err) => controller.error(err));
			const { earlyData, error } = base64ToArray(earlyDataHeader);
			if (error) controller.error(error); else if (earlyData) controller.enqueue(earlyData);
		},
		cancel() { cancelled = true; closeSocketQuietly(socket); }
	});
}

async function connectStreams(remoteSocket, webSocket, headerData, retryFunc) {
	let header = headerData, hasData = false;
	await remoteSocket.readable.pipeTo(
		new WritableStream({
			async write(chunk, controller) {
				hasData = true;
				if (webSocket.readyState !== 1) controller.error(E_WS_NOT_OPEN);
				if (header) { webSocket.send(await new Blob([header, chunk]).arrayBuffer()); header = null; } 
                else { webSocket.send(chunk); }
			},
			abort(reason) { console.error("Readable aborted:", reason); },
		})
	).catch((error) => { console.error("Stream connection error:", error); closeSocketQuietly(webSocket); });
	if (!hasData && retryFunc) retryFunc();
}

async function forwardUDP(udpChunk, webSocket, respHeader) {
	try {
		const tcpSocket = connect({ hostname: '8.8.4.4', port: 53 });
		let vlessHeader = respHeader;
		const writer = tcpSocket.writable.getWriter();
		await writer.write(udpChunk);
		writer.releaseLock();
		await tcpSocket.readable.pipeTo(new WritableStream({
			async write(chunk) {
				if (webSocket.readyState === 1) {
					if (vlessHeader) { webSocket.send(await new Blob([vlessHeader, chunk]).arrayBuffer()); vlessHeader = null; } 
                    else { webSocket.send(chunk); }
				}
			},
		}));
	} catch (error) { console.error(`DNS forward error: ${error.message}`); }
}

function base64ToArray(b64Str) {
    if (!b64Str) return { error: null };
    try { b64Str = b64Str.replace(/-/g, '+').replace(/_/g, '/'); return { earlyData: Uint8Array.from(atob(b64Str), (c) => c.charCodeAt(0)).buffer, error: null }; } 
    catch (error) { return { error }; }
}

function isValidFormat(uuid) { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid); }

function closeSocketQuietly(socket) { try { if (socket.readyState === 1 || socket.readyState === 2) socket.close(); } catch (error) {} }

const hexTable = Array.from({ length: 256 }, (v, i) => (i + 256).toString(16).slice(1));

function formatIdentifier(arr, offset = 0) {
    const id = (hexTable[arr[offset]]+hexTable[arr[offset+1]]+hexTable[arr[offset+2]]+hexTable[arr[offset+3]]+"-"+hexTable[arr[offset+4]]+hexTable[arr[offset+5]]+"-"+hexTable[arr[offset+6]]+hexTable[arr[offset+7]]+"-"+hexTable[arr[offset+8]]+hexTable[arr[offset+9]]+"-"+hexTable[arr[offset+10]]+hexTable[arr[offset+11]]+hexTable[arr[offset+12]]+hexTable[arr[offset+13]]+hexTable[arr[offset+14]]+hexTable[arr[offset+15]]).toLowerCase();
    if (!isValidFormat(id)) throw new TypeError(E_INVALID_ID_STR);
    return id;
}
