import { connect } from 'cloudflare:sockets';

let authToken = '351c9981-04b6-4103-aa4b-864aa9c91469';
let fallbackAddress = '';
let fallbackPort = '443';
let socks5Config = '';
let customPreferredIPs = [];
let customPreferredDomains = [];
let enableSocksDowngrade = false;
let disableNonTLS = false;
let disablePreferred = false;

let enableRegionMatching = true;
let currentWorkerRegion = '';
let manualWorkerRegion = '';
let preferredIPsURL = '';

// KV存储相关变量
let kvStore = null;
let kvConfig = {};

const regionMapping = {
    'US': ['🇺🇸 美国', 'US', 'United States'],
    'SG': ['🇸🇬 新加坡', 'SG', 'Singapore'],
    'JP': ['🇯🇵 日本', 'JP', 'Japan'],
    'HK': ['🇭🇰 香港', 'HK', 'Hong Kong'],
    'KR': ['🇰🇷 韩国', 'KR', 'South Korea'],
    'DE': ['🇩🇪 德国', 'DE', 'Germany'],
    'SE': ['🇸🇪 瑞典', 'SE', 'Sweden'],
    'NL': ['🇳🇱 荷兰', 'NL', 'Netherlands'],
    'FI': ['🇫🇮 芬兰', 'FI', 'Finland'],
    'GB': ['🇬🇧 英国', 'GB', 'United Kingdom'],
    'Oracle': ['甲骨文', 'Oracle'],
    'DigitalOcean': ['数码海', 'DigitalOcean'],
    'Vultr': ['Vultr', 'Vultr'],
    'Multacom': ['Multacom', 'Multacom']
};

let backupIPs = [
    { domain: 'ProxyIP.US.CMLiussss.net', region: 'US', regionCode: 'US', port: 443 },
    { domain: 'ProxyIP.SG.CMLiussss.net', region: 'SG', regionCode: 'SG', port: 443 },
    { domain: 'ProxyIP.JP.CMLiussss.net', region: 'JP', regionCode: 'JP', port: 443 },
    { domain: 'ProxyIP.HK.CMLiussss.net', region: 'HK', regionCode: 'HK', port: 443 },
    { domain: 'ProxyIP.KR.CMLiussss.net', region: 'KR', regionCode: 'KR', port: 443 },
    { domain: 'ProxyIP.DE.CMLiussss.net', region: 'DE', regionCode: 'DE', port: 443 },
    { domain: 'ProxyIP.SE.CMLiussss.net', region: 'SE', regionCode: 'SE', port: 443 },
    { domain: 'ProxyIP.NL.CMLiussss.net', region: 'NL', regionCode: 'NL', port: 443 },
    { domain: 'ProxyIP.FI.CMLiussss.net', region: 'FI', regionCode: 'FI', port: 443 },
    { domain: 'ProxyIP.GB.CMLiussss.net', region: 'GB', regionCode: 'GB', port: 443 },
    { domain: 'ProxyIP.Oracle.cmliussss.net', region: 'Oracle', regionCode: 'Oracle', port: 443 },
    { domain: 'ProxyIP.DigitalOcean.CMLiussss.net', region: 'DigitalOcean', regionCode: 'DigitalOcean', port: 443 },
    { domain: 'ProxyIP.Vultr.CMLiussss.net', region: 'Vultr', regionCode: 'Vultr', port: 443 },
    { domain: 'ProxyIP.Multacom.CMLiussss.net', region: 'Multacom', regionCode: 'Multacom', port: 443 }
];

const directDomains = [
    { name: "cloudflare.182682.xyz", domain: "cloudflare.182682.xyz" }, { name: "speed.marisalnc.com", domain: "speed.marisalnc.com" },
    { domain: "freeyx.cloudflare88.eu.org" }, { domain: "bestcf.top" }, { domain: "cdn.2020111.xyz" }, { domain: "cfip.cfcdn.vip" },
    { domain: "cf.0sm.com" }, { domain: "cf.090227.xyz" }, { domain: "cf.zhetengsha.eu.org" }, { domain: "cloudflare.9jy.cc" },
    { domain: "cf.zerone-cdn.pp.ua" }, { domain: "cfip.1323123.xyz" }, { domain: "cnamefuckxxs.yuchen.icu" }, { domain: "cloudflare-ip.mofashi.ltd" },
    { domain: "115155.xyz" }, { domain: "cname.xirancdn.us" }, { domain: "f3058171cad.002404.xyz" }, { domain: "8.889288.xyz" },
    { domain: "cdn.tzpro.xyz" }, { domain: "cf.877771.xyz" }, { domain: "xn--b6gac.eu.org" }
];

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

let parsedSocks5Config = {};
let isSocksEnabled = false;

const ADDRESS_TYPE_IPV4 = 1;
const ADDRESS_TYPE_URL = 2;
const ADDRESS_TYPE_IPV6 = 3;

function isValidFormat(str) {
    const userRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return userRegex.test(str);
}

function isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) return true;
    
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) return true;
    
    const ipv6ShortRegex = /^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
    if (ipv6ShortRegex.test(ip)) return true;
    
    return false;
}

// KV存储相关函数
async function initKVStore(env) {
    if (env.C) {
        try {
            kvStore = env.C;
            await loadKVConfig();
        } catch (error) {
            console.error('KV初始化失败，将禁用KV功能:', error);
            kvStore = null;
        }
    }
}

async function loadKVConfig() {
    if (!kvStore) return;
    
    try {
        const configData = await kvStore.get('c');
        if (configData) {
            kvConfig = JSON.parse(configData);
        }
    } catch (error) {
        console.error('加载KV配置失败:', error);
        kvConfig = {};
    }
}

async function saveKVConfig() {
    if (!kvStore) return;
    
    try {
        await kvStore.put('c', JSON.stringify(kvConfig));
    } catch (error) {
        console.error('保存KV配置失败:', error);
    }
}

function getConfigValue(key, defaultValue = '') {
    // 优先使用KV配置，然后使用环境变量
    if (kvConfig[key] !== undefined) {
        return kvConfig[key];
    }
    return defaultValue;
}

async function setConfigValue(key, value) {
    kvConfig[key] = value;
    await saveKVConfig();
}

async function detectWorkerRegion(request) {
    try {
        const cfCountry = request.cf?.country;
        
        if (cfCountry) {
            const countryToRegion = {
                'US': 'US', 'SG': 'SG', 'JP': 'JP', 'HK': 'HK', 'KR': 'KR',
                'DE': 'DE', 'SE': 'SE', 'NL': 'NL', 'FI': 'FI', 'GB': 'GB',
                'CN': 'HK', 'TW': 'HK', 'AU': 'SG', 'CA': 'US',
                'FR': 'DE', 'IT': 'DE', 'ES': 'DE', 'CH': 'DE',
                'AT': 'DE', 'BE': 'NL', 'DK': 'SE', 'NO': 'SE', 'IE': 'GB'
            };
            
            if (countryToRegion[cfCountry]) {
                return countryToRegion[cfCountry];
            }
        }
        
        return 'HK';
        
    } catch (error) {
        return 'HK';
    }
}


async function checkIPAvailability(domain, port = 443, timeout = 2000) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`https://${domain}`, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CF-IP-Checker/1.0)'
            }
        });
        
        clearTimeout(timeoutId);
        return response.status < 500;
    } catch (error) {
        return true;
    }
}

async function getBestBackupIP(workerRegion = '') {
    
    if (backupIPs.length === 0) {
        return null;
    }
    
    const availableIPs = backupIPs.map(ip => ({ ...ip, available: true }));
    
    if (enableRegionMatching && workerRegion) {
        const sortedIPs = getSmartRegionSelection(workerRegion, availableIPs);
        if (sortedIPs.length > 0) {
            const selectedIP = sortedIPs[0];
            return selectedIP;
        }
    }
    
    const selectedIP = availableIPs[0];
    return selectedIP;
}

