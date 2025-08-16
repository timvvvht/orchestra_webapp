import { PrunedSCMManager } from './PrunedSCMManager';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
    const repoRoot = '/Users/tim/Code/a2a';
    const manager = new PrunedSCMManager({});

    console.log('Testing PrunedSCMManager on:', repoRoot);

    // 1. Create or get repo
    const repo = await manager.getRepoForCwd(repoRoot);
    console.log('Repository instance acquired.');

    // 2. Create a test file and checkpoint
    const testFile = path.join(repoRoot, 'pruned_test.txt');
    fs.writeFileSync(testFile, 'Hello from PrunedSCMManager - ' + new Date().toISOString());
    const commitHash = await manager.checkpoint(repoRoot, 'pruned test commit');
    console.log('Committed test file. Commit hash:', commitHash);

    // 3. Get history
    const history = await manager.getHistory(repoRoot);
    console.log('History (top 3 commits):', history.slice(0, 3));

    // 4. Show diff between HEAD and HEAD~1 (if possible)
    if (history.length > 1) {
        const diff = await manager.diffBetween(repoRoot, history[1].hash, history[0].hash);
        console.log('Diff between last two commits (data):', JSON.stringify(diff, null, 2));
    } else {
        console.log('Not enough commits for a diff test.');
    }

    // 5. Get file contents at last commit
    const fileContent = await manager.getFileAtCommit(repoRoot, history[0].hash, 'pruned_test.txt');
    console.log('File content at last commit:', fileContent);

    // 6. Revert last commit (if more than 1 commit exists)
    if (history.length > 1) {
        await manager.revert(repoRoot, history[1].hash);
        console.log('Reverted to previous commit.');
    } else {
        console.log('Not enough commits to revert.');
    }

    // Cleanup
    if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
        console.log('Test file cleaned up.');
    }

    console.log('PrunedSCMManager test complete.');
}

main().catch(err => {
    console.error('Error during PrunedSCMManager sandbox test:', err);
    process.exit(1);
});
