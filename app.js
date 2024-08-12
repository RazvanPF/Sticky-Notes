let currentNoteImage = 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote.png';
let draggedItem = null; // Keeps track of the sticky note being dragged
let originalParent = null; // Keeps track of the original parent cell
let ghostIcon = null; // Ghost icon for dragging
let bordersVisible = true; // Tracks visibility of grid borders

document.getElementById('noteButton').addEventListener('click', function () {
    document.getElementById('noteSelector').style.display = 'flex';
});

Array.from(document.getElementsByClassName('noteIcon')).forEach(icon => {
    icon.addEventListener('click', function() {
        currentNoteImage = this.src;
        document.getElementById('noteButton').style.backgroundImage = `url(${this.src})`;
        document.getElementById('noteSelector').style.display = 'none';
    });
    icon.setAttribute('draggable', true);
    icon.addEventListener('dragstart', function(event) {
        const imageSrc = icon.src;
        event.dataTransfer.setData("text/plain", imageSrc); // Ensure data is set here
        event.dataTransfer.effectAllowed = "copy";
        createGhostIcon(imageSrc);
        document.body.appendChild(ghostIcon);
    });

    icon.addEventListener('dragend', function() {
        if (ghostIcon) {
            ghostIcon.remove();
            ghostIcon = null;
        }
    });
});

// Populate the board with grid cells
const board = document.getElementById('board');
if (!board.children.length) {
    for (let i = 0; i < 16; i++) {
        let cell = document.createElement('div');
        cell.className = 'grid-cell';
        board.appendChild(cell);
    }
}

document.querySelectorAll('.grid-cell').forEach(cell => {
    cell.addEventListener('dragenter', function(event) {
        event.preventDefault();
    });

    cell.addEventListener('dragover', function(event) {
        event.preventDefault();
        const hasSticky = cell.querySelector('.sticky');
        const data = event.dataTransfer.getData("text/plain");

        if (!hasSticky && (draggedItem || data)) {
            highlightCell(cell);
        } else {
            removeHighlight(cell);
        }
    });

    cell.addEventListener('dragleave', function() {
        removeHighlight(cell);
    });

    cell.addEventListener('drop', function(event) {
        event.preventDefault();
        removeHighlight(cell);
        const imageUrl = event.dataTransfer.getData("text/plain");

        // Handle dropping a new sticky note from the selector
        if (!cell.querySelector('.sticky') && imageUrl && !draggedItem) {
            createSticky(imageUrl, cell);
        }

        // Handle moving an existing sticky note
        if (!cell.querySelector('.sticky') && draggedItem) {
            cell.appendChild(draggedItem);
            resetDraggedItemPosition();
            draggedItem = null; // Clear the dragged item
        } else if (draggedItem) {
            originalParent.appendChild(draggedItem);
            resetDraggedItemPosition();
            draggedItem = null; // Cancel move if not over an empty cell
        }

        // Remove ghost icon after drop
        if (ghostIcon) {
            ghostIcon.remove();
            ghostIcon = null;
        }
    });
});

