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
    textOverlay.style.display = 'block'; // Changed to block to handle text better
    textOverlay.style.padding = '5px';
    textOverlay.style.overflow = 'auto';
    textOverlay.style.background = 'transparent'; // Ensure it blends with textarea
    textOverlay.style.whiteSpace = 'pre-wrap'; // Preserve whitespace and line breaks
    textOverlay.style.wordWrap = 'break-word'; // Break words if necessary
    textOverlay.style.outline = 'none'; // Remove focus outline
    sticky.appendChild(textOverlay);

    adjustTextareaSize(imageUrl, textOverlay);

    // Handle Enter key to insert a new line
    textOverlay.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default behavior
            document.execCommand('insertHTML', false, '<br>'); // Insert new line
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

// Save the application state to localStorage
function saveToLocalStorage() {
    let notesData = Array.from(document.querySelectorAll('.sticky')).map(sticky => {
        const textOverlay = sticky.querySelector('.editable-text');
        const settingsPopup = sticky.querySelector('.settings-popup');
        const tagCheckbox = settingsPopup.querySelector('.toggle[type="checkbox"]:last-of-type'); // Ensure correct tag checkbox
        const tagInput = settingsPopup.querySelector('.tag-input');

        return {
            i: sticky.style.backgroundImage.slice(5, -2), // imageUrl
            t: textOverlay.innerHTML, // text content
            s: { // style properties
                f: textOverlay.style.fontFamily || '',
                z: textOverlay.style.fontSize || '',
                w: textOverlay.style.fontWeight || '',
                y: textOverlay.style.fontStyle || '',
                d: textOverlay.style.textDecoration || ''
            },
            dF: sticky.dataset.dateFrom || '',
            dT: sticky.dataset.dateTo || '',
            g: tagInput.value || '', // Save tag regardless of checkbox state
            tC: tagCheckbox.checked, // Save the tag checkbox state
            p: {
                cI: Array.from(sticky.parentElement.parentElement.children).indexOf(sticky.parentElement),
            }
        };
    });

    let appState = {
        n: notesData,
        sI: currentNoteImage,
        gV: bordersVisible,
    };

    // Store the state in localStorage
    localStorage.setItem('stickyNotesApp', JSON.stringify(appState));
    showNotification('Content saved');
}

// Load saved state from localStorage
function loadFromLocalStorage() {
    let savedState = JSON.parse(localStorage.getItem('stickyNotesApp'));
    if (savedState) {
        populateBoard(savedState);
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
    showNotification('Save data cleared successfuly!', "green");
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

function showNotification(message, color = 'green') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = color;
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

// Improved text format handling
function formatSelectedText(command, value = null) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        document.execCommand(command, false, value);
    }
}

// Add event listeners for toolbar actions
document.getElementById('fontFamilySelect').addEventListener('change', function() {
    formatSelectedText('fontName', this.value);
});

document.getElementById('boldButton').addEventListener('click', function() {
    formatSelectedText('bold');
});

document.getElementById('italicButton').addEventListener('click', function() {
    formatSelectedText('italic');
});

document.getElementById('underlineButton').addEventListener('click', function() {
    formatSelectedText('underline');
});

document.getElementById('textSizeSelect').addEventListener('change', function() {
    formatSelectedText('fontSize', this.selectedIndex + 1);
});

// Link prompt
document.getElementById('linkButton').addEventListener('click', function() {
    openCustomUrlInput(); // Open the custom URL input instead of the prompt
});

// Handle Enter key for new line properly
document.querySelectorAll('.editable-text').forEach(editable => {
    editable.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            document.execCommand('insertHTML', false, '<br><br>');
            event.preventDefault();
        }
    });
});

