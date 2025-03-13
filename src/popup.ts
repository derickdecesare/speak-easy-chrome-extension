// Popup script for Speak Easy extension

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
  const voiceSelect = document.getElementById(
    "voiceSelect"
  ) as HTMLSelectElement;
  const modelSelect = document.getElementById(
    "modelSelect"
  ) as HTMLSelectElement;
  const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
  const statusElement = document.getElementById(
    "status"
  ) as HTMLParagraphElement;

  if (
    !apiKeyInput ||
    !saveButton ||
    !statusElement ||
    !voiceSelect ||
    !modelSelect
  ) {
    console.error("Failed to find one or more UI elements");
    return;
  }

  // Add test button
  const testButton = document.createElement("button");
  testButton.textContent = "Test Voice";
  testButton.style.marginTop = "10px";
  saveButton.parentNode?.insertBefore(testButton, saveButton.nextSibling);
  testButton.after(document.createElement("br"));

  // Load saved settings
  chrome.storage.sync.get(
    ["apiKey", "voiceId", "modelId"],
    (data: { apiKey?: string; voiceId?: string; modelId?: string }) => {
      if (data.apiKey) {
        apiKeyInput.value = data.apiKey;
      }

      if (data.voiceId) {
        voiceSelect.value = data.voiceId;
      }

      if (data.modelId) {
        modelSelect.value = data.modelId;
      }
    }
  );

  // Save settings
  saveButton.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const voiceId = voiceSelect.value;
    const modelId = modelSelect.value;

    chrome.storage.sync.set({ apiKey, voiceId, modelId }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving settings:", chrome.runtime.lastError);
        statusElement.textContent = "Error saving settings";
        statusElement.style.color = "red";
      } else {
        statusElement.textContent = "Settings saved!";
        statusElement.style.color = "green";
        setTimeout(() => {
          statusElement.textContent = "";
        }, 2000);
      }
    });
  });

  // Function to ensure content script is loaded
  async function ensureContentScriptLoaded(tabId: number): Promise<boolean> {
    return new Promise((resolve) => {
      // First try to ping the content script
      chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Inject the content script
          chrome.scripting.executeScript(
            {
              target: { tabId: tabId },
              files: ["content.js"],
            },
            (results) => {
              if (chrome.runtime.lastError) {
                console.error("Failed to inject:", chrome.runtime.lastError);
                statusElement.textContent = "Error: Could not inject script";
                statusElement.style.color = "red";
                resolve(false);
              } else {
                // Give the script a moment to initialize
                setTimeout(() => resolve(true), 200);
              }
            }
          );
        } else {
          resolve(true);
        }
      });
    });
  }

  // Test voice button
  testButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      statusElement.textContent = "Please enter an API key first";
      statusElement.style.color = "red";
      return;
    }

    const voiceId = voiceSelect.value;
    const modelId = modelSelect.value;

    // Get active tab and send test message
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        statusElement.textContent = "Testing voice...";
        statusElement.style.color = "blue";

        // Save the settings first
        chrome.storage.sync.set({ apiKey, voiceId, modelId }, async () => {
          // Ensure the content script is loaded
          const tabId = tabs[0].id!;
          const isInjected = await ensureContentScriptLoaded(tabId);

          if (!isInjected) {
            statusElement.textContent = "Failed to initialize on this page";
            statusElement.style.color = "red";
            return;
          }

          // Then send test message
          chrome.tabs.sendMessage(
            tabId,
            {
              action: "speak",
              text: "This is a test of the Speak Easy extension",
              voiceId,
              modelId,
            },
            { frameId: 0 }, // Only send to the main frame
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error testing voice:", chrome.runtime.lastError);
                statusElement.textContent =
                  "Error: " + chrome.runtime.lastError.message;
                statusElement.style.color = "red";
              } else {
                statusElement.textContent = "Test sent!";
                statusElement.style.color = "green";
              }
            }
          );
        });
      } else {
        statusElement.textContent = "No active tab found";
        statusElement.style.color = "red";
      }
    });
  });
});