function createSticky(imageUrl, cell) {
    let sticky = document.createElement('div');
    sticky.className = 'sticky';
    sticky.style.backgroundImage = `url(${imageUrl})`;

    // Create a contentEditable div overlay
    let textOverlay = document.createElement('div');
    textOverlay.contentEditable = 'true';
    textOverlay.className = 'editable-text';
    textOverlay.style.position = 'absolute';
    textOverlay.style.width = '100%';
    textOverlay.style.height = '100%';
    textOverlay.style.top = '50%';
    textOverlay.style.left = '50%';
    textOverlay.style.transform = 'translate(-50%, -50%)'; // Center the textarea
    textOverlay.style.zIndex = '1';
    textOverlay.style.display = 'flex';
    textOverlay.style.padding = '5px';
    textOverlay.style.overflow = 'auto';
    textOverlay.style.background = 'transparent'; // Ensure it blends with textarea
    sticky.appendChild(textOverlay);

    adjustTextareaSize(imageUrl, textOverlay);

    // Handle Enter key to insert a new line
    textOverlay.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default behavior
            document.execCommand('insertLineBreak'); // Insert new line
        }
    });

    // Add the sticky note to the cell
    cell.appendChild(sticky);

    // Create a div to show the date range
    let dateDisplay = document.createElement('div');
    dateDisplay.className = 'date-display';
    dateDisplay.style.display = 'none'; // Initially hidden
    sticky.appendChild(dateDisplay);

    // Create gear icon and settings popup
    let gearIcon = document.createElement('div');
    gearIcon.className = 'gear-icon';
    gearIcon.style.backgroundImage = "url('https://raw.githubusercontent.com/razvanpf/Images/main/gearicon.png')";
    sticky.appendChild(gearIcon);

    let settingsPopup = document.createElement('div');
    settingsPopup.className = 'settings-popup';
    settingsPopup.style.display = 'none'; // Initially hidden
    sticky.appendChild(settingsPopup);

    // Date toggle and inputs
    let dateLabel = document.createElement('label');
    dateLabel.textContent = 'Date Range';
    let dateToggle = document.createElement('input');
    dateToggle.type = 'checkbox';
    dateToggle.className = 'toggle';

    let dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.disabled = true;
    dateInput.className = 'date-input';

    let toDateInput = document.createElement('input');
    toDateInput.type = 'date';
    toDateInput.disabled = true;
    toDateInput.className = 'date-input';

    let toDateWarning = document.createElement('div');
    toDateWarning.className = 'warning';
    toDateWarning.style.color = 'red';
    toDateWarning.style.display = 'none';
    toDateWarning.textContent = 'To date is required if Date is enabled!';

    dateToggle.onchange = function() {
        dateInput.disabled = !this.checked;
        toDateInput.disabled = !this.checked;
        toDateWarning.style.display = 'none'; // Hide warning when checkbox changes
    };

    dateLabel.appendChild(dateToggle);
    settingsPopup.appendChild(dateLabel);
    settingsPopup.appendChild(dateInput);
    settingsPopup.appendChild(toDateInput);
    settingsPopup.appendChild(toDateWarning);

    // Tag toggle and input
    let tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag';
    let tagToggle = document.createElement('input');
    tagToggle.type = 'checkbox';
    tagToggle.className = 'toggle';
    let tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.placeholder = 'Enter tags, separated by commas';
    tagInput.disabled = true;
    tagInput.className = 'tag-input';
    tagToggle.onchange = function() {
        tagInput.disabled = !this.checked;
    };
    tagLabel.appendChild(tagToggle);
    settingsPopup.appendChild(tagLabel);
    settingsPopup.appendChild(tagInput);

    // Save button for settings
    let saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'save-button';
    saveButton.onclick = function() {
        if (dateToggle.checked) {
            if (!dateInput.value || !toDateInput.value) {
                toDateWarning.style.display = 'block';
                toDateWarning.textContent = 'Both From and To dates must be set!';
                return;
            }
            if (new Date(dateInput.value) > new Date(toDateInput.value)) {
                toDateWarning.style.display = 'block';
                toDateWarning.textContent = 'To date must be after From date!';
                return;
            }
        }
        
        toDateWarning.style.display = 'none'; // Hide any warnings after passing validation
        
        sticky.dataset.dateFrom = dateToggle.checked ? dateInput.value : '';
        sticky.dataset.dateTo = dateToggle.checked ? toDateInput.value : '';
        sticky.dataset.tags = tagToggle.checked ? tagInput.value : '';
        dateDisplay.textContent = dateToggle.checked ? `${dateInput.value} - ${toDateInput.value}` : '';
        dateDisplay.style.display = dateToggle.checked ? 'block' : 'none';
        settingsPopup.style.display = 'none';
    };
    settingsPopup.appendChild(saveButton);

    // Toggle settings popup display
    gearIcon.addEventListener('click', function() {
        if (sticky.dataset.dateFrom && sticky.dataset.dateTo) {
            dateDisplay.textContent = `${sticky.dataset.dateFrom} - ${sticky.dataset.dateTo}`;
            dateDisplay.style.display = 'block';
        } else {
            dateDisplay.style.display = 'none';
        }

        // Populate the settings popup with current data when opened
        if (sticky.dataset.dateFrom) dateInput.value = sticky.dataset.dateFrom;
        if (sticky.dataset.dateTo) toDateInput.value = sticky.dataset.dateTo;
        if (sticky.dataset.tags) tagInput.value = sticky.dataset.tags;
    });

    // Event listeners for sticky note interactions
    sticky.addEventListener('mousedown', function(event) {
        if (event.shiftKey && event.button === 0) {
            draggedItem = sticky;
            originalParent = sticky.parentElement;
            createGhostIcon(sticky.style.backgroundImage.slice(5, -2));
            document.body.appendChild(ghostIcon);
            event.preventDefault(); // Prevent text selection
        }
    });

    sticky.ondragstart = function() { return false; };

    gearIcon.addEventListener('click', function() {
        settingsPopup.style.display = 'block';
        
        // Populate the settings popup with current data when opened
        if (sticky.dataset.dateFrom) dateInput.value = sticky.dataset.dateFrom;
        if (sticky.dataset.dateTo) toDateInput.value = sticky.dataset.dateTo;
        if (sticky.dataset.tags) tagInput.value = sticky.dataset.tags;
    
        dateToggle.checked = !!(sticky.dataset.dateFrom && sticky.dataset.dateTo);
    
        dateInput.disabled = !dateToggle.checked;
        toDateInput.disabled = !dateToggle.checked;
        if (dateToggle.checked) {
            dateDisplay.textContent = `${sticky.dataset.dateFrom} - ${sticky.dataset.dateTo}`;
            dateDisplay.style.display = 'block';
        } else {
            dateDisplay.style.display = 'none';
        }
    });

        // Add event listener for links to open in a new tab
        textOverlay.addEventListener('click', function(event) {
            if (event.target.tagName === 'A') {
                event.preventDefault();
                window.open(event.target.href, '_blank');
            }
        });

    return sticky;
}



