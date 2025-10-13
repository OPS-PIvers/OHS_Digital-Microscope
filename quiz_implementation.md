# Quiz Feature Implementation Plan

## Overview
Add a new zone action type `'quiz'` alongside existing `'banner'` and image navigation actions. Zones can display multiple-choice quizzes (2-4 answer options) with immediate feedback and optional rationale for incorrect answers.

---

## Critical Regression Prevention Points

### 1. **Data Structure Compatibility** ✓ SAFE
**Current zone properties:**
- Core: `type` ('rect' or 'poly'), `x`, `y`, `width`, `height`, `label`, `points`
- Actions: `actionType` ('banner'), `targetView` (number), `bannerText`, `bannerPosition`

**New quiz properties** (all optional):
- `actionType: 'quiz'`
- `quizQuestion` (string)
- `quizAnswers` (array of objects: `[{ text: string, rationale?: string }]`)
- `quizCorrectIndex` (number, 0-based)
- `quizShowRationale` (boolean)

**Why safe:**
- No changes to existing properties
- Purely additive - old zones without these properties continue to work
- Spreadsheet zones column remains JSON array - just adds new properties
- Backward compatible: zones without `actionType` default to sequential navigation

### 2. **UI Presentation: Modal (Recommended)**

**Option A: Modal (RECOMMENDED)**
- ✅ **Pros:**
  - No layout shifts or reflows
  - Works on all screen sizes without responsive complexity
  - Familiar pattern (already used for admin forms)
  - Isolates quiz state from simulation view
  - Blocks accidental zone clicks during quiz
- ❌ **Cons:**
  - Blocks view of image momentarily (acceptable for quiz context)

**Option B: Slide-out Panel**
- ✅ **Pros:**
  - Keeps image visible
  - Modern UX pattern
- ❌ **Cons:**
  - Complex responsive design for mobile
  - Risk of panel obscuring zones on small screens
  - More CSS/JS code = higher regression risk
  - Could interfere with banner positioning
  - Requires z-index management

**Decision: Modal** - safer implementation, lower regression risk, reuses existing modal infrastructure

### 3. **Zone Click Handler** ✓ ZERO RISK - PURELY ADDITIVE