// Function to generate a shareable URL with compression
function generateShareableUrl() {
    let notesData = Array.from(document.querySelectorAll('.sticky')).map(sticky => {
        const textOverlay = sticky.querySelector('.editable-text');
        return {
            i: sticky.style.backgroundImage.slice(5, -2), // imageUrl
            t: textOverlay.innerHTML, // text content
            s: { // style properties
                f: textOverlay.style.fontFamily || '',
                z: textOverlay.style.fontSize || '',
                w: textOverlay.style.fontWeight || '',
                y: textOverlay.style.fontStyle || '',
                d: textOverlay.style.textDecoration || ''
            },
            dF: sticky.dataset.dateFrom || '',
            dT: sticky.dataset.dateTo || '',
            g: sticky.dataset.tags || '',
            p: {
                cI: Array.from(sticky.parentElement.parentElement.children).indexOf(sticky.parentElement),
            }
        };
    });

    let appState = {
        n: notesData,
        sI: currentNoteImage,
        gV: bordersVisible,
    };

    // Compress the state to minimize URL length
    let compressedState = LZString.compressToEncodedURIComponent(JSON.stringify(appState));

    // Create the shareable URL
    let shareableUrl = `${window.location.origin}${window.location.pathname}?state=${compressedState}`;

    // Copy the shareable URL to clipboard
    navigator.clipboard.writeText(shareableUrl).then(() => {
        showNotification("[BETA] Share link copied to clipboard!", "blue");
    }).catch(err => {
        console.error("Failed to copy URL: ", err);
        showNotification('Failed to copy URL!', 'red');
    });
}

// Function to load the state from a URL parameter with decompression
function loadStateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedState = urlParams.get('state');
    if (encodedState) {
        try {
            const decodedState = LZString.decompressFromEncodedURIComponent(encodedState);
            const savedState = JSON.parse(decodedState);
            if (savedState) {
                populateBoard(savedState);
            }
        } catch (error) {
            console.error("Failed to decode state from URL", error);
            showNotification('Failed to load shared state');
        }
    }
}

// Helper function to populate the board from a saved state
function populateBoard(savedState) {
    if (savedState.n) {
        document.querySelectorAll('.sticky').forEach(sticky => sticky.remove()); // Clear existing notes

        savedState.n.forEach(note => {
            let board = document.getElementById('board');
            let cell = board.querySelector(`.grid-cell:nth-child(${note.p.cI + 1})`);
            if (cell) {
                let sticky = createSticky(note.i, cell);
                const textOverlay = sticky.querySelector('.editable-text');
                textOverlay.innerHTML = note.t; // Restore the HTML content

                // Apply saved styles
                if (textOverlay) {
                    textOverlay.style.fontFamily = note.s.f || '';
                    textOverlay.style.fontSize = note.s.z || '';
                    textOverlay.style.fontWeight = note.s.w || '';
                    textOverlay.style.fontStyle = note.s.y || '';
                    textOverlay.style.textDecoration = note.s.d || '';
                }

                sticky.dataset.dateFrom = note.dF || '';
                sticky.dataset.dateTo = note.dT || '';
                sticky.dataset.tags = note.g || '';

                // Handle checkbox and date inputs if they exist
                const settingsPopup = sticky.querySelector('.settings-popup');
                if (settingsPopup) {
                    const dateCheckbox = settingsPopup.querySelector('.toggle[type="checkbox"]:first-of-type');
                    const tagCheckbox = settingsPopup.querySelector('.toggle[type="checkbox"]:last-of-type'); // Ensure correct tag checkbox
                    const fromDateInput = settingsPopup.querySelector('.date-input:first-of-type');
                    const toDateInput = settingsPopup.querySelector('.date-input:last-of-type');
                    const tagInput = settingsPopup.querySelector('.tag-input');

                    // Set the date checkbox
                    if (dateCheckbox) {
                        dateCheckbox.checked = !!(note.dF && note.dT);
                    }
                    if (fromDateInput) {
                        fromDateInput.disabled = !dateCheckbox.checked;
                        fromDateInput.value = note.dF || '';
                    }
                    if (toDateInput) {
                        toDateInput.disabled = !dateCheckbox.checked;
                        toDateInput.value = note.dT || '';
                    }

                    // Update the date display immediately after loading
                    updateDateDisplay(sticky, note.dF, note.dT, dateCheckbox.checked);

                    // Set the tag checkbox and input
                    if (tagCheckbox) {
                        tagCheckbox.checked = !!note.g; // Check if there's a tag
                    }
                    if (tagInput) {
                        tagInput.disabled = !tagCheckbox.checked;
                        tagInput.value = note.g || '';
                    }
                }
            }
        });
    }

    if (savedState.sI) {
        currentNoteImage = savedState.sI;
        const noteButton = document.getElementById('noteButton');
        if (noteButton) {
            noteButton.style.backgroundImage = `url(${currentNoteImage})`;
        }
    }

    bordersVisible = savedState.gV;
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.style.border = bordersVisible ? '1px dashed #d6d6d6' : 'none';
    });
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


