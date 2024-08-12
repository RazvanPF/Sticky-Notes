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

    let textarea = document.createElement('textarea');
    textarea.setAttribute('spellcheck', 'false');
    adjustTextareaSize(imageUrl, textarea);
    sticky.appendChild(textarea);
    cell.appendChild(sticky);

    // Create gear icon and settings popup
    let gearIcon = document.createElement('div');
    gearIcon.className = 'gear-icon';
    gearIcon.style.backgroundImage = "url('https://raw.githubusercontent.com/razvanpf/Images/main/gearicon.png')";
    sticky.appendChild(gearIcon);

    let settingsPopup = document.createElement('div');
    settingsPopup.className = 'settings-popup';
    settingsPopup.style.display = 'none'; // Initially hidden
    sticky.appendChild(settingsPopup);

    // Date toggle and input
    let dateLabel = document.createElement('label');
    dateLabel.textContent = 'Date';
    let dateToggle = document.createElement('input');
    dateToggle.type = 'checkbox';
    dateToggle.className = 'toggle';
    let dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.disabled = true;
    dateInput.className = 'date-input';
    dateToggle.onchange = function() {
        dateInput.disabled = !this.checked;
        if (!this.checked) dateInput.value = ''; // Clear the input if unchecked
    };
    dateLabel.appendChild(dateToggle);
    settingsPopup.appendChild(dateLabel);
    settingsPopup.appendChild(dateInput);

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
        if (!this.checked) tagInput.value = ''; // Clear the input if unchecked
    };
    tagLabel.appendChild(tagToggle);
    settingsPopup.appendChild(tagLabel);
    settingsPopup.appendChild(tagInput);

    // Save button
    let saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'save-button';
    saveButton.onclick = function() {
        sticky.dataset.date = dateToggle.checked ? dateInput.value : '';
        sticky.dataset.tags = tagToggle.checked ? tagInput.value : '';
        settingsPopup.style.display = 'none';
    };
    settingsPopup.appendChild(saveButton);

    // Toggle settings popup display
    gearIcon.addEventListener('click', function() {
        settingsPopup.style.display = settingsPopup.style.display === 'block' ? 'none' : 'block';
        // Populate settings when the popup is displayed
        if (settingsPopup.style.display === 'block') {
            dateToggle.checked = !!sticky.dataset.date;
            dateInput.disabled = !dateToggle.checked;
            dateInput.value = sticky.dataset.date || '';
            tagToggle.checked = !!sticky.dataset.tags;
            tagInput.disabled = !tagToggle.checked;
            tagInput.value = sticky.dataset.tags || '';
        }
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
    });

    return sticky;
}

// Function to save the state of the application to localStorage
function saveToLocalStorage() {
    let notesData = Array.from(document.querySelectorAll('.sticky')).map(sticky => {
        return {
            imageUrl: sticky.style.backgroundImage.slice(5, -2), // Remove 'url("' and '")'
            text: sticky.querySelector('textarea').value,
            date: sticky.dataset.date,
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
    let savedState = JSON.parse(localStorage.getItem('stickyNotesApp'));
    if (savedState) {
        if (savedState.notes) {
            savedState.notes.forEach(note => {
                let board = document.getElementById('board');
                let cell = board.querySelector(`.grid-cell:nth-child(${note.position.cellIndex + 1})`);
                if (cell) {
                    let sticky = createSticky(note.imageUrl, cell);
                    sticky.querySelector('textarea').value = note.text;
                    sticky.dataset.date = note.date || '';
                    sticky.dataset.tags = note.tags || '';
                }
            });
        }

        if (savedState.selectedImage) {
            currentNoteImage = savedState.selectedImage;
            document.getElementById('noteButton').style.backgroundImage = `url(${currentNoteImage})`;
        }

        if (typeof savedState.gridVisibility !== 'undefined') {
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.style.border = savedState.gridVisibility ? '1px dashed #d6d6d6' : 'none';
            });
            bordersVisible = savedState.gridVisibility;
        }
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
    showNotification('Local storage cleared');
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

function adjustTextareaSize(imageUrl, textarea) {
    switch (imageUrl) {
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote.png':
            textarea.style.width = '50%';
            textarea.style.height = '50%';
            break;
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote2.png':
            textarea.style.width = '75%';
            textarea.style.height = '70%';
            break;
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote3.png':
            textarea.style.width = '75%';
            textarea.style.height = '55%';
            break;
        case 'https://raw.githubusercontent.com/razvanpf/Images/main/stickynote4.png':
            textarea.style.width = '76%';
            textarea.style.height = '55%';
            break;
        default:
            textarea.style.width = '75%';
            textarea.style.height = '75%';
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
function filterStickyNotes() {
    const keyword = document.getElementById('keywordInput').value.toLowerCase();
    const date = document.getElementById('dateInput').value;
    const tags = document.getElementById('tagInput').value.split(',').map(tag => tag.trim().toLowerCase());

    document.querySelectorAll('.sticky').forEach(sticky => {
        const textContent = sticky.querySelector('textarea').value.toLowerCase();
        const stickyDate = sticky.dataset.date || '';
        const stickyTags = sticky.dataset.tags ? sticky.dataset.tags.split(',').map(tag => tag.trim().toLowerCase()) : [];

        const keywordMatch = !keyword || textContent.includes(keyword);
        const dateMatch = !date || stickyDate === date;
        const tagMatch = !tags[0] || tags.every(tag => stickyTags.includes(tag));

        if (keywordMatch && dateMatch && tagMatch) {
            sticky.style.visibility = 'visible';
            sticky.style.position = 'relative'; // Ensure sticky notes flow normally
        } else {
            sticky.style.visibility = 'hidden';
            sticky.style.position = 'absolute'; // Remove from flow without affecting layout
        }
    });
}

function resetFilters() {
    // Clear input fields
    document.getElementById('keywordInput').value = '';
    document.getElementById('dateInput').value = '';
    document.getElementById('tagInput').value = '';

    // Reset the display of all sticky notes
    document.querySelectorAll('.sticky').forEach(sticky => {
        sticky.style.visibility = 'visible';
        sticky.style.position = 'relative'; // Ensure they flow in normal document flow
        resetStickyPosition(sticky); // If you're using absolute positioning for filtering
    });
}

function resetStickyPosition(sticky) {
    // Remove any inline styles that might have been added for positioning during filtering
    sticky.style.top = '';
    sticky.style.left = '';
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
