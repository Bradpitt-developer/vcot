Add-Type -AssemblyName System.Drawing

$assets = Join-Path (Split-Path $PSScriptRoot -Parent) "assets"
New-Item -ItemType Directory -Force -Path $assets | Out-Null

function New-BrandIcon {
    param(
        [string]$Path,
        [int]$Size,
        [bool]$TransparentBackground
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    if ($TransparentBackground) {
        $graphics.Clear([System.Drawing.Color]::Transparent)
    }
    else {
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#128C7E"))
        $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 255, 255, 255))
        $graphics.FillEllipse($glowBrush, [int]($Size * 0.44), [int](-$Size * 0.1), [int]($Size * 0.78), [int]($Size * 0.78))
        $glowBrush.Dispose()
    }

    $circleSize = [int]($Size * 0.67)
    $circleX = [int](($Size - $circleSize) / 2)
    $circleY = [int](($Size - $circleSize) / 2)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $graphics.FillEllipse($whiteBrush, $circleX, $circleY, $circleSize, $circleSize)

    $font = New-Object System.Drawing.Font("Segoe UI", [float]($Size * 0.245), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0B7568"))
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, [float](-$Size * 0.012), $Size, $Size)
    $graphics.DrawString("SS", $font, $greenBrush, $textRect, $format)

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $format.Dispose()
    $font.Dispose()
    $greenBrush.Dispose()
    $whiteBrush.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Created $Path"
}

New-BrandIcon -Path (Join-Path $assets "icon.png") -Size 1024 -TransparentBackground $false
New-BrandIcon -Path (Join-Path $assets "adaptive-icon.png") -Size 1024 -TransparentBackground $true
New-BrandIcon -Path (Join-Path $assets "favicon.png") -Size 64 -TransparentBackground $false
