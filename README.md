# King-Arthur-3a-App · 亚瑟王中王（横屏版）

「亚瑟王中王」的移动端横屏封装版。玩法与场景同桌面版完全一致，这一版只针对「手机横屏 / App 内嵌 WebView」补齐设备适配层：

- **竖屏守卫**：竖屏打开时全屏提示旋转，并自动暂停正在进行的战斗
- **一键横屏**：首次点击「开始行动」时，在用户手势内请求全屏并锁定横屏方向
- **手势抑制**：关闭双击缩放、双指缩放、长按菜单、下拉刷新与橡皮筋滚动
- **分辨率自适应**：设备像素比先封顶 2.0，战斗中连续低于 42fps 时自动逐档降到 1.0
- **安全区**：摇杆、开火键、暂停键、HUD 全部避开刘海与底部手势条（`safe-area-inset-*`）

## 在线试玩

https://axiong5500.github.io/King-Arthur-3a-App/

手机浏览器打开后横屏即可；在 App 里内嵌见下文的宿主配置。

## 操作（触屏）

| 操作 | 方式 |
| --- | --- |
| 移动 | 左半屏按住出现摇杆，拖动方向即移动 |
| 转向 | 右半屏拖动 |
| 开火 | 右下「开火」键；按住后在键上滑动可边打边转向 |
| 瞄准 | 「瞄准」键切换 |
| 交互 / 切断中继 | 靠近中继后按住「交互」 |
| 换弹 / 跳跃 / 暂停 | 对应圆形按钮 |

## 运行

直接打开 `index.html`，或：

```bash
python -m http.server 8080
```

## 接入 App（WebView）

### Android（WebView / 混合开发）

```kotlin
// 1. 强制横屏：Activity 里锁定方向
requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

// 2. 允许 WebGL 与触摸
webView.settings.apply {
    javaScriptEnabled = true
    domStorageEnabled = true
    mediaPlaybackRequiresUserGesture = false   // 音频在首次点击后自动恢复
}
webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

// 3. 让网页的全屏请求真正生效（否则 requestFullscreen 无效）
webChromeClient = object : WebChromeClient() {
    override fun onShowCustomView(view: View, callback: CustomViewCallback) { /* 挂到全屏容器 */ }
    override fun onHideCustomView() { /* 退出全屏 */ }
}
```

要点：宿主要允许横屏（`SENSOR_LANDSCAPE` 或按传感器旋转），否则网页端的 `screen.orientation.lock` 会被忽略；WebView 必须开启硬件加速，否则 WebGL 场景会退回软件渲染、帧率极低。

### iOS（WKWebView）

```xml
<!-- Info.plist：允许横屏 -->
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

```swift
config.allowsInlineMediaPlayback = true
config.mediaTypesRequiringUserActionForPlayback = []
webView.scrollView.bounces = false          // 关掉橡皮筋，避免拖视角时整页回弹
webView.scrollView.isScrollEnabled = false
```

iOS Safari / WKWebView **不支持** `screen.orientation.lock()`，也不支持网页全屏。所以在 iOS 上必须由宿主锁定横屏方向；网页端的竖屏守卫会兜住没配好的情况。

### 其他要求

- 页面需通过 **HTTPS** 访问（GitHub Pages 已满足）；`file://` 只适合本地联调
- 首次加载要生成贴图与材质，中端机约 3~8 秒，属正常
- 建议在 App 内禁用下拉刷新与侧滑返回手势，避免战斗中被误触

## 调试参数

| 参数 | 作用 |
| --- | --- |
| `?guard=1` | 强制显示竖屏守卫，便于在桌面核对文案与布局 |
| `?simtouch=1` | 派发一次合成 touchstart，让触屏控件在桌面/无头环境显示，便于核对按钮布局 |
| `?autostart=1` | 跳过开场演出直接进入战斗 |
| `?q=low` / `q=medium` / `q=high` | 指定画质档位；卡顿时优先降这一档 |
| `?noaudio=1` | 关闭音频，用于静默截图与性能测试 |

联调时可读 `window.__appShell` 查看当前是否竖屏、渲染缩放比，并调用 `enterLandscape()` 强制进横屏。

## 已知限制

- 旧版 Android WebView（Chrome 内核低于 80）不支持页面里用到的可选链语法，会白屏；请使用系统 WebView 更新到最新版
- iOS 无法由网页控制屏幕方向，必须宿主配置
- 页面没有做 iOS 安全区的 `viewport-fit` 之外的额外适配（已使用 `safe-area-inset-*`，但 iPhone 横屏左右刘海区仅在真机生效）

## 目录结构

- `index.html` —— 成品，即 APP 横屏版（单文件、自包含，双击可玩）
- `shell-src/` —— 外壳补丁源码
  - `shell.css`：竖屏守卫样式、安全区、横屏矮屏微调
  - `guard.html`：竖屏守卫的 DOM
  - `shell.js`：守卫逻辑、全屏并锁横屏、手势抑制、渲染分辨率自降档
  - `build.ps1`：注入脚本

## 构建

`index.html` 是在桌面版基础上注入外壳补丁生成的：

```powershell
pwsh ./shell-src/build.ps1 -BaseHtml ../King-Arthur-3a/index.html -OutHtml ./index.html
```

补丁只往 `</head>` 前和 `</body>` 前各追加一段，不修改游戏内部的玩法代码，因此可以随时从原版重新构建、不会叠加。