**Current flow** ([Index.html:1146-1168](Index.html#L1146-L1168), similar in admin preview):
```javascript
zoneDiv.addEventListener('click', (e) => {
    console.log(`Zone ${index} clicked!`);
    e.stopPropagation();

    // Check if zone displays a banner
    if (zone.actionType === 'banner' && zone.bannerText) {
        const position = zone.bannerPosition || 'bottom';
        showZoneBanner(zone.bannerText, position);
    }
    // Check if zone has a specific target view
    else if (zone.targetView !== undefined && zone.targetView !== null) {
        const targetIndex = parseInt(zone.targetView);
        if (targetIndex >= 0 && targetIndex < currentLessonViews.length) {
            navigateToView(targetIndex);
        } else {
            console.error(`Invalid targetView ${targetIndex} for zone ${index}`);
            zoomToNextView(); // Fallback to sequential navigation
        }
    } else {
        // Default behavior: advance to next view sequentially
        zoomToNextView();
    }
});
```

**New implementation** - add BEFORE the final `else`:
```javascript
zoneDiv.addEventListener('click', (e) => {
    console.log(`Zone ${index} clicked!`);
    e.stopPropagation();

    // Check if zone displays a banner
    if (zone.actionType === 'banner' && zone.bannerText) {
        const position = zone.bannerPosition || 'bottom';
        showZoneBanner(zone.bannerText, position);
    }
    // NEW: Check if zone displays a quiz
    else if (zone.actionType === 'quiz' && zone.quizQuestion) {
        showQuizModal(zone);
    }
    // Check if zone has a specific target view
    else if (zone.targetView !== undefined && zone.targetView !== null) {
        const targetIndex = parseInt(zone.targetView);
        if (targetIndex >= 0 && targetIndex < currentLessonViews.length) {
            navigateToView(targetIndex);
        } else {
            console.error(`Invalid targetView ${targetIndex} for zone ${index}`);
            zoomToNextView(); // Fallback to sequential navigation
        }
    } else {
        // Default behavior: advance to next view sequentially
        zoomToNextView();
    }
});
```

**Why zero risk:**
- Existing conditions are NOT modified
- Quiz check added as new `else if` branch
- Falls through to existing logic if quiz properties missing
- No changes to banner or navigation logic

**Replication points:**
- Simulation view: [Index.html:1146](Index.html#L1146)
- Admin zone preview (if exists): Search for similar zone click handlers in admin canvas preview

### 4. **Admin Zone Creation Flow** ✓ SAFE ADDITION

**Current flow** ([Index.html:3255-3330](Index.html#L3255-L3330)):
1. User draws zone (rect or polygon)
2. Modal asks for label (optional text input)
3. Modal asks for action with dropdown:
   - `{ value: '', label: 'None (Sequential navigation)' }`
   - `{ value: 'banner', label: '📝 Display Text Banner' }`
   - `{ value: '0', label: 'Image 1: ...' }` (for each image)
4. If banner selected → second modal for banner text + position
5. Zone saved with appropriate properties

**New implementation:**
- Add to action dropdown: `{ value: 'quiz', label: '❓ Quiz Question' }`
- Add new branch:
```javascript
if (selectedAction === 'quiz') {
    showQuizConfigModal(adminState.zones, index);
}
```

**Why safe:**
- Dropdown just gets one more option
- New conditional branch doesn't modify existing banner/image logic
- Follows exact same pattern as banner implementation

**Replication points:**
- Admin zone editor: [Index.html:3255-3330](Index.html#L3255-L3330)
- NOTE: Coordinate Helper view (lines 1716-1965) appears to be legacy/duplicate functionality - **verify if still in use before modifying**

### 5. **Quiz Configuration Modal**

**Two-step modal flow:**

**Step 1: Quiz Question & Answers**
```javascript
showCustomModal({
    type: 'multi',
    title: 'Create Quiz Question',
    message: 'Enter the quiz question and answer options:',
    fields: [
        {
            type: 'textarea',  // NEW TYPE - need to add support
            id: 'quizQuestion',
            label: 'Quiz Question',
            placeholder: 'e.g., What is the primary function of the mitochondria?',
            required: true
        },
        {
            type: 'text',
            id: 'answer1',
            label: 'Answer Option 1',
            placeholder: 'First answer option',
            required: true
        },
        {
            type: 'text',
            id: 'answer2',
            label: 'Answer Option 2',
            placeholder: 'Second answer option',
            required: true
        },
        {
            type: 'text',
            id: 'answer3',
            label: 'Answer Option 3 (optional)',
            placeholder: 'Third answer option (leave blank to skip)'
        },
        {
            type: 'text',
            id: 'answer4',
            label: 'Answer Option 4 (optional)',
            placeholder: 'Fourth answer option (leave blank to skip)'
        },
        {
            type: 'select',
            id: 'correctAnswer',
            label: 'Correct Answer',
            options: [
                { value: '0', label: 'Answer 1' },
                { value: '1', label: 'Answer 2' },
                { value: '2', label: 'Answer 3' },
                { value: '3', label: 'Answer 4' }
            ]
        },
        {
            type: 'checkbox',  // NEW TYPE - need to add support
            id: 'showRationale',
            label: 'Include explanations for incorrect answers'
        }
    ]
})
```

**Step 2: Rationale (Conditional - only if checkbox checked)**
```javascript
if (showRationale) {
    showCustomModal({
        type: 'multi',
        title: 'Answer Explanations',
        message: 'Provide explanations for each incorrect answer:',
        fields: [
            // Only show fields for non-correct answers
            { type: 'textarea', id: 'rationale0', label: 'Why Answer 1 is incorrect' },
            { type: 'readonly', id: 'correct', label: 'Answer 2 is CORRECT' },  // Skip correct answer
            { type: 'textarea', id: 'rationale2', label: 'Why Answer 3 is incorrect' },
            { type: 'textarea', id: 'rationale3', label: 'Why Answer 4 is incorrect' }
        ]
    })
}
```

**New modal field types needed:**
- `type: 'textarea'` - multiline text input (for question and rationale)
- `type: 'checkbox'` - boolean toggle
- `type: 'readonly'` - display-only text (for showing correct answer)

**Implementation in showCustomModal** ([Index.html:735-817](Index.html#L735-L817)):
```javascript
// Add to existing field type handling (around line 782-800)
else if (field.type === 'textarea') {
    return `
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ${field.label}${field.required ? ' <span class="text-red-500">*</span>' : ''}
            </label>
            <textarea
                id="modal-field-${field.id}"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="${field.placeholder || ''}"
                rows="3"
                ${field.required ? 'required' : ''}
            >${field.value || ''}</textarea>
        </div>
    `;
} else if (field.type === 'checkbox') {
    return `
        <div class="mb-4 flex items-center">
            <input
                type="checkbox"
                id="modal-field-${field.id}"
                class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                ${field.value ? 'checked' : ''}
            >
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                ${field.label}
            </label>
        </div>
    `;
} else if (field.type === 'readonly') {
    return `
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">${field.label}</label>
            <div class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                ${field.value || field.label}
            </div>
        </div>
    `;
}
```

**Validation before saving:**
```javascript
function validateQuizData(formData) {
    // Ensure question is not empty
    if (!formData.quizQuestion || formData.quizQuestion.trim() === '') {
        showCustomModal({
            title: 'Validation Error',
            message: 'Quiz question is required.',
            type: 'confirm'
        });
        return false;
    }

    // Ensure at least 2 answers
    const answers = [formData.answer1, formData.answer2, formData.answer3, formData.answer4]
        .filter(a => a && a.trim() !== '');
    if (answers.length < 2) {
        showCustomModal({
            title: 'Validation Error',
            message: 'At least 2 answer options are required.',
            type: 'confirm'
        });
        return false;
    }

    // Ensure correct answer index is valid
    const correctIndex = parseInt(formData.correctAnswer);
    if (correctIndex >= answers.length) {
        showCustomModal({
            title: 'Validation Error',
            message: 'The selected correct answer must be one of the provided options.',
            type: 'confirm'
        });
        return false;
    }

    return true;
}
```

### 6. **Data Storage Format**

**Zone object with quiz:**
```javascript
{
    type: 'rect',  // or 'poly'
    x: 25.5,
    y: 30.2,
    width: 15.0,
    height: 12.5,
    label: 'Test Your Knowledge',  // Optional zone label
    actionType: 'quiz',
    quizQuestion: 'What is the primary function of mitochondria?',
    quizAnswers: [
        { text: 'Energy production', rationale: null },  // Correct answer - no rationale
        { text: 'Protein synthesis', rationale: 'Incorrect. Protein synthesis occurs in ribosomes, not mitochondria.' },
        { text: 'DNA replication', rationale: 'Incorrect. DNA replication occurs in the nucleus.' }
    ],
    quizCorrectIndex: 0,
    quizShowRationale: true
}
```

**Spreadsheet zones column** (example with mixed zone types):
```json
[
    {
        "type": "rect",
        "x": 10,
        "y": 20,
        "width": 15,
        "height": 15,
        "label": "Click to learn more",
        "actionType": "banner",
        "bannerText": "This is the nucleus!",
        "bannerPosition": "bottom"
    },
    {
        "type": "rect",
        "x": 25.5,
        "y": 30.2,
        "width": 15.0,
        "height": 12.5,
        "label": "Test Your Knowledge",
        "actionType": "quiz",
        "quizQuestion": "What is the primary function of mitochondria?",
        "quizAnswers": [
            { "text": "Energy production", "rationale": null },
            { "text": "Protein synthesis", "rationale": "Incorrect. Protein synthesis occurs in ribosomes." },
            { "text": "DNA replication", "rationale": "Incorrect. DNA replication occurs in the nucleus." }
        ],
        "quizCorrectIndex": 0,
        "quizShowRationale": true
    },
    {
        "type": "rect",
        "x": 50,
        "y": 40,
        "width": 20,
        "height": 20,
        "label": "Zoom to detail",
        "targetView": 2
    }
]
```

### 7. **Student Quiz Modal UI**

**HTML structure** (add after existing zone-banner, around [Index.html:497](Index.html#L497)):
```html
<!-- Quiz Modal (Hidden by default) -->
<div id="quiz-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
            <!-- Question -->
            <h2 id="quiz-question" class="text-xl font-bold text-gray-900 dark:text-white mb-6"></h2>

            <!-- Answer Options -->
            <div id="quiz-options" class="space-y-3 mb-6">
                <!-- Radio buttons will be dynamically inserted here -->
            </div>

            <!-- Submit Button -->
            <button id="quiz-submit-btn" class="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all">
                Submit Answer
            </button>

            <!-- Feedback Section (Hidden until answer submitted) -->
            <div id="quiz-feedback" class="hidden mt-6 p-4 rounded-lg">
                <div id="quiz-feedback-icon" class="text-4xl mb-2"></div>
                <div id="quiz-feedback-text" class="font-semibold mb-2"></div>
                <div id="quiz-feedback-rationale" class="text-sm"></div>
            </div>

            <!-- Continue Button (Hidden until answer submitted) -->
            <button id="quiz-close-btn" class="hidden w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all mt-4">
                Continue
            </button>
        </div>
    </div>
</div>
```

**CSS styles** (add to style section around [Index.html:276-329](Index.html#L276-L329)):
```css
/* Quiz Modal Styles */
#quiz-modal {
    z-index: 60; /* Higher than zone-banner (50) */
}

.quiz-option {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.quiz-option:hover {
    border-color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.05);
}

.quiz-option.selected {
    border-color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.1);
}

.quiz-option.correct {
    border-color: #10b981;
    background-color: rgba(16, 185, 129, 0.1);
}

.quiz-option.incorrect {
    border-color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
}

.quiz-option input[type="radio"] {
    margin-right: 12px;
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.quiz-option label {
    flex: 1;
    cursor: pointer;
    font-size: 16px;
    line-height: 1.5;
}

#quiz-feedback.correct {
    background-color: rgba(16, 185, 129, 0.1);
    border: 2px solid #10b981;
}

#quiz-feedback.incorrect {
    background-color: rgba(239, 68, 68, 0.1);
    border: 2px solid #ef4444;
}
```

**JavaScript implementation:**
```javascript
/**
 * Shows the quiz modal with question and answer options.
 * @param {Object} zone - The zone object containing quiz data
 */
function showQuizModal(zone) {
    const modal = document.getElementById('quiz-modal');
    const questionEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    const submitBtn = document.getElementById('quiz-submit-btn');
    const feedbackEl = document.getElementById('quiz-feedback');
    const closeBtn = document.getElementById('quiz-close-btn');

    // Set question
    questionEl.textContent = zone.quizQuestion;

    // Clear previous state
    optionsEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    feedbackEl.classList.remove('correct', 'incorrect');
    closeBtn.classList.add('hidden');
    submitBtn.classList.remove('hidden');

    // Create answer options
    zone.quizAnswers.forEach((answer, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'quiz-option';
        optionDiv.innerHTML = `
            <input type="radio" name="quiz-answer" id="quiz-option-${index}" value="${index}">
            <label for="quiz-option-${index}">${answer.text}</label>
        `;

        // Click handler for entire option div
        optionDiv.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                optionDiv.querySelector('input').checked = true;
            }
            // Update visual selection
            document.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));
            optionDiv.classList.add('selected');
        });

        optionsEl.appendChild(optionDiv);
    });

    // Submit handler
    const submitHandler = () => {
        const selectedOption = document.querySelector('input[name="quiz-answer"]:checked');
        if (!selectedOption) {
            showCustomModal({
                title: 'No Selection',
                message: 'Please select an answer before submitting.',
                type: 'confirm'
            });
            return;
        }

        const selectedIndex = parseInt(selectedOption.value);
        const isCorrect = selectedIndex === zone.quizCorrectIndex;

        // Disable further selection
        document.querySelectorAll('.quiz-option input').forEach(input => input.disabled = true);
        document.querySelectorAll('.quiz-option').forEach(opt => opt.style.cursor = 'default');

        // Visual feedback on options
        document.querySelectorAll('.quiz-option').forEach((opt, idx) => {
            if (idx === zone.quizCorrectIndex) {
                opt.classList.add('correct');
            } else if (idx === selectedIndex && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });

        // Show feedback
        feedbackEl.classList.remove('hidden');
        feedbackEl.classList.add(isCorrect ? 'correct' : 'incorrect');

        const feedbackIcon = document.getElementById('quiz-feedback-icon');
        const feedbackText = document.getElementById('quiz-feedback-text');
        const feedbackRationale = document.getElementById('quiz-feedback-rationale');

        if (isCorrect) {
            feedbackIcon.textContent = '✓';
            feedbackText.textContent = 'Correct!';
            feedbackRationale.textContent = '';
        } else {
            feedbackIcon.textContent = '✗';
            feedbackText.textContent = 'Incorrect';

            // Show rationale if available
            if (zone.quizShowRationale && zone.quizAnswers[selectedIndex].rationale) {
                feedbackRationale.textContent = zone.quizAnswers[selectedIndex].rationale;
            } else {
                feedbackRationale.textContent = `The correct answer is: ${zone.quizAnswers[zone.quizCorrectIndex].text}`;
            }
        }

        // Hide submit, show continue
        submitBtn.classList.add('hidden');
        closeBtn.classList.remove('hidden');
    };

    submitBtn.replaceWith(submitBtn.cloneNode(true)); // Remove old listeners
    document.getElementById('quiz-submit-btn').addEventListener('click', submitHandler);

    // Close handler
    const closeHandler = () => {
        modal.classList.add('hidden');
    };

    closeBtn.replaceWith(closeBtn.cloneNode(true)); // Remove old listeners
    document.getElementById('quiz-close-btn').addEventListener('click', closeHandler);

    // Show modal
    modal.classList.remove('hidden');
}
```

### 8. **Zone Edit Flow**

**Admin zone editor** ([Index.html:3414+](Index.html#L3414)):

**Current edit logic** (line ~3414-3520):
```javascript
function editAdminZone(index) {
    const zone = adminState.zones[index];

    // Build image options
    const imageOptions = [
        { value: '', label: 'None (Sequential navigation)' },
        { value: 'banner', label: '📝 Display Text Banner' },
        ...adminState.lessonImages.map(img => ({
            value: img.index.toString(),
            label: `Image ${img.index + 1}: ${img.description}`
        }))
    ];

    // Determine current action value
    let currentAction = '';
    if (zone.actionType === 'banner') {
        currentAction = 'banner';
    } else if (zone.targetView !== undefined) {
        currentAction = zone.targetView.toString();
    }

    // Show edit modal with current values...
}
```

**Add quiz support:**
```javascript
function editAdminZone(index) {
    const zone = adminState.zones[index];

    // Build image options
    const imageOptions = [
        { value: '', label: 'None (Sequential navigation)' },
        { value: 'banner', label: '📝 Display Text Banner' },
        { value: 'quiz', label: '❓ Quiz Question' },  // NEW
        ...adminState.lessonImages.map(img => ({
            value: img.index.toString(),
            label: `Image ${img.index + 1}: ${img.description}`
        }))
    ];

    // Determine current action value
    let currentAction = '';
    if (zone.actionType === 'banner') {
        currentAction = 'banner';
    } else if (zone.actionType === 'quiz') {  // NEW
        currentAction = 'quiz';
    } else if (zone.targetView !== undefined) {
        currentAction = zone.targetView.toString();
    }

    // First modal: Label + Action selection
    showCustomModal({
        title: 'Edit Zone',
        message: 'Update the zone label and click action:',
        type: 'multi',
        fields: [
            {
                type: 'text',
                id: 'label',
                label: 'Zone Label',
                placeholder: zone.label || `Zone ${index + 1}`,
                value: zone.label || ''
            },
            {
                type: 'select',
                id: 'action',
                label: 'Click Action',
                value: currentAction,
                options: imageOptions
            }
        ]
    }).then(function(values) {
        if (values !== null) {
            const newLabel = values.label.trim();
            const selectedAction = values.action;

            // Update label
            if (newLabel !== '') {
                adminState.zones[index].label = newLabel;
            } else {
                delete adminState.zones[index].label;
            }

            // Handle banner action
            if (selectedAction === 'banner') {
                // Existing banner logic...
            }
            // NEW: Handle quiz action
            else if (selectedAction === 'quiz') {
                // Show quiz config modal with pre-filled values
                showQuizConfigModal(adminState.zones, index, zone);
            }
            // Handle image navigation
            else if (selectedAction !== '') {
                // Remove old quiz/banner properties
                delete adminState.zones[index].actionType;
                delete adminState.zones[index].bannerText;
                delete adminState.zones[index].bannerPosition;
                delete adminState.zones[index].quizQuestion;  // NEW
                delete adminState.zones[index].quizAnswers;   // NEW
                delete adminState.zones[index].quizCorrectIndex;  // NEW
                delete adminState.zones[index].quizShowRationale;  // NEW
                // Set target view
                adminState.zones[index].targetView = parseInt(selectedAction);

                updateAdminZonesList();
                redrawAdminCanvas();
            }
            // Sequential navigation (no action)
            else {
                // Remove all action properties
                delete adminState.zones[index].targetView;
                delete adminState.zones[index].actionType;
                delete adminState.zones[index].bannerText;
                delete adminState.zones[index].bannerPosition;
                delete adminState.zones[index].quizQuestion;  // NEW
                delete adminState.zones[index].quizAnswers;   // NEW
                delete adminState.zones[index].quizCorrectIndex;  // NEW
                delete adminState.zones[index].quizShowRationale;  // NEW

                updateAdminZonesList();
                redrawAdminCanvas();
            }
        }
    });
}
```

### 9. **Zone List Display**

**Admin zones list** ([Index.html:3155+](Index.html#L3155)):

**Current display logic:**
```javascript
zonesList.innerHTML = adminState.zones.map((zone, index) => {
    let targetInfo = '';
    if (zone.actionType === 'banner') {
        const preview = zone.bannerText.length > 50 ? zone.bannerText.substring(0, 50) + '...' : zone.bannerText;
        targetInfo = `<br>→ Banner (${zone.bannerPosition}): "${preview}"`;
    } else if (zone.targetView !== undefined && zone.targetView !== null) {
        const targetImage = adminState.lessonImages.find(img => img.index === zone.targetView);
        targetInfo = targetImage
            ? `<br>→ Target: Image ${zone.targetView + 1} (${targetImage.description})`
            : `<br>→ Target: Image ${zone.targetView + 1}`;
    }

    let zoneDetails = '';
    if (zone.type === 'poly') {
        zoneDetails = `Polygon with ${zone.points.length} points`;
    } else {
        zoneDetails = `x: ${zone.x}%, y: ${zone.y}%<br>w: ${zone.width}%, h: ${zone.height}%`;
    }

    return `...`;
}).join('');
```

**Add quiz display:**
```javascript
zonesList.innerHTML = adminState.zones.map((zone, index) => {
    let targetInfo = '';
    if (zone.actionType === 'banner') {
        const preview = zone.bannerText.length > 50 ? zone.bannerText.substring(0, 50) + '...' : zone.bannerText;
        targetInfo = `<br>→ Banner (${zone.bannerPosition}): "${preview}"`;
    } else if (zone.actionType === 'quiz') {  // NEW
        const preview = zone.quizQuestion.length > 50
            ? zone.quizQuestion.substring(0, 50) + '...'
            : zone.quizQuestion;
        const answerCount = zone.quizAnswers ? zone.quizAnswers.length : 0;
        targetInfo = `<br>→ Quiz: "${preview}" (${answerCount} options)`;
    } else if (zone.targetView !== undefined && zone.targetView !== null) {
        const targetImage = adminState.lessonImages.find(img => img.index === zone.targetView);
        targetInfo = targetImage
            ? `<br>→ Target: Image ${zone.targetView + 1} (${targetImage.description})`
            : `<br>→ Target: Image ${zone.targetView + 1}`;
    }

    let zoneDetails = '';
    if (zone.type === 'poly') {
        zoneDetails = `Polygon with ${zone.points.length} points`;
    } else {
        zoneDetails = `x: ${zone.x}%, y: ${zone.y}%<br>w: ${zone.width}%, h: ${zone.height}%`;
    }

    return `...`;
}).join('');
```

---

## Implementation Checklist

### Phase 1: Modal Infrastructure (Foundation)
- [ ] Add `type: 'textarea'` support to `showCustomModal` ([Index.html:782-800](Index.html#L782-L800))
- [ ] Add `type: 'checkbox'` support to `showCustomModal`
- [ ] Add `type: 'readonly'` support to `showCustomModal`
- [ ] Test new field types with dummy modal calls in browser console
- [ ] Update `handleModalConfirm` to properly extract checkbox values ([Index.html:819-846](Index.html#L819-L846))

### Phase 2: Student Quiz View (Read-Only)
- [ ] Add quiz modal HTML structure after zone-banner ([Index.html:497](Index.html#L497))
- [ ] Add quiz CSS styles ([Index.html:276-329](Index.html#L276-L329))
- [ ] Implement `showQuizModal(zone)` function
- [ ] Add quiz condition to simulation zone click handler ([Index.html:1146](Index.html#L1146))
- [ ] Test with manually created quiz zone JSON in browser console:
  ```javascript
  showQuizModal({
      quizQuestion: 'Test question?',
      quizAnswers: [
          { text: 'Answer 1', rationale: null },
          { text: 'Answer 2', rationale: 'Wrong because...' }
      ],
      quizCorrectIndex: 0,
      quizShowRationale: true
  })
  ```

### Phase 3: Admin Quiz Configuration
- [ ] Implement `validateQuizData(formData)` validation function
- [ ] Implement `showQuizConfigModal(zonesArray, zoneIndex, existingZone)` function:
  - [ ] Step 1: Question + Answers + Correct selection + Rationale toggle
  - [ ] Step 2: Conditional rationale input (if toggle checked)
  - [ ] Validation before saving
  - [ ] Proper data structure creation with `quizAnswers` array
- [ ] Add '❓ Quiz Question' option to action selector ([Index.html:3257](Index.html#L3257))
- [ ] Add quiz branch to zone creation flow ([Index.html:3270+](Index.html#L3270))
- [ ] Update `editAdminZone` to detect and populate quiz zones
- [ ] Update `updateAdminZonesList` to display quiz info ([Index.html:3155+](Index.html#L3155))
- [ ] Ensure quiz properties are deleted when switching to banner/navigation

### Phase 4: Comprehensive Testing

**Data Integrity Tests:**
- [ ] Create quiz zone with 2 answers, no rationale
- [ ] Create quiz zone with 4 answers, with rationale for all incorrect
- [ ] Create quiz zone with 3 answers, rationale for some but not all incorrect
- [ ] Verify JSON structure in zones array output
- [ ] Copy zones JSON to spreadsheet and reload lesson - verify quiz works
- [ ] Edit existing quiz zone - verify pre-population
- [ ] Delete quiz zone - verify no orphaned data

**Mixed Zone Tests:**
- [ ] Image with 1 banner zone + 1 quiz zone + 1 navigation zone
- [ ] Quiz zone on first image of lesson
- [ ] Quiz zone on last image of lesson
- [ ] Quiz zone on middle image
- [ ] Multiple quiz zones on same image

**Edge Cases:**
- [ ] Very long question text (200+ characters) - check modal scroll
- [ ] Very long answer text (100+ characters per answer) - check wrapping
- [ ] Very long rationale (500+ characters) - check modal scroll
- [ ] Quiz with special characters in question/answers (quotes, apostrophes, <, >)
- [ ] Submit quiz without selecting answer - verify validation
- [ ] Select answer 1 as correct, verify answer 2-4 show rationale fields
- [ ] Cancel during quiz creation - verify no partial zone created

**Regression Tests:**
- [ ] Existing banner zones still work correctly
- [ ] Existing navigation zones still work correctly
- [ ] Sequential navigation (no action) still works
- [ ] Zone coordinates still align correctly
- [ ] Zone edit/delete still works for non-quiz zones
- [ ] Polygon zones can have quiz action
- [ ] Rectangle zones can have quiz action

**UI/UX Tests:**
- [ ] Quiz modal responsive on mobile (320px width)
- [ ] Quiz modal scrollable when content overflows
- [ ] Quiz modal z-index doesn't conflict with banner
- [ ] Submit button disables after answer selected
- [ ] Radio buttons visually indicate selection
- [ ] Correct answer shows green styling
- [ ] Incorrect answer shows red styling
- [ ] Rationale text is readable and properly formatted
- [ ] Continue button closes modal smoothly

**Backward Compatibility:**
- [ ] Load lesson created before quiz feature - verify no errors
- [ ] Old zones without `actionType` still default to sequential nav
- [ ] Spreadsheet with only banner/nav zones still works

### Phase 5: Documentation
- [ ] Update [CLAUDE.md](CLAUDE.md) with quiz zone documentation
- [ ] Update [SPREADSHEET_EXAMPLE.md](SPREADSHEET_EXAMPLE.md) with quiz zone JSON example
- [ ] Update [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) with quiz feature
- [ ] Add code comments explaining quiz data structure

---

## Risk Assessment & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Modal z-index conflict** | Low | Medium | Use z-index: 60 (higher than banner's 50) |
| **JSON parsing errors in spreadsheet** | Medium | High | Wrap zone.quizAnswers access in try/catch, default to empty array on error |
| **Missing required quiz fields** | Medium | Medium | Validate in modal submit - require question + 2+ answers + correct index |
| **Checkbox value not extracted correctly** | High | Medium | Test checkbox extraction in `handleModalConfirm` thoroughly |
| **Rationale text too long for modal** | Low | Low | Textarea with max-height + scroll, no character limit |
| **Quiz state persists between openings** | Medium | Medium | Clear all quiz UI state in `showQuizModal` before rendering |
| **Correct answer index out of bounds** | Low | High | Validate correctIndex < answers.length before saving |
| **Existing banner/nav zones break** | Low | Critical | Zero modifications to existing if/else logic - purely additive |
| **Spreadsheet data corrupts** | Low | Critical | Quiz zone is valid JSON object - no schema changes to zones array |
| **Admin can't delete quiz zones** | Low | Medium | Delete operates on index - agnostic to actionType (already works) |
| **Very long questions break layout** | Low | Low | Use CSS word-wrap and max-height with scroll on modal |
| **Special characters break JSON** | Medium | High | Use `JSON.stringify()` for all zone data - auto-escapes special chars |

---

## What Could Go Wrong (and why it won't)

### 1. "Existing zones will break"
**Why it won't:** We only ADD properties (`quizQuestion`, `quizAnswers`, etc.). We never modify or delete existing properties. Old zones without `actionType` still work - they fall through to the final `else` block which calls `zoomToNextView()` for sequential navigation.

### 2. "Banner feature will stop working"
**Why it won't:** Quiz check is added as a new `else if` branch AFTER the banner check. The banner conditional (`if (zone.actionType === 'banner')`) is the FIRST check and remains completely untouched. Quiz doesn't execute if banner is present.

### 3. "Spreadsheet data will corrupt"
**Why it won't:** The zones column is a JSON string containing an array of zone objects. Quiz zones are just another object type in that array. `JSON.stringify()` handles the serialization automatically. The spreadsheet treats it as a string - it doesn't know or care about the structure.

### 4. "Modal will conflict with existing modal system"
**Why it won't:** Two options:
- **Option A (Recommended):** Create separate `quiz-modal` div (independent from `custom-modal`) - zero interference
- **Option B:** Extend `custom-modal` with new `type: 'quiz'` - isolated branch in existing modal logic

Both are safe. Option A is simpler.

### 5. "Layout will shift in simulation view"
**Why it won't:** Quiz modal uses `position: fixed` with `inset-0` (full viewport overlay). It's removed from document flow. When hidden with `hidden` class, it has `display: none` - literally zero layout impact. No reflows.

### 6. "Zone coordinates will misalign"
**Why it won't:** Quiz zones use the exact same coordinate system as current zones (percentage-based `x`, `y`, `width`, `height`). The zone click handler doesn't change. The rendering logic (`createZoneOverlays`) doesn't change. Only the click action changes.

### 7. "Admin can't delete quiz zones"
**Why it won't:** Delete operates on array index:
```javascript
adminState.zones.splice(index, 1);
```
It doesn't inspect `actionType`. Works for banner, quiz, navigation, or no action.

### 8. "Checkbox won't work in modal"
**Why it won't:** We're adding explicit support for `type: 'checkbox'` in the modal field builder. The `handleModalConfirm` function will check `el.type === 'checkbox'` and read `el.checked` instead of `el.value`. Standard HTML checkbox behavior.

### 9. "JSON will break with quotes in quiz text"
**Why it won't:** We use `JSON.stringify()` when saving zones to spreadsheet:
```javascript
const zonesJson = JSON.stringify(adminState.zones);
```
This automatically escapes all special characters including quotes, newlines, etc. `JSON.parse()` reverses it when loading.

### 10. "Students can cheat by clicking multiple times"
**Why it won't:** After submit:
1. All radio inputs are disabled (`input.disabled = true`)
2. Click handlers are removed from option divs (`cursor: default`)
3. Submit button is hidden
4. Only the Continue button is shown

No way to change selection after submission.

---

## Architecture Decision: Why Modal Over Slide-out Panel?

**Reasons for choosing modal:**

1. **Simpler implementation** - 1 div with fixed positioning vs. complex slide animation + responsive breakpoints
2. **Fewer regression risks** - Isolated overlay vs. dynamic layout shifts
3. **Familiar UX pattern** - Users already interact with modals for admin login, zone config, etc.
4. **Mobile-friendly by default** - Full-screen overlay works on all screen sizes without media queries
5. **Focus management** - Modal naturally traps focus, improving accessibility
6. **No z-index complexity** - Fixed overlay at z-60, no layering concerns with zones/banner
7. **Consistent with existing patterns** - Banner already partially obscures view; modal is a natural extension

**If slide-out panel becomes a future requirement:**
- Can be implemented as a separate feature without modifying quiz logic
- Just change `showQuizModal()` implementation to populate different container
- Quiz data structure remains identical

---

## Incremental Development Strategy

**Philosophy: Build in layers, validate each layer before moving to next**

### Layer 1: Infrastructure (Invisible to users)
1. Add new modal field types (textarea, checkbox, readonly)
2. Test in browser console with dummy modal calls
3. Commit: "Add textarea/checkbox support to showCustomModal"

### Layer 2: Student View (Read-only quiz display)
1. Add quiz modal HTML/CSS (with `display: none !important` to disable)
2. Implement `showQuizModal()` function
3. Add quiz condition to zone click handler (with console.log, no UI)
4. Test with browser console: `showQuizModal({ ... })`
5. Once validated → remove `display: none !important`
6. Commit: "Add quiz modal for student view"

### Layer 3: Admin Creation (Write quiz zones)
1. Implement `showQuizConfigModal()` with validation
2. Add quiz option to action dropdown (initially commented out)
3. Test quiz modal in isolation via console
4. Once validated → uncomment quiz dropdown option
5. Commit: "Add quiz zone creation in admin editor"

### Layer 4: Admin Edit (Modify existing quiz zones)
1. Update `editAdminZone()` to detect quiz zones
2. Pre-populate quiz config modal with existing values
3. Test edit flow with manually created quiz zone
4. Commit: "Add quiz zone editing support"

### Layer 5: Display & Polish
1. Update zone list display for quiz zones
2. Test delete quiz zone
3. Test mixed zones (banner + quiz + nav on same image)
4. Commit: "Complete quiz zone integration"

### Layer 6: Validation & Cleanup
1. Full testing matrix (see Phase 4 checklist)
2. Update documentation
3. Remove any debug console.logs
4. Commit: "Quiz feature complete - tested and documented"

**Rollback strategy at each layer:**
- Layer 1: Remove modal field types (no user impact)
- Layer 2: Remove quiz-modal div, remove quiz condition (no data written)
- Layer 3: Remove quiz dropdown option (users can't create quiz zones)
- Layer 4-6: Isolated changes, easy to revert

---

## Code Location Reference

| Component | File | Line(s) | Purpose |
|-----------|------|---------|---------|
| Modal system | Index.html | 735-860 | `showCustomModal()`, field type handling |
| Modal confirm handler | Index.html | 819-846 | Extract field values, handle checkbox |
| Zone click handler (simulation) | Index.html | 1146-1168 | Where quiz condition gets added |
| Admin zone creation | Index.html | 3255-3330 | Action dropdown, zone property assignment |
| Admin zone editing | Index.html | 3414+ | Edit existing zone, pre-populate values |
| Admin zones list display | Index.html | 3155+ | Show zone info in list |
| Zone banner HTML | Index.html | 494-497 | Reference for quiz modal placement |
| Zone banner CSS | Index.html | 276-329 | Reference for quiz modal styling |
| Zone banner close handler | Index.html | 3774 | Pattern for quiz modal close |

**Note:** Line numbers are approximate based on current codebase. Verify before editing.

---

## Final Pre-Implementation Checklist

Before writing any code, verify:

- [ ] Read full implementation plan
- [ ] Understand current zone data structure (rect vs poly, actionType, targetView)
- [ ] Understand existing modal system (`type: 'multi'`, fields array)
- [ ] Understand zone click handler flow (banner → nav → sequential)
- [ ] Understand admin zone creation flow (draw → label → action → properties)
- [ ] Identify all code locations where quiz logic needs to be added
- [ ] Confirm Coordinate Helper status (if still active, add quiz support there too)
- [ ] Set up test lesson in spreadsheet for manual testing
- [ ] Have rollback plan for each development layer

**When you have 100% confidence in understanding the above, proceed with Layer 1.**
