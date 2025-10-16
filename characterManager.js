import { characters } from "./characters.js";

// Mapping of character names (lowercase) to their Glitch asset URLs.
export const characterPics = {
  "zambia": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/zambia.png?v=1743943328604",
  "tulin": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/tulin.png?v=1743943336246",
  "esra": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/esra.png?v=1743943341609",
  "seher": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/seher.png?v=1743943347168",
  "sevgi": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/sevgi.png?v=1743943355033",
  "mehtap": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/mehtap.png?v=1743943368394",
  "ayca": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/ayca.png?v=1743943378760",
  "anastasia": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/anastasia.png?v=1743943382999",
  "sibel": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/sibel.png?v=1743943388817",
  "merve": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/charpics/merve.png?v=1743943492543",
  "selma": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/selma.png?v=1743943643448",
  "gulsah": "https://cdn.glitch.global/dfa54b71-8a23-47dd-9bd1-577841ad2835/gulsah.png?v=1743943669114"
};

export function populateCharacterSelection() {
  const selectionDiv = document.getElementById("characterSelection");
  if (!selectionDiv) {
    console.error("characterSelection div not found.");
    return;
  }
  selectionDiv.innerHTML = "";
  if (!characters || !Array.isArray(characters)) {
    console.error("characters is not defined or is not an array.");
    return;
  }
  characters.forEach((character, index) => {
    const label = document.createElement("label");
    const img = document.createElement("img");
    let picUrl = characterPics[character.name.toLowerCase()] || "";
    img.src = picUrl;
    img.alt = character.name;
    img.className = "character-img";
    label.appendChild(img);
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = index;
    if (index < 8) { 
      checkbox.checked = true; 
    }
    label.appendChild(checkbox);
    
    const span = document.createElement("span");
    span.innerText = character.name;
    label.appendChild(span);
    
    selectionDiv.appendChild(label);
  });
}

export function getSelectedCharacters() {
  const checkboxes = document.querySelectorAll("#characterSelection input[type='checkbox']");
  let selectedIndices = [];
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      selectedIndices.push(parseInt(checkbox.value));
    }
  });
  if (selectedIndices.length !== 8) {
    alert("Please select exactly 8 characters. Defaulting to the first 8.");
    selectedIndices = [];
    for (let i = 0; i < 8; i++) {
      selectedIndices.push(i);
    }
  }
  const selectedCharacters = selectedIndices.map(i => characters[i]);
  const reserveCharacters = characters.filter((char, index) => !selectedIndices.includes(index));
  return { selectedCharacters, reserveCharacters };
}

export function populatePlayerSelection(selectedCharacters) {
  const playerDiv = document.getElementById("playerSelection");
  playerDiv.innerHTML = "";
  selectedCharacters.forEach((character, index) => {
    const label = document.createElement("label");
    const img = document.createElement("img");
    let picUrl = characterPics[character.name.toLowerCase()] || "";
    img.src = picUrl;
    img.alt = character.name;
    img.className = "character-img";
    label.appendChild(img);
    
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "playerCharacter";
    radio.value = index;
    if (index === 0) {
      radio.checked = true;
    }
    label.appendChild(radio);
    
    const span = document.createElement("span");
    span.innerText = character.name;
    label.appendChild(span);
    
    playerDiv.appendChild(label);
  });
}
