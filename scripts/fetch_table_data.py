import gspread
import json
import os
import re
import traceback
import sys

def fetch_and_group_by_day():
    """
    Fetches data from a Google Sheet, processes each row to extract shipment
    details, groups the data by the day of the week, and saves it as a JSON file.
    """
    # --- Configuration ---
    SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
    GOOGLE_CREDENTIAL_JSON = os.environ.get("GOOGLE_CREDENTIAL_JSON")
    
    # !!! IMPORTANT: Please verify this is the correct name of your sheet !!!
    WORKSHEET_NAME = "dashboard" 
    OUTPUT_JSON_PATH = "data/shipments_by_day.json"

    # --- Pre-computation and Setup ---
    DAYS_OF_WEEK = [
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday"
    ]
    DAY_REGEX = re.compile(r'(\b(?:' + '|'.join(DAYS_OF_WEEK) + r')\b)\s*$', re.IGNORECASE)
    
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
        data_by_day = {day: [] for day in DAYS_OF_WEEK}
        processed_rows = 0

        print("Processing rows and grouping by day...")
        for i, row_cells in enumerate(all_rows):
            line = " ".join(filter(None, row_cells)).strip()

            if not line:
                continue

            match = DAY_REGEX.search(line)

            if not match:
                # This is just a warning, not a critical error
                # print(f"Warning: Could not find a day of the week in row {i+1}. Skipping. Content: '{line}'")
                continue

            day = match.group(1).capitalize()
            content_part = line[:match.start()].strip()
            dates = re.findall(r'\d{1,2}/\d{1,2}/\d{4}', content_part)
            
            arrival = dates[0] if dates else None
            departure = None
            if len(dates) > 1:
                departure = dates[1]
            elif 'TBD' in content_part.upper():
                departure = 'TBD'

            customer_reference = content_part
            for date in dates:
                customer_reference = customer_reference.replace(date, '')
            
            customer_reference = re.sub(r'\bTBD\b', '', customer_reference, flags=re.IGNORECASE)
            customer_reference = re.sub(r'\s+', ' ', customer_reference).strip(' -')

            record = {
                "customer_reference": customer_reference,
                "arrival": arrival,
                "departure": departure
            }
            
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
            sys.exit(1) # Exit with an error code to fail the workflow step

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
