# GoGaucho Web

GoGaucho WebApp for UCSB students.

## Getting started

Use Node.js 22. Run `npm install`, then `npm run dev -- --host localhost --port 4173 --strictPort` to run the app at the registered Google OAuth origin. Run `npm test` for the web tests and `npm run build` for a production build.

## Add your schedule to Google Calendar

Sign in with your UCSB account, select a quarter in **My Classes**, then choose **Add to Google Calendar**. In Google's account chooser, select the personal or school account that should own the new calendar. You stay signed in to GoGaucho with your UCSB account.

GoGaucho creates a private, editable **UCSB Schedule Calendar [quarter year]** and opens it in Google Calendar. Enrolled classes repeat in Pacific time during instruction and skip official UCSB no-class days. Custom events keep their normal recurrence, including holidays. The [Registrar’s academic calendar](https://registrar.sa.ucsb.edu/calendars/academic-calendars) currently supplies dates for Fall, Winter and Spring quarters from Fall 2026 through Spring 2034. Summer sessions, final exams and unscheduled meetings are unavailable for export.

Each export creates a separate copy. Later GoGaucho changes, including updated dates, apply to new copies. If Google can't confirm the result, follow the dialog's instructions to check the destination calendar before retrying. See [Google Calendar setup](./docs/google-calendar-setup.md) for details.