function getNearbyRegions(region) {
    const nearbyMap = {
        'US': ['SG', 'JP', 'HK', 'KR'], // 美国 -> 亚太地区
        'SG': ['JP', 'HK', 'KR', 'US'], // 新加坡 -> 亚太地区
        'JP': ['SG', 'HK', 'KR', 'US'], // 日本 -> 亚太地区
        'HK': ['SG', 'JP', 'KR', 'US'], // 香港 -> 亚太地区
        'KR': ['JP', 'HK', 'SG', 'US'], // 韩国 -> 亚太地区
        'DE': ['NL', 'GB', 'SE', 'FI'], // 德国 -> 欧洲地区
        'SE': ['DE', 'NL', 'FI', 'GB'], // 瑞典 -> 北欧地区
        'NL': ['DE', 'GB', 'SE', 'FI'], // 荷兰 -> 西欧地区
        'FI': ['SE', 'DE', 'NL', 'GB'], // 芬兰 -> 北欧地区
        'GB': ['DE', 'NL', 'SE', 'FI']  // 英国 -> 西欧地区
    };
    
    return nearbyMap[region] || [];
}

function getAllRegionsByPriority(region) {
    const nearbyRegions = getNearbyRegions(region);
    const allRegions = ['US', 'SG', 'JP', 'HK', 'KR', 'DE', 'SE', 'NL', 'FI', 'GB'];
    
    return [region, ...nearbyRegions, ...allRegions.filter(r => r !== region && !nearbyRegions.includes(r))];
}

function getSmartRegionSelection(workerRegion, availableIPs) {
    
    if (!enableRegionMatching || !workerRegion) {
        return availableIPs;
    }
    
    const priorityRegions = getAllRegionsByPriority(workerRegion);
    
    const sortedIPs = [];
    
    for (const region of priorityRegions) {
        const regionIPs = availableIPs.filter(ip => ip.regionCode === region);
        sortedIPs.push(...regionIPs);
    }
    
    return sortedIPs;
}

function parseAddressAndPort(input) {
    if (input.includes('[') && input.includes(']')) {
        const match = input.match(/^\[([^\]]+)\](?::(\d+))?$/);
        if (match) {
            return {
                address: match[1],
                port: match[2] ? parseInt(match[2], 10) : null
            };
        }
    }
    
    const lastColonIndex = input.lastIndexOf(':');
    if (lastColonIndex > 0) {
        const address = input.substring(0, lastColonIndex);
        const portStr = input.substring(lastColonIndex + 1);
        const port = parseInt(portStr, 10);
        
        if (!isNaN(port) && port > 0 && port <= 65535) {
            return { address, port };
        }
    }
    
    return { address: input, port: null };
}