// Function to save the state of the application to localStorage
function saveToLocalStorage() {
    let notesData = Array.from(document.querySelectorAll('.sticky')).map(sticky => {
        const textOverlay = sticky.querySelector('.editable-text');
        return {
            imageUrl: sticky.style.backgroundImage.slice(5, -2),
            text: textOverlay.innerHTML, // Save the HTML content
            style: { // Save styles
                fontFamily: textOverlay.style.fontFamily,
                fontSize: textOverlay.style.fontSize,
                fontWeight: textOverlay.style.fontWeight,
                fontStyle: textOverlay.style.fontStyle,
                textDecoration: textOverlay.style.textDecoration
            },
            dateFrom: sticky.dataset.dateFrom,
            dateTo: sticky.dataset.dateTo,
            tags: sticky.dataset.tags,
            position: {
                cellIndex: Array.from(sticky.parentElement.parentElement.children).indexOf(sticky.parentElement),
            }
        };
    });

    let appState = {
        notes: notesData,
        selectedImage: currentNoteImage,
        gridVisibility: bordersVisible,
    };

    localStorage.setItem('stickyNotesApp', JSON.stringify(appState));
    showNotification('Content saved');
}

// Function to load the state of the application from localStorage
function loadFromLocalStorage() {
    let urlParams = new URLSearchParams(window.location.search);
    let encodedState = urlParams.get('state');
    let savedState;

    if (encodedState) {
        // Decode the state from the URL
        try {
            savedState = JSON.parse(decodeURIComponent(encodedState));
            console.log("Loaded state from URL", savedState);
        } catch (e) {
            console.error("Failed to decode state from URL", e);
            showNotification('Failed to load shared state');
        }
    } else {
        // Fallback to local storage
        savedState = JSON.parse(localStorage.getItem('stickyNotesApp'));
        console.log("Loaded state from Local Storage", savedState);
    }

    if (savedState) {
        if (savedState.notes) {
            savedState.notes.forEach(note => {
                let board = document.getElementById('board');
                let cell = board.querySelector(`.grid-cell:nth-child(${note.position.cellIndex + 1})`);
                if (cell) {
                    let sticky = createSticky(note.imageUrl, cell);
                    const textarea = sticky.querySelector('textarea');
                    textarea.value = note.text; // Restore the text content
                    textarea.style.fontFamily = note.style.fontFamily;
                    textarea.style.fontSize = note.style.fontSize;
                    textarea.style.fontWeight = note.style.fontWeight;
                    textarea.style.fontStyle = note.style.fontStyle;
                    textarea.style.textDecoration = note.style.textDecoration;

                    sticky.dataset.dateFrom = note.dateFrom || '';
                    sticky.dataset.dateTo = note.dateTo || '';
                    sticky.dataset.tags = note.tags || '';

                    // Handle checkbox and date inputs
                    const settingsPopup = sticky.querySelector('.settings-popup');
                    const dateCheckbox = settingsPopup.querySelector('.toggle');
                    const fromDateInput = settingsPopup.querySelector('.date-input:first-of-type');
                    const toDateInput = settingsPopup.querySelector('.date-input:last-of-type');

                    dateCheckbox.checked = !!(note.dateFrom && note.dateTo);
                    fromDateInput.disabled = !dateCheckbox.checked;
                    toDateInput.disabled = !dateCheckbox.checked;
                    fromDateInput.value = note.dateFrom || '';
                    toDateInput.value = note.dateTo || '';

                    // Update the date display immediately after loading
                    updateDateDisplay(sticky, note.dateFrom, note.dateTo, dateCheckbox.checked);
                }
            });
        }

        if (savedState.selectedImage) {
            currentNoteImage = savedState.selectedImage;
            document.getElementById('noteButton').style.backgroundImage = `url(${currentNoteImage})`;
        }

        bordersVisible = savedState.gridVisibility;
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.style.border = bordersVisible ? '1px dashed #d6d6d6' : 'none';
        });
    }
}

