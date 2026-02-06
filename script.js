const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const spinCounterText = document.getElementById('spinCounter');

let spinCount = 0;
let realGiftsRevealed = 0;
let currentRotation = 0;
let isSpinning = false;
let lastLandedIndex = null;
let wonPrizes = []; // Track won prizes for recap
let gameStarted = false;

// Audio elements
const spinningAudio = new Audio('assets/spinning.mp3');
const tickAudio = new Audio('assets/tick.mp3');
const prizeAudio = new Audio('assets/prize.mp3');
const penaltyAudio = new Audio('assets/penalty.mp3');

// Helper function to play sound
function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio playback failed:', e));
}

// Helper function to play tick sound for each segment (non-blocking)
function playTickSound() {
    const tickClone = tickAudio.cloneNode();
    tickClone.play().catch(e => console.log('Tick sound failed:', e));
}

// The game segments
let segments = [
    { label: "Cinema Card", type: 'real', color: '#9b59b6', icon: '🎬', description: 'Cinema Card' },
    { label: "Surf Class", type: 'fake', color: '#95a5a6', icon: '🏄‍♀️', description: 'Surf Class' },
    { label: "Speech", type: 'penalty', color: '#e74c3c', icon: '🎤', description: 'You have to give a short speech to thank the group.' },
    { label: "Spa Voucher", type: 'real', color: '#8e44ad', icon: '🧖‍♀️', description: 'Spa Voucher' },
    { label: "Yoga w Puppies", type: 'fake', color: '#7f8c8d', icon: '🧘‍♀️', description: 'Yoga with Puppies' },
    { label: "Secret Message", type: 'penalty', color: '#f39c12', icon: '💌', description: 'Choose one person here and tell them something nice.' },
    { label: "Confession", type: 'penalty', color: '#d35400', icon: '😳', description: 'Tell an embarrassing moment that happened to you in your life.' },
    { label: "Guests's pick", type: 'penalty', color: '#16a085', icon: '🤔', description: 'The guests will chose your penalty' }
];

// Draw the wheel
function drawWheel() {
    const numSegs = segments.length;
    const arc = (2 * Math.PI) / numSegs;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    segments.forEach((seg, i) => {
        const theta = i * arc;
        
        // Draw Slice
        ctx.beginPath();
        ctx.fillStyle = seg.color;
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius - 10, theta, theta + arc);
        ctx.fill();
        ctx.stroke();

        // Draw Text
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(theta + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.fillText(seg.label, radius - 30, 5);
        ctx.restore();
    });
}

// Rigging logic
function getTargetIndex(spinNumber) {
    const chooseRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Helper to pick a random index matching a predicate; fallback to any index if none
    const pickIndex = (predicate) => {
        const candidates = segments.map((s, i) => predicate(s) ? i : -1).filter(i => i !== -1);
        if (candidates.length === 0) return Math.floor(Math.random() * segments.length);
        return chooseRandom(candidates);
    };

    if (spinNumber === 1) {
        const idx = segments.findIndex(s => s.label === "Speech");
        return idx !== -1 ? idx : Math.floor(Math.random() * segments.length);
    }
    if (spinNumber === 2) {
        return pickIndex(s => s.type === 'real');
    }
    if (spinNumber === 3) {
        return pickIndex(s => s.type === 'real' || s.type === 'penalty');
    }
    if (spinNumber === 4) {
        // Spin 4 is always a penalty
        return pickIndex(s => s.type === 'penalty');
    }
    return Math.floor(Math.random() * segments.length);
}

function spin() {
    if (isSpinning) return;
    isSpinning = true;
    spinCount++;

    const targetIdx = getTargetIndex(spinCount);
    lastLandedIndex = targetIdx;
    const numSegs = segments.length;
    const segmentAngle = 360 / numSegs;
    // Calculate rotation so the visual segment aligns with the rigged target
    const centerAngle = (targetIdx * segmentAngle) + (segmentAngle / 2);
    // Pointer is at top: 270deg relative to canvas' 0deg (right side)
    const rotationToPointer = 270 - centerAngle;

    // Keep spins reasonable while varying duration: choose a few full rotations
    const extraSpins = (3 + Math.floor(Math.random() * 3)) * 360; // 3-5 full spins

    // Build a monotonically increasing rotation value so the wheel always spins forward
    const base = Math.floor(currentRotation / 360) * 360;
    currentRotation = base + extraSpins + rotationToPointer;

    // Spin duration between 7 and 9 seconds
    const duration = 15 + Math.random() * 2;
    canvas.style.transition = `transform ${duration}s cubic-bezier(0.25, 1, 0.45, 0.94)`;
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    // Play spinning audio
    playSound(spinningAudio);

    setTimeout(() => {
        isSpinning = false;
        // Stop spinning audio and play result sound
        spinningAudio.pause();
        // Wait 1 second before showing result
        setTimeout(() => {
            showResult(segments[targetIdx]);
        }, 1000);
    }, duration * 1500);
}

