# OHS Digital Microscope

This is a Google Apps Script project that creates an interactive digital microscope web application. The application is designed for educational purposes, allowing students to explore anatomy lessons with features like zooming, focusing, and interacting with labeled zones on images. It also includes a comprehensive admin interface for teachers to create, edit, and manage lessons, images, and interactive zones.

The project is tightly integrated with Google Workspace, using Google Sheets as a database for lesson content and Google Drive for image storage. The backend logic is written in Google Apps Script (JavaScript), and the frontend is a single-page application built with HTML and styled with TailwindCSS.

## Building and Running

This project is a Google Apps Script web app and is not run locally. It is deployed to Google's servers. The `clasp` command-line tool is used to manage the project.

**Key Commands:**

*   **`clasp push`**: Uploads the local code to the Google Apps Script project.
*   **`clasp open`**: Opens the Google Apps Script project in the browser.
*   **`clasp deploy`**: Deploys a new version of the web app.

The web app URL is hardcoded in the `Code.js` file and needs to be updated with the deployment URL.

## Development Conventions

*   **Backend:** All backend logic is in `Code.js`. It follows Google Apps Script best practices, using services like `SpreadsheetApp`, `DriveApp`, and `UrlFetchApp`.
*   **Frontend:** The UI is in `Index.html` and uses TailwindCSS for styling. The frontend communicates with the backend using `google.script.run`.
*   **Data Management:** Lesson data is stored in a Google Sheet named "Lesson Database". Admin credentials are in a sheet named "Admin". The structure of these sheets is documented in `SPREADSHEET_EXAMPLE.md`.
*   **Error Handling:** The frontend uses a generic failure handler (`onScriptRunFailure`) for backend calls, and the backend uses `try...catch` blocks with `Logger.log` for debugging.
*   **Modularity:** The application is divided into several "views" (landing page, simulation, coordinate helper, admin) that are shown or hidden as needed.
