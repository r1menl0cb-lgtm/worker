# Cloudflare Workers 代理订阅服务

一个部署在 Cloudflare Workers 上的代理订阅服务，支持多客户端、智能优选、图形化配置管理。

## 功能特性

- 多客户端支持：Clash、Surge、Sing-box、Loon、V2Ray 等
- 智能优选：自动获取优选 IP 和域名节点
- 图形化管理：Web 界面配置，无需重新部署
- API 管理：支持通过 API 动态管理优选 IP
- 地区选择：支持手动指定 Worker 地区

## 快速部署

### 1. 基础配置

部署到 Cloudflare Workers 时，需要配置以下环境变量：

| 变量名 | 值 | 说明 |
| :--- | :--- | :--- |
| `u` | `你的 UUID` | **必需**。用于访问订阅和配置管理界面 |
| `p` | `proxyip` | **可选**。自定义 ProxyIP 地址和端口 |
| `s` | `你的SOCKS5地址` | **可选**。SOCKS5 代理转发，格式：`user:pass@host:port` 或 `host:port` |
| `d` | `你的订阅地址` | **可选**。自定义订阅路径，不填默认为 `/你的uuid` |
| `wk` | `地区代码` | **可选**。手动指定 Worker 地区，如：`SG`、`HK`、`US`、`JP` 等 |

### 2. 高级配置

| 变量名 | 值 | 说明 |
| :--- | :--- | :--- |
| `yx` | `自定义优选IP/域名` | **可选**。格式：`1.1.1.1:443#香港节点,8.8.8.8:53#Google DNS` |
| `yxURL` | `优选IP来源URL` | **可选**。自定义优选 IP 列表来源 URL |
| `qj` | `no` | **可选**。启用降级模式：CF直连失败→SOCKS5→fallback |
| `dkby` | `yes` | **可选**。只生成 TLS 节点，不生成非 TLS 节点（如80端口） |
| `yxby` | `yes` | **可选**。关闭所有优选功能，只使用原生地址 |
| `rm` | `no` | **可选**。关闭地区智能匹配 |
| `apiEnabled` | `yes` | **可选**。允许通过 API 动态管理优选 IP（默认关闭） |

### 3. KV 存储配置（推荐）

使用 KV 存储可以实现配置持久化和图形化管理：

1. 在 Cloudflare Workers 中创建 KV 命名空间
2. 在 Workers 设置中绑定 KV 命名空间，变量名设为 `C`
3. 重新部署 Workers
4. 访问 `/{你的UUID}` 即可使用图形化配置管理

## 使用说明

### 访问订阅

部署完成后，通过以下方式访问：

- **图形化界面**：`https://your-worker.workers.dev/{UUID}`
- **订阅地址**：`https://your-worker.workers.dev/{UUID}/sub`

在图形化界面中可以：
- 选择不同客户端类型生成对应订阅链接
- 一键复制订阅内容
- 配置系统参数（如果启用了 KV 存储）

### API 管理（可选）

如果开启了 API 管理功能（`apiEnabled=yes`），可以通过以下 API 动态管理优选 IP：

#### 查询优选 IP 列表
```bash
curl -X GET "https://your-worker.workers.dev/{UUID}/api/preferred-ips"
```

#### 添加单个 IP
```bash
curl -X POST "https://your-worker.workers.dev/{UUID}/api/preferred-ips" \
  -H "Content-Type: application/json" \
  -d '{"ip": "1.2.3.4", "port": 443, "name": "香港节点"}'
```

#### 批量添加 IP
```bash
curl -X POST "https://your-worker.workers.dev/{UUID}/api/preferred-ips" \
  -H "Content-Type: application/json" \
  -d '[
    {"ip": "1.2.3.4", "port": 443, "name": "节点1"},
    {"ip": "5.6.7.8", "port": 8443, "name": "节点2"}
  ]'
```

#### 清空所有 IP
```bash
curl -X DELETE "https://your-worker.workers.dev/{UUID}/api/preferred-ips" \
  -H "Content-Type: application/json" \
  -d '{"all": true}'
```

## 客户端支持

支持以下客户端订阅格式：

- **V2Ray**：原始 Base64 订阅
- **Clash**：YAML 配置格式
- **Surge**：Surge 配置格式
- **Sing-box**：Sing-box JSON 格式
- **Loon**：Loon 配置格式
- **Quantumult X**：QuantumultX 配置格式

访问图形化界面后，点击对应客户端按钮即可自动生成并复制订阅链接。

## 注意事项

1. **UUID 安全**：请妥善保管你的 UUID，不要泄露给他人
2. **API 管理**：API 功能默认关闭，需要时再开启以确保安全
3. **KV 配置优先级**：KV 配置 > 环境变量 > 默认值
4. **订阅更新**：支持每 15 分钟自动优选一次，保持最佳性能

## 文件说明

- `worker.source.js` - 源代码文件（可读）
- `worker.obfuscated.js` - 混淆后的代码（部署用）
- `snippets.js` - Cloudflare Workers Snippets 版本

部署时可以选择使用 `worker.source.js` 或 `worker.obfuscated.js`。

## License

MIT License
