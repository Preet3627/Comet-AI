
import * as fs from 'fs';
import * as path from 'path';

export interface FileMetadata {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    hash: string;
    modifiedTime: number;
}

export async function scanDirectoryRecursive(currentPath: string, types: string[]): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];
    try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                files.push(...await scanDirectoryRecursive(entryPath, types));
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                let shouldInclude = false;

                if (types.includes('all')) {
                    shouldInclude = true;
                } else {
                    if (types.includes('images') && ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) shouldInclude = true;
                    if (types.includes('pdfs') && ext === '.pdf') shouldInclude = true;
                    if (types.includes('documents') && ['.doc', '.docx', '.txt', '.md', '.rtf'].includes(ext)) shouldInclude = true;
                }

                if (shouldInclude) {
                    const stats = fs.statSync(entryPath);
                    files.push({
                        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: entry.name,
                        path: entryPath,
                        size: stats.size,
                        type: ext.substring(1) || 'unknown',
                        hash: '', // Optional: implement hash if needed
                        modifiedTime: stats.mtimeMs
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error);
    }
    return files;
}
