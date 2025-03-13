// Background script for Speak Easy extension

// Make sure the context menu is created
function createContextMenu() {
  // First remove any existing menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "speakText",
      title: "Speak with 11labs",
      contexts: ["selection"],
    });
  });
}

// Function to inject content script if needed
async function injectContentScriptIfNeeded(tabId: number) {
  try {
    // Check if the content script is already loaded by trying to send a ping message
    return new Promise<boolean>((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Inject the content script if we didn't get a response
          chrome.scripting.executeScript(
            {
              target: { tabId: tabId },
              files: ["content.js"],
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Failed to inject content script:",
                  chrome.runtime.lastError
                );
                resolve(false);
              } else {
                resolve(true);
              }
            }
          );
        } else {
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error("Error checking for content script:", error);
    return false;
  }
}

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "speak-selected-text") {
    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const tabId = tabs[0].id;

      // Make sure content script is injected
      const isInjected = await injectContentScriptIfNeeded(tabId);

      if (isInjected) {
        // Trigger the content script to get and speak the selection
        // Only send to the main frame to prevent duplicate processing
        chrome.tabs.sendMessage(
          tabId,
          { action: "speakSelection" },
          { frameId: 0 } // Only send to the main frame
        );
      } else {
        console.error("Could not inject content script for keyboard shortcut");
      }
    }
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(
  async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === "speakText" && info.selectionText && tab?.id) {
      // Make sure content script is injected
      const isInjected = await injectContentScriptIfNeeded(tab.id);

      if (isInjected) {
        // Now send the message to only the top-level frame (frameId: 0)
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "speak",
            text: info.selectionText,
          },
          { frameId: 0 }, // Only send to the main frame
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message:",
                chrome.runtime.lastError.message
              );
              alert(
                "Could not connect to the page. Please refresh the page and try again."
              );
            }
          }
        );
      } else {
        alert(
          "Could not initialize speech on this page. Please try a different page or refresh."
        );
      }
    }
  }
);

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (
    request: { action: string; message?: string },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ) => {
    if (request.action === "ping") {
      sendResponse({ status: "pong" });
      return;
    }

    if (request.action === "getApiKey") {
      chrome.storage.sync.get(
        ["apiKey", "voiceId", "modelId"],
        (data: { apiKey?: string; voiceId?: string; modelId?: string }) => {
          sendResponse({
            apiKey: data.apiKey || "",
            voiceId: data.voiceId || "vqoh9orw2tmOS3mY7D2p", // Default to Sofi
            modelId: data.modelId || "eleven_flash_v2_5", // Default to flash
          });
        }
      );
      return true; // Required for async response
    }
  }
);
