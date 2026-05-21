param(
    [Parameter(Mandatory=$false)]
    [string]$Remote
)

Write-Host "=== Git quick setup for this project ===" -ForegroundColor Cyan

# 1) Check Git installation
try {
    git --version | Out-Null
} catch {
    Write-Error "Git is not installed or not available in PATH. Install Git for Windows from https://git-scm.com/download/win and try again."
    exit 1
}

# 2) Ensure we are in the project folder
$here = Get-Location
Write-Host "Working directory: $here"

# 3) Initialize repo if needed
if (-not (Test-Path -LiteralPath ".git")) {
    Write-Host "No .git folder found. Initializing a new Git repository..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -ne 0) { Write-Error "git init failed"; exit 1 }
} else {
    Write-Host ".git folder found. Using existing repository." -ForegroundColor Green
}

# 4) Configure user identity if missing (optional guidance)
$userName = git config user.name
$userEmail = git config user.email
if (-not $userName -or -not $userEmail) {
    Write-Host "Tip: Configure your identity (one-time per machine):" -ForegroundColor Yellow
    Write-Host "  git config --global user.name \"Your Name\""
    Write-Host "  git config --global user.email \"you@example.com\""
}

# 5) Stage and make an initial commit if there are no commits yet
$hasCommit = $true
try {
    git rev-parse --verify HEAD | Out-Null
    if ($LASTEXITCODE -ne 0) { $hasCommit = $false }
} catch { $hasCommit = $false }

if (-not $hasCommit) {
    Write-Host "Creating initial commit..." -ForegroundColor Yellow
    git add -A
    git commit -m "Initial commit"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Nothing to commit or commit failed. Continuing..." -ForegroundColor Yellow
    }
}

# 6) Ensure default branch is 'main'
# Determine current branch
$currentBranch = (git symbolic-ref --short HEAD 2>$null)
if (-not $currentBranch) { $currentBranch = "main" }
if ($currentBranch -ne "main") {
    Write-Host "Renaming branch '$currentBranch' to 'main'..." -ForegroundColor Yellow
    git branch -M main
    if ($LASTEXITCODE -ne 0) { Write-Host "Could not rename branch. Continuing with '$currentBranch'." -ForegroundColor Yellow } 
    else { $currentBranch = "main" }
}

# 7) Add 'origin' remote if missing (or show existing)
$originUrl = ""
try {
    $originUrl = git remote get-url origin 2>$null
} catch { $originUrl = "" }

if (-not $originUrl) {
    if (-not $Remote) {
        Write-Host "No remote 'origin' is set. Provide the remote URL via -Remote parameter, e.g.:" -ForegroundColor Yellow
        Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\\init-git.ps1 -Remote \"https://github.com/<owner>/<repo>.git\""
        Write-Host "Or SSH: -Remote \"git@github.com:<owner>/<repo>.git\""
        exit 0
    }
    Write-Host "Adding remote 'origin' => $Remote" -ForegroundColor Yellow
    git remote add origin $Remote
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to add remote 'origin'"; exit 1 }
} else {
    Write-Host "Existing remote 'origin' => $originUrl" -ForegroundColor Green
    if ($Remote -and ($Remote -ne $originUrl)) {
        Write-Host "Note: A different remote was provided. To replace the remote run:" -ForegroundColor Yellow
        Write-Host "  git remote set-url origin $Remote"
    }
}

# 8) Push to remote
Write-Host "Pushing to origin '$currentBranch'..." -ForegroundColor Cyan
$push = git push -u origin $currentBranch 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $push
    Write-Host "Push failed." -ForegroundColor Red
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "- If prompted for credentials on HTTPS, use a Personal Access Token (PAT) as password."
    Write-Host "- If the remote already has commits, run: git fetch origin && git rebase origin/$currentBranch (resolve conflicts) then push again."
    Write-Host "- If histories are unrelated (ZIP + existing remote), you may need: git pull --rebase --allow-unrelated-histories origin $currentBranch"
    exit 1
}

Write-Host "Success! Your project is now pushed to the remote repository." -ForegroundColor Green
Write-Host "Next steps: open your Git hosting service to verify the branch '$currentBranch'."