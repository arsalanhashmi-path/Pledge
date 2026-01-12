export const downloadAsCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV rows
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(fieldName => {
                const value = row[fieldName];
                // Handle complex types like arrays or objects
                const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                // Escape quotes and wrap in quotes to handle commas within values
                return `"${stringValue.replace(/"/g, '""')}"`;
            }).join(',')
        )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
