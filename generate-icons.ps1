Add-Type -AssemblyName System.Drawing

$destDir = "C:\Users\03573608183\youtube-loop-extension\icons"
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

function Generate-LoopIcon {
    param (
        [int]$size,
        [string]$outputPath
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Background circle - YouTube Red (#E62117)
    $margin = [float]($size * 0.04)
    $bgSize = [float]($size - 2 * $margin)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 33, 23))
    $g.FillEllipse($bgBrush, $margin, $margin, $bgSize, $bgSize)

    # Arc setup
    $center = [float]($size / 2.0)
    $radius = [float]($size * 0.28)
    $lineWidth = [Math]::Max(1.8, [float]($size * 0.10))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $lineWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $arcBoxX = $center - $radius
    $arcBoxY = $center - $radius
    $arcBoxW = $radius * 2.0
    $arcBoxH = $radius * 2.0

    # Top arc: sweeps clockwise from 205 to 335 (sweep = 130)
    $g.DrawArc($pen, $arcBoxX, $arcBoxY, $arcBoxW, $arcBoxH, 205, 130)

    # Bottom arc: sweeps clockwise from 25 to 155 (sweep = 130)
    $g.DrawArc($pen, $arcBoxX, $arcBoxY, $arcBoxW, $arcBoxH, 25, 130)

    # Arrowheads
    $arrowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $arrowScale = [Math]::Max(2.0, [float]($size * 0.14))

    # Top arrow at end of top arc (angle 335 deg)
    # 335 deg in radians:
    $rad1 = 335 * [Math]::PI / 180.0
    $ax1 = $center + $radius * [Math]::Cos($rad1)
    $ay1 = $center + $radius * [Math]::Sin($rad1)

    # Direction of tangent at 335 deg for clockwise circle is ( -sin(theta), cos(theta) )
    # at 335 deg: dx = -sin(335) > 0 (pointing right), dy = cos(335) > 0 (pointing down)
    # Tangent vector:
    $tx1 = -[Math]::Sin($rad1)
    $ty1 = [Math]::Cos($rad1)
    # Normal vector pointing outwards from circle:
    $nx1 = [Math]::Cos($rad1)
    $ny1 = [Math]::Sin($rad1)

    $p1_tip = New-Object System.Drawing.PointF([float]($ax1 + $tx1 * $arrowScale * 0.7), [float]($ay1 + $ty1 * $arrowScale * 0.7))
    $p1_left = New-Object System.Drawing.PointF([float]($ax1 - $tx1 * $arrowScale * 0.5 + $nx1 * $arrowScale * 0.6), [float]($ay1 - $ty1 * $arrowScale * 0.5 + $ny1 * $arrowScale * 0.6))
    $p1_right = New-Object System.Drawing.PointF([float]($ax1 - $tx1 * $arrowScale * 0.5 - $nx1 * $arrowScale * 0.6), [float]($ay1 - $ty1 * $arrowScale * 0.5 - $ny1 * $arrowScale * 0.6))
    $g.FillPolygon($arrowBrush, @($p1_tip, $p1_left, $p1_right))

    # Bottom arrow at end of bottom arc (angle 155 deg)
    $rad2 = 155 * [Math]::PI / 180.0
    $ax2 = $center + $radius * [Math]::Cos($rad2)
    $ay2 = $center + $radius * [Math]::Sin($rad2)

    $tx2 = -[Math]::Sin($rad2)
    $ty2 = [Math]::Cos($rad2)
    $nx2 = [Math]::Cos($rad2)
    $ny2 = [Math]::Sin($rad2)

    $p2_tip = New-Object System.Drawing.PointF([float]($ax2 + $tx2 * $arrowScale * 0.7), [float]($ay2 + $ty2 * $arrowScale * 0.7))
    $p2_left = New-Object System.Drawing.PointF([float]($ax2 - $tx2 * $arrowScale * 0.5 + $nx2 * $arrowScale * 0.6), [float]($ay2 - $ty2 * $arrowScale * 0.5 + $ny2 * $arrowScale * 0.6))
    $p2_right = New-Object System.Drawing.PointF([float]($ax2 - $tx2 * $arrowScale * 0.5 - $nx2 * $arrowScale * 0.6), [float]($ay2 - $ty2 * $arrowScale * 0.5 - $ny2 * $arrowScale * 0.6))
    $g.FillPolygon($arrowBrush, @($p2_tip, $p2_left, $p2_right))

    # Save
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Clean up
    $g.Dispose()
    $bmp.Dispose()
    $pen.Dispose()
    $bgBrush.Dispose()
    $arrowBrush.Dispose()
    Write-Output "Generated: $outputPath ($size x $size)"
}

Generate-LoopIcon -size 16 -outputPath "$destDir\icon16.png"
Generate-LoopIcon -size 48 -outputPath "$destDir\icon48.png"
Generate-LoopIcon -size 128 -outputPath "$destDir\icon128.png"
