/**
 * CONFIGURATION: Replace this with your actual deployed web app URL
 * You can find this URL by going to Extensions > Apps Script > Deploy > Manage Deployments
 * It should look like: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxqRzx8nvXNquuPVw_nLcefTZ_cSF2FE4Eo9GE3jY3Vm2eJJUQV3N09QzcKq2e5-ZFp9w/exec';

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
  const url = WEB_APP_URL;
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
  const url = WEB_APP_URL + '?tool=coordinates';
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
  const url = WEB_APP_URL;
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
 * Reads the 'tool' parameter to determine which mode to load (e.g., ?tool=coordinates)
 */
function doGet(e) {
  // Serve the HTML page
  // Tool mode is parsed from URL query parameter directly in the client-side JavaScript
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
    // Get columns A (Lesson Title), B (Lesson Description), C (Image 1 Description), and D (Image 1 URL)
    const lessonData = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

    // Map the 2D array to an array of objects
    return lessonData.map(row => {
      const lessonName = row[0];
      const description = row[1];
      // row[2] is Image 1 Description (not needed for preview)
      const previewImage = convertGoogleDriveUrl(row[3]); // Column D = Image 1 URL
      
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
    // Starting from column C (index 2) - Column B is Lesson Description
    for (let i = 2; i < lessonRow.length; i += 3) {
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
            Logger.log(`Attempting to parse zones for view ${Math.floor(i / 3)}: "${zonesData.toString()}"`);
            const parsedZones = JSON.parse(zonesData);
            if (Array.isArray(parsedZones)) {
              viewObject.zones = parsedZones;
              Logger.log(`Successfully parsed ${parsedZones.length} zones for view ${Math.floor(i / 3)}`);
            } else {
              Logger.log(`Warning: Zones data is not an array for view ${Math.floor(i / 3)}. Type: ${typeof parsedZones}`);
            }
          } catch (e) {
            Logger.log(`ERROR: Could not parse zones JSON for view ${Math.floor(i / 3)}`);
            Logger.log(`  Raw data: "${zonesData.toString()}"`);
            Logger.log(`  Error: ${e.toString()}`);
            // Continue with empty zones array
          }
        } else {
          Logger.log(`No zones data for view ${Math.floor(i / 3)}`);
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
 * Gets lesson data optimized for the coordinate helper tool.
 * Returns all images for a lesson with their URLs already converted for Drive compatibility.
 * @param {string} lessonName The name of the lesson to retrieve.
 * @returns {Array<Object>} An array of image objects with url, description, and index.
 */
function getLessonDataForCoordinates(lessonName) {
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

    const images = [];
    // Iterate through the columns by steps of 3 (Description, URL, Zones)
    // Starting from column C (index 2) - Column B is Lesson Description
    for (let i = 2; i < lessonRow.length; i += 3) {
      const description = lessonRow[i];
      const imageUrl = convertGoogleDriveUrl(lessonRow[i + 1]); // Convert the URL here

      // Only add the image if both the description and URL are not blank
      if (description && imageUrl && description.toString().trim() !== "" && imageUrl.toString().trim() !== "") {
        images.push({
          index: Math.floor((i - 2) / 3), // Calculate view index (0-based, adjusted for starting at index 2)
          description: description,
          imageUrl: imageUrl
        });
      }
    }
    return images;
  } catch (error) {
    Logger.log(error.toString());
    return []; // Return an empty array on error
  }
}

/**
 * Fetches an image from a URL and returns it as a base64-encoded data URL.
 * This bypasses CORS restrictions for canvas operations.
 * @param {string} url The image URL to fetch.
 * @returns {string} Base64-encoded data URL, or null on error.
 */
function getImageAsBase64(url) {
  try {
    // Fetch the image
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log(`Failed to fetch image: ${response.getResponseCode()}`);
      return null;
    }

    // Get the image blob
    const blob = response.getBlob();

    // Convert to base64
    const base64 = Utilities.base64Encode(blob.getBytes());

    // Get the content type (e.g., image/jpeg, image/png)
    const contentType = blob.getContentType();

    // Return as data URL
    return `data:${contentType};base64,${base64}`;

  } catch (error) {
    Logger.log(`Error fetching image as base64: ${error.toString()}`);
    return null;
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

// ============================================================================
// ADMIN AUTHENTICATION & AUTHORIZATION
// ============================================================================

/**
 * Authenticates admin credentials against the "Admin" sheet.
 * @param {string} username The username to verify.
 * @param {string} password The password to verify.
 * @returns {Object} Object with success boolean and message.
 */
function authenticateAdmin(username, password) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin");
    if (!sheet) {
      return { success: false, message: "Admin sheet not found." };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: "No admin credentials configured." };
    }

    // Get all usernames and passwords (columns A and B)
    const credentials = sheet.getRange(2, 1, lastRow - 1, 2).getValues();

    // Check if credentials match any row
    for (let i = 0; i < credentials.length; i++) {
      const [storedUsername, storedPassword] = credentials[i];
      if (storedUsername && storedPassword &&
        storedUsername.toString().trim() === username.trim() &&
        storedPassword.toString().trim() === password.trim()) {
        return { success: true, message: "Authentication successful." };
      }
    }

    return { success: false, message: "Invalid username or password." };

  } catch (error) {
    Logger.log(`Authentication error: ${error.toString()}`);
    return { success: false, message: "Authentication failed due to server error." };
  }
}

