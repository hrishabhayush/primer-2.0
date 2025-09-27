// Background script for Instagram Reels Test Extension

console.log("🧪 Instagram Reels Test Extension loaded!")

// Create context menu when extension installs
chrome.runtime.onInstalled.addListener((details) => {
    console.log("Extension installed:", details.reason)
    
    // Create context menu for videos and all contexts
    chrome.contextMenus.create({
        id: "findSimilarProducts",
        title: "Find Similar Products",
        contexts: ["video", "page"],
        documentUrlPatterns: ["https://www.instagram.com/*"]
    })
    
    console.log("✅ Context menu created for Instagram videos!")
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("🧪 Context menu clicked!", info)
    
    if (info.menuItemId === "findSimilarProducts") {
        console.log("User wants to find similar products!")
        
        // Check if we're on Instagram
        if (!tab.url.includes('instagram.com')) {
            console.log("❌ Not on Instagram")
            return
        }
        
        // Show loading notification immediately
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && tabs[0].url.includes('instagram.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showLoadingButton"
                })
            }
        })
        
        // Send message to content script with specific targeting info
        chrome.tabs.sendMessage(tab.id, { 
            action: "captureReelFrame",
            tabId: tab.id,
            // Pass the specific element that was right-clicked
            targetElementId: info.targetElementId,
            frameId: info.frameId
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError)
                return
            }
            
            if (response && response.success) {
                console.log("✅ Frame captured successfully!")
                console.log("Image data length:", response.imageData.length)
                
                // Store image data temporarily
                chrome.storage.local.set({
                    lastCapturedImage: response.imageData,
                    lastDimensions: response.dimensions,
                    lastVideoInfo: response.videoInfo,
                    timestamp: Date.now(),
                    analysisStatus: 'processing'
                })
                
                // Show notification that analysis is starting
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                    title: 'Primer 2.0',
                    message: 'Analyzing reel... Please wait.'
                })
                
                // Send image to backend for AI analysis
                analyzeReelWithAI(response.imageData, response.dimensions, response.videoInfo)
                
            } else {
                console.error("❌ Frame capture failed:", response)
            }
        })
    }
})

// Function to analyze reel with AI
async function analyzeReelWithAI(imageData, dimensions, videoInfo) {
    try {
        console.log("🤖 Sending image to AI for reel analysis...")
        
        const response = await fetch('http://localhost:3001/analyze-reel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageData: imageData
            })
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const analysisResult = await response.json()
        console.log("✅ AI analysis complete:", analysisResult)
        
        // Store complete results
        chrome.storage.local.set({
            lastCapturedImage: imageData,
            lastDimensions: dimensions,
            lastVideoInfo: videoInfo,
            lastAnalysis: analysisResult,
            timestamp: Date.now(),
            analysisStatus: 'complete'
        })
        
        // Make the extension icon more prominent and show completion notification
        chrome.action.setBadgeText({
            text: "✓"
        })
        
        chrome.action.setBadgeBackgroundColor({
            color: "#4CAF50"
        })
        
        // Inject floating button into Instagram page
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && tabs[0].url.includes('instagram.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showFloatingButton",
                    itemCount: analysisResult.items?.length || 0
                })
            }
        })
        
        // Also show desktop notification as backup
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            title: '🎉 Primer 2.0 - Analysis Complete!',
            message: `Found ${analysisResult.items?.length || 0} clothing items! Check Instagram page for shopping button.`
        })
        
    } catch (error) {
        console.error("❌ AI reel analysis failed:", error)
        
        // Store error state
        chrome.storage.local.set({
            lastCapturedImage: imageData,
            lastDimensions: dimensions,
            lastVideoInfo: videoInfo,
            analysisError: error.message,
            timestamp: Date.now(),
            analysisStatus: 'error'
        })
        
        // Show error notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            title: 'Primer 2.0',
            message: 'Reel analysis failed. Click extension for details.'
        })
    }
}

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
    // Clear the badge when user clicks the extension icon
    chrome.action.setBadgeText({
        text: ""
    })
    
    console.log("Extension icon clicked - popup will open with latest analysis")
})

// Handle notification clicks - open extension popup
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log("Notification clicked, opening extension popup")
    
    // Clear the badge
    chrome.action.setBadgeText({ text: "" })
    
    // Try to open popup (this might not work in all contexts)
    try {
        chrome.action.openPopup()
    } catch (error) {
        console.log("Could not auto-open popup:", error)
        // Fallback: Focus the extension icon so user knows to click it
        chrome.action.setBadgeText({ text: "!" })
        chrome.action.setBadgeBackgroundColor({ color: "#FF5722" })
    }
})

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getLastCapturedImage") {
        chrome.storage.local.get(['lastCapturedImage', 'lastAnalysis', 'analysisStatus', 'analysisError', 'timestamp'], (result) => {
            sendResponse(result)
        })
        return true // Keep message channel open
    } else if (request.action === "openExtension") {
        // Handle floating button click - try to open popup
        console.log("Floating button clicked, attempting to open extension")
        
        // Clear badge
        chrome.action.setBadgeText({ text: "" })
        
        // Try to open popup
        try {
            chrome.action.openPopup()
        } catch (error) {
            console.log("Could not auto-open popup:", error)
            // Fallback: Make extension icon more prominent
            chrome.action.setBadgeText({ text: "!" })
            chrome.action.setBadgeBackgroundColor({ color: "#FF5722" })
        }
    }
})
