# 构建脚本：把外壳补丁注入桌面版 index.html，生成 APP 横屏版
# 用法：
#   pwsh ./build.ps1 -BaseHtml ../King-Arthur-3a/index.html -OutHtml ./index.html
# 说明：
#   - 补丁只做两处追加：</head> 前插入 <style id="ka-app-shell">，</body> 前插入竖屏守卫与外壳脚本
#   - 每次都从原版重新注入，不会叠加补丁；原文件的其余字节保持不变

param(
  [Parameter(Mandatory = $true)][string]$BaseHtml,
  [string]$OutHtml = (Join-Path (Split-Path -Parent $PSScriptRoot) 'index.html')
)

$ErrorActionPreference = 'Stop'
foreach ($p in @($BaseHtml, (Join-Path $PSScriptRoot 'shell.css'), (Join-Path $PSScriptRoot 'guard.html'), (Join-Path $PSScriptRoot 'shell.js'))) {
  if (-not (Test-Path -LiteralPath $p)) { throw "缺少文件：$p" }
}

$t = [IO.File]::ReadAllText($BaseHtml)
if (([regex]::Matches($t, '</head>')).Count -ne 1) { throw '原文件中 </head> 不唯一，停止注入' }
if (([regex]::Matches($t, '</body>')).Count -ne 1) { throw '原文件中 </body> 不唯一，停止注入' }

$css       = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'shell.css'))
$guardHtml = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'guard.html'))
$js        = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'shell.js'))

$styleBlock = "`n<style id=`"ka-app-shell`">`n" + $css + "`n</style>`n</head>"
$guardBlock = "`n" + $guardHtml + "`n<script id=`"ka-app-shell-js`">`n" + $js + "`n</script>`n</body>"

$n = $t.Replace('<title>亚瑟3A大作</title>', '<title>亚瑟3A大作 · 横屏版</title>')
$n = $n.Replace('</head>', $styleBlock)
$n = $n.Replace('</body>', $guardBlock)

[IO.File]::WriteAllText($OutHtml, $n, (New-Object Text.UTF8Encoding($false)))

"标题已加横屏标记： " + $n.Contains('横屏版</title>')
"原文件字符数： $($t.Length)"
"输出字符数：   $($n.Length)（插入 $($n.Length - $t.Length)）"
"输出： $OutHtml"
