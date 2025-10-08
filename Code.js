/**
 * Creates a custom menu when the spreadsheet opens.
 * This menu provides quick access to the web app and coordinate helper tool.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔬 Anatomy Lab')
    .addItem('📱 Open Live Web App', 'openWebApp')
    .addItem('📍 Open Coordinate Helper', 'openCoordinateHelper')
    .addSeparator()
    .addItem('ℹ️ Get Web App URL', 'showWebAppUrl')
    .addToUi();
}

/**
 * Opens the live web app in a new browser tab.
 */
function openWebApp() {
  const url = ScriptApp.getService().getUrl();
  const html = `<script>window.open('${url}', '_blank');google.script.host.close();</script>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(100).setHeight(50),
    'Opening Web App...'
  );
}

/**
 * Opens the web app with coordinate helper mode enabled.
 */
function openCoordinateHelper() {
  const url = ScriptApp.getService().getUrl() + '?tool=coordinates';
  const html = `<script>window.open('${url}', '_blank');google.script.host.close();</script>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(100).setHeight(50),
    'Opening Coordinate Helper...'
  );
}

/**
 * Displays the web app URL in a dialog for easy copying.
 */
function showWebAppUrl() {
  const url = ScriptApp.getService().getUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 10px;">
      <p><strong>Web App URL:</strong></p>
      <input type="text" value="${url}" readonly
             style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;"
             onclick="this.select()">
      <p style="font-size: 12px; color: #666;">Click the URL to select and copy it.</p>
    </div>
  `;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(500).setHeight(150),
    'Web App URL'
  );
}

/**
 * Serves the main HTML page of the web app.
 * This is the primary function that runs when the web app URL is visited.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index.html')
    .setTitle('Interactive Anatomy Lab');
}

/**
 * Converts a standard Google Drive sharing URL into a direct image link.
 * @param {string} url The standard Google Drive file URL.
 * @returns {string} The direct-access URL for embedding, or the original URL if it's not a standard Drive link.
 */
function convertGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  // Regular expression to find the file ID in various Google Drive share link formats
  const fileIdMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    // Construct the thumbnail URL format that works best for web app embedding
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
  }
  // If it doesn't match, it might be a direct link already or from another source.
  return url;
}


/**
 * Gets a list of all lessons from the "Lesson Database" sheet for the landing page.
 * This is called by the frontend to populate the lesson selection cards.
 * @returns {Array<Object>} An array of lesson objects, each with name, description, and previewImage.
 */
function getLessons() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Lesson Database");
    if (!sheet) {
      return [{ error: "'Lesson Database' sheet not found." }];
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return []; // No lessons to return if sheet is empty or has only headers
    }
    // Get columns A (Name), B (Description 1), and C (Image 1 URL)
    const lessonData = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    
    // Map the 2D array to an array of objects
    return lessonData.map(row => {
      const lessonName = row[0];
      const description = row[1];
      const previewImage = convertGoogleDriveUrl(row[2]); // Convert the URL here
      
      // Only include if the lesson name is present
      if (lessonName && lessonName.trim() !== "") {
        return {
          name: lessonName,
          description: description,
          previewImage: previewImage
        };
      }
      return null;
    }).filter(lesson => lesson !== null); // Filter out any empty rows

  } catch (error) {
    Logger.log(error.toString());
    return [{ error: "Could not retrieve lessons." }];
  }
}


/**
 * Retrieves all the data for a specific lesson from the spreadsheet.
 * It finds the row with the matching lesson name and collects all valid
 * image URLs and descriptions.
 * @param {string} lessonName The name of the lesson to retrieve.
 * @returns {Array<Object>} An array of "view" objects, where each object has an `imageUrl` and a `description`.
 */
function getLessonData(lessonName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Lesson Database");
    if (!sheet) {
      throw new Error("'Lesson Database' sheet not found.");
    }

    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Remove header row

    // Find the row that matches the selected lessonName
    const lessonRow = data.find(row => row[0] === lessonName);

    if (!lessonRow) {
      return []; // Return empty if lesson not found
    }

    const views = [];
    // Iterate through the columns by steps of 3 (Description, URL, Zones)
    // Starting from column B (index 1)
    for (let i = 1; i < lessonRow.length; i += 3) {
      const description = lessonRow[i];
      const imageUrl = convertGoogleDriveUrl(lessonRow[i + 1]); // Convert the URL here
      const zonesData = lessonRow[i + 2]; // Get the zones JSON string

      // Only add the view if both the description and URL are not blank
      if (description && imageUrl && description.toString().trim() !== "" && imageUrl.toString().trim() !== "") {
        const viewObject = {
          description: description,
          imageUrl: imageUrl,
          zones: []
        };

        // Parse zones JSON if it exists
        if (zonesData && zonesData.toString().trim() !== "") {
          try {
            const parsedZones = JSON.parse(zonesData);
            if (Array.isArray(parsedZones)) {
              viewObject.zones = parsedZones;
            }
          } catch (e) {
            Logger.log(`Warning: Could not parse zones JSON for view ${i}: ${e.toString()}`);
            // Continue with empty zones array
          }
        }

        views.push(viewObject);
      }
    }
    return views;
  } catch (error) {
    Logger.log(error.toString());
    return []; // Return an empty array on error
  }
}

/**
 * A diagnostic function to test if the script can access the spreadsheet.
 * This is used to isolate permissions/access issues from the client-side.
 * @returns {string} A detailed success or failure message.
 */
function diagnoseSpreadsheetAccess() {
  try {
    // 1. Try to get the active spreadsheet object
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      return "DIAGNOSTIC FAILED: SpreadsheetApp.getActiveSpreadsheet() returned null. This can happen if the script is not correctly bound to a spreadsheet.";
    }

    // 2. Try to get the specific sheet by its name
    const sheet = spreadsheet.getSheetByName("Lesson Database");
    if (!sheet) {
      return "DIAGNOSTIC FAILED: Could not find a sheet named 'Lesson Database'. Please check for typos or extra spaces in the sheet tab name.";
    }

    // 3. If everything works, return a clear success message
    return `DIAGNOSTIC PASSED: Successfully accessed sheet named '${sheet.getName()}'. The issue is likely not with spreadsheet access itself.`;

  } catch (e) {
    // 4. If any part of the process fails, return the specific server-side error
    return `DIAGNOSTIC FAILED: An error occurred on the server while trying to access the spreadsheet. Error message: ${e.toString()}`;
  }
}

