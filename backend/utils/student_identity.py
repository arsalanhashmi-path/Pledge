import re

def infer_student_identity(email: str):
    """
    Infers student identity from email address.
    Currently only supports LUMS (@lums.edu.pk).
    Rules:
    - Handle: 24100001 -> '24' is the Graduation Year.
    - Batch: 2000 + year (e.g., 2024)
    """
    email = email.lower().strip()
    
    # 1. LUMS Check
    if email.endswith("@lums.edu.pk"):
        handle = email.split("@")[0]
        # Match exactly 2 digits at the start of handle
        # e.g., 24100123 -> Graduation Year 2024
        match = re.search(r'^(\d{2})', handle)
        if match:
            year_short = int(match.group(1))
            batch_year = 2000 + year_short
            return {
                "institution_id": "LUMS",
                "batch_year": batch_year,
                "roll_number": handle,
                "campus_code": "LUMS-MAIN"
            }
        else:
            # Fallback if handle doesn't start with digits (unlikely for students)
            return {
                "institution_id": "LUMS",
                "batch_year": None,
                "roll_number": handle,
                "campus_code": "LUMS-MAIN"
            }

    # 2. Reject Others
    raise ValueError("This network is exclusively for verified LUMS students.")