function showResult(seg) {
    const modal = document.getElementById('resultModal');
    document.getElementById('resultText').innerText = seg.label;
    document.getElementById('resultIcon').innerText = seg.icon;
    // Use the description from the segment
    const explanationEl = document.getElementById('resultExplanation');
    let explanation = seg.description || '';
    
    if (seg.type === 'real') {
        realGiftsRevealed++;
        wonPrizes.push(seg); // Track for recap
        playSound(prizeAudio);
    } else if (seg.type === 'penalty') {
        wonPrizes.push(seg); // Track all outcomes for recap
        playSound(penaltyAudio);
    } else if (seg.type === 'fake') {
        wonPrizes.push(seg);
    }
    explanationEl.innerText = explanation;

    modal.classList.remove('hidden');
    spinCounterText.innerText = `Spins left: ${4 - spinCount}`;
}

document.getElementById('continueBtn').onclick = () => {
    document.getElementById('resultModal').classList.add('hidden');
    // Remove the segment that was just landed so it won't appear in the next spin
    if (lastLandedIndex !== null && lastLandedIndex >= 0 && lastLandedIndex < segments.length) {
        segments.splice(lastLandedIndex, 1);
        lastLandedIndex = null;
        drawWheel();
    }

    // Show spin prompt modal
    showSpinPrompt();
};

// Spin Prompt Modal
document.getElementById('spinAgainBtn').onclick = () => {
    document.getElementById('spinPromptModal').classList.add('hidden');
    // Continue the game normally
};

document.getElementById('stopBtn').onclick = () => {
    document.getElementById('spinPromptModal').classList.add('hidden');
    // Check if both prizes are revealed
    if (realGiftsRevealed >= 2) {
        // Can stop - show recap
        showGameRecap();
    } else {
        // Cannot stop - show confirmation with warning
        const prizesWon = wonPrizes.filter(p => p.type === 'real' || p.type === 'fake').length;
        const prizesRemaining = 4 - prizesWon;
        document.getElementById('prizesLeftText').innerText = `You can still win ${prizesRemaining} more prizes!`;
        document.getElementById('confirmStopBtn').classList.add('hidden');
        document.getElementById('continueSpinningBtn').classList.remove('hidden');
        document.getElementById('stopConfirmModal').classList.remove('hidden');
    }
};

// Stop Confirmation Modal
document.getElementById('continueSpinningBtn').onclick = () => {
    document.getElementById('stopConfirmModal').classList.add('hidden');
    document.getElementById('spinPromptModal').classList.remove('hidden');
};

// Game Recap
function showGameRecap() {
    const recapEl = document.getElementById('recapPrizes');
    recapEl.innerHTML = '';
    wonPrizes.forEach(prize => {
        const prizeEl = document.createElement('p');
        prizeEl.innerText = `${prize.icon} ${prize.label}`;
        recapEl.appendChild(prizeEl);
    });
    document.getElementById('gameRecapModal').classList.remove('hidden');
}

function showSpinPrompt() {
    document.getElementById('spinsLeftText').innerText = `Spins left: ${4 - spinCount}`;
    document.getElementById('spinPromptModal').classList.remove('hidden');
    
    // If no spins left, auto-show recap
    if (spinCount >= 4) {
        document.getElementById('spinPromptModal').classList.add('hidden');
        showGameRecap();
    }
}

// Starting Screen
document.getElementById('playBtn').onclick = () => {
    document.getElementById('startingScreenModal').classList.add('hidden');
    document.getElementById('wheelWrapper').classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    gameStarted = true;
};

spinBtn.onclick = spin;
drawWheel();

// Initialize: hide wheel and controls on page load
document.getElementById('wheelWrapper').classList.add('hidden');
document.getElementById('controls').classList.add('hidden');