// Make sure this runs when the document is ready
document.addEventListener('DOMContentLoaded', loadFromLocalStorage);

// Helper function to manage date display based on saved data
function updateDateDisplay(sticky, dateFrom, dateTo, isChecked) {
    let dateDisplay = sticky.querySelector('.date-display');
    if (isChecked && dateFrom && dateTo) {
        dateDisplay.textContent = `${dateFrom} - ${dateTo}`;
        dateDisplay.style.display = 'block';
    } else {
        dateDisplay.style.display = 'none';
    }
}

function showClearConfirmation() {
    document.getElementById('clearConfirmation').classList.remove('hidden');
}

function hideClearConfirmation() {
    document.getElementById('clearConfirmation').classList.add('hidden');
}

function clearLocalStorage() {
    localStorage.removeItem('stickyNotesApp');
    document.querySelectorAll('.sticky').forEach(sticky => sticky.remove());
    showNotification('Save data cleared');
    hideClearConfirmation();
}

// Add event listener for clearing the local storage
document.getElementById('clearStorageButton').addEventListener('click', showClearConfirmation);
document.getElementById('confirmClearYes').addEventListener('click', clearLocalStorage);
document.getElementById('confirmClearNo').addEventListener('click', hideClearConfirmation);

// Load saved data when the document is ready
document.addEventListener('DOMContentLoaded', loadFromLocalStorage);

document.addEventListener('mousemove', function(event) {
    if (ghostIcon) {
        ghostIcon.style.left = event.pageX + 'px';
        ghostIcon.style.top = event.pageY + 'px';
    }
});

document.addEventListener('mouseup', function(event) {
    if (draggedItem) {
        let closestCell = Array.from(document.querySelectorAll('.grid-cell')).find(cell => {
            const rect = cell.getBoundingClientRect();
            return (
                event.pageX > rect.left &&
                event.pageX < rect.right &&
                event.pageY > rect.top &&
                event.pageY < rect.bottom &&
                !cell.querySelector('.sticky')
            );
        });

        if (closestCell) {
            closestCell.appendChild(draggedItem);
            resetDraggedItemPosition();
            draggedItem = null;
        } else {
            originalParent.appendChild(draggedItem);
            resetDraggedItemPosition();
            draggedItem = null; // Snap back if not over an empty cell
        }
    }
});

function resetDraggedItemPosition() {
    if (draggedItem) {
        draggedItem.style.position = '';
        draggedItem.style.zIndex = '';
        draggedItem.style.left = '';
        draggedItem.style.top = '';
    }
    if (ghostIcon) {
        ghostIcon.remove();
        ghostIcon = null;
    }
}

