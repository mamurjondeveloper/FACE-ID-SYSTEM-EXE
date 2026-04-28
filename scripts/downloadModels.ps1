$ErrorActionPreference = "Stop"

$base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$required = @(
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1"
)
$minSizes = @{
  "ssd_mobilenetv1_model-weights_manifest.json" = 1000
  "ssd_mobilenetv1_model-shard1" = 5000000
  "face_landmark_68_model-weights_manifest.json" = 500
  "face_landmark_68_model-shard1" = 300000
  "face_recognition_model-weights_manifest.json" = 500
  "face_recognition_model-shard1" = 6000000
}

$modelsDir = Join-Path $PSScriptRoot "..\models"
$modelsDir = (Resolve-Path $modelsDir).Path

Write-Host "Checking face model files..."
$missing = @()
foreach ($file in $required) {
  $target = Join-Path $modelsDir $file
  if (-not (Test-Path $target)) {
    $missing += $file
    continue
  }
  $size = (Get-Item $target).Length
  if ($size -lt $minSizes[$file]) {
    Write-Host "File looks corrupted, will re-download: $file ($size bytes)"
    Remove-Item $target -Force
    $missing += $file
  }
}

if ($missing.Count -eq 0) {
  Write-Host "All model files already exist."
  exit 0
}

Write-Host "Missing files found. Downloading..."
foreach ($file in $missing) {
  $url = "$base/$file"
  $out = Join-Path $modelsDir $file
  Write-Host "Downloading $file ..."
  Invoke-WebRequest -Uri $url -OutFile $out
  $size = (Get-Item $out).Length
  if ($size -lt $minSizes[$file]) {
    throw "Downloaded file is invalid or incomplete: $file ($size bytes)"
  }
}

Write-Host "Model download completed."
exit 0
