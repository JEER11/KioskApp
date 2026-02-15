if(-not (git rev-parse --is-inside-work-tree 2>NUL)) {
    Write-Output 'Not a git repository in workspace root.'
    exit 0
}
$changes = git status --porcelain
if ($changes) {
    Write-Output 'Changes detected:'
    git status --short
    git add -A
    git commit -m 'Save changes'
    git push
} else {
    Write-Output 'No changes to commit.'
}