export default {
	async fetch(request, env, ctx) {
		try {
			// 初始化KV存储
			await initKVStore(env);
			
			authToken = (env.u || env.U || authToken).toLowerCase();
			const subPath = (env.d || env.D || authToken).toLowerCase();
			
			const customIP = getConfigValue('p', env.p || env.P);
			let useCustomIP = false;
			
			// 检查是否手动指定了wk地区 (优先使用KV配置)
			const manualRegion = getConfigValue('wk', env.wk || env.WK);
			if (manualRegion && manualRegion.trim()) {
				manualWorkerRegion = manualRegion.trim().toUpperCase();
				currentWorkerRegion = manualWorkerRegion;
			} else if (customIP && customIP.trim()) {
				useCustomIP = true;
				currentWorkerRegion = 'CUSTOM';
			} else {
				currentWorkerRegion = await detectWorkerRegion(request);
			}
			
			const regionMatchingControl = env.rm || env.RM;
			if (regionMatchingControl && regionMatchingControl.toLowerCase() === 'no') {
				enableRegionMatching = false;
			}
			
			const envFallback = getConfigValue('p', env.p || env.P);
			if (envFallback) {
				const fallbackValue = envFallback.toLowerCase();
				if (fallbackValue.includes(']:')) {
					const lastColonIndex = fallbackValue.lastIndexOf(':');
					fallbackPort = fallbackValue.slice(lastColonIndex + 1);
					fallbackAddress = fallbackValue.slice(0, lastColonIndex);
				} else if (!fallbackValue.includes(']:') && !fallbackValue.includes(']')) {
					[fallbackAddress, fallbackPort = '443'] = fallbackValue.split(':');
				} else {
					fallbackAddress = fallbackValue;
					fallbackPort = '443';
				}
			}

			socks5Config = getConfigValue('s', env.s || env.S) || socks5Config;
			if (socks5Config) {
				try {
					parsedSocks5Config = parseSocksConfig(socks5Config);
					isSocksEnabled = true;
				} catch (err) {
					isSocksEnabled = false;
				}
			}

			// 优先使用KV配置，然后使用环境变量
			const customPreferred = getConfigValue('yx', env.yx || env.YX);
			if (customPreferred) {
				try {
					const preferredList = customPreferred.split(',').map(item => item.trim()).filter(item => item);
					customPreferredIPs = [];
					customPreferredDomains = [];
					
					preferredList.forEach(item => {
						// 检查是否包含节点名称 (#)
						let nodeName = '';
						let addressPart = item;
						
						if (item.includes('#')) {
							const parts = item.split('#');
							addressPart = parts[0].trim();
							nodeName = parts[1].trim();
						}
						
						const { address, port } = parseAddressAndPort(addressPart);
						
						// 如果没有设置节点名称，使用默认格式
						if (!nodeName) {
							nodeName = '自定义优选-' + address + (port ? ':' + port : '');
						}
						
						if (isValidIP(address)) {
							customPreferredIPs.push({ 
								ip: address, 
								port: port,
								isp: nodeName
							});
						} else {
							customPreferredDomains.push({ 
								domain: address, 
								port: port,
								name: nodeName
							});
						}
					});
				} catch (err) {
					customPreferredIPs = [];
					customPreferredDomains = [];
				}
			}

			const downgradeControl = env.qj || env.QJ;
			if (downgradeControl && downgradeControl.toLowerCase() === 'no') {
				enableSocksDowngrade = true;
			}

			// 优先使用KV配置，然后使用环境变量
			const dkbyControl = getConfigValue('dkby', env.dkby || env.DKBY);
			if (dkbyControl && dkbyControl.toLowerCase() === 'yes') {
				disableNonTLS = true;
			}

			const yxbyControl = env.yxby || env.YXBY;
			if (yxbyControl && yxbyControl.toLowerCase() === 'yes') {
				disablePreferred = true;
			}

			// 优先使用KV配置，然后使用环境变量，如果都没有则使用默认URL
			preferredIPsURL = getConfigValue('yxURL', env.yxURL || env.YXURL) || 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
			
			// 如果yxURL不是默认值，清空内置优选IP和域名
			const defaultURL = 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
			if (preferredIPsURL !== defaultURL) {
				backupIPs = [];
				directDomains.length = 0;
				customPreferredIPs = [];
				customPreferredDomains = [];
			}

			const url = new URL(request.url);

			if (request.headers.get('Upgrade') === 'websocket') {
				return await handleWsRequest(request);
			}
			
			// 配置管理API路由（支持GET和POST）
			if (url.pathname.includes('/api/config')) {
				const pathParts = url.pathname.split('/').filter(p => p);
				// 查找UUID - 应该在 api 之前
				const apiIndex = pathParts.indexOf('api');
				if (apiIndex > 0) {
					const user = pathParts[apiIndex - 1];
					if (isValidFormat(user) && user === authToken) {
						return await handleConfigAPI(request);
					} else if (isValidFormat(user)) {
						return new Response(JSON.stringify({ error: 'UUID错误' }), { 
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				// 如果路径格式不正确，返回JSON错误
				return new Response(JSON.stringify({ error: '无效的API路径' }), { 
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			// 优选IP管理API路由
			if (url.pathname.includes('/api/preferred-ips')) {
				const pathParts = url.pathname.split('/').filter(p => p);
				// 查找UUID - 应该在 api 之前
				const apiIndex = pathParts.indexOf('api');
				if (apiIndex > 0) {
					const user = pathParts[apiIndex - 1];
					if (isValidFormat(user) && user === authToken) {
						return await handlePreferredIPsAPI(request);
					} else if (isValidFormat(user)) {
						return new Response(JSON.stringify({ error: 'UUID错误' }), { 
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				// 如果路径格式不正确，返回JSON错误
				return new Response(JSON.stringify({ error: '无效的API路径' }), { 
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			if (request.method === 'GET') {
				if (url.pathname === '/region') {
					// 优先使用KV配置，然后使用环境变量
					const customIP = getConfigValue('p', env.p || env.P);
					const manualRegion = getConfigValue('wk', env.wk || env.WK);
					
					if (manualRegion && manualRegion.trim()) {
						return new Response(JSON.stringify({
							region: manualRegion.trim().toUpperCase(),
							detectionMethod: '手动指定地区',
							manualRegion: manualRegion.trim().toUpperCase(),
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					} else if (customIP && customIP.trim()) {
						return new Response(JSON.stringify({
							region: 'CUSTOM',
							detectionMethod: '自定义ProxyIP模式',
							customIP: customIP,
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					} else {
						const detectedRegion = await detectWorkerRegion(request);
						return new Response(JSON.stringify({
							region: detectedRegion,
							detectionMethod: 'API检测',
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				
				if (url.pathname === '/test-api') {
					try {
						const testRegion = await detectWorkerRegion(request);
						return new Response(JSON.stringify({
							detectedRegion: testRegion,
							message: 'API测试完成',
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					} catch (error) {
						return new Response(JSON.stringify({
							error: error.message,
							message: 'API测试失败'
						}), {
							status: 500,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				
				
				if (url.pathname === '/') {
					const successHtml = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>部署成功</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background-color:#121212;color:#e0e0e0;text-align:center;}.container{padding:2rem;border-radius:8px;background-color:#1e1e1e;box-shadow:0 4px 6px rgba(0,0,0,0.1);}h1{color:#4caf50;}</style></head><body><div class="container"><h1>✅ 部署成功</h1><p>请继续后面的操作。</p></div></body></html>`;
					return new Response(successHtml, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
				}
				if (url.pathname.length > 1 && url.pathname !== '/' && !url.pathname.includes('/sub')) {
					const user = url.pathname.replace(/\/$/, '').substring(1);
					if (isValidFormat(user)) {
						if (user === authToken) {
							return await handleSubscriptionPage(request, user);
						} else {
							return new Response(JSON.stringify({ error: 'UUID错误 请注意变量名称是u不是uuid' }), { 
								status: 403,
								headers: { 'Content-Type': 'application/json' }
							});
						}
					}
				}
				if (url.pathname.includes('/sub')) {
					const pathParts = url.pathname.split('/');
					if (pathParts.length === 2 && pathParts[1] === 'sub') {
						const user = pathParts[0].substring(1);
						if (isValidFormat(user)) {
							if (user === authToken) {
								return await handleSubscriptionRequest(request, user, url);
							} else {
								return new Response(JSON.stringify({ error: 'UUID错误' }), { 
									status: 403,
									headers: { 'Content-Type': 'application/json' }
								});
							}
						}
					}
				}
				if (url.pathname.toLowerCase().includes(`/${subPath}`)) {
					return await handleSubscriptionRequest(request, authToken);
				}
			}
			return new Response(JSON.stringify({ error: 'Not Found' }), { 
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (err) {
			return new Response(err.toString(), { status: 500 });
		}
	},
};

async function handleSubscriptionRequest(request, user, url = null) {
    if (!url) url = new URL(request.url);
    
    const finalLinks = [];
    const workerDomain = url.hostname;
    const target = url.searchParams.get('target') || 'base64';

    if (currentWorkerRegion === 'CUSTOM') {
        const nativeList = [{ ip: workerDomain, isp: '原生地址' }];
        finalLinks.push(...generateLinksFromSource(nativeList, user, workerDomain));
    } else {
        try {
            const nativeList = [{ ip: workerDomain, isp: '原生地址' }];
            finalLinks.push(...generateLinksFromSource(nativeList, user, workerDomain));
        } catch (error) {
            if (!currentWorkerRegion) {
                currentWorkerRegion = await detectWorkerRegion(request);
            }
            
            const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
            if (bestBackupIP) {
                fallbackAddress = bestBackupIP.domain;
                fallbackPort = bestBackupIP.port.toString();
                const backupList = [{ ip: fallbackAddress, isp: 'ProxyIP-' + currentWorkerRegion }];
                finalLinks.push(...generateLinksFromSource(backupList, user, workerDomain));
            } else {
                const nativeList = [{ ip: workerDomain, isp: '原生地址' }];
                finalLinks.push(...generateLinksFromSource(nativeList, user, workerDomain));
            }
        }
    }

    const hasCustomPreferred = customPreferredIPs.length > 0 || customPreferredDomains.length > 0;
    
    if (disablePreferred) {
    } else if (hasCustomPreferred) {
        // 使用yx配置的优选IP（包含API添加的）
        if (customPreferredIPs.length > 0) {
            finalLinks.push(...generateLinksFromSource(customPreferredIPs, user, workerDomain));
        }
        
        if (customPreferredDomains.length > 0) {
            const customDomainList = customPreferredDomains.map(d => ({ ip: d.domain, isp: d.name || d.domain }));
            finalLinks.push(...generateLinksFromSource(customDomainList, user, workerDomain));
        }
    } else {
        const domainList = directDomains.map(d => ({ ip: d.domain, isp: d.name || d.domain }));
        finalLinks.push(...generateLinksFromSource(domainList, user, workerDomain));

        const defaultURL = 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
        if (preferredIPsURL === defaultURL) {
            try {
                const dynamicIPList = await fetchDynamicIPs();
                if (dynamicIPList.length > 0) {
                    finalLinks.push(...generateLinksFromSource(dynamicIPList, user, workerDomain));
                }
            } catch (error) {
                if (!currentWorkerRegion) {
                    currentWorkerRegion = await detectWorkerRegion(request);
                }
                
                const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
                if (bestBackupIP) {
                    fallbackAddress = bestBackupIP.domain;
                    fallbackPort = bestBackupIP.port.toString();
                    
                    const backupList = [{ ip: fallbackAddress, isp: 'ProxyIP-' + currentWorkerRegion }];
                    finalLinks.push(...generateLinksFromSource(backupList, user, workerDomain));
                }
            }
        }

        try {
            const newIPList = await fetchAndParseNewIPs();
            if (newIPList.length > 0) {
                finalLinks.push(...generateLinksFromNewIPs(newIPList, user, workerDomain));
            }
        } catch (error) {
            if (!currentWorkerRegion) {
                currentWorkerRegion = await detectWorkerRegion(request);
            }
            
            const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
            if (bestBackupIP) {
                fallbackAddress = bestBackupIP.domain;
                fallbackPort = bestBackupIP.port.toString();
                
                const backupList = [{ ip: fallbackAddress, isp: 'ProxyIP-' + currentWorkerRegion }];
                finalLinks.push(...generateLinksFromSource(backupList, user, workerDomain));
            }
        }
    }

    if (finalLinks.length === 0) {
        const errorRemark = "所有节点获取失败";
        const proto = atob('dmxlc3M=');
        const errorLink = `${proto}://00000000-0000-0000-0000-000000000000@127.0.0.1:80?encryption=none&security=none&type=ws&host=error.com&path=%2F#${encodeURIComponent(errorRemark)}`;
        finalLinks.push(errorLink);
    }

    let subscriptionContent;
    let contentType = 'text/plain; charset=utf-8';
    
    switch (target.toLowerCase()) {
        case atob('Y2xhc2g='):
        case atob('Y2xhc2hy'):
            subscriptionContent = await generateClashConfig(finalLinks);
            contentType = 'text/yaml; charset=utf-8';
            break;
        case atob('c3VyZ2Uy'):
        case atob('c3VyZ2Uz'):
        case atob('c3VyZ2U0'):
            subscriptionContent = generateSurgeConfig(finalLinks);
            break;
        case atob('cXVhbnR1bXVsdA=='):
        case atob('cXVhbnR1bXVsdHg='):
            subscriptionContent = generateQuantumultConfig(finalLinks);
            break;
        case atob('c3M='):
        case atob('c3Ny'):
            subscriptionContent = generateSSConfig(finalLinks);
            break;
        case atob('djJyYXk='):
            subscriptionContent = generateV2RayConfig(finalLinks);
            break;
        case atob('bG9vbg=='):
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

function generateLinksFromSource(list, user, workerDomain) {
    // Cloudflare支持的端口
    const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
    const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
    
    const defaultHttpsPorts = [443];
    const defaultHttpPorts = disableNonTLS ? [] : [80];
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const proto = atob('dmxlc3M=');

    list.forEach(item => {
        const nodeNameBase = item.isp.replace(/\s/g, '_');
        const safeIP = item.ip.includes(':') ? `[${item.ip}]` : item.ip;
        
        let portsToGenerate = [];
        
        if (item.port) {
            // 有指定端口时，根据端口类型决定生成TLS或非TLS
            const port = item.port;
            
            if (CF_HTTPS_PORTS.includes(port)) {
                // CF HTTPS端口，只生成TLS节点
                portsToGenerate.push({ port: port, tls: true });
            } else if (CF_HTTP_PORTS.includes(port)) {
                // CF HTTP端口，只生成非TLS节点（除非启用了disableNonTLS）
                if (!disableNonTLS) {
                    portsToGenerate.push({ port: port, tls: false });
                }
            } else {
                // 非CF标准端口，只生成TLS节点（HTTP会被CF拦截）
                portsToGenerate.push({ port: port, tls: true });
            }
        } else {
            // 没有指定端口时，使用默认端口
            defaultHttpsPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: true });
            });
            defaultHttpPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: false });
            });
        }

        // 生成节点
        portsToGenerate.forEach(({ port, tls }) => {
            if (tls) {
                // TLS节点
                const wsNodeName = `${nodeNameBase}-${port}-WS-TLS`;
                const wsParams = new URLSearchParams({ 
                    encryption: 'none', 
                    security: 'tls', 
                    sni: workerDomain, 
                    fp: 'chrome', 
                    type: 'ws', 
                    host: workerDomain, 
                    path: wsPath 
                });
                links.push(`${proto}://${user}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
            } else {
                // 非TLS节点
                const wsNodeName = `${nodeNameBase}-${port}-WS`;
                const wsParams = new URLSearchParams({
                    encryption: 'none',
                    security: 'none',
                    type: 'ws',
                    host: workerDomain,
                    path: wsPath
                });
                links.push(`${proto}://${user}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
            }
        });
    });
    return links;
}

async function fetchDynamicIPs() {
    const v4Url1 = "https://www.wetest.vip/page/cloudflare/address_v4.html";
    const v6Url1 = "https://www.wetest.vip/page/cloudflare/address_v6.html";
    let results = [];

    try {
        const [ipv4List, ipv6List] = await Promise.all([
            fetchAndParseWetest(v4Url1),
            fetchAndParseWetest(v6Url1)
        ]);
        results = [...ipv4List, ...ipv6List];
        if (results.length > 0) {
            return results;
        }
    } catch (e) {
        console.error("Failed to fetch from wetest.vip:", e);
    }

            return [];
        }


async function fetchAndParseWetest(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) {
            console.error(`Failed to fetch ${url}, status: ${response.status}`);
            return [];
        }
        const html = await response.text();
        const results = [];
        const rowRegex = /<tr[\s\S]*?<\/tr>/g;
        const cellRegex = /<td data-label="线路名称">(.+?)<\/td>[\s\S]*?<td data-label="优选地址">([\d.:a-fA-F]+)<\/td>/;

        let match;
        while ((match = rowRegex.exec(html)) !== null) {
            const rowHtml = match[0];
            const cellMatch = rowHtml.match(cellRegex);
            if (cellMatch && cellMatch[1] && cellMatch[2]) {
                results.push({
                    isp: cellMatch[1].trim().replace(/<.*?>/g, ''),
                    ip: cellMatch[2].trim()
                });
            }
        }
        
        if (results.length === 0) {
            console.warn(`Warning: Could not parse any IPs from ${url}. The site structure might have changed.`);
        }

        return results;
    } catch (error) {
        console.error(`Error parsing ${url}:`, error);
        return [];
    }
}

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
    })).catch((err) => { });

    return new Response(null, { status: 101, webSocket: clientSock });
}

async function forwardTCP(addrType, host, portNum, rawData, ws, respHeader, remoteConnWrapper) {
    async function connectAndSend(address, port, useSocks = false) {
        const remoteSock = useSocks ?
            await establishSocksConnection(addrType, address, port) :
            connect({ hostname: address, port: port });
        const writer = remoteSock.writable.getWriter();
        await writer.write(rawData);
        writer.releaseLock();
        return remoteSock;
    }
    
    async function retryConnection() {
        if (enableSocksDowngrade && isSocksEnabled) {
            try {
                const socksSocket = await connectAndSend(host, portNum, true);
                remoteConnWrapper.socket = socksSocket;
                socksSocket.closed.catch(() => {}).finally(() => closeSocketQuietly(ws));
                connectStreams(socksSocket, ws, respHeader, null);
                return;
            } catch (socksErr) {
                let backupHost, backupPort;
                if (fallbackAddress && fallbackPort) {
                    backupHost = fallbackAddress;
                    backupPort = parseInt(fallbackPort, 10) || portNum;
                } else {
                    const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
                    backupHost = bestBackupIP ? bestBackupIP.domain : host;
                    backupPort = bestBackupIP ? bestBackupIP.port : portNum;
                }
                
                try {
                    const fallbackSocket = await connectAndSend(backupHost, backupPort, false);
                    remoteConnWrapper.socket = fallbackSocket;
                    fallbackSocket.closed.catch(() => {}).finally(() => closeSocketQuietly(ws));
                    connectStreams(fallbackSocket, ws, respHeader, null);
                } catch (fallbackErr) {
                    closeSocketQuietly(ws);
                }
            }
        } else {
            let backupHost, backupPort;
            if (fallbackAddress && fallbackPort) {
                backupHost = fallbackAddress;
                backupPort = parseInt(fallbackPort, 10) || portNum;
            } else {
                const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
                backupHost = bestBackupIP ? bestBackupIP.domain : host;
                backupPort = bestBackupIP ? bestBackupIP.port : portNum;
            }
            
            try {
                const fallbackSocket = await connectAndSend(backupHost, backupPort, isSocksEnabled);
                remoteConnWrapper.socket = fallbackSocket;
                fallbackSocket.closed.catch(() => {}).finally(() => closeSocketQuietly(ws));
                connectStreams(fallbackSocket, ws, respHeader, null);
            } catch (fallbackErr) {
                closeSocketQuietly(ws);
            }
        }
    }
    
    try {
        const initialSocket = await connectAndSend(host, portNum, enableSocksDowngrade ? false : isSocksEnabled);
        remoteConnWrapper.socket = initialSocket;
        connectStreams(initialSocket, ws, respHeader, retryConnection);
    } catch (err) {
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
		let header = respHeader;
		const writer = tcpSocket.writable.getWriter();
		await writer.write(udpChunk);
		writer.releaseLock();
		await tcpSocket.readable.pipeTo(new WritableStream({
			async write(chunk) {
				if (webSocket.readyState === 1) {
					if (header) { webSocket.send(await new Blob([header, chunk]).arrayBuffer()); header = null; } 
                    else { webSocket.send(chunk); }
				}
			},
		}));
	} catch (error) { console.error(`DNS forward error: ${error.message}`); }
}

async function establishSocksConnection(addrType, address, port) {
	const { username, password, hostname, socksPort } = parsedSocks5Config;
	const socket = connect({ hostname, port: socksPort });
	const writer = socket.writable.getWriter();
	await writer.write(new Uint8Array(username ? [5, 2, 0, 2] : [5, 1, 0]));
	const reader = socket.readable.getReader();
	let res = (await reader.read()).value;
	if (res[0] !== 5 || res[1] === 255) throw new Error(E_SOCKS_NO_METHOD);
	if (res[1] === 2) {
		if (!username || !password) throw new Error(E_SOCKS_AUTH_NEEDED);
		const encoder = new TextEncoder();
		const authRequest = new Uint8Array([1, username.length, ...encoder.encode(username), password.length, ...encoder.encode(password)]);
		await writer.write(authRequest);
		res = (await reader.read()).value;
		if (res[0] !== 1 || res[1] !== 0) throw new Error(E_SOCKS_AUTH_FAIL);
	}
	const encoder = new TextEncoder(); let DSTADDR;
	switch (addrType) {
		case ADDRESS_TYPE_IPV4: DSTADDR = new Uint8Array([1, ...address.split('.').map(Number)]); break;
		case ADDRESS_TYPE_URL: DSTADDR = new Uint8Array([3, address.length, ...encoder.encode(address)]); break;
		case ADDRESS_TYPE_IPV6: DSTADDR = new Uint8Array([4, ...address.split(':').flatMap(x => [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2), 16)])]); break;
		default: throw new Error(E_INVALID_ADDR_TYPE);
	}
	await writer.write(new Uint8Array([5, 1, 0, ...DSTADDR, port >> 8, port & 255]));
	res = (await reader.read()).value;
	if (res[1] !== 0) throw new Error(E_SOCKS_CONN_FAIL);
	writer.releaseLock(); reader.releaseLock();
	return socket;
}

function parseSocksConfig(address) {
	let [latter, former] = address.split("@").reverse(); 
	let username, password, hostname, socksPort;
	
	if (former) { 
		const formers = former.split(":"); 
		if (formers.length !== 2) throw new Error(E_INVALID_SOCKS_ADDR);
		[username, password] = formers; 
	}
	
	const latters = latter.split(":"); 
	socksPort = Number(latters.pop()); 
	if (isNaN(socksPort)) throw new Error(E_INVALID_SOCKS_ADDR);
	
	hostname = latters.join(":"); 
	if (hostname.includes(":") && !/^\[.*\]$/.test(hostname)) throw new Error(E_INVALID_SOCKS_ADDR);
	
	return { username, password, hostname, socksPort };
}

async function handleSubscriptionPage(request, user = null) {
	if (!user) user = authToken;
	
	const pageHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>订阅中心</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
    <div class="fixed top-4 right-4 text-blue-400 text-sm opacity-70">代理订阅中心 v1.1</div>
    
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

        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-8 mb-6 hover:shadow-xl transition-shadow duration-300">
            <h2 class="text-2xl font-semibold text-blue-700 mb-6">系统状态</h2>
            <div id="systemStatus" class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div class="font-bold text-blue-700 mb-4">系统检测中...</div>
                <div id="regionStatus" class="mb-2 text-blue-600">Worker地区: 检测中...</div>
                <div id="geoInfo" class="mb-2 text-blue-500 text-sm">检测方式: 检测中...</div>
                <div id="backupStatus" class="mb-2 text-blue-600">ProxyIP状态: 检测中...</div>
                <div id="currentIP" class="mb-2 text-blue-600">当前使用IP: 检测中...</div>
                <div id="regionMatch" class="mb-2 text-blue-600">地区匹配: 检测中...</div>
                <div id="selectionLogic" class="text-blue-500 text-sm">选择逻辑: 同地区 → 邻近地区 → 其他地区</div>
            </div>
        </div>
        
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-8 mb-6 hover:shadow-xl transition-shadow duration-300" id="configCard" style="display: none;">
            <h2 class="text-2xl font-semibold text-blue-700 mb-6">配置管理</h2>
            <div id="kvStatus" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                检测KV状态中...
            </div>
            <div id="configContent" style="display: none;">
                <form id="regionForm" class="mb-6">
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">指定地区 (wk):</label>
                        <select id="wkRegion" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                            <option value="">自动检测</option>
                            <option value="US">🇺🇸 美国</option>
                            <option value="SG">🇸🇬 新加坡</option>
                            <option value="JP">🇯🇵 日本</option>
                            <option value="HK">🇭🇰 香港</option>
                            <option value="KR">🇰🇷 韩国</option>
                            <option value="DE">🇩🇪 德国</option>
                            <option value="SE">🇸🇪 瑞典</option>
                            <option value="NL">🇳🇱 荷兰</option>
                            <option value="FI">🇫🇮 芬兰</option>
                            <option value="GB">🇬🇧 英国</option>
                        </select>
                        <small id="wkRegionHint" class="text-orange-500 text-xs hidden">⚠️ 使用自定义ProxyIP时，地区选择已禁用</small>
                    </div>
                    <button type="submit" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200">保存地区配置</button>
                </form>
                <form id="otherConfigForm" class="mb-6">
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">自定义ProxyIP (p):</label>
                        <input type="text" id="customIP" placeholder="例如: 1.2.3.4:443" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                        <small class="text-blue-500 text-xs">自定义ProxyIP地址和端口</small>
                    </div>
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">优选IP列表 (yx):</label>
                        <input type="text" id="preferredIPs" placeholder="例如: 1.2.3.4:443#香港节点,5.6.7.8:80#美国节点" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                        <small class="text-blue-500 text-xs">格式: IP:端口#节点名称。支持多个，用逗号分隔。<span class="text-orange-500">API添加的IP会自动显示在这里。</span></small>
                    </div>
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">优选IP来源URL (yxURL):</label>
                        <input type="text" id="preferredIPsURL" placeholder="默认: https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                        <small class="text-blue-500 text-xs">自定义优选IP列表来源URL，留空则使用默认地址</small>
                    </div>
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">SOCKS5配置 (s):</label>
                        <input type="text" id="socksConfig" placeholder="例如: user:pass@host:port 或 host:port" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                        <small class="text-blue-500 text-xs">SOCKS5代理地址，用于转发所有出站流量</small>
                    </div>
                    <button type="submit" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200">保存配置</button>
                </form>
                
                <h3 class="text-xl font-semibold text-blue-700 mb-4">高级控制</h3>
                <form id="advancedConfigForm" class="mb-6">
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">允许API管理 (apiEnabled):</label>
                        <select id="apiEnabled" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                            <option value="">默认（关闭API）</option>
                            <option value="yes">开启API管理</option>
                        </select>
                        <small class="text-orange-500 text-xs">⚠️ 安全提醒：开启后允许通过API动态添加优选IP。建议仅在需要时开启。</small>
                    </div>
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">地区匹配 (rm):</label>
                        <select id="regionMatching" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                            <option value="">默认（启用地区匹配）</option>
                            <option value="no">关闭地区匹配</option>
                        </select>
                        <small class="text-blue-500 text-xs">设置为"关闭"时不进行地区智能匹配</small>
                    </div>
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">降级控制 (qj):</label>
                        <select id="downgradeControl" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                            <option value="">默认（不启用降级）</option>
                            <option value="no">启用降级模式</option>
                        </select>
                        <small class="text-blue-500 text-xs">设置为"启用"时：CF直连失败→SOCKS5连接→fallback地址</small>
                    </div>
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">TLS控制 (dkby):</label>
                        <select id="portControl" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                            <option value="">默认（保留所有节点）</option>
                            <option value="yes">仅TLS节点</option>
                        </select>
                        <small class="text-blue-500 text-xs">设置为"仅TLS节点"时只生成带TLS的节点，不生成非TLS节点（如80端口）</small>
                    </div>
                    <div class="mb-4">
                        <label class="block mb-2 text-blue-700 font-semibold">优选控制 (yxby):</label>
                        <select id="preferredControl" class="w-full p-3 bg-white border-2 border-blue-200 rounded-lg text-blue-700 focus:border-blue-500 focus:outline-none">
                            <option value="">默认（启用优选）</option>
                            <option value="yes">关闭优选</option>
                        </select>
                        <small class="text-blue-500 text-xs">设置为"关闭优选"时只使用原生地址，不生成优选IP和域名节点</small>
                    </div>
                    <button type="submit" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200">保存高级配置</button>
                </form>
                <div id="currentConfig" class="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 font-mono text-sm text-blue-700 whitespace-pre-wrap">
                    加载中...
                </div>
                <button onclick="loadCurrentConfig()" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-lg mr-2 transition-all duration-200">刷新配置</button>
                <button onclick="resetAllConfig()" class="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200">重置配置</button>
            </div>
            <div id="statusMessage" class="hidden p-4 mt-4 border rounded-lg"></div>
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
        
        async function checkSystemStatus() {
            try {
                const regionStatus = document.getElementById('regionStatus');
                const geoInfo = document.getElementById('geoInfo');
                const backupStatus = document.getElementById('backupStatus');
                const currentIP = document.getElementById('currentIP');
                const regionMatch = document.getElementById('regionMatch');
                
                const regionNames = {
                    'US': '🇺🇸 美国', 'SG': '🇸🇬 新加坡', 'JP': '🇯🇵 日本', 'HK': '🇭🇰 香港',
                    'KR': '🇰🇷 韩国', 'DE': '🇩🇪 德国', 'SE': '🇸🇪 瑞典', 'NL': '🇳🇱 荷兰',
                    'FI': '🇫🇮 芬兰', 'GB': '🇬🇧 英国'
                };
                
                let detectedRegion = 'US';
                try {
                    const response = await fetch('/region');
                    const data = await response.json();
                    
                    if (data.region === 'CUSTOM') {
                        const customIPInfo = data.customIP || '未知';
                        
                        geoInfo.innerHTML = '检测方式: <span class="text-orange-500">⚙️ 自定义ProxyIP模式 (p变量启用)</span>';
                        regionStatus.innerHTML = 'Worker地区: <span class="text-orange-500">🔧 自定义IP模式 (已禁用地区匹配)</span>';
                        
                        if (backupStatus) backupStatus.innerHTML = 'ProxyIP状态: <span class="text-orange-500">🔧 使用自定义ProxyIP: ' + customIPInfo + '</span>';
                        if (currentIP) currentIP.innerHTML = '当前使用IP: <span class="text-green-600">✅ ' + customIPInfo + ' (p变量配置)</span>';
                        if (regionMatch) regionMatch.innerHTML = '地区匹配: <span class="text-orange-500">⚠️ 自定义IP模式，地区选择已禁用</span>';
                        
                        return;
                    } else if (data.detectionMethod === '手动指定地区') {
                        detectedRegion = data.region;
                        
                        geoInfo.innerHTML = '检测方式: <span class="text-green-600">手动指定地区</span>';
                        regionStatus.innerHTML = 'Worker地区: <span class="text-green-600">🎯 ' + regionNames[detectedRegion] + ' (手动指定)</span>';
                        
                        if (backupStatus) backupStatus.innerHTML = 'ProxyIP状态: <span class="text-green-600">✅ 10/10 可用 (ProxyIP域名预设可用)</span>';
                        if (currentIP) currentIP.innerHTML = '当前使用IP: <span class="text-green-600">✅ 智能就近选择中</span>';
                        if (regionMatch) regionMatch.innerHTML = '地区匹配: <span class="text-green-600">✅ 同地区IP可用 (1个)</span>';
                        
                        return;
                    } else if (data.region && regionNames[data.region]) {
                        detectedRegion = data.region;
                    }
                    
                    geoInfo.innerHTML = '检测方式: <span class="text-green-600">Cloudflare内置检测</span>';
                    
                } catch (e) {
                    geoInfo.innerHTML = '检测方式: <span class="text-red-500">检测失败</span>';
                }
                
                regionStatus.innerHTML = 'Worker地区: <span class="text-green-600">✅ ' + regionNames[detectedRegion] + '</span>';
                
                if (backupStatus) {
                    backupStatus.innerHTML = 'ProxyIP状态: <span class="text-green-600">✅ 10/10 可用 (ProxyIP域名预设可用)</span>';
                }
                
                if (currentIP) {
                    currentIP.innerHTML = '当前使用IP: <span class="text-green-600">✅ 智能就近选择中</span>';
                }
                
                if (regionMatch) {
                    regionMatch.innerHTML = '地区匹配: <span class="text-green-600">✅ 同地区IP可用 (1个)</span>';
                }
                
            } catch (error) {
                console.error('状态检测失败:', error);
                document.getElementById('regionStatus').innerHTML = 'Worker地区: <span class="text-red-500">❌ 检测失败</span>';
                document.getElementById('geoInfo').innerHTML = '检测方式: <span class="text-red-500">❌ 检测失败</span>';
                document.getElementById('backupStatus').innerHTML = 'ProxyIP状态: <span class="text-red-500">❌ 检测失败</span>';
                document.getElementById('currentIP').innerHTML = '当前使用IP: <span class="text-red-500">❌ 检测失败</span>';
                document.getElementById('regionMatch').innerHTML = '地区匹配: <span class="text-red-500">❌ 检测失败</span>';
            }
        }
        
        // 配置管理相关函数
        async function checkKVStatus() {
            const apiUrl = window.location.pathname + '/api/config';
            
            try {
                const response = await fetch(apiUrl);
                
                if (response.status === 503) {
                    document.getElementById('kvStatus').innerHTML = '<span class="text-orange-500">⚠️ KV存储未启用或未配置</span>';
                    document.getElementById('configCard').style.display = 'block';
                    document.getElementById('currentConfig').textContent = 'KV存储未配置，无法使用配置管理功能。\\n\\n请在Cloudflare Workers中:\\n1. 创建KV命名空间\\n2. 绑定环境变量 C\\n3. 重新部署代码';
                } else if (response.ok) {
                    const data = await response.json();
                    
                    if (data && data.kvEnabled === true) {
                        document.getElementById('kvStatus').innerHTML = '<span class="text-green-600">✅ KV存储已启用，可以使用配置管理功能</span>';
                        document.getElementById('configContent').style.display = 'block';
                        document.getElementById('configCard').style.display = 'block';
                        await loadCurrentConfig();
                    } else {
                        document.getElementById('kvStatus').innerHTML = '<span class="text-orange-500">⚠️ KV存储未启用或未配置</span>';
                        document.getElementById('configCard').style.display = 'block';
                        document.getElementById('currentConfig').textContent = 'KV存储未配置';
                    }
                } else {
                    document.getElementById('kvStatus').innerHTML = '<span class="text-orange-500">⚠️ KV存储未启用或未配置</span>';
                    document.getElementById('configCard').style.display = 'block';
                    document.getElementById('currentConfig').textContent = 'KV存储检测失败 - 状态码: ' + response.status;
                }
            } catch (error) {
                document.getElementById('kvStatus').innerHTML = '<span class="text-orange-500">⚠️ KV存储未启用或未配置</span>';
                document.getElementById('configCard').style.display = 'block';
                document.getElementById('currentConfig').textContent = 'KV存储检测失败 - 错误: ' + error.message;
            }
        }
        
        async function loadCurrentConfig() {
            const apiUrl = window.location.pathname + '/api/config';
            
            try {
                const response = await fetch(apiUrl);
                
                if (response.status === 503) {
                    document.getElementById('currentConfig').textContent = 'KV存储未配置，无法加载配置';
                    return;
                }
                if (!response.ok) {
                    document.getElementById('currentConfig').textContent = '加载配置失败';
                    return;
                }
                const config = await response.json();
                
                const displayConfig = {};
                for (const [key, value] of Object.entries(config)) {
                    if (key !== 'kvEnabled') {
                        displayConfig[key] = value;
                    }
                }
                
                let configText = '当前配置:\\n';
                if (Object.keys(displayConfig).length === 0) {
                    configText += '(暂无配置)';
                } else {
                    for (const [key, value] of Object.entries(displayConfig)) {
                        configText += key + ': ' + (value || '(未设置)') + '\\n';
                    }
                }
                
                document.getElementById('currentConfig').textContent = configText;
                
                document.getElementById('wkRegion').value = config.wk || '';
                document.getElementById('customIP').value = config.p || '';
                document.getElementById('preferredIPs').value = config.yx || '';
                document.getElementById('preferredIPsURL').value = config.yxURL || '';
                document.getElementById('socksConfig').value = config.s || '';
                document.getElementById('apiEnabled').value = config.apiEnabled || '';
                document.getElementById('regionMatching').value = config.rm || '';
                document.getElementById('downgradeControl').value = config.qj || '';
                document.getElementById('portControl').value = config.dkby || '';
                document.getElementById('preferredControl').value = config.yxby || '';
                
                updateWkRegionState();
                
            } catch (error) {
                document.getElementById('currentConfig').textContent = '加载配置失败: ' + error.message;
            }
        }
        
        function updateWkRegionState() {
            const customIP = document.getElementById('customIP');
            const wkRegion = document.getElementById('wkRegion');
            const wkRegionHint = document.getElementById('wkRegionHint');
            
            if (customIP && wkRegion) {
                const hasCustomIP = customIP.value.trim() !== '';
                wkRegion.disabled = hasCustomIP;
                
                if (hasCustomIP) {
                    wkRegion.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-200');
                    if (wkRegionHint) {
                        wkRegionHint.classList.remove('hidden');
                    }
                } else {
                    wkRegion.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-200');
                    if (wkRegionHint) {
                        wkRegionHint.classList.add('hidden');
                    }
                }
            }
        }
        
        async function saveConfig(configData) {
            const apiUrl = window.location.pathname + '/api/config';
            
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(configData)
                });
                
                if (response.status === 503) {
                    showStatus('KV存储未配置，无法保存配置。请先在Cloudflare Workers中配置KV存储。', 'error');
                    return;
                }
                
                const result = await response.json();
                showStatus(result.message, result.success ? 'success' : 'error');
                
                if (result.success) {
                    await loadCurrentConfig();
                    updateWkRegionState();
                    setTimeout(function() {
                        window.location.reload();
                    }, 1500);
                }
            } catch (error) {
                showStatus('保存失败: ' + error.message, 'error');
            }
        }
        
        function showStatus(message, type) {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.textContent = message;
            statusDiv.classList.remove('hidden');
            statusDiv.classList.remove('text-green-600', 'text-red-500', 'border-green-600', 'border-red-500');
            if (type === 'success') {
                statusDiv.classList.add('text-green-600', 'border-green-600');
            } else {
                statusDiv.classList.add('text-red-500', 'border-red-500');
            }
            
            setTimeout(function() {
                statusDiv.classList.add('hidden');
            }, 3000);
        }
        
        async function resetAllConfig() {
            if (confirm('确定要重置所有配置吗？这将清空所有KV配置，恢复为环境变量设置。')) {
                try {
                    const response = await fetch(window.location.pathname + '/api/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            wk: '', p: '', yx: '', yxURL: '', s: '', 
                            apiEnabled: '', rm: '', qj: '', dkby: '', yxby: ''
                        })
                    });
                    
                    if (response.status === 503) {
                        showStatus('KV存储未配置，无法重置配置。', 'error');
                        return;
                    }
                    
                    const result = await response.json();
                    showStatus(result.message || '配置已重置', result.success ? 'success' : 'error');
                    
                    if (result.success) {
                        await loadCurrentConfig();
                        updateWkRegionState();
                        setTimeout(function() {
                            window.location.reload();
                        }, 1500);
                    }
                } catch (error) {
                    showStatus('重置失败: ' + error.message, 'error');
                }
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            checkSystemStatus();
            checkKVStatus();
            
            const customIPInput = document.getElementById('customIP');
            if (customIPInput) {
                customIPInput.addEventListener('input', function() {
                    updateWkRegionState();
                });
            }
            
            const regionForm = document.getElementById('regionForm');
            if (regionForm) {
                regionForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const wkRegion = document.getElementById('wkRegion').value;
                    await saveConfig({ wk: wkRegion });
                });
            }
            
            const otherConfigForm = document.getElementById('otherConfigForm');
            if (otherConfigForm) {
                otherConfigForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const configData = {
                        p: document.getElementById('customIP').value,
                        yx: document.getElementById('preferredIPs').value,
                        yxURL: document.getElementById('preferredIPsURL').value,
                        s: document.getElementById('socksConfig').value
                    };
                    await saveConfig(configData);
                });
            }
            
            const advancedConfigForm = document.getElementById('advancedConfigForm');
            if (advancedConfigForm) {
                advancedConfigForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const configData = {
                        apiEnabled: document.getElementById('apiEnabled').value,
                        rm: document.getElementById('regionMatching').value,
                        qj: document.getElementById('downgradeControl').value,
                        dkby: document.getElementById('portControl').value,
                        yxby: document.getElementById('preferredControl').value
                    };
                    await saveConfig(configData);
                });
            }
        });
    </script>
</body>
</html>`;
	
	return new Response(pageHtml, { 
		status: 200, 
		headers: { 'Content-Type': 'text/html; charset=utf-8' } 
	});
}

function base64ToArray(b64Str) {
	if (!b64Str) return { error: null };
	try { b64Str = b64Str.replace(/-/g, '+').replace(/_/g, '/'); return { earlyData: Uint8Array.from(atob(b64Str), (c) => c.charCodeAt(0)).buffer, error: null }; } 
    catch (error) { return { error }; }
}

function closeSocketQuietly(socket) { try { if (socket.readyState === 1 || socket.readyState === 2) socket.close(); } catch (error) {} }

const hexTable = Array.from({ length: 256 }, (v, i) => (i + 256).toString(16).slice(1));
function formatIdentifier(arr, offset = 0) {
	const id = (hexTable[arr[offset]]+hexTable[arr[offset+1]]+hexTable[arr[offset+2]]+hexTable[arr[offset+3]]+"-"+hexTable[arr[offset+4]]+hexTable[arr[offset+5]]+"-"+hexTable[arr[offset+6]]+hexTable[arr[offset+7]]+"-"+hexTable[arr[offset+8]]+hexTable[arr[offset+9]]+"-"+hexTable[arr[offset+10]]+hexTable[arr[offset+11]]+hexTable[arr[offset+12]]+hexTable[arr[offset+13]]+hexTable[arr[offset+14]]+hexTable[arr[offset+15]]).toLowerCase();
	if (!isValidFormat(id)) throw new TypeError(E_INVALID_ID_STR);
	return id;
}

async function fetchAndParseNewIPs() {
    // 使用配置的URL，如果没有配置则使用默认URL
    const url = preferredIPsURL || "https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt";
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

function generateLinksFromNewIPs(list, user, workerDomain) {
    // Cloudflare支持的端口
    const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
    const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
    
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const proto = atob('dmxlc3M=');
    
    list.forEach(item => {
        const nodeName = item.name.replace(/\s/g, '_');
        const port = item.port;
        
        if (CF_HTTPS_PORTS.includes(port)) {
            // CF HTTPS端口，生成TLS节点
            const wsNodeName = `${nodeName}-${port}-WS-TLS`;
            const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=tls&sni=${workerDomain}&fp=chrome&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
            links.push(link);
        } else if (CF_HTTP_PORTS.includes(port)) {
            // CF HTTP端口，生成非TLS节点（除非启用了disableNonTLS）
            if (!disableNonTLS) {
                const wsNodeName = `${nodeName}-${port}-WS`;
                const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=none&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
                links.push(link);
            }
        } else {
            // 非CF标准端口，只生成TLS节点（HTTP会被CF拦截）
            const wsNodeName = `${nodeName}-${port}-WS-TLS`;
            const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=tls&sni=${workerDomain}&fp=chrome&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
            links.push(link);
        }
    });
    return links;
}

// 配置API处理函数
async function handleConfigAPI(request) {
    if (request.method === 'GET') {
        // 检查KV是否真正可用
        if (!kvStore) {
            return new Response(JSON.stringify({
                error: 'KV存储未配置',
                kvEnabled: false
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 获取当前配置
        return new Response(JSON.stringify({
            ...kvConfig,
            kvEnabled: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else if (request.method === 'POST') {
        // 检查KV是否真正可用
        if (!kvStore) {
            return new Response(JSON.stringify({
                success: false,
                message: 'KV存储未配置，无法保存配置'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 更新配置
        try {
            const newConfig = await request.json();
            
            // 更新KV配置
            for (const [key, value] of Object.entries(newConfig)) {
                if (value === '' || value === null || value === undefined) {
                    delete kvConfig[key];
                } else {
                    kvConfig[key] = value;
                }
            }
            
            await saveKVConfig();
            
            const envFallback = getConfigValue('p', '');
            if (envFallback) {
                const fallbackValue = envFallback.toLowerCase();
                if (fallbackValue.includes(']:')) {
                    const lastColonIndex = fallbackValue.lastIndexOf(':');
                    fallbackPort = fallbackValue.slice(lastColonIndex + 1);
                    fallbackAddress = fallbackValue.slice(0, lastColonIndex);
                } else if (!fallbackValue.includes(']:') && !fallbackValue.includes(']')) {
                    [fallbackAddress, fallbackPort = '443'] = fallbackValue.split(':');
                } else {
                    fallbackAddress = fallbackValue;
                    fallbackPort = '443';
                }
            } else {
                fallbackAddress = '';
                fallbackPort = '443';
            }
            
            socks5Config = getConfigValue('s', '') || '';
            if (socks5Config) {
                try {
                    parsedSocks5Config = parseSocksConfig(socks5Config);
                    isSocksEnabled = true;
                } catch (err) {
                    isSocksEnabled = false;
                }
            } else {
                isSocksEnabled = false;
            }
            
            const newPreferredIPsURL = getConfigValue('yxURL', '') || 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
            const defaultURL = 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
            if (newPreferredIPsURL !== defaultURL) {
                backupIPs = [];
                directDomains.length = 0;
                customPreferredIPs = [];
                customPreferredDomains = [];
            } else {
                backupIPs = [
                    { domain: 'ProxyIP.US.CMLiussss.net', region: 'US', regionCode: 'US', port: 443 },
                    { domain: 'ProxyIP.SG.CMLiussss.net', region: 'SG', regionCode: 'SG', port: 443 },
                    { domain: 'ProxyIP.JP.CMLiussss.net', region: 'JP', regionCode: 'JP', port: 443 },
                    { domain: 'ProxyIP.HK.CMLiussss.net', region: 'HK', regionCode: 'HK', port: 443 },
                    { domain: 'ProxyIP.KR.CMLiussss.net', region: 'KR', regionCode: 'KR', port: 443 },
                    { domain: 'ProxyIP.DE.CMLiussss.net', region: 'DE', regionCode: 'DE', port: 443 },
                    { domain: 'ProxyIP.SE.CMLiussss.net', region: 'SE', regionCode: 'SE', port: 443 },
                    { domain: 'ProxyIP.NL.CMLiussss.net', region: 'NL', regionCode: 'NL', port: 443 },
                    { domain: 'ProxyIP.FI.CMLiussss.net', region: 'FI', regionCode: 'FI', port: 443 },
                    { domain: 'ProxyIP.GB.CMLiussss.net', region: 'GB', regionCode: 'GB', port: 443 },
                    { domain: 'ProxyIP.Oracle.cmliussss.net', region: 'Oracle', regionCode: 'Oracle', port: 443 },
                    { domain: 'ProxyIP.DigitalOcean.CMLiussss.net', region: 'DigitalOcean', regionCode: 'DigitalOcean', port: 443 },
                    { domain: 'ProxyIP.Vultr.CMLiussss.net', region: 'Vultr', regionCode: 'Vultr', port: 443 },
                    { domain: 'ProxyIP.Multacom.CMLiussss.net', region: 'Multacom', regionCode: 'Multacom', port: 443 }
                ];
                directDomains.length = 0;
                directDomains.push(
                    { name: "cloudflare.182682.xyz", domain: "cloudflare.182682.xyz" }, 
                    { name: "speed.marisalnc.com", domain: "speed.marisalnc.com" },
                    { domain: "freeyx.cloudflare88.eu.org" }, 
                    { domain: "bestcf.top" }, 
                    { domain: "cdn.2020111.xyz" }, 
                    { domain: "cfip.cfcdn.vip" },
                    { domain: "cf.0sm.com" }, 
                    { domain: "cf.090227.xyz" }, 
                    { domain: "cf.zhetengsha.eu.org" }, 
                    { domain: "cloudflare.9jy.cc" },
                    { domain: "cf.zerone-cdn.pp.ua" }, 
                    { domain: "cfip.1323123.xyz" }, 
                    { domain: "cnamefuckxxs.yuchen.icu" }, 
                    { domain: "cloudflare-ip.mofashi.ltd" },
                    { domain: "115155.xyz" }, 
                    { domain: "cname.xirancdn.us" }, 
                    { domain: "f3058171cad.002404.xyz" }, 
                    { domain: "8.889288.xyz" },
                    { domain: "cdn.tzpro.xyz" }, 
                    { domain: "cf.877771.xyz" }, 
                    { domain: "xn--b6gac.eu.org" }
                );
            }
            
            return new Response(JSON.stringify({
                success: true,
                message: '配置已保存',
                config: kvConfig
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                message: '保存配置失败: ' + error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}

// 优选IP管理API处理函数
async function handlePreferredIPsAPI(request) {
    // 检查KV是否可用
    if (!kvStore) {
        return new Response(JSON.stringify({
            success: false,
            error: 'KV存储未配置',
            message: '需要配置KV存储才能使用此功能'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // 检查API功能是否启用（安全开关）
    const apiEnabled = getConfigValue('apiEnabled', '') === 'yes';
    if (!apiEnabled) {
        return new Response(JSON.stringify({
            success: false,
            error: 'API功能未启用',
            message: '出于安全考虑，优选IP API功能默认关闭。请在配置管理页面开启"允许API管理"选项后使用。'
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        if (request.method === 'GET') {
            // 从yx变量获取优选IP列表
            const yxValue = getConfigValue('yx', '');
            const preferredIPs = parseYxToArray(yxValue);
            
            return new Response(JSON.stringify({
                success: true,
                count: preferredIPs.length,
                data: preferredIPs
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else if (request.method === 'POST') {
            // 添加优选IP（支持单个或批量）
            const body = await request.json();
            
            // 支持批量添加
            const ipsToAdd = Array.isArray(body) ? body : [body];
            
            if (ipsToAdd.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: '请求数据为空',
                    message: '请提供IP数据'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 从yx变量获取现有列表
            const yxValue = getConfigValue('yx', '');
            const preferredIPs = parseYxToArray(yxValue);
            
            const addedIPs = [];
            const skippedIPs = [];
            const errors = [];
            
            for (const item of ipsToAdd) {
                // 验证必需字段
                if (!item.ip) {
                    errors.push({ ip: '未知', reason: 'IP地址是必需的' });
                    continue;
                }
                
                // 解析端口，默认443
                const port = item.port || 443;
                const name = item.name || `API优选-${item.ip}:${port}`;
                
                // 验证IP格式
                if (!isValidIP(item.ip) && !isValidDomain(item.ip)) {
                    errors.push({ ip: item.ip, reason: '无效的IP或域名格式' });
                    continue;
                }
                
                // 检查是否已存在
                const exists = preferredIPs.some(existItem => 
                    existItem.ip === item.ip && existItem.port === port
                );
                
                if (exists) {
                    skippedIPs.push({ ip: item.ip, port: port, reason: '已存在' });
                    continue;
                }
                
                // 添加新IP
                const newIP = {
                    ip: item.ip,
                    port: port,
                    name: name,
                    addedAt: new Date().toISOString()
                };
                
                preferredIPs.push(newIP);
                addedIPs.push(newIP);
            }
            
            // 如果有IP被添加，保存到yx变量
            if (addedIPs.length > 0) {
                const newYxValue = arrayToYx(preferredIPs);
                await setConfigValue('yx', newYxValue);
            }
            
            // 返回结果
            return new Response(JSON.stringify({
                success: addedIPs.length > 0,
                message: `成功添加 ${addedIPs.length} 个IP`,
                added: addedIPs.length,
                skipped: skippedIPs.length,
                errors: errors.length,
                data: {
                    addedIPs: addedIPs,
                    skippedIPs: skippedIPs.length > 0 ? skippedIPs : undefined,
                    errors: errors.length > 0 ? errors : undefined
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else if (request.method === 'DELETE') {
            // 删除优选IP（支持单个删除或一键清空）
            const body = await request.json();
            
            // 检查是否为一键清空
            if (body.all === true) {
                // 从yx变量获取现有列表
                const yxValue = getConfigValue('yx', '');
                const preferredIPs = parseYxToArray(yxValue);
                const deletedCount = preferredIPs.length;
                
                // 清空yx变量
                await setConfigValue('yx', '');
                
                return new Response(JSON.stringify({
                    success: true,
                    message: `已清空所有优选IP，共删除 ${deletedCount} 个`,
                    deletedCount: deletedCount
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 单个删除逻辑
            if (!body.ip) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'IP地址是必需的',
                    message: '请提供要删除的ip字段，或使用 {"all": true} 清空所有'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const port = body.port || 443;
            
            // 从yx变量获取现有列表
            const yxValue = getConfigValue('yx', '');
            const preferredIPs = parseYxToArray(yxValue);
            const initialLength = preferredIPs.length;
            
            // 删除匹配的IP
            const filteredIPs = preferredIPs.filter(item => 
                !(item.ip === body.ip && item.port === port)
            );
            
            if (filteredIPs.length === initialLength) {
                return new Response(JSON.stringify({
                    success: false,
                    error: '优选IP不存在',
                    message: `${body.ip}:${port} 未找到`
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 转换回yx格式并保存
            const newYxValue = arrayToYx(filteredIPs);
            await setConfigValue('yx', newYxValue);
            
            return new Response(JSON.stringify({
                success: true,
                message: '优选IP已删除',
                deleted: { ip: body.ip, port: port }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: '不支持的请求方法',
                message: '支持的方法: GET, POST, DELETE'
            }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: '处理请求失败',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 解析yx格式字符串为数组
// 格式: IP:端口#节点名称,IP:端口#节点名称
function parseYxToArray(yxValue) {
    if (!yxValue || !yxValue.trim()) return [];
    
    const items = yxValue.split(',').map(item => item.trim()).filter(item => item);
    const result = [];
    
    for (const item of items) {
        // 检查是否包含节点名称 (#)
        let nodeName = '';
        let addressPart = item;
        
        if (item.includes('#')) {
            const parts = item.split('#');
            addressPart = parts[0].trim();
            nodeName = parts[1].trim();
        }
        
        // 解析地址和端口
        const { address, port } = parseAddressAndPort(addressPart);
        
        // 如果没有设置节点名称，使用默认格式
        if (!nodeName) {
            nodeName = address + (port ? ':' + port : '');
        }
        
        result.push({
            ip: address,
            port: port || 443,
            name: nodeName,
            addedAt: new Date().toISOString()
        });
    }
    
    return result;
}

// 将数组转换为yx格式字符串
function arrayToYx(array) {
    if (!array || array.length === 0) return '';
    
    return array.map(item => {
        const port = item.port || 443;
        return `${item.ip}:${port}#${item.name}`;
    }).join(',');
}

// 验证域名格式
function isValidDomain(domain) {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
}
