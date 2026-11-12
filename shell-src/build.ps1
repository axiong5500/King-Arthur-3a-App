# 构建 King-Arthur-3a-App（APP 横屏版）
# 用法：pwsh build.ps1
# 逻辑：读取原版 index.html，把 shell.css / guard.html / shell.js 注入到固定锚点，
#       原文件其余字节保持不变；每次重建都从原版重新注入，避免补丁叠加。

param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$base   = Join-Path $Root 'King-Arthur-3a\index.html'
$outDir = Join-Path $Root 'King-Arthur-3a-App'
$outFile = Join-Path $outDir 'index.html'

foreach ($p in @($base, (Join-Path $PSScriptRoot 'shell.css'), (Join-Path $PSScriptRoot 'guard.html'), (Join-Path $PSScriptRoot 'shell.js'))) {
  if (-not (Test-Path -LiteralPath $p)) { throw "缺少文件：$p" }
}

$t = [IO.File]::ReadAllText($base)
if (([regex]::Matches($t, '</head>')).Count -ne 1) { throw '原文件中 </head> 不唯一，停止注入' }
if (([regex]::Matches($t, '</body>')).Count -ne 1) { throw '原文件中 </body> 不唯一，停止注入' }

$css       = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'shell.css'))
$guardHtml = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'guard.html'))
$js        = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'shell.js'))

$styleBlock = "`n<style id=`"ka-app-shell`">`n" + $css + "`n</style>`n</head>"
$guardBlock = "`n" + $guardHtml + "`n<script id=`"ka-app-shell-js`">`n" + $js + "`n</script>`n</body>"

# 标题：加「· 横屏版」标记，幂等（已有标记则不动）
$origTitle = [regex]::Match($t, '(?<=<title>)[^<]*(?=</title>)').Value
if (-not $origTitle) { throw '原文件中未找到 <title>' }
$newTitle = if ($origTitle -like '*· 横屏版') { $origTitle } else { "$origTitle · 横屏版" }
$n = [regex]::Replace($t, '<title>[^<]*</title>', "<title>$newTitle</title>", 1)
$n = $n.Replace('</head>', $styleBlock)
$n = $n.Replace('</body>', $guardBlock)

if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
[IO.File]::WriteAllText($outFile, $n, (New-Object Text.UTF8Encoding($false)))

# 自检：补丁齐全、原内容零损伤
$checks = [ordered]@{
  '亚瑟出现次数'         = ([regex]::Matches($n, '亚瑟').Count)
  '亚瑟王中王出现次数'   = ([regex]::Matches($n, '亚瑟王中王').Count)
  '几猫出现次数'         = ([regex]::Matches($n, '几猫').Count)
  '外壳样式'             = $n.Contains('ka-app-shell')
  '竖屏守卫'             = $n.Contains('id="rot-guard"')
  '外壳脚本'             = $n.Contains('__appShell')
  '插入字符数'           = $n.Length - $t.Length
}
$checks.GetEnumerator() | ForEach-Object { "{0}: {1}" -f $_.Key, $_.Value }
"输出：$outFile ($((Get-Item -LiteralPath $outFile).Length) 字节)"
