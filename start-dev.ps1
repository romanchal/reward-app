$ErrorActionPreference = 'Stop'

$ports = @(4100, 4175, 4176, 4000, 5173, 5174, 8080, 8081)

Write-Host 'Cleaning stale Node/Vite processes...'

foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($c in $connections) {
                if ($c.OwningProcess) {
                    try {
                        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                        Write-Host "Stopped process $($c.OwningProcess) on port $port"
                    } catch {}
                }
            }
        }
    } catch {}
}

$nodeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    foreach ($p in $nodeProcesses) {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($p.ProcessId)").CommandLine
        if ($cmd -match 'vite|tsx|npm|concurrently|node') {
            try {
                Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped stale Node process $($p.ProcessId)"
            } catch {}
        }
    }
}

Write-Host 'Starting app...'
Set-Location $PSScriptRoot
npm run dev