// Add event listener for the static share button in your HTML
document.getElementById('shareButton').addEventListener('click', generateShareableUrl);

// Load state from URL when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    loadStateFromUrl();
    loadFromLocalStorage(); // Load from localStorage in case there is no URL state
});

// CUSTOM URL PROMPT

let savedSelection; // Global variable to store the text selection

// Function to save the current text selection
function saveSelection() {
    if (window.getSelection) {
        savedSelection = window.getSelection().getRangeAt(0);
    } else if (document.selection && document.selection.createRange) { // For IE
        savedSelection = document.selection.createRange();
    }
}

// Function to restore the saved text selection
function restoreSelection() {
    if (savedSelection) {
        if (window.getSelection) {
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelection);
        } else if (document.selection && savedSelection.select) { // For IE
            savedSelection.select();
        }
    }
}

// Open the custom URL input
function openCustomUrlInput() {
    if (window.getSelection().toString().trim() === '') {
        showNotification('Please select any text before adding a hyperlink.', 'red');
        return;
    }
    saveSelection();  // Save the current selection before opening the popup

    var selectedText = window.getSelection().toString(); // Capture the text of the current selection

    // Position the popup
    var linkEditorPopup = document.getElementById('linkEditorPopup');
    linkEditorPopup.style.display = 'block';
    var toolbarRect = document.getElementById('textFormatToolbar').getBoundingClientRect();
    linkEditorPopup.style.top = `${toolbarRect.bottom + window.scrollY}px`;
    linkEditorPopup.style.left = `${toolbarRect.left + window.scrollX}px`;

    // Set values in the popup
    document.getElementById('displayText').value = selectedText;
    var parentLink = getParentLinkElement();
    document.getElementById('urlInputField').value = parentLink ? parentLink.href : '';
}

// Function to find the parent <a> element of the selection, if any
function getParentLinkElement() {
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    var range = selection.getRangeAt(0).startContainer;
    return range.nodeType === 3 ? range.parentNode.closest('a') : range.closest('a');
}

// Function to remove link from selected text
function removeLinkFromSelection() {
    var selection = window.getSelection();
    if (!selection.rangeCount) return;

    var range = selection.getRangeAt(0);
    var containerElement = range.commonAncestorContainer;

    // Navigate up to find the 'a' element if the selection is inside it
    while (containerElement.nodeType !== 1 || containerElement.tagName !== 'A') {
        containerElement = containerElement.parentNode;
        if (!containerElement) return; // Break if no 'a' element is found
    }

    if (containerElement.tagName === 'A') {
        var docFragment = document.createDocumentFragment();
        while (containerElement.firstChild) {
            docFragment.appendChild(containerElement.firstChild);
        }
        containerElement.parentNode.replaceChild(docFragment, containerElement);
        selection.removeAllRanges();
    }
}

// Apply the custom link to the selected text or remove it if URL is empty
function applyCustomLink() {
    restoreSelection();
    const url = document.getElementById('urlInputField').value.trim();
    const displayText = document.getElementById('displayText').value;

    if (url) {
        formatSelectedText('createLink', url);
    } else {
        removeLinkFromSelection();
    }
    closeCustomUrlInput(); // Close the input box after applying or removing the link
}

// Close the custom URL input
function closeCustomUrlInput() {
    document.getElementById('linkEditorPopup').style.display = 'none';
}