// ============================================================================
// GOOGLE DRIVE INTEGRATION
// ============================================================================

/**
 * Creates a folder in Google Drive for a lesson.
 * @param {string} lessonTitle The title of the lesson (will be the folder name).
 * @returns {Object} Object with success boolean, folderId, and message.
 */
function createLessonFolder(lessonTitle) {
  try {
    // Root folder ID for lesson storage
    const ROOT_FOLDER_ID = '1L69YbBWOi7AM_LrB5A1ENTy-AJHoTTRf';
    const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);

    // Check if folder already exists
    const existingFolders = rootFolder.getFoldersByName(lessonTitle);
    if (existingFolders.hasNext()) {
      const existingFolder = existingFolders.next();
      return {
        success: true,
        folderId: existingFolder.getId(),
        message: "Folder already exists.",
        isNew: false
      };
    }

    // Create new folder
    const newFolder = rootFolder.createFolder(lessonTitle);
    return {
      success: true,
      folderId: newFolder.getId(),
      message: "Folder created successfully.",
      isNew: true
    };

  } catch (error) {
    Logger.log(`Create folder error: ${error.toString()}`);
    return {
      success: false,
      message: `Failed to create folder: ${error.toString()}`
    };
  }
}

/**
 * Uploads a base64-encoded image to Google Drive.
 * @param {string} base64Data The base64-encoded image data (without data URL prefix).
 * @param {string} mimeType The MIME type of the image (e.g., 'image/png').
 * @param {string} fileName The name for the file.
 * @param {string} folderId The ID of the folder to upload to.
 * @returns {Object} Object with success boolean, fileId, url, and message.
 */
function uploadImageToDrive(base64Data, mimeType, fileName, folderId) {
  try {
    // Decode base64 to blob
    const decodedData = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedData, mimeType, fileName);

    // Get the folder
    const folder = DriveApp.getFolderById(folderId);

    // Create the file
    const file = folder.createFile(blob);

    // Set sharing permissions to "Anyone with link can view"
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Get the shareable URL
    const fileId = file.getId();
    const url = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    return {
      success: true,
      fileId: fileId,
      url: url,
      message: "Image uploaded successfully."
    };

  } catch (error) {
    Logger.log(`Upload image error: ${error.toString()}`);
    return {
      success: false,
      message: `Failed to upload image: ${error.toString()}`
    };
  }
}

/**
 * Updates sharing permissions for a Drive file.
 * @param {string} fileId The ID of the file.
 * @returns {Object} Object with success boolean and message.
 */
function setDrivePermissions(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {
      success: true,
      message: "Permissions updated successfully."
    };
  } catch (error) {
    Logger.log(`Set permissions error: ${error.toString()}`);
    return {
      success: false,
      message: `Failed to set permissions: ${error.toString()}`
    };
  }
}

// ============================================================================
// LESSON MANAGEMENT (CRUD OPERATIONS)
// ============================================================================

/**
 * Creates a new lesson in the spreadsheet.
 * @param {string} lessonTitle The title of the lesson.
 * @param {string} lessonDescription The description of the lesson.
 * @returns {Object} Object with success boolean, rowIndex, folderId, and message.
 */
