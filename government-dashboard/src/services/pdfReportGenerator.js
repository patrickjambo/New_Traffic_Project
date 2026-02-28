import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, startOfYear, endOfYear, isValid } from 'date-fns';

/**
 * PDF Report Generator for RNP Traffic Command
 * Generates professional PDF reports with RNP branding
 */

const INSTITUTION_NAME = 'Rwanda National Police';
const DEPARTMENT_NAME = 'Traffic Command';
const REPORT_TITLE = 'National Traffic Management & Incident Control';

// RNP Logo as Base64 - will be loaded dynamically
let logoBase64 = null;
let logoLoaded = false;
let logoLoadingPromise = null;

/**
 * Load logo image and convert to base64
 */
const loadLogo = async () => {
  // If already loaded, return cached result
  if (logoLoaded) return logoBase64;
  
  // If currently loading, wait for that promise
  if (logoLoadingPromise) return logoLoadingPromise;
  
  logoLoadingPromise = (async () => {
    try {
      const response = await fetch('/assets/rnp-logo.png');
      if (!response.ok) {
        throw new Error(`Logo fetch failed: ${response.status}`);
      }
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          logoBase64 = reader.result;
          logoLoaded = true;
          logoLoadingPromise = null;
          resolve(logoBase64);
        };
        reader.onerror = () => {
          console.log('Error reading logo file');
          logoLoaded = true;
          logoLoadingPromise = null;
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.log('Logo not available:', error);
      logoLoaded = true;
      logoLoadingPromise = null;
      return null;
    }
  })();
  
  return logoLoadingPromise;
};

// Pre-load logo on module load
loadLogo();

/**
 * Safe date formatter
 */
const safeFormat = (date, formatStr) => {
  try {
    const d = new Date(date);
    if (!isValid(d)) return 'N/A';
    return format(d, formatStr);
  } catch (e) {
    return 'N/A';
  }
};

/**
 * Generate a professional PDF report header with RNP branding
 */
export const addReportHeader = (doc, title, subtitle = '') => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add dark blue background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 70, 'F');
  
  // Logo positioning - the logo already has its own circular design
  const logoSize = 30;
  const logoX = 15;
  const logoY = 8;
  
  if (logoBase64) {
    try {
      // Just add the logo directly - it already has circular border
      doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch (e) {
      console.log('Could not add logo to PDF');
    }
  }
  
  // Text positioned to the right of logo
  const textStartX = logoX + logoSize + 10;
  
  // Institution Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(INSTITUTION_NAME, textStartX, 18);
  
  // Department Name - Cyan color
  doc.setTextColor(0, 200, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(DEPARTMENT_NAME, textStartX, 26);
  
  // Report subtitle
  doc.setFontSize(8);
  doc.setTextColor(140, 160, 180);
  doc.setFont(undefined, 'normal');
  doc.text(REPORT_TITLE, textStartX, 33);
  
  // Separator line
  doc.setDrawColor(0, 150, 255);
  doc.setLineWidth(0.5);
  doc.line(textStartX, 38, pageWidth - 15, 38);
  
  // Report Type Title - centered
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(title, pageWidth / 2, 50, { align: 'center' });
  
  // Subtitle if provided
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 180, 255);
    doc.text(subtitle, pageWidth / 2, 58, { align: 'center' });
  }
  
  // Bottom accent line
  doc.setDrawColor(0, 150, 255);
  doc.setLineWidth(1.5);
  doc.line(0, 68, pageWidth, 68);
  
  return 75; // Return Y position after header
};

/**
 * Add footer with page number and date
 */
export const addReportFooter = (doc, pageNumber) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Footer background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  
  // Footer text
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  // Left: Generated date
  doc.text(`Generated: ${safeFormat(new Date(), 'MMM dd, yyyy HH:mm')}`, 15, pageHeight - 5);
  
  // Center: Institution
  doc.text(INSTITUTION_NAME, pageWidth / 2, pageHeight - 5, { align: 'center' });
  
  // Right: Page number
  doc.text(`Page ${pageNumber}`, pageWidth - 15, pageHeight - 5, { align: 'right' });
};

/**
 * Generate Emergency Report PDF
 */
