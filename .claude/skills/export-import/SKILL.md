---
name: export-import
description: Implement JSON/CSV export, bulk import, data validation, and rollback mechanisms.
---

# Export & Import Skill

## Instructions

1. **Data export**
   - Support JSON and CSV formats
   - Handle large datasets efficiently
   - Include metadata for easier imports

2. **Bulk import**
   - Validate data before saving
   - Process large files in batches
   - Handle duplicates and conflicts gracefully

3. **Validation**
   - Check data types and required fields
   - Ensure relational integrity
   - Reject malformed or malicious data

4. **Rollback**
   - Implement transactional imports
   - Rollback changes on errors
   - Log failed operations for review

## Best Practices
- Always back up data before import/export
- Stream large files to avoid memory overload
- Provide user-friendly error messages
- Log both success and failure events
- Separate export/import logic from core business logic

## Example Structure
```ts
// Export data to CSV
const users = await UserService.getAll();
exportToCSV(users, "users.csv");

// Bulk import with validation and rollback
try {
  await db.transaction(async (trx) => {
    const data = parseCSV("users.csv");
    validateData(data);
    await UserService.bulkCreate(data, trx);
  });
  console.log("Import successful");
} catch (error) {
  console.error("Import failed, rolled back:", error);
}
