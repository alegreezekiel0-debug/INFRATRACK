$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlCandidates = @(
    'C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe',
    'C:\Program Files\MySQL\MySQL Server 26.10\bin\mysql.exe'
)
$mysql = $mysqlCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$mavenCandidates = @(
    (Join-Path $env:USERPROFILE 'Downloads\apache-maven-3.9.16-bin\apache-maven-3.9.16\bin\mvn.cmd')
)
$mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
$maven = if ($mavenCommand) { $mavenCommand.Source } else { $mavenCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1 }

if (-not $mysql) {
    throw 'MySQL command-line client was not found. Install MySQL Server, then run InfraTrack.bat again.'
}
if (-not $maven) {
    throw 'Maven was not found. Install Maven or add it to PATH, then run InfraTrack.bat again.'
}

$securePassword = Read-Host 'Enter the MySQL root password (leave blank if none; input is hidden)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:DB_USERNAME = 'root'
    $env:DB_PASSWORD = $password
    $env:MYSQL_PWD = $password

    Write-Host 'Creating the InfraTrack database if it does not exist...'
    Get-Content -LiteralPath (Join-Path $PSScriptRoot 'create-database.sql') -Raw | & $mysql --protocol=TCP --host=127.0.0.1 --user=root
    if ($LASTEXITCODE -ne 0) {
        throw 'MySQL could not create the InfraTrack database. Check that MySQL is running and the password is correct.'
    }

    Write-Host 'Starting the InfraTrack backend. Keep this window open while using the app.'
    & $maven -f (Join-Path $PSScriptRoot 'pom.xml') spring-boot:run
    if ($LASTEXITCODE -ne 0) {
        throw 'The InfraTrack backend stopped with an error. Review the messages above.'
    }
}
finally {
    $env:DB_PASSWORD = $null
    $env:MYSQL_PWD = $null
    $password = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $securePassword.Dispose()
}
