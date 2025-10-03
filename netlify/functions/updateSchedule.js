// netlify/functions/updateSchedule.js
import { google } from "googleapis";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { scheduleData } = JSON.parse(event.body || "{}");

    // Authenticate with service account credentials from Netlify env vars
    const auth = new google.auth.JWT(
      process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    // Append a timestamp and the JSON snapshot of your schedule
    const values = [[new Date().toISOString(), JSON.stringify(scheduleData)]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.VITE_GOOGLE_SHEET_ID,
      range: "Sheet1!A1", // change if your sheet tab has a different name
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: "Data saved to Google Sheet" }),
    };
  } catch (error) {
    console.error("updateSchedule error:", error);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Error saving to sheet" }) };
  }
}
