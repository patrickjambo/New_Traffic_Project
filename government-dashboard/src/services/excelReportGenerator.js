import * as XLSX from 'xlsx';

export const generateExcelReport = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");

  // Make headers bold and center aligned
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1";
    if (!ws[address]) continue;
    ws[address].s = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  // Set column widths based on longest string in each column
  const cols = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let max_len = 0;
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const addr = XLSX.utils.encode_cell({r:R, c:C});
        if (!ws[addr]) continue;
        const len = String(ws[addr].v).length;
        if (len > max_len) max_len = len;
    }
    cols.push({ wch: Math.min(Math.max(max_len + 2, 10), 50) });
  }
  ws['!cols'] = cols;

  XLSX.writeFile(wb, filename);
};

export const formatIncidentDataForExcel = (incidents, emergencies) => {
  const formattedData = [];

  if (incidents) {
    incidents.forEach(inc => {
      formattedData.push({
        'Type': inc.incident_type || 'Incident',
        'Location': inc.location || inc.address || 'Unknown',
        'Occurrences': inc.occurrences || 1,
        'Witnesses': inc.witnesses || inc.witness_count || 0,
        'Police Name': inc.police_name || inc.officer_name || 'N/A',
        'Police Number': inc.police_number || inc.officer_number || 'N/A',
        'Date': new Date(inc.created_at || inc.timestamp).toLocaleDateString(),
        'Time': new Date(inc.created_at || inc.timestamp).toLocaleTimeString(),
        'Status': inc.status || 'Pending',
        'Time Taken to Resolve (hrs)': inc.status?.toLowerCase() === 'resolved' || inc.status?.toLowerCase() === 'completed' || inc.status?.toLowerCase() === 'closed' ? ((new Date(inc.updated_at || inc.resolved_at || new Date()) - new Date(inc.created_at || inc.timestamp)) / 3600000).toFixed(2) : 'Unsolved',
        'Area Accident/Traffic History': inc.location_history ? 'Yes' : 'No',
        'Category': 'Incident',
        'Severity': inc.severity || 'Low',
        'Source': inc.source || 'Manual'
      });
    });
  }

  if (emergencies) {
    emergencies.forEach(em => {
      formattedData.push({
        'Type': em.emergency_type || 'Emergency',
        'Location': em.location_name || em.location || 'Unknown',
        'Occurrences': em.occurrences || 1,
        'Witnesses': em.witnesses || em.witness_count || 0,
        'Police Name': em.police_name || em.officer_name || 'N/A',
        'Police Number': em.police_number || em.officer_number || 'N/A',
        'Date': new Date(em.created_at || em.timestamp).toLocaleDateString(),
        'Time': new Date(em.created_at || em.timestamp).toLocaleTimeString(),
        'Status': em.status || 'Pending',
        'Time Taken to Resolve (hrs)': em.status?.toLowerCase() === 'resolved' || em.status?.toLowerCase() === 'completed' || em.status?.toLowerCase() === 'closed' ? ((new Date(em.updated_at || em.resolved_at || new Date()) - new Date(em.created_at || em.timestamp)) / 3600000).toFixed(2) : 'Unsolved',
        'Area Accident/Traffic History': em.location_history ? 'Yes' : 'No',
        'Category': 'Emergency',
        'Severity': em.severity || 'Medium',
        'Source': em.source || 'Manual'
      });
    });
  }

  // Sort by date/time descending
  return formattedData.sort((a, b) => new Date(`${b.Date} ${b.Time}`) - new Date(`${a.Date} ${a.Time}`));
};
