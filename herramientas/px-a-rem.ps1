# Pasa los font-size de px a rem (16px = 1rem) y multiplica los vw por var(--escala-letra),
# para que el tamaño de letra de Ajustes agrande todo el texto. Uso: .\px-a-rem.ps1 css\componentes.css
param([Parameter(Mandatory)][string]$Archivo)
$utf8 = New-Object System.Text.UTF8Encoding $false
$texto = [IO.File]::ReadAllText((Resolve-Path $Archivo), $utf8)
$cultura = [Globalization.CultureInfo]::InvariantCulture
$nuevo = [regex]::Replace($texto, 'font-size:([^;}]*)', {
  param($m)
  $valor = [regex]::Replace($m.Groups[1].Value, '(?<![\w.])([\d.]+)px', {
    param($n)
    $rem = [math]::Round([double]::Parse($n.Groups[1].Value, $cultura) / 16, 4)
    $rem.ToString('0.####', $cultura) + 'rem'
  })
  $valor = [regex]::Replace($valor, '(?<![\w.])([\d.]+)vw', { param($n) "calc($($n.Groups[1].Value)vw * var(--escala-letra))" })
  'font-size:' + $valor
})
[IO.File]::WriteAllText((Resolve-Path $Archivo), $nuevo, $utf8)