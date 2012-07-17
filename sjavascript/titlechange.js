// titlechange.js v0.0 (2005-11-19)
// Requirement: uai.js

function setDocumentTitle(newTitle) {
	newTitle = newTitle || "";
	if (setDocumentTitle.enabled && document.title != newTitle)
		document.title = newTitle;
}

setDocumentTitle.enabled = ! new UAIdentifier().opera;
