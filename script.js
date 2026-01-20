document.addEventListener('DOMContentLoaded', () => {
    const problemTextDisplay = document.getElementById('problem-text');
    const inputArea = document.getElementById('input-area');
    const timerDisplay = document.getElementById('timer');
    const startButton = document.getElementById('start-btn');
    const finishButton = document.getElementById('finish-btn');
    const resetButton = document.getElementById('reset-btn');
    const charCountDisplay = document.getElementById('char-count');
    const resultModal = document.getElementById('result-modal');
    const resultDetails = document.getElementById('result-details');
    const closeModalBtn = document.getElementById('close-modal');
    const showGradesBtn = document.getElementById('show-grades-btn');
    const gradingModal = document.getElementById('grading-modal');
    const closeGradingModalBtn = document.getElementById('close-grading-modal');

    // Load problems not needed as we pick random on start

    let currentProblem = null;
    let timerInterval = null;
    let timeLeft = 600; // 10 minutes in seconds
    let isRunning = false;

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function updateCharCount() {
        charCountDisplay.textContent = `文字数: ${inputArea.value.length}`;
    }

    function startTimer() {
        if (isRunning) return;

        // Randomly select a problem
        const randomIndex = Math.floor(Math.random() * problems.length);
        currentProblem = problems[randomIndex];

        // Remove check for selectedId


        problemTextDisplay.textContent = currentProblem.text;
        inputArea.value = "";
        inputArea.disabled = false;
        inputArea.focus();
        startButton.disabled = true;
        finishButton.disabled = false;

        timeLeft = 600;
        timerDisplay.textContent = formatTime(timeLeft);

        isRunning = true;
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = formatTime(timeLeft);
            if (timeLeft <= 0) {
                finishExam();
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isRunning = false;
    }

    function calculateLevenshteinDistance(s1, s2) {
        // Simplified diff logic to count errors based on simple LCS or similar is complex.
        // For Word Processor test, usually it's character based.
        // A simple approach: 
        // We will assume the user tries to type the text exactly.
        // We can just count the differences.
        // However, if they skip one char, everything shifts and becomes an error? 
        // Standard diff algorithm (Myers) is better.
        // For simplicity here without external libs, we will look for simple mismatches 
        // but to prevent "shift" errors, we should align them.
        // Let's use a simple per-char comparison for now, but strictly speaking
        // visual comparison is how they often do it, or "Levenshtein distance".
        // Levenshtein distance gives us the minimum edit distance (insert, delete, subst).
        // That is a good proxy for "number of errors".

        const m = s1.length;
        const n = s2.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],    // deletion
                        dp[i][j - 1],    // insertion
                        dp[i - 1][j - 1] // substitution
                    );
                }
            }
        }
        return dp[m][n];
    }

    // BUT! Levenshtein counts distance. 
    // If I typed 1000 chars and missed 1, distance is 1. Correct is 999.
    // If I typed 1000 chars and added 1 extra, distance is 1.
    // The test usually counts "Total Input Characters" - "Penalty"
    // Penalties are based on grade.
    // Let's rely on Lev distance as "Error Count".

    function determineGrade(netScore) {
        if (netScore >= 800) return "初段";
        if (netScore >= 700) return "1級";
        if (netScore >= 600) return "準1級";
        if (netScore >= 500) return "2級";
        if (netScore >= 400) return "準2級";
        if (netScore >= 300) return "3級";
        if (netScore >= 200) return "4級";
        return "不合格";
    }

    function getPenalty(grade) {
        // These are max possible grades based on raw count, but we need to check thresholds.
        // Actually, the penalty depends on the TARGET grade? No.
        // Usually, the penalty is fixed or based on the level range.
        // Reference: 
        // Shodan-Pre1: -5 per error
        // 2-Pre2: -3 per error
        // 3-4: -1 per error

        // Strategy: Calculate score for each tier rule and see what gives the highest result?
        // Or simply:
        // Identify "Target" based on raw input?
        // Let's be generous:
        // If raw input >= 600, apply -5 rule.
        // If 400 <= raw input < 600, apply -3 rule.
        // If raw input < 400, apply -1 rule.
        // This is an approximation.

        return 0; // Logic implemented inside finishExam
    }

    function finishExam() {
        stopTimer();
        inputArea.disabled = true;
        finishButton.disabled = true;
        startButton.disabled = false;

        const inputText = inputArea.value;
        const targetText = currentProblem.text; // The user might not finish.

        // We compare ONLY up to the length they typed?
        // No, in speed test, you just type as much as you can.
        // Errors are usually typos.
        // If they stop typing, the rest is not "error", just "not typed".
        // So we compare against the substring of original text?
        // But what if they skipped a sentence?
        // Simple approach: Compare `inputText` vs `targetText`.
        // The `targetText` is the ground truth.
        // BUT, if I stopped halfway, the Levenshtein distance to the FULL text would be huge (all deletions).
        // That is wrong. We only care about what they typed.
        // We need to find the "best matching prefix" of target text?
        // Or simply: compare against the first N chars of target text where N is input length?
        // What if they skipped a word? "Hello World" -> "Hello rld"
        // Lev distance against "Hello World" is 2 (Wo deleted).
        // Lev distance against "Hello Worl" is ...

        // Better approach for Speed Test app:
        // Assume the user follows the text.
        // We compute Lev distance between `inputText` and `targetText`.
        // BUT we need to handle the "tail" that wasn't typed.
        // We shouldn't penalize for untyped text at the end.

        // Let's Truncate `targetText` to roughly the length of `inputText`?
        // But if they skipped, `inputText` is shorter.
        // Let's use the full text but ignore "Deletion at end" costs?
        // That's complex to modify standard Lev.

        // Workaround:
        // Calculate Lev distance, but subtract the difference in length if target is longer?
        // Distance = (Insertions + Substitutions + Deletions).
        // If I stopped early, I have many Deletions.
        // Roughly: Errors = Distance - (TargetLength - InputLength).
        // If Result < 0, it means I gathered more chars than needed? No.

        // Example: Target "ABCDE", Input "AB"
        // Dist = 3 (C,D,E deleted).
        // Errors = 3 - (5 - 2) = 0. Correct.

        // Example: Target "ABCDE", Input "AC" (Skipped B)
        // Dist = 3 (B deleted, D,E deleted) ... No wait.
        // A B C D E
        // A - C - -
        // Dist: B del, D del, E del. Dist = 3.
        // Errors = 3 - (5 - 2) = 0? FALSE. Error is 1 (B skipped).

        // Wait, "AC" vs "ABCDE".
        // A -> A
        //   -> B (del)
        // C -> C
        //   -> D (del)
        //   -> E (del)
        // Total ops: 3 deletions.
        // Length diff: 5 - 2 = 3.
        // So Errors = 0? That's wrong logic.

        // The standard usually is: Look at the printed paper, look at screen. Mark every mismatch.
        // If I skip "B", that is 1 error. The rest matches.
        // The "untouched" tail is not an error.

        // Let's try matching `inputText` against `targetText` using a diff library logic.
        // Since we can't easily import a diff lib, let's use the simple assumption:
        // "Errors" = Levenshtein(inputText, targetText.substring(0, inputText.length + margin))? No.

        // Let's just use the Input Text as the driver.
        // We try to match it to the Target Text.
        // Using a generous approach:
        // Compare `inputText` with `targetText` using standard Levenshtein.
        // BUT, we treat the `targetText` as being cut off at the point where `inputText` ends matching?

        // Pragmantic Approach:
        // Use a customized comparison that doesn't penalize trailing deletions.
        // Iterate through `inputText` and `targetText`.
        // If match, continue.
        // If mismatch, try to see if next char matches?

        // Let's fallback to a simpler "Char by Char" scan with a small lookahead to detecting missing chars?
        // Or just use the full Levenshtein and subtract the trailing length difference.
        // Let's re-verify:
        // Target: "ABCDE", Input: "AC"
        // Lev("ABCDE", "AC") = 3. Length Diff = 3. Result = 0.
        // Why?
        // "ABCDE" vs "A C"
        // A=A
        // B deleted
        // C=C
        // D deleted
        // E deleted
        // It treats D and E as errors effectively?

        // Correct logic for "AC" vs "ABCDE":
        // User typed 2 chars.
        // They missed B.
        // They stopped before D.
        // So really they tried to type "ABC" but missed B?
        // Or they tried to type "ABCDE" but stopped?

        // Let's assume the user input is intended to match the start of the source.
        // We can search for the `inputText` inside `targetText`? No.

        // Revised Logic:
        // 1. Calculate raw char count: `inputText.length`.
        // 2. Count "Mistakes".
        //    Mistakes = Levenshtein(inputText, targetText.substr(0, inputText.length))?
        //    If I typed "AC", target "ABC". Dist("AC", "ABC") = 1 (Delete B). Correct.
        //    If I typed "ABX", target "ABC". Dist("ABX", "ABC") = 1 (Sub X for C). Correct.
        //    If I typed "ABXE", target "ABCD". Dist("ABXE", "ABCD") = 2 (Sub X for C, Sub E for D). Correct.
        //    So simply comparing Key-for-Key with same length substring is a decent approximation ONLY IF no insertions/deletions shift things.
        //    But Lev handles shifts.
        //    So: `Levenshtein(inputText, targetText.slice(0, inputText.length))`? -> This ignores shifts that pull in future chars.

        //    Example: "ABCDE", Input "ACD". (Missed B).
        //    Target Slice(3): "ABC".
        //    Lev("ACD", "ABC") -> "A" match, "C" subst B? "D" subst C? -> Dist 2.
        //    Real error: Missed B. "C" matches "C", "D" matches "D". 1 Error.

        //    So slicing target to input length is BAD if there are deletions (skips).

        //    What if we include a buffer? `targetText.slice(0, inputText.length + 20)`?
        //    Example: "ABCDE", Input "ACD" (Length 3).
        //    Slice "ABCDE" (Length 5).
        //    Lev("ACD", "ABCDE") = 2 (B del, E del).
        //    We want 1.
        //    The "trailing deletions" in target should be ignored.

        //    Algorithm:
        //    Compute full edit graph (Levenshtein) but the cost of "Delete from Target" at the END of the string is 0.
        //    This is "Semi-Global Alignment".
        //    Since we don't have a library, let's implement a standard DP Lev, but modify the last row?
        //    Actually, simpler: Find the minimum value in the last ROW of the DP matrix?
        //    DP[i][j] = min edit distance between input[0..i] and target[0..j].
        //    We want to match ALL of `inputText` (i=m) against ANY prefix of `targetText`.
        //    So we look at DP[m][j] for all j, and find the minimum?
        //    Yes! MIN(DP[m][0...n]) is the answer.
        //    This means "Distance to transform Target[0..j] into Input".
        //    Wait. Input is the approximation of Target.
        //    We want to transform Input into Target[0..j]?
        //    Distance(Input, TargetPrefix).
        //    Yes. If Input is "ACD" and Target is "ABCDE".
        //    Prefix "AB": Dist("ACD", "AB") -> huge.
        //    Prefix "ABC": Dist("ACD", "ABC") -> 2.
        //    Prefix "ABCD": Dist("ACD", "ABCD") -> 1 (B deleted). (A=A, C=C, D=D).
        //    Prefix "ABCDE": Dist("ACD", "ABCDE") -> 2 (B del, E del).
        //    So the Min of the last row gives us the best fit "Error Count".

        const rawCount = inputText.length;
        const timeSpent = 600 - timeLeft; // seconds
        const paceMultiplier = timeSpent > 0 ? (600 / timeSpent) : 0;

        const errorData = calculateDetailedErrors(inputText, currentProblem.text);
        const errorCount = errorData.distance;

        // Calculate 10-min equivalent data
        const estCharCount = Math.round(rawCount * paceMultiplier);
        const estErrorCount = Math.round(errorCount * paceMultiplier);

        // Grade calculation based on ESTIMATED scores
        // We evaluate from top to bottom based on the multiplier tiers.
        let grade = "不合格";
        let finalNet = 0;

        // Tiers for Grading:
        // Tier 1 (Dan & 1st/Pre-1st): 800+ (or lower for Pre-1st), -5 penalty
        // Tier 2 (2nd/Pre-2nd): 400-599 range, -3 penalty
        // Tier 3 (3rd/4th): 200-399 range, -1 penalty

        const netTier1 = estCharCount - (estErrorCount * 5);
        const netTier2 = estCharCount - (estErrorCount * 3);
        const netTier3 = estCharCount - (estErrorCount * 1);

        if (netTier1 >= 600) {
            finalNet = netTier1;
            if (netTier1 >= 3000) grade = "十段";
            else if (netTier1 >= 2750) grade = "九段";
            else if (netTier1 >= 2500) grade = "八段";
            else if (netTier1 >= 2250) grade = "七段";
            else if (netTier1 >= 2000) grade = "六段";
            else if (netTier1 >= 1750) grade = "五段";
            else if (netTier1 >= 1500) grade = "四段";
            else if (netTier1 >= 1250) grade = "三段";
            else if (netTier1 >= 1000) grade = "二段";
            else if (netTier1 >= 800) grade = "初段";
            else if (netTier1 >= 700) grade = "1級";
            else grade = "準1級";
        } else if (netTier2 >= 400) {
            finalNet = netTier2;
            if (netTier2 >= 500) grade = "2級";
            else grade = "準2級";
        } else if (netTier3 >= 200) {
            finalNet = netTier3;
            if (netTier3 >= 300) grade = "3級";
            else grade = "4級";
        } else {
            finalNet = netTier3;
            grade = "不合格";
        }

        // Result Display
        let message = `
            <div class="result-summary">
                <p><span>実入力文字数</span> <span>${rawCount} 文字</span></p>
                <p><span>経過時間</span> <span>${formatTime(timeSpent)} / 10:00</span></p>
                <p><span>ミス数</span> <span>${errorCount} 箇所</span></p>
            </div>
            
            <div class="result-estimation" style="background: rgba(255,100,100,0.1); padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid rgba(255,100,100,0.2);">
                <div style="font-weight: bold; margin-bottom: 10px; color: #ff6b6b; font-size: 0.9em;">10分間換算データ（級判定用）</div>
                <p style="display:flex; justify-content:space-between; margin: 5px 0;"><span>予測文字数</span> <span>${estCharCount} 文字</span></p>
                <p style="display:flex; justify-content:space-between; margin: 5px 0;"><span>予測ミス数</span> <span>${estErrorCount} 箇所</span></p>
                <p style="display:flex; justify-content:space-between; margin: 5px 0; font-weight: bold;"><span>正味得点</span> <span>${finalNet} 点</span></p>
            </div>

            <p><span>判定級</span> <span style="font-size: 1.8em; color: #ff6b6b; font-weight: bold; display: block; margin-top: 10px;">${grade}</span></p>
            
            <div class="input-header" style="margin-top:20px;">詳細フィードバック (赤字: ミス / [抜]: 脱字)</div>
            <div class="error-report">
                ${errorData.html}
            </div>
        `;

        resultDetails.innerHTML = message;
        resultModal.style.display = 'flex';
    }

    // Semi-Global: Match full s1 against prefix of s2
    // Returns { distance, html }
    function calculateDetailedErrors(s1, s2) {
        const m = s1.length;
        const n = s2.length;
        // Optimization: Clip s2 to s1.length + tolerance.
        const s2Clipped = s2.substring(0, m + 50);
        const nClipped = s2Clipped.length;

        const dp = Array.from({ length: m + 1 }, () => Array(nClipped + 1).fill(0));

        // Initialization
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= nClipped; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= nClipped; j++) {
                if (s1[i - 1] === s2Clipped[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],    // insertion (extra char in input)
                        dp[i][j - 1],    // deletion (missing char in input)
                        dp[i - 1][j - 1] // substitution
                    );
                }
            }
        }

        // Find best match position j in the last row
        let minDist = Infinity;
        let bestJ = 0;
        for (let j = 0; j <= nClipped; j++) {
            if (dp[m][j] < minDist) {
                minDist = dp[m][j];
                bestJ = j;
            }
        }

        // Backtrack to build the HTML report
        let i = m;
        let j = bestJ;
        let reportParts = [];

        while (i > 0 || j > 0) {
            // Priority 1: Diagonal Match
            if (i > 0 && j > 0 && s1[i - 1] === s2Clipped[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
                reportParts.unshift(s1[i - 1]);
                i--; j--;
            }
            // Priority 2: Diagonal Substitution
            else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
                reportParts.unshift(`<span class="error-char">${s1[i - 1]}</span>`);
                i--; j--;
            }
            // Priority 3: Vertical (Insertion in Input / Extra character)
            else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
                reportParts.unshift(`<span class="error-char">${s1[i - 1]}</span>`);
                i--;
            }
            // Priority 4: Horizontal (Deletion from Input / Missing character)
            else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
                reportParts.unshift(`<span class="error-char">[抜]</span>`);
                j--;
            }
            else {
                // Should not reach here with standard Levenshtein, but for safety:
                if (i > 0) {
                    reportParts.unshift(`<span class="error-char">${s1[i - 1]}</span>`);
                    i--;
                } else if (j > 0) {
                    j--;
                }
            }
        }

        return {
            distance: minDist,
            html: reportParts.join('').replace(/\n/g, '<br>')
        };
    }

    inputArea.addEventListener('input', updateCharCount);

    startButton.addEventListener('click', startTimer);

    finishButton.addEventListener('click', finishExam);

    resetButton.addEventListener('click', () => {
        stopTimer();
        timeLeft = 600;
        timerDisplay.textContent = formatTime(timeLeft);
        inputArea.value = "";
        charCountDisplay.textContent = "文字数: 0";
        inputArea.disabled = true;
        startButton.disabled = false;
        finishButton.disabled = true;
        resultModal.style.display = 'none';
        problemTextDisplay.textContent = "スタートボタンを押して問題を表示してください。";
    });

    closeModalBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
    });

    showGradesBtn.addEventListener('click', () => {
        gradingModal.style.display = 'flex';
    });

    closeGradingModalBtn.addEventListener('click', () => {
        gradingModal.style.display = 'none';
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape: Reset
        if (e.code === 'Escape') {
            e.preventDefault();
            resetButton.click();
            return;
        }

        // Shift + Space: Finish
        if (e.code === 'Space' && e.shiftKey) {
            if (!finishButton.disabled) {
                e.preventDefault();
                finishButton.click();
            }
            return;
        }

        // Space: Start
        // Only if start button is enabled (not running) AND we are not inside the textarea (though start button is disabled when in textarea usually)
        // Actually, if we are in textarea, start button IS disabled.
        // So checking !startButton.disabled is safe.
        // However, we must ensure we don't block normal typing of space if start button happens to be enabled (it shouldn't be when typing).
        if (e.code === 'Space' && !e.shiftKey) {
            if (!startButton.disabled) {
                e.preventDefault(); // Prevent scrolling
                startButton.click();
            }
        }
    });
});
