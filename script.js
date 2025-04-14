// Global flags for pause and reset control
let isPaused = false;
let isReset = false;

// Utility delay function that checks for pause/reset conditions
async function delay(seconds) {
  let remaining = seconds * 1000;
  const interval = 50;
  while (remaining > 0) {
    if (isReset) return false;
    if (!isPaused) {
      const waitTime = Math.min(interval, remaining);
      await new Promise((r) => setTimeout(r, waitTime));
      remaining -= waitTime;
    } else {
      await new Promise((r) => setTimeout(r, interval));
    }
  }
  return true;
}

// Control elements
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const resetButton = document.getElementById("reset-button");
const statusEl = document.getElementById("status");
const hexagons = document.querySelectorAll(".hexagon");
const settingsPanel = document.getElementById("settings-panel");
const colorOptions = document.querySelectorAll(".color-option");
const counterEl = document.getElementById("counter");
const breathDisplay = document.getElementById("breath-display");
const settingsButton = document.getElementById("settings-button");
const phaseTimerEl = document.getElementById("phase-timer");

// Global base color (default)
let baseColor = "#4AAFF7";

// --- Preset values ---
// Inhale scales (outer → inner) and exhale scales (smaller)
const inhaleScales = [1, 0.9, 0.8, 0.7];
const exhaleScales = [0.2, 0.16, 0.12, 0.08];

// Stagger delays (in seconds) for each hexagon.
const inhaleDelays = [0, 0.2, 0.33, 0.5];
const exhaleDelays = [0.5, 0.33, 0.2, 0];

// Blend two hex colors.
function blendColors(color1, color2, factor) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.round(r1 * (1 - factor) + r2 * factor);
  const g = Math.round(g1 * (1 - factor) + g2 * factor);
  const b = Math.round(b1 * (1 - factor) + b2 * factor);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Update hexagon backgrounds.
function updateHexagonColors() {
  const blendFactors = [0, 0.2, 0.4, 0.6];
  hexagons.forEach((hex, idx) => {
    hex.style.background = blendColors(baseColor, "#ffffff", blendFactors[idx]);
  });
}

// Preview mode: use inhale scales; hide counter and phase timer.
function setPreviewState() {
  hexagons.forEach((hex, idx) => {
    hex.style.transition = "";
    hex.style.transform = `scale(${inhaleScales[idx]}) rotate(0deg)`;
  });
  counterEl.style.display = "none";
  phaseTimerEl.style.display = "none";
}

// Animation initial state: start with inhale scales and show counter.
function setAnimationInitialState() {
  hexagons.forEach((hex, idx) => {
    hex.style.transition = "";
    hex.style.transform = `scale(${inhaleScales[idx]}) rotate(0deg)`;
  });
  counterEl.style.display = "block";
  counterEl.style.transition = "";
  counterEl.style.transform = `translate(-50%, -50%) scale(${inhaleScales[0]})`;
  counterEl.textContent = "0";
  phaseTimerEl.style.display = "block";
}

// Retention mode: during retention phase, force hexagons to exhale state, hide counter.
function setRetentionMode() {
  hexagons.forEach((hex, idx) => {
    hex.style.transition = "";
    hex.style.transform = `scale(${exhaleScales[idx]}) rotate(0deg)`;
  });
  counterEl.style.display = "none";
  phaseTimerEl.style.display = "block";
}

// Retention mode: during hold phase, force hexagons to exhale state, hide counter.
function setBreathHoldMode() {
  hexagons.forEach((hex, idx) => {
    hex.style.transition = "";
    hex.style.transform = `scale(${inhaleScales[idx]}) rotate(0deg)`;
  });
  counterEl.style.display = "none";
  phaseTimerEl.style.display = "block";
}

// Restore hexagons after retention.
function restoreHexagons() {
  hexagons.forEach((hex) => {
    hex.style.display = "block";
  });
  phaseTimerEl.style.display = "none";
}

