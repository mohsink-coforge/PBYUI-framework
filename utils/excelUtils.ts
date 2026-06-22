import * as XLSX from 'xlsx';

export function readSecretsFromExcel(filePath: string): Record<string, string> {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Secrets'];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  const secrets: Record<string, string> = {};

  for (const row of rows) {
    secrets[row['Secret key']] = row['Expected value'] ?? '';
  }

  return secrets;
}