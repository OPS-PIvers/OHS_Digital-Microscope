/**
 * Serves the main HTML page of the web app.
 * This is the primary function that runs when the web app URL is visited.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index.html')
    .setTitle('Interactive Anatomy Lab')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
 * Retrieves all data for a specific lesson, including image views and their associated clickable zones.
 * It first gets the image sequence from "Lesson Database", then fetches corresponding zone data from "Zone Database".
 * @param {string} lessonName The name of the lesson to retrieve.
 * @returns {Array<Object>} An array of "view" objects, each with an `imageUrl`, `description`, and a `zones` array.
 */
function getLessonData(lessonName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const lessonSheet = spreadsheet.getSheetByName("Lesson Database");
    if (!lessonSheet) {
      throw new Error("'Lesson Database' sheet not found.");
    }

    // --- 1. Get Image Views from "Lesson Database" ---
    const lessonData = lessonSheet.getDataRange().getValues();
    lessonData.shift(); // Remove header row
    const lessonRow = lessonData.find(row => row[0] === lessonName);

    if (!lessonRow) {
      return []; // Return empty if lesson not found
    }
    
    const views = [];
    // Iterate through image description/URL pairs
    for (let i = 1; i < lessonRow.length; i += 2) {
      const description = lessonRow[i];
      const rawUrl = lessonRow[i + 1];
      
      if (description && rawUrl && description.toString().trim() !== "" && rawUrl.toString().trim() !== "") {
        views.push({
          description: description,
          imageUrl: convertGoogleDriveUrl(rawUrl), // The URL used by the client
          rawUrl: rawUrl, // The original URL from the sheet for matching
          zones: [] // Initialize zones array
        });
      }
    }

    // --- 2. Get Zone Data from "Zone Database" (if it exists) ---
    const zoneSheet = spreadsheet.getSheetByName("Zone Database");
    if (!zoneSheet) {
      Logger.log("INFO: 'Zone Database' sheet not found. Proceeding without clickable zones.");
      views.forEach(v => delete v.rawUrl); // Clean up rawUrl before sending
      return views;
    }

    const zoneData = zoneSheet.getDataRange().getValues();
    zoneData.shift(); // Remove header row

    // Create a map of zones for efficient lookup, keyed by "LessonName::ImageURL"
    const zonesMap = {};
    zoneData.forEach(row => {
        const zLessonName = row[0];
        const zRawUrl = row[1];
        if (zLessonName && zRawUrl && zLessonName.trim() !== "" && zRawUrl.trim() !== "") {
            const key = `${zLessonName}::${zRawUrl}`;
            if (!zonesMap[key]) {
                zonesMap[key] = [];
            }
            // Add the zone with parsed coordinates
            zonesMap[key].push({
                x: parseInt(row[2], 10),
                y: parseInt(row[3], 10),
                w: parseInt(row[4], 10),
                h: parseInt(row[5], 10),
                text: row[6] || ""
            });
        }
    });

    // --- 3. Match Zones to their respective Views ---
    views.forEach(view => {
      const key = `${lessonName}::${view.rawUrl}`;
      if (zonesMap[key]) {
        // Filter out any zones that might have invalid coordinate data after parsing
        view.zones = zonesMap[key].filter(z =>
            !isNaN(z.x) && !isNaN(z.y) && !isNaN(z.w) && !isNaN(z.h)
        );
      }
      delete view.rawUrl; // Clean up the rawUrl before sending to the client
    });

    return views;

  } catch (error) {
    Logger.log(`Error in getLessonData: ${error.toString()}`);
    return []; // Return an empty array on error
  }
}


/**
 * A diagnostic function to test if the script can access the required spreadsheet sheets.
 * Checks for both "Lesson Database" and the optional "Zone Database".
 * @returns {string} A detailed success or failure message.
 */
function diagnoseSpreadsheetAccess() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      return "DIAGNOSTIC FAILED: SpreadsheetApp.getActiveSpreadreadsheet() returned null. The script may not be correctly bound to a spreadsheet.";
    }

    // Check for the mandatory "Lesson Database" sheet
    const lessonSheet = spreadsheet.getSheetByName("Lesson Database");
    if (!lessonSheet) {
      return "DIAGNOSTIC FAILED: Could not find the required sheet named 'Lesson Database'. Please check for typos or extra spaces.";
    }

    // Check for the optional "Zone Database" sheet and create a status message
    const zoneSheet = spreadsheet.getSheetByName("Zone Database");
    let zoneSheetStatus = "";
    if (!zoneSheet) {
      zoneSheetStatus = "INFO: 'Zone Database' sheet was not found. This is optional and only needed for clickable zones.";
    } else {
      zoneSheetStatus = "INFO: Successfully found 'Zone Database' sheet.";
    }

    // Return a comprehensive success message
    return `DIAGNOSTIC PASSED: Successfully accessed '${lessonSheet.getName()}'. ${zoneSheetStatus}`;

  } catch (e) {
    // Catch any other server-side errors during access
    return `DIAGNOSTIC FAILED: An error occurred on the server: ${e.toString()}`;
  }
}

