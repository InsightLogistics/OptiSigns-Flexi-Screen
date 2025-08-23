import gspread
import json
import os
import re
import traceback
import sys

def fetch_and_group_by_day():
    """
    Fetches data from a Google Sheet by reading specific columns, processes it,
    groups the data by the day of the week, and saves it as a JSON file.
    """
    # --- Configuration ---
    SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
    GOOGLE_CREDENTIAL_JSON = os.environ.get("GOOGLE_CREDENTIAL_JSON")
    
    # !!! IMPORTANT: Please verify this is the correct name of your sheet !!!
    WORKSHEET_NAME = "dashboard" 
    OUTPUT_JSON_PATH = "data/shipments_by_day.json"

    # --- Column Index Mapping ---
    # A=0, B=1, C=2, D=3, E=4
    CUSTOMER_COL = 0
    REFERENCE_COL = 1
    ARRIVAL_COL = 2
    DEPARTURE_COL = 3
    DAY_COL = 4
    
    # --- Input Validation ---
    if not SPREADSHEET_ID or not GOOGLE_CREDENTIAL_JSON:
        print("Error: SPREADSHEET_ID or GOOGLE_CREDENTIAL_JSON environment variables are not set.")
        sys.exit(1) # Exit with an error code

    try:
        # --- Google Sheets Authentication ---
        print("Authenticating with Google Sheets...")
        credentials_dict = json.loads(GOOGLE_CREDENTIAL_JSON)
        gc = gspread.service_account_from_dict(credentials_dict)
        
        # --- Data Fetching ---
        print(f"Opening spreadsheet (ID: {SPREADSHEET_ID}) and worksheet '{WORKSHEET_NAME}'...")
        spreadsheet = gc.open_by_key(SPREADSHEET_ID)
        worksheet = spreadsheet.worksheet(WORKSHEET_NAME)
        
        all_rows = worksheet.get_all_values()
        print(f"Successfully fetched {len(all_rows)} rows from the sheet.")

        # --- Data Processing ---
        data_by_day = {
            "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [],
            "Friday": [], "Saturday": [], "Sunday": []
        }
        processed_rows = 0

        print("Processing rows by reading specific columns...")
        # Start from the second row to skip headers, if any.
        for i, row in enumerate(all_rows[1:]):
            # Ensure the row has enough columns to avoid errors
            if len(row) <= DAY_COL:
                # print(f"Warning: Skipping row {i+2} due to insufficient columns.")
                continue

            # Extract data directly from columns
            customer = row[CUSTOMER_COL].strip()
            reference = row[REFERENCE_COL].strip()
            arrival = row[ARRIVAL_COL].strip()
            departure = row[DEPARTURE_COL].strip()
            day = row[DAY_COL].strip().capitalize()

            # Skip if the essential 'day' column is empty
            if not day:
                continue

            # Create the record for JSON output
            record = {
                "customer": customer or "N/A",
                "reference": reference or "N/A",
                "arrival": arrival or "N/A",
                "departure": departure or "N/A"
            }
            
            # Group the record by the day of the week
            if day in data_by_day:
                data_by_day[day].append(record)
                processed_rows += 1
        
        print(f"Finished processing. Found and grouped {processed_rows} valid entries.")

        # --- File Output ---
        output_dir = os.path.dirname(OUTPUT_JSON_PATH)
        if output_dir and not os.path.exists(output_dir):
            print(f"Directory '{output_dir}' not found. Creating it...")
            os.makedirs(output_dir)
            print(f"Created output directory: {output_dir}")

        print(f"Writing processed data to '{OUTPUT_JSON_PATH}'...")
        with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data_by_day, f, ensure_ascii=False, indent=4)
        
        # --- Final Verification ---
        if os.path.exists(OUTPUT_JSON_PATH):
            print(f"SUCCESS: JSON file saved successfully at '{OUTPUT_JSON_PATH}'.")
        else:
            print(f"FAILURE: File was NOT created at '{OUTPUT_JSON_PATH}'.")
            sys.exit(1)

    except gspread.exceptions.WorksheetNotFound:
        print(f"CRITICAL ERROR: Worksheet '{WORKSHEET_NAME}' not found in the spreadsheet.")
        print("Please check the WORKSHEET_NAME variable in the Python script and ensure it matches the Google Sheet exactly.")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    fetch_and_group_by_day()