function createGhostIcon(imageUrl) {
    ghostIcon = document.createElement('img');
    ghostIcon.src = imageUrl;
    ghostIcon.style.position = 'absolute';
    ghostIcon.style.width = '50px';
    ghostIcon.style.height = '50px';
    ghostIcon.style.pointerEvents = 'none'; // Make the icon non-interactive
    ghostIcon.style.opacity = '0.7'; // Slight transparency
}

document.getElementById('addNoteButton').addEventListener('click', function() {
    let emptyCell = Array.from(document.querySelectorAll('.grid-cell')).find(cell => !cell.querySelector('.sticky'));
    if (emptyCell) {
        createSticky(currentNoteImage, emptyCell);
    }
});

document.getElementById('removeButton').addEventListener('click', function() {
    this.classList.toggle('active');
    const isRemoveActive = this.classList.contains('active');
    document.body.style.cursor = isRemoveActive ? 'url("https://raw.githubusercontent.com/razvanpf/Images/main/removeicon2.png") 16 16, auto' : 'default';
});

document.getElementById('board').addEventListener('click', function(event) {
    if (document.getElementById('removeButton').classList.contains('active') && event.target.closest('.sticky')) {
        event.target.closest('.sticky').remove();
    }
});

document.getElementById('toggleBorderButton').addEventListener('click', function() {
    bordersVisible = !bordersVisible; // Toggle the state
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.style.border = bordersVisible ? '1px dashed #d6d6d6' : 'none';
    });
});

document.getElementById('helpButton').addEventListener('click', function() {
    document.getElementById('instructionPopup').classList.remove('hidden');
});

document.getElementById('closePopupButton').addEventListener('click', function() {
    document.getElementById('instructionPopup').classList.add('hidden');
});

document.getElementById('saveButton').addEventListener('click', saveToLocalStorage);

function adjustTextareaSize(imageUrl, textOverlay) {
    switch (imageUrl) {
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote.png':
            textOverlay.style.width = '50%';
            textOverlay.style.height = '50%';
            break;
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote2.png':
            textOverlay.style.width = '75%';
            textOverlay.style.height = '70%';
            break;
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote3.png':
            textOverlay.style.width = '75%';
            textOverlay.style.height = '55%';
            break;
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote4.png':
            textOverlay.style.width = '76%';
            textOverlay.style.height = '55%';
            break;
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote5.png':
            textOverlay.style.width = '76%';
            textOverlay.style.height = '70%';
            break;
        default:
            textOverlay.style.width = '75%';
            textOverlay.style.height = '75%';
    }
}

function highlightCell(cell) {
    const hasSticky = cell.querySelector('.sticky');
    if (!hasSticky && !cell.classList.contains('highlight')) {
        cell.classList.add('highlight');
    }
}

function removeHighlight(cell) {
    if (cell.classList.contains('highlight')) {
        cell.classList.remove('highlight');
    }
}

// Show Instructions Popup
document.getElementById('helpButton').addEventListener('click', function() {
    document.getElementById('instructionPopup').classList.remove('hidden');
});

// Close Instructions Popup
document.getElementById('closePopupButton').addEventListener('click', function() {
    document.getElementById('instructionPopup').classList.add('hidden');
});

