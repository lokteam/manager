import { tool } from "@opencode-ai/plugin";
import sqlite3 from "sqlite3";

export default tool({
  description: `Query the project sqlite database.
Ready to execute - no path needed.
Db scheme:
  [dialog:table]
    id: int (PK)
    entity_type: str (User, Group, Channel)
    username: str?
    name: str
    folder_id: int?
  [message:table]
    id: int (PK)
    dialog_id: int (FK: dialog.id)
    from_id: int?
    from_type: str? (User, Chat, Channel)
    text: str?
    date: datetime?
  [review:table]
    id: int (PK)
    message_id: int (FK: message.id)
    approved: bool
    text: str
`,
  args: {
    query: tool.schema.string().describe("SQL query to execute"),
  },
  async execute(args) {
    const dbPath = "/home/alex/projects/manager/shared/shared/database.db";
    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve, reject) => {
      db.all(args.query, (err, rows: any[]) => {
        if (err) {
          db.close();
          resolve(`Error: ${err.message}`);
          return;
        }

        if (!rows || rows.length === 0) {
          db.close();
          resolve("No results found.");
          return;
        }

        let result = "";
        const headers = Object.keys(rows[0]);
        result += `| ${headers.join(" | ")} |\n`;
        result += `| ${headers.map(() => "---").join(" | ")} |\n`;

        for (const row of rows) {
          const values = headers.map((h) => row[h]);
          result += `| ${values.join(" | ")} |\n`;
        }

        db.close();
        resolve(result);
      });
    });
  },
});
