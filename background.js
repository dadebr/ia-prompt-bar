chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidebar') {
    // Use sender.tab.windowId to open the side panel in the window of the tab that sent the message.
    if (sender.tab && sender.tab.windowId) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
  }
});