//Filter Bar
//Filter Sticky Notes
function filterStickyNotes() {
    const keyword = document.getElementById('keywordInput').value.toLowerCase();
    const fromDate = document.getElementById('fromDateInput').value;
    const toDate = document.getElementById('toDateInput').value;
    const tags = document.getElementById('tagInput').value.split(',').map(tag => tag.trim().toLowerCase());

    document.querySelectorAll('.sticky').forEach(sticky => {
        const textarea = sticky.querySelector('textarea');
        const textContent = textarea ? textarea.value.toLowerCase() : '';
        const stickyFromDate = sticky.dataset.dateFrom || '';
        const stickyToDate = sticky.dataset.dateTo || '';
        const stickyTags = sticky.dataset.tags ? sticky.dataset.tags.split(',').map(tag => tag.trim().toLowerCase()) : [];

        const keywordMatch = !keyword || textContent.includes(keyword);
        const tagMatch = !tags[0] || tags.every(tag => stickyTags.includes(tag));

        // Date range matching logic
        let dateMatch = true;
        if (fromDate || toDate) {
            dateMatch = false; // Assume no match unless found

            if (fromDate && !toDate) {
                // Match any note with a from date matching the filter
                dateMatch = stickyFromDate === fromDate || stickyToDate === fromDate;
            } else if (!fromDate && toDate) {
                // Match any note with a to date matching the filter
                dateMatch = stickyFromDate === toDate || stickyToDate === toDate;
            } else if (fromDate && toDate) {
                // Match any note that falls within the range or matches the exact range
                dateMatch = (stickyFromDate >= fromDate && stickyToDate <= toDate) ||
                            (stickyFromDate <= toDate && stickyToDate >= fromDate) ||
                            (stickyFromDate === fromDate && stickyToDate === toDate);
            }
        }

        if (keywordMatch && dateMatch && tagMatch) {
            sticky.style.visibility = 'visible';
            sticky.style.position = 'relative'; // Ensure sticky notes flow normally
        } else {
            sticky.style.visibility = 'hidden';
            sticky.style.position = 'absolute'; // Remove from flow without affecting layout
        }
    });
}

// Function to reset sticky position if needed
function resetStickyPosition(sticky) {
    sticky.style.top = '';
    sticky.style.left = '';
}

