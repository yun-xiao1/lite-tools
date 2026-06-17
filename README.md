<p align=center>
  <img width="160" alt="icon" height="160" src="./icon.png" />
</p>

<h1 align="center">轻量工具箱 Lite Tools</h1>

<p align="center">
  <a href="/LICENSE"><img src="https://img.shields.io/github/license/yun-xiao1/lite-tools" alt="LICENSE"></a>
  <a href="https://github.com/yun-xiao1/lite-tools"><img src="https://img.shields.io/badge/fork-yun--xiao1%2Flite--tools-blue" alt="Fork"></a>
</p>

LiteLoaderQQNT 插件，基于原项目 `xiyuesaves/LiteLoaderQQNT-lite_tools` 维护。

LiteLoaderQQNT 本体：[LiteLoaderQQNT](https://github.com/mo-jinran/LiteLoaderQQNT)

> [!CAUTION]
> 不要在国内平台宣传该插件。不要在 QQ 官方群聊发送任何可以看出你使用了第三方插件的截图。

## Fork 说明与许可证

这是 `yun-xiao1/lite-tools` 的维护 fork，基于原项目 `xiyuesaves/LiteLoaderQQNT-lite_tools` 修改。

本 fork 遵守原项目的 GPL-3.0 许可证，并在源码与发布包中保留原作者版权声明和完整许可协议：

- 原作者：`xiyuesaves`
- 原项目：`xiyuesaves/LiteLoaderQQNT-lite_tools`
- 许可证：`GPL-3.0`
- 许可协议全文：见仓库中的 `LICENSE` 文件

## 当前维护环境

当前分支主要按以下环境处理和测试：

- QQNT：`9.9.20-37051` x64
- LiteLoaderQQNT：`1.2.4`
- 插件版本：`2.33.14`
- 系统：Windows

其他 QQ 或 LiteLoaderQQNT 版本可能会出现右键菜单、图片搜索、聊天记录页面等功能表现不一致的问题。

## 当前改动

- 实验支持在聊天记录窗口使用 `右键菜单 > 划词搜索`。
- 实验支持在聊天记录窗口使用 `右键菜单 > 图片搜索`。
- 右键菜单监听改为在渲染进程通用入口初始化，避免聊天记录页面未加载聊天页模块时右键菜单不生效。
- 图片搜索在聊天记录里拿不到普通聊天消息数据时，会尝试从右键目标附近提取 `appimg://` 图片地址，并回退到旧版图片链接解析。
- 修复旧版图片搜索路径解析：
  - 兼容 Windows 反斜杠路径。
  - 只移除文件名末尾的 `_0`，避免误改图片 hash。
- `manifest.json` 的仓库信息已改为 `yun-xiao1/lite-tools`，避免插件更新入口指回原仓库。
- 不做图片链接有效性预校验，避免右键搜索时卡住十几秒才打开浏览器。

## 下载与安装

当前测试包：

[lite_tools_v4-record-search-rollback.zip](https://raw.githubusercontent.com/yun-xiao1/lite-tools/feature/context-menu-record-search/packages/lite_tools_v4-record-search-rollback.zip)

安装方法：

1. 下载上面的 zip。
2. 打开 LiteLoaderQQNT 插件管理页面。
3. 导入插件压缩包，或将压缩包内容解压到 LiteLoaderQQNT 数据目录的 `plugins/lite_tools`。
4. 重启 QQNT。

如果你已经安装过轻量工具箱，建议先备份原 `lite_tools` 插件目录，再覆盖测试包。

## 图片搜索说明

图片搜索依赖 QQ 图片临时直链。QQNT 的图片链接可能需要 `rkey`，并且图片 CDN 链接本身也可能有时效。

如果搜索网站提示：

```text
该网址中没有图片。请使用其他网址或图片重试
```

通常说明：

- 图片 CDN 链接已过期。
- `rkey` 已过期或群聊/私聊 rkey 类型不匹配。
- 搜索网站无法访问 QQ 图片直链。
- 聊天记录窗口没有提供完整图片数据，只能走旧版 `appimg://` 路径兜底。

需要提高图片搜索稳定性时，可以在插件设置中配置：

- `自定义rkey获取地址`
- `自定义rkey Token`，如果你的 rkey 服务需要鉴权

rkey 接口可返回以下任一格式：

```json
{
  "private_rkey": "&rkey=xxx",
  "group_rkey": "&rkey=xxx",
  "expired_time": 1780000000
}
```

或：

```json
{
  "data": {
    "private_rkey": "&rkey=xxx",
    "group_rkey": "&rkey=xxx",
    "expired_time": 1780000000
  }
}
```

## 已知限制

- 聊天记录窗口的图片搜索属于实验支持，不保证每张图都能搜。
- 如果 QQ 只提供本地缓存路径，而不是可访问的图片直链，Google Lens / SauceNAO 仍可能报错。
- 本 fork 目前优先保证旧版 QQNT 环境可用，不保证最新 QQNT 兼容。

## 手动构建

```bash
git clone https://github.com/yun-xiao1/lite-tools.git
cd lite-tools
npm install
npm run build
```

## 声明

- 本项目仅供学习和研究。
- 请勿用于非法用途。
- 本 fork 不代表原作者立场。
- 使用第三方插件可能带来账号或客户端风险，请自行判断并承担后果。