export const generateEmergencyReportPDF = async (emergency, incidents) => {
  // Ensure logo is loaded
  await loadLogo();
  
  if (!emergency) {
    throw new Error('Emergency data is required');
  }
  
  const doc = new jsPDF();
  let yPosition = addReportHeader(doc, 'Emergency Report', `Report ID: ${emergency.id || 'N/A'}`);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Emergency Details Section
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Emergency Details', margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Safely get severity
  const severityText = emergency.severity ? String(emergency.severity).toUpperCase() : 'N/A';
  const statusText = emergency.status ? String(emergency.status).toUpperCase() : 'N/A';
  
  const emergencyDetails = [
    ['Emergency Type:', emergency.emergency_type || emergency.type || 'N/A'],
    ['Severity Level:', severityText],
    ['Location:', emergency.location_name || emergency.location || 'N/A'],
    ['Coordinates:', `${emergency.latitude ? emergency.latitude.toFixed(4) : 'N/A'}, ${emergency.longitude ? emergency.longitude.toFixed(4) : 'N/A'}`],
    ['Date & Time:', safeFormat(emergency.created_at || emergency.timestamp, 'MMM dd, yyyy HH:mm:ss')],
    ['Status:', statusText],
    ['Source:', emergency.automatic || emergency.source === 'ai' ? 'AI Detection' : 'Manual Report'],
    ['Description:', emergency.description || 'No description provided']
  ];
  
  emergencyDetails.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, margin, yPosition);
    doc.setFont(undefined, 'normal');
    // Handle long text by wrapping
    const maxWidth = pageWidth - margin - 55;
    const lines = doc.splitTextToSize(String(value || 'N/A'), maxWidth);
    doc.text(lines, margin + 50, yPosition);
    yPosition += 6 * Math.max(1, lines.length);
  });
  
  // Related Incidents Section
  if (incidents && incidents.length > 0) {
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Related Incidents', margin, yPosition);
    
    yPosition += 8;
    
    const incidentData = incidents.slice(0, 5).map(incident => [
      incident?.type || incident?.incident_type || 'N/A',
      incident?.location || incident?.location_name || 'N/A',
      safeFormat(incident?.created_at || incident?.timestamp, 'MMM dd, HH:mm'),
      String(incident?.severity || 'N/A').toUpperCase(),
      incident?.status || 'N/A'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Type', 'Location', 'Date/Time', 'Severity', 'Status']],
      body: incidentData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
  }
  
  // Add footer
  addReportFooter(doc, 1);
  
  return doc;
};

/**
 * Generate Incident Report PDF
 */
export const generateIncidentReportPDF = async (incident) => {
  // Ensure logo is loaded
  await loadLogo();
  
  if (!incident) {
    throw new Error('Incident data is required');
  }
  
  const doc = new jsPDF();
  let yPosition = addReportHeader(doc, 'Incident Report', `Report ID: ${incident.id || 'N/A'}`);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  
  // Incident Details Section
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Incident Details', margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Safely get severity and status
  const severityText = incident.severity ? String(incident.severity).toUpperCase() : 'N/A';
  const statusText = incident.status ? String(incident.status).toUpperCase() : 'N/A';
  
  const incidentDetails = [
    ['Incident Type:', incident.incident_type || incident.type || 'N/A'],
    ['Severity Level:', severityText],
    ['Location:', incident.location_name || incident.location || 'N/A'],
    ['Coordinates:', `${incident.latitude ? incident.latitude.toFixed(4) : 'N/A'}, ${incident.longitude ? incident.longitude.toFixed(4) : 'N/A'}`],
    ['Date & Time:', safeFormat(incident.created_at || incident.timestamp, 'MMM dd, yyyy HH:mm:ss')],
    ['Status:', statusText],
    ['Source:', incident.source === 'ai' || incident.detected_by === 'ai' ? 'AI Detection' : 'Manual Report'],
    ['Description:', incident.description || 'No description provided']
  ];
  
  incidentDetails.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, margin, yPosition);
    doc.setFont(undefined, 'normal');
    // Handle long text
    const maxWidth = pageWidth - margin - 60;
    const lines = doc.splitTextToSize(String(value), maxWidth);
    doc.text(lines, margin + 50, yPosition);
    yPosition += 6 * lines.length;
  });
  
  // Additional Details Section if available
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Additional Information', margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const additionalDetails = [
    ['Vehicle Count:', incident?.vehicle_count || '0'],
    ['Pedestrian Count:', incident?.pedestrian_count || '0'],
    ['Injuries:', incident?.injuries || '0'],
    ['Road Blocked:', incident?.road_blocked ? 'Yes' : 'No'],
    ['Emergency Services:', incident?.emergency_services_called ? 'Called' : 'Not Called']
  ];
  
  additionalDetails.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, margin, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), margin + 50, yPosition);
    yPosition += 6;
  });
  
  // Add footer
  addReportFooter(doc, 1);
  
  return doc;
};

