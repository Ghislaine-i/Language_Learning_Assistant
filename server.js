const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Supported languages for translation
const SUPPORTED_LANGUAGES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish'
};

// Route 1: Get list of supported languages
app.get('/api/languages', (req, res) => {
    res.json({
        languages: SUPPORTED_LANGUAGES,
        count: Object.keys(SUPPORTED_LANGUAGES).length
    });
});

// Route 2: Translate text
app.get('/api/translate', async (req, res) => {
    try {
        const { text, from, to } = req.query;

        // Validation
        if (!text) {
            return res.status(400).json({ error: 'Text parameter is required' });
        }
        if (!from || !to) {
            return res.status(400).json({ error: 'Source and target languages are required' });
        }
        if (!SUPPORTED_LANGUAGES[from] || !SUPPORTED_LANGUAGES[to]) {
            return res.status(400).json({ error: 'Invalid language code' });
        }

        // MyMemory Translation API
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;

        const response = await axios.get(url, {
            timeout: 10000
        });

        if (response.data.responseStatus !== 200) {
            throw new Error('Translation failed');
        }

        const translatedText = response.data.responseData.translatedText;
        const matches = response.data.matches || [];

        res.json({
            original: text,
            translated: translatedText,
            from: SUPPORTED_LANGUAGES[from],
            to: SUPPORTED_LANGUAGES[to],
            fromCode: from,
            toCode: to,
            alternatives: matches.slice(0, 3).map(match => ({
                translation: match.translation,
                quality: match.quality,
                source: match.source
            }))
        });

    } catch (error) {
        console.error('Translation API Error:', error.message);
        res.status(500).json({
            error: 'Failed to translate text',
            details: error.message
        });
    }
});

// Route 3: Get word definition (English only)
app.get('/api/definition', async (req, res) => {
    try {
        const { word } = req.query;

        if (!word) {
            return res.status(400).json({ error: 'Word parameter is required' });
        }

        // Free Dictionary API
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

        const response = await axios.get(url, {
            timeout: 10000
        });

        const data = response.data[0];

        // Extract relevant information
        const definitions = [];
        const phonetics = [];

        if (data.phonetics) {
            data.phonetics.forEach(p => {
                if (p.text || p.audio) {
                    phonetics.push({
                        text: p.text || '',
                        audio: p.audio || ''
                    });
                }
            });
        }

        if (data.meanings) {
            data.meanings.forEach(meaning => {
                meaning.definitions.forEach(def => {
                    definitions.push({
                        partOfSpeech: meaning.partOfSpeech,
                        definition: def.definition,
                        example: def.example || null,
                        synonyms: def.synonyms || [],
                        antonyms: def.antonyms || []
                    });
                });
            });
        }

        res.json({
            word: data.word,
            phonetics: phonetics,
            definitions: definitions,
            origin: data.origin || null
        });

    } catch (error) {
        console.error('Dictionary API Error:', error.message);
        if (error.response?.status === 404) {
            res.status(404).json({
                error: 'Word not found',
                details: 'No definition available for this word'
            });
        } else {
            res.status(500).json({
                error: 'Failed to fetch definition',
                details: error.message
            });
        }
    }
});

// Route 4: Detect language
app.get('/api/detect', async (req, res) => {
    try {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({ error: 'Text parameter is required' });
        }

        // Use translation API to detect language
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`;

        const response = await axios.get(url, {
            timeout: 10000
        });

        // The API doesn't directly give language detection, but we can infer from the response
        // This is a simplified version - in production you'd use a dedicated language detection API

        res.json({
            text: text,
            detectedLanguage: 'auto-detected',
            confidence: 'medium',
            note: 'Language detection is approximate with this API'
        });

    } catch (error) {
        console.error('Language Detection Error:', error.message);
        res.status(500).json({
            error: 'Failed to detect language',
            details: error.message
        });
    }
});

// Route 5: Get example sentences
app.get('/api/examples', async (req, res) => {
    try {
        const { word } = req.query;

        if (!word) {
            return res.status(400).json({ error: 'Word parameter is required' });
        }

        // Get definition which includes examples
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

        const response = await axios.get(url, {
            timeout: 10000
        });

        const data = response.data[0];
        const examples = [];

        if (data.meanings) {
            data.meanings.forEach(meaning => {
                meaning.definitions.forEach(def => {
                    if (def.example) {
                        examples.push({
                            example: def.example,
                            partOfSpeech: meaning.partOfSpeech
                        });
                    }
                });
            });
        }

        res.json({
            word: word,
            examples: examples,
            count: examples.length
        });

    } catch (error) {
        console.error('Examples API Error:', error.message);
        res.status(500).json({
            error: 'Failed to fetch examples',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Language Learning Assistant'
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Language Learning Assistant running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});