# Spreadsheet PDF Merger — JavaScript/Electron, macOS Sonoma 14 / Intel

This is an Electron desktop application written in JavaScript, HTML, and CSS. It reads Excel/CSV data, merges the two single-page PDFs named in each spreadsheet row, names the result using selected spreadsheet columns, validates that the output has exactly two pages, and writes `merge_report.xlsx`.

## Important: no Node.js installation needed on your Mac

This package includes a GitHub Actions workflow that builds the Intel Mac app in the cloud. You do not need to install Node.js on your Mac. You will need a GitHub account and a browser to run the cloud build.

## Build the standalone app using GitHub (no local Node.js)

1. Download and unzip this project.
2. In a web browser, sign in to GitHub and create a **new private repository** (for example, `spreadsheet-pdf-merger`). Do not initialize it with a README or other files.
3. Open the new repository and choose **Add file → Upload files**.
4. Upload the contents of this project folder, including the hidden `.github` folder. If the GitHub web upload does not show hidden folders, use the repository's **Add file → Create new file** option and create `.github/workflows/build-macos-intel.yml`, then paste in the contents of the included workflow file. Upload the remaining project files and the `src` folder.
5. Commit the files to the `main` branch.
6. Open the repository's **Actions** tab. Select **Build macOS Intel app** and click **Run workflow** if it hasn't started automatically after the commit.
7. Wait for the build to finish successfully. Open the completed workflow run, scroll to **Artifacts**, and download `Spreadsheet-PDF-Merger-macOS-Sonoma-Intel`.
8. Unzip the downloaded artifact on your Mac. It contains the packaged app output. Move `Spreadsheet PDF Merger.app` to Applications or another folder.
9. The app is unsigned and not notarized, so macOS may warn you on first launch. Only open it if you trust the source; Control-click the app and choose **Open** if you decide to proceed.

The cloud workflow uses a macOS Intel runner (`macos-15-intel`) and Node.js on that runner only. Your Mac does not need Node.js, npm, Python, Xcode, or developer tools installed.

## Alternative: run/build locally (requires Node.js)

If you later prefer local development, install Node.js for Intel macOS from https://nodejs.org/en/download/, then run `setup.command` and `Build Mac App.command`.

## Workflow
- Select an `.xlsx`, `.xls`, `.xlsm`, or `.csv` spreadsheet.
- Select the source PDF folder and output folder.
- Choose the column for the first PDF and the column for the second PDF.
- Enter one or more output naming column headers, separated by commas (example: `Job ID, SKU`).
- Click Merge PDFs.

## Example
| PDF_A | PDF_B | Job ID | SKU |
|---|---|---|---|
| front_001.pdf | back_001.pdf | JOB123 | SKU456 |

Creates `JOB123_SKU456.pdf` with PDF_A as page 1 and PDF_B as page 2.

## Notes
- Each source PDF must contain exactly one page. Multi-page source files are reported as errors.
- Existing outputs are skipped unless overwrite is enabled.
- If recursive search finds the same PDF filename in multiple subfolders, it is treated as ambiguous.
- Source PDFs are not modified. All processing happens locally on your Mac.
- The cloud-built app is unsigned and not notarized. GitHub build artifacts expire after 14 days, so download the artifact after the workflow finishes.
