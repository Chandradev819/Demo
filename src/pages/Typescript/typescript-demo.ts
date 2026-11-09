
/**
 * TypeScript Demo for Astro
 * Demonstrates DOM manipulation and event handling.
 */

// =====================================
// 1. Change Text
// =====================================

const changeButton =
    document.querySelector<HTMLButtonElement>("#changeButton");

const message =
    document.querySelector<HTMLParagraphElement>("#message");

changeButton?.addEventListener("click", (): void => {
    if (message) {
        message.textContent = "Hello! TypeScript is working in Astro.";
    }
});

// =====================================
// 2. Change CSS Style
// =====================================

const colorButton =
    document.querySelector<HTMLButtonElement>("#colorButton");

const colorText =
    document.querySelector<HTMLParagraphElement>("#colorText");

colorButton?.addEventListener("click", (): void => {
    if (!colorText) return;

    colorText.style.color = "blue";
    colorText.style.fontWeight = "bold";
    colorText.style.fontSize = "18px";
});

// =====================================
// 3. Show / Hide Element
// =====================================

const toggleButton =
    document.querySelector<HTMLButtonElement>("#toggleButton");

const secretMessage =
    document.querySelector<HTMLParagraphElement>("#secretMessage");

toggleButton?.addEventListener("click", (): void => {
    if (!secretMessage || !toggleButton) return;

    secretMessage.classList.toggle("d-none");

    toggleButton.textContent =
        secretMessage.classList.contains("d-none")
            ? "Show Message"
            : "Hide Message";
});

// =====================================
// 4. Read User Input
// =====================================

const greetButton =
    document.querySelector<HTMLButtonElement>("#greetButton");

const nameInput =
    document.querySelector<HTMLInputElement>("#nameInput");

const greeting =
    document.querySelector<HTMLParagraphElement>("#greeting");

greetButton?.addEventListener("click", (): void => {
    if (!nameInput || !greeting) return;

    const name: string = nameInput.value.trim();

    if (name.length === 0) {
        greeting.textContent = "Please enter your name.";
        greeting.className = "mt-3 mb-0 text-danger";
        return;
    }

    greeting.textContent = `Hello, ${name}! Welcome to Astro.`;
    greeting.className = "mt-3 mb-0 text-success fw-semibold";
});

// =====================================
// 5. Counter
// =====================================

let count: number = 0;

const counter =
    document.querySelector<HTMLHeadingElement>("#counter");

const increaseButton =
    document.querySelector<HTMLButtonElement>("#increase");

const decreaseButton =
    document.querySelector<HTMLButtonElement>("#decrease");

const resetButton =
    document.querySelector<HTMLButtonElement>("#reset");

// Update counter value
function updateCounter(): void {
    if (counter) {
        counter.textContent = count.toString();
    }
}

// Increase counter
increaseButton?.addEventListener("click", (): void => {
    count++;
    updateCounter();
});

// Decrease counter
decreaseButton?.addEventListener("click", (): void => {
    count--;
    updateCounter();
});

// Reset counter
resetButton?.addEventListener("click", (): void => {
    count = 0;
    updateCounter();
});
