// Content script for Speak Easy extension

// Global variable to track the button
let speakEasyButton: HTMLElement | null = null;

// Flag to prevent duplicate initialization
if (!(window as any).__speakEasyInitialized) {
  (window as any).__speakEasyInitialized = true;

  // Ensure we only initialize when DOM is ready
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    initializeSpeakEasy();
  } else {
    document.addEventListener("DOMContentLoaded", initializeSpeakEasy);
  }
}

// Initialize the extension
function initializeSpeakEasy() {
  // Remove initialization log

  // Remove any existing buttons
  const existingButtons = document.querySelectorAll(
    `div[id^="speak-easy"], button[id^="speak-easy"]`
  );
  existingButtons.forEach((btn) => {
    // Keep this log as it's useful for debugging
    console.log("Removing existing button:", btn.id);
    btn.remove();
  });

  // Initialize everything
  initSpeakEasy();

  // Tell the background that we're ready
  try {
    chrome.runtime.sendMessage({ action: "contentScriptReady" });
  } catch (e) {
    console.error("Failed to send ready message:", e);
  }
}

// Main initialization function
function initSpeakEasy() {
  // Remove initialization log

  // Ensure document.body is available
  if (!document.body) {
    console.error("Document body not available, cannot initialize button");
    return;
  }

  // Create a simple button as a native button element
  speakEasyButton = document.createElement("button");
  speakEasyButton.id = "speak-easy-button-simple";
  speakEasyButton.innerHTML = "🔊";
  speakEasyButton.style.cssText = `
    position: absolute;
    display: none; 
    background: #4285f4;
    color: white;
    border: none;
    outline: none;
    border-radius: 50%;
    width: 36px; 
    height: 36px;
    line-height: 36px;
    text-align: center;
    cursor: pointer;
    z-index: 2147483647;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    font-size: 18px;
    padding: 0;
    margin: 0;
  `;

  // Add to document but keep hidden initially
  document.body.appendChild(speakEasyButton);
  // Remove button creation log

  // Add just one simple click handler
  speakEasyButton.addEventListener("click", handleButtonClick);

  // Debounce timer
  let positionUpdateTimeout: number | null = null;

  // Listen for selection changes
  document.addEventListener("selectionchange", () => {
    // Clear any pending timeouts to avoid multiple updates
    if (positionUpdateTimeout) {
      window.clearTimeout(positionUpdateTimeout);
      positionUpdateTimeout = null;
    }

    // Hide the button immediately when selection changes
    if (speakEasyButton) {
      speakEasyButton.style.display = "none";
    }

    // Wait ~300ms to ensure selection is stable before showing button
    positionUpdateTimeout = window.setTimeout(() => {
      // Only show button if selection is valid and stable
      const selection = window.getSelection();
      if (
        selection &&
        selection.rangeCount > 0 &&
        selection.toString().trim() !== ""
      ) {
        updateButtonPosition();
      }
    }, 300);
  });

  // Position the button near the selection
  function updateButtonPosition() {
    if (!speakEasyButton) return;

    const selection = window.getSelection();

    // Check for valid selection
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim() === ""
    ) {
      // No valid selection, hide button
      speakEasyButton.style.display = "none";
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Remove selection rectangle log

    if (rect.width === 0 || rect.height === 0) {
      speakEasyButton.style.display = "none";
      return;
    }

    // Position at top-right of selection
    const top = rect.top - 40 + window.scrollY; // 40px above selection
    const left = rect.right - 36 + window.scrollX; // Aligned with right edge

    // Apply position
    speakEasyButton.style.top = `${Math.round(top)}px`;
    speakEasyButton.style.left = `${Math.round(left)}px`;
    speakEasyButton.style.display = "block";

    // Remove button position log
  }

  // Button click handler
  function handleButtonClick(event: Event) {
    // Remove click handler log
    event.preventDefault();
    event.stopPropagation();

    // Store the selection text immediately
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : "";

    // Remove selection log

    if (selectedText) {
      // Hide the button first
      speakEasyButton!.style.display = "none";

      // Speak the text
      // Remove speaking log
      speakText(selectedText);
    }
  }

  // Add keyboard shortcut for Option+K (alt+k on Mac)
  document.addEventListener("keydown", (event) => {
    // Mac uses Alt key for Option
    if (
      event.altKey &&
      (event.key === "k" || event.key === "K" || event.code === "KeyK")
    ) {
      // Remove keyboard shortcut log

      const selection = window.getSelection()?.toString();
      // Remove selection log

      if (selection && selection.length > 0) {
        // Remove speaking log
        event.preventDefault(); // Prevent default browser behavior
        speakText(selection);
      } else {
        console.log("No text selected for keyboard shortcut");
      }
    }
  });

  // Function to speak the current selection
  function speakCurrentSelection() {
    const selection = window.getSelection()?.toString();
    console.log("Selection:", selection);
    if (selection && selection.length > 0) {
      // Remove speaking log
      speakText(selection);
      return true;
    } else {
      console.log("No text selected to speak");
      return false;
    }
  }

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener(
    (
      request: {
        action: string;
        text?: string;
        requestId?: string;
        voiceId?: string;
        modelId?: string;
      },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      // Remove message received log

      // Handle ping messages to check if content script is loaded
      if (request.action === "ping") {
        // Remove ping log
        sendResponse({ status: "pong" });
        return true;
      }

      // Handle keyboard shortcut activation from background
      if (request.action === "speakSelection") {
        // Remove speakSelection log
        const success = speakCurrentSelection();
        sendResponse({ success });
        return true;
      }

      if (request.action === "speak" && request.text) {
        // Remove processing log
        speakText(request.text, request.voiceId, request.modelId);
        sendResponse({ status: "Speaking text" });
      }
      return true;
    }
  );

  // Function to speak the selected text using 11labs API
  async function speakText(
    text: string,
    overrideVoiceId?: string,
    overrideModelId?: string
  ) {
    try {
      // Filter text before processing
      text = filterText(text);

      // Remove API key log
      // Get API key from storage
      const settingsResponse = await new Promise<{
        apiKey: string;
        voiceId?: string;
        modelId?: string;
      }>((resolve) => {
        chrome.runtime.sendMessage({ action: "getApiKey" }, (response) => {
          // Remove API key response log
          resolve(response || { apiKey: "" });
        });
      });

      const apiKey = settingsResponse.apiKey;

      if (!apiKey) {
        console.error("No API key found");
        alert("Please set your 11labs API key in the extension popup");
        return;
      }

      // Using the multilingual model with high quality audio output
      const voiceId =
        overrideVoiceId || settingsResponse.voiceId || "vqoh9orw2tmOS3mY7D2p"; // Default to Sofi
      // Remove API call log
      const modelId =
        overrideModelId || settingsResponse.modelId || "eleven_flash_v2_5"; // Default to flash

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: modelId,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`API Error (${response.status}):`, errorText);
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }

      // Remove successful response log
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      // Remove audio URL log

      const audio = new Audio(audioUrl);

      // Clean up the object URL after the audio is loaded
      audio.onended = () => {
        // Remove playback ended log
        URL.revokeObjectURL(audioUrl);
      };

      // Remove playback start log
      await audio.play();
    } catch (error) {
      console.error("Error speaking text:", error);
      alert("Error speaking text. Please check your API key and try again.");
    }
  }

  // Function to filter text before sending to the API
  function filterText(text: string): string {
    // More comprehensive URL regex that catches domains with or without www/http
    const urlRegex =
      /(https?:\/\/[^\s]+)|([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,63}(:[0-9]{1,5})?(\/[^\s]*)?)/gi;

    // Filter mathematical symbols and special characters that might be difficult to pronounce
    const mathSymbolsRegex =
      /[∀∁∂∃∄∅∆∇∈∉∊∋∌∍∎∏∐∑−∓∔∕∖∗∘∙√∛∜∝∞∟∠∡∢∣∤∥∦∧∨∩∪∫∬∭∮∯∰∱∲∳∴∵∶∷∸∹∺∻∼∽∾∿≀≁≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≠≡≢≣≤≥≦≧≨≩≪≫≬≭≮≯≰≱≲≳≴≵≶≷≸≹≺≻≼≽≾≿⊀⊁⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋⊌⊍⊎⊏⊐⊑⊒⊓⊔⊕⊖⊗⊘⊙⊚⊛⊜⊝⊞⊟⊠⊡⊢⊣⊤⊥⊦⊧⊨⊩⊪⊫⊬⊭⊮⊯⊰⊱⊲⊳⊴⊵⊶⊷⊸⊹⊺⊻⊼⊽⊾⊿⋀⋁⋂⋃⋄⋅⋆⋇⋈⋉⋊⋋⋌⋍⋎⋏⋐⋑⋒⋓⋔⋕⋖⋗⋘⋙⋚⋛⋜⋝⋞⋟⋠⋡⋢⋣⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱]/g;

    const originalText = text;

    // Apply URL filtering
    let filteredText = text.replace(urlRegex, "");

    // Apply math symbols filtering
    filteredText = filteredText.replace(mathSymbolsRegex, "");

    // Only log if something was actually filtered
    if (originalText !== filteredText) {
      console.log("Contenido filtrado detectado:");
      console.log("Texto original:", originalText);
      console.log("Texto filtrado:", filteredText);
    }

    return filteredText;
  }

  // Export debugging functions
  (window as any).debugSpeakEasy = {
    speak: (text: string) =>
      speakText(text || "This is a test of the speech functionality."),
    showButton: () => {
      if (speakEasyButton) {
        speakEasyButton.style.display = "block";
        speakEasyButton.style.top = "100px";
        speakEasyButton.style.left = "100px";
      }
    },
    testClick: () => {
      if (speakEasyButton) {
        // Keep this log as it's useful for debugging
        console.log("Testing button click");
        speakEasyButton.click();
      }
    },
  };
  // Remove initialization complete log
}
