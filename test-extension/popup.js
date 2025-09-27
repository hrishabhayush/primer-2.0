// Popup script for Instagram Reels Test Extension

document.addEventListener('DOMContentLoaded', function() {
    console.log("🧪 Popup loaded!")
    
    // Clear extension badge when popup opens
    chrome.action.setBadgeText({ text: "" })
    
    const statusDiv = document.getElementById('status')
    const imageContainer = document.getElementById('imageContainer')
    const capturedImage = document.getElementById('capturedImage')
    const imageInfo = document.getElementById('imageInfo')
    const testButton = document.getElementById('testButton')
    const clearButton = document.getElementById('clearButton')
    
    // Load last captured image when popup opens
    loadLastCapturedImage()
    
    // Test button - manually test frame capture
    testButton.addEventListener('click', async () => {
        statusDiv.innerHTML = '<p>Testing frame capture...</p>'
        statusDiv.className = 'status'
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            
            if (!tab.url.includes('instagram.com')) {
                statusDiv.innerHTML = '<p>Please go to Instagram first!</p>'
                statusDiv.className = 'status error'
                return
            }
            
            // Send message to content script
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: "captureReelFrame"
            })
            
            if (response && response.success) {
                displayCapturedImage(response)
                statusDiv.innerHTML = '<p>Frame captured successfully!</p>'
                statusDiv.className = 'status success'
            } else {
                statusDiv.innerHTML = `<p>Capture failed: ${response?.error || 'Unknown error'}</p>`
                statusDiv.className = 'status error'
            }
            
        } catch (error) {
            console.error("Error:", error)
            statusDiv.innerHTML = '<p>Error: Make sure you\'re on Instagram with a reel visible!</p>'
            statusDiv.className = 'status error'
        }
    })
    
    // Clear button
    clearButton.addEventListener('click', () => {
        statusDiv.innerHTML = '<p>Extension loaded. Right-click on an Instagram reel to test!</p>'
        statusDiv.className = 'status'
        imageContainer.style.display = 'none'
        hideAllAnalysisStates()
        chrome.storage.local.remove(['lastCapturedImage', 'lastDimensions', 'lastVideoInfo', 'lastAnalysis', 'analysisStatus', 'analysisError', 'timestamp'])
    })
    
    // Load last captured image from storage
    function loadLastCapturedImage() {
        chrome.storage.local.get(['lastCapturedImage', 'lastDimensions', 'lastAnalysis', 'analysisStatus', 'analysisError', 'timestamp'], (result) => {
            if (result.lastCapturedImage) {
                const timeAgo = new Date() - new Date(result.timestamp)
                const minutesAgo = Math.floor(timeAgo / 60000)
                
                statusDiv.innerHTML = `<p>Last capture: ${minutesAgo} minutes ago</p>`
                statusDiv.className = 'status success'
                
                displayCapturedImage({
                    imageData: result.lastCapturedImage,
                    dimensions: result.lastDimensions || { width: 'Unknown', height: 'Unknown' }
                })
                
                // Display analysis results based on status
                if (result.analysisStatus === 'processing') {
                    showLoadingState()
                } else if (result.analysisStatus === 'complete' && result.lastAnalysis) {
                    showAnalysisResults(result.lastAnalysis)
                } else if (result.analysisStatus === 'error') {
                    showErrorState(result.analysisError)
                }
            }
        })
    }
    
    // Display captured image
    function displayCapturedImage(data) {
        capturedImage.src = data.imageData
        imageInfo.textContent = `Dimensions: ${data.dimensions?.width || 'Unknown'} x ${data.dimensions?.height || 'Unknown'}`
        imageContainer.style.display = 'block'
    }
    
    // Show loading state while AI processes
    function showLoadingState() {
        hideAllAnalysisStates()
        document.getElementById('loadingContainer').style.display = 'block'
    }
    
    // Show AI analysis results as clothing menu
    function showAnalysisResults(analysis) {
        hideAllAnalysisStates()
        
        const analysisContainer = document.getElementById('analysisContainer')
        const clothingMenu = document.getElementById('clothingMenu')
        
        if (analysis.success && analysis.items && analysis.items.length > 0) {
            clothingMenu.innerHTML = ''
            
            analysis.items.forEach((item, index) => {
                const optionDiv = document.createElement('div')
                optionDiv.className = 'clothing-option'
                optionDiv.onclick = () => selectClothingItem(item)
                
                optionDiv.innerHTML = `
                    <h4>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</h4>
                    <div class="clothing-description">${item.description}</div>
                `
                
                clothingMenu.appendChild(optionDiv)
            })
            
            analysisContainer.style.display = 'block'
        } else {
            clothingMenu.innerHTML = '<p>No clothing items detected in the image.</p>'
            analysisContainer.style.display = 'block'
        }
    }
    
    // Handle clothing item selection
    function selectClothingItem(item) {
        console.log('Selected clothing item:', item)
        
        // Store selected item
        chrome.storage.local.set({
            selectedClothingItem: item,
            timestamp: Date.now()
        })
        
        // Show selection feedback
        const clothingMenu = document.getElementById('clothingMenu')
        clothingMenu.innerHTML = `
            <div class="selected-item">
                <h4>✅ Selected: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</h4>
                <p>${item.description}</p>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">
                    Next: Find similar products and make payment with crypto
                </p>
            </div>
        `
        
        // TODO: In the future, this would trigger product search and payment flow
    }
    
    // Show error state
    function showErrorState(errorMessage) {
        hideAllAnalysisStates()
        
        const errorContainer = document.getElementById('errorContainer')
        const errorMessageEl = document.getElementById('errorMessage')
        
        errorMessageEl.textContent = errorMessage || 'Unknown error occurred'
        errorContainer.style.display = 'block'
    }
    
    // Hide all analysis states
    function hideAllAnalysisStates() {
        document.getElementById('analysisContainer').style.display = 'none'
        document.getElementById('loadingContainer').style.display = 'none'
        document.getElementById('errorContainer').style.display = 'none'
    }
})

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updatePopup") {
        console.log("Popup update received:", request)
        // Refresh the popup content
        location.reload()
    }
})