/**
 * Generate Monthly Report PDF
 */
export const generateMonthlyReportPDF = async (incidents = [], emergencies = [], month = new Date()) => {
  // Ensure logo is loaded
  await loadLogo();
  
  const doc = new jsPDF();
  const monthName = safeFormat(month, 'MMMM yyyy');
  let yPosition = addReportHeader(doc, 'Monthly Traffic Report', monthName);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  
  // Ensure arrays
  const safeIncidents = incidents || [];
  const safeEmergencies = emergencies || [];
  
  // Summary Statistics
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Summary Statistics', margin, yPosition);
  
  yPosition += 8;
  
  const totalIncidents = safeIncidents.length;
  const totalEmergencies = safeEmergencies.length;
  const criticalIncidents = safeIncidents.filter(i => i?.severity === 'critical' || i?.severity === 'high').length;
  const resolvedIncidents = safeIncidents.filter(i => i?.status === 'resolved').length;
  const aiDetected = safeIncidents.filter(i => i?.source === 'ai' || i?.detected_by === 'ai').length;
  
  const statsData = [
    ['Total Incidents', totalIncidents],
    ['Total Emergencies', totalEmergencies],
    ['Critical/High Severity', criticalIncidents],
    ['Resolved Incidents', resolvedIncidents],
    ['AI Detected', aiDetected],
    ['Manual Reports', totalIncidents - aiDetected]
  ];
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  statsData.forEach(([label, value], index) => {
    const xPos = index % 2 === 0 ? margin : pageWidth / 2;
    const yPos = yPosition + Math.floor(index / 2) * 8;
    
    doc.setFont(undefined, 'bold');
    doc.text(label + ':', xPos, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), xPos + 60, yPos);
  });
  
  yPosition += 30;
  
  // Incidents by Type
  if (safeIncidents.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Type', margin, yPosition);
    
    yPosition += 8;
    
    const incidentsByType = {};
    safeIncidents.forEach(incident => {
      const type = incident?.type || incident?.incident_type || 'Unknown';
      incidentsByType[type] = (incidentsByType[type] || 0) + 1;
    });
    
    const typeData = Object.entries(incidentsByType).map(([type, count]) => [
      type,
      count,
      totalIncidents > 0 ? ((count / totalIncidents) * 100).toFixed(1) + '%' : '0%'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Incident Type', 'Count', 'Percentage']],
      body: typeData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
  }
  
  // Incidents by Severity
  if (safeIncidents.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Severity', margin, yPosition);
    
    yPosition += 8;
    
    const incidentsBySeverity = {};
    safeIncidents.forEach(incident => {
      const severity = incident?.severity || 'Unknown';
      incidentsBySeverity[severity] = (incidentsBySeverity[severity] || 0) + 1;
    });
    
    const severityData = Object.entries(incidentsBySeverity).map(([severity, count]) => [
      severity.toUpperCase(),
      count,
      totalIncidents > 0 ? ((count / totalIncidents) * 100).toFixed(1) + '%' : '0%'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Severity Level', 'Count', 'Percentage']],
      body: severityData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
  }
  
  // Add footer
  addReportFooter(doc, 1);
  
  return doc;
};

/**
 * Generate Annual Report PDF
 */
export const generateAnnualReportPDF = async (incidents = [], emergencies = [], year = new Date().getFullYear()) => {
  // Ensure logo is loaded
  await loadLogo();
  
  const doc = new jsPDF();
  let pageNumber = 1;
  
  // Ensure arrays
  const safeIncidents = incidents || [];
  const safeEmergencies = emergencies || [];
  
  // Title Page
  let yPosition = addReportHeader(doc, 'Annual Traffic Report', `Year ${year}`);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  yPosition += 20;
  
  // Executive Summary
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Executive Summary', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  const totalIncidents = safeIncidents.length;
  const totalEmergencies = safeEmergencies.length;
  const criticalIncidents = safeIncidents.filter(i => i?.severity === 'critical' || i?.severity === 'high').length;
  const resolvedIncidents = safeIncidents.filter(i => i?.status === 'resolved').length;
  const resolutionRate = totalIncidents > 0 ? ((resolvedIncidents / totalIncidents) * 100).toFixed(1) : 0;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const summaryText = `
This annual report provides a comprehensive overview of traffic management and incident control operations for the year ${year}. 
The report details all incidents, emergencies, and traffic management activities handled by the Rwanda National Police Traffic Command.

Key Highlights:
• Total Incidents Reported: ${totalIncidents}
• Total Emergencies: ${totalEmergencies}
• Critical/High Severity Incidents: ${criticalIncidents}
• Resolved Incidents: ${resolvedIncidents}
• Resolution Rate: ${resolutionRate}%
• Average Response Time: Optimized through real-time tracking
  `;
  
  doc.setFont(undefined, 'normal');
  const splitText = doc.splitTextToSize(summaryText, pageWidth - 2 * margin);
  doc.text(splitText, margin, yPosition);
  
  yPosition += splitText.length * 5 + 20;
  
  // Add page break if needed
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    pageNumber++;
    yPosition = 20;
  }
  
  // Annual Statistics
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Annual Statistics', margin, yPosition);
  
  yPosition += 10;
  
  const aiDetected = safeIncidents.filter(i => i?.source === 'ai' || i?.detected_by === 'ai').length;
  const statsData = [
    ['Total Incidents', totalIncidents],
    ['Total Emergencies', totalEmergencies],
    ['Critical/High Severity', criticalIncidents],
    ['Resolved Incidents', resolvedIncidents],
    ['Resolution Rate', resolutionRate + '%'],
    ['AI Detected Incidents', aiDetected],
    ['Manual Reports', totalIncidents - aiDetected]
  ];
  
  doc.autoTable({
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: statsData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [50, 150, 255],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [0, 0, 0]
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    }
  });
  
  yPosition = doc.lastAutoTable.finalY + 15;
  
  // Incidents by Type
  if (safeIncidents.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      pageNumber++;
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Type', margin, yPosition);
    
    yPosition += 10;
    
    const incidentsByType = {};
    safeIncidents.forEach(incident => {
      const type = incident?.type || incident?.incident_type || 'Unknown';
      incidentsByType[type] = (incidentsByType[type] || 0) + 1;
    });
    
    const typeData = Object.entries(incidentsByType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => [
        type,
        count,
        totalIncidents > 0 ? ((count / totalIncidents) * 100).toFixed(1) + '%' : '0%'
      ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Incident Type', 'Count', 'Percentage']],
      body: typeData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
  }
  
  // Incidents by Severity
  if (safeIncidents.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      pageNumber++;
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Severity', margin, yPosition);
    
    yPosition += 10;
    
    const incidentsBySeverity = {};
    safeIncidents.forEach(incident => {
      const severity = incident?.severity || 'Unknown';
      incidentsBySeverity[severity] = (incidentsBySeverity[severity] || 0) + 1;
    });
    
    const severityData = Object.entries(incidentsBySeverity)
      .sort((a, b) => b[1] - a[1])
      .map(([severity, count]) => [
        severity.toUpperCase(),
        count,
        totalIncidents > 0 ? ((count / totalIncidents) * 100).toFixed(1) + '%' : '0%'
      ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Severity Level', 'Count', 'Percentage']],
      body: severityData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
  }
  
  // Incidents by Status
  if (safeIncidents.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      pageNumber++;
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Status', margin, yPosition);
    
    yPosition += 10;
    
    const incidentsByStatus = {};
    safeIncidents.forEach(incident => {
      const status = incident?.status || 'Unknown';
      incidentsByStatus[status] = (incidentsByStatus[status] || 0) + 1;
    });
    
    const statusData = Object.entries(incidentsByStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => [
        status.toUpperCase(),
        count,
        totalIncidents > 0 ? ((count / totalIncidents) * 100).toFixed(1) + '%' : '0%'
      ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Status', 'Count', 'Percentage']],
      body: statusData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
  }
  
  // Add footer to all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addReportFooter(doc, i);
  }
  
  return doc;
};

/**
 * Download PDF file
 */
export const downloadPDF = (doc, filename) => {
  doc.save(filename);
};
