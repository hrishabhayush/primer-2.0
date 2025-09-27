const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow Chrome extension origins (chrome-extension://)
        if (origin.startsWith('chrome-extension://')) {
            return callback(null, true);
        }
        
        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Allow other origins from environment variable
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Primer 2.0 Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Analyze Instagram reel image
app.post('/analyze-reel', async (req, res) => {
    try {
        const { imageData } = req.body;
        
        if (!imageData) {
            return res.status(400).json({ 
                error: 'No image data provided' 
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured' 
            });
        }

        console.log('Analyzing reel image...');

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Analyze this image and identify all clothing items the person is wearing. 
                        
For each clothing item, provide:
- type: clothing category (shirt, pants, shoes, hat, etc.)
- color: specific color name
- style: casual, formal, athletic, etc.
- material: cotton, denim, leather, etc.
- description: detailed description
- confidence: how sure you are (0-1)

Focus only on clothing items. Ignore accessories like jewelry, watches, phones.
Return as JSON array with this exact structure.

Example format:
[
    {
        "type": "shirt",
        "color": "blue",
        "style": "casual",
        "material": "cotton",
        "description": "blue cotton t-shirt with crew neck",
        "confidence": 0.95
    }
]`
                    },
                    {
                        type: "image_url",
                        image_url: { url: imageData }
                    }
                ]
            }],
            max_tokens: 1000
        });

        const analysisText = response.choices[0].message.content;
        
        // Try to parse JSON response
        let clothingItems;
        try {
            // Extract JSON from markdown code blocks if present
            let jsonText = analysisText.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            clothingItems = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('Failed to parse OpenAI response:', analysisText);
            return res.status(500).json({ 
                error: 'Failed to parse AI response',
                rawResponse: analysisText
            });
        }

        console.log('Reel analysis complete:', clothingItems);

        res.json({
            success: true,
            items: clothingItems,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing reel:', error);
        res.status(500).json({ 
            error: 'Failed to analyze reel',
            message: error.message
        });
    }
});

// Test endpoint for development
app.post('/test-analysis', async (req, res) => {
    try {
        const { testImage } = req.body;
        
        if (!testImage) {
            return res.status(400).json({ 
                error: 'No test image provided' 
            });
        }

        // Simple test response
        const mockAnalysis = [
            {
                type: "shirt",
                color: "blue",
                style: "casual",
                material: "cotton",
                description: "blue cotton t-shirt with crew neck",
                confidence: 0.95
            },
            {
                type: "pants",
                color: "black",
                style: "casual",
                material: "denim",
                description: "black slim-fit jeans",
                confidence: 0.92
            }
        ];

        res.json({
            success: true,
            items: mockAnalysis,
            message: "Mock analysis for testing",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in test analysis:', error);
        res.status(500).json({ 
            error: 'Test analysis failed',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.path
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Primer 2.0 Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Reel analysis: http://localhost:${PORT}/analyze-reel`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/test-analysis`);
    
    if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  WARNING: OPENAI_API_KEY not set. Create .env file with your OpenAI API key.');
    }
});