// Run a phase timer that updates phaseTimerEl with remaining time.
function runPhaseTimer(phase, duration) {
  return new Promise(resolve => {
    let startTime = Date.now();
    statusEl.style.display = "block";
    const intervalId = setInterval(() => {
      if (isReset) {
        clearInterval(intervalId);
        resolve();
        return;
      }
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.ceil(Math.max(duration - elapsed, 0));   
      
      if (phase === "Hold") {
        // Update the text display.
        statusEl.textContent = `Hold Breath: ${remaining} sec`;
        // Update each hexagon's transform.
        hexagons.forEach((hex, idx) => {
          const baseAngle = 90;  // Your base rotation for hold
          const additionalRotation = (elapsed / duration) * 360; // full spin over the duration
          hex.style.transform = `scale(${inhaleScales[idx]}) rotate(${baseAngle + additionalRotation}deg)`;
        });
      }
      
      if (phase === "Retention") {
        // Update the text display.
        statusEl.textContent = `Retain Breath: ${remaining} sec`;
        // Update each hexagon's transform.
        hexagons.forEach((hex, idx) => {
          const baseAngle = -90;  // Your base rotation for hold
          const additionalRotation = (elapsed / duration) * -360; // full spin over the duration
          hex.style.transform = `scale(${exhaleScales[idx]}) rotate(${baseAngle + additionalRotation}deg)`;
        });
      }

      if (elapsed >= duration) {
        clearInterval(intervalId);
        resolve();
      }
    }, 100);
  });
}


// Color option event listeners.
colorOptions.forEach((option) => {
  option.addEventListener("click", () => {
    baseColor = option.getAttribute("data-color");
    colorOptions.forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");
    updateHexagonColors();
  });
});

// Toggle settings panel via cog icon.
settingsButton.addEventListener("click", () => {
  if (settingsPanel.style.display === "none" || !settingsPanel.style.display) {
    settingsPanel.style.display = "block";
  } else {
    settingsPanel.style.display = "none";
  }
});

