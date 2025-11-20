// API Base URL
const API_BASE_URL = window.location.origin;

// Initialize saved translations from localStorage
let savedTranslations = JSON.parse(localStorage.getItem('savedTranslations')) || [];

// Character counter
document.getElementById('inputText').addEventListener('input', function() {
    const count = this.value.length;
    document.getElementById('charCount').textContent = count;

    if (count > 500) {
        this.value = this.value.substring(0, 500);
        document.getElementById('charCount').textContent = '500';
    }
});

// Enter key to search
document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchDefinition();
    }
});

document.getElementById('inputText').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        translateText();
    }
});

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');

    // If saved tab, refresh the list
    if (tabName === 'saved') {
        displaySavedTranslations();
    }
}

// Swap languages
function swapLanguages() {
    const fromLang = document.getElementById('fromLang');
    const toLang = document.getElementById('toLang');

    const temp = fromLang.value;
    fromLang.value = toLang.value;
    toLang.value = temp;

    // Also swap the text
    const inputText = document.getElementById('inputText').value;
    const outputText = document.getElementById('outputText').textContent;

    if (outputText !== 'Translation will appear here...') {
        document.getElementById('inputText').value = outputText;
        document.getElementById('outputText').textContent = inputText;
    }
}

// Translate text
async function translateText() {
    const text = document.getElementById('inputText').value.trim();
    const fromLang = document.getElementById('fromLang').value;
    const toLang = document.getElementById('toLang').value;

    if (!text) {
        showError('Please enter text to translate');
        return;
    }

    if (fromLang === toLang) {
        showError('Please select different source and target languages');
        return;
    }

    showLoading(true);
    hideError();
    document.getElementById('alternatives').classList.add('hidden');
    document.getElementById('saveBtn').classList.add('hidden');
    document.getElementById('copyBtn').classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/api/translate?text=${encodeURIComponent(text)}&from=${fromLang}&to=${toLang}`);

        if (!response.ok) {
            throw new Error('Translation failed');
        }

        const data = await response.json();

        // Display translation
        document.getElementById('outputText').textContent = data.translated;
        document.getElementById('saveBtn').classList.remove('hidden');
        document.getElementById('copyBtn').classList.remove('hidden');

        // Display alternatives if available
        if (data.alternatives && data.alternatives.length > 0) {
            displayAlternatives(data.alternatives);
        }

    } catch (error) {
        console.error('Translation error:', error);
        showError('Failed to translate text. Please try again.');
        document.getElementById('outputText').textContent = 'Translation will appear here...';
    } finally {
        showLoading(false);
    }
}

// Display alternative translations
function displayAlternatives(alternatives) {
    const altList = document.getElementById('altList');
    altList.innerHTML = '';

    alternatives.forEach(alt => {
        const div = document.createElement('div');
        div.className = 'alt-item';
        div.innerHTML = `
            <div class="translation">${alt.translation}</div>
            <div class="quality">Quality: ${Math.round(alt.quality * 100)}% | Source: ${alt.source}</div>
        `;
        altList.appendChild(div);
    });

    document.getElementById('alternatives').classList.remove('hidden');
}

// Copy translation
function copyTranslation() {
    const text = document.getElementById('outputText').textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// Save translation
function saveTranslation() {
    const original = document.getElementById('inputText').value;
    const translated = document.getElementById('outputText').textContent;
    const fromLang = document.getElementById('fromLang');
    const toLang = document.getElementById('toLang');

    const translation = {
        id: Date.now(),
        original: original,
        translated: translated,
        from: fromLang.options[fromLang.selectedIndex].text,
        to: toLang.options[toLang.selectedIndex].text,
        timestamp: new Date().toISOString()
    };

    savedTranslations.unshift(translation);
    localStorage.setItem('savedTranslations', JSON.stringify(savedTranslations));

    const btn = document.getElementById('saveBtn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

// Search word definition
async function searchDefinition() {
    const word = document.getElementById('wordInput').value.trim();

    if (!word) {
        showError('Please enter a word to search');
        return;
    }

    showLoading(true);
    hideError();
    document.getElementById('definitionResult').innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/api/definition?word=${encodeURIComponent(word)}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Word not found');
            }
            throw new Error('Failed to fetch definition');
        }

        const data = await response.json();
        displayDefinition(data);

    } catch (error) {
        console.error('Definition error:', error);
        showError(error.message === 'Word not found' ?
            'Word not found. Please check the spelling.' :
            'Failed to fetch definition. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Display word definition
function displayDefinition(data) {
    const container = document.getElementById('definitionResult');

    let html = `<div class="word-header">
        <div class="word-title">${data.word}</div>`;

    // Add phonetics
    if (data.phonetics && data.phonetics.length > 0) {
        data.phonetics.forEach(phonetic => {
            if (phonetic.text) {
                html += `<div class="phonetic">${phonetic.text}</div>`;
            }
            if (phonetic.audio) {
                html += `<button class="audio-btn" onclick="playAudio('${phonetic.audio}')">🔊 Play</button>`;
            }
        });
    }

    html += `</div>`;

    // Add definitions
    if (data.definitions && data.definitions.length > 0) {
        data.definitions.forEach(def => {
            html += `<div class="definition-item">
                <span class="part-of-speech">${def.partOfSpeech}</span>
                <div class="definition-text">${def.definition}</div>`;

            if (def.example) {
                html += `<div class="example">"${def.example}"</div>`;
            }

            if (def.synonyms && def.synonyms.length > 0) {
                html += `<div class="synonyms"><strong>Synonyms:</strong> <span class="synonym-list">${def.synonyms.join(', ')}</span></div>`;
            }

            if (def.antonyms && def.antonyms.length > 0) {
                html += `<div class="antonyms"><strong>Antonyms:</strong> <span class="antonym-list">${def.antonyms.join(', ')}</span></div>`;
            }

            html += `</div>`;
        });
    }

    container.innerHTML = html;
}

// Play audio pronunciation
function playAudio(url) {
    const audio = new Audio(url);
    audio.play().catch(err => {
        console.error('Audio playback error:', err);
        showError('Unable to play audio');
    });
}

// Display saved translations
function displaySavedTranslations() {
    const container = document.getElementById('savedList');
    const emptyState = document.getElementById('emptySaved');

    if (savedTranslations.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const html = savedTranslations.map(item => `
        <div class="saved-item">
            <div class="languages">${item.from} → ${item.to}</div>
            <div class="original">${item.original}</div>
            <div class="translated">${item.translated}</div>
            <button class="delete-saved" onclick="deleteSaved(${item.id})">Delete</button>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Delete a saved translation
function deleteSaved(id) {
    savedTranslations = savedTranslations.filter(item => item.id !== id);
    localStorage.setItem('savedTranslations', JSON.stringify(savedTranslations));
    displaySavedTranslations();
}

// Clear all saved translations
function clearSaved() {
    if (confirm('Are you sure you want to clear all saved translations?')) {
        savedTranslations = [];
        localStorage.setItem('savedTranslations', JSON.stringify(savedTranslations));
        displaySavedTranslations();
    }
}

// Show loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// Show error
function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.classList.remove('hidden');

    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error
function hideError() {
    document.getElementById('error').classList.add('hidden');
}

// Update language names (not really needed but kept for consistency)
function updateLanguageNames() {
    // This function can be used for additional logic if needed
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Language Learning Assistant loaded');
});