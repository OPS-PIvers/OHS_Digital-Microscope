# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Apps Script web application for an interactive digital microscope educational tool. Students explore anatomy lessons with zoom, focus, and clickable zones on images. Teachers/admins can create and manage lessons, upload images to Google Drive, and define interactive zones through a web interface.

**Technology Stack:**
- **Backend:** Google Apps Script (JavaScript with V8 runtime)
- **Frontend:** Single-page HTML application with TailwindCSS
- **Data Storage:** Google Sheets (lesson database, admin credentials)
- **File Storage:** Google Drive (lesson images organized in folders)
- **Deployment:** Google Apps Script Web App (not a local server)

## Development Commands

### Deployment
- `clasp push --force` - Upload local code to Google Apps Script project
- `clasp redeploy AKfycbwbFFzzKeOZRxuMfMd3kOCrHqA35ZlKDmnyXcztUcoFNhQ4lWj-QugEnri5aMKNdiaE8A` - Update the deployed web app
- `clasp open` - Open the Apps Script editor in browser

**Note:** There is no local build/test process. Changes must be pushed to Google Apps Script and tested via the deployed web app URL.

### Web App URL
The deployed web app URL is hardcoded in [Code.js:6](Code.js#L6):
```javascript
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxqRzx8nvXNquuPVw_nLcefTZ_cSF2FE4Eo9GE3jY3Vm2eJJUQV3N09QzcKq2e5-ZFp9w/exec';
```

## Code Architecture

### File Structure
- **Code.js** - All backend logic (~985 lines)
  - Spreadsheet CRUD operations
  - Google Drive integration
  - Admin authentication
  - URL conversion utilities
- **Index.html** - Complete frontend (HTML/CSS/JS, ~2850 lines)
  - Three main views: Landing, Simulation, Admin
  - Tailwind CSS styling
  - Client-side JavaScript for UI interactions
- **appsscript.json** - Apps Script configuration (V8 runtime, Drive/Sheets APIs)

### Spreadsheet Structure

The "Lesson Database" sheet follows a strict column pattern documented in [SPREADSHEET_EXAMPLE.md](SPREADSHEET_EXAMPLE.md):

| Column | Content | Example |
|--------|---------|---------|
| A | Lesson Title | "Cell Structure" |
| B | Lesson Description | "Learn about plant cells" |
| C | Image 1 Description | "Overview of cell" |
| D | Image 1 URL | Drive sharing link |
| E | Image 1 Zones (JSON) | `[{"x":10,"y":20,"width":30,"height":40,"label":"Nucleus"}]` |
| F | Image 2 Description | ... |
| G | Image 2 URL | ... |
| H | Image 2 Zones (JSON) | ... |

**Pattern:** Each image uses 3 columns (Description, URL, Zones JSON). Images start at column C (index 2).

**Column Index Calculation:**
```javascript
// For image at imageIndex (0-based):
baseColumn = 3 + (imageIndex * 3)  // Column C = 3 for first image
descColumn = baseColumn            // Description
urlColumn = baseColumn + 1         // URL
zonesColumn = baseColumn + 2       // Zones JSON
```

### Backend Functions (Code.js)

**Data Retrieval:**
- `getLessons()` - Returns all lessons for landing page (columns A, B, D)
- `getLessonData(lessonName)` - Returns all images/zones for simulation view
- `getLessonDataForCoordinates(lessonName)` - Returns images for admin zone editor (legacy function name, still used by admin)
- `getLessonForEditing(lessonName)` - Returns full lesson data for admin editing

**Lesson Management:**
- `createLesson(title, description)` - Creates lesson row + Drive folder
- `updateLessonImage(lessonName, imageIndex, description, url, zonesJson)` - Updates image data in spreadsheet
- `deleteLesson(lessonName)` - Deletes lesson row and Drive folder

**Image Management:**
- `uploadImageToDrive(base64Data, mimeType, fileName, folderId)` - Uploads image, sets sharing to "Anyone with link"
- `replaceImage(lessonName, imageIndex, base64Data, ...)` - Deletes old image, uploads new one
- `deleteImage(lessonName, imageIndex)` - Removes image from spreadsheet and Drive
- `editImageMetadata(lessonName, imageIndex, newDescription)` - Updates image description only

**Drive Integration:**
- `createLessonFolder(lessonTitle)` - Creates folder in root Drive folder (ID: `1L69YbBWOi7AM_LrB5A1ENTy-AJHoTTRf`)
- `convertGoogleDriveUrl(url)` - Converts share links to thumbnail format (`https://drive.google.com/thumbnail?id=...&sz=w2000`)
- `extractFileIdFromUrl(url)` - Parses file ID from Drive URLs

**Authentication:**
- `authenticateAdmin(username, password)` - Validates credentials against "Admin" sheet

**Utilities:**
- `getImageAsBase64(url)` - Fetches image and returns base64 data URL (bypasses CORS)
- `doGet(e)` - Main entry point that serves Index.html

### Frontend Architecture (Index.html)

**Three Main Views:**
1. **Landing Page (View 1)** - Lesson selection cards with previews
2. **Simulation (View 2)** - Student microscope experience with zoom, focus slider, clickable zones
3. **Admin (View 3)** - Teacher interface with sub-views:
   - Lesson list (view/edit/delete)
   - Create/edit form (title & description)
   - Image manager (upload via file picker or Ctrl+V paste)
   - Zone editor (drag-to-create rectangles or polygons with labels and actions)

**Key Frontend Patterns:**
- Views are shown/hidden by toggling `hidden` class
- All backend calls use `google.script.run.withSuccessHandler(callback).withFailureHandler(onScriptRunFailure).functionName(args)`
- Images use `object-contain` CSS for aspect ratio preservation
- Zone coordinates are stored as percentages of image dimensions
- Crossfade transitions between images with blur effects
- Focus slider controls blur filter on current image

## Important Implementation Details

### Google Apps Script Constraints
- **No async/await** - Use callbacks with `google.script.run.withSuccessHandler()`
- **V8 Runtime enabled** - Supports ES6 (const, let, arrow functions, template literals)
- **Server-side only services** - `DriveApp`, `SpreadsheetApp`, `UrlFetchApp` cannot be called from client
- **Client-side only APIs** - FileReader, clipboard paste events run in browser

### Drive URL Handling
All Drive URLs must be converted for embedding:
```javascript
// Share link format (from sheet):
https://drive.google.com/file/d/FILE_ID/view

// Thumbnail format (for display):
https://drive.google.com/thumbnail?id=FILE_ID&sz=w2000
```

This conversion is handled by `convertGoogleDriveUrl()` in Code.js.

### Zone Data Format
Zones are stored as JSON strings in spreadsheet:
```json
[
  {
    "x": 10.5,        // Percentage from left
    "y": 20.3,        // Percentage from top
    "width": 15.2,    // Percentage of image width
    "height": 12.8,   // Percentage of image height
    "label": "Nucleus"
  }
]
```

### Root Drive Folder
All lesson folders are created in this root folder (hardcoded in multiple functions):
```javascript
const ROOT_FOLDER_ID = '1L69YbBWOi7AM_LrB5A1ENTy-AJHoTTRf';
```

## Common Tasks

### Adding a New Backend Function
1. Add function to [Code.js](Code.js) with try/catch and error logging
2. Return objects with `{ success: boolean, message: string, ...data }`
3. Test via Apps Script editor before deploying
4. Call from frontend using `google.script.run.withSuccessHandler().withFailureHandler().newFunction()`

### Modifying Spreadsheet Structure
If changing column layout, update these functions:
- `getLessons()` - Landing page data
- `getLessonData()` - Simulation view data
- `getLessonDataForCoordinates()` - Admin zone editor data (legacy function name)
- `updateLessonImage()` - Column index calculations
- `getLessonForEditing()` - Admin edit view
- All image management functions (delete, replace, etc.)

### Changing Admin Workflow
Admin UI is in Index.html starting around line 150 (estimated). The admin view has nested sub-views controlled by `adminCurrentView` variable. State management is done via global JavaScript variables.

## Testing

There is no automated test suite. Testing requires:
1. Deploy to Apps Script with `clasp push --force` and `clasp redeploy`
2. Open web app URL in browser
3. Manually test each view and workflow
4. Check Apps Script logs via `clasp logs` or in the editor for server-side errors

**Admin Testing:**
- Create "Admin" sheet with columns: Username (A), Password (B)
- Add test credentials
- Test login, lesson creation, image upload, zone editing, delete operations

**Student Testing:**
- Verify lesson cards display correctly
- Test microscope zoom/focus animations
- Click on zones to trigger next image
- Test back navigation

## References

- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Detailed feature documentation and testing checklist
- [SPREADSHEET_EXAMPLE.md](SPREADSHEET_EXAMPLE.md) - Exact spreadsheet structure and column mapping
- [GEMINI.md](GEMINI.md) - Original development conventions documentation
