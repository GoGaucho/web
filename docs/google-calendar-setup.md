# Google Calendar setup

## OAuth

Use a Google Web OAuth client with the Calendar API enabled. The app defaults to the existing GoGaucho client. Set `VITE_GOOGLE_CALENDAR_CLIENT_ID` at build time to use another public client ID. The exact site origin must be in that client's authorized JavaScript origins. Use `http://localhost:4173` for GoGaucho's registered local origin. [Google's OAuth client setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid)

Configure consent for `calendar.app.created`, `openid` and `email`. The account selected in Google's popup owns the schedule copy. Workspace policies can affect which accounts grant access. The Calendar access token stays in memory, and the UCSB account continues to supply class data. [Google's Calendar scopes](https://developers.google.com/workspace/calendar/api/auth)

## Academic dates

Run `npm run calendar:refresh` with Node.js 22 and network access to update the [bundled date snapshot](../src/data/academic-calendar.json). The importer discovers published years in the [UCSB Registrar’s academic calendar](https://registrar.sa.ucsb.edu/calendars/academic-calendars) and checks each quarter's holiday dates against the report's instruction day count. The Power BI report endpoint is undocumented and its format can change.

The current snapshot covers 24 Fall, Winter, and Spring quarters through Spring 2034, plus Summer 2024–2029. Run the refresh command to pick up corrections or newly published years. An incomplete response leaves the saved snapshot intact. Local builds and tests use the bundled data without querying the report.

New Google copies omit enrolled class occurrences on holidays during the instruction period. Custom events retain their normal recurrence. Finals need an enrolled-course exam source.

Summer dates for sessions A–G come from the [UCSB Summer Sessions multi-year calendar](https://summer.ucsb.edu/sites/default/files/documents/Faculty%20and%20Staff/UCSB%20Summer%20Calendars%202024-2029..pdf). When UCSB publishes new years, add each session’s **Instruction Begins** and **Instruction Ends** dates to [summer-sessions.json](../src/data/summer-sessions.json) and run the refresh command to populate the Registrar’s holiday dates for those years. Custom events span the full Summer instruction period. An enrolled class needs a recognized session to export.

## Validation

Run `npm test` and `npm run build`, then `npm run preview -- --host localhost --port 4173 --strictPort`. Open My Classes with an authorized UCSB account and verify that changing quarters reloads the schedule before enabling export. Use a test calendar to confirm that an enrolled meeting falling on a holiday is skipped and a custom event on the same day is retained. Verify that denial or cancellation sends no new events. Check the selected destination before retrying if an export reports an uncertain result.