// Function to reset filters
function resetFilters() {
    // Clear input fields, ensure elements exist
    const keywordInput = document.getElementById('keywordInput');
    const fromDateInput = document.getElementById('fromDateInput');
    const toDateInput = document.getElementById('toDateInput');
    const tagInput = document.getElementById('tagInput');

    if (keywordInput) keywordInput.value = '';
    if (fromDateInput) fromDateInput.value = '';
    if (toDateInput) toDateInput.value = '';
    if (tagInput) tagInput.value = '';

    // Reset the display of all sticky notes
    document.querySelectorAll('.sticky').forEach(sticky => {
        sticky.style.visibility = 'visible';
        sticky.style.position = 'relative'; // Ensure they flow in normal document flow
        resetStickyPosition(sticky);
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'green';
    notification.style.color = 'white';
    notification.style.paddingLeft = '50px';
    notification.style.paddingRight = '50px';
    notification.style.paddingTop = '10px';
    notification.style.paddingBottom = '10px';
    notification.style.borderRadius = '7px';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.8)';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 2000);
}


// Toggle the text format toolbar
document.getElementById('textFormatButton').addEventListener('click', function() {
    const toolbar = document.getElementById('textFormatToolbar');
    toolbar.classList.toggle('hidden');
});

// Function to apply formatting to selected text
function applyTextFormat(command, value = null) {
    document.execCommand(command, false, value);
}

// Add event listeners for toolbar actions
document.getElementById('fontFamilySelect').addEventListener('change', function() {
    applyTextFormat('fontName', this.value);
});

document.getElementById('boldButton').addEventListener('click', function() {
    applyTextFormat('bold');
});

document.getElementById('italicButton').addEventListener('click', function() {
    applyTextFormat('italic');
});

document.getElementById('underlineButton').addEventListener('click', function() {
    applyTextFormat('underline');
});

document.getElementById('textSizeSelect').addEventListener('change', function() {
    applyTextFormat('fontSize', this.selectedIndex + 1);
});

// Generate URL
// Function to generate a shareable URL
function generateShareableUrl() {
    // Collect the current state of sticky notes
    let notesData = Array.from(document.querySelectorAll('.sticky')).map(sticky => {
        const textOverlay = sticky.querySelector('.editable-text');
        return {
            imageUrl: sticky.style.backgroundImage.slice(5, -2),
            text: textOverlay.innerHTML, // Save the HTML content
            style: { // Save styles
                fontFamily: textOverlay.style.fontFamily || '',
                fontSize: textOverlay.style.fontSize || '',
                fontWeight: textOverlay.style.fontWeight || '',
                fontStyle: textOverlay.style.fontStyle || '',
                textDecoration: textOverlay.style.textDecoration || ''
            },
            dateFrom: sticky.dataset.dateFrom || '',
            dateTo: sticky.dataset.dateTo || '',
            tags: sticky.dataset.tags || '',
            position: {
                cellIndex: Array.from(sticky.parentElement.parentElement.children).indexOf(sticky.parentElement),
            }
        };
    });

    let appState = {
        notes: notesData,
        selectedImage: currentNoteImage,
        gridVisibility: bordersVisible,
    };

    // Stringify and encode the state using btoa for base64 encoding
    let encodedState = btoa(JSON.stringify(appState));

    // Create the shareable URL
    let shareableUrl = `${window.location.origin}${window.location.pathname}?state=${encodedState}`;

    // Copy the shareable URL to clipboard and alert
    navigator.clipboard.writeText(shareableUrl).then(() => {
        alert("Shareable URL has been copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy URL: ", err);
    });
}

// Function to load the state from a URL parameter
function loadStateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedState = urlParams.get('state');
    if (encodedState) {
        try {
            const savedState = JSON.parse(atob(encodedState));
            if (savedState) {
                if (savedState.notes) {
                    savedState.notes.forEach(note => {
                        let board = document.getElementById('board');
                        let cell = board.querySelector(`.grid-cell:nth-child(${note.position.cellIndex + 1})`);
                        if (cell) {
                            let sticky = createSticky(note.imageUrl, cell);
                            const textOverlay = sticky.querySelector('.editable-text');
                            textOverlay.innerHTML = note.text; // Restore the HTML content

                            // Apply saved styles if textOverlay is not null
                            if (textOverlay) {
                                textOverlay.style.fontFamily = note.style.fontFamily || '';
                                textOverlay.style.fontSize = note.style.fontSize || '';
                                textOverlay.style.fontWeight = note.style.fontWeight || '';
                                textOverlay.style.fontStyle = note.style.fontStyle || '';
                                textOverlay.style.textDecoration = note.style.textDecoration || '';
                            }

                            sticky.dataset.dateFrom = note.dateFrom || '';
                            sticky.dataset.dateTo = note.dateTo || '';
                            sticky.dataset.tags = note.tags || '';

                            // Handle checkbox and date inputs if they exist
                            const settingsPopup = sticky.querySelector('.settings-popup');
                            if (settingsPopup) {
                                const dateCheckbox = settingsPopup.querySelector('.toggle');
                                const fromDateInput = settingsPopup.querySelector('.date-input:first-of-type');
                                const toDateInput = settingsPopup.querySelector('.date-input:last-of-type');

                                if (dateCheckbox) {
                                    dateCheckbox.checked = !!(note.dateFrom && note.dateTo);
                                }
                                if (fromDateInput) {
                                    fromDateInput.disabled = !dateCheckbox.checked;
                                    fromDateInput.value = note.dateFrom || '';
                                }
                                if (toDateInput) {
                                    toDateInput.disabled = !dateCheckbox.checked;
                                    toDateInput.value = note.dateTo || '';
                                }

                                // Update the date display immediately after loading
                                updateDateDisplay(sticky, note.dateFrom, note.dateTo, dateCheckbox.checked);
                            }
                        }
                    });
                }

                if (savedState.selectedImage) {
                    currentNoteImage = savedState.selectedImage;
                    const noteButton = document.getElementById('noteButton');
                    if (noteButton) {
                        noteButton.style.backgroundImage = `url(${currentNoteImage})`;
                    }
                }

                bordersVisible = savedState.gridVisibility;
                document.querySelectorAll('.grid-cell').forEach(cell => {
                    cell.style.border = bordersVisible ? '1px dashed #d6d6d6' : 'none';
                });
            }
        } catch (error) {
            console.error("Failed to decode state from URL", error);
        }
    }
}

// Add event listener for the static share button in your HTML
document.getElementById('shareButton').addEventListener('click', generateShareableUrl);

// Load state from URL when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    loadStateFromUrl();
    loadFromLocalStorage(); // Load from localStorage in case there is no URL state
});


// Function to apply a hyperlink to selected text
function applyLink() {
    const url = prompt("Enter the URL for the hyperlink:");
    if (url) {
        document.execCommand('createLink', false, url);
    }
}

// Add event listener for the hyperlink button
document.getElementById('linkButton').addEventListener('click', applyLink);