// Main breathing function.
async function startBreathing(event) {
  event.preventDefault();
  isPaused = false;
  isReset = false;
  pauseButton.textContent = "Pause";
  startButton.disabled = true;
  pauseButton.disabled = false;
  resetButton.disabled = false;
  
  // Hide settings and expand container.
  settingsPanel.style.display = "none";
  document.body.classList.add("active");
  setAnimationInitialState();
  
  // 3-second countdown with phase timer.
  counterEl.textContent = "";
  for (let i = 3; i > 0; i--) {
    statusEl.textContent = `Get Ready: ${i} sec`;
    await delay(1);
  }
  
  // Retrieve user settings.
  const inhaleDuration = parseFloat(document.getElementById("inhale").value);
  const exhaleDuration = parseFloat(document.getElementById("exhale").value);
  const retentionDuration = parseFloat(document.getElementById("retention").value);
  const holdDuration = parseFloat(document.getElementById("hold").value);
  const breaths = parseInt(document.getElementById("breaths").value, 10);
  const rounds = parseInt(document.getElementById("rounds").value, 10);
  
  breathDisplay.textContent = `Breaths: ${breaths} • Rounds: ${rounds}`;
  updateHexagonColors();
  
  // Outer loop for rounds.
  for (let r = 0; r < rounds; r++) {
    breathDisplay.textContent = `Breaths: ${breaths} • Rounds: ${r+1}/${rounds}`;
    // Pre-cycle: For the very first round, the first breath is exhale-only.
    
    if (r > 0) {
      counterEl.style.transform = `translate(-50%, -50%) scale(${inhaleScales[0]})`;
      await delay(0.01);
    }   
    
    counterEl.textContent = "0";
    statusEl.textContent = `Breathe Out!`;
    hexagons.forEach((hex, idx) => {
      const adjustedExhaleDuration = Math.max(exhaleDuration - exhaleDelays[idx], 0);
      hex.style.transition = `transform ${adjustedExhaleDuration}s ease-in-out ${exhaleDelays[idx]}s`;
      hex.style.transform = `scale(${exhaleScales[idx]}) rotate(-60deg)`;
    });
    const adjustedCounterExhale = Math.max(exhaleDuration - exhaleDelays[0], 0);
    counterEl.style.transition = `transform ${adjustedCounterExhale}s ease-in-out ${exhaleDelays[0]}s`;
    counterEl.style.transform = `translate(-50%, -50%) scale(${exhaleScales[0]})`;
    await Promise.all([delay(exhaleDuration), runPhaseTimer("Exhale", exhaleDuration)]);
    if (isReset) { finishAnimation(); return; }
    setAnimationInitialState();
    
    
    // Main breathing cycles for this round.
    for (let i = 1; i <= breaths; i++) {
      if (isReset) break;
      // Display the current breath (starting at 0 for first round,
      // so subsequent breaths show 1, 2, …).
      counterEl.textContent = `${i}`;
      
      // Inhale phase.
      if (i == breaths) statusEl.textContent = `Final Breath In!`;
      else statusEl.textContent = `Breathe In!`;
      hexagons.forEach((hex, idx) => {
        const adjustedInhaleDuration = Math.max(inhaleDuration - inhaleDelays[idx], 0);
        hex.style.transition = `transform ${adjustedInhaleDuration}s ease-in-out ${inhaleDelays[idx]}s`;
        hex.style.transform = `scale(${inhaleScales[idx]}) rotate(60deg)`;
      });
      // Delay counter's scaling further on inhale.
      const adjustedCounterInhale = Math.max(inhaleDuration - inhaleDelays[0] + 0.2, 0);
      counterEl.style.transition = `transform ${adjustedCounterInhale}s ease-in-out ${inhaleDelays[0] + 0.2}s`;
      counterEl.style.transform = `translate(-50%, -50%) scale(${inhaleScales[0]})`;
      await Promise.all([delay(inhaleDuration), runPhaseTimer("Inhale", inhaleDuration)]);
      if (isReset) break;
      
      // Exhale phase.
      if (i == breaths) statusEl.textContent = `Final Breath Out!`;
      else statusEl.textContent = `Breathe Out!`;
      hexagons.forEach((hex, idx) => {
        const adjustedExhaleDuration = Math.max(exhaleDuration - exhaleDelays[idx], 0);
        hex.style.transition = `transform ${adjustedExhaleDuration}s ease-in-out ${exhaleDelays[idx]}s`;
        hex.style.transform = `scale(${exhaleScales[idx]}) rotate(-60deg)`;
      });
      const adjustedCounterExhale = Math.max(exhaleDuration - exhaleDelays[0], 0);
      counterEl.style.transition = `transform ${adjustedCounterExhale}s ease-in-out ${exhaleDelays[0]}s`;
      counterEl.style.transform = `translate(-50%, -50%) scale(${exhaleScales[0]})`;
      await Promise.all([delay(exhaleDuration), runPhaseTimer("Exhale", exhaleDuration)]);
      if (isReset) break;
      
      setAnimationInitialState();
    }
    
    // Retention phase.
    setRetentionMode();
    await runPhaseTimer("Retention", retentionDuration);
    if (isReset) break;
    
    // Extra Breath Hold phase.
    
    // Animate an extra inhale phase.
    statusEl.textContent = "Big Breath In!";
    hexagons.forEach((hex, idx) => {
      const adjustedInhaleDuration = Math.max(inhaleDuration - inhaleDelays[idx], 0);
      hex.style.transition = `transform ${adjustedInhaleDuration}s ease-in-out ${inhaleDelays[idx]}s`;
      hex.style.transform = `scale(${inhaleScales[idx]}) rotate(60deg)`;
    });
    const adjustedCounterInhale = Math.max(inhaleDuration - inhaleDelays[0] + 0.2, 0);
    counterEl.style.transition = `transform ${adjustedCounterInhale}s ease-in-out ${inhaleDelays[0] + 0.2}s`;
    counterEl.style.transform = `translate(-50%, -50%) scale(${inhaleScales[0]})`;
    await Promise.all([delay(inhaleDuration), runPhaseTimer("Inhale", inhaleDuration)]);
    if (isReset) break;
    
    // Hold for an additional configurable duration.
    await delay(0.01);
    setBreathHoldMode();
    await runPhaseTimer("Hold", holdDuration);
    if (isReset) break;
    
    await delay(0.01);
    restoreHexagons();
    setAnimationInitialState();
  }
  
  // Final state.
  statusEl.textContent = isReset ? "" : "Done!";
  startButton.disabled = false;
  pauseButton.disabled = true;
  resetButton.disabled = true;
  isReset = false;
  isPaused = false;
  pauseButton.textContent = "Pause";
  
  setAnimationInitialState();
  setPreviewState();
  document.body.classList.remove("active");
}

// Helper to finish animation on reset.
function finishAnimation() {
  statusEl.textContent = "";
  startButton.disabled = false;
  pauseButton.disabled = true;
  resetButton.disabled = true;
  isReset = false;
  isPaused = false;
  pauseButton.textContent = "Pause";
  // Reset breath display from settings.
  breathDisplay.textContent = `Breaths: ${document.getElementById("breaths").value} • Rounds: ${document.getElementById("rounds").value}`;
  setPreviewState();
  document.body.classList.remove("active");
}

// Pause/Resume event listener.
pauseButton.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseButton.textContent = isPaused ? "Resume" : "Pause";
});

// Reset event listener.
resetButton.addEventListener("click", () => {
  isReset = true;
});

// Start button (form submission) listener.
document.getElementById("settings-form").addEventListener("submit", startBreathing);

// Initial setup: use preview state.
setPreviewState();
updateHexagonColors();
