import gspread
import json
import os
import re
import traceback

def fetch_and_group_by_day():
    """
    Fetches data from a Google Sheet, processes each row to extract shipment
    details, groups the data by the day of the week, and saves it as a JSON file.
    """
    # --- Configuration ---
    # Attempt to get configuration from environment variables.
    # Provide default values for local testing if needed.
    SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
    GOOGLE_CREDENTIAL_JSON = os.environ.get("GOOGLE_CREDENTIAL_JSON")
    WORKSHEET_NAME = "Sheet1"  # IMPORTANT: Update with your actual worksheet name
    OUTPUT_JSON_PATH = "data/shipments_by_day.json"

    # --- Pre-computation and Setup ---
    # A list of days to identify in the data.
    DAYS_OF_WEEK = [
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday"
    ]
    # Create a regex pattern to find any of the days of the week at the end of a string.
    # This is case-insensitive.
    DAY_REGEX = re.compile(r'(\b(?:' + '|'.join(DAYS_OF_WEEK) + r')\b)\s*$', re.IGNORECASE)
    
    # --- Input Validation ---
    if not SPREADSHEET_ID or not GOOGLE_CREDENTIAL_JSON:
        print("Error: SPREADSHEET_ID or GOOGLE_CREDENTIAL_JSON environment variables are not set.")
        return

    try:
        # --- Google Sheets Authentication ---
        print("Authenticating with Google Sheets...")
        credentials_dict = json.loads(GOOGLE_CREDENTIAL_JSON)
        gc = gspread.service_account_from_dict(credentials_dict)
        
        # --- Data Fetching ---
        print(f"Opening spreadsheet (ID: {SPREADSHEET_ID}) and worksheet '{WORKSHEET_NAME}'...")
        spreadsheet = gc.open_by_key(SPREADSHEET_ID)
        worksheet = spreadsheet.worksheet(WORKSHEET_NAME)
        
        # Get all rows from the worksheet.
        all_rows = worksheet.get_all_values()
        print(f"Successfully fetched {len(all_rows)} rows from the sheet.")

        # --- Data Processing ---
        # Initialize a dictionary to hold the grouped data.
        data_by_day = {day: [] for day in DAYS_OF_WEEK}

        print("Processing rows and grouping by day...")
        # Iterate over each row fetched from the sheet.
        for i, row_cells in enumerate(all_rows):
            # Combine all cells in the current row into a single, clean string.
            # This handles cases where data might be split across columns A-E.
            line = " ".join(filter(None, row_cells)).strip()

            if not line:
                continue # Skip empty or whitespace-only rows.

            # Search for a day of the week at the end of the line.
            match = DAY_REGEX.search(line)

            if not match:
                print(f"Warning: Could not find a day of the week in row {i+1}. Skipping. Content: '{line}'")
                continue

            # --- Data Extraction ---
            # Extract the day and the content before it.
            day = match.group(1).capitalize()
            content_part = line[:match.start()].strip()

            # Find all date-like strings (e.g., "8/21/2025").
            dates = re.findall(r'\d{1,2}/\d{1,2}/\d{4}', content_part)
            
            # Determine arrival and departure dates.
            arrival = dates[0] if dates else None
            departure = None
            if len(dates) > 1:
                departure = dates[1]
            elif 'TBD' in content_part.upper():
                departure = 'TBD'

            # Extract the customer reference by removing dates and other keywords.
            customer_reference = content_part
            for date in dates:
                customer_reference = customer_reference.replace(date, '')
            
            customer_reference = re.sub(r'\bTBD\b', '', customer_reference, flags=re.IGNORECASE)
            # Clean up extra spaces and trailing characters.
            customer_reference = re.sub(r'\s+', ' ', customer_reference).strip(' -')

            # --- Data Structuring ---
            # Create a dictionary for the current record.
            record = {
                "customer_reference": customer_reference,
                "arrival": arrival,
                "departure": departure
            }
            
            # Append the record to the list for the corresponding day.
            if day in data_by_day:
                data_by_day[day].append(record)

        # --- File Output ---
        # Create the output directory if it doesn't exist.
        output_dir = os.path.dirname(OUTPUT_JSON_PATH)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            print(f"Created output directory: {output_dir}")

        # Write the processed data to a JSON file.
        print(f"Writing processed data to '{OUTPUT_JSON_PATH}'...")
        with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data_by_day, f, ensure_ascii=False, indent=4)
        
        print("Data processing complete. JSON file saved successfully.")

    except gspread.exceptions.SpreadsheetNotFound:
        print(f"Error: Spreadsheet with ID '{SPREADSHEET_ID}' not found.")
        print("Please ensure the ID is correct and the service account has access.")
    except gspread.exceptions.WorksheetNotFound:
        print(f"Error: Worksheet '{WORKSHEET_NAME}' not found in the spreadsheet.")
        print("Please check the worksheet name in the script.")
    except Exception as e:
        # Catch any other exceptions and print detailed information.
        print(f"An unexpected error occurred: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    fetch_and_group_by_day()
