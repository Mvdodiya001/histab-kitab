import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

SARVAM_API_KEY: str = os.environ.get("SARVAM_API_KEY", "")

BILL_EXTRACT_SCHEMA: str = """{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "description": "Line items from the receipt",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string", "description": "Item name"},
          "qty": {"type": "integer", "description": "Quantity purchased"},
          "total_price": {"type": "number", "description": "Line total in INR"}
        }
      }
    },
    "tax_and_fees": {"type": "number", "description": "Tax GST and service fees total in INR"},
    "grand_total": {"type": "number", "description": "Bill grand total in INR"}
  }
}"""