function createLesson(lessonTitle, lessonDescription) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Lesson Database");
    if (!sheet) {
      return { success: false, message: "Lesson Database sheet not found." };
    }

    // Check if lesson already exists
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === lessonTitle.trim()) {
        return {
          success: false,
          message: "A lesson with this title already exists."
        };
      }
    }

    // Create folder in Drive
    const folderResult = createLessonFolder(lessonTitle);
    if (!folderResult.success) {
      return folderResult;
    }

    // Find the first empty row
    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;

    // Write lesson title and description
    sheet.getRange(newRow, 1).setValue(lessonTitle);
    sheet.getRange(newRow, 2).setValue(lessonDescription);

    return {
      success: true,
      rowIndex: newRow,
      folderId: folderResult.folderId,
      message: "Lesson created successfully."
    };

  } catch (error) {
    Logger.log(`Create lesson error: ${error.toString()}`);
    return {
      success: false,
      message: `Failed to create lesson: ${error.toString()}`
    };
  }
}

/**
 * Updates a lesson's image data in the spreadsheet.
 * @param {string} lessonName The name of the lesson.
 * @param {number} imageIndex The index of the image (0-based).
 * @param {string} imageDescription The description of the image.
 * @param {string} imageUrl The URL of the image in Drive.
 * @param {string} zonesJson The JSON string containing zone data.
 * @returns {Object} Object with success boolean and message.
 */
function updateLessonImage(lessonName, imageIndex, imageDescription, imageUrl, zonesJson) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Lesson Database");
    if (!sheet) {
      return { success: false, message: "Lesson Database sheet not found." };
    }

    // Find the lesson row
    const data = sheet.getDataRange().getValues();
    let lessonRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === lessonName.trim()) {
        lessonRow = i + 1; // Convert to 1-based index
        break;
      }
    }

    if (lessonRow === -1) {
      return { success: false, message: "Lesson not found." };
    }

    // Calculate column indices
    // Column A (index 1) = Lesson Title
    // Column B (index 2) = Lesson Description
    // Column C (index 3) = Image 1 Description
    // Column D (index 4) = Image 1 URL
    // Column E (index 5) = Image 1 Zones
    // Each subsequent image adds 3 columns
    const baseColumn = 3 + (imageIndex * 3);
    const descColumn = baseColumn;
    const urlColumn = baseColumn + 1;
    const zonesColumn = baseColumn + 2;

    // Update the cells
    sheet.getRange(lessonRow, descColumn).setValue(imageDescription);
    sheet.getRange(lessonRow, urlColumn).setValue(imageUrl);
    sheet.getRange(lessonRow, zonesColumn).setValue(zonesJson);

    return {
      success: true,
      message: "Lesson image updated successfully."
    };

  } catch (error) {
    Logger.log(`Update lesson image error: ${error.toString()}`);
    return {
      success: false,
      message: `Failed to update lesson image: ${error.toString()}`
    };
  }
}

/**
 * Gets all data for a lesson for editing purposes.
 * @param {string} lessonName The name of the lesson.
 * @returns {Object} Lesson data with images array or error.
 */
function getLessonForEditing(lessonName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Lesson Database");
    if (!sheet) {
      return { success: false, message: "Lesson Database sheet not found." };
    }

    const data = sheet.getDataRange().getValues();

    // Find the lesson row
    let lessonRow = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === lessonName.trim()) {
        lessonRow = data[i];
        break;
      }
    }

    if (!lessonRow) {
      return { success: false, message: "Lesson not found." };
    }

    const lessonData = {
      title: lessonRow[0],
      description: lessonRow[1],
      images: []
    };

    // Parse all images (columns C onwards, in sets of 3)
    // Column B is Lesson Description, images start at C
    for (let i = 2; i < lessonRow.length; i += 3) {
      const description = lessonRow[i];
      const url = lessonRow[i + 1];
      const zones = lessonRow[i + 2];

      if (description && url && description.toString().trim() !== "" && url.toString().trim() !== "") {
        lessonData.images.push({
          index: Math.floor((i - 2) / 3), // Adjusted for starting at index 2
          description: description,
          url: convertGoogleDriveUrl(url),
          zones: zones ? zones.toString() : '[]'
        });
      }
    }

    return {
      success: true,
      data: lessonData
    };

  } catch (error) {
    Logger.log(`Get lesson for editing error: ${error.toString()}`);
    return {
      success: false,
      message: `Failed to get lesson data: ${error.toString()}`
    };
  }